const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();
const { OpenAI } = require('openai');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Initialize DB on startup
db.initDb();

// Helper for realistic fallback questions when API key is missing or quota is exceeded
function getMockQuestions(role) {
  const normalized = (role || '').toLowerCase();
  if (normalized.includes('react') || normalized.includes('frontend')) {
    return [
      "What is the difference between Virtual DOM and Real DOM in React?",
      "How do useEffect and useState hooks work in React components?",
      "What are key differences between state and props?",
      "How do you optimize performance in a React application?",
      "Explain the concept of component lifecycle and how hooks handle it."
    ];
  } else if (normalized.includes('python') || normalized.includes('backend')) {
    return [
      "Explain the difference between synchronous and asynchronous execution in Node.js / Python.",
      "How do you design a RESTful API with proper HTTP status codes?",
      "What is database indexing and how does it improve query performance?",
      "How do you handle authentication and authorization using JWT?",
      "Describe how you handle error logging and exception handling in backend services."
    ];
  } else {
    return [
      `What are the core technical skills required for a successful ${role}?`,
      `Describe a challenging project you worked on as a ${role} and how you overcame key obstacles.`,
      `How do you ensure code quality, test coverage, and documentation in your day-to-day work?`,
      `How do you handle performance bottlenecks or unexpected system failures?`,
      `Where do you see technology in the ${role} domain heading over the next 3 to 5 years?`
    ];
  }
}

// ----------------------------------------------------
// PHASE 2 & 4: NEW ENDPOINTS FOR PERSISTENCE & RESUME
// ----------------------------------------------------

// 1. Create a new session (with optional resume upload)
app.post('/api/sessions', upload.single('resume'), async (req, res) => {
  try {
    const { role } = req.body;
    let resumeText = null;

    if (!role) {
      return res.status(400).json({ error: 'Job role is required' });
    }

    if (req.file) {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text.substring(0, 5000); // Limit context size
    }

    // Default user id 1 (Guest User created in initDb)
    const result = await db.query(
      `INSERT INTO sessions (user_id, role, resume_text) VALUES ($1, $2, $3) RETURNING *`,
      [1, role.trim(), resumeText]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// 2. Get all sessions for dashboard
app.post('/api/sessions/list', async (req, res) => {
  // Using POST or GET is fine, sticking to simple GET for REST
  try {
    const result = await db.query(
      `SELECT s.*, 
       (SELECT COUNT(*) FROM questions q WHERE q.session_id = s.id) as question_count,
       (SELECT AVG(f.score) FROM feedback f JOIN answers a ON f.answer_id = a.id JOIN questions q ON a.question_id = q.id WHERE q.session_id = s.id) as avg_score
       FROM sessions s 
       WHERE s.user_id = 1 
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// 3. Chat Interview Endpoint (Now Saves to DB)
app.post('/api/sessions/:id/chat', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { history, answer } = req.body; // answer is the latest answer provided by the user
    
    // Fetch session
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessionRes.rows[0];

    // Default history fallback
    const chatHistory = history || [];
    
    // If user provided an answer, save it and evaluate
    let evaluationResult = null;
    let savedAnswerId = null;

    if (answer && chatHistory.length > 0) {
      // Find the last question in the DB to attach this answer to
      const lastQRes = await db.query('SELECT id FROM questions WHERE session_id = $1 ORDER BY order_num DESC LIMIT 1', [sessionId]);
      if (lastQRes.rows.length > 0) {
        const lastQId = lastQRes.rows[0].id;
        
        // Save Answer
        const ansRes = await db.query(
          'INSERT INTO answers (question_id, content) VALUES ($1, $2) RETURNING id',
          [lastQId, answer]
        );
        savedAnswerId = ansRes.rows[0].id;

        // Evaluate using OpenAI (or fallback)
        if (openai) {
          try {
            const evalCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are an expert technical interviewer. Evaluate the answer concisely. Return JSON with 'score' (1-10) and 'feedback' (string)." },
                { role: "user", content: `Question: ${chatHistory[chatHistory.length - 1].content}\nAnswer: ${answer}` }
              ],
              response_format: { type: "json_object" }
            });
            evaluationResult = JSON.parse(evalCompletion.choices[0].message.content);
          } catch (e) {
            console.warn("OpenAI Eval failed:", e.message);
          }
        }
        
        // Fallback Eval
        if (!evaluationResult) {
          const trimmed = answer.trim();
          evaluationResult = { score: trimmed.length > 50 ? 8 : 5, feedback: "Try to elaborate more on your points." };
        }

        // Save Feedback
        await db.query(
          'INSERT INTO feedback (answer_id, score, comment) VALUES ($1, $2, $3)',
          [savedAnswerId, evaluationResult.score, evaluationResult.feedback]
        );
      }
    }

    // Generate Next Question
    let nextQuestionText = "";
    if (openai) {
      try {
        let systemPrompt = `You are an expert technical interviewer for a ${session.role}. `;
        if (session.resume_text) {
          systemPrompt += `Here is the candidate's resume/job description context: "${session.resume_text}". Use this to tailor your questions heavily. `;
        }
        
        if (chatHistory.length === 0) {
          systemPrompt += `Generate the first interview question. Return JSON: { "nextQuestion": "..." }`;
        } else {
          systemPrompt += `The user has just answered. Ask a relevant follow-up question, or move to a new topic. Return JSON: { "nextQuestion": "..." }`;
        }

        const messages = [
          { role: "system", content: systemPrompt },
          ...chatHistory.map(msg => ({ role: msg.role === 'interviewer' ? 'assistant' : 'user', content: msg.content }))
        ];
        if (answer) messages.push({ role: 'user', content: answer });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages,
          response_format: { type: "json_object" }
        });

        nextQuestionText = JSON.parse(completion.choices[0].message.content).nextQuestion;
      } catch (apiError) {
        console.warn("OpenAI Q-Gen failed:", apiError.message);
      }
    }

    // Fallback Q-Gen
    if (!nextQuestionText) {
      if (chatHistory.length === 0) {
        const initialQs = getMockQuestions(session.role);
        nextQuestionText = initialQs[0];
      } else {
        const mockFollowUp = ["Can you elaborate?", "What is a practical example?", "How do you handle errors?"];
        nextQuestionText = mockFollowUp[Math.floor(Math.random() * mockFollowUp.length)];
      }
    }

    // Save Next Question to DB
    const orderNum = Math.floor(chatHistory.length / 2) + 1;
    await db.query(
      'INSERT INTO questions (session_id, content, order_num) VALUES ($1, $2, $3)',
      [sessionId, nextQuestionText, orderNum]
    );

    return res.json({
      evaluation: evaluationResult,
      nextQuestion: nextQuestionText
    });

  } catch (error) {
    console.error('Error in chat interview:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat interview' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));

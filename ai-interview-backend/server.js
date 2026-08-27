const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

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

// Endpoint 1: Generate 5 questions based on job role
app.post('/generate-questions', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({ error: 'Job role is required' });
    }

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an expert technical interviewer. Generate 5 distinct, high-quality interview questions for the given job role. Return a JSON object with a single key 'questions' containing an array of 5 strings." 
            },
            { role: "user", content: `Job Role: ${role.trim()}` }
          ],
          response_format: { type: "json_object" }
        });

        const parsedContent = JSON.parse(completion.choices[0].message.content);
        const questions = parsedContent.questions || Object.values(parsedContent)[0] || [];

        if (Array.isArray(questions) && questions.length > 0) {
          return res.json(questions);
        }
      } catch (apiError) {
        console.warn("OpenAI API call failed (using realistic fallback):", apiError.message);
      }
    }

    // Fallback if OpenAI call fails or no API key set
    const fallbackQuestions = getMockQuestions(role.trim());
    return res.json(fallbackQuestions);

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

// Endpoint 2: Evaluate user's answer
app.post('/evaluate-answer', async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an interviewer evaluating a candidate's response. Evaluate the answer concisely and constructively. Return a JSON object with two keys: 'score' (an integer from 1 to 10) and 'feedback' (a string with brief actionable feedback)." 
            },
            { role: "user", content: `Question: ${question}\nCandidate Answer: ${answer || '(No answer provided)'}` }
          ],
          response_format: { type: "json_object" }
        });

        const evaluation = JSON.parse(completion.choices[0].message.content);
        return res.json(evaluation);
      } catch (apiError) {
        console.warn("OpenAI API call failed (using evaluation fallback):", apiError.message);
      }
    }

    // Fallback evaluation logic
    const trimmed = (answer || '').trim();
    let score = 5;
    let feedback = "Your answer is quite brief. Try elaborating on key technical terms, practical examples, and specific methodologies to strengthen your response.";

    if (trimmed.length > 100) {
      score = 9;
      feedback = "Great answer! You provided a detailed explanation with clear technical understanding and context.";
    } else if (trimmed.length > 40) {
      score = 7;
      feedback = "Good response covering the main points. Adding a concrete real-world example would make it even better.";
    }

    return res.json({ score, feedback });

  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate answer' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));

import { useState } from 'react';
import './App.css';

function App() {
  const [role, setRole] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [evaluatingIndex, setEvaluatingIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Questions from Backend
  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    setLoadingQuestions(true);
    setErrorMessage('');
    setQuestions([]);
    setAnswers({});
    setEvaluations({});

    try {
      const res = await fetch('http://localhost:5000/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      const questionList = Array.isArray(data)
        ? data
        : (data.questions || Object.values(data)[0] || []);

      setQuestions(questionList);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error connecting to backend!');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // 2. Handle Answer Input Change
  const handleAnswerChange = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  // 3. Evaluate Single Answer via Backend
  const handleEvaluate = async (index, question) => {
    setEvaluatingIndex(index);
    setErrorMessage('');

    try {
      const res = await fetch('http://localhost:5000/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer: answers[index] || '' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate answer');
      }

      setEvaluations((prev) => ({ ...prev, [index]: data }));
    } catch (err) {
      console.error(err);
      setErrorMessage(`Question ${index + 1}: ${err.message || 'Error evaluating answer!'}`);
    } finally {
      setEvaluatingIndex(null);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '650px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>AI Mock Interviewer</h2>

      {/* Role Input Form */}
      <form onSubmit={handleGenerateQuestions} style={{ marginBottom: '1.5rem' }}>
        <input
          id="job-role-input"
          type="text"
          placeholder="Enter Job Role (e.g. React Developer)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: '8px 12px', width: '65%', marginRight: '10px', fontSize: '14px' }}
        />
        <button id="generate-btn" type="submit" disabled={loadingQuestions} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}>
          {loadingQuestions ? 'Generating...' : 'Get Questions'}
        </button>
      </form>

      {/* Error Banner */}
      {errorMessage && (
        <div style={{ color: '#d9534f', backgroundColor: '#fdf7f7', border: '1px solid #d9534f', padding: '10px', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Questions List & Answer Textboxes */}
      <div>
        {questions.map((q, index) => (
          <div key={index} style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold' }}>Q{index + 1}: {q}</p>
            <textarea
              id={`answer-input-${index}`}
              placeholder="Type your answer here..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              rows="3"
              style={{ width: '100%', marginBottom: '8px', padding: '8px', boxSizing: 'border-box', fontSize: '14px' }}
            />
            <br />
            <button
              id={`submit-btn-${index}`}
              onClick={() => handleEvaluate(index, q)}
              disabled={evaluatingIndex === index}
              style={{ padding: '6px 14px', cursor: 'pointer', fontSize: '14px' }}
            >
              {evaluatingIndex === index ? 'Evaluating...' : 'Submit Answer'}
            </button>

            {/* Feedback Display */}
            {evaluations[index] && (
              <div id={`evaluation-result-${index}`} style={{ background: '#f4f9f4', padding: '12px', marginTop: '12px', borderLeft: '4px solid #4CAF50', borderRadius: '2px' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Score:</strong> {evaluations[index].score} / 10</p>
                <p style={{ margin: 0 }}><strong>Feedback:</strong> {evaluations[index].feedback}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
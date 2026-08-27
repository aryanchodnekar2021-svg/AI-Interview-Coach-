import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true); // Initial load for first question
  const [submitting, setSubmitting] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); 
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch initial question on mount
  useEffect(() => {
    fetchNextQuestion([], null);
  }, [id]);

  const fetchNextQuestion = async (history, answer) => {
    try {
      const res = await fetch(`http://localhost:5000/api/sessions/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, answer }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to process answer');

      if (answer && data.evaluation) {
         // We had an answer, so update history with it and its evaluation
         const updatedHistory = [...history];
         updatedHistory[updatedHistory.length - 1].evaluation = data.evaluation;
         setChatHistory(updatedHistory);
      }
      setCurrentQuestion(data.nextQuestion);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (!loading && !submitting && currentQuestion) {
      setTimeLeft(120);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitAnswer(null, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [loading, submitting, currentQuestion]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const handleSubmitAnswer = async (e, autoSubmit = false) => {
    if (e) e.preventDefault();
    if (!autoSubmit && !currentAnswer.trim()) return;
    
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    
    clearInterval(timerRef.current);
    setSubmitting(true);
    setErrorMessage('');
    
    const finalAnswer = currentAnswer.trim() || "(Time expired, no answer provided)";
    
    const newHistory = [
      ...chatHistory,
      { role: 'assistant', content: currentQuestion },
      { role: 'user', content: finalAnswer }
    ];
    
    setChatHistory(newHistory);
    setCurrentQuestion('');
    setCurrentAnswer('');

    fetchNextQuestion(newHistory, finalAnswer);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const startText = currentAnswer;
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setCurrentAnswer((startText ? startText + ' ' : '') + finalTranscript + interimTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '750px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>AI Mock Interview</h2>
        <button onClick={() => navigate('/')} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          End Interview
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        {chatHistory.map((msg, idx) => (
          <div key={idx} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
            padding: '12px 16px', borderRadius: '8px', maxWidth: '85%',
            border: msg.role === 'assistant' ? '1px solid #ddd' : 'none'
          }}>
            <p style={{ margin: 0, fontSize: '15px' }}><strong>{msg.role === 'user' ? 'You' : 'Interviewer'}:</strong> {msg.content}</p>
            {msg.evaluation && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#e8f5e9', borderLeft: '4px solid #4CAF50', fontSize: '14px' }}>
                <strong>Score: {msg.evaluation.score}/10</strong><br/>
                <em>{msg.evaluation.feedback}</em>
              </div>
            )}
          </div>
        ))}

        {currentQuestion && (
          <div style={{ background: '#fff9e6', padding: '20px', borderRadius: '8px', border: '1px solid #ffe082', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Interviewer</h3>
              <span style={{ background: timeLeft < 30 ? '#ffcccc' : '#ddd', padding: '4px 10px', borderRadius: '15px', fontWeight: 'bold' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            </div>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>{currentQuestion}</p>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer or use voice input..."
              rows="4" disabled={submitting}
              style={{ width: '100%', padding: '12px', boxSizing: 'border-box', fontSize: '15px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={toggleRecording} disabled={submitting} style={{ padding: '10px 16px', cursor: 'pointer', background: isRecording ? '#dc3545' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                {isRecording ? '🛑 Stop Recording' : '🎤 Voice Input'}
              </button>
              <button onClick={(e) => handleSubmitAnswer(e, false)} disabled={submitting || !currentAnswer.trim()} style={{ padding: '10px 20px', cursor: (submitting || !currentAnswer.trim()) ? 'not-allowed' : 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        )}

        {(loading || submitting) && !currentQuestion && (
          <div style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#666' }}>
            Interviewer is typing...
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={{ color: '#d9534f', backgroundColor: '#fdf7f7', border: '1px solid #d9534f', padding: '10px', borderRadius: '4px', marginTop: '1.5rem' }}>{errorMessage}</div>
      )}
    </div>
  );
}

export default ActiveInterview;

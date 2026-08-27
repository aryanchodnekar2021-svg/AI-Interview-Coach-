import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
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
      
      if (!res.ok) throw new Error(data.error || 'Failed to process signal');

      if (answer && data.evaluation) {
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
    
    const finalAnswer = currentAnswer.trim() || "(Time expired, no audio captured)";
    
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
      alert("Hardware error: Web Speech API not supported in this browser.");
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
    return `${padZero(m)}:${padZero(s)}`;
  };
  
  const padZero = (num) => (num < 10 ? `0${num}` : num);

  // Helper component for the VU meter
  const VUMeter = ({ score }) => {
    // Score is 0-10. Needle rotation from -90deg (0) to +90deg (10).
    const rotation = -90 + (score * 18);
    const isGood = score >= 7.5;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
        <div className="vu-meter-container">
          <div className="vu-meter-scale"></div>
          {/* Ticks */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(tick => (
            <div 
              key={tick} 
              className="vu-meter-tick" 
              style={{ 
                transform: `translateX(-50%) rotate(${-90 + (tick * 18)}deg)`, 
                height: tick % 5 === 0 ? '15px' : '8px',
                background: tick >= 8 ? 'var(--teal-success)' : tick <= 4 ? 'var(--rust-alert)' : 'var(--text-faint)'
              }}
            />
          ))}
          <div 
            className="vu-meter-needle" 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              animation: submitting ? 'needleWobble 0.5s infinite' : 'none'
            }} 
          />
        </div>
        <div className="mono" style={{ marginTop: '12px', fontSize: '20px', color: isGood ? 'var(--teal-success)' : 'var(--text-primary)' }}>
          {padZero(score)}/10
        </div>
      </div>
    );
  };

  return (
    <div className="layout-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '24px' }}>
        <div>
          <span className="mono text-rust" style={{ fontSize: '12px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rust-alert)', display: 'inline-block', animation: 'fadeIn 1s infinite alternate' }}></span>
            LIVE RECORDING
          </span>
          <div className="mono text-faint" style={{ fontSize: '11px', marginTop: '4px' }}>ID: {id}</div>
        </div>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '8px 16px', fontSize: '12px' }} className="mono text-secondary">
            CUT & EXIT
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {/* Chat History */}
        {chatHistory.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: '16px'
          }}>
            <div style={{ maxWidth: '85%' }}>
              <span className="mono text-faint" style={{ fontSize: '11px', display: 'block', marginBottom: '8px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.role === 'user' ? 'SUBJECT [TRACK 1]' : 'DIRECTOR [TALKBACK]'}
              </span>
              
              {msg.role === 'assistant' ? (
                <h3 style={{ fontSize: '24px', lineHeight: '1.4', margin: 0 }}>"{msg.content}"</h3>
              ) : (
                <p className="text-secondary" style={{ fontSize: '16px', lineHeight: '1.6', margin: 0, padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border-hairline)' }}>
                  {msg.content}
                </p>
              )}
            </div>
            
            {msg.evaluation && (
              <div style={{ width: '100%', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-hairline)', display: 'flex', gap: '40px', alignItems: 'center' }}>
                <VUMeter score={msg.evaluation.score} />
                <div style={{ flex: 1 }}>
                  <span className="mono text-faint" style={{ fontSize: '11px', display: 'block', marginBottom: '8px' }}>EVALUATION LOG</span>
                  <p className="text-secondary" style={{ fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                    {msg.evaluation.feedback}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current Turn */}
        {currentQuestion && (
          <div className="fade-in" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <span className="mono text-faint" style={{ fontSize: '11px' }}>DIRECTOR [TALKBACK]</span>
              <span className="mono text-rust" style={{ fontSize: '14px', border: '1px solid var(--rust-alert)', padding: '4px 8px' }}>
                T- {formatTime(timeLeft)}
              </span>
            </div>
            
            <h2 style={{ fontSize: '32px', lineHeight: '1.4', marginBottom: '32px' }}>
              "{currentQuestion}"
            </h2>
            
            <div className="panel" style={{ padding: '0', background: 'transparent', border: 'none' }}>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Transcribe audio or type response..."
                rows="6" 
                disabled={submitting}
                style={{ 
                  width: '100%', 
                  background: 'var(--surface-1)', 
                  border: '1px solid var(--border-hairline)', 
                  color: 'var(--text-primary)',
                  padding: '16px',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-body)',
                  resize: 'vertical',
                  marginBottom: '16px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brass-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-hairline)'}
              />
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={toggleRecording} 
                  disabled={submitting} 
                  style={{ 
                    padding: '12px 24px', 
                    background: isRecording ? 'rgba(199, 92, 74, 0.1)' : 'transparent', 
                    borderColor: isRecording ? 'var(--rust-alert)' : 'var(--border-hairline)',
                    color: isRecording ? 'var(--rust-alert)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px'
                  }}
                >
                  {isRecording ? (
                    <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rust-alert)' }}></span> STOP REC</>
                  ) : (
                    <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-faint)' }}></span> ENABLE MIC</>
                  )}
                </button>
                <button 
                  onClick={(e) => handleSubmitAnswer(e, false)} 
                  disabled={submitting || !currentAnswer.trim()} 
                  className="primary mono"
                  style={{ 
                    padding: '12px 32px',
                    fontSize: '13px',
                    opacity: (submitting || !currentAnswer.trim()) ? 0.5 : 1
                  }}
                >
                  {submitting ? 'PROCESSING...' : 'CUT & EVALUATE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {(loading || submitting) && !currentQuestion && (
          <div className="mono text-faint" style={{ textAlign: 'center', padding: '60px 20px', fontSize: '13px', letterSpacing: '1px' }}>
            AWAITING SIGNAL...
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mono text-rust" style={{ marginTop: '40px', padding: '16px', background: 'rgba(199, 92, 74, 0.1)', borderLeft: '2px solid var(--rust-alert)' }}>
          ERR: {errorMessage}
        </div>
      )}
    </div>
  );
}

export default ActiveInterview;

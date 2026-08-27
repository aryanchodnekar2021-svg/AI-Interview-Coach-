import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function InterviewSetup() {
  const [role, setRole] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) {
      setError('Role configuration is required before recording.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('role', role.trim());
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }

    try {
      const res = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to initialize session hardware.');

      navigate(`/session/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="layout-container fade-in">
      <Link to="/" className="mono text-faint" style={{ textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '32px' }}>
        &larr; LOG ARCHIVE
      </Link>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Pre-flight mic check</h1>
        <p className="text-secondary" style={{ fontSize: '16px', lineHeight: '1.5', maxWidth: '600px' }}>
          Define the role and provide context before we roll. The session will adapt to the parameters you provide.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '500px' }}>
        <div>
          <label className="mono text-secondary" style={{ display: 'block', fontSize: '13px', marginBottom: '8px', letterSpacing: '0.5px' }}>
            TARGET ROLE / POSITION
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: '1px solid var(--border-hairline)', 
              color: 'var(--text-primary)',
              fontSize: '18px',
              padding: '8px 0',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderBottomColor = 'var(--brass-accent)'}
            onBlur={(e) => e.target.style.borderBottomColor = 'var(--border-hairline)'}
            required
          />
        </div>

        <div>
          <label className="mono text-secondary" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', letterSpacing: '0.5px' }}>
            <span>CONTEXT UPLOAD (PDF)</span>
            <span className="text-faint">OPTIONAL</span>
          </label>
          
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".pdf"
              id="resume-upload"
              onChange={(e) => setResumeFile(e.target.files[0])}
              style={{ 
                position: 'absolute',
                width: '0.1px',
                height: '0.1px',
                opacity: 0,
                overflow: 'hidden',
                zIndex: -1
              }}
            />
            <label 
              htmlFor="resume-upload" 
              style={{
                display: 'block',
                width: '100%',
                padding: '16px',
                background: resumeFile ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${resumeFile ? 'var(--brass-accent)' : 'var(--border-hairline)'}`,
                color: resumeFile ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            >
              {resumeFile ? resumeFile.name : '+ SELECT FILE'}
            </label>
          </div>
        </div>

        {error && (
          <div className="mono text-rust" style={{ fontSize: '13px', padding: '12px', background: 'rgba(199, 92, 74, 0.1)', borderLeft: '2px solid var(--rust-alert)' }}>
            ERR: {error}
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          <button type="submit" className="primary" disabled={loading} style={{ padding: '14px 32px', fontSize: '15px', width: '100%', letterSpacing: '0.5px' }}>
            {loading ? 'INITIALIZING...' : 'START ROUND'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InterviewSetup;

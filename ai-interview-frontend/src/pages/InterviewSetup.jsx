import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function InterviewSetup() {
  const [role, setRole] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) {
      setError('Job role is required');
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

      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      navigate(`/session/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginBottom: '20px' }}>
        &larr; Back to Dashboard
      </button>

      <h2>Setup New Interview</h2>
      <p>Configure your mock interview by specifying the job role and optionally uploading your resume or a job description for tailored context.</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Job Role *</label>
          <input
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ padding: '12px', width: '100%', boxSizing: 'border-box', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Resume / Job Description (PDF) <span style={{ fontWeight: 'normal', color: '#666' }}>(Optional)</span></label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setResumeFile(e.target.files[0])}
            style={{ padding: '12px', width: '100%', boxSizing: 'border-box', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', background: '#f9f9f9' }}
          />
        </div>

        {error && <div style={{ color: '#d9534f', padding: '10px', background: '#fdf7f7', border: '1px solid #d9534f', borderRadius: '4px' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}>
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
      </form>
    </div>
  );
}

export default InterviewSetup;

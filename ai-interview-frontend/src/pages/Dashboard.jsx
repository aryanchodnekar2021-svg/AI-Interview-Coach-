import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/sessions/list', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const padZero = (num) => (num < 10 ? `0${num}` : num);

  return (
    <div className="layout-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '24px', marginBottom: '40px' }}>
        <div>
          <span className="mono text-faint" style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Log Archive</span>
          <h1 style={{ fontSize: '32px', marginTop: '8px' }}>Callback Master Tapes</h1>
        </div>
        <Link to="/setup" style={{ textDecoration: 'none' }}>
          <button className="primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
            New session
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="mono text-faint">Loading records...</div>
      ) : sessions.length === 0 ? (
        <div className="panel" style={{ border: '1px dashed var(--border-hairline)', textAlign: 'center', padding: '60px 20px' }}>
          <span className="mono text-faint" style={{ display: 'block', marginBottom: '16px' }}>NO LOGS FOUND</span>
          <p className="text-secondary">The master tape is empty. Step into the booth to record your first session.</p>
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr className="mono text-faint" style={{ fontSize: '12px', borderBottom: '1px solid var(--border-hairline)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>DATE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>ROLE / CONTEXT</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>TAKES</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'right' }}>AVG SCORE</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const date = new Date(s.created_at);
                const score = parseFloat(s.avg_score || 0);
                const isGood = score >= 7.5;
                const scoreColor = score === 0 ? 'var(--text-faint)' : (isGood ? 'var(--teal-success)' : 'var(--rust-alert)');

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                    <td className="mono text-secondary" style={{ padding: '16px', fontSize: '14px' }}>
                      {date.toISOString().split('T')[0]}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '15px' }}>{s.role}</div>
                      <div className="mono text-faint" style={{ fontSize: '12px', marginTop: '4px' }}>SESSION ID: {s.id.split('-')[0]}</div>
                    </td>
                    <td className="mono" style={{ padding: '16px', fontSize: '14px' }}>
                      {padZero(s.question_count || 0)}
                    </td>
                    <td className="mono" style={{ padding: '16px', fontSize: '14px', textAlign: 'right', color: scoreColor }}>
                      {score.toFixed(1)}/10
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

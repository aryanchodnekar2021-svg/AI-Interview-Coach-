import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/sessions/list', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.reverse()); // Show oldest to newest on graph, or process as needed
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = sessions.map((s, index) => ({
    name: `Session ${index + 1}`,
    score: parseFloat(s.avg_score) || 0,
    role: s.role
  }));

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Interview Dashboard</h2>
        <Link to="/setup" style={{ padding: '10px 20px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          + New Interview
        </Link>
      </div>

      <div style={{ marginTop: '2rem', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>Score Progress</h3>
        {sessions.length === 0 ? (
          <p>No interviews completed yet. Start one to see your progress!</p>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} name="Average Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Past Sessions</h3>
        {sessions.length === 0 ? (
          <p>No sessions found.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sessions.map(s => (
              <li key={s.id} style={{ padding: '15px', border: '1px solid #eee', marginBottom: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>Role:</strong> {s.role} <br/>
                  <small style={{ color: '#666' }}>{new Date(s.created_at).toLocaleString()}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Avg Score:</strong> {parseFloat(s.avg_score || 0).toFixed(1)}/10 <br/>
                  <small>{s.question_count} Questions</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

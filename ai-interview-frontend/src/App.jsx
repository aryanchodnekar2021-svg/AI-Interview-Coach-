import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import ActiveInterview from './pages/ActiveInterview';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<InterviewSetup />} />
        <Route path="/session/:id" element={<ActiveInterview />} />
      </Routes>
    </Router>
  );
}

export default App;
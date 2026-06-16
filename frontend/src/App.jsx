import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScannerUI from './pages/ScannerUI';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ScannerUI />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
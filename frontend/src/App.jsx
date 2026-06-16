import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScannerUI from './pages/ScannerUI';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ScannerUI />} />
      </Routes>
    </Router>
  );
}

export default App;
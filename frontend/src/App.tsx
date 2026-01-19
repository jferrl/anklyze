import './i18n/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { ClassifyPage } from './pages/ClassifyPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/classify" element={<ClassifyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

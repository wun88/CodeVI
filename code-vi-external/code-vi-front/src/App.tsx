import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import MainPage from './pages/MainPage';
import AboutUs from './pages/AboutUs';
import FAQ from './pages/FAQ';
import Community from './pages/Community';
import ContactUs from './pages/ContactUs';

const INTERNAL_PLATFORM_URL =
  import.meta.env.VITE_INTERNAL_URL ?? 'http://localhost:5174';

const goToPlatform = () => {
  window.location.href = INTERNAL_PLATFORM_URL;
};

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app-shell">
        <div className="main-wrapper">
          <Routes>
            <Route path="/" element={<MainPage onLoginClick={goToPlatform} />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/community" element={<Community />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

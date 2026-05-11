import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, LayoutDashboard, Zap, Shield, Globe } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Uploader from './components/Uploader';
import Scanner from './components/Scanner';
import Dashboard from './components/Dashboard';

function App() {
  const [isCvLoaded, setIsCvLoaded] = useState(false);

  useEffect(() => {
    const checkCV = setInterval(() => {
      if (window.cvReady) {
        setIsCvLoaded(true);
        clearInterval(checkCV);
      }
    }, 500);
    return () => clearInterval(checkCV);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-accent-cyan selection:text-black">
        <Navbar isCvLoaded={isCvLoaded} />
        
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/upload" element={<Uploader isCvLoaded={isCvLoaded} />} />
            <Route path="/scan" element={<Scanner isCvLoaded={isCvLoaded} />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        <footer className="py-10 border-t border-white/5 text-center text-gray-500 text-sm">
          <p>© 2026 SICON Smart Image Link Generator. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

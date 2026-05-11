import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Camera, Upload, LayoutDashboard } from 'lucide-react';

const Navbar = ({ isCvLoaded }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Scanner', path: '/scan', icon: <Camera size={18} /> },
    { name: 'Upload', path: '/upload', icon: <Upload size={18} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-morphism rounded-2xl px-6 py-3 border border-white/10">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-accent-cyan to-accent-purple p-2 rounded-lg group-hover:scale-110 transition-transform">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="text-2xl font-bold tracking-tighter text-white">SICON</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isCvLoaded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
              {isCvLoaded ? 'AI Engine Online' : 'AI Engine Booting...'}
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-accent-cyan ${
                location.pathname === item.path ? 'text-accent-cyan' : 'text-gray-400'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-accent-cyan transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

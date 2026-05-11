import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Shield, Globe, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent-cyan/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-accent-cyan mb-8 uppercase tracking-widest">
          <Zap size={12} /> The Future of Image Interaction
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-tight">
          Scan Any <span className="text-gradient">Image.</span> <br />
          Open Any <span className="text-gradient">Link.</span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          SICON transforms every pixel into a portal. No QR codes, no markers, no distortion. 
          Upload an image, map a URL, and watch the magic happen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/upload" className="px-8 py-4 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-black font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 justify-center">
            Start Mapping <ArrowRight size={20} />
          </Link>
          <Link to="/scan" className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-lg transition-colors flex items-center gap-2 justify-center">
            Open Scanner <Camera size={20} />
          </Link>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {[
          { icon: <Shield className="text-accent-cyan" />, title: "Secure Mapping", desc: "Encrypted image fingerprinting ensures your links stay connected to your images." },
          { icon: <Globe className="text-accent-purple" />, title: "Instant Access", desc: "No app download required. Just point the camera and the URL opens instantly." },
          { icon: <Zap className="text-yellow-400" />, title: "95%+ Accuracy", desc: "Advanced AI recognition handles rotation, scaling, and low lighting." }
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * i }}
            className="p-8 rounded-3xl glass-morphism border border-white/5 hover:border-white/20 transition-all"
          >
            <div className="mb-4">{feat.icon}</div>
            <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Hero;

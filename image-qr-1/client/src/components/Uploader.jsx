import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, CheckCircle, Loader2, Image as ImageIcon, Zap } from 'lucide-react';
import axios from 'axios';
import { extractFeatures } from '../utils/cvHelper';

const Uploader = ({ isCvLoaded }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setName(file.name.split('.')[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file || !url) return;
    setLoading(true);

    try {
      // 1. Convert file to base64 for persistence
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;

      // 2. Load image into memory to extract features
      const img = new Image();
      img.src = preview;
      await new Promise(r => img.onload = r);

      // 3. Extract ORB features
      const { descriptors } = extractFeatures(img);

      // 4. Send to backend
      await axios.post('/api/map', {
        name,
        url,
        descriptors,
        imageUrl: base64Image
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setFile(null);
      setPreview(null);
      setUrl('');
      setName('');
    } catch (error) {
      console.error('SICON Upload Error:', error);
      alert(`Mapping failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Image to <span className="text-gradient">URL Mapping</span></h2>
        <p className="text-gray-400">Map any image to a digital destination without altering its appearance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 ${
              isDragActive ? 'border-accent-cyan bg-accent-cyan/5' : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-xl shadow-2xl" />
            ) : (
              <>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                  <Upload className="text-accent-cyan" />
                </div>
                <p className="text-center font-medium">Drag & drop your image here</p>
                <p className="text-sm text-gray-500 mt-2">Supports PNG, JPG, JPEG</p>
              </>
            )}
          </div>
          
          {preview && (
            <button 
              onClick={() => setPreview(null)} 
              className="w-full py-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              Remove Image
            </button>
          )}
        </div>

        {/* Input Form */}
        <div className="glass-morphism p-8 rounded-3xl border border-white/10 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Image Reference Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Business Card"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Destination URL</label>
            <div className="relative">
              <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourlink.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>
          </div>

          <button 
            disabled={loading || !file || !url || !isCvLoaded}
            onClick={handleUpload}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              loading || !file || !url || !isCvLoaded
                ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-accent-cyan hover:scale-[1.02]'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : success ? <CheckCircle className="text-green-500" /> : <Zap size={18} />}
            {!isCvLoaded ? 'Waiting for AI Engine...' : loading ? 'Processing Image...' : success ? 'Successfully Mapped!' : 'Generate Smart Link'}
          </button>

          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
                  Image mapped successfully to the URL!
                </div>
                <Link 
                  to="/dashboard" 
                  className="w-full py-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan font-bold text-center block hover:bg-accent-cyan hover:text-black transition-all"
                >
                  View in Dashboard
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Uploader;

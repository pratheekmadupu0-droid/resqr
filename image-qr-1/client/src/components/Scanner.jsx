import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, ExternalLink, Zap, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const Scanner = ({ isCvLoaded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [matchedUrl, setMatchedUrl] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch mappings from DB
    const fetchMappings = async () => {
      try {
        const res = await axios.get('/api/mappings');
        setMappings(res.data);
      } catch (err) {
        console.error('Failed to fetch mappings:', err);
      }
    };
    fetchMappings();

    // Start Camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Camera access denied or not available.');
        setScanning(false);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!scanning || mappings.length === 0 || !isCvLoaded) return;

    const interval = setInterval(() => {
      processFrame();
    }, 1000); // Scan every 1 second to save CPU

    return () => clearInterval(interval);
  }, [scanning, mappings, isCvLoaded]);

  const processFrame = () => {
    if (!videoRef.current || !canvasRef.current || !window.cv) return;

    const cv = window.cv;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // 1. Capture Frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // 2. OpenCV Processing
      let src = cv.imread(canvas);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      let orb = new cv.ORB();
      let keypoints = new cv.KeyPointVector();
      let descriptors = new cv.Mat();
      orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

      if (descriptors.rows > 0) {
        // 3. Match against mappings
        const match = findMatch(descriptors);
        if (match) {
          setScanning(false);
          setMatchedUrl(match);
          handleScanSuccess(match);
        }
      }

      // Cleanup
      src.delete();
      gray.delete();
      orb.delete();
      keypoints.delete();
      descriptors.delete();
    } catch (e) {
      console.error('OpenCV frame processing error:', e);
    }
  };

  const findMatch = (queryDescriptors) => {
    const cv = window.cv;
    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
    let bestMatch = null;
    let maxMatches = 0;

    for (const entry of mappings) {
      if (!entry.descriptors || entry.descriptors.length === 0) continue;

      const dbMat = cv.matFromArray(entry.descriptors.length, 32, cv.CV_8U, entry.descriptors.flat());
      let matches = new cv.DMatchVector();
      bf.match(queryDescriptors, dbMat, matches);

      let goodMatchesCount = 0;
      for (let i = 0; i < matches.size(); i++) {
        if (matches.get(i).distance < 50) {
          goodMatchesCount++;
        }
      }

      if (goodMatchesCount > maxMatches && goodMatchesCount > 30) { // Slightly higher threshold for live video
        maxMatches = goodMatchesCount;
        bestMatch = entry;
      }

      dbMat.delete();
      matches.delete();
    }

    bf.delete();
    return bestMatch;
  };

  const handleScanSuccess = async (match) => {
    try {
      await axios.post(`/api/scan/${match._id}`);
      // Auto-open URL after 1.5s
      setTimeout(() => {
        window.open(match.url, '_blank');
      }, 1500);
    } catch (err) {
      console.error('Failed to update scan count:', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">SICON <span className="text-gradient">Scanner</span></h2>
        <p className="text-gray-400">Point your camera at any mapped image.</p>
      </div>

      <div className="relative w-full aspect-[3/4] max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black">
        {/* Scanning Animation */}
        {scanning && (
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-accent-cyan shadow-[0_0_15px_rgba(0,242,255,0.8)] z-10"
          />
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover transition-all ${!isCvLoaded ? 'blur-md grayscale' : 'grayscale opacity-60'}`}
        />
        
        {!isCvLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-accent-cyan animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-accent-cyan uppercase tracking-widest">Initializing AI Engine...</p>
            </div>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20" />
        
        {/* Corner Brackets */}
        <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-accent-cyan rounded-tl-xl" />
        <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-accent-cyan rounded-tr-xl" />
        <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-accent-cyan rounded-bl-xl" />
        <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-accent-cyan rounded-br-xl" />

        {/* Success Modal */}
        <AnimatePresence>
          {matchedUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm z-20"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-accent-cyan rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,242,255,0.5)]">
                  <Zap size={32} className="text-black fill-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{matchedUrl.name}</h3>
                  <p className="text-sm text-gray-400 mt-1 truncate max-w-[200px]">{matchedUrl.url}</p>
                </div>
                <button 
                  onClick={() => window.open(matchedUrl.url, '_blank')}
                  className="px-6 py-2 bg-white text-black rounded-full font-bold flex items-center gap-2 mx-auto"
                >
                  Open Link <ExternalLink size={16} />
                </button>
                <button 
                  onClick={() => { setMatchedUrl(null); setScanning(true); }}
                  className="text-sm text-gray-500 hover:text-white"
                >
                  Scan Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="space-y-4">
              <AlertCircle size={48} className="text-red-500 mx-auto" />
              <p className="text-sm text-gray-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <button 
          onClick={() => { setScanning(!scanning); setMatchedUrl(null); }}
          className="p-4 rounded-full glass-morphism border border-white/10 hover:border-accent-cyan transition-colors"
        >
          <RefreshCw size={24} className={scanning ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

export default Scanner;

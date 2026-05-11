import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, ExternalLink, Zap, AlertCircle, Loader2, Shield, QrCode, ArrowLeft } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, get, onValue } from 'firebase/database';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const ScannerPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('qr'); // 'qr' or 'facial'
  const [scanning, setScanning] = useState(true);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [facialMappings, setFacialMappings] = useState([]);
  const [error, setError] = useState(null);
  const [isCvLoaded, setIsCvLoaded] = useState(false);

  useEffect(() => {
    // Check if OpenCV is ready
    const checkCV = setInterval(() => {
      if (window.cvReady && window.cv) {
        setIsCvLoaded(true);
        clearInterval(checkCV);
      }
    }, 500);

    // Fetch facial mappings from DB
    // We fetch all profiles that have descriptors to match against
    const fetchFacialMappings = async () => {
      const usersRef = ref(db, 'users');
      onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const mappings = [];
          snapshot.forEach((userSnap) => {
            const profiles = userSnap.val().profiles;
            if (profiles) {
              Object.entries(profiles).forEach(([id, p]) => {
                if (p.scannerType === 'facial' && p.descriptors) {
                  mappings.push({ id, ...p });
                }
              });
            }
          });
          setFacialMappings(mappings);
        }
      });
    };
    fetchFacialMappings();

    return () => clearInterval(checkCV);
  }, []);

  // QR Scanner Logic
  useEffect(() => {
    if (mode !== 'qr' || !scanning) return;

    const scanner = new Html5QrcodeScanner("qr-reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });

    scanner.render((decodedText) => {
      // resqr.co.in/username or resqr.co.in/qr/profileId
      const url = new URL(decodedText);
      const path = url.pathname;
      scanner.clear();
      setScanning(false);
      navigate(path);
    }, (error) => {
      // silent error for scanning
    });

    return () => {
      scanner.clear().catch(e => console.error("Scanner clear error", e));
    };
  }, [mode, scanning, navigate]);

  // Facial Scanner Logic
  useEffect(() => {
    if (mode !== 'facial' || !scanning || facialMappings.length === 0 || !isCvLoaded) return;

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

    const interval = setInterval(() => {
      processFrame();
    }, 1000);

    return () => {
      clearInterval(interval);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, scanning, facialMappings, isCvLoaded]);

  const processFrame = () => {
    if (!videoRef.current || !canvasRef.current || !window.cv) return;

    const cv = window.cv;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      let src = cv.imread(canvas);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      let orb = new cv.ORB();
      let keypoints = new cv.KeyPointVector();
      let descriptors = new cv.Mat();
      orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

      if (descriptors.rows > 0) {
        const match = findMatch(descriptors);
        if (match) {
          setScanning(false);
          setMatchedProfile(match);
        }
      }

      src.delete(); gray.delete(); orb.delete(); keypoints.delete(); descriptors.delete();
    } catch (e) {
      console.error('AI frame processing error:', e);
    }
  };

  const findMatch = (queryDescriptors) => {
    const cv = window.cv;
    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
    let bestMatch = null;
    let maxMatches = 0;

    for (const entry of facialMappings) {
      if (!entry.descriptors) continue;

      const dbMat = cv.matFromArray(entry.descriptors.length, 32, cv.CV_8U, entry.descriptors.flat());
      let matches = new cv.DMatchVector();
      bf.match(queryDescriptors, dbMat, matches);

      let goodMatchesCount = 0;
      for (let i = 0; i < matches.size(); i++) {
        if (matches.get(i).distance < 50) {
          goodMatchesCount++;
        }
      }

      if (goodMatchesCount > maxMatches && goodMatchesCount > 35) {
        maxMatches = goodMatchesCount;
        bestMatch = entry;
      }

      dbMat.delete();
      matches.delete();
    }

    bf.delete();
    return bestMatch;
  };

  return (
    <div className="min-h-screen bg-[#040812] text-white font-manrope">
      {/* Header */}
      <div className="max-w-xl mx-auto px-6 pt-12 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
        </button>
        <div className="text-center">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter font-poppins">ResQR <span className="text-primary">Scanner</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Official Security Portal</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Mode Selector */}
        <div className="flex bg-[#11192A] p-2 rounded-[30px] border border-white/5 mb-12">
            <button 
                onClick={() => { setMode('qr'); setScanning(true); setMatchedProfile(null); }}
                className={`flex items-center gap-2 px-8 py-4 rounded-[24px] font-black italic uppercase tracking-widest text-xs transition-all ${mode === 'qr' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
            >
                <QrCode size={18} /> QR Scan
            </button>
            <button 
                onClick={() => { setMode('facial'); setScanning(true); setMatchedProfile(null); }}
                className={`flex items-center gap-2 px-8 py-4 rounded-[24px] font-black italic uppercase tracking-widest text-xs transition-all ${mode === 'facial' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
            >
                <Shield size={18} /> Facial Scan
            </button>
        </div>

        <div className="relative w-full aspect-[3/4] max-w-sm rounded-[60px] overflow-hidden shadow-2xl border-4 border-white/5 bg-slate-900">
          {scanning && (
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className={`absolute left-0 right-0 h-1 z-10 ${mode === 'facial' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-primary shadow-[0_0_15px_rgba(230,57,70,0.8)]'}`}
            />
          )}

          {mode === 'qr' ? (
            <div id="qr-reader" className="w-full h-full bg-slate-950 flex items-center justify-center" />
          ) : (
            <div className="w-full h-full relative">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover transition-all ${!isCvLoaded ? 'blur-md grayscale' : ''}`}
                />
                {!isCvLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Warming AI Neurons...</p>
                        </div>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
          
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20" />
          
          {/* Corner Brackets */}
          <div className={`absolute top-12 left-12 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl ${mode === 'facial' ? 'border-emerald-500' : 'border-primary'}`} />
          <div className={`absolute top-12 right-12 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl ${mode === 'facial' ? 'border-emerald-500' : 'border-primary'}`} />
          <div className={`absolute bottom-12 left-12 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl ${mode === 'facial' ? 'border-emerald-500' : 'border-primary'}`} />
          <div className={`absolute bottom-12 right-12 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl ${mode === 'facial' ? 'border-emerald-500' : 'border-primary'}`} />

          {/* Success Overlay */}
          <AnimatePresence>
            {matchedProfile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-md z-30"
              >
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/50">
                    <Zap size={32} className="text-white fill-white" />
                  </div>
                  <div>
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-none px-4 py-1 font-black italic uppercase tracking-widest text-[9px] mb-2">Identity Verified</Badge>
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter font-poppins">{matchedProfile.data?.name}</h3>
                  </div>
                  <Button 
                    onClick={() => navigate(matchedProfile.username ? `/${matchedProfile.username}` : `/qr/${matchedProfile.id}`)}
                    className="w-full h-16 bg-white text-black rounded-2xl font-black italic uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                  >
                    Open Vault <ExternalLink size={18} />
                  </Button>
                  <button 
                    onClick={() => { setMatchedProfile(null); setScanning(true); }}
                    className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest italic"
                  >
                    Scan Another Node
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-950 z-30">
              <div className="space-y-6">
                <AlertCircle size={48} className="text-primary mx-auto" />
                <p className="text-sm font-bold text-slate-400 italic uppercase tracking-widest">{error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="h-14 px-8 bg-white/5 border border-white/10 rounded-xl"
                >
                  RETRY SYSTEM
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center max-w-xs">
          <p className="text-slate-500 font-bold text-xs italic uppercase tracking-[0.2em] leading-relaxed">
            {mode === 'qr' 
                ? "Center the ResQR tag within the frame to access the medical vault." 
                : "Point the camera at the face of the identity holder for AI verification."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;

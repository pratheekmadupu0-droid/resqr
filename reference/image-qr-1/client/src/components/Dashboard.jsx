import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { LayoutDashboard, ExternalLink, Trash2, TrendingUp, Calendar, Eye } from 'lucide-react';

const Dashboard = () => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const res = await axios.get('/api/mappings');
      setMappings(res.data);
    } catch (err) {
      console.error('Failed to fetch mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this mapping?')) return;
    try {
      await axios.delete(`/api/mappings/${id}`);
      setMappings(mappings.filter(m => m._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const totalScans = mappings.reduce((acc, curr) => acc + (curr.scanCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-bold mb-2">Smart <span className="text-gradient">Dashboard</span></h2>
          <p className="text-gray-400">Manage your mapped images and track scan performance.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl glass-morphism border border-white/5 min-w-[140px]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Mappings</p>
            <p className="text-2xl font-bold">{mappings.length}</p>
          </div>
          <div className="p-4 rounded-2xl glass-morphism border border-white/5 min-w-[140px]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Scans</p>
            <p className="text-2xl font-bold text-accent-cyan">{totalScans}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : mappings.length === 0 ? (
        <div className="text-center py-20 glass-morphism rounded-3xl border border-white/5">
          <LayoutDashboard size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No mappings found</h3>
          <p className="text-gray-500">Create your first image link to see analytics here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mappings.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-3xl glass-morphism border border-white/5 hover:border-white/20 transition-all"
            >
              <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-black/40 relative">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <h3 className="font-bold text-lg truncate w-full">{item.name}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-accent-cyan" />
                    <span>{item.scanCount || 0} scans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.url}</p>
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-accent-cyan hover:text-white transition-colors">
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <a 
                    href={item.imageUrl} 
                    download={`${item.name}.png`}
                    className="flex-1 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-accent-cyan transition-all flex items-center justify-center gap-2"
                  >
                    Download Image
                  </a>
                  <button 
                    onClick={() => handleDelete(item._id)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

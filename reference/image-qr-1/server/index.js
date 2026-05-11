const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DATA_FILE = path.join(__dirname, 'data.json');

// Memory storage fallback
let localMappings = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    localMappings = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    console.error('Failed to load local data:', e);
  }
}

const saveLocal = async () => {
  try {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(localMappings, null, 2));
    console.log('Local data saved successfully');
  } catch (err) {
    console.error('Failed to save local data:', err);
  }
};

// Models
const ImageMapSchema = new mongoose.Schema({
  name: String,
  url: String,
  descriptors: mongoose.Schema.Types.Mixed,
  imageUrl: String,
  scanCount: { type: Number, default: 0 },
  lastScanned: Date,
  createdAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable auto _id to allow our custom string _id

const ImageMap = mongoose.model('ImageMap', ImageMapSchema);

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sicon')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.warn('MongoDB connection failed. Using local storage mode.');
  });

// Routes
app.get('/', (req, res) => {
  res.send('SICON API Running (Local Mode Available)...');
});

// Upload and Map
app.post('/api/map', async (req, res) => {
  try {
    const { name, url, descriptors, imageUrl } = req.body;
    console.log(`Mapping request: ${name} -> ${url}`);
    
    const newMap = { 
      _id: Date.now().toString(),
      name, url, descriptors, imageUrl,
      scanCount: 0,
      createdAt: new Date()
    };
    
    if (mongoose.connection.readyState === 1) {
      try {
        await new ImageMap(newMap).save();
      } catch (dbErr) {
        console.error('DB Save Error (ignoring):', dbErr.message);
      }
    }
    
    localMappings.push(newMap);
    await saveLocal();
    
    console.log('Mapping successful');
    res.status(201).json({ success: true, data: newMap });
  } catch (error) {
    console.error('API Map Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all mappings
app.get('/api/mappings', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const mappings = await ImageMap.find().sort({ createdAt: -1 });
      return res.json(mappings);
    }
    res.json([...localMappings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update scan count
app.post('/api/scan/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      await ImageMap.findByIdAndUpdate(id, { $inc: { scanCount: 1 }, lastScanned: new Date() });
    }
    
    const mapping = localMappings.find(m => m._id === id);
    if (mapping) {
      mapping.scanCount = (mapping.scanCount || 0) + 1;
      mapping.lastScanned = new Date();
      saveLocal();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete mapping
app.delete('/api/mappings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      await ImageMap.findByIdAndDelete(id);
    }
    localMappings = localMappings.filter(m => m._id !== id);
    saveLocal();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

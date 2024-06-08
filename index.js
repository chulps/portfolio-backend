const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { Translate } = require('@google-cloud/translate').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const FormData = require('form-data');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://chulps.github.io",
      "http://192.168.40.215:3000",
      "http://172.20.10.7:3000", // for testing in dev only
    ],
    methods: ["GET", "POST"],
  },
});

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://chulps.github.io",
      "http://192.168.40.215:3000",
      "http://172.20.10.7:3000", // for testing in dev only
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Rate limit configuration
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per window
  message: 'Too many requests from this IP, please try again after 1 minute',
  headers: true,
});

// Google Cloud Translation client
const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// API home route
app.get('/', (req, res) => {
  res.send('Hello, World! This is the backend for Chuck\'s portfolio.');
});

// API route for weather data
app.get('/api/openweather', apiLimiter, async (req, res) => {
  try {
    const { city, lang } = req.query;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=metric&lang=${lang}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching OpenWeatherAPI data:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/weather', apiLimiter, async (req, res) => {
  try {
    const { city, lang } = req.query;
    const url = `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}&lang=${lang}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching WeatherAPI data:", error);
    res.status(error.response.status).json({ error: error.message });
  }
});

// Google Places API route
app.get('/api/cities', apiLimiter, async (req, res) => {
  try {
    const { city } = req.query;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${city}&types=(cities)&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    res.json(response.data.predictions);
  } catch (error) {
    console.error("Error fetching city data from Google:", error);
    res.status(500).json({ error: error.message });
  }
});

// Google Geocode API route
app.get('/api/location', apiLimiter, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    const results = response.data.results;

    if (results.length === 0) {
      throw new Error("No results found for the provided latitude and longitude.");
    }

    const addressComponents = results[0].address_components;
    const cityComponent = addressComponents.find(component =>
      component.types.includes("locality")
    );

    if (!cityComponent) {
      throw new Error("City not found in the response.");
    }

    const city = cityComponent.long_name;
    res.json({ city });
  } catch (error) {
    console.error("Error fetching location data:", error);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// OpenAI API route
app.post('/api/openai', async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.OPENAI_API_URL}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transcription API route
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const audioPath = path.join(__dirname, req.file.path);
    console.log(`File path: ${audioPath}`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath));
    formData.append('model', 'whisper-1');

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    // Clean up the uploaded file after processing
    fs.unlinkSync(audioPath);

    const transcription = response.data.text;
    res.json({ transcription });
  } catch (error) {
    console.error('Error transcribing audio:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Detailed error response:', error.response.data);
    }
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

// COVID data API route
app.get('/api/covid', async (req, res) => {
  try {
    const options = {
      method: 'GET',
      url: process.env.COVID_URL,
      headers: {
        'X-RapidAPI-Key': process.env.COVID_API_KEY,
        'X-RapidAPI-Host': process.env.COVID_HOST,
      },
    };
    const response = await axios.request(options);
    res.json(response.data.response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Translation API routes
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const [translation] = await translate.translate(text, targetLanguage);
    res.json({ translatedText: translation });
  } catch (error) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/detect-language', async (req, res) => {
  try {
    const { text } = req.body;
    const [detection] = await translate.detect(text);
    res.json({ language: detection.language });
  } catch (error) {
    console.error("Error detecting language:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/translate-city', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const [translation] = await translate.translate(text, targetLanguage);
    res.json({ translatedText: translation });
  } catch (error) {
    console.error("Error translating city name:", error);
    res.status(500).json({ error: error.message });
  }
});

// URL metadata API route
app.get('/api/url-metadata', async (req, res) => {
  const { url } = req.query;
  try {
    const response = await axios.get(`https://api.linkpreview.net/?key=${process.env.LINK_PREVIEW_API_KEY}&q=${url}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

const chatRoomMessages = {};
const chatRoomTimers = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', ({ chatroomId, name, language }) => {
    console.log(`Received joinRoom event for chatroom: ${chatroomId}, user: ${name}, language: ${language}`);
    socket.join(chatroomId);
    console.log(`${name} joined chatroom: ${chatroomId}`);

    // Send the message history for the chatroom
    if (chatRoomMessages[chatroomId]) {
      socket.emit('messageHistory', chatRoomMessages[chatroomId]);
    }
  });

  socket.on('sendMessage', (message) => {
    const { text, sender, chatroomId } = message;
    console.log(`Message received from ${sender}: ${text}`);

    // Store the message in the chatroom's message history
    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(message);

    console.log(`Message history for ${chatroomId}:`, chatRoomMessages[chatroomId]);

    // Emit the message to the room
    io.to(chatroomId).emit('message', message);
  });

  socket.on('sendSystemMessage', (message) => {
    const { text, chatroomId } = message;
    console.log(`System message: ${text}`);

    // Store the message in the chatroom's message history
    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(message);

    console.log(`Message history for ${chatroomId}:`, chatRoomMessages[chatroomId]);

    // Emit the system message to the room
    io.to(chatroomId).emit('message', message);
  });

  socket.on('userTyping', ({ chatroomId, name }) => {
    console.log(`${name} is typing in chatroom: ${chatroomId}`);
    socket.broadcast.to(chatroomId).emit('userTyping', name);
  });

  socket.on('leaveRoom', ({ chatroomId, name }) => {
    socket.leave(chatroomId);
    console.log(`${name} left chatroom: ${chatroomId}`);

    // Emit a system message indicating the user has left
    const systemMessage = {
      text: `${name} has left the chat.`,
      chatroomId,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit('message', systemMessage);

    // Remove chatroom if no users are left
    if (io.sockets.adapter.rooms[chatroomId]?.length === 0) {
      clearTimeout(chatRoomTimers[chatroomId]);
      chatRoomTimers[chatroomId] = setTimeout(() => {
        if (!io.sockets.adapter.rooms[chatroomId]) {
          delete chatRoomMessages[chatroomId];
          console.log(`Chatroom ${chatroomId} deleted.`);
        }
      }, 30 * 60 * 1000); // 30 minutes in milliseconds
    }
  });

  socket.on('userAway', ({ chatroomId, name }) => {
    const systemMessage = {
      text: `${name} is away.`,
      chatroomId,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit('message', systemMessage);
  });

  
  socket.on('userReturned', ({ chatroomId, name }) => {
    const systemMessage = {
      text: `${name} has returned.`,
      chatroomId,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit('message', systemMessage);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

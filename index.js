const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const { Translate } = require("@google-cloud/translate").v2;
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const FormData = require("form-data");
const ffmpeg = require("fluent-ffmpeg");
const auth = require("./middleware/auth");

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
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files from the uploads directory
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.url);
  next();
}, express.static(path.join(__dirname, 'uploads')));

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://chulps.github.io",
      "http://192.168.40.215:3000",
      "http://172.20.10.7:3000", // for testing in dev only
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// Rate limit configuration
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per window
  message: "Too many requests from this IP, please try again after 1 minute",
  headers: true,
});

// Google Cloud Translation client
const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    if (err.name === 'MongoNetworkError') {
      console.error('Network-related issue connecting to MongoDB:', err.message);
    } else if (err.name === 'MongoParseError') {
      console.error('Configuration-related issue connecting to MongoDB:', err.message);
    } else {
      console.error('Other issue connecting to MongoDB:', err.message);
    }
  });

// MongoDB models
const Chatroom = require("./models/Chatroom");
const User = require("./models/User"); // Make sure to import your User model

// API home route
app.get("/", (req, res) => {
  res.send("Hello, World! This is the backend for Chuck's portfolio.");
});

// Authentication routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Profile routes
const profileRoutes = require("./routes/profile");
app.use("/api/profile", profileRoutes);

// Friend routes
const friendRoutes = require("./routes/friends");
app.use("/api/friends", friendRoutes);

// Chatroom routes
const chatroomRoutes = require("./routes/chatroom");
app.use("/api/chatrooms", chatroomRoutes);

// Notifications routes
const notificationsRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationsRoutes);

// Settings routes
const settingsRoutes = require("./routes/settings");
app.use("/api/settings", settingsRoutes);

// Search routes
const searchRoutes = require("./routes/search");
app.use("/api/search", searchRoutes);

// Temporary chatroom routes
const {
  router: temporaryChatroomsRouter,
  chatRooms,
} = require("./routes/temporaryChatrooms");
app.use("/api/temporary-chatrooms", temporaryChatroomsRouter);

// Protected route example
app.get("/api/protected", auth, (req, res) => {
  res.send("This is a protected route");
});

// API route for weather data
app.get("/api/openweather", apiLimiter, async (req, res) => {
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

app.get("/api/weather", apiLimiter, async (req, res) => {
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
app.get("/api/cities", apiLimiter, async (req, res) => {
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
app.get("/api/location", apiLimiter, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    const results = response.data.results;

    if (results.length === 0) {
      throw new Error(
        "No results found for the provided latitude and longitude."
      );
    }

    const addressComponents = results[0].address_components;
    const cityComponent = addressComponents.find((component) =>
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
app.post("/api/openai", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.OPENAI_API_URL}`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
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
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    console.log("Received a file for transcription");

    // Check if the file exists
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    const audioPath = path.join(__dirname, req.file.path);
    console.log("Audio path:", audioPath);

    const convertedAudioPath = audioPath.replace(
      path.extname(audioPath),
      ".wav"
    );

    // Convert the audio file to WAV format
    ffmpeg(audioPath)
      .toFormat("wav")
      .save(convertedAudioPath)
      .on("end", async () => {
        console.log("Audio converted to WAV format");

        const formData = new FormData();
        formData.append("file", fs.createReadStream(convertedAudioPath));
        formData.append("model", "whisper-1");

        console.log("Sending request to OpenAI API");

        const response = await axios.post(
          "https://api.openai.com/v1/audio/transcriptions",
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        console.log("Received response from OpenAI API");

        // Clean up the uploaded files after processing
        fs.unlinkSync(audioPath);
        fs.unlinkSync(convertedAudioPath);

        const transcription = response.data.text;
        res.json({ transcription });
      })
      .on("error", (error) => {
        console.error("Error during conversion:", error);
        res.status(500).json({ error: "Failed to convert audio file" });
      });
  } catch (error) {
    console.error(
      "Error transcribing audio:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Detailed error response:", error.response.data);
    }
    console.error(
      "Error response status:",
      error.response ? error.response.status : "N/A"
    );
    console.error(
      "Error response headers:",
      error.response ? error.response.headers : "N/A"
    );
    res
      .status(500)
      .json({ error: error.response ? error.response.data : error.message });
  }
});

// COVID data API route
app.get("/api/covid", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: process.env.COVID_URL,
      headers: {
        "X-RapidAPI-Key": process.env.COVID_API_KEY,
        "X-RapidAPI-Host": process.env.COVID_HOST,
      },
    };
    const response = await axios.request(options);
    res.json(response.data.response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Translation API routes
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const [translation] = await translate.translate(text, targetLanguage);
    res.json({ translatedText: translation });
  } catch (error) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/detect-language", async (req, res) => {
  try {
    const { text } = req.body;
    const [detection] = await translate.detect(text);
    res.json({ language: detection.language });
  } catch (error) {
    console.error("Error detecting language:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/translate-city", async (req, res) => {
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
app.get("/api/url-metadata", async (req, res) => {
  const { url } = req.query;
  try {
    const response = await axios.get(
      `https://api.linkpreview.net/?key=${process.env.LINK_PREVIEW_API_KEY}&q=${url}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching URL metadata:", error);
    res.status(500).json({ error: error.message });
  }
});

const chatRoomMessages = {};
const chatRoomTimers = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinNotificationsRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined notifications room`);
  });

  socket.on('markNotificationsAsRead', async (userId) => {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.notifications.forEach(notification => {
          notification.read = true;
        });
        await user.save();
        io.to(userId).emit('notificationsRead');
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  });

  socket.on("joinRoom", async ({ chatroomId, name, language }) => {
    console.log(
      `Received joinRoom event for chatroom: ${chatroomId}, user: ${name}, language: ${language}`
    );
    socket.join(chatroomId);
    console.log(`${name} joined chatroom: ${chatroomId}`);

    // Send the message history for the chatroom
    if (chatRoomMessages[chatroomId]) {
      socket.emit("messageHistory", chatRoomMessages[chatroomId]);
    }

    // Add user to chatroom members
    try {
      const user = await User.findOne({ username: name });
      if (!user) {
        throw new Error("User not found");
      }

      const chatroom = await Chatroom.findById(chatroomId);
      if (!chatroom) {
        throw new Error("Chatroom not found");
      }

      if (!chatroom.members.includes(user._id)) {
        chatroom.members.push(user._id);
        await chatroom.save();
      }

      // Update the members count
      io.to(chatroomId).emit("updateMembersCount", chatroom.members.length);
    } catch (error) {
      console.error("Error adding user to chatroom members:", error);
    }
  });

  socket.on("sendMessage", async (message) => {
    const { text, sender, chatroomId } = message;
    console.log(`Message received from ${sender}: ${text}`);

    // Store the message in the chatroom's message history
    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(message);

    console.log(
      `Message history for ${chatroomId}:`,
      chatRoomMessages[chatroomId]
    );

    // Emit the message to the room
    io.to(chatroomId).emit("message", message);

    // Save message to MongoDB
    if (message.type === "user") {
      try {
        console.log("Attempting to find chatroom...");
        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) {
          throw new Error("Chatroom not found");
        }

        console.log("Chatroom found:", chatroom);

        console.log("Received sender:", sender);
        console.log("Sender data type:", typeof sender);
        console.log("Sender length:", sender.length);

        const user = await User.findOne({ username: sender });
        if (!user) {
          throw new Error("User not found");
        }

        const newMessage = {
          sender: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          text: text,
          timestamp: new Date(),
        };

        console.log("New message to be added:", newMessage);

        chatroom.messages.push(newMessage);
        await chatroom.save();
        console.log("Message saved to chatroom in MongoDB");
      } catch (error) {
        console.error("Error saving message to MongoDB:", error);
      }
    }
  });

  socket.on("sendSystemMessage", (message) => {
    const { text, chatroomId } = message;
    console.log(`System message: ${text}`);

    // Store the message in the chatroom's message history
    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(message);

    console.log(
      `Message history for ${chatroomId}:`,
      chatRoomMessages[chatroomId]
    );

    // Emit the system message to the room
    io.to(chatroomId).emit("message", message);
  });

  socket.on("userTyping", ({ chatroomId, name }) => {
    console.log(`${name} is typing in chatroom: ${chatroomId}`);
    socket.broadcast.to(chatroomId).emit("userTyping", name);
  });

  socket.on("leaveRoom", ({ chatroomId, name }) => {
    socket.leave(chatroomId);
    console.log(`${name} left chatroom: ${chatroomId}`);

    // Emit a system message indicating the user has left
    const systemMessage = {
      text: `${name} has left the chat.`,
      chatroomId,
      type: "system",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit("message", systemMessage);

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

  socket.on("userAway", ({ chatroomId, name }) => {
    const systemMessage = {
      text: `${name} is away.`,
      chatroomId,
      type: "system",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit("message", systemMessage);
  });

  socket.on("userReturned", ({ chatroomId, name }) => {
    const systemMessage = {
      text: `${name} has returned.`,
      chatroomId,
      type: "system",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    if (!chatRoomMessages[chatroomId]) {
      chatRoomMessages[chatroomId] = [];
    }
    chatRoomMessages[chatroomId].push(systemMessage);

    io.to(chatroomId).emit("message", systemMessage);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  // WebRTC signaling events
  socket.on("webrtc-offer", ({ offer, chatroomId }) => {
    console.log("Received WebRTC offer:", offer);
    socket.broadcast.to(chatroomId).emit("webrtc-offer", offer);
  });

  socket.on("webrtc-answer", ({ answer, chatroomId }) => {
    console.log("Received WebRTC answer:", answer);
    socket.broadcast.to(chatroomId).emit("webrtc-answer", answer);
  });

  socket.on("webrtc-ice-candidate", ({ candidate, chatroomId }) => {
    console.log("Received ICE candidate:", candidate);
    socket.broadcast.to(chatroomId).emit("webrtc-ice-candidate", candidate);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

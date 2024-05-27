const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { Translate } = require('@google-cloud/translate').v2;
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Define the rate limit configuration
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 20 requests per window
  message: 'Too many requests from this IP, please try again after 1 minute',
  headers: true,
});

// Initialize Google Cloud Translation client with API key
const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

// API home route
app.get('/', (req, res) => {
  res.send('Hello, World! This is the backend for Chucks portfolio.');
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

// Using Google Places API to fetch city suggestions
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

// API route for getting city by lat/lon
app.get('/api/location', apiLimiter, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    
    // Log the response to check its structure
    console.log("Google Geocode API response:", response.data);

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
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// API route for OpenAI
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

// API route for COVID data
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

// API route for translation
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    console.log(`Translating text: "${text}" to "${targetLanguage}"`);
    const [translation] = await translate.translate(text, targetLanguage);
    console.log(`Translated text: "${translation}"`);
    res.json({ translatedText: translation });
  } catch (error) {
    console.error("Error translating text:", error);

    if (error.code === 429) {
      res.status(429).json({ error: "Too many requests, please try again later." });
    } else if (error.code === 403) {
      res.status(403).json({ error: "API not enabled or not configured correctly." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// detect language
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

// translate city name
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

// Define the rate limit configuration
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 1 minute',
  headers: true, 
});

// api home route
app.get('/', (req, res) => {
  res.send('Hello, World! This is the backend for Chucks portfolio. ');
});

// api route for weather data
app.get('/api/openweather', apiLimiter, async (req, res) => {
  try {
    const { city } = req.query;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=metric`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching OpenWeatherAPI data:", error);
    res.status(500).json({ error: error.message });
  }
});

// api route for WeatherAPI data
app.get('/api/weather', apiLimiter, async (req, res) => {
  try {
    const { city } = req.query;
    const url = `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`;
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

// api route for getting city by lat/lon
app.get('/api/location', apiLimiter, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    const city = response.data.results[0].address_components.find(component =>
      component.types.includes("locality")
    ).long_name;
    res.json({ city });
  } catch (error) {
    console.error("Error fetching location data:", error);
    res.status(500).json({ error: error.message });
  }
});

// api route for openai
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

// api route for covid data
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

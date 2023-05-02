// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

// api home route
app.get('/', (req, res) => {
  res.send('Hello, World! This is your Express server.');
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

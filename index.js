// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv').config();
const app = express();
app.use(cors({ origin: 'https://chulps.github.io/react-gh-pages/'})); // For production

app.use(express.json());

app.post('/api/openai', async (req, res) => {
  try {
    const response = await axios.post(
      process.env.OPENAI_API_URL,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

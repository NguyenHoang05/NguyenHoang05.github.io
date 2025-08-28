const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = 'AIzaSyBg_9syCwIm3jI8aE1KT7vtP00tCzP5EnU'; // Thay bằng API Key Gemini của bạn

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: message }] }]
      }
    );
    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ Gemini.";
    res.json({ reply });
  } catch (err) {
    console.error("Lỗi khi gọi Gemini API:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
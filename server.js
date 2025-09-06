const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

let cache = {};
const wordsFile = path.join(__dirname, 'words.json');

// Load words.json if exists
if (fs.existsSync(wordsFile)) {
  cache = JSON.parse(fs.readFileSync(wordsFile, 'utf-8'));
}

app.use(express.json());
app.use(express.static('public'));

// Endpoint to search word
app.post('/search', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'No word provided' });

  // Check internal cache
  if (cache[word]) return res.json(cache[word]);

  try {
    // Fallback API: Gemini, MyMemory, LibreTranslate
    const geminiResponse = await axios.post('https://api.gemini.com/translate', { word });
    const data = geminiResponse.data;

    // Example structure
    const result = {
      translation: data.translation,
      examples: data.examples,
      audio: data.audio
    };

    // Save to cache
    cache[word] = result;
    fs.writeFileSync(wordsFile, JSON.stringify(cache, null, 2));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

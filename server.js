const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Endpoint para palavras
app.get('/translate', (req, res) => {
  const word = req.query.word;
  if (!word) return res.json({ error: "Nenhuma palavra fornecida" });

  res.json({
    word: word,
    meaning: "tradução de exemplo",
    phonetic: "/fəˈnɛtɪk/",
    examples: [
      `Exemplo 1 com ${word}`,
      `Exemplo 2 com ${word}`
    ]
  });
});

// Endpoint para textos
app.get('/translateText', (req, res) => {
  const text = req.query.text;
  if (!text) return res.json({ error: "Nenhum texto fornecido" });

  res.json({
    text: text,
    translation: "tradução de exemplo"
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

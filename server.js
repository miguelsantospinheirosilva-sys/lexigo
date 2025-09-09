const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();

app.use(express.json());

// Cache interno
let internalCache = {};

// Carregar múltiplos arquivos JSON fixos (bloco1.json até bloco5.json)
const fixedJSONFiles = [];
for (let i = 1; i <= 5; i++) {
  const filePath = path.join(__dirname, `bloco${i}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    fixedJSONFiles.push(data);
  }
}

// JSON automático para palavras pesquisadas
const autoJSONPath = path.join(__dirname, 'auto_words.json');
let autoWords = {};
if (fs.existsSync(autoJSONPath)) {
  autoWords = JSON.parse(fs.readFileSync(autoJSONPath, 'utf8'));
}

// Funções de busca e atualização
function searchFixedWords(word) {
  for (let file of fixedJSONFiles) {
    if (file[word]) return file[word];
  }
  return null;
}

function searchAutoWords(word) {
  return autoWords[word] || null;
}

function updateAutoWords(word, data) {
  autoWords[word] = data;
  fs.writeFileSync(autoJSONPath, JSON.stringify(autoWords, null, 2));
}

// Função para consultar APIs gratuitas
async function fetchFromAPIs(word) {
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const result = res.data[0];
    const meaning = result.meanings[0].definitions[0].definition;
    const phonetic = result.phonetic || '';
    const audio = result.phonetics[0]?.audio || '';
    return { word, meaning, phonetic, audio };
  } catch (err) {
    return null;
  }
}

// Endpoint de tradução
app.get('/translate/:word', async (req, res) => {
  const word = req.params.word.toLowerCase();

  if (internalCache[word]) return res.json(internalCache[word]);

  const fixedData = searchFixedWords(word);
  if (fixedData) {
    internalCache[word] = fixedData;
    return res.json(fixedData);
  }

  const autoData = searchAutoWords(word);
  if (autoData) {
    internalCache[word] = autoData;
    return res.json(autoData);
  }

  const apiData = await fetchFromAPIs(word);
  if (apiData) {
    internalCache[word] = apiData;
    updateAutoWords(word, apiData);
    return res.json(apiData);
  }

  res.status(404).json({ error: 'Word not found' });
});

// Usar a porta fornecida pelo ambiente ou fallback
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

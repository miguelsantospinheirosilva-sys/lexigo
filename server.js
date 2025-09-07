const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const app = express();
app.use(cors());

const CACHE_FILE = 'word_cache.json';

// Carregar cache local
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE));
}

// Função para salvar cache
function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Fallback de APIs gratuitas conhecidas:
// 1. MyMemory (gratuita, limites diários)
// 2. LibreTranslate (gratuita, sem necessidade de chave)

async function getTranslationFromAPIs(word) {
  // Primeiro: MyMemory
  try {
    const res = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: word, langpair: 'en|pt' }
    });
    const translation = res.data.responseData.translatedText;
    return { translation, examples: [`Exemplo 1: ${word}`, `Exemplo 2: ${word}`], phonetic: "" };
  } catch (e) {
    console.log("MyMemory falhou, tentando LibreTranslate...");
  }

  // Segundo: LibreTranslate
  try {
    const res = await axios.post('https://libretranslate.com/translate', {
      q: word,
      source: 'en',
      target: 'pt',
      format: 'text'
    }, { headers: { 'Content-Type': 'application/json' } });
    const translation = res.data.translatedText;
    return { translation, examples: [`Exemplo 1: ${word}`, `Exemplo 2: ${word}`], phonetic: "" };
  } catch (e) {
    console.log("LibreTranslate falhou, usando fallback interno...");
  }

  // Fallback interno
  return { translation: "tradução não disponível", examples: [], phonetic: "" };
}

// Endpoint para palavras
app.get('/translate', async (req, res) => {
  const word = req.query.word;
  if (!word) return res.json({ error: "Nenhuma palavra fornecida" });

  // Checar cache interno
  if (cache[word]) return res.json(cache[word]);

  // Buscar nas APIs gratuitas
  const result = await getTranslationFromAPIs(word);

  const response = {
    word: word,
    meaning: result.translation,
    examples: result.examples,
    phonetic: result.phonetic
  };

  // Salvar no cache interno + arquivo JSON
  cache[word] = response;
  saveCache();

  res.json(response);
});

// Endpoint para textos
app.get('/translateText', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.json({ error: "Nenhum texto fornecido" });

  try {
    const resAPI = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: 'en',
      target: 'pt',
      format: 'text'
    }, { headers: { 'Content-Type': 'application/json' } });

    res.json({ text, translation: resAPI.data.translatedText });
  } catch (e) {
    res.json({ text, translation: "tradução não disponível" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

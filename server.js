const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

app.use(cors());

// Porta para Base44
const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

// Função para validar objetos de palavra
function isValidWord(obj) {
  return obj && obj.word;
}

// Carregar palavras fixas
fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const json = JSON.parse(data);
    if (json.words && Array.isArray(json.words)) {
      fixedWords = fixedWords.concat(json.words.filter(isValidWord));
    }
    if (json.expressions && Array.isArray(json.expressions)) {
      fixedWords = fixedWords.concat(json.expressions.map(e => ({ word: e.expression, translation: e.translation })));
    }
  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno
let cache = {};

// Função para buscar dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Word is undefined" };

  // Verifica cache interno
  if (cache[word]) return cache[word];

  // Verifica JSON fixo
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    // Adiciona campos phonetic e audio mesmo que vazios
    fixed.phonetic = fixed.phonetic || "";
    fixed.audio = fixed.audio || `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;
    cache[word] = fixed;
    return fixed;
  }

  // Chamada à API externa gratuita
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = res.data[0];
    const result = {
      word: word,
      translation: data.meanings[0].definitions[0].definition || "",
      phonetic: data.phonetic || "",
      audio: data.phonetics && data.phonetics[0] ? data.phonetics[0].audio : `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`
    };
    cache[word] = result;
    return result;
  } catch (err) {
    return { word, translation: "Translation not found", phonetic: "", audio: `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}` };
  }
}

// Endpoint de tradução
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const result = await getWordData(word);
  res.json(result);
});

// Inicia servidor
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

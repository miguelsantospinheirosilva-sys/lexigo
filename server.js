const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

// Habilita CORS para que o Base44 consiga chamar o backend
app.use(cors());

// Porta dinâmica para Render
const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

// Carregar palavras fixas
fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const parsed = JSON.parse(data);
    // Proteção: só adiciona objetos que tenham 'word'
    if (parsed.words && Array.isArray(parsed.words)) {
      fixedWords = fixedWords.concat(parsed.words.filter(w => w.word));
    }
    if (parsed.expressions && Array.isArray(parsed.expressions)) {
      fixedWords = fixedWords.concat(parsed.expressions.map(e => ({ word: e.expression, translation: e.translation })));
    }
  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno para respostas recentes
let cache = {};

// Função para buscar tradução, pronúncia e áudio
async function getWordData(word) {
  if (!word) return { error: "Word parameter is missing" };

  // Primeiro verifica cache interno
  if (cache[word]) return cache[word];

  // Depois verifica palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    cache[word] = fixed;
    return fixed;
  }

  // Se não achar, chama APIs externas
  try {
    const translationRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = translationRes.data[0];

    const result = {
      word: word,
      meaning: data.meanings && data.meanings[0] && data.meanings[0].definitions[0] ? data.meanings[0].definitions[0].definition : "",
      phonetic: data.phonetic || "",
      audio: data.phonetics && data.phonetics[0] ? data.phonetics[0].audio : ""
    };

    // Salvar no cache interno
    cache[word] = result;

    return result;

  } catch (err) {
    return { error: "Unable to connect to the translation service. Please check your internet connection and try again." };
  }
}

// Endpoint de tradução
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const result = await getWordData(word);
  res.json(result);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

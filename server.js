const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

// Habilita CORS para que o front-end (Base44) consiga chamar o backend
app.use(cors());

// Porta padrão para Base44 / Render
const PORT = process.env.PORT || 3000;

// Arquivos JSON fixos
const fixedFiles = ["bloco1.json", "bloco2.json", "bloco3.json", "bloco4.json", "bloco5.json"];
let fixedWords = [];

// Carregar palavras e expressões dos arquivos JSON
fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const json = JSON.parse(data);

    // Adiciona palavras
    if (Array.isArray(json.words)) {
      const validWords = json.words.filter(w => w.word && w.translation);
      fixedWords = fixedWords.concat(validWords);
    }

    // Adiciona expressões
    if (Array.isArray(json.expressions)) {
      const validExpr = json.expressions
        .filter(e => e.expression && e.translation)
        .map(e => ({ word: e.expression, translation: e.translation }));
      fixedWords = fixedWords.concat(validExpr);
    }

  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno para respostas recentes
let cache = {};

// Função para buscar tradução, pronúncia e áudio
async function getWordData(word) {
  if (!word) return { error: "Invalid word input." };

  // Primeiro verifica cache interno
  if (cache[word.toLowerCase()]) return cache[word.toLowerCase()];

  // Depois verifica palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    cache[word.toLowerCase()] = fixed;
    return fixed;
  }

  // Se não achar, chama APIs externas
  try {
    const translationRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = translationRes.data[0];

    const result = {
      word: word,
      meaning: data.meanings && data.meanings[0] && data.meanings[0].definitions[0]
        ? data.meanings[0].definitions[0].definition
        : "No definition found",
      phonetic: data.phonetic || "",
      audio: data.phonetics && data.phonetics[0] ? data.phonetics[0].audio : ""
    };

    // Salvar no cache interno
    cache[word.toLowerCase()] = result;

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

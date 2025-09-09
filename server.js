const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");

const app = express();

// Habilita CORS para que o front-end consiga chamar o backend
app.use(cors());

// Porta padrão para Render
const PORT = process.env.PORT || 3000;

// Arquivos JSON fixos
const fixedFiles = ["bloco1.json", "bloco2.json", "bloco3.json", "bloco4.json", "bloco5.json"];
let fixedWords = [];
let fixedExpressions = [];

// Carregar palavras e expressões fixas
fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const jsonData = JSON.parse(data);

    // Proteção: carrega somente se existir e for array
    if (jsonData.words && Array.isArray(jsonData.words)) {
      fixedWords = fixedWords.concat(jsonData.words.filter(w => w.word));
    }
    if (jsonData.expressions && Array.isArray(jsonData.expressions)) {
      fixedExpressions = fixedExpressions.concat(jsonData.expressions.filter(e => e.expression));
    }

  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno para respostas recentes
let cache = {};

// Função para buscar dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Palavra inválida" };

  // Primeiro verifica cache
  if (cache[word]) return cache[word];

  // Verifica palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    cache[word] = fixed;
    return fixed;
  }

  // Verifica expressões fixas
  let fixedExpr = fixedExpressions.find(e => e.expression.toLowerCase() === word.toLowerCase());
  if (fixedExpr) {
    cache[word] = fixedExpr;
    return fixedExpr;
  }

  // Se não achar, tenta API externa
  try {
    const translationRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = translationRes.data[0];

    const result = {
      word: word,
      meaning: data.meanings && data.meanings[0] ? data.meanings[0].definitions[0].definition : "",
      phonetic: data.phonetic || "",
      audio: data.phonetics && data.phonetics[0] ? data.phonetics[0].audio : ""
    };

    // Salvar no cache
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

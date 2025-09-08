const express = require("express");
const axios = require("axios");
const fs = require("fs");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Cache interno em memória
let cache = {};

// JSON fixo carregado do GitHub ou local
let fixedWords = {};
try {
  fixedWords = JSON.parse(fs.readFileSync("fixed_words.json"));
} catch (err) {
  console.log("Erro ao carregar fixed_words.json:", err);
}

// Função para atualizar JSON automático
function updateJSON(word, data) {
  let autoWords = {};
  const filePath = "auto_words.json";
  try {
    autoWords = JSON.parse(fs.readFileSync(filePath));
  } catch (err) {
    autoWords = {};
  }
  autoWords[word] = data;
  fs.writeFileSync(filePath, JSON.stringify(autoWords, null, 2));
}

// Função principal de tradução
async function fetchFromAPIs(word) {
  let result = null;

  // DictionaryAPI
  try {
    const dictResp = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (dictResp.data && dictResp.data[0]) {
      const entry = dictResp.data[0];
      result = {
        word: entry.word,
        meaning: entry.meanings[0].definitions[0].definition || "",
        phonetic: entry.phonetic || "",
        audio: entry.phonetics && entry.phonetics[0] ? entry.phonetics[0].audio : ""
      };
      return result;
    }
  } catch (err) {
    console.log("DictionaryAPI falhou para:", word);
  }

  // OwlBot API (gratuita com limite diário)
  try {
    const owlResp = await axios.get(`https://owlbot.info/api/v4/dictionary/${word}`, {
      headers: { Authorization: "Token " } // você pode deixar vazio, OwlBot funciona parcialmente
    });
    if (owlResp.data) {
      result = {
        word: owlResp.data.word,
        meaning: owlResp.data.definitions[0].definition || "",
        phonetic: owlResp.data.pronunciation || "",
        audio: owlResp.data.definitions[0].emoji || ""
      };
      return result;
    }
  } catch (err) {
    console.log("OwlBot API falhou para:", word);
  }

  // Free Dictionary API
  try {
    const freeResp = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (freeResp.data && freeResp.data[0]) {
      const entry = freeResp.data[0];
      result = {
        word: entry.word,
        meaning: entry.meanings[0].definitions[0].definition || "",
        phonetic: entry.phonetic || "",
        audio: entry.phonetics && entry.phonetics[0] ? entry.phonetics[0].audio : ""
      };
      return result;
    }
  } catch (err) {
    console.log("Free Dictionary API falhou para:", word);
  }

  // Se nenhuma API respondeu
  return { word, meaning: "Tradução não encontrada", phonetic: "", audio: "" };
}

// Endpoint de tradução
app.get("/translate/:word", async (req, res) => {
  const word = req.params.word.toLowerCase();

  // 1. Cache interno
  if (cache[word]) return res.json(cache[word]);

  // 2. JSON fixo
  if (fixedWords[word]) {
    cache[word] = fixedWords[word];
    return res.json(fixedWords[word]);
  }

  // 3. JSON automático (auto_words.json)
  let autoWords = {};
  try {
    autoWords = JSON.parse(fs.readFileSync("auto_words.json"));
    if (autoWords[word]) {
      cache[word] = autoWords[word];
      return res.json(autoWords[word]);
    }
  } catch (err) {}

  // 4. Consultar APIs
  const data = await fetchFromAPIs(word);

  // Atualiza cache e JSON automático
  cache[word] = data;
  updateJSON(word, data);

  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

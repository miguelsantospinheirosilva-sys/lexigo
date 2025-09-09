const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

// Habilita CORS para que Base44 consiga chamar o backend
app.use(cors());

// Porta padrão para Base44
const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

// Carregar palavras fixas
fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const jsonData = JSON.parse(data);
    if (jsonData.words) {
      fixedWords = fixedWords.concat(jsonData.words.filter(w => w.word));
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

  // Depois verifica palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    cache[word] = fixed;
    return fixed;
  }

  // Se não achar, chama APIs externas
  try {
    // Tradução e phonetic via Free Dictionary API
    const dictRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = dictRes.data[0];

    const phonetic = data.phonetic || (data.phonetics && data.phonetics[0] ? data.phonetics[0].text : "");
    
    const result = {
      word: word,
      translation: word, // opcional: traduzir aqui se tiver outra API gratuita
      phonetic: phonetic
    };

    cache[word] = result;
    return result;
  } catch (err) {
    return { error: "Não foi possível obter dados da palavra." };
  }
}

// Endpoint de tradução + fonética
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const result = await getWordData(word);
  res.json(result);
});

// Proxy de TTS para evitar problemas de CORS
app.get("/tts/:word", async (req, res) => {
  const { word } = req.params;
  if (!word) return res.status(400).send("Palavra inválida");

  try {
    // Usando TTS gratuito sem key (voz simples)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;

    const response = await axios({
      method: "GET",
      url: ttsUrl,
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    res.setHeader("Content-Type", "audio/mpeg");
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Erro ao gerar áudio TTS");
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

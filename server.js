// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

for (const file of fixedFiles) {
  try {
    const data = fs.readFileSync(path.join(__dirname, file), "utf-8");
    const json = JSON.parse(data);

    if (json.words) {
      fixedWords = fixedWords.concat(json.words.filter(w => w.word));
    }
  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
}

// Cache interno
let cache = {};

// Chave Gemini API
const GEMINI_API_KEY = "AIzaSyCjpLTtmRSQiRH0CVVVWLsqlQK-KIIXx7U";

// Função para obter dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Palavra inválida" };
  const lw = word.toLowerCase();

  if (cache[lw]) return cache[lw];

  // Verifica nos fixedWords
  const fixed = fixedWords.find(w => w.word.toLowerCase() === lw);
  if (fixed) {
    cache[lw] = fixed;
    return fixed;
  }

  let translation = "Tradução não encontrada";
  let phonetic = "";
  let audioUrl = "";

  // 1️⃣ Tentar Gemini API para tradução
  try {
    const res = await axios.post(
      "https://translation.googleapis.com/language/translate/v2",
      {},
      {
        params: {
          q: word,
          target: "pt",
          key: GEMINI_API_KEY
        }
      }
    );
    if (res.data && res.data.data && res.data.data.translations) {
      translation = res.data.data.translations[0].translatedText || translation;
    }
  } catch (err) {
    console.log("Gemini API falhou:", err.message);
  }

  // 2️⃣ DictionaryAPI para fonético
  try {
    const dictRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const dictData = dictRes.data[0];

    if (dictData) {
      phonetic = dictData.phonetic || "";
      if (dictData.phonetics && dictData.phonetics.length > 0) {
        const audioObj = dictData.phonetics.find(p => p.audio) || dictData.phonetics[0];
        audioUrl = audioObj.audio || "";
      }
    }
  } catch (err) {
    console.log("DictionaryAPI falhou:", err.message);
  }

  // 3️⃣ Fallback TTS gratuito
  if (!audioUrl) {
    audioUrl = `/tts?word=${encodeURIComponent(word)}`;
  }

  const result = { word, translation, phonetic, audio: audioUrl };
  cache[lw] = result;
  return result;
}

// Proxy TTS
app.get("/tts", async (req, res) => {
  const { word } = req.query;
  if (!word) return res.status(400).send("Missing word");

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;
    const response = await fetch(ttsUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("Erro TTS:", err.message);
    res.status(500).send("Erro ao gerar áudio");
  }
});

// Endpoint principal
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const data = await getWordData(word);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

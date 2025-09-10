import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json", "bloco2.json", "bloco3.json", "bloco4.json", "bloco5.json"];
let fixedWords = [];

fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const json = JSON.parse(data);
    if (json.words && Array.isArray(json.words)) {
      fixedWords = fixedWords.concat(json.words.filter(w => w.word));
    }
  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno
let cache = {};

// Função para obter dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Word undefined" };

  // Verifica cache
  if (cache[word]) return cache[word];

  // Verifica palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    cache[word] = {
      word: fixed.word,
      translation: fixed.translation || "Tradução não encontrada",
      phonetic: fixed.phonetic || "",
      audio: fixed.audio || ""
    };
    return cache[word];
  }

  // Se não estiver no JSON, chama APIs externas
  try {
    // 1️⃣ Dictionary API para pronúncia e phonetic
    const dictRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const dictData = dictRes.data[0];

    let phonetic = dictData.phonetic || (dictData.phonetics && dictData.phonetics[0] ? dictData.phonetics[0].text : "");
    let audio = dictData.phonetics && dictData.phonetics[0] ? dictData.phonetics[0].audio : "";

    // 2️⃣ Gemini API para tradução
    let translation = "Tradução não encontrada";
    try {
      const geminiRes = await axios.post(
        "https://gemini.api.url/translate", // Substitua pelo endpoint real da Gemini
        { text: word, target_lang: "pt" },
        { headers: { Authorization: "Bearer SUA_API_KEY_DO_GEMINI" } }
      );
      translation = geminiRes.data.translation || translation;
    } catch (err) {
      console.warn("Falha ao obter tradução do Gemini, fallback ativado");
    }

    // 3️⃣ TTS fallback se áudio não existir
    if (!audio) {
      audio = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;
    }

    const result = { word, translation, phonetic, audio };
    cache[word] = result;
    return result;

  } catch (err) {
    return { error: "Word not found or connection failed" };
  }
}

// Endpoint
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const data = await getWordData(word);
  res.json(data);
});

// Inicia servidor
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

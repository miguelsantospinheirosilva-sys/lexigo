const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const qs = require("querystring");
const app = express();

// Habilita CORS
app.use(cors());

// Porta
const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

fixedFiles.forEach(file => {
  try {
    const data = fs.readFileSync(`./${file}`, "utf-8");
    const json = JSON.parse(data);
    if (json.words) fixedWords = fixedWords.concat(json.words);
  } catch (err) {
    console.error(`Erro ao carregar ${file}:`, err.message);
  }
});

// Cache interno
let cache = {};

// Função para gerar áudio TTS via Voicerss
async function ttsVoicerss(word) {
  try {
    const apiKey = "COLOQUE_SUA_KEY_VOICERSS_AQUI";
    return `https://api.voicerss.org/?${qs.stringify({
      key: apiKey,
      hl: "en-us",
      src: word,
      c: "MP3",
      f: "44khz_16bit_stereo"
    })}`;
  } catch { return ""; }
}

// Função para gerar áudio via Google TTS (usando link público)
async function ttsGoogle(word) {
  try {
    // Link público do Google Translate TTS (limite diário de requisições)
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=gtx`;
  } catch { return ""; }
}

// Função principal para obter dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Word undefined" };
  word = word.toLowerCase();

  if (cache[word]) return cache[word];

  // Fixed words JSON
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word);
  if (fixed) {
    fixed.audio = await ttsVoicerss(word);
    cache[word] = fixed;
    return fixed;
  }

  // Tenta Free Dictionary API
  try {
    const freeRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = freeRes.data[0];

    const meaning = data.meanings && data.meanings[0] && data.meanings[0].definitions[0]
      ? data.meanings[0].definitions[0].definition : "";

    const phonetic = data.phonetic || "";
    const audio = (data.phonetics && data.phonetics[0] && data.phonetics[0].audio)
      ? data.phonetics[0].audio
      : await ttsVoicerss(word) || await ttsGoogle(word);

    const result = { word, translation: "", meaning, phonetic, audio };
    cache[word] = result;
    return result;
  } catch (err) {
    // Fallback Oxford Dictionaries API (se tiver key)
    try {
      const oxfordAppId = "SUA_APP_ID";
      const oxfordAppKey = "SUA_APP_KEY";
      const oxfordRes = await axios.get(`https://od-api.oxforddictionaries.com/api/v2/entries/en-us/${word}`, {
        headers: { app_id: oxfordAppId, app_key: oxfordAppKey }
      });
      const oxData = oxfordRes.data.results[0].lexicalEntries[0].entries[0].senses[0];
      const result = {
        word,
        translation: "",
        meaning: oxData.definitions[0] || "",
        phonetic: oxData.pronunciations ? oxData.pronunciations[0].phoneticSpelling : "",
        audio: oxData.pronunciations && oxData.pronunciations[0] && oxData.pronunciations[0].audioFile
          ? oxData.pronunciations[0].audioFile
          : await ttsVoicerss(word) || await ttsGoogle(word)
      };
      cache[word] = result;
      return result;
    } catch {
      // Se tudo falhar, gera apenas TTS
      const fallback = { word, translation: "", meaning: "", phonetic: "", audio: await ttsVoicerss(word) || await ttsGoogle(word) };
      cache[word] = fallback;
      return fallback;
    }
  }
}

// Endpoint
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const result = await getWordData(word);
  res.json(result);
});

// Inicia servidor
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

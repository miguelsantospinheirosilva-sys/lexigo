const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

// Habilita CORS para Base44
app.use(cors());

// Porta padrão
const PORT = process.env.PORT || 3000;

// Carregar arquivos JSON fixos
const fixedFiles = ["bloco1.json","bloco2.json","bloco3.json","bloco4.json","bloco5.json"];
let fixedWords = [];

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

// Cache interno
let cache = {};

// Função auxiliar: tenta obter phonetic via DictionaryAPI.dev
async function getPhoneticDictionaryAPI(word) {
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = res.data[0];
    if (data && data.phonetic) return data.phonetic;
    if (data && data.phonetics && data.phonetics[0]) return data.phonetics[0].text || "";
    return "";
  } catch {
    return "";
  }
}

// Função auxiliar: tenta obter phonetic via WordsAPI (gratuita limitada)
async function getPhoneticWordsAPI(word) {
  try {
    const res = await axios.get(`https://wordsapiv1.p.rapidapi.com/words/${word}`, {
      headers: {
        "X-RapidAPI-Key": "", // sem chave não funciona, mas pode registrar para teste
        "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com"
      }
    });
    return res.data.pronunciation ? res.data.pronunciation.all || "" : "";
  } catch {
    return "";
  }
}

// Função auxiliar: Oxford Dictionaries API (precisa registro)
async function getPhoneticOxford(word) {
  try {
    const app_id = ""; // coloque seu app_id
    const app_key = ""; // coloque seu app_key
    const lang = "en-gb";
    const res = await axios.get(`https://od-api.oxforddictionaries.com/api/v2/entries/${lang}/${word.toLowerCase()}`, {
      headers: { "app_id": app_id, "app_key": app_key }
    });
    const lexicalEntries = res.data.results[0].lexicalEntries;
    if (lexicalEntries && lexicalEntries[0].entries && lexicalEntries[0].entries[0].pronunciations) {
      return lexicalEntries[0].entries[0].pronunciations[0].phoneticSpelling || "";
    }
    return "";
  } catch {
    return "";
  }
}

// Função para gerar áudio via Google TTS sem chave
function getAudioGoogleTTS(word) {
  const encoded = encodeURIComponent(word);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encoded}`;
}

// Função principal: busca dados da palavra
async function getWordData(word) {
  if (!word) return { error: "Word is undefined" };

  // 1️⃣ Cache interno
  if (cache[word]) return cache[word];

  // 2️⃣ Palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    // tenta preencher phonetic + áudio se não tiver
    if (!fixed.phonetic) fixed.phonetic = await getPhoneticDictionaryAPI(word) || await getPhoneticWordsAPI(word) || await getPhoneticOxford(word) || "";
    if (!fixed.audio) fixed.audio = getAudioGoogleTTS(word);
    cache[word] = fixed;
    return fixed;
  }

  // 3️⃣ APIs externas
  let phonetic = await getPhoneticDictionaryAPI(word);
  if (!phonetic) phonetic = await getPhoneticWordsAPI(word);
  if (!phonetic) phonetic = await getPhoneticOxford(word);

  const translation = word; // tradução básica: pode substituir por sua API de tradução se quiser

  const result = {
    word,
    translation,
    phonetic,
    audio: getAudioGoogleTTS(word)
  };

  // salvar no cache
  cache[word] = result;
  return result;
}

// Endpoint
app.get("/translate/:word", async (req, res) => {
  const { word } = req.params;
  const data = await getWordData(word);
  res.json(data);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

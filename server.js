import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Carrega palavras e expressões do JSON local
let words = {};
let expressions = {};

try {
  words = JSON.parse(fs.readFileSync(path.join("./data/words.json"), "utf8"));
} catch (err) {
  console.warn("words.json não encontrado ou inválido");
}

try {
  expressions = JSON.parse(fs.readFileSync(path.join("./data/expressions.json"), "utf8"));
} catch (err) {
  console.warn("expressions.json não encontrado ou inválido");
}

// Cache para evitar chamadas repetidas
const cache = {};

// Função para pegar fonética e áudio via dictionaryapi.dev
async function getDictionaryData(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();

    if (Array.isArray(data) && data[0].phonetics && data[0].phonetics.length > 0) {
      const phoneticData = data[0].phonetics.find(p => p.text && p.audio) || data[0].phonetics[0];
      return {
        phonetic: phoneticData.text || "",
        audio: phoneticData.audio || ""
      };
    }
  } catch (err) {
    console.error("Erro ao buscar fonética/áudio:", err);
  }
  return { phonetic: "", audio: "" };
}

// Função de tradução usando LibreTranslate
async function translateLibre(word) {
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: word, source: "en", target: "pt" })
    });
    const data = await res.json();
    return data.translatedText || "";
  } catch (err) {
    console.warn("Erro LibreTranslate:", err);
    return "";
  }
}

// Função de tradução usando MyMemory
async function translateMyMemory(word) {
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|pt`);
    const data = await res.json();
    return data.responseData.translatedText || "";
  } catch (err) {
    console.warn("Erro MyMemory:", err);
    return "";
  }
}

// Função de tradução usando Lingva (proxy do Google Translate)
async function translateLingva(word) {
  try {
    const res = await fetch(`https://lingva.ml/api/v1/en/pt/${encodeURIComponent(word)}`);
    const data = await res.json();
    return data.translation || "";
  } catch (err) {
    console.warn("Erro Lingva:", err);
    return "";
  }
}

// Função principal de tradução com fallback
async function getTranslation(word) {
  if (cache[word]) return cache[word];

  // 1. JSON local
  if (words[word]) {
    cache[word] = words[word];
    return words[word];
  }
  if (expressions[word]) {
    cache[word] = expressions[word];
    return expressions[word];
  }

  // 2. Tenta LibreTranslate
  let translation = await translateLibre(word);
  if (translation) {
    cache[word] = translation;
    return translation;
  }

  // 3. Tenta MyMemory
  translation = await translateMyMemory(word);
  if (translation) {
    cache[word] = translation;
    return translation;
  }

  // 4. Tenta Lingva
  translation = await translateLingva(word);
  if (translation) {
    cache[word] = translation;
    return translation;
  }

  return "Tradução não encontrada";
}

app.get("/api/word/:word", async (req, res) => {
  const wordKey = req.params.word.toLowerCase();

  const translation = await getTranslation(wordKey);
  const dictData = await getDictionaryData(wordKey);

  res.json({
    word: wordKey,
    translation,
    phonetic: dictData.phonetic,
    audio: dictData.audio
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

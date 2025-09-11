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

// Cache interno
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

// Função de fallback 1: LibreTranslate
async function translateLibre(word) {
  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: word,
        source: "en",
        target: "pt",
        format: "text"
      })
    });
    const data = await response.json();
    if (data?.translatedText) return data.translatedText;
  } catch (err) {
    console.error("Erro LibreTranslate:", err);
  }
  return null;
}

// Função de fallback 2: MyMemory API
async function translateMyMemory(word) {
  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|pt`);
    const data = await response.json();
    if (data?.responseData?.translatedText) return data.responseData.translatedText;
  } catch (err) {
    console.error("Erro MyMemory API:", err);
  }
  return null;
}

// Função de fallback 3: Lingva Translate (ou outro endpoint público)
async function translateLingva(word) {
  try {
    const response = await fetch(`https://lingva.ml/api/v1/en/pt/${encodeURIComponent(word)}`);
    const data = await response.json();
    if (data?.translation) return data.translation;
  } catch (err) {
    console.error("Erro Lingva Translate:", err);
  }
  return null;
}

// Função principal de tradução
async function getTranslation(word) {
  // 1️⃣ Tenta JSON local
  let translation = words[word] || expressions[word] || null;

  if (translation) return translation;

  // 2️⃣ Tenta LibreTranslate
  translation = await translateLibre(word);
  if (translation) return translation;

  // 3️⃣ Tenta MyMemory API
  translation = await translateMyMemory(word);
  if (translation) return translation;

  // 4️⃣ Tenta Lingva Translate
  translation = await translateLingva(word);
  if (translation) return translation;

  return "Tradução não encontrada";
}

// Rota principal
app.get("/api/word/:word", async (req, res) => {
  const wordKey = req.params.word.toLowerCase();

  // Retorna do cache se já consultado
  if (cache[wordKey]) return res.json(cache[wordKey]);

  // Pega fonética e áudio
  const dictData = await getDictionaryData(wordKey);

  // Pega tradução usando fallback
  const translation = await getTranslation(wordKey);

  // Monta resposta final
  const result = {
    word: wordKey,
    translation,
    phonetic: dictData.phonetic || "—",
    audio: dictData.audio || ""
  };

  // Salva no cache
  cache[wordKey] = result;

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

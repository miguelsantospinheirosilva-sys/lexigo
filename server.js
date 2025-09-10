import express from "express";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

// Sua chave Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCjpLTtmRSQiRH0CVVVWLsqlQK-KIIXx7U";

// Caminho para palavras fixas
const wordsPath = path.join(process.cwd(), "data", "words.json");
let fixedWords = [];
try {
  if (fs.existsSync(wordsPath)) {
    const raw = fs.readFileSync(wordsPath, "utf8");
    fixedWords = JSON.parse(raw).words || [];
  } else {
    console.warn("⚠️ Nenhum words.json encontrado, seguindo sem palavras fixas.");
  }
} catch (err) {
  console.error("Erro ao carregar palavras fixas:", err);
}

// ===== APIs externas =====

// Gemini → tradução em português
async function fetchFromGemini(word) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Traduza a palavra inglesa "${word}" para o português brasileiro. Responda apenas com a tradução simples.` }
              ]
            }
          ]
        })
      }
    );
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (err) {
    console.error("Erro no Gemini:", err);
    return "";
  }
}

// Free Dictionary API → fonética + áudio
async function fetchFromFreeDictionary(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      phonetic: data[0]?.phonetic || "",
      audio: data[0]?.phonetics?.find(p => p.audio)?.audio || ""
    };
  } catch (err) {
    console.error("Erro no Free Dictionary:", err);
    return {};
  }
}

// Lexico API alternativa (Oxford-like, mas sem key usamos dicionário livre)
async function fetchFromLexicoLike(word) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?sp=${word}&md=d`);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      phonetic: data[0]?.defs ? "" : "", // Datamuse não tem fonética
      audio: ""
    };
  } catch (err) {
    console.error("Erro no Lexico-like:", err);
    return {};
  }
}

// Google TTS → fallback de áudio
function getGoogleTTS(word) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;
}

// ===== Função principal =====
async function getWordData(word) {
  if (!word) return null;

  // 1. Primeiro procura no words.json
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    return {
      word: fixed.word,
      translation: fixed.translation,
      phonetic: fixed.phonetic || "",
      audio: fixed.audio || getGoogleTTS(word)
    };
  }

  // 2. Busca nas APIs externas
  const [translation, freeDict, lexico] = await Promise.all([
    fetchFromGemini(word),
    fetchFromFreeDictionary(word),
    fetchFromLexicoLike(word)
  ]);

  return {
    word,
    translation: translation || "Tradução não encontrada",
    phonetic: freeDict.phonetic || lexico.phonetic || "",
    audio: freeDict.audio || lexico.audio || getGoogleTTS(word)
  };
}

// ===== Endpoint =====
app.get("/translate/:word", async (req, res) => {
  const word = req.params.word;
  const result = await getWordData(word);

  if (!result) {
    return res.status(404).json({ error: "Palavra não encontrada." });
  }
  res.json(result);
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express from "express";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

// Sua chave Gemini (⚠️ recomendo usar variável de ambiente)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCjpLTtmRSQiRH0CVVVWLsqlQK-KIIXx7U";

// Carregar palavras fixas
const wordsPath = path.join(process.cwd(), "data", "words.json");
let fixedWords = [];
try {
  const raw = fs.readFileSync(wordsPath, "utf8");
  fixedWords = JSON.parse(raw).words || [];
} catch (err) {
  console.error("Erro ao carregar palavras fixas:", err);
}

// Função para buscar tradução no Gemini
async function fetchFromGemini(word) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Traduza a palavra inglesa "${word}" para o português brasileiro. Responda apenas com a tradução simples.`
                }
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

// Função para buscar fonética + áudio no Free Dictionary API
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

// Função principal para obter os dados
async function getWordData(word) {
  if (!word) return null;

  // 1. Tenta nas palavras fixas
  let fixed = fixedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (fixed) {
    return {
      word: fixed.word,
      translation: fixed.translation,
      phonetic: fixed.phonetic || "",
      audio: fixed.audio || `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`
    };
  }

  // 2. Busca nos serviços externos
  const [translation, dictData] = await Promise.all([
    fetchFromGemini(word),
    fetchFromFreeDictionary(word)
  ]);

  return {
    word,
    translation: translation || "Tradução não encontrada",
    phonetic: dictData.phonetic || "",
    audio: dictData.audio || `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`
  };
}

// Endpoint de tradução
app.get("/translate/:word", async (req, res) => {
  const word = req.params.word;
  const result = await getWordData(word);

  if (!result) {
    return res.status(404).json({ error: "Palavra não encontrada." });
  }

  res.json(result);
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

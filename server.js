import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Carrega palavras do JSON local
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

app.get("/api/word/:word", async (req, res) => {
  const wordKey = req.params.word.toLowerCase();
  let translation = words[wordKey] || expressions[wordKey] || "Tradução não encontrada";

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

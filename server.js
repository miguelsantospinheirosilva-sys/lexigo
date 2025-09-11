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

// Cache para palavras consultadas
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

// Fallback assíncrono com Gemini (ou outra API externa)
async function getGeminiFallback(word) {
  try {
    // Aqui você coloca a chamada à API Gemini
    // Exemplo (pseudo-código):
    /*
    const response = await fetch("URL_GEMINI", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GEMINI_KEY}` },
      body: JSON.stringify({ prompt: `Traduza a palavra "${word}" e forneça a fonética` })
    });
    const data = await response.json();
    return {
      translation: data.translation || "",
      phonetic: data.phonetic || ""
    };
    */
    return { translation: "", phonetic: "" }; // placeholder se não usar ainda
  } catch (err) {
    console.error("Erro Gemini:", err);
    return { translation: "", phonetic: "" };
  }
}

app.get("/api/word/:word", async (req, res) => {
  const wordKey = req.params.word.toLowerCase();

  // Retorna do cache se já consultado
  if (cache[wordKey]) {
    return res.json(cache[wordKey]);
  }

  // 1️⃣ Tenta JSON local
  let translation = words[wordKey] || expressions[wordKey] || null;

  // 2️⃣ Pega fonética e áudio
  const dictData = await getDictionaryData(wordKey);

  // 3️⃣ Se não encontrou tradução, tenta fallback assíncrono com Gemini
  if (!translation) {
    const geminiData = await getGeminiFallback(wordKey);
    translation = geminiData.translation || "Tradução não encontrada";
  }

  // 4️⃣ Monta resposta final
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

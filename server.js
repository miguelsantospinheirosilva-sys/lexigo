import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Caminho para os arquivos JSON locais
const wordsPath = path.resolve("./words.json");
const expressionsPath = path.resolve("./expressions.json");

// Função para ler JSON local
function loadJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } else {
      console.warn(`[WARN] ${filePath} não encontrado`);
      return {};
    }
  } catch (err) {
    console.error(`[ERROR] Falha ao ler ${filePath}:`, err);
    return {};
  }
}

// Carrega dados iniciais
let wordsData = loadJSON(wordsPath);
let expressionsData = loadJSON(expressionsPath);

// Endpoint principal de consulta
app.get("/lookup/:word", async (req, res) => {
  const query = req.params.word.toLowerCase();

  // 1️⃣ Procura no JSON local (palavras)
  if (wordsData[query]) {
    return res.json({
      word: query,
      translation: wordsData[query].translation || "Tradução não encontrada",
      phonetic: wordsData[query].phonetic || null,
      audio: wordsData[query].audio || null,
    });
  }

  // 2️⃣ Procura em expressions.json
  if (expressionsData[query]) {
    return res.json({
      word: query,
      translation: expressionsData[query].translation || "Tradução não encontrada",
      phonetic: expressionsData[query].phonetic || null,
      audio: expressionsData[query].audio || null,
    });
  }

  // 3️⃣ Consulta API externa como fallback
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const phonetic = first.phonetic || (first.phonetics && first.phonetics[0]?.text) || null;
      const audio = first.phonetics && first.phonetics[0]?.audio ? first.phonetics[0].audio : null;

      return res.json({
        word: query,
        translation: query, // A tradução real ainda pode vir do Gemini, se configurado
        phonetic,
        audio,
      });
    } else {
      return res.json({
        word: query,
        translation: "Tradução não encontrada",
        phonetic: null,
        audio: null,
      });
    }
  } catch (err) {
    console.error("[ERROR] Falha ao consultar API externa:", err);
    return res.status(500).json({
      word: query,
      translation: "Erro na consulta",
      phonetic: null,
      audio: null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

// Gemini config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Função para tradução via Gemini
async function translateWithGemini(word) {
  try {
    const prompt = `Translate the word "${word}" from English to Brazilian Portuguese. Only return the translated word, nothing else.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return text || null;
  } catch (err) {
    console.error("Erro no Gemini:", err.message);
    return null;
  }
}

// Rota principal
app.get("/word/:term", async (req, res) => {
  const term = req.params.term;

  try {
    // Busca na dictionaryapi.dev
    const dictResponse = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${term}`
    );

    let phonetic = null;
    let audio = null;

    if (dictResponse.ok) {
      const dictData = await dictResponse.json();
      phonetic = dictData[0]?.phonetics[0]?.text || null;
      audio = dictData[0]?.phonetics[0]?.audio || null;
    }

    // Tradução pelo Gemini
    const translation = await translateWithGemini(term);

    res.json({
      word: term,
      translation: translation || "Tradução não encontrada",
      phonetic: phonetic || "Não disponível",
      audio: audio || null,
    });
  } catch (err) {
    console.error("Erro geral:", err.message);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

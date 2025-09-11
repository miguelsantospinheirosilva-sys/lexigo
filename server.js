import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

// Gemini com chave vinda do Render (variável de ambiente GOOGLE_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Função auxiliar para traduzir via Gemini
async function traduzirComGemini(word) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Traduza a palavra "${word}" para português em UMA única palavra, sem explicações adicionais.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return null;
  }
}

app.get("/api/word/:word", async (req, res) => {
  const word = req.params.word;

  try {
    // 1) Buscar no dicionário público
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const data = await response.json();

    let phonetic = "";
    let audio = "";
    let translation = null;

    if (Array.isArray(data) && data[0]) {
      phonetic = data[0].phonetic || "";
      if (data[0].phonetics && data[0].phonetics.length > 0) {
        const audioObj = data[0].phonetics.find((p) => p.audio);
        if (audioObj) {
          audio = audioObj.audio;
        }
      }
    }

    // 2) Tradução pelo Gemini
    translation = await traduzirComGemini(word);

    res.json({
      word,
      translation: translation || "Tradução não encontrada",
      phonetic,
      audio,
    });
  } catch (error) {
    console.error("Erro geral:", error);
    res.status(500).json({ error: "Erro ao buscar palavra" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

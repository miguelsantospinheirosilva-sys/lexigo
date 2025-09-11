import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// 🔹 Se quiser usar Gemini, descomente:
// import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 10000;

// 🔹 Dicionário fallback (se não encontrar em JSON ou Gemini)
const fallbackDictionary = {
  dog: "cachorro",
  cat: "gato",
  house: "casa",
  apple: "maçã",
  book: "livro",
  love: "amor",
};

// 🔹 Função para buscar tradução no Gemini (se habilitado)
/*
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function translateWithGemini(word) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Translate the English word "${word}" into Brazilian Portuguese. Return only the translation.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Erro no Gemini:", err);
    return null;
  }
}
*/

// 🔹 Carregar arquivos JSON locais (words.json, expressions.json etc.)
function loadLocalDictionary() {
  const baseDir = path.resolve("data"); // pasta "data" no projeto
  let words = {};

  try {
    const wordFile = fs.readFileSync(path.join(baseDir, "words.json"), "utf-8");
    words = JSON.parse(wordFile);
  } catch (err) {
    console.warn("⚠️ words.json não encontrado ou inválido");
  }

  try {
    const exprFile = fs.readFileSync(
      path.join(baseDir, "expressions.json"),
      "utf-8"
    );
    const expressions = JSON.parse(exprFile);
    words = { ...words, ...expressions };
  } catch (err) {
    console.warn("⚠️ expressions.json não encontrado ou invál

// server.js
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ---------------------
// Configurações
// ---------------------
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/fixed_words.json";
const AUTOMATIC_JSON_PATH = "./automatic_words.json";
const AUTOMATIC_LIMIT = 10000; // limite de palavras no JSON automático

// Carregar JSON automático ou criar vazio
let automaticJSON = {};
if (fs.existsSync(AUTOMATIC_JSON_PATH)) {
  automaticJSON = JSON.parse(fs.readFileSync(AUTOMATIC_JSON_PATH));
}

// ---------------------
// Função para buscar pronúncia, áudio e tradução
// ---------------------
async function fetchFromAPI(word) {
  try {
    // Exemplo usando API gratuita fictícia (substitua por reais)
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = response.data[0];
    return {
      word: word,
      meaning: data.meanings[0].definitions[0].definition || "Sem tradução",
      phonetic: data.phonetic || "",
      audio: data.phonetics?.find(p => p.audio)?.audio || "",
    };
  } catch (error) {
    console.log("Erro API:", error.message);
    return {
      word: word,
      meaning: "Tradução não disponível",
      phonetic: "",
      audio: "",
    };
  }
}

// ---------------------
// Endpoint principal de busca
// ---------------------
app.get("/translate/:word", async (req, res) => {
  const word = req.params.word.toLowerCase();

  // 1. Cache interno (simulado por memória do Node.js)
  if (automaticJSON[word]) {
    return res.json(automaticJSON[word]);
  }

  // 2. JSON fixo do GitHub
  try {
    const githubData = await axios.get(GITHUB_JSON_URL);
    const fixedJSON = githubData.data;
    if (fixedJSON[word]) {
      // Preencher pronúncia e áudio via API
      const apiResult = await fetchFromAPI(word);
      // Salvar no JSON automático
      if (Object.keys(automaticJSON).length < AUTOMATIC_LIMIT) {
        automaticJSON[word] = apiResult;
        fs.writeFileSync(AUTOMATIC_JSON_PATH, JSON.stringify(automaticJSON, null, 2));
      }
      return res.json(apiResult);
    }
  } catch (error) {
    console.log("Erro GitHub JSON:", error.message);
  }

  // 3. JSON automático
  if (automaticJSON[word]) {
    return res.json(automaticJSON[word]);
  }

  // 4. Se não estiver em lugar nenhum → API
  const apiResult = await fetchFromAPI(word);
  if (Object.keys(automaticJSON).length < AUTOMATIC_LIMIT) {
    automaticJSON[word] = apiResult;
    fs.writeFileSync(AUTOMATIC_JSON_PATH, JSON.stringify(automaticJSON, null, 2));
  }
  return res.json(apiResult);
});

// ---------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


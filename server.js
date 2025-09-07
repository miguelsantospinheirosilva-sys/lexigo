const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors()); // libera acesso de qualquer frontend
app.use(express.json());

// rota simples de teste
app.get("/", (req, res) => {
  res.send("Servidor está rodando 🚀");
});

// endpoint de tradução
app.get("/translate", async (req, res) => {
  const word = req.query.word;
  if (!word) {
    return res.status(400).json({ error: "Parâmetro 'word' é obrigatório" });
  }

  try {
    // exemplo mockado só pra garantir que responde
    // aqui você conecta APIs (Gemini ou gratuitas)
    const translation = {
      word,
      meaning: "tradução de exemplo",
      examples: [
        `Exemplo 1 com ${word}`,
        `Exemplo 2 com ${word}`
      ],
      phonetic: "/fəˈnɛtɪk/"
    };

    res.json(translation);
  } catch (err) {
    res.status(500).json({ error: "Erro interno", details: err.message });
  }
});

// Render exige usar process.env.PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// server.js
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Sua API key do Gemini
const GEMINI_API_KEY = 'AIzaSyCjpLTtmRSQiRH0CVVVWLsqlQK-KIIXx7U';

// Função para buscar no Free Dictionary API
async function getDictionaryData(word) {
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await res.json();
        const entry = data[0] || {};
        return {
            phonetic: entry.phonetic || (entry?.phonetics?.[0]?.text || ''),
            audio: entry?.phonetics?.[0]?.audio || ''
        };
    } catch (e) {
        return { phonetic: '', audio: '' };
    }
}

// Função para buscar tradução via Gemini
async function getGeminiTranslation(word) {
    try {
        const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: word,
                target: 'pt',
                format: 'text',
                key: GEMINI_API_KEY
            })
        });
        const data = await res.json();
        return data?.data?.translations?.[0]?.translatedText || '';
    } catch (e) {
        return '';
    }
}

// Função para gerar URL de áudio via Voicerss TTS gratuita
function getTTSUrl(word) {
    // Se quiser, você pode substituir pela sua key Voicerss
    const VOICERSS_KEY = 'DEMO'; 
    return `https://api.voicerss.org/?key=${VOICERSS_KEY}&hl=en-us&src=${encodeURIComponent(word)}&c=MP3&f=44khz_16bit_stereo`;
}

// Endpoint principal
app.get('/word/:word', async (req, res) => {
    const word = req.params.word;

    // Pega dados do dicionário
    const dictData = await getDictionaryData(word);

    // Pega tradução via Gemini
    const translation = await getGeminiTranslation(word) || word;

    // Decide qual áudio usar
    const audio = dictData.audio || getTTSUrl(word);

    res.json({
        word,
        translation,
        phonetic: dictData.phonetic || '',
        audio
    });
});

// Proxy para TTS (resolve CORS)
app.get('/audio/:word', async (req, res) => {
    const word = req.params.word;
    const audioUrl = getTTSUrl(word);
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(arrayBuffer));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

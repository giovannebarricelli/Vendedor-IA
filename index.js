const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_KEY;
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_KEY;
const INSTANCE_NAME = process.env.INSTANCE_NAME;

app.post('/webhook', async (req, res) => {
    const data = req.body;
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const messageText = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        if (!messageText) return res.sendStatus(200);

        try {
            await axios.post(`${EVOLUTION_URL}/chat/sendPresence/${INSTANCE_NAME}`, {
                remoteJid, presence: 'composing'
            }, { headers: { 'apikey': EVOLUTION_KEY } });

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                contents: [{ parts: [{ text: `Você é o Vendedor.IA da empresa VML. Seu objetivo é vender automação de whatsapp e tecnologia. Responda de forma curta e direta: ${messageText}` }] }]
            });

            const replyText = response.data.candidates[0].content.parts[0].text;

            await axios.post(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                number: remoteJid.split('@')[0],
                text: replyText,
                delay: 2000
            }, { headers: { 'apikey': EVOLUTION_KEY } });

        } catch (error) {
            console.error('Erro:', error.response?.data || error.message);
        }
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Vendedor.IA Online com Gemini!'));


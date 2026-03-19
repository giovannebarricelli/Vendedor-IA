const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

const { 
    GEMINI_KEY, EVOLUTION_URL, EVOLUTION_KEY, INSTANCE_NAME,
    BUSINESS_NAME, ADS_LED, ADS_AUTO, SOCIAL_CAUSE 
} = process.env;

app.post('/webhook', async (req, res) => {
    const data = req.body;
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        if (!msg) return res.sendStatus(200);

        try {
            const cleanUrl = EVOLUTION_URL.replace(/\/$/, ""); 
            const encodedInstance = encodeURIComponent(INSTANCE_NAME);

            // CORREÇÃO DEFINITIVA: Adicionado o sufixo -latest
            const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
            
            const prompt = `Você é o Consultor da ${BUSINESS_NAME}. Contexto: LED ${ADS_LED}, Automação ${ADS_AUTO}. Responda curto e termine com pergunta. Cliente: ${msg}`;

            const response = await axios.post(googleUrl, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const reply = response.data.candidates[0].content.parts[0].text;

            await axios.post(`${cleanUrl}/chat/sendText/${encodedInstance}`, {
                number: remoteJid.split('@')[0],
                text: reply
            }, { headers: { 'apikey': EVOLUTION_KEY } });

            console.log(`[VML] Sucesso: Respondido para ${remoteJid}`);

        } catch (e) { 
            console.error('[ERRO REAL]:', e.response?.data || e.message); 
        }
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 10000, () => console.log(`VML Online!`));





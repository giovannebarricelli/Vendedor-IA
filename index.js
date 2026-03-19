const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;
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
            await axios.post(`${EVOLUTION_URL}/chat/sendPresence/${INSTANCE_NAME}`, 
                { remoteJid, presence: 'composing' }, 
                { headers: { 'apikey': EVOLUTION_KEY } }
            );
            const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Você é o Vendedor.IA da empresa VML. Seu objetivo é vender automação de WhatsApp com IA. Seja direto, amigável e use emojis. Explique que você é uma IA atendendo. Se o cliente quiser comprar, fale do plano de Setup + Mensalidade." },
                    { role: "user", content: messageText }
                ]
            }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } });
            const replyText = aiResponse.data.choices[0].message.content;
            await axios.post(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                number: remoteJid.split('@')[0],
                text: replyText,
                delay: 2000
            }, { headers: { 'apikey': EVOLUTION_KEY } });
        } catch (error) {
            console.error('Erro:', error.message);
        }
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Vendedor.IA Online!'));

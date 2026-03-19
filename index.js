const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

const { GEMINI_KEY, EVOLUTION_URL, EVOLUTION_KEY, INSTANCE_NAME } = process.env;

app.post('/webhook', async (req, res) => {
    const data = req.body;
    
    // Processa apenas mensagens recebidas que não são de grupos
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        
        if (!msg) return res.sendStatus(200);

        try {
            // Status "Digitando..." na Evolution
            await axios.post(`${EVOLUTION_URL}/chat/sendPresence/${INSTANCE_NAME}`, 
                { remoteJid, presence: 'composing' }, 
                { headers: { 'apikey': EVOLUTION_KEY } }
            ).catch(() => {});

            // Prompt com a inteligência da VML Brasil
            const prompt = `Você é o Consultor Especialista da VML Brasil. 
            Identifique o interesse do cliente:
            1. Se for Anúncio/LED/Painel: Fale dos 7 painéis estratégicos em Caldas Novas.
            2. Se for Automação/WhatsApp/Robô: Fale do FlowZap 2.0.
            3. Social: Mencione que apoiamos o Hospital de Amor (Barretos).
            Regra: Responda de forma curta, direta e termine com uma pergunta.
            Pergunta do cliente: ${msg}`;

            // Chamada direta para o Gemini
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const reply = response.data.candidates[0].content.parts[0].text;

            // Envia a resposta final para o cliente
            await axios.post(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                number: remoteJid.split('@')[0],
                text: reply
            }, { headers: { 'apikey': EVOLUTION_KEY } });

        } catch (e) {
            console.error('Erro no fluxo:', e.message);
        }
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 10000, () => console.log('VML Online com Gemini!'));

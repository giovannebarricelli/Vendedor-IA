const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

// Extraindo as variáveis do Environment do Render
const { 
    GEMINI_KEY, 
    EVOLUTION_URL, 
    EVOLUTION_KEY, 
    INSTANCE_NAME,
    BUSINESS_NAME, 
    ADS_LED, 
    ADS_AUTO, 
    SOCIAL_CAUSE 
} = process.env;

app.post('/webhook', async (req, res) => {
    const data = req.body;

    // Filtro: Processa apenas mensagens recebidas de conversas individuais
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        
        if (!msg) return res.sendStatus(200);

        try {
            // Ajuste do Nome da Instância para a URL (corrige espaços e caracteres especiais)
            const encodedInstance = encodeURIComponent(INSTANCE_NAME);
            
            // Remove qualquer barra final da URL para evitar erro // no link
            const cleanUrl = EVOLUTION_URL.replace(/\/$/, "");

            // Status "Digitando..."
            await axios.post(`${cleanUrl}/chat/sendPresence/${encodedInstance}`, 
                { remoteJid, presence: 'composing' }, 
                { headers: { 'apikey': EVOLUTION_KEY } }
            ).catch(() => {});

            // Prompt VML Brasil
            const prompt = `Você é o Consultor Especialista da ${BUSINESS_NAME}.
            Use estes dados para responder:
            - LED: ${ADS_LED}
            - Automação: ${ADS_AUTO}
            - Social: ${SOCIAL_CAUSE}
            
            Regras: Seja formal mas divertido, responda curto e sempre termine com uma pergunta.
            Cliente disse: ${msg}`;

            // Chamada ao Gemini (Versão v1 estável)
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const replyText = response.data.candidates[0].content.parts[0].text;

            // Envio via Evolution API
            await axios.post(`${cleanUrl}/chat/sendText/${encodedInstance}`, {
                number: remoteJid.split('@')[0],
                text: replyText
            }, { headers: { 'apikey': EVOLUTION_KEY } });

            console.log(`[VML] Resposta enviada para ${remoteJid}`);

        } catch (error) {
            console.error('[VML Erro]:', error.response?.data || error.message);
        }
    }
    res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[VML] ${BUSINESS_NAME} Online na porta ${PORT}!`));



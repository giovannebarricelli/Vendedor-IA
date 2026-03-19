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

    // Filtro: Processa apenas mensagens recebidas de conversas individuais (ignora grupos e o próprio bot)
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        
        if (!msg) return res.sendStatus(200);

        try {
            // Ajuste do Nome da Instância para a URL (corrige o erro de espaços)
            const encodedInstance = encodeURIComponent(INSTANCE_NAME);

            // Mostra "Digitando..." no WhatsApp do cliente
            await axios.post(`${EVOLUTION_URL}/chat/sendPresence/${encodedInstance}`, 
                { remoteJid, presence: 'composing' }, 
                { headers: { 'apikey': EVOLUTION_KEY } }
            ).catch(() => {});

            // Prompt Estratégico da VML Brasil
            const prompt = `Você é o Consultor Especialista da ${BUSINESS_NAME}.
            Use os dados abaixo para responder o cliente de forma elegante, divertida e profissional:
            - Sobre os Painéis de LED: ${ADS_LED}
            - Sobre a Automação (FlowZap): ${ADS_AUTO}
            - Compromisso Social: ${SOCIAL_CAUSE}
            
            Regras:
            1. Identifique se o interesse é LED ou Automação.
            2. Seja breve e nunca deixe de terminar com uma pergunta.
            3. Responda à pergunta do cliente: ${msg}`;

            // Chamada ao Gemini
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const replyText = response.data.candidates[0].content.parts[0].text;

            // Envio da resposta final via Evolution API (Caminho /chat/)
            await axios.post(`${EVOLUTION_URL}/chat/sendText/${encodedInstance}`, {
                number: remoteJid.split('@')[0],
                text: replyText
            }, { headers: { 'apikey': EVOLUTION_KEY } });

            console.log(`[VML] Resposta enviada com sucesso para ${remoteJid}`);

        } catch (error) {
            // Log detalhado para capturarmos qualquer erro da Evolution
            console.error('[VML Erro]:', error.response?.data || error.message);
        }
    }
    res.sendStatus(200);
});

// Porta padrão do Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[VML] ${BUSINESS_NAME} Online na porta ${PORT}!`));


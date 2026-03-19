const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// Puxa as configurações das variáveis que você já preencheu no Render
const { 
    GEMINI_KEY, EVOLUTION_URL, EVOLUTION_KEY, INSTANCE_NAME,
    BUSINESS_NAME, ADS_LED, ADS_AUTO, SOCIAL_CAUSE 
} = process.env;

// Inicializa a IA oficial do Google (Resolve o erro 404)
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/webhook', async (req, res) => {
    const data = req.body;
    
    // Só processa se for uma mensagem nova recebida (ignora grupos e o próprio bot)
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        
        if (!msg) return res.sendStatus(200);
        console.log(`[VML] Mensagem recebida de ${remoteJid}: ${msg}`);

        try {
            // 1. Gera a resposta de Elite
            const prompt = `Você é o Vendedor de Elite da ${BUSINESS_NAME}. 
            Seu foco: ${ADS_LED} e ${ADS_AUTO}. Causa: ${SOCIAL_CAUSE}. 
            Responda de forma curta, persuasiva e termine com uma pergunta. 
            Pergunta do cliente: ${msg}`;

            const result = await model.generateContent(prompt);
            const reply = result.response.text();

            // 2. Prepara a URL da Evolution (remove barras extras)
            const cleanUrl = EVOLUTION_URL.replace(/\/$/, "");
            const instancePath = encodeURIComponent(INSTANCE_NAME);

            // 3. Envia para o WhatsApp via Evolution
            await axios.post(`${cleanUrl}/chat/sendText/${instancePath}`, {
                number: remoteJid.split('@')[0],
                text: reply
            }, { 
                headers: { 'apikey': EVOLUTION_KEY } 
            });

            console.log(`[VML] Resposta enviada com sucesso para ${remoteJid}`);

        } catch (error) {
            console.error('[VML ERRO]:', error.message);
        }
    }
    res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[VML] Vendedor de Elite Online na porta ${PORT}`));





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
    
    // Filtro para pegar apenas mensagens recebidas (ignora grupos e o próprio bot)
    if (data.event === 'messages.upsert' && !data.data.key.fromMe && !data.data.key.remoteJid.includes('@g.us')) {
        const remoteJid = data.data.key.remoteJid;
        const msg = data.data.message.conversation || data.data.message.extendedTextMessage?.text;
        if (!msg) return res.sendStatus(200);

        try {
            // 1. LIMPEZA DE URL E NOME: Resolve o erro 404/401
            const cleanUrl = EVOLUTION_URL.replace(/\/$/, ""); 
            const encodedInstance = encodeURIComponent(INSTANCE_NAME);

            // 2. CHAMADA GEMINI: Usando v1beta (mais estável para o modelo Flash)
            const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
            
            const prompt = `Você é o Consultor da ${BUSINESS_NAME}. 
            LED: ${ADS_LED} | Automação: ${ADS_AUTO} | Social: ${SOCIAL_CAUSE}. 
            Responda curto, formal e termine com uma pergunta. Cliente: ${msg}`;

            const response = await axios.post(googleUrl, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const reply = response.data.candidates[0].content.parts[0].text;

            // 3. ENVIO PARA EVOLUTION: Usando o caminho /chat/sendText
            await axios.post(`${cleanUrl}/chat/sendText/${encodedInstance}`, {
                number: remoteJid.split('@')[0],
                text: reply
            }, { headers: { 'apikey': EVOLUTION_KEY } });

            console.log(`[VML] Sucesso! Respondido para: ${remoteJid}`);

        } catch (e) { 
            // Mostra o erro exato no log do Render para não ficarmos no escuro
            console.error('[VML ERRO DETALHADO]:', e.response?.data || e.message); 
        }
    }
    res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`VML Online na porta ${PORT}`));




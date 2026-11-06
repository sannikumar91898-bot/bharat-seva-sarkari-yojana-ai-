const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const SUPPORTED_LANGS = {
  hi: 'Hindi', en: 'English', bho: 'Bhojpuri', mai: 'Maithili',
  ur: 'Urdu', bn: 'Bengali', mr: 'Marathi', or: 'Odia',
  ta: 'Tamil', te: 'Telugu', pa: 'Punjabi', gu: 'Gujarati',
  kn: 'Kannada', ml: 'Malayalam', as: 'Assamese',
};

const SYSTEM_PROMPT = (lang) => `
You are "Bharat Seva AI", a government scheme assistant for Indian citizens.
Reply ONLY in ${SUPPORTED_LANGS[lang] || 'Hindi'}.

STRICT RULES:
1. NEVER invent scheme names, amounts, deadlines, or URLs.
2. If you don't know something, say: "मुझे इसकी प्रमाणित जानकारी नहीं है। कृपया आधिकारिक पोर्टल देखें।"
3. Only use the SCHEMES context provided below. If not in context, say you don't have verified data.
4. Never claim an application was submitted or money was credited — you can only guide.
5. Keep answers under 150 words unless user asks for details.
6. Always suggest verifying on the official URL.
`;

async function askAI({ question, userContext, schemesContext, lang = 'hi' }) {
  const prompt = `
${SYSTEM_PROMPT(lang)}

USER PROFILE:
${JSON.stringify(userContext, null, 2)}

VERIFIED SCHEMES FROM DB (use ONLY these):
${JSON.stringify(schemesContext, null, 2)}

USER QUESTION: ${question}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { askAI, SUPPORTED_LANGS };
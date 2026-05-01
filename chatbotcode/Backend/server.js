      const express = require('express');
      const axios = require('axios');
      const mongoose = require('mongoose');
      const cors = require('cors');
      const { google } = require('googleapis');
      require('dotenv').config();
      const { GoogleAuth } = require('google-auth-library');

      const Chat = require('./models/Chat');
      const Faq = require('./models/Faq');

      const app = express();
      app.use(cors());
      app.use(express.json());

      const path = require('path');

      // Serve static files (your frontend)
      app.use(express.static(path.join(__dirname, '../Frontend')));

      // Route for index.html
      app.get('/', (req, res) => {
       res.sendFile(path.join(__dirname, '../Frontend/index.html'));
      });

      // ===== 1. MongoDB Connection =====
      mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log("✅ MongoDB connected"))
        .catch(err => console.error("❌ MongoDB Error:", err));

        // ====== 2. Google Authentication Setup ======
          const auth = new GoogleAuth({
            keyFile: 'service-account.json', // must exist in backend folder
            scopes: ['https://www.googleapis.com/auth/generative-language',
              'https://www.googleapis.com/auth/cloud-platform']
          });

          async function getAccessToken() {
            const client = await auth.getClient();
            const accessToken = await client.getAccessToken();
            return accessToken.token;
          }

      // ===== 3. Helper: Escape Regex =====
      function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      // ===== 4. Helper: Gemini API Call with Retry =====
      async function callGeminiWithRetry(requestBody, headers, retries = 3) {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await axios.post(
              'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
              requestBody,
              { headers }
            );
            return response;
          } catch (err) {
            if (err.response?.status === 503 && i < retries - 1) {
              console.log(`⚠️ Gemini overloaded — retrying (${i + 1}/${retries})...`);
              await new Promise(res => setTimeout(res, 2000));
            } else {
              throw err;
            }
          }
        }
      }

      // ===== 5. /chat Endpoint =====
 app.post('/chat', async (req, res) => {
      
        try {
          const { message, userId = 'default_user' } = req.body;
          if (!message) return res.status(400).json({ error: "Message is required" });


          // --- 5.1 Fetch last 5 chats for context memory ---
          const history = await Chat.find({ user: userId }).sort({ timestamp: -1 }).limit(5);
          const context = history.map(chat => `User: ${chat.message}\nBot: ${chat.response}`).join('\n');

          // --- 5.2 Check FAQ first ---
          const safeMessage = escapeRegex(message);
          const faqMatch = await Faq.findOne({ question: { $regex: safeMessage, $options: 'i' } });

          if (faqMatch) {
            const chat = new Chat({ user: userId, message, response: faqMatch.answer });
            await chat.save();
            return res.json({
              response: faqMatch.answer,
              intent: "FAQ",
              language: "English",
              suggestions: ["Track my order", "Return policy", "Contact support"],
              source: "faq"
            });
          }

          // --- 5.3 Prepare Gemini Prompt ---
          const promptText = `
      You are a helpful, multilingual customer support assistant.
      Context of conversation so far:
      ${context}

      User message: "${message}"

      1. Detect intent and answer accordingly.
      2. Reply in the user's language.
      3. Provide clear, concise guidance.
      4. Suggest 3 related questions for the user.
      Respond in JSON format like:
      {
        "intent": "General Assistance",
        "language": "English",
        "response": "Your clear reply here.",
        "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
      }
      `;

          // --- 5.4 Get OAuth Access Token ---
          const accessToken = await getAccessToken();

          // --- 5.5 Call Gemini API with retry ---
          const geminiResponse = await callGeminiWithRetry(
            { contents: [{ parts: [{ text: promptText }] }] },
            {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          );

          // --- 5.6 Extract and parse JSON response ---
          let botText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          let parsed;
        // 🧹 Clean and parse the model output
    let cleanedText = botText
      .replace(/^[^{]+/, "")   // remove text before first {
      .replace(/[^}]+$/, "")   // remove text after last }
      .trim();

    try {
      parsed = JSON.parse(cleanedText);
      if (!parsed.response) parsed.response = botText; // fallback
    } catch (err) {
      console.error("⚠️ JSON Parse Error:", err);
      parsed = {
        intent: "General Assistance",
        language: "English",
        response: botText,
        suggestions: [
          "How do I reset my password?",
          "Track my order",
          "Contact support"
        ]
      };
    }


          // --- 5.7 Save chat ---
          const chat = new Chat({ user: userId, message, response: parsed.response });
          await chat.save();

          // --- 5.8 Send formatted response ---
          res.json({ ...parsed, source: "gemini" });

        } catch (err) {
          console.error("❌ Error in /chat:", err.message);
          if (err.response?.data) console.error(err.response.data);
          res.status(500).json({ error: "Something went wrong while processing your request." });
        }
      });

      // ===== 6. Start Server =====
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on ${PORT}`));

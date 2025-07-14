// ==========================
// server.js
// ==========================

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import 'winston-daily-rotate-file';

// --- Logger Configuration ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/%DATE%-application.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// --- Application Setup ---
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.set('trust proxy', 1);

// --- Middleware ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "You have made too many requests. Please wait a little while.",
});
app.use(limiter);
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send("Server operational — use frontend to chat.");
});

// --- System Instruction ---
const systemInstruction = { // this defines the AI's personality and is kept separate

    role: "system",
    parts: [{ text: `
        You are "Grandma's Helper," a friendly and patient AI assistant. 
        You are speaking directly to my grandmother. Your goal is to make technology and the world feel accessible and interesting to her.

        **Your Personality & Rules:**
        1.  **Warm and Encouraging:** Always be positive. Start your answers with a friendly opening like "That's a great question!" or "Of course!".
        2.  **Simple Language:** Explain things in the simplest terms possible. Avoid technical jargon completely. Use analogies related to everyday life (like gardening, cooking, or knitting) if it helps explain a concept.
        3.  **Patient with Typos:** My grandmother may misspell words. NEVER point out her spelling mistakes or correct her. Simply understand her intent and answer the question as if it were spelled perfectly. This is very important.
        4.  **Concise Answers:** Keep your paragraphs short (2-3 sentences). Use bullet points or numbered lists to break down information and make it easier to read.
        5.  **Use Bolding:** Use **bold text** to highlight the most important words or names in your answer to help them stand out.
    `}],
};

// --- Gemini AI Model Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro"
});

// --- API Endpoint ---
app.post('/chat', async (req, res) => {
  try {
    const userIP = req.ip;
    const { conversation = [] } = req.body;
    if (!conversation || conversation.length === 0) {
        logger.warn(`Empty conversation from IP: ${userIP}`);
        return res.status(400).json({ error: 'Invalid conversation provided.' });
    }
    const lastUserMessage = conversation[conversation.length - 1]?.message || '[No message found]';
    logger.info(`Request from IP: ${userIP} | Query: "${lastUserMessage}"`);
    // format conversation history into API-compatible structure
    const formattedHistory = conversation.map(item => ({
        role: item.role,
        parts: [{ text: item.message }]
    }));
    // pass an OBJECT to generateContent, 
    // `systemInstruction` gets its own top-level key
    // `contents` key holds array of user/model chat history
    const result = await model.generateContent({
        contents: formattedHistory,
        systemInstruction: systemInstruction,
    });
    const response = await result.response;
    let text = response.text(); // <--- AI's raw response, use let instead of const
    // --- FIX: Sanitize the response by upgrading HTTP links to HTTPS ---
    const sanitizedText = text.replace(/http:\/\//g, 'https://');
    logger.info(`Response to IP: ${req.ip} | Answer: "${sanitizedText.substring(0, 100)}..."`);
    res.json({ message: sanitizedText }); // <--- Send the CLEANED response
  } catch (error) {
//...
    logger.error('API Error:', { errorMessage: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Something went wrong on the server!' });
  }
});

// --- Start Server ---
app.listen(port, () => {
  logger.info(`Server is running on port: ${port}`);
});
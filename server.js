// server.js (Corrected for New Stateful Version)

// --- Core Imports ---
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

// --- Safety & Logging Imports ---
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import 'winston-daily-rotate-file'; // Necessary for the DailyRotateFile transport

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
    res.send("Hi Grandma! The chat server is running. Use the frontend to chat.");
});

// --- System Instruction ---
const systemInstruction = {
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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

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

    const formattedHistory = conversation.map(item => ({
        role: item.role,
        parts: [{ text: item.message }]
    }));

    const completePrompt = [
        systemInstruction,
        ...formattedHistory
    ];

    // ================= THE FIX ===================
    // Pass the prompt array DIRECTLY to the function.
    // Do NOT wrap it in an object like `{ contents: ... }`.
    const result = await model.generateContent(completePrompt);
    // =============================================
    
    const response = await result.response;
    const text = response.text();

    logger.info(`Response to IP: ${req.ip} | Answer: "${text.substring(0, 70)}..."`);
    res.json({ message: text });

  } catch (error) {
    logger.error('API Error:', { errorMessage: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// --- Start Server ---
app.listen(port, () => {
  logger.info(`Server is running on port: ${port}`);
});
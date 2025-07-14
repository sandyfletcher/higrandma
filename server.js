// server.js

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
  level: 'info', // Log 'info' level messages and above (info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Transport 1: Log to the console
    // This is for real-time viewing on the Render dashboard
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    // Transport 2: Log to a new file each day
    // This creates our archive
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
const port = 3000;

// Tell Express to trust the IP address passed by Render's proxy
app.set('trust proxy', 1);

// --- Middleware ---

// Rate Limiter: Protects against abuse and high costs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Limit each IP to 25 requests per window
  message: "You have made too many requests. Please wait a little while.",
});
app.use(limiter);

// CORS: Allows your frontend to talk to this backend
app.use(cors());

// JSON Parser: Allows the server to read JSON from requests
app.use(express.json());


// ====================================================================
// --- REVISION 1: Define System Instruction Globally ---
// By defining the instructions here, we only do it once, and it's clear
// what the model's core purpose is. This is our improved prompt.
// ====================================================================
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

// ====================================================================
// --- REVISION 2: Use the System Instruction during Model Initialization ---
// We pass our instructions to the model right when we create it.
// This is the recommended method from Google for setting a model's persona.
// ====================================================================
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro-latest",
    systemInstruction: systemInstruction, 
});


// --- API Endpoint ---
app.post('/chat', async (req, res) => {
  try {
    const userIP = req.ip;
    
    // --- MODIFICATION 1: Expect a single 'conversation' array ---
    const { conversation = [] } = req.body;

    if (!conversation || conversation.length === 0) {
        logger.warn(`Empty or invalid conversation from IP: ${userIP}`);
        return res.status(400).json({ error: 'Invalid conversation provided.' });
    }

    const lastUserMessage = conversation[conversation.length - 1]?.message || '[No message found]';
    logger.info(`Request from IP: ${userIP} | Final Query: "${lastUserMessage}"`);

    // --- MODIFICATION 2: Use the simpler, stateless `generateContent` method ---

    // Format the entire history our client sent into the format the SDK expects.
    const formattedConversation = conversation.slice(-10).map(item => ({
        role: item.role,
        parts: [{ text: item.message }]
    }));
    
    // Use `generateContent` for sending a complete prompt (including history) in a single call.
    const result = await model.generateContent({
        contents: formattedConversation,
    });
    
    const response = await result.response;
    const text = response.text();

    logger.info(`Response to IP: ${req.ip} | Answer: "${text.substring(0, 500)}..."`);
    res.json({ message: text });

  } catch (error) {
    logger.error('API Error:', { errorMessage: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// --- Start Server ---
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
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
// This sets up our new logger
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
      filename: 'logs/%DATE%-application.log', // Filename pattern
      datePattern: 'YYYY-MM-DD', // Daily rotation
      zippedArchive: true, // Compress old log files
      maxSize: '20m', // Max size of a log file before it's rotated
      maxFiles: '14d', // Keep logs for 14 days
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

// --- Gemini AI Model Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

// --- API Endpoint ---
app.post('/chat', async (req, res) => {
  try {
    const userIP = req.ip;
    // Destructure history and the new message from the request body
    const { message: userMessage, history = [] } = req.body;

    // Basic validation
    if (!userMessage || typeof userMessage !== 'string') {
        logger.warn(`Invalid request received from IP: ${userIP}`);
        return res.status(400).json({ error: 'Invalid message provided.' });
    }

    logger.info(`Request from IP: ${userIP} | Query: "${userMessage}"`);

    const systemInstruction = `
        You are a very kind, patient, and knowledgeable assistant for my grandmother. 
        Your name is "Grandma's Helper".
        Always answer in simple, clear, and encouraging language. 
        Keep your answers concise and easy to understand.
        If she asks about a person, place, or event, give a brief, interesting summary.
        IMPORTANT: My grandmother sometimes misspells words. If you detect a spelling mistake,
        do not point it out. Instead, understand what she meant and answer her question
        as if she had spelled it perfectly. Your main goal is to be helpful and warm.
    `;

    // Format the incoming history for the Gemini API
    // We also enforce the limit on the backend as a safety measure
    const formattedHistory = history.slice(-10).map(item => ({
        role: item.role, // 'user' or 'model'
        parts: [{ text: item.message }]
    }));

    // Construct the full payload for the model
    const fullPrompt = [
        systemInstruction,
        ...formattedHistory, // Spread the formatted history items
        userMessage         // The latest message from the user
    ];

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    logger.info(`Response to IP: ${req.ip} | Answer: "${text.substring(0, 500)}..."`);
    // We log a substring to keep the logs from getting excessively long.

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
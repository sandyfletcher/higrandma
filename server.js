// server.js

// 1. Load all our necessary packages
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

// 2. Configure our application
dotenv.config(); // Load environment variables from .env file
const app = express();
const port = 3000; // The port our server will run on

// 3. Set up middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Allow our server to receive JSON data

// 4. Initialize the Google Generative AI model
// This is where we use our secret API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// 5. Define the API endpoint
// 'app.post' means we are creating an endpoint that accepts POST requests
// '/chat' is the name of our endpoint
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        // 1. Create a "system instruction" for the AI
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

        // 2. Send both the system instruction and the user's message to the API
        const result = await model.generateContent([systemInstruction, userMessage]);
        const response = await result.response;
        const text = response.text();

        res.json({ message: text });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// 6. Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('You can now open index.html in your browser and start chatting!');
});
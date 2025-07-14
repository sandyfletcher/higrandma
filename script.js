// script.js (Corrected for New Stateful Version)

// --- Font Size Slider Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('font-size-slider');
    const root = document.documentElement;
    const applyFontSize = (size) => { root.style.fontSize = `${size}px`; };
    const saveFontSize = (size) => { localStorage.setItem('grandmaChatFontSize', size); };
    const savedSize = localStorage.getItem('grandmaChatFontSize');
    if (savedSize) {
        slider.value = savedSize;
        applyFontSize(savedSize);
    } else {
        applyFontSize(slider.value);
    }
    slider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        applyFontSize(newSize);
        saveFontSize(newSize);
    });
});

// --- Chat Logic ---
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatContainer = document.getElementById('chat-container');

let conversationHistory = [];

function formatMessage(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
}

// This function now handles adding formatted messages to the chat
function addMessage(sender, message, isFormatted = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);

    // If the message is already HTML, use .innerHTML. Otherwise, use .textContent.
    if (isFormatted) {
        messageElement.innerHTML = message;
    } else {
        messageElement.textContent = message;
    }

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement; // Return the element so we can update it
}

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // 1a. Add the user's message to the visible chat (unformatted for now)
    const userMessageElement = addMessage('user', userMessage);
    // 1b. Add the raw user message to history
    conversationHistory.push({ role: 'user', message: userMessage });

    // 2. Add a loading indicator for Gemini's response
    const loadingMessageElement = addMessage('gemini', "Grandma's Helper is thinking...");
    loadingMessageElement.classList.add('loading');

    chatInput.value = '';

    try {
        const response = await fetch('https://higrandma.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation: conversationHistory }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Network response was not ok');
        }

        const data = await response.json();
        
        // 4a. Format the raw message from Gemini into HTML
        const formattedGeminiMessage = formatMessage(data.message);
        
        // 4b. Update the loading message with the formatted AI response
        loadingMessageElement.innerHTML = formattedGeminiMessage;
        loadingMessageElement.classList.remove('loading');
        
        // 4c. Add the AI's RAW (unformatted) response to our history
        conversationHistory.push({ role: 'model', message: data.message });

        // 4d. Enforce history limit (e.g., last 5 pairs = 10 messages)
        if (conversationHistory.length > 10) {
            conversationHistory.splice(0, 2);
        }

    } catch (error) {
        console.error('There was a problem:', error);
        loadingMessageElement.textContent = 'Oops! Something went wrong. Please try again.';
        loadingMessageElement.classList.remove('loading');
        loadingMessageElement.style.color = 'red';
    }
});
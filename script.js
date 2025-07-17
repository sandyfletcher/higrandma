// ==========================
// script.js
// ==========================

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
const submitButton = document.querySelector('#chat-form button');
let conversationHistory = [];
let pressTimer; // hold timer for button press

// --- Prevent Enter Key Submission ---
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // stop form from submitting
    }
});

function formatMessage(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
}
function addMessage(sender, message, isFormatted = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    if (isFormatted) {
        messageElement.innerHTML = message;
    } else {
        messageElement.textContent = message;
    }
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement;
}

async function handleSubmission() { // logic to send message
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    // 1a. add user's message to visible chat
    addMessage('user', userMessage);
    // 1b. add raw user message to history
    conversationHistory.push({ role: 'user', message: userMessage });
    // 2. add a loading indicator for Gemini's response
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
        // 4a. format raw message from Gemini into HTML
        const formattedGeminiMessage = formatMessage(data.message);
        // 4b. update loading message with formatted AI response
        loadingMessageElement.innerHTML = formattedGeminiMessage;
        loadingMessageElement.classList.remove('loading');
        // 4c. add AI's RAW (unformatted) response to our history
        conversationHistory.push({ role: 'model', message: data.message });
        // 4d. enforce history limit (e.g., last 5 pairs = 10 messages)
        if (conversationHistory.length > 10) {
            conversationHistory.splice(0, 2);
        }
    } catch (error) {
        console.error('There was a problem:', error);
        loadingMessageElement.textContent = 'Oops! Something went wrong. Please try again.';
        loadingMessageElement.classList.remove('loading');
        loadingMessageElement.style.color = 'red';
    }
}

// --- Button Logic ---
submitButton.addEventListener('mousedown', () => {
    submitButton.classList.add('charging');
    pressTimer = setTimeout(() => {
        handleSubmission(); 
        submitButton.classList.remove('charging'); 
    }, 1000);
});
// if user releases button or moves mouse, cancel timer
const cancelHold = () => {
    clearTimeout(pressTimer);
    submitButton.classList.remove('charging');
};
submitButton.addEventListener('mouseup', cancelHold);
submitButton.addEventListener('mouseleave', cancelHold);

// Prevent the default form submission, since we handle it manually
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
});
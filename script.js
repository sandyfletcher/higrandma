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
const submitButton = document.querySelector('#chat-form button'); // Get the button element
let conversationHistory = [];
let pressTimer; // Variable to hold the timer for the button press

// --- 1. PREVENT ENTER KEY SUBMISSION ---
// Listen for key presses on the input field
chatInput.addEventListener('keydown', (e) => {
    // If the key is 'Enter', prevent the default form submission action
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});

function formatMessage(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
}
// handles adding formatted messages to the chat
function addMessage(sender, message, isFormatted = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    // if message is already HTML, use .innerHTML. Otherwise, use .textContent.
    if (isFormatted) {
        messageElement.innerHTML = message;
    } else {
        messageElement.textContent = message;
    }
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement; // return element to update it
}

// --- This is the core logic that sends the message to the backend ---
async function handleSubmission() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    
    addMessage('user', userMessage);
    conversationHistory.push({ role: 'user', message: userMessage });
    
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
        const formattedGeminiMessage = formatMessage(data.message);
        
        loadingMessageElement.innerHTML = formattedGeminiMessage;
        loadingMessageElement.classList.remove('loading');
        
        conversationHistory.push({ role: 'model', message: data.message });
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

// --- 2. HOLD-TO-SUBMIT BUTTON LOGIC ---

// When the user presses the button down
submitButton.addEventListener('mousedown', () => {
    // Start the visual "charging" animation
    submitButton.classList.add('charging');
    // Set a timer for 1 second (1000 milliseconds)
    pressTimer = setTimeout(() => {
        handleSubmission(); // If the timer completes, run the submission logic
        submitButton.classList.remove('charging'); // Reset the visual
    }, 1000);
});

// A function to cancel the submission timer
const cancelHold = () => {
    clearTimeout(pressTimer);
    submitButton.classList.remove('charging'); // Stop the visual "charging"
};

// If the user releases the mouse button or moves the cursor off the button, cancel the hold
submitButton.addEventListener('mouseup', cancelHold);
submitButton.addEventListener('mouseleave', cancelHold);

// Finally, prevent the form's default 'submit' event entirely,
// as we are now handling everything with our custom button logic.
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
});
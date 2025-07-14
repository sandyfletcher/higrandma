// --- Font Size Slider Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('font-size-slider');
    const root = document.documentElement; // The <html> element

    // Function to apply the font size to the root element
    const applyFontSize = (size) => {
        root.style.fontSize = `${size}px`;
    };

    // Function to save the user's preference to their browser's storage
    const saveFontSize = (size) => {
        localStorage.setItem('grandmaChatFontSize', size);
    };

    // On page load, check for a saved setting
    const savedSize = localStorage.getItem('grandmaChatFontSize');
    if (savedSize) {
        // If a size was saved, apply it and set the slider's position
        slider.value = savedSize;
        applyFontSize(savedSize);
    } else {
        // Otherwise, use the default size from the HTML
        applyFontSize(slider.value);
    }

    // Add an event listener for when the slider value changes
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

// This array will store our conversation history.
// Each item will be an object like { role: 'user' or 'model', message: '...' }
let conversationHistory = [];

/**
 * Converts basic Markdown (bold, italics) and newlines to HTML.
 * @param {string} text The raw text from the API.
 * @returns {string} The formatted HTML string.
 */
function formatMessage(text) {
    // Convert **bold** to <strong>bold</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>italic</em>
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert newlines (\n) to <br> tags for proper line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
}

// This function adds a message to the chat container
function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    
    // Simple check for loading message
    if (sender === 'gemini' && message === '...') {
        messageElement.classList.add('loading');
        // Let's change the name to the one we defined in the prompt
        messageElement.textContent = "Grandma's Helper is thinking...";
    } else {
        // For actual messages, we set the text content. Formatting will be handled later.
        messageElement.textContent = message;
    }
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
}

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the page from reloading

    const userMessage = chatInput.value.trim();
    if (!userMessage) return; // Don't send empty messages

    // 1a. Add the user's message to the visible chat
    addMessage('user', userMessage);
    // 1b. Add the user's message to our history array
    conversationHistory.push({ role: 'user', message: userMessage });
    
    // 2. Add a loading indicator for Gemini's response
    addMessage('gemini', '...');
    const loadingMessageElement = chatContainer.lastChild;

    // Clear the input field
    chatInput.value = '';

    try {
        // 3. Send the FULL conversation history to our backend server
        const response = await fetch('https://higrandma.onrender.com/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the entire 'conversationHistory' array in a single object.
            body: JSON.stringify({ 
                conversation: conversationHistory 
            }),
        });

        if (!response.ok) {
            // Try to get a more specific error from the backend
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Network response was not ok');
        }

        const data = await response.json();
        
        // 4a. Format the raw message from Gemini into HTML
        const formattedMessage = formatMessage(data.message);
        
        // 4b. Use .innerHTML to render the formatted message
        loadingMessageElement.innerHTML = formattedMessage;
        loadingMessageElement.classList.remove('loading');
        
        // 4c. Add the AI's RAW (unformatted) response to our history array
        conversationHistory.push({ role: 'model', message: data.message });

        // 4d. Enforce the history limit (5 queries + 5 responses = 10 items)
        if (conversationHistory.length > 10) {
            // Remove the oldest two items (one user query, one model response)
            conversationHistory.splice(0, 2);
        }

    } catch (error) {
        console.error('There was a problem:', error);
        loadingMessageElement.textContent = 'Oops! Something went wrong. Please try again.';
        loadingMessageElement.classList.remove('loading');
        loadingMessageElement.style.color = 'red';
    }
});
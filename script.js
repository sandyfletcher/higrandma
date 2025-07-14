// script.js

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatContainer = document.getElementById('chat-container');

// This array will store our conversation history.
// Each item will be an object like { role: 'user' or 'model', message: '...' }
let conversationHistory = [];

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
        // 3. Send the user's message AND the history to our backend server
        const response = await fetch('https://higrandma.onrender.com/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the history along with the new message
            body: JSON.stringify({ 
                message: userMessage,
                history: conversationHistory.slice(0, -1) // Send history *before* this new message
            }),
        });

        if (!response.ok) {
            // Try to get a more specific error from the backend
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Network response was not ok');
        }

        const data = await response.json();
        
        // 4a. Update the loading message with the actual response
        loadingMessageElement.textContent = data.message;
        loadingMessageElement.classList.remove('loading');
        
        // 4b. Add the AI's response to our history array
        conversationHistory.push({ role: 'model', message: data.message });

        // 4c. Enforce the 5-query limit (5 queries + 5 responses = 10 items)
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
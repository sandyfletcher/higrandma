// script.js

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatContainer = document.getElementById('chat-container');

// This function adds a message to the chat container
function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    
    // Simple check for loading message
    if (sender === 'gemini' && message === '...') {
        messageElement.classList.add('loading');
        messageElement.textContent = 'Grandma is thinking...';
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

    // 1. Add the user's message to the chat
    addMessage('user', userMessage);
    
    // 2. Add a loading indicator for Gemini's response
    addMessage('gemini', '...');
    const loadingMessageElement = chatContainer.lastChild;

    // Clear the input field
    chatInput.value = '';

    try {
        // 3. Send the user's message to our backend server
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        // 4. Update the loading message with the actual response
        loadingMessageElement.textContent = data.message;
        loadingMessageElement.classList.remove('loading');

    } catch (error) {
        console.error('There was a problem:', error);
        loadingMessageElement.textContent = 'Oops! Something went wrong. Please try again.';
        loadingMessageElement.classList.remove('loading');
        loadingMessageElement.style.color = 'red';
    }
});
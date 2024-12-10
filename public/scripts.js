// DOM Elements
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
const chatList = document.getElementById('chatList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const logoutBtn = document.getElementById('logoutBtn');

// Global Variables
let currentChatId = null; // Store the current chat ID
const authToken = sessionStorage.getItem('authToken');
const userId = parseInt(sessionStorage.getItem('userId'), 10);

// Authentication Validation
if (!authToken) {
    console.log('No auth token found, redirecting to login.');
    window.location.href = 'start.html'; // Redirect to login if no auth token
}

if (isNaN(userId)) {
    console.error('User ID is missing or invalid.');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadPreviousChats);

logoutBtn.addEventListener('click', () => {
    console.log('Logging out, clearing session.');
    sessionStorage.clear();
    window.location.href = 'start.html';
});

searchUserInput.addEventListener('input', handleSearchInput);
sendMessageButton.addEventListener('click', sendMessage);

// Functions

// Handle user search
function handleSearchInput() {
    const searchText = searchUserInput.value.trim().toLowerCase();
    console.log('Searching for users with text:', searchText);

    if (searchText.length >= 2) {
        fetch(`/users?search=${encodeURIComponent(searchText)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then((users) => {
                console.log('Users fetched successfully:', users);
                renderUserList(users);
            })
            .catch((error) => {
                console.error('Error fetching users:', error);
                userList.innerHTML = '<li>Error fetching users</li>';
            });
    } else {
        console.log('Search text too short, clearing user list and loading previous chats.');
        userList.innerHTML = '';
        chatMessages.innerHTML = '';
        loadPreviousChats();
    }
}

// Render the list of users
function renderUserList(userArray) {
    console.log('Rendering user list:', userArray);
    userList.innerHTML = '';
    if (userArray.length === 0) {
        userList.innerHTML = '<li>No users found</li>';
        return;
    }

    userArray.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user.email;
        li.addEventListener('click', () => {
            console.log('Starting chat with user ID:', user.id);
            startChat(user.id);
            userList.innerHTML = '';
            searchUserInput.value = user.email;
        });
        userList.appendChild(li);
    });
}

// Start a chat with a specific user
function startChat(receiverId) {
    console.log('Starting chat with receiver ID:', receiverId);
    currentChatId = receiverId;
    loadMessages(receiverId);
}

// Load chat messages for a specific user
async function loadMessages(contactId) {
    try {
        console.log("Loading messages for contact ID:", contactId);
        const response = await fetch(`/messages/${contactId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error fetching messages: ${error.message || response.statusText}`);
        }

        const messages = await response.json();
        console.log("Fetched messages from server:", messages);

        renderMessages(messages);
    } catch (error) {
        console.error("Error loading messages:", error.message, error);
        chatMessages.innerHTML = `<div>Error loading messages: ${error.message}</div>`;
    }
}

// Render messages in the chat UI
function renderMessages(messages) {
    console.log('Rendering messages:', messages);
    chatMessages.innerHTML = '';
    messages.forEach((msg) => {
        const senderLabel = msg.sender_id === userId ? 'Me' : 'Them';
        const messageDiv = document.createElement('div');
        messageDiv.textContent = `${senderLabel}: ${msg.content}`;
        chatMessages.appendChild(messageDiv);
    });
}

// Send a new message
function sendMessage() {
    const messageContent = chatInput.value.trim();
    console.log('Sending message:', messageContent);

    if (!messageContent || !currentChatId) {
        alert('Please enter a message or select a chat.');
        return;
    }

    fetch('/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
            senderId: userId,
            receiverId: currentChatId,
            content: messageContent,
        }),
    })
        .then((response) => {
            if (!response.ok) throw new Error('Failed to send message');
            console.log('Message sent successfully.');
            chatInput.value = '';
            loadMessages(currentChatId);
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

// Load previous chats for the user
function loadPreviousChats() {
    console.log('Loading previous chats for user ID:', userId);
    fetch(`/chats/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
    })
        .then((response) => {
            if (!response.ok) throw new Error('Failed to fetch chats');
            return response.json();
        })
        .then((chats) => {
            console.log('Fetched chats:', chats);
            chatMessages.innerHTML = '';
            if (!chats || chats.length === 0) {
                chatMessages.innerHTML = '<div>No previous chats available</div>';
                return;
            }

            chats.forEach((chat) => {
                const contactId = chat.user_two_id === userId ? chat.user_one_id : chat.user_two_id;
                console.log('Rendering chat with contact ID:', contactId);
                const chatElement = document.createElement('div');
                chatElement.innerHTML = `
                    <h3>Chat with User ID: ${contactId}</h3>
                    <p>Last Message: ${chat.last_message}</p>
                `;
                chatElement.addEventListener('click', () => startChat(contactId));
                chatMessages.appendChild(chatElement);
            });
        })
        .catch((error) => console.error('Error loading chats:', error));
}

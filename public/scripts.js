// DOM Elements
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
const chatList = document.getElementById('chatList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const logoutBtn = document.getElementById('logoutBtn');
const authToken = sessionStorage.getItem('authToken');
const userId = parseInt(sessionStorage.getItem('userId'), 10);

// Global Variables
let currentChatId = null; // Store the current chat ID
let ws; // WebSocket variable
let currentChatPhone = null;

// Authentication Validation
if (!authToken) {
    console.log('No auth token found, redirecting to login.');
    window.location.href = 'start.html'; // Redirect to login if no auth token
}

if (isNaN(userId)) {
    console.error('User ID is missing or invalid.');
}

// Event Listeners
logoutBtn.addEventListener('click', () => {
    console.log('Logging out, clearing session.');
    sessionStorage.clear();
    window.location.href = 'start.html';
});

searchUserInput.addEventListener('input', handleSearchInput);
sendMessageButton.addEventListener('click', sendMessage);

// WebSocket message handler
function onWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    console.log('Received WebSocket message:', data);

    if (data.type === 'new-message') {
        const { senderId, receiverId, content } = data.message;
        
        // Check if this message belongs to the currently selected chat.
        if (receiverId === currentChatId || senderId === currentChatId) {
            // Append the new message to the chat UI without reloading messages.
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(
                senderId === userId ? 'message-sent' : 'message-received'
            );
            messageDiv.textContent = content;
            chatMessages.appendChild(messageDiv);

            // Scroll to the bottom to show the new message.
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
}

// On DOM content loaded, set up WebSocket and load previous chats
document.addEventListener('DOMContentLoaded', () => {
    // Set up WebSocket if authenticated
    if (authToken) {
        ws = new WebSocket('wss://joechat.tech'); // Use ws:// if not using HTTPS

        ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        ws.onmessage = onWebSocketMessage;

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }

    // Load previous chats after setting up WebSocket
    loadPreviousChats();
});

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
                const filteredUsers = users.filter(user => user.id !== userId);
                renderUserList(filteredUsers);
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
            startChat(user.id, user.email, user.phone); // Pass user email to startChat
            userList.innerHTML = '';
            searchUserInput.value = user.email;
        });
        userList.appendChild(li);
    });
}

// Start a chat with a specific user
function startChat(receiverId, contactEmail, contactPhone) {
    console.log('Starting chat with receiver ID:', receiverId);
    currentChatId = receiverId;
    currentChatPhone = contactPhone;
    updateChatTitle(contactEmail);
    loadMessages(receiverId);
}

// Function to update the chat title
function updateChatTitle(email) {
    const chatTitle = document.getElementById('selectedChatUser');
    chatTitle.textContent = email || 'Select User';
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
    chatMessages.innerHTML = '';
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', message.sender_id === userId ? 'message-sent' : 'message-received');
        const timestamp = new Date(message.timestamp).toLocaleString();
        messageDiv.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        chatMessages.appendChild(messageDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}



// Send a new message
function sendMessage() {
    const messageContent = chatInput.value.trim();
    const isImportant = document.getElementById('sendAsSmsCheckbox').checked; // Checkbox for SMS option

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
            // Do not reload messages here; rely on WebSockets to show the new message.
            if (isImportant && currentChatPhone) {
                const senderEmail = sessionStorage.getItem('email');
                const currentEmail = document.getElementById('selectedChatUser').innerHTML;
                sendSms(senderEmail, currentChatPhone, currentEmail);
                sendAsSmsCheckbox.checked = false;
                return;
            } else if (isImportant && !currentChatPhone) {
                alert('The selected user does not have a phone number associated for SMS.');
            }
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

// Helper function to send SMS via Twilio
function sendSms(senderEmail, currentChatPhone, currentEmail) {
    console.log('Sending SMS to:', currentChatPhone);

    return fetch('/send-important-sms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
            recipientEmail: currentEmail,
            recipientNumber: currentChatPhone,
            senderEmail: senderEmail,
        }),
    })
        .then((response) => {
            if (!response.ok) throw new Error('Failed to send SMS');
            console.log('SMS sent successfully.');
            alert('Message sent via SMS!');
        })
        .catch((error) => {
            console.error('Error sending SMS:', error);
            alert('Failed to send SMS. Please try again later.');
        });
}

// Load previous chats for the user
function loadPreviousChats() {
    console.log('Loading previous chats for user ID:', userId);

    fetch('/previous-chats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch previous chats');
            return response.json();
        })
        .then(chats => {
            console.log('Fetched previous chats:', chats);

            // Clear the chat list
            chatList.innerHTML = '';

            if (!chats || chats.length === 0) {
                chatList.innerHTML = '<div class="error-message">No previous chats available</div>';
                return;
            }

            // Fetch user details for each contact and sort by username
            const chatPromises = chats.map(chat => {
                return fetch(`/users/${chat.contact_id}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${authToken}` },
                })
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to fetch user details');
                        return response.json();
                    })
                    .then(contact => {
                        return { ...chat, contact };
                    });
            });

            Promise.all(chatPromises)
                .then(chatsWithContacts => {
                    // Sort chats by contact email
                    chatsWithContacts.sort((a, b) => a.contact.email.localeCompare(b.contact.email));

                    // Render each chat
                    chatsWithContacts.forEach(chat => {
                        const chatItem = document.createElement('div');
                        chatItem.classList.add('chat-item');

                        chatItem.innerHTML = `
                            <div class="chat-email">${chat.contact.email}</div>
                            <div class="chat-message-preview">Previous chat</div>
                        `;

                        chatItem.addEventListener('click', () => {
                            // Remove 'selected' class from all chat items
                            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('selected'));

                            // Highlight the selected chat
                            chatItem.classList.add('selected');

                            // Start the chat with the selected user
                            startChat(chat.contact.id, chat.contact.email);
                        });

                        chatList.appendChild(chatItem);
                    });
                })
                .catch(error => console.error('Error fetching contact details:', error));
        })
        .catch(error => console.error('Error loading previous chats:', error));
}

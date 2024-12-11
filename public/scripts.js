// DOM Elements
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
const chatList = document.getElementById('chatList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const logoutBtn = document.getElementById('logoutBtn');
<<<<<<< HEAD
const authToken = sessionStorage.getItem('authToken');
const userId = parseInt(sessionStorage.getItem('userId'), 10);

// Global Variables
let currentChatId = null; // Store the current chat ID
let ws; // WebSocket variable

// Authentication Validation
if (!authToken) {
    console.log('No auth token found, redirecting to login.');
    window.location.href = 'start.html'; // Redirect to login if no auth token
=======
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');

let currentChatId = null; // Store the current chat ID

const authToken = sessionStorage.getItem('authToken');
const userId = sessionStorage.getItem('userId');

if (!authToken) {
    window.location.href = 'start.html'; // Redirect to login if no auth token
}

if (!userId) {
    console.error('User ID is missing.');
>>>>>>> main
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
                renderUserList(users);
            })
            .catch((error) => {
                console.error('Error fetching users:', error);
                userList.innerHTML = '<li>Error fetching users</li>';
            });
    } else {
<<<<<<< HEAD
        console.log('Search text too short, clearing user list and loading previous chats.');
        userList.innerHTML = '';
        chatMessages.innerHTML = '';
        loadPreviousChats();
=======
        userList.innerHTML = ''; // Clear the list if input is too short
        chatMessages.innerHTML = '';
        loadPreviousChats()
>>>>>>> main
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
<<<<<<< HEAD
            console.log('Starting chat with user ID:', user.id);
            startChat(user.id, user.email); // Pass user email to startChat
            userList.innerHTML = '';
=======
            alert(`Selected user: ${user.email}`);
            startChat(user.id)
            userList.innerHTML = ''; // Clear the list
>>>>>>> main
            searchUserInput.value = user.email;
        });
        userList.appendChild(li);
    });
}

<<<<<<< HEAD
// Start a chat with a specific user
function startChat(receiverId, contactEmail) {
    console.log('Starting chat with receiver ID:', receiverId);
    currentChatId = receiverId;
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
        messageDiv.classList.add('message');
        messageDiv.classList.add(
            message.sender_id === userId ? 'message-sent' : 'message-received'
        );
        messageDiv.textContent = message.content; 
        chatMessages.appendChild(messageDiv);
    });

    // Scroll to the bottom to show the latest messages
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send a new message
function sendMessage() {
    const messageContent = chatInput.value.trim();
    console.log('Sending message:', messageContent);

=======
// Start a chat with the selected user
function startChat(receiverId) {
    console.log("inside 'startChat' function")
    fetch(`/chats`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            userOneId: userId, // Current user
            userTwoId: receiverId // Selected user
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create chat');
        }
        return response.json();
    })
    .then(chat => {
        currentChatId = chat.id; // Store the current chat ID
        loadMessages(currentChatId); // Load messages for the chat
    })
    .catch(error => {
        console.error('Error starting chat:', error);
    });
}

// Load messages for the current chat
function loadMessages(chatId) {
    fetch(`/messages/${chatId}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        return response.json();
    })
    .then(messages => {
        console.log("messages:", messages)
        chatMessages.innerHTML = ''; // Clear previous messages
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.textContent = `${message.sender_id}: ${message.content}`;
            chatMessages.appendChild(messageElement);
        });
    })
    .catch(error => {
        console.error('Error fetching messages:', error);
    });
}

sendMessageButton.addEventListener('click', () => {
    const messageContent = chatInput.value.trim();
>>>>>>> main
    if (!messageContent || !currentChatId) {
        alert('Please enter a message or select a chat.');
        return;
    }

<<<<<<< HEAD
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
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

// Load previous chats for the user
function loadPreviousChats() {
    console.log('Loading previous chats for user ID:', userId);

    fetch(`/chats/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch chats');
            return response.json();
        })
        .then(chats => {
            console.log('Fetched chats:', chats);

            // Clear the chat list
            chatList.innerHTML = '';

            if (!chats || chats.length === 0) {
                chatList.innerHTML = '<div class="error-message">No previous chats available</div>';
                return;
            }

            // Render each chat
            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.classList.add('chat-item');

                // Determine the other user's ID
                const contactId = chat.user_two_id === userId ? chat.user_one_id : chat.user_two_id;
                // Since we do not have other_user_email from the backend, fallback to `User ID: contactId`
                const displayName = `User ID: ${contactId}`;

                console.log("Rendering chat with contact ID:", contactId);

                chatItem.innerHTML = `
                    <div class="chat-email">${displayName}</div>
                    <div class="chat-message-preview">${chat.last_message || 'No messages yet'}</div>
                `;

                chatItem.addEventListener('click', () => {
                    // Remove 'selected' class from all chat items
                    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('selected'));

                    // Highlight the selected chat
                    chatItem.classList.add('selected');

                    // Start the chat with the selected user using the fallback displayName
                    startChat(contactId, displayName);
                });

                chatList.appendChild(chatItem);
            });
        })
        .catch(error => console.error('Error loading chats:', error));
}
=======
    fetch(`/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            senderId: userId,
            receiverId: currentChatId, // The chat ID where the message is going
            content: messageContent
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        loadMessages(currentChatId); // Reload messages after sending
        chatInput.value = ''; // Clear the input field
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
});

// Fetch and display all previous chats on page load
function loadPreviousChats() {
    fetch(`/chats/${userId}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch chats');
        }
        return response.json();
    })
    .then(chats => {
        console.log(chats)
        if (chats.length === 0) {
            chatMessages.innerHTML = '<div>No previous chats available</div>';
            return;
        }

        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.innerHTML = `<h3>Chat with userId:${chat.user_two_id}</h3> <br> 
                ${chat.last_timestamp}: ${chat.last_message}
            `;
            chatMessages.appendChild(chatElement);

            // Fetch and display messages for each chat
            chatElement.addEventListener('click', () => {
                chatMessages.innerHTML = '';
                fetch(`/messages/${chat.id}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch messages');
                    }
                    return response.json();
                })
                .then(messages => {
                    messages.forEach(message => {
                        const messageElement = document.createElement('div');
                        messageElement.textContent = `${message.sender_id}: ${message.content}`;
                        chatMessages.appendChild(messageElement);
                    });
                })
                .catch(error => {
                    console.error('Error fetching messages:', error);
                });
            })
        });
    })
    .catch(error => {
        console.error('Error loading chats:', error);
    });
}

// Load chats on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadPreviousChats();
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('authToken'); 
    sessionStorage.removeItem('userId');    
    sessionStorage.removeItem('email');     
})
>>>>>>> main

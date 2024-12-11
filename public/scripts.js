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
            startChat(user.id, user.email); // Pass user email to startChat
            userList.innerHTML = '';
            searchUserInput.value = user.email;
        });
        userList.appendChild(li);
    });
}

// Start a chat with a specific user
function startChat(receiverId, email) {
    console.log('Starting chat with receiver ID:', receiverId);
    currentChatId = receiverId;
    updateChatTitle(email); // Update the chat header with the selected user's email
    loadMessages(receiverId); // Load messages for the selected chat
}

// Function to update the chat title
function updateChatTitle(email) {
    const chatTitle = document.getElementById('selectedChatUser'); // Target the <h2> element
    chatTitle.textContent = email || 'Select User'; // Set email or default text
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
            message.sender_id === parseInt(sessionStorage.getItem('userId'))
                ? 'message-sent'
                : 'message-received'
        );
        messageDiv.textContent = message.content; // Display the message content
        chatMessages.appendChild(messageDiv);
    });

    // Scroll to the bottom to show the latest messages
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
                // No previous chats available
                chatList.innerHTML = '<div class="error-message">No previous chats available</div>';
                return;
            }

            // Render each chat
            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.classList.add('chat-item');

                // Determine the other user's ID and email
                const contactId = chat.user_two_id === userId ? chat.user_one_id : chat.user_two_id;
                const otherUserEmail = chat.other_user_email || `User ID: ${contactId}`; // Fallback for email

                console.log("Rendering chat with contact ID:", contactId);

                // Create the chat item HTML
                chatItem.innerHTML = `
                    <div class="chat-email">${otherUserEmail}</div>
                    <div class="chat-message-preview">${chat.last_message || 'No messages yet'}</div>
                `;

                // Add click event to select and load the chat
                chatItem.addEventListener('click', () => {
                    // Remove the 'selected' class from all chat items
                    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('selected'));

                    // Highlight the selected chat
                    chatItem.classList.add('selected');

                    // Update the chat header and load messages
                    updateChatTitle(email); // Update the chat header with the selected user's email
                    loadMessages(currentChatId);
                });

                // Append the chat item to the chat list
                chatList.appendChild(chatItem);
            });
        })
        .catch(error => console.error('Error loading chats:', error));
}


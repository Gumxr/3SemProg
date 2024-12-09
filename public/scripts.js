// Funktion til at søge og vælge modtager 
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
const logoutBtn = document.getElementById('logoutBtn');
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
}

searchUserInput.addEventListener('input', () => {
    const searchText = searchUserInput.value.trim().toLowerCase();

    // Require at least 2 characters for searching
    if (searchText.length >= 2) {
        const authToken = sessionStorage.getItem('authToken');

        fetch(`/users?search=${encodeURIComponent(searchText)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Send the authToken as a Bearer token
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then(users => {
                renderUserList(users);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                userList.innerHTML = '<li>Error fetching users</li>';
            });
    } else {
        userList.innerHTML = ''; // Clear the list if input is too short
        chatMessages.innerHTML = '';
        loadPreviousChats()
    }
});

function renderUserList(userArray) {
    userList.innerHTML = ''; // Clear the list
    if (userArray.length === 0) {
        userList.innerHTML = '<li>No users found</li>';
        return;
    }
    userArray.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.email; // Only display email
        li.addEventListener('click', () => {
            alert(`Selected user: ${user.email}`);
            startChat(user.id)
            userList.innerHTML = ''; // Clear the list
            searchUserInput.value = user.email;
        });
        userList.appendChild(li);
    });
}

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
    if (!messageContent || !currentChatId) {
        alert('Please enter a message or select a chat.');
        return;
    }

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
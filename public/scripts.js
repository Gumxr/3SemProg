let selectedChatId = null; // Tracks the selected chat
let selectedUserEmail = null; 
let selectedUserId = null; // Tracks the selected user's ID
let chats = []; // Stores the fetched chats

const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
const chatList = document.getElementById('chatList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const selectedUserHeader = document.getElementById('selectedUserHeader');

const authToken = sessionStorage.getItem('authToken');
const userId = sessionStorage.getItem('userId');

if (!authToken) {
    window.location.href = 'start.html'; // Redirect to login if no auth token
}

if (!userId) {
    console.error('User ID is missing.');
}

// Search and Select Recipient
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
        li.textContent = user.email;
        li.classList.add('user-item');
        li.addEventListener('click', () => {
            console.log("user chosen:", user)
            if (!user.email) {
                console.error('User object does not contain email');
                return;
            }
            selectedUserEmail = user.email; // Update the selected user's email
            selectedUserId = user.id; // Set the user ID globally
            updateSelectedChatHeader(user.email); // Update the header
            startNewChat(user.id); // Start or fetch the chat
        });
        userList.appendChild(li);
    });
}



function updateSelectedChatHeader(email) {
    const selectedChatUserHeader = document.getElementById('selectedChatUser');
    selectedChatUserHeader.textContent = `${email}` || 'Select a User';

}

// Start a New Chat
function startNewChat(receiverId) {
    chatMessages.innerHTML = ''; // Clear previous messages
    updateSelectedChatHeader('Loading...');
    selectedChatId = null; // Reset the selected chat ID

    const existingChat = chats.find(chat =>
        (chat.user_one_id === receiverId && chat.user_two_id === parseInt(sessionStorage.getItem('userId'))) ||
        (chat.user_two_id === receiverId && chat.user_one_id === parseInt(sessionStorage.getItem('userId')))
    );

    if (existingChat) {
        selectedChatId = existingChat.id;

        // Highlight the existing chat in the list
        const allChatItems = document.querySelectorAll('.chat-item');
        allChatItems.forEach(item => item.classList.remove('selected'));
        const chatElement = [...allChatItems].find(item =>
            item.querySelector('.chat-email').textContent === existingChat.other_user_email
        );
        if (chatElement) chatElement.classList.add('selected');
        
        console.log("chat exists. Selected user Email:", selectedUserEmail)
        updateSelectedChatHeader(selectedUserEmail);
        loadMessages(existingChat.id);
        fetchChats();
        return;
    }

    fetch('/chats', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            userOneId: sessionStorage.getItem('userId'),
            userTwoId: receiverId
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to create chat: ${response.status}`);
            }
            return response.json();
        })
        .then(chat => {
            console.log('Chat created:', chat);
            chats.push(chat); // Add the new chat to the chats array
            renderChatList(chats); // Re-render the chat list dynamically

            // Highlight the newly created chat
            const allChatItems = document.querySelectorAll('.chat-item');
            const chatElement = [...allChatItems].find(item =>
                item.querySelector('.chat-email').textContent === selectedUserEmail
            );
            if (chatElement) chatElement.classList.add('selected');

            console.log("chat doesn't exist. Selected user Email:", selectedUserEmail)
            updateSelectedChatHeader(selectedUserEmail);
            loadMessages(chat.id); // Load the chat messages
            fetchChats();
        })
        .catch(error => {
            console.error('Error starting new chat:', error.message);
        });
}


// Fetch and Display Chats
function fetchChats() {
    fetch(`/chats/${sessionStorage.getItem('userId')}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => response.json())
        .then(fetchedChats => {
            chats = fetchedChats; // Update the global chats array
            renderChatList(chats);
        })
        .catch(error => {
            console.error('Error fetching chats:', error);
        });
}

function renderChatList(chats) {
    if (!Array.isArray(chats)) {
        console.error('Chats is not an array:', chats);
        chatList.innerHTML = '<div class="error-message">Error loading chats</div>';
        return;
    }

    chatList.innerHTML = ''; // Clear the chat list

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');

        console.log("chat.other_user_email:", chat.other_user_email);
        // Display the other user's email and the last message
        chatItem.innerHTML = `
            <div class="chat-email">${chat.other_user_email}</div>
            <div class="chat-message-preview">${chat.last_message || 'No messages yet'}</div>
        `;

        // Add click event to update the selected chat and highlight it
        chatItem.addEventListener('click', () => {
            // Remove the 'selected' class from all chat items
            const allChatItems = document.querySelectorAll('.chat-item');
            allChatItems.forEach(item => item.classList.remove('selected'));

            // Add the 'selected' class to the clicked chat
            chatItem.classList.add('selected');

            // Update the chat header and load messages
            updateSelectedChatHeader(chat.other_user_email);
            loadMessages(chat.id);
        });

        chatList.appendChild(chatItem);
    });
}



function loadMessages(chatId) {
    selectedChatId = chatId;

    console.log('Fetching messages for chatId:', chatId); // Debugging

    fetch(`/messages/${chatId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            return response.json();
        })
        .then(messages => {
            console.log('Messages fetched successfully:', messages); // Debugging
            renderMessages(messages);

            // Find the selected chat's email from the global chats array
            const selectedChat = chats.find(chat => chat.id === chatId);
            if (selectedChat) {
                updateSelectedChatHeader(selectedChat.other_user_email);
            }
        })
        .catch(error => {
            console.error('Error fetching messages:', error.message);
        });
}

function renderMessages(messages) {
    chatMessages.innerHTML = ''; // Clear previous messages

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

// Send a Message
sendMessageButton.addEventListener('click', () => {
    const content = chatInput.value.trim();
    if (!content || !selectedChatId) {
        console.error('No content or chat selected');
        return;
    }

    const receiverId = getReceiverId(selectedChatId);

    fetch('/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            senderId: sessionStorage.getItem('userId'),
            receiverId: receiverId,
            content: content,
            chatId: selectedChatId
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            return response.json();
        })
        .then(() => {
            chatInput.value = ''; // Clear input
            loadMessages(selectedChatId); // Reload messages
        })
        .catch(error => {
            console.error('Error sending message:', error.message);
        });
});
;




function getReceiverId(chatId) {
    const chat = chats.find(c => c.id === chatId);
    return chat.user_one_id === parseInt(sessionStorage.getItem('userId'))
        ? chat.user_two_id
        : chat.user_one_id;
}

// Logout Button
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('email');
    window.location.href = 'start.html';
});

// Initial Fetch of Chats
fetchChats();

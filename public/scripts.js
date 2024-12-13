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
    console.log("WebSocket message data:", data); // Inspect this log
    if (data.type === "new-message") {
        const { senderId, receiverId, content, file_url } = data.message;

        // Check if this message belongs to the currently selected chat.
        if (receiverId === currentChatId || senderId === currentChatId) {
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message");
            messageDiv.classList.add(senderId === userId ? "message-sent" : "message-received");

            messageDiv.innerHTML = `
                <div class="message-content">${content || ""}</div>
                ${file_url ? `<a href="${file_url}" target="_blank">Download File</a>` : ""}
            `;

            chatMessages.appendChild(messageDiv);
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
    messages.forEach((message) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(
            'message',
            message.sender_id === userId ? 'message-sent' : 'message-received'
        );

        if (message.file_url) {
            const fileUrl = message.file_url;
            const fileNameWithNumbers = fileUrl.split('/').pop(); // Get the full file name with numbers
            const fileExtension = fileNameWithNumbers.split('.').pop().toLowerCase();

            // Remove numbers at the start of the file name
            const fileName = fileNameWithNumbers.replace(/^\d+_/, ''); // Removes "1734036690313_" prefix

            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
                // Render image with click-to-view functionality
                const imgElement = document.createElement('img');
                imgElement.src = fileUrl;
                imgElement.alt = fileName;
                imgElement.classList.add('message-image');
                imgElement.addEventListener('click', () => openImageViewModal(fileUrl));
                messageDiv.appendChild(imgElement);
            } else {
                // Non-image files show as a download link with cleaned file name
                const fileLink = document.createElement('a');
                fileLink.href = fileUrl;
                fileLink.target = '_blank';
                fileLink.textContent = `Download ${fileName}`;
                fileLink.classList.add('download-link');

                // Append the file link to the message div
                messageDiv.appendChild(fileLink);
            }
        } else {
            // Text-only message
            messageDiv.textContent = message.content;
        }

        chatMessages.appendChild(messageDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// Function to open image in modal
function openImageViewModal(imageUrl) {
    const modal = document.getElementById('imageViewModal');
    const modalImage = document.getElementById('imageViewContent');
    const closeModal = document.getElementById('closeImageModal');

    modalImage.src = imageUrl; // Set image source
    modal.style.display = 'block'; // Show the modal

    // Close modal on click of close button
    closeModal.onclick = () => {
        modal.style.display = 'none';
        modalImage.src = ''; // Clear image source when closed
    };

    // Close modal when clicking outside the image
    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            modalImage.src = ''; // Clear image source when closed
        }
    };
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


const openUploadModalButton = document.getElementById("openUploadModalButton");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const fileInput = document.getElementById("fileInput");
const uploadFileButton = document.getElementById("uploadFileButton");

// Open the upload modal
openUploadModalButton.addEventListener("click", () => {
  uploadModal.style.display = "block";
});

// Close the upload modal
closeModal.addEventListener("click", () => {
  uploadModal.style.display = "none";
  fileInput.value = ""; // Clear file input
});

// Upload file button handler
uploadFileButton.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file to upload.");
    return;
  }

  // Perform the upload
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("senderId", userId);
    formData.append("receiverId", currentChatId);

    const response = await fetch("/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "File upload failed.");
    }

    const result = await response.json();
    console.log("File uploaded successfully:", result);

    // Update the chat UI (rely on WebSocket for real-time update)
    alert("File uploaded successfully.");
    uploadModal.style.display = "none";
    fileInput.value = ""; // Clear the file input
  } catch (error) {
    console.error("Error uploading file:", error);
    alert("Error uploading file: " + error.message);
  }
});

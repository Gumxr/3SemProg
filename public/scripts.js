<<<<<<< Updated upstream
// Funktion til at søge og vælge modtager 
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');
=======
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page content loaded!");

    // DOM Elements
    const searchUserInput = document.getElementById("searchUserInput");
    const userList = document.getElementById("userList");
    const chatContainer = document.getElementById("chatContainer");
    const chatWithUser = document.getElementById("chatWithUser");
    const chatMessages = document.getElementById("chatMessages");
    const messageInput = document.getElementById("messageInput");
    const sendMessageBtn = document.getElementById("sendMessageBtn");
    const backToSearchBtn = document.getElementById("backToSearchBtn");
    const logoutBtn = document.getElementById("logoutBtn");
>>>>>>> Stashed changes

    let currentChatId = null;
    let currentReceiverId = null;

<<<<<<< Updated upstream
    // Require at least 2 characters for searching
    if (searchText.length >= 2) {
        fetch(`/users?search=${encodeURIComponent(searchText)}`)
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
    }
});

function renderUserList(userArray) {
    userList.innerHTML = ''; // Clear the list
    if (userArray.length === 0) {
        userList.innerHTML = '<li>No users found</li>';
=======
    // Ensure user is authenticated
    const authToken = sessionStorage.getItem("authToken");
    if (!authToken) {
        window.location.href = "start.html"; // Redirect to login if not authenticated
>>>>>>> Stashed changes
        return;
    }

    // Fetch and display user search results
    searchUserInput.addEventListener("input", () => {
        const searchText = searchUserInput.value.trim().toLowerCase();

        if (searchText.length >= 2) {
            fetch(`/users?search=${encodeURIComponent(searchText)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`, // Include auth token
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Error: ${response.status}`);
                    }
                    return response.json();
                })
                .then((users) => {
                    renderUserList(users);
                })
                .catch((error) => {
                    console.error("Error fetching users:", error);
                    userList.innerHTML = "<li>Error fetching users</li>";
                });
        } else {
            userList.innerHTML = ""; // Clear the list if input is too short
        }
    });

    // Render user list
   // Render user list
function renderUserList(userArray) {
    userList.innerHTML = ""; // Clear the list
    if (userArray.length === 0) {
        userList.innerHTML = "<li>No users found</li>";
        return;
    }
    userArray.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = user.email; // Display email
        li.addEventListener("click", () => {
            console.log("Selected Receiver ID:", user.id); // Log the receiver ID
            console.log("Selected Receiver Email:", user.email); // Log the receiver email
            openChat(user.id, user.email); // Pass selected user details to openChat
        });
        userList.appendChild(li);
    });
}

<<<<<<< Updated upstream
// Funktion til at aktivere email (sign up)
let currentStep = 1; // Track the current step
const form = document.getElementById('activationForm');
const stepTitle = document.getElementById('step-title');

// Store user data as they progress
const userData = {
    email: '',
    password: '',
    phone: '',
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
        // Step 1: Validate email
        const email = document.getElementById('email').value;

        const response = await fetch('/validate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            console.log(`Email is valid! ${email}`);
            userData.email = email; // Store email in userData

            // Move to Step 2
            currentStep++;
            stepTitle.textContent = 'Trin 2: Vælg din adgangskode';
            form.innerHTML = `
                <input type="password" id="password" placeholder="Adgangskode" required />
                <input type="password" id="confirmPassword" placeholder="Bekræft adgangskode" required />
                <button type="submit">Næste</button>
            `;
        } else {
            alert('E-mail er ikke gyldig!');
        }
    } else if (currentStep === 2) {
        // Step 2: Confirm passwords
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Adgangskoder matcher ikke!');
            return;
        }

        userData.password = password; // Store password in userData

        // Move to Step 3
        currentStep++;
        stepTitle.textContent = 'Trin 3: Indtast dit telefonnummer';
        form.innerHTML = `
            <input type="tel" id="phone" placeholder="Telefonnummer" required />
            <button type="submit">Opret profil</button>
        `;
    } else if (currentStep === 3) {
        // Step 3: Collect phone number
        const phone = document.getElementById('phone').value;
        userData.phone = phone; // Store phone in userData

        // Submit all data to backend
        const response = await fetch('/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (response.ok) {
            alert('Profil oprettet!');
            window.location.href = '/login'; // Redirect to login page
        } else {
            alert('Kunne ikke oprette profil!');
        }
    }
=======
   // Open chat with a selected user
   function openChat(receiverId, receiverEmail) {
    currentReceiverId = receiverId; // Set receiverId
    chatContainer.style.display = "block"; // Show chat container
    chatWithUser.textContent = `Chatting with: ${receiverEmail}`; // Display selected user email

    // Fetch or create a chat
    fetch("/chats", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`, // Include auth token
        },
        body: JSON.stringify({ userTwoId: receiverId }),
    })
        .then((response) => response.json())
        .then((data) => {
            currentChatId = data.chatId; // Save chat ID for further communication
            loadMessages(); // Load existing messages in the chat
        })
        .catch((error) => {
            console.error("Error opening chat:", error);
        });
}

    // Load messages for the current chat
    function loadMessages() {
        fetch(`/messages/${currentChatId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        })
            .then((response) => response.json())
            .then((messages) => {
                chatMessages.innerHTML = ""; // Clear previous messages
                messages.forEach((msg) => {
                    const div = document.createElement("div");
                    div.textContent = `${msg.sender_id === parseInt(sessionStorage.getItem("userId"))
                        ? "You"
                        : "Them"
                        }: ${msg.content}`;
                    chatMessages.appendChild(div);
                });
            })
            .catch((error) => console.error("Error loading messages:", error));
    }

// Send a message
sendMessageBtn.addEventListener("click", () => {
    const content = messageInput.value.trim();
    if (!content || !currentReceiverId) {
        console.error("Message content or receiver ID is missing");
        return;
    }

    fetch("/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`, // Include the auth token
        },
        body: JSON.stringify({
            receiver_id: currentReceiverId, // Pass receiver_id to backend
            content: content,              // Pass message content
        }),
    })
        .then((response) => {
            if (!response.ok) {
                return response.text().then((text) => {
                    throw new Error(`Error sending message: ${text}`);
                });
            }
            return response.json();
        })
        .then(() => {
            messageInput.value = ""; // Clear input
            loadMessages();          // Reload chat messages
        })
        .catch((error) => {
            console.error("Error sending message:", error.message);
        });
});

    // Go back to the search interface
    backToSearchBtn.addEventListener("click", () => {
        chatContainer.style.display = "none";
        chatMessages.innerHTML = "";
        currentChatId = null;
        currentReceiverId = null;
    });

    // Handle logout
    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("userId");
        sessionStorage.removeItem("email");
        window.location.href = "start.html";
    });
>>>>>>> Stashed changes
});
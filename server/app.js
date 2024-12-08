const express = require('express');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');
const { addUser } = require('./database'); 
const { getUsers } = require('./database');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json()); // Add this line at the top, before defining routes

console.log("app running")
// Users Route


// Fallback Route
/*app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});*/


// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Find users with optional search filter
app.get('/users',authenticateToken, async (req, res) => {
    try {
        const { search } = req.query; // Extract search parameter
        let users;

        if (search) {
            console.log(`Searching users with query: ${search}`);
            users = await db.getUsers(search); // Pass search query to the database function
        } else {
            users = []; // No results if no search is provided
        }

        if (users.length === 0) {
            return res.status(200).json([]); // Return empty array for no results
        }

        // Filter out the phone numbers before sending the response
        const filteredUsers = users.map(user => ({
            id: user.id,
            email: user.email
        }));

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Check if email is valid, unique, and ends with @joejuice.com
app.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'E-mail er påkrævet' });
    }
    try {
        // Check om email allerede findes i databasen
        const existingUsers = await getUsers(email);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'E-mail findes allerede' });
        }
        // Valider om email slutter med @joejuice.com
        if (!email.endsWith('@joejuice.com')) {
            return res.status(400).json({ error: 'Kun arbejds-e-mails er tilladt' });
        }
        // Hvis alt er korrekt
        res.status(200).json({ message: 'E-mail er gyldig!' });
    } catch (error) {
        console.error('Fejl ved validering af e-mail:', error.message);
        res.status(500).json({ error: 'Serverfejl. Prøv igen senere.' });
    }
});

// Create a new user
app.post('/create-user', async (req, res) => {
    try {
        const { email, password, phone } = req.body;

        if (!email || !password || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!/^\d{7,}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Must be at least 7 digits.' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

        const newUser = await db.addUser(email, hashedPassword, phone, salt);

        // Generate JWT token
        const userPayload = { id: newUser.id, email: newUser.email };
        const accessToken = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET);

        res.status(201).json({
            message: 'User created successfully!',
            user: userPayload,
            accessToken: accessToken,
        });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email')) {
            res.status(409).json({ error: 'Email is already in use' });
        } else if (err.message.includes('UNIQUE constraint failed: users.phone')) {
            res.status(409).json({ error: 'Phone number is already in use' });
        } else {
            console.error('Error creating user:', err.message);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

// Login user
app.post('/users/login', async (req, res) => {
    console.log("handling users/login post request")
    const { email, password } = req.body;

    console.log("Received data: ", { email, password });

    try {
        const user = await db.verifyUser(email, password);
        console.log("user verified:", user);
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
        res.status(200).json({message: "Login successful", user: user, accessToken: accessToken});
    } catch (err) {
        console.log('Error verifying user:', err.message);
        res.status(401).json({ message: 'Invalid email or password' })
    }
})

app.get('/emailViaJWT', authenticateToken, (req, res) => {
    if (!req.user || !req.user.email) {
        return res.status(403).json({ error: 'Invalid token' });
    }

    res.status(200).json({ email: req.user.email });
});


// middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // because authHeader = 'Bearer TOKEN'
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

// Get all chats for a user
app.get('/chats/:userId', authenticateToken, async (req, res) => {
    const userId = req.params.userId;
    try {
        const chats = await db.getChats(userId);
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error.message);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get messages for a specific chat
app.get('/messages/:chatId', authenticateToken, async (req, res) => {
    const chatId = req.params.chatId;
    try {
        const messages = await db.getMessages(chatId);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
app.post('/messages', authenticateToken, async (req, res) => {
    const { senderId, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.sendMessage(senderId, receiverId, content);
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Create a new chat
app.post('/chats', authenticateToken, async (req, res) => {
    const { userOneId, userTwoId } = req.body;

    if (!userOneId || !userTwoId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const chat = await db.createChat(userOneId, userTwoId);
        res.status(201).json(chat);
    } catch (error) {
        console.error('Error creating chat:', error.message);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

app.use(express.json());

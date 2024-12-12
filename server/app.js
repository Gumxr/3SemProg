const express = require('express');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();
const twilio = require("twilio");

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(cors());

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;  
const twilioPhoneNumber = '+14435438666';
const client = twilio(accountSid, authToken);

// Create an HTTP server from the Express app
const server = http.createServer(app);
server.listen(port, '::', () => {
    console.log(`Server is running on http://[::]:${port}`);
});


// Create a WebSocket server
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    // Optionally send a welcome message
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WebSocket!' }));
});

// Helper function to broadcast new messages to all connected clients
function broadcastNewMessage(newMessage) {
    const payload = JSON.stringify({ type: 'new-message', message: newMessage });
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    });
}

// ------------------------- Middleware -------------------------
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token is missing' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.log('Decoded JWT payload:', user);
        req.user = user;
        next();
    });
}

// ------------------------- User Routes -------------------------
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        const users = search ? await db.searchUsers(search) : [];
        res.status(200).json(users.map((user) => ({ id: user.id, email: user.email, phone: user.phone })));
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Endpoint to get user details by ID
app.get('/users/:id', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

app.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'E-mail is required' });
    }

    try {
        const existingUsers = await db.searchUsers(email);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'E-mail already exists' });
        }

        if (!email.endsWith('@joejuice.com')) {
            return res.status(400).json({ error: 'Only company emails are allowed' });
        }

        res.status(200).json({ message: 'E-mail is valid!' });
    } catch (error) {
        console.error('Error validating email:', error.message);
        res.status(500).json({ error: 'Server error. Try again later.' });
    }
});

const codes = {}; // Temporary in-memory storage for codes

app.post('/authenticate-number', async (req, res) => {
    const { phone } = req.body;
    const number = phone;
    console.log(number)
    // Validate input
    if (!number || number.length < 8) {
        return res.status(400).json({ error: "Invalid phone number" });
    }

    try {
        // Generate 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000);

        // Store the code temporarily
        codes[number] = { code, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 minutes expiry

        // Send SMS
        const message = await client.messages.create({
            from: "+14435438666",
            to: `+45${number}`,
            body: `Din bekræftelseskode er ${code}`,
        });

        res.status(200).json({ message: "Confirmation code sent!" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send confirmation code" });
    }
});

app.post('/verify-code', (req, res) => {
    const { phone, code } = req.body;
    const number = phone;

    // Validate input
    if (!number || !code) {
        return res.status(400).json({ error: "Phone number and code are required" });
    }

    const storedCode = codes[number];

    if (!storedCode) {
        return res.status(400).json({ error: "No code found for this number" });
    }

    // Check if the code has expired
    if (Date.now() > storedCode.expiresAt) {
        delete codes[number]; // Clean up expired code
        return res.status(400).json({ error: "Code has expired" });
    }

    // Check if the code matches
    if (storedCode.code.toString() === code.toString()) {
        delete codes[number]; // Clean up after successful verification
        res.status(200).json({ message: "Phone number verified successfully!" });
    } else {
        res.status(400).json({ error: "Invalid code" });
    }
});

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
        const userDetails = await db.getUserById(newUser.id);

        if (!userDetails || !userDetails.private_key) {
            return res.status(500).json({ error: 'Failed to retrieve private key after signup' });
        }

        // Include passphrase in JWT
        const userPayload = { id: newUser.id, email: email, passphrase: salt };
        const accessToken = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET);

        res.status(201).json({
            message: 'User created successfully!',
            user: userPayload,
            accessToken: accessToken,
            privateKey: userDetails.private_key,
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

app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.verifyUser(email, password);
        if (!user || !user.salt) {
            throw new Error('Invalid email or password');
        }

        const userDetails = await db.getUserById(user.id);
        if (!userDetails || !userDetails.private_key) {
            throw new Error('Private key not found');
        }

        console.log('Salt retrieved during login:', user.salt);
        console.log('Encrypted Private Key (from database):', userDetails.private_key);

        // Include passphrase in JWT
        const tokenPayload = { id: user.id, email: user.email, passphrase: user.salt };
        const accessToken = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET);

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                passphrase: user.salt,
                encryptedPrivateKey: userDetails.private_key,
            },
            accessToken,
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(401).json({ message: error.message });
    }
});

app.get('/emailViaJWT', authenticateToken, (req, res) => {
    if (!req.user || !req.user.email) {
        return res.status(403).json({ error: 'Invalid token' });
    }
    res.status(200).json({ email: req.user.email });
});

// ------------------------- Chat Routes -------------------------
app.get('/chats/:userId', authenticateToken, async (req, res) => {
    try {
        const chats = await db.getChats(req.params.userId);
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error.message);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

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

// ------------------------- Message Routes -------------------------
app.get("/messages/:contactId", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    try {
        const messages = await db.getMessages(userId, contactId);

        if (!messages || messages.length === 0) {
            return res.status(200).json([]);
        }

        const user = await db.getUserById(userId);
        if (!user || !user.private_key) {
            return res.status(404).json({ error: "User not found or missing private key" });
        }

        const decryptedMessages = messages.map((msg) => {
            try {
                const { encryptedMessage, encryptedAESKeyForReceiver, encryptedAESKeyForSender, iv } = JSON.parse(msg.content);
                const ivBuffer = Buffer.from(iv, "base64");
                const encryptedMessageBuffer = Buffer.from(encryptedMessage, "base64");

                if (ivBuffer.length !== 16) throw new Error("Invalid IV length");

                let usedEncryptedKey;
                // Determine if current user is the receiver or the sender of this message
                if (msg.receiver_id === userId && encryptedAESKeyForReceiver) {
                    usedEncryptedKey = encryptedAESKeyForReceiver;
                } else if (msg.sender_id === userId && encryptedAESKeyForSender) {
                    usedEncryptedKey = encryptedAESKeyForSender;
                } else {
                    // Current user is neither the sender nor the receiver, or keys not available
                    return { ...msg, content: "[Encrypted - not for you]" };
                }

                const aesKeyBuffer = Buffer.from(usedEncryptedKey, "base64");

                const privateKeyObject = crypto.createPrivateKey({
                    key: user.private_key,
                    format: "pem",
                    passphrase: req.user.passphrase,
                });

                const aesKey = crypto.privateDecrypt(
                    {
                        key: privateKeyObject,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    },
                    aesKeyBuffer
                );

                const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, ivBuffer);
                const decryptedMessage = Buffer.concat([
                    decipher.update(encryptedMessageBuffer),
                    decipher.final(),
                ]).toString("utf8");

                console.log("Decrypted Message:", decryptedMessage);
                return { ...msg, content: decryptedMessage };
            } catch (error) {
                console.error("Error decrypting message:", error.message);
                return { ...msg, content: "[Unable to decrypt message]", error: error.message };
            }
        });

        res.status(200).json(decryptedMessages);
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

app.post("/messages", authenticateToken, async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;

        const sender = await db.getUserById(senderId);
        if (!sender || !sender.public_key) {
            throw new Error("Sender not found or missing public key");
        }

        const receiver = await db.getUserById(receiverId);
        if (!receiver || !receiver.public_key) {
            throw new Error("Receiver not found or missing public key");
        }

        // Generate AES key and IV
        const aesKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Encrypt the message using AES
        const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
        const encryptedMessage = Buffer.concat([
            cipher.update(content, "utf8"),
            cipher.final(),
        ]).toString("base64");

        console.log("Encrypted Message:", encryptedMessage);

        // Encrypt AES key for receiver
        const encryptedAESKeyForReceiver = crypto.publicEncrypt(
            {
                key: receiver.public_key,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            aesKey
        ).toString("base64");

        // Encrypt AES key for sender
        const encryptedAESKeyForSender = crypto.publicEncrypt(
            {
                key: sender.public_key,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            aesKey
        ).toString("base64");

        console.log("Encrypted AES Key For Receiver:", encryptedAESKeyForReceiver);
        console.log("Encrypted AES Key For Sender:", encryptedAESKeyForSender);
        console.log("IV:", iv.toString("base64"));

        // Save to database
        const messagePayload = JSON.stringify({
            encryptedMessage,
            encryptedAESKeyForReceiver,
            encryptedAESKeyForSender,
            iv: iv.toString("base64"),
        });
        await db.sendMessage(senderId, receiverId, messagePayload);

        // Broadcast new message event to all connected WebSocket clients
        const newMessage = {
            senderId,
            receiverId,
            content
        };
        broadcastNewMessage(newMessage);

        res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Failed to send message", details: error.message });
    }
});

app.post('/send-important-sms', async (req, res) => {
    const { recipientEmail, recipientNumber, senderEmail } = req.body;
    console.log("recipientNumber:", recipientNumber)
    console.log("senderEmail:", senderEmail)
    console.log("recipientEmail:", recipientEmail)

    if (!recipientNumber || !recipientEmail) {
        return res.status(400).json({ error: 'recipientNumber and recipientEmail are required.' });
    }

    try {
        const response = await client.messages.create({
            body: `
            Hej ${recipientEmail}, du har en ny besked fra ${senderEmail} i JoeJuice appen. Log venligst ind for at læse den.
            `,
            from: twilioPhoneNumber,
            to: `+45${recipientNumber}`,
        });

        console.log('SMS sent successfully:', response);
        res.status(200).json({ message: 'SMS sent successfully.', data: response });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS.' });
    }
});

// Endpoint to get previous chats based on messages table
app.get('/previous-chats', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const previousChats = await db.getPreviousChats(userId);
        res.status(200).json(previousChats);
    } catch (error) {
        console.error('Error fetching previous chats:', error.message);
        res.status(500).json({ error: 'Failed to fetch previous chats' });
    }
});

// ------------------------- Encryption Routes -------------------------
app.post('/decrypt-private-key', async (req, res) => {
    const { encryptedPrivateKey, passphrase } = req.body;
    if (!encryptedPrivateKey || !passphrase) {
        return res.status(400).json({ error: "Encrypted private key and passphrase are required" });
    }

    try {
        const privateKeyObject = crypto.createPrivateKey({
            key: encryptedPrivateKey,
            format: "pem",
            passphrase: passphrase,
        });

        const decryptedPrivateKey = privateKeyObject.export({
            format: "pem",
            type: "pkcs8",
        });

        console.log("Decrypted Private Key:", decryptedPrivateKey);
        res.status(200).json({ decryptedPrivateKey });
    } catch (error) {
        console.error("Error decrypting private key:", error.message);
        res.status(500).json({ error: "Failed to decrypt private key" });
    }
});

// Global Error Handling
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON payload:', err.message);
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
});

module.exports = app;

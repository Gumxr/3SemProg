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

// Twilio 
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;  
const twilioPhoneNumber = '+14435438666';
const client = twilio(accountSid, authToken);

// Create an HTTP server from the Express app
const server = http.createServer(app);
server.listen(port, '::', () => {
    console.log(`Server is running on http://[::]:${port}`);
});


//WebSocket server
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WebSocket!' }));
});

function broadcastNewMessage(newMessage) {
    try {
        console.log("Broadcasting new message:", newMessage); 

        const payload = JSON.stringify({ type: 'new-message', message: newMessage });
        console.log("WebSocket payload:", payload);

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(payload);
            } else {
                console.warn("Skipped client with state:", client.readyState);
            }
        });
    } catch (error) {
        console.error("Error broadcasting new message:", error.message); 
    }
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

const codes = {};

app.post('/authenticate-number', async (req, res) => {
    const { phone } = req.body;
    const number = phone;
    console.log(number)
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

    if (!number || !code) {
        return res.status(400).json({ error: "Phone number and code are required" });
    }

    const storedCode = codes[number];

    if (!storedCode) {
        return res.status(400).json({ error: "No code found for this number" });
    }

    if (Date.now() > storedCode.expiresAt) {
        delete codes[number]; 
        return res.status(400).json({ error: "Code has expired" });
    }

    if (storedCode.code.toString() === code.toString()) {
        delete codes[number]; 
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
// ------------------------- Cloudinary -----------------------------
const cloudinary = require('cloudinary').v2;
const { uploadFileToCloudinary } = require('./fileService');
const multer = require('multer'); 
const upload = multer(); 

// ------------------------- Message Routes -------------------------

// GET Route to Fetch Messages
app.get("/messages/:contactId", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    try {
        // Fetch messages between two users
        const messages = await db.getMessages(userId, contactId);

        if (!messages || messages.length === 0) {
            return res.status(200).json([]);
        }

        // Fetch user's private key
        const user = await db.getUserById(userId);
        if (!user || !user.private_key) {
            return res.status(404).json({ error: "User not found or missing private key" });
        }

        // Decrypt messages and handle file-only messages
        const decryptedMessages = messages.map((msg) => {
            try {
                if (!msg.content && msg.file_url) {
                    // Handle file-only messages
                    return {
                        ...msg,
                        content: "[File-only message]",
                        file_url: msg.file_url,
                    };
                }

                // Parse encrypted message content
                const { encryptedMessage, encryptedAESKeyForReceiver, encryptedAESKeyForSender, iv } = JSON.parse(msg.content);

                if (!encryptedMessage || !iv) {
                    throw new Error("Missing encryptedMessage or IV");
                }

                const ivBuffer = Buffer.from(iv, "base64");
                const encryptedMessageBuffer = Buffer.from(encryptedMessage, "base64");

                // Determine the correct encrypted AES key
                let usedEncryptedKey;
                if (msg.receiver_id === userId && encryptedAESKeyForReceiver) {
                    usedEncryptedKey = Buffer.from(encryptedAESKeyForReceiver, "base64");
                } else if (msg.sender_id === userId && encryptedAESKeyForSender) {
                    usedEncryptedKey = Buffer.from(encryptedAESKeyForSender, "base64");
                } else {
                    throw new Error("No valid encryption key for this user");
                }

                // Decrypt the AES key using the user's private key
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
                    usedEncryptedKey
                );

                // Decrypt the message
                const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, ivBuffer);
                const decryptedMessage = Buffer.concat([
                    decipher.update(encryptedMessageBuffer),
                    decipher.final(),
                ]).toString("utf8");

                return { ...msg, content: decryptedMessage, file_url: msg.file_url };
            } catch (error) {
                console.error("Error decrypting message:", error.message);
                return {
                    ...msg,
                    content: "[Unable to decrypt message]",
                    file_url: msg.file_url,
                };
            }
        });

        res.status(200).json(decryptedMessages);
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// POST Route to Send Messages
app.post('/messages', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        const file = req.file;

        if (!content && !file) {
            return res.status(400).json({ error: "A message must contain either content or a file." });
        }

        if (content && file) {
            return res.status(400).json({ error: "A message cannot contain both content and a file." });
        }

        const sender = await db.getUserById(senderId);
        if (!sender || !sender.public_key) {
            throw new Error("Sender not found or missing public key");
        }

        const receiver = await db.getUserById(receiverId);
        if (!receiver || !receiver.public_key) {
            throw new Error("Receiver not found or missing public key");
        }

        let fileUrl = null;

        if (content) {
            const aesKey = crypto.randomBytes(32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
            const encryptedMessage = Buffer.concat([
                cipher.update(content, 'utf8'),
                cipher.final(),
            ]).toString('base64');

            const encryptedAESKeyForReceiver = crypto.publicEncrypt(
                { key: receiver.public_key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
                aesKey
            ).toString('base64');

            const encryptedAESKeyForSender = crypto.publicEncrypt(
                { key: sender.public_key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
                aesKey
            ).toString('base64');

            const messagePayload = JSON.stringify({
                encryptedMessage,
                encryptedAESKeyForReceiver,
                encryptedAESKeyForSender,
                iv: iv.toString('base64'),
            });

            await db.sendMessage(senderId, receiverId, messagePayload, null);
        } else if (file) {
            // Upload file to Cloudinary
            fileUrl = await uploadFileToCloudinary(file.buffer, file.originalname);
            await db.sendMessage(senderId, receiverId, null, fileUrl);
        }

        broadcastNewMessage({ senderId, receiverId, content, fileUrl });

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

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON payload:', err.message);
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
});

module.exports = app;

const express = require('express');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(cors());

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

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
        res.status(200).json(users.map((user) => ({ id: user.id, email: user.email })));
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
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

        res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Failed to send message", details: error.message });
    }
});

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

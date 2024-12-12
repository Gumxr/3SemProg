const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../private/chat_app.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// ------------------------- User Functions -------------------------
function addUser(email, hashedPassword, phone, salt) {
    return new Promise((resolve, reject) => {
        // Generate RSA key pair for the user
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: salt,
            },
        });

        const query = `
            INSERT INTO users (email, password_hash, phone, salt, public_key, private_key)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [email, hashedPassword, phone, salt, publicKey, privateKey];

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error inserting user:', err.message);
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE id = ?`;
        db.get(query, [userId], (err, row) => {
            if (err) {
                console.error('Error fetching user:', err.message);
                reject(err);
            } else if (!row) {
                console.error('User not found for ID:', userId);
                reject(new Error('User not found'));
            } else {
                resolve(row);
            }
        });
    });
}

function verifyUser(email, password) {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, email, password_hash, salt FROM users WHERE email = ?`;
        db.get(query, [email], (err, row) => {
            if (err) {
                console.error('Error querying database:', err.message);
                reject(err);
            } else if (!row) {
                console.error('User not found for email:', email);
                reject(new Error('User not found'));
            } else {
                const hashedInputPassword = crypto
                    .createHash('sha256')
                    .update(password + row.salt)
                    .digest('hex');

                if (hashedInputPassword === row.password_hash) {
                    resolve({ id: row.id, email: row.email, salt: row.salt });
                } else {
                    reject(new Error('Invalid password'));
                }
            }
        });
    });
}

function searchUsers(search) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id, email, phone FROM users WHERE email LIKE ?';
        const params = [`${search}%`];
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching users:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// ------------------------- Chat Functions -------------------------
function getChats(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.*,
                   u.email AS other_user_email
            FROM chats c
            JOIN users u ON u.id = CASE
                WHEN c.user_one_id = ? THEN c.user_two_id
                ELSE c.user_one_id
            END
            WHERE c.user_one_id = ? OR c.user_two_id = ?
            ORDER BY last_timestamp DESC
        `;
        const params = [userId, userId, userId];

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching chats:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}


function createChat(userOneId, userTwoId) {
    return new Promise((resolve, reject) => {
        const checkQuery = `
            SELECT id FROM chats
            WHERE (user_one_id = ? AND user_two_id = ?) 
            OR (user_one_id = ? AND user_two_id = ?)
        `;
        const checkParams = [userOneId, userTwoId, userTwoId, userOneId];

        db.get(checkQuery, checkParams, (err, row) => {
            if (err) {
                console.error('Error checking for existing chat:', err.message);
                reject(err);
            } else if (row) {
                resolve({ id: row.id });
            } else {
                const insertQuery = `
                    INSERT INTO chats (user_one_id, user_two_id, last_message, last_timestamp, unread_count) 
                    VALUES (?, ?, '', datetime('now'), 0)
                `;
                const insertParams = [userOneId, userTwoId];
                db.run(insertQuery, insertParams, function (err) {
                    if (err) {
                        console.error('Error creating chat:', err.message);
                        reject(err);
                    } else {
                        resolve({ id: this.lastID });
                    }
                });
            }
        });
    });
}

// ------------------------- Message Functions -------------------------
function getMessages(userId, contactId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM messages
            WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
            ORDER BY timestamp ASC
        `;
        const params = [userId, contactId, contactId, userId];

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching messages:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function sendMessage(senderId, receiverId, content) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read) 
            VALUES (?, ?, ?, datetime('now'), false)
        `;
        const params = [senderId, receiverId, content];

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error saving message:', err.message);
                reject(err);
            } else {
                // After inserting the message, call updateChatLastMessage
                updateChatLastMessage(senderId, receiverId, content)
                    .then(() => resolve({ message: 'Message sent successfully' }))
                    .catch(reject);
            }
        });
    });
}


function updateChatLastMessage(senderId, receiverId, lastMessage) {
    console.log('Updating chat last message...', senderId, receiverId, lastMessage);
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE chats
            SET last_message = ?, last_timestamp = datetime('now')
            WHERE (user_one_id = ? AND user_two_id = ?)
               OR (user_one_id = ? AND user_two_id = ?)
        `;
        const params = [lastMessage, senderId, receiverId, receiverId, senderId];

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error updating chat last message:', err.message);
                reject(err);
            } else {
                console.log('Chat last message updated successfully.');
                resolve();
            }
        });
    });
}



module.exports = {
    addUser,
    getUserById,
    verifyUser,
    searchUsers,
    getChats,
    createChat,
    getMessages,
    sendMessage,
};

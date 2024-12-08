<<<<<<< Updated upstream
=======
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');


// Correct path to the private directory
const dbPath = path.join(__dirname, '../private/chat_app.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

function addUser(email, hashedPassword, phone, salt) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO users (email, password_hash, phone, salt) VALUES (?, ?, ?, ?)`;
        const params = [email, hashedPassword, phone, salt];

        console.log('Executing query:', query, 'with params:', params);

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error inserting user:', err.message);
                reject(err);
            } else {
                console.log('User inserted with ID:', this.lastID);
                resolve({ id: this.lastID });
            }
        });
    });
}

// Fetch users with optional search filter
function getUsers(search) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT id, email FROM users WHERE email LIKE ?';
        const params = [`${search}%`]; // Match emails starting with the search string

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

function verifyUser(email, password) {
    return new Promise((resolve, reject) => {
        // Query to find the user by email
        const query = `SELECT id, email, password_hash, salt FROM users WHERE email = ?`;
        const params = [email];

        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Error querying database:', err.message);
                return reject(err);
            }

            if (!row) {
                // If no user is found with the provided email
                return reject(new Error('User not found'));
            }

            // Recreate the hashed password using the stored salt
            const hashedInputPassword = crypto.createHash('sha256')
                .update(password + row.salt)  // Combine the input password with the stored salt
                .digest('hex');  // Create the hash in hexadecimal format

            // Compare the generated hash with the stored hash
            if (hashedInputPassword === row.password_hash) {
                // Password matches, return user data
                resolve({
                    id: row.id,
                    email: row.email,
                });
            } else {
                // Password does not match
                reject(new Error('Invalid password'));
            }
        });
    });
}

function getOrCreateChat(userOneId, userTwoId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id FROM chats
            WHERE (user_one_id = ? AND user_two_id = ?)
            OR (user_one_id = ? AND user_two_id = ?)
        `;
        db.get(query, [userOneId, userTwoId, userTwoId, userOneId], (err, row) => {
            if (err) return reject(err);

            if (row) {
                resolve(row.id); // Chat already exists
            } else {
                const insertQuery = `
                    INSERT INTO chats (user_one_id, user_two_id, last_message, last_timestamp, unread_count)
                    VALUES (?, ?, '', CURRENT_TIMESTAMP, 0)
                `;
                db.run(insertQuery, [userOneId, userTwoId], function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID); // Return new chat ID
                });
            }
        });
    });
}

function sendMessage(chatId, senderId, receiverId, content) {
    return new Promise((resolve, reject) => {
        const insertMessageQuery = `
            INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
        `;
        db.run(insertMessageQuery, [senderId, receiverId, content], function (err) {
            if (err) return reject(err);

            const updateChatQuery = `
                UPDATE chats
                SET last_message = ?, last_timestamp = CURRENT_TIMESTAMP, unread_count = unread_count + 1
                WHERE id = ?
            `;
            db.run(updateChatQuery, [content, chatId], (err) => {
                if (err) return reject(err);
                resolve(this.lastID); // Return message ID
            });
        });
    });
}

function getMessages(chatId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM messages
            WHERE (sender_id IN (SELECT user_one_id FROM chats WHERE id = ?)
            AND receiver_id IN (SELECT user_two_id FROM chats WHERE id = ?))
            OR (sender_id IN (SELECT user_two_id FROM chats WHERE id = ?)
            AND receiver_id IN (SELECT user_one_id FROM chats WHERE id = ?))
            ORDER BY timestamp
        `;
        db.all(query, [chatId, chatId, chatId, chatId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}
function getChatsForUser(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM chats
            WHERE user_one_id = ? OR user_two_id = ?
            ORDER BY last_timestamp DESC
        `;
        db.all(query, [userId, userId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

module.exports = {
    addUser,
    getUsers,
    verifyUser,
    getOrCreateChat,
    sendMessage,
    getMessages,
    getChatsForUser,
};


//--------------------  Gammel kode --------------------
>>>>>>> Stashed changes
/*const sqlite3 = require('sqlite3').verbose();

// Create or connect to the SQLite database
const db = new sqlite3.Database('.private/chat_app.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create the required tables
db.serialize(() => {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');

    // Users Table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, -- Hashed password
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created or already exists.');
        }
    });

    // Messages Table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL, -- Encrypted content
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT 0,
            FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating messages table:', err.message);
        } else {
            console.log('Messages table created or already exists.');
        }
    });

    // ALL Chats Table
    db.run(`
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_one_id INTEGER NOT NULL, -- One participant
            user_two_id INTEGER NOT NULL, -- Other participant
            last_message TEXT NOT NULL, -- Encrypted latest message
            last_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            unread_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_one_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (user_two_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating chats table:', err.message);
        } else {
            console.log('Chats table created or already exists.');
        }
    });
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing the database connection:', err.message);
    } else {
        console.log('Database connection closed.');
    }
});
*/
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Correct path to the private directory
const dbPath = path.join(__dirname, '../private/chat_app.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Fetch users with optional search filter
function getUsers(search) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT id, email FROM users WHERE email LIKE ?';
        const params = [`${search}%`]; // Match emails starting with the search string

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


module.exports = {
    getUsers
};

/* Insert two users into the database
db.serialize(() => {
    const insertUser = db.prepare(`
        INSERT INTO users (email, phone, password)
        VALUES (?, ?, ?)
    `);

    insertUser.run('user1@example.com', '1234567890', 'hashedpassword1', (err) => {
        if (err) {
            console.error('Error inserting user1:', err.message);
        } else {
            console.log('User1 inserted successfully.');
        }
    });

    insertUser.run('user2@example.com', '0987654321', 'hashedpassword2', (err) => {
        if (err) {
            console.error('Error inserting user2:', err.message);
        } else {
            console.log('User2 inserted successfully.');
        }
    });

    insertUser.finalize();
});
*/

// Close the database connection

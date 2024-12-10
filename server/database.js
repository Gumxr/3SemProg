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
function getChats(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                c.id,
                c.user_one_id,
                c.user_two_id,
                c.last_message,
                c.last_timestamp,
                CASE 
                    WHEN c.user_one_id = ? THEN u2.email
                    ELSE u1.email
                END AS other_user_email
            FROM chats c
            LEFT JOIN users u1 ON u1.id = c.user_one_id
            LEFT JOIN users u2 ON u2.id = c.user_two_id
            WHERE c.user_one_id = ? OR c.user_two_id = ?
            ORDER BY c.last_timestamp DESC
        `;
        const params = [userId, userId, userId];

        console.log('Executing SQL Query:', query);
        console.log('With Parameters:', params);

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error executing SQL Query:', err.message); // Log exact error
                return reject(new Error(`Database Query Failed: ${err.message}`));
            }
            if (!rows.length) {
                console.log('No chats found for user:', userId); // Log if no results
            } else {
                console.log('Fetched Chats:', rows); // Log the fetched rows
            }
            resolve(rows);
        });
    });
}

function getMessages(chatId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * 
            FROM messages 
            WHERE chat_id = ?
            ORDER BY timestamp ASC
        `;
        const params = [chatId];

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching messages:', err.message);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

function sendMessage(senderId, receiverId, content, chatId) {
    return new Promise((resolve, reject) => {
        // Insert message into the messages table
        const insertMessageQuery = `
            INSERT INTO messages (sender_id, receiver_id, content, chat_id, timestamp, is_read) 
            VALUES (?, ?, ?, ?, datetime('now'), 0)
        `;
        const params = [senderId, receiverId, content, chatId];

        db.run(insertMessageQuery, params, function (err) {
            if (err) {
                console.error('Error inserting message into messages table:', err.message);
                return reject(err);
            }

            // Update the corresponding chat with the latest message and timestamp
            const updateChatQuery = `
                UPDATE chats 
                SET last_message = ?, last_timestamp = datetime('now')
                WHERE id = ?
            `;
            db.run(updateChatQuery, [content, chatId], function (err) {
                if (err) {
                    console.error('Error updating chat:', err.message);
                    return reject(err);
                }
                resolve(); // Message sent successfully
            });
        });
    });
}


// Function to create a new chat
function createChat(userOneId, userTwoId) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO chats (user_one_id, user_two_id, last_message, last_timestamp) 
            VALUES (?, ?, '', datetime('now'))
        `;
        db.run(query, [userOneId, userTwoId], function (err) {
            if (err) {
                console.error('Error creating chat:', err.message);
                return reject(err);
            }
            resolve({ id: this.lastID, user_one_id: userOneId, user_two_id: userTwoId });
        });
    });
}
function getChatBetweenUsers(userOneId, userTwoId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM chats 
            WHERE (user_one_id = ? AND user_two_id = ?) 
               OR (user_one_id = ? AND user_two_id = ?)
        `;
        const params = [userOneId, userTwoId, userTwoId, userOneId];

        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Database error:', err.message);
                reject(new Error('Failed to fetch chat.'));
            } else {
                resolve(row); // Returns null if no match is found
            }
        });
    });
}


module.exports = {
    addUser,
    getUsers,
    verifyUser,
    getChats,
    getMessages,
    sendMessage,
    createChat,
    getChatBetweenUsers
};


//--------------------  Gammel kode --------------------
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
/* 
db.run(`ALTER TABLE users ADD COLUMN salt TEXT`, (err) => {
    if (err) {
        console.error('Error adding salt column:', err.message);
    } else {
        console.log('Added salt column. Existing rows have NULL as default.');
    }
}
);

// delete the password column
db.run(`ALTER TABLE users RENAME COLUMN password TO password_hash`, (err) => {
    if (err) {
        console.error('Error renaming password column:', err.message);
    } else {
        console.log('Renamed password column to password_hash.');
    }
}); */

/* db.run(
    `INSERT INTO users (email, password_hash, phone, salt) VALUES (?, ?, ?, ?)`,
    ['test@joejuice.com', 'hashedPasswordExample', '12345678', 'randomSalt'],
    (err) => {
        if (err) {
            console.error('Error inserting user:', err.message);
        } else {
            console.log('Inserted user.');
        }
    }
);  */
// delete the data inside the users table
/* db.run(`DELETE FROM users`, (err) => {
    if (err) {
        console.error('Error deleting users:', err.message);
    } else {
        console.log('Deleted all users.');
    }
});
 */


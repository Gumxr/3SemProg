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

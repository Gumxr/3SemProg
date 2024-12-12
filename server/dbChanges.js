const sqlite3 = require('sqlite3').verbose();

// Open the database
let db = new sqlite3.Database('../private/chat_app.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Use serialize to ensure sequential execution
db.serialize(() => {
    console.log('Starting column modification operations...');

    // Create a new table with 'content' as nullable
    db.run(`
        CREATE TABLE messages_new (
            id INTEGER PRIMARY KEY,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT, -- Make content nullable
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            file_url TEXT
        );
    `, (err) => {
        if (err) {
            return console.error('Error creating new table:', err.message);
        }
        console.log('New table "messages_new" created successfully.');
    });

    // Copy data from the old table to the new table
    db.run(`
        INSERT INTO messages_new (id, sender_id, receiver_id, content, timestamp, file_url)
        SELECT id, sender_id, receiver_id, content, timestamp, file_url FROM messages;
    `, (err) => {
        if (err) {
            return console.error('Error copying data to new table:', err.message);
        }
        console.log('Data copied successfully to "messages_new".');
    });

    // Drop the old table
    db.run(`DROP TABLE messages;`, (err) => {
        if (err) {
            return console.error('Error dropping old table:', err.message);
        }
        console.log('Old table "messages" dropped successfully.');
    });

    // Rename the new table to the original name
    db.run(`ALTER TABLE messages_new RENAME TO messages;`, (err) => {
        if (err) {
            return console.error('Error renaming new table:', err.message);
        }
        console.log('Table "messages_new" renamed to "messages".');
    });
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the SQLite database.');
});

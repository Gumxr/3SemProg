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
    console.log('Starting serialized operations...');
    
    // Add the chat_id column to the messages table
    db.run(`ALTER TABLE messages ADD COLUMN chat_id INTEGER`, function(err) {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column 'chat_id' already exists.");
            } else {
                return console.error(err.message);
            }
        } else {
            console.log('Column chat_id added successfully.');
        }
    });

    // Delete all rows from the messages table
    db.run(`DELETE FROM messages`, function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`All rows deleted from messages table. Rows affected: ${this.changes}`);
    });

    // Optional: Log the messages table after deletion to confirm it's empty
    db.all(`SELECT * FROM messages`, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Remaining rows in messages table:', rows);
    });

    // Optional: Log the updated schema
    db.all(`PRAGMA table_info(messages)`, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Updated schema for messages:', rows);
    });
});

// Close the database when done
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the SQLite database.');
});

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
    
    
    // Delete all rows from messages table
    db.run(`DELETE FROM users`, function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`All rows deleted from chats table. Rows affected: ${this.changes}`);
    });

});

// Close the database when done
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the SQLite database.');
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

// Create a new SQLite database
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the in-memory SQlite database.');
});

// Create a simple table
db.serialize(() => {
    db.run("CREATE TABLE user (id INT, name TEXT)");
    db.run("INSERT INTO user (id, name) VALUES (1, 'John Doe')");
});

// Define a route
app.get('/', (req, res) => {
    db.all("SELECT * FROM user", [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Close the database connection when the app is terminated
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
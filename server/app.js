const express = require('express');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');

function generateSalt(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));

console.log("app running")
// Users Route


// Fallback Route
/*app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});*/


// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get('/users', async (req, res) => {
    try {
        const { search } = req.query; // Extract search parameter
        let users;

        if (search) {
            console.log(`Searching users with query: ${search}`);
            users = await db.getUsers(search); // Pass search query to the database function
        } else {
            users = []; // No results if no search is provided
        }

        if (users.length === 0) {
            return res.status(200).json([]); // Return empty array for no results
        }

        // Filter out the phone numbers before sending the response
        const filteredUsers = users.map(user => ({
            id: user.id,
            email: user.email
        }));

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Log in if user exists
app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.getUser(email);

        if (user && user.password === password) {
            res.status(200).json({ id: user.id, email: user.email });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Failed to log in' });
    }
});

app.use(express.json());

app.post('/validate-email', (req, res) => {
    const { email } = req.body;

    if (!email.endsWith('@joejuice.com')) {
        return res.status(400).json({ error: 'Kun arbejds-e-mails er tilladt' });
    }

    res.status(200).json({ message: 'E-mail er gyldig!' });
});

app.post('/create-user', async (req, res) => {
    const { email, password, phone } = req.body;
    const salt = crypto.randomBytes(16).toString('hex'); // Generate a random salt
    const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

    try {
        const user = await addUser(email, hashedPassword, phone, salt);
        res.status(201).json({ message: 'Bruger oprettet!', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: 'Fejl ved oprettelse af bruger' });
    }
});
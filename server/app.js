const express = require('express');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');
const { addUser } = require('./database'); // Adjust the path if necessary

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json()); // Add this line at the top, before defining routes

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
app.post('/users/create', async (req, res) => {
    try {
        const { email, password, phone } = req.body;

        if (!email || !password || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate phone number length (minimum 5 digits)
        if (!/^\d{7,}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Must be at least 7 digits.' });
        }

        // Generate salt and hashed password
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

        // Add user to the database
        const newUser = await db.addUser(email, hashedPassword, phone, salt);
        res.status(201).json({ message: 'User created successfully!', userId: newUser.id });
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


app.post('/validate-email', (req, res) => {
    const { email } = req.body;

    // Check if the email ends with @joejuice.com
    if (!email.endsWith('@joejuice.com')) {
        return res.status(400).json({ error: 'Kun arbejds-e-mails er tilladt' });
    }

    res.status(200).json({ message: 'E-mail er gyldig!' });
});

app.post('/create-user', async (req, res) => {
    const { email, password, phone } = req.body;

    if (!email || !password || !phone) {
        console.error('Missing fields:', { email, password, phone });
        return res.status(400).json({ error: 'Missing fields in request body' });
    }

    console.log('Received data:', { email, password, phone });

    const salt = crypto.randomBytes(16).toString('hex'); // Generate a random salt
    const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

    console.log('Generated hashedPassword and salt:', { hashedPassword, salt });

    try {
        const user = await addUser(email, hashedPassword, phone, salt);
        console.log('User created successfully:', user);
        res.status(201).json({ message: 'Bruger oprettet!', userId: user.id });
    } catch (err) {
        console.error('Error creating user:', err.message);
        res.status(500).json({ error: 'Fejl ved oprettelse af bruger', details: err.message });
    }
});

app.use(express.json());

const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));

// Users Route
app.get('/users', async (req, res) => {
    try {
        const users = await db.getUsers();
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Fallback Route
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

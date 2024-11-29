const express = require('express');
const path = require('path');
const db = require('./database');

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


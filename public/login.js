document.addEventListener('DOMContentLoaded', function () {
    console.log("Page content loaded!")
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log("login form submitted")

        // Match variable names to form inputs
        const email = document.getElementById('emailInput').value.trim(); // Use 'email' from the form
        const password = document.getElementById('passwordInput').value; // Use 'password' from the form

        if (email === '' || password === '') {
            alert('Please fill in all required fields.');
            return;
        }

        fetch('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }) // Match variable names to the backend
        })
        .then(response => {
            if (response.ok) {
                console.log("login attempt successful")
                return response.json();
            }
            return response.text().then(text => {
                throw new Error('Failed to login, server response: ' + text);
            });
        })
        .then(data => {
            console.log("data:", data)
            if (data.user.id) { 
                sessionStorage.setItem('userId', data.user.id); // Store `id` from backend
                sessionStorage.setItem('email', data.user.email); // Store `email` from backend
                alert(`Login successful! Welcome ${data.user.email}`);
                window.location.href = "../index.html"; // Redirect user
            } else {
                alert('Login failed: ' + data.error);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Login failed: ' + error.message);
        });
    });
});
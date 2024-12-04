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
            body: JSON.stringify({ email, password })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    document.getElementById('emailInput').value = '';
                    document.getElementById('passwordInput').value = '';
                    throw new Error('Failed to login, server response: ' + text);
                });
            }
            return response.json();
        })
        .then(data => {
            // Check if the token exists in the response
            console.log(data)
            if (data.accessToken) {
                sessionStorage.setItem('authToken', data.accessToken); // Store JWT token
                console.log("JWT token stored in sessionStorage:", data.accessToken);
            }
        
            // Check if user information exists in the response
            if (data.user && data.user.id) {
                sessionStorage.setItem('userId', data.user.id);  // Store user ID
                sessionStorage.setItem('email', data.user.email); // Store user email
                alert(`Login successful! Welcome ${data.user.email}`);
                window.location.href = "../index.html"; // Redirect to homepage
            } else {
                throw new Error('Login failed: Missing user data');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
        
    });
});
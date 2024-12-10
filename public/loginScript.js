document.addEventListener('DOMContentLoaded', function () {
    console.log("Page content loaded!");
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("Login form submitted");

        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value;

        if (!email || !password) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            // Send login request
            const response = await fetch('/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Failed to login: ' + errorText);
            }

            const data = await response.json();
            console.log('Login response:', data);

            // Store basic user data in sessionStorage
            sessionStorage.setItem('authToken', data.accessToken);
            sessionStorage.setItem('userId', data.user.id);
            sessionStorage.setItem('email', data.user.email);
            sessionStorage.setItem('passphrase', data.user.passphrase); // directly from server response

            // Decrypt and store the private key
            if (data.user.encryptedPrivateKey) {
                const encryptedPrivateKey = data.user.encryptedPrivateKey;
                const passphrase = data.user.passphrase; // Use passphrase from backend

                try {
                    const privateKey = await decryptPrivateKey(encryptedPrivateKey, passphrase);
                    sessionStorage.setItem('privateKey', JSON.stringify(privateKey)); 
                    console.log('Decrypted private key stored in sessionStorage');
                } catch (error) {
                    console.error('Failed to decrypt private key:', error.message);
                    alert('Failed to decrypt private key. Ensure your credentials are correct.');
                    return;
                }
            }

            alert(`Login successful! Welcome ${data.user.email}`);
            window.location.href = "../index.html"; // Redirect to homepage
        } catch (error) {
            console.error('Error during login:', error.message);
            alert(error.message);
        }
    });
});

async function decryptPrivateKey(encryptedPrivateKey, passphrase) {
    try {
        const response = await fetch('/decrypt-private-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedPrivateKey, passphrase }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Failed to decrypt private key: ' + errorText);
        }

        const data = await response.json();
        console.log('Decrypted private key from backend:', data.decryptedPrivateKey);
        return data.decryptedPrivateKey;
    } catch (error) {
        console.error('Error during decryption:', error.message);
        throw new Error('Decryption failed. Ensure the passphrase is correct.');
    }
}

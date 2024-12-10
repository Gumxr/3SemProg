let currentStep = 1; // Track the current step
const form = document.getElementById('activationForm');
const stepTitle = document.getElementById('step-title');

// Store user data as they progress
const userData = {
    email: '',
    password: '',
    phone: '',
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
        // Step 1: Validate email
        const email = document.getElementById('email').value.trim();

        try {
            const response = await fetch('/validate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Email is valid! ${email}`);
                userData.email = email; // Store email in userData

                // Move to Step 2
                currentStep++;
                stepTitle.textContent = 'Trin 2: Vælg din adgangskode';
                form.innerHTML = `
                    <input type="password" id="password" placeholder="Adgangskode" required />
                    <input type="password" id="confirmPassword" placeholder="Bekræft adgangskode" required />
                    <button type="submit">Næste</button>
                `;
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'E-mail er ikke gyldig!');
            }
        } catch (error) {
            console.error('Error during email validation:', error.message);
            alert('Der opstod en fejl. Prøv igen senere.');
        }
    } else if (currentStep === 2) {
        // Step 2: Confirm passwords
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Adgangskoder matcher ikke!');
            return;
        }

        userData.password = password; // Store password in userData

        // Move to Step 3
        currentStep++;
        stepTitle.textContent = 'Trin 3: Indtast dit telefonnummer';
        form.innerHTML = `
            <input type="tel" id="phone" placeholder="Telefonnummer (minimum 7 cifre)" required />
            <button type="submit">Opret profil</button>
        `;
    } else if (currentStep === 3) {
        const phone = document.getElementById('phone').value.trim();

        if (!/^\d{7,}$/.test(phone)) {
            alert('Enter a valid phone number with at least 7 digits.');
            return;
        }

        userData.phone = phone;

        try {
            const response = await fetch('/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const data = await response.json();

                // Store JWT token, user ID, passphrase, and private key in sessionStorage
                sessionStorage.setItem('authToken', data.accessToken);
                sessionStorage.setItem('userId', data.user.id);
                sessionStorage.setItem('email', data.user.email);
                sessionStorage.setItem('privateKey', data.privateKey); // Store private key
                sessionStorage.setItem('passphrase', userData.password + userData.phone); // Example passphrase logic

                alert(`Signup successful! Welcome ${data.user.email}`);
                window.location.href = "../index.html";
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Could not create profile!');
            }
        } catch (error) {
            console.error('Error during profile creation:', error.message);
            alert('An error occurred. Please try again later.');
        }
    }
});
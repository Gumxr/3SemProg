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
        const email = document.getElementById('email').value;
    
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
                // Show specific error message from the backend
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
        <input type="tel" id="phone" placeholder="Telefonnummer" required />
        <button type="submit">Opret profil</button>
    `;
    
    } else if (currentStep === 3) {
        // Step 3: Collect phone number
        const phone = document.getElementById('phone').value;
        userData.phone = phone; // Store phone in userData
        
        // 
        console.log('User data being sent:', userData.email, userData.phone);
        // Submit all data to backend
        const response = await fetch('/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        // Check if the phone number is at least 5 digits
         if (!/^\d{7,}$/.test(phone)) {
        alert('Indtast et gyldigt telefonnummer! Minimum 7 cifre.');
        return; // Stop form submission
    }
        if (response.ok) {
            alert('Profil oprettet!');
            window.location.href = '/index.html'; // Redirect to homepage
            // Clear the form
            form.innerHTML = '';
            // Set session storage
           
        } else {
            alert('Kunne ikke oprette profil!');
        }
    }
});
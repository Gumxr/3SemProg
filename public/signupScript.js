// indelt i 4 trin
let currentStep = 1; 
const form = document.getElementById('activationForm');
const stepTitle = document.getElementById('step-title');

const userData = {
    email: '',
    password: '',
    phone: '',
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
        // trin 1: validate email
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
                userData.email = email; 

                // Nu til trin 2
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
        //2: Confirm adgangskode
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Adgangskoder matcher ikke!');
            return;
        }

        userData.password = password; 

        // trin 3: Indtast telefonnummer
        currentStep++;
        stepTitle.textContent = 'Trin 3: Indtast dit telefonnummer';
        form.innerHTML = `
            <input type="tel" id="phone" placeholder="Telefonnummer (minimum 7 cifre)" required />
            <button type="submit">Opret profil</button>
        `;
    } else if (currentStep === 3) {
        const phone = document.getElementById('phone').value.trim();

        if (!/^\d{7,}$/.test(phone)) {
            alert('Enter a valid phone number with at least 7 digits.'); // joe & juice findes i mange lande men island er det land med færrest cifre telefonnummer på 7 cifre
            return;
        }

        userData.phone = phone;

        try {
            const response = await fetch('/authenticate-number', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: userData.phone }),
            });

            if (response.ok) {
                // twilio sender en bekræftelseskode til telefonnummeret
                currentStep++;
                stepTitle.textContent = 'Trin 4: Indtast din bekræftelseskode';
                form.innerHTML = `
                    <input type="text" id="confirmationCode" placeholder="Confirmation Code" required />
                    <button type="submit">Verify</button>
                `;
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Failed to send confirmation code.');
            }
        } catch(error) {
            console.error('Error during phone number authentication:', error.message);
            alert('An error occurred. Please try again later.');
        }

    } else if (currentStep === 4) {
        const confirmationCode = document.getElementById('confirmationCode').value.trim();

        try {
            const response = await fetch('/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: userData.phone, code: confirmationCode }),
            });
    
            if (response.ok) {
                try {
                    const response = await fetch('/create-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                    });
        
                    if (response.ok) {
                        const data = await response.json();
        
                        sessionStorage.setItem('authToken', data.accessToken);
                        sessionStorage.setItem('userId', data.user.id);
                        sessionStorage.setItem('email', data.user.email);
                        sessionStorage.setItem('privateKey', data.privateKey); 
                        sessionStorage.setItem('passphrase', data.user.passphrase); 
        
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
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Invalid confirmation code.');
            }
        } catch (error) {
            console.error('Error verifying confirmation code:', error.message);
            alert('An error occurred. Please try again later.');
        }

    }
});

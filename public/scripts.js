// Funktion til at søge og vælge modtager 
const searchUserInput = document.getElementById('searchUserInput');
const userList = document.getElementById('userList');

searchUserInput.addEventListener('input', () => {
    const searchText = searchUserInput.value.trim().toLowerCase();

    // Require at least 2 characters for searching
    if (searchText.length >= 2) {
        fetch(`/users?search=${encodeURIComponent(searchText)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then(users => {
                renderUserList(users);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                userList.innerHTML = '<li>Error fetching users</li>';
            });
    } else {
        userList.innerHTML = ''; // Clear the list if input is too short
    }
});

function renderUserList(userArray) {
    userList.innerHTML = ''; // Clear the list
    if (userArray.length === 0) {
        userList.innerHTML = '<li>No users found</li>';
        return;
    }
    userArray.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.email; // Only display email
        li.addEventListener('click', () => {
            alert(`Selected user: ${user.email}`);
        });
        userList.appendChild(li);
    });
}

// Funktion til at aktivere email (sign up)
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

        const response = await fetch('/validate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
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
            alert('E-mail er ikke gyldig!');
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

        // Submit all data to backend
        const response = await fetch('/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (response.ok) {
            alert('Profil oprettet!');
            window.location.href = '/login'; // Redirect to login page
        } else {
            alert('Kunne ikke oprette profil!');
        }
    }
});
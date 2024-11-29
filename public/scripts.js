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
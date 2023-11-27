document.addEventListener('DOMContentLoaded', () => {
    const ipList = document.getElementById('ipList');
    const userForm = document.getElementById('userForm');
    const usernameInput = document.getElementById('username');
    const ipAddressInput = document.getElementById('ipAddress');

    const socket = io();

    // Listen for 'initialData' event from the server
    socket.on('initialData', (data) => {
        updateIpList(data);
    });

    // Listen for 'ipStatus' events from the server
    socket.on('ipStatus', (data) => {
        updateIpList(data);
    });

    // Function to update the IP list on the frontend
    function updateIpList(data) {
        ipList.innerHTML = ''; // Clear the list before updating

        data.forEach(({ user, ip, status }) => {
            // Create a new list item
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';
            listItem.innerHTML = `${user} - ${ip}: ${status}`;

            // Add the new item to the list
            ipList.appendChild(listItem);
        });
    }

    // Handle form submission
    userForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const ipAddress = ipAddressInput.value.trim();

        if (username && ipAddress) {
            // Emit the form data to the server
            socket.emit('modifyDatabase', { user: username, ip: ipAddress });

            // Clear the form inputs
            usernameInput.value = '';
            ipAddressInput.value = '';
        } else {
            alert('Please fill in both fields.');
        }
    });
});

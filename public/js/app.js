document.addEventListener('DOMContentLoaded', () => {
    const ipList = document.getElementById('ipList');
    const userForm = document.getElementById('userForm');
    const usernameInput = document.getElementById('username');
    const ipAddressInput = document.getElementById('ipAddress');
    const submitButton = document.getElementById('submitButton'); // Added submit button element
    const loader = document.getElementById('loader'); // Added loader element

    const socket = io();

    // Listen for 'initialData' event from the server
    socket.on('initialData', (data) => {
        updateIpList(data);
    });

    // Listen for 'ipStatus' events from the server
    socket.on('ipStatus', (data) => {
        updateIpList(data);
        hideLoader(); // Hide loader when data is updated
        enableSubmitButton(); // Enable the submit button
        $('#userModal').modal('hide'); // Close the modal after the process is complete
    });

    // Function to update the IP list on the frontend
    function updateIpList(data) {
        ipList.innerHTML = ''; // Clear the list before updating

        // Sort the data array based on status (down first)
        data.sort((a, b) => {
            if (a.status === 'down' && b.status !== 'down') {
                return -1;
            } else if (a.status !== 'down' && b.status === 'down') {
                return 1;
            } else {
                return 0;
            }
        });

        data.forEach(({ user, ip, status }) => {
            // Create a new card
            const card = document.createElement('div');
            card.className = `card mb-2 ${status === 'up' ? 'green-card' : 'red-card'}`;

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const content = document.createElement('div');
            content.className = 'd-flex justify-content-between align-items-center';
            content.innerHTML = `<span><strong>${user}</strong> (${ip})</span>
                             <span class="badge rounded-pill text-bg-${status === 'up' ? 'success' : 'danger'}">${status.toUpperCase()}</span>`;

            cardBody.appendChild(content);
            card.appendChild(cardBody);

            // Add the new card to the list
            ipList.appendChild(card);
        });
    }

    // Handle form submission
    userForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const ipAddress = ipAddressInput.value.trim();

        if (username && ipAddress) {
            // Show loader and disable submit button while processing
            showLoader();
            disableSubmitButton();

            // Emit the form data to the server
            socket.emit('modifyDatabase', { user: username, ip: ipAddress });
        } else {
            alert('Please fill in both fields.');
        }
    });

    // Function to show the loader and disable the submit button
    function showLoader() {
        loader.style.display = 'inline-block';
    }

    // Function to hide the loader
    function hideLoader() {
        loader.style.display = 'none';
    }

    // Function to disable the submit button
    function disableSubmitButton() {
        submitButton.setAttribute('disabled', 'true');
    }

    // Function to enable the submit button
    function enableSubmitButton() {
        submitButton.removeAttribute('disabled');
    }
});

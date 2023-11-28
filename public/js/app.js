document.addEventListener('DOMContentLoaded', () => {
    const ipList = document.getElementById('ipList');
    const userForm = document.getElementById('userForm');
    const usernameInput = document.getElementById('username');
    const ipAddressInput = document.getElementById('ipAddress');
    const phoneInput = document.getElementById('phone');
    const serviceInput = document.getElementById('service');
    const calleridInput = document.getElementById('callerid');
    const lastlogoutInput = document.getElementById('lastlogout');
    const lastdisconnectreasonInput = document.getElementById('lastdisconnectreason');
    const lastcalleridInput = document.getElementById('lastcallerid');
    const addressInput = document.getElementById('address');
    const submitButton = document.getElementById('submitButton'); // Added submit button element
    const loader = document.getElementById('loader'); // Added loader element

    const socket = io();

    // Listen for 'initialData' event from the server
    socket.on('initialData', (data) => {
        updateIpList(data);
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');

                // Clear existing options
                datalist.innerHTML = '';

                // Add new options based on the usernames
                usernames.forEach(username => {
                    const option = document.createElement('option');
                    option.value = username;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching usernames:', error));
    });

    fetch('/api/getConfig')
        .then(response => response.json())
        .then(config => {
            // Populate the form fields with config data
            populateConfigForm(config);
            document.getElementById('companyname').innerText = config.company;
        })
        .catch(error => console.error('Error fetching config data:', error));

    socket.on('configData', (config) => {
        // Populate the configuration form with data from config.json
        document.getElementById('company').value = config.company;
        document.getElementById('discord').value = config.discord;
        document.getElementById('telegrambot').value = config.telegrambot;
        document.getElementById('telegramid').value = config.telegramid;
        document.getElementById('customapi').value = config.customapi;
        document.getElementById('companyname').innerText = config.company;
    });

    const configForm = document.getElementById('configForm');
    configForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // Gather data from the form
        const company = document.getElementById('company').value;
        const discord = document.getElementById('discord').value;
        const telegrambot = document.getElementById('telegrambot').value;
        const telegramid = document.getElementById('telegramid').value;
        const customapi = document.getElementById('customapi').value;

        // Emit the configuration data to the server
        socket.emit('updateConfig', { company, discord, telegrambot, telegramid, customapi });

        fetch('/api/updateConfig', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ company, discord, telegrambot, telegramid, customapi })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                $('#configModal').modal('hide');
            })
            .catch(error => console.error('Error:', error));

        // Close the modal
        $('#configModal').modal('hide');
    });

    // Listen for 'ipStatus' events from the server
    socket.on('ipStatus', (data) => {
        updateIpList(data);
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');

                // Clear existing options
                datalist.innerHTML = '';

                // Add new options based on the usernames
                usernames.forEach(username => {
                    const option = document.createElement('option');
                    option.value = username;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching usernames:', error));
    });

    socket.on('dataSaved', (data) => {
        hideLoader(); // Hide loader when data is updated
        enableSubmitButton(); // Enable the submit button
        $('#userModal').modal('hide'); // Close the modal after the process is complete
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');

                // Clear existing options
                datalist.innerHTML = '';

                // Add new options based on the usernames
                usernames.forEach(username => {
                    const option = document.createElement('option');
                    option.value = username;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching usernames:', error));
    });

    // Function to update the IP list on the frontend
    function updateIpList(data) {
        ipList.innerHTML = ''; // Clear the list before updating

        let downUsersCount = 0;
        let activeUsersCount = 0;

        data.forEach(({ status }) => {
            if (status === 'DOWN') {
                downUsersCount++;
            } else {
                activeUsersCount++;
            }
        });

        document.getElementById('onlineCount').innerText = activeUsersCount + ' (Online)';
        document.getElementById('offlineCount').innerText = downUsersCount + ' (Offline)';

        data.sort((a, b) => {
            if (a.status === 'DOWN' && b.status !== 'DOWN') {
                return -1;
            } else if (a.status !== 'DOWN' && b.status === 'DOWN') {
                return 1;
            } else {
                return 0;
            }
        });

        data.forEach(({ user, ip, status, lastdisconnectreason }) => {
            // Create a new card
            if (lastdisconnectreason !== '-') {
                lastdisconnectreason = 'DOWN: ' + lastdisconnectreason;
            } else {
                lastdisconnectreason = 'DOWN';
            }

            const card = document.createElement('div');
            card.className = `card mb-2 ${status !== 'DOWN' ? 'green-card' : 'red-card'}`;

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body d-flex justify-content-between align-items-center';

            // Add content to the card body
            cardBody.innerHTML = `<span><strong>${user}</strong> (${ip})</span>`;

            // Create a new div for badge and delete button
            const badgeAndButtonDiv = document.createElement('div');
            badgeAndButtonDiv.className = 'd-flex align-items-center';

            // Add the badge to the new div
            badgeAndButtonDiv.innerHTML += `<span class="badge rounded-pill text-bg-${status !== 'DOWN' ? 'success' : 'danger'}">${status !== 'DOWN' ? convertToMilliseconds(status) : lastdisconnectreason}</span>`;

            // Add the delete button to the new div
            badgeAndButtonDiv.appendChild(createDeleteButton(user));

            // Append the new div to the card body
            cardBody.appendChild(badgeAndButtonDiv);

            // Append the card body to the card
            card.appendChild(cardBody);

            card.addEventListener('click', () => {
                showUserDetails(user);
            });

            // Add the new card to the list
            ipList.appendChild(card);
        });
    }

    // Handle form submission
    userForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const ipAddress = ipAddressInput.value.trim();
        const service = serviceInput.value.trim() || '-';
        const phone = phoneInput.value.trim() || '-';
        const callerid = calleridInput.value.trim() || '-';
        const lastlogout = lastlogoutInput.value.trim() || '-';
        const lastdisconnectreason = lastdisconnectreasonInput.value.trim() || '-';
        const lastcallerid = lastcalleridInput.value.trim() || '-';
        const address = addressInput.value.trim() || '-';

        if (username) {
            // Show loader and disable submit button while processing
            showLoader();
            disableSubmitButton();

            // Emit the form data to the server
            socket.emit('modifyDatabase', {
                user: username,
                ip: ipAddress,
                service,
                phone,
                callerid,
                lastlogout,
                lastdisconnectreason,
                lastcallerid,
                address,
            });
        } else {
            alert('Please fill in all required fields.');
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

    function convertToMilliseconds(value) {
        // Parse the value as a floating-point number
        const floatValue = parseFloat(value);

        // Check if the parsed value is a number and not NaN
        if (!isNaN(floatValue)) {
            // Check if the value is greater than or equal to 1, convert it to integer
            if (floatValue >= 1) {
                return Math.round(floatValue) + 'ms';
            } else {
                // For values less than 1 or equal to 0, return '1ms'
                return '1ms';
            }
        } else {
            // If the value is not a valid number, return the original value
            return value;
        }
    }

    function createDeleteButton(username) {
        const button = document.createElement('button');
        button.className = 'btn btn-warning btn-sm ms-2 float-end mx-2 p-0 px-1';
        button.innerText = '✖';
        button.addEventListener('click', () => {
            if (confirm(`Delete ${username}?`)) {
                // Show loader and disable submit button while processing
                showLoader();
                disableSubmitButton();

                // Emit the username to delete to the server
                socket.emit('deleteDatabase', { username });

                // Hide loader when data is updated
                hideLoader();
                enableSubmitButton();
            }
        });
        return button;
    }

    function showUserDetails(username) {
        // Fetch detailed data for the selected user
        fetch(`/api/getUserData?username=${username}`)
            .then(response => response.json())
            .then(user => {
                // Populate the modal content with user details
                const modalContent = document.getElementById('modalContent');
                modalContent.innerHTML = `
                <p><strong>Username:</strong> ${user.user}</p>
                <p><strong>IP Address:</strong> ${user.ip}</p>
                <p><strong>Service:</strong> ${user.service}</p>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>Caller ID:</strong> ${user.callerid}</p>
                <p><strong>Last Logout:</strong> ${user.lastlogout}</p>
                <p><strong>Last Disconnect Reason:</strong> ${user.lastdisconnectreason}</p>
                <p><strong>Last Caller ID:</strong> ${user.lastcallerid}</p>
                <p><strong>Address:</strong> ${user.address}</p>
            `;

                // Show the modal
                $('#entryModal').modal('show');
            })
            .catch(error => console.error('Error fetching user details:', error));
    }
    function populateConfigForm(config) {
        // Assuming you have input fields with corresponding IDs
        document.getElementById('company').value = config.company || '';
        document.getElementById('discord').value = config.discord || '';
        document.getElementById('telegrambot').value = config.telegrambot || '';
        document.getElementById('telegramid').value = config.telegramid || '';
        document.getElementById('customapi').value = config.customapi || '';
    }
});

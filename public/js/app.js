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
    });

    // Listen for 'ipStatus' events from the server
    socket.on('ipStatus', (data) => {
        updateIpList(data);
    });

    socket.on('dataSaved', (data) => {
        hideLoader(); // Hide loader when data is updated
        enableSubmitButton(); // Enable the submit button
        $('#userModal').modal('hide'); // Close the modal after the process is complete
    });

    // Function to update the IP list on the frontend
    function updateIpList(data) {
        ipList.innerHTML = ''; // Clear the list before updating

        // Sort the data array based on status (down first)
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
            console.log(lastdisconnectreason);
            if (lastdisconnectreason !== '-') {
                lastdisconnectreason = 'DOWN: ' + lastdisconnectreason;
            } else {
                lastdisconnectreason = 'DOWN';
            }

            const card = document.createElement('div');
            card.className = `card mb-2 ${status !== 'DOWN' ? 'green-card' : 'red-card'}`;

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const content = document.createElement('div');
            content.className = 'd-flex justify-content-between align-items-center';
            content.innerHTML = `<span><strong>${user}</strong> (${ip})</span>
            <span class="badge rounded-pill text-bg-${status !== 'DOWN' ? 'success' : 'danger'}">${status !== 'DOWN' || status !== 'DOWN'  ? convertToMilliseconds(status) :  lastdisconnectreason}</span>`;

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
        const service = serviceInput.value.trim() || '-';
        const phone = phoneInput.value.trim() || '-';
        const callerid = calleridInput.value.trim() || '-';
        const lastlogout = lastlogoutInput.value.trim() || '-';
        const lastdisconnectreason = lastdisconnectreasonInput.value.trim() || '-';
        const lastcallerid = lastcalleridInput.value.trim() || '-';
        const address = addressInput.value.trim() || '-';

        if (username && ipAddress) {
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
});

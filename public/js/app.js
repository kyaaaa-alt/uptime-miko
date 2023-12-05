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
    const submitButton = document.getElementById('submitButton');
    const loader = document.getElementById('loader');

    const socket = io();

    socket.on('initialData', (data) => {
        updateIpList(data);
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');
                datalist.innerHTML = '';
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
            populateConfigForm(config);
            document.getElementById('companyname').innerText = config.company;
        })
        .catch(error => console.error('Error fetching config data:', error));

    socket.on('configData', (config) => {
        document.getElementById('company').value = config.company;
        document.getElementById('discord').value = config.discord;
        document.getElementById('telegrambot').value = config.telegrambot;
        document.getElementById('telegramid').value = config.telegramid;
        document.getElementById('customapi').value = config.customapi;
        document.getElementById('companyname').innerText = config.company;
        document.getElementById('usernamelogin').innerText = config.usernamelogin;
        document.getElementById('passwordlogin').innerText = config.passwordlogin;
    });

    const configForm = document.getElementById('configForm');
    configForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const company = document.getElementById('company').value;
        const discord = document.getElementById('discord').value;
        const telegrambot = document.getElementById('telegrambot').value;
        const telegramid = document.getElementById('telegramid').value;
        const customapi = document.getElementById('customapi').value;
        const usernamelogin = document.getElementById('usernamelogin').value;
        const passwordlogin = document.getElementById('passwordlogin').value;

        socket.emit('updateConfig', { company, discord, telegrambot, telegramid, customapi, usernamelogin, passwordlogin });

        fetch('/api/updateConfig', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ company, discord, telegrambot, telegramid, customapi, usernamelogin, passwordlogin })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                $('#configModal').modal('hide');
            })
            .catch(error => console.error('Error:', error));
        $('#configModal').modal('hide');
    });

    socket.on('ipStatus', (data) => {
        updateIpList(data);
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');
                datalist.innerHTML = '';
                usernames.forEach(username => {
                    const option = document.createElement('option');
                    option.value = username;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching usernames:', error));
    });

    socket.on('dataSaved', (data) => {
        hideLoader();
        enableSubmitButton();
        $('#userModal').modal('hide');
        fetch('/api/getUsernames')
            .then(response => response.json())
            .then(usernames => {
                const datalist = document.getElementById('usernamesDatalist');
                datalist.innerHTML = '';
                usernames.forEach(username => {
                    const option = document.createElement('option');
                    option.value = username;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching usernames:', error));
    });

    function updateIpList(data) {
        ipList.innerHTML = '';

        let downUsersCount = 0;
        let activeUsersCount = 0;

        data.forEach(({ status }) => {
            if (status === 'DOWN') {
                downUsersCount++;
            } else {
                activeUsersCount++;
            }
        });

        document.getElementById('onlineCount').innerText = activeUsersCount + ' UP';
        document.getElementById('offlineCount').innerText = downUsersCount + ' DOWN';

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
            if (lastdisconnectreason !== '-') {
                lastdisconnectreason = 'DOWN: ' + lastdisconnectreason;
            } else {
                lastdisconnectreason = 'DOWN';
            }

            const card = document.createElement('div');
            card.className = `card mb-2 ${status !== 'DOWN' ? 'green-card' : 'red-card'}`;

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body d-flex justify-content-between align-items-center';
            cardBody.innerHTML = `<span class="nama"><strong>${user}</strong> (${ip})</span>`;
            const badgeAndButtonDiv = document.createElement('div');
            badgeAndButtonDiv.className = 'd-flex align-items-center';
            badgeAndButtonDiv.innerHTML += `<span class="badge state rounded-pill text-bg-${status !== 'DOWN' ? 'success' : 'danger'}">${status !== 'DOWN' ? convertToMilliseconds(status) : lastdisconnectreason}</span>`;
            badgeAndButtonDiv.appendChild(createDeleteButton(user));
            cardBody.appendChild(badgeAndButtonDiv);
            card.appendChild(cardBody);
            card.addEventListener('click', () => {
                showUserDetails(user);
            });
            ipList.appendChild(card);
            var options = {
                valueNames: ['nama', 'state']
            };
            var dataList = new List('container', options);
        });
    }

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
            showLoader();
            disableSubmitButton();
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

    function showLoader() {
        loader.style.display = 'inline-block';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    function disableSubmitButton() {
        submitButton.setAttribute('disabled', 'true');
    }

    function enableSubmitButton() {
        submitButton.removeAttribute('disabled');
    }

    function convertToMilliseconds(value) {
        const floatValue = parseFloat(value);

        if (!isNaN(floatValue)) {
            if (floatValue >= 1) {
                return Math.round(floatValue) + 'ms';
            } else {
                return '1ms';
            }
        } else {
            return value;
        }
    }

    function createDeleteButton(username) {
        const button = document.createElement('button');
        button.className = 'btn btn-warning btn-sm ms-2 float-end mx-2 p-0 px-1';
        button.innerText = '✖';
        button.addEventListener('click', () => {
            if (confirm(`Delete ${username}?`)) {
                showLoader();
                disableSubmitButton();
                socket.emit('deleteDatabase', { username });
                hideLoader();
                enableSubmitButton();
            }
        });
        return button;
    }

    function showUserDetails(username) {
        fetch(`/api/getUserData?username=${username}`)
            .then(response => response.json())
            .then(user => {
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
                <p><strong>Location:</strong> ${user.address}</p>
            `;
                $('#entryModal').modal('show');
            })
            .catch(error => console.error('Error fetching user details:', error));
    }
    function populateConfigForm(config) {
        document.getElementById('company').value = config.company || '';
        document.getElementById('discord').value = config.discord || '';
        document.getElementById('telegrambot').value = config.telegrambot || '';
        document.getElementById('telegramid').value = config.telegramid || '';
        document.getElementById('customapi').value = config.customapi || '';
        document.getElementById('usernamelogin').value = config.usernamelogin || '';
        document.getElementById('passwordlogin').value = config.passwordlogin || '';
    }
});

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ping = require('ping');
const fs = require('fs');
const {response} = require("express");
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { DiscordWebhook } = require("./lib/discord");

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server);

const cors = require('cors');
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Path to the data file
const dataFilePath = 'data.json';
const configFilePath = 'config.json';

// Read initial data from the file or create an empty array
let ipStatusData = readDataFile() || [];
let configData = readConfigFile() || {};
let webhookTimeout;

// Set up session middleware with express-session-file-store as the session store
app.use(
    session({
        secret: 'uptimemiko', // Change this to a strong, random string
        resave: false,
        saveUninitialized: true,
        store: new FileStore(),
        cookie: { maxAge: 2629800000 }
    })
);
// Authenticate middleware
const authenticate = (req, res, next) => {
    // Check if the user is authenticated (customize based on your logic)
    if (req.session && req.session.authenticated) {
        return next(); // User is authenticated, continue to the next middleware
    } else {
        res.redirect('/login'); // Redirect to the login page if not authenticated
    }
};

// Protected route
app.get('/', authenticate, (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Manually serve static files
app.use((req, res, next) => {
    if (req.url.startsWith('/css') || req.url.startsWith('/js') || req.url.startsWith('/img')) {
        // Adjust the path based on your project structure
        res.sendFile(__dirname + '/public' + req.url);
    } else {
        next();
    }
});

// Login route
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy the session
    res.redirect('/login'); // Redirect to the login page
});

app.post('/authenticate', (req, res) => {
    const { username, password } = req.body;

    // Check your username and password (replace this with your actual authentication logic)
    if (username === configData.usernamelogin && password === configData.passwordlogin) {
        req.session.authenticated = true; // Mark the session as authenticated
        res.redirect('/'); // Redirect to the root page after successful authentication
    } else {
        // Redirect to the login page if authentication fails with alert
        res.send('<script>alert("Invalid username or password"); window.location.href = "/login";</script>');
    }
});

app.get('/api/getConfig', (req, res) => {
    res.json(configData);
});

// Listen for form submissions from the configuration modal
app.post('/api/updateConfig', (req, res) => {
    const config = req.body;

    // Update the configData object
    configData = { ...config };

    // Save the config data to the file
    saveConfigToFile(configData);

    // Emit the updated config data to all clients
    io.emit('configData', configData);

    res.json({ success: true, message: 'Config updated successfully' });
});

app.get('/api/getUserData', (req, res) => {
    const username = req.query.username;
    const user = ipStatusData.find(entry => entry.user === username);
    res.json(user);
});

app.get('/api/getUsernames', (req, res) => {
    const usernames = ipStatusData.map(entry => entry.user);
    res.json(usernames);
});

function getUsernames() {
    return ipStatusData.map(entry => entry.user);
}

app.post('/api/deleteUserData', (req, res) => {
    const usernameToDelete = req.body.username;

    // Remove the entry from the ipStatusData array
    ipStatusData = ipStatusData.filter(entry => entry.user !== usernameToDelete);

    // Save the updated data to the file
    saveDataToFile(ipStatusData);

    // Emit the updated data to all clients
    io.emit('ipStatus', ipStatusData);

    res.json({ success: true, message: 'Data deleted successfully' });
});

// Listen for form submissions from MikroTik
app.post('/api/updateUserData', async (req, res) => {
    console.log('Received submission from api:', req.body);
    if (webhookTimeout) {
        clearTimeout(webhookTimeout);
    }
    try {
        const data = req.body;
        const { user, ip, service, phone, lastdisconnectreason, address } = data;
        let { callerid, lastcallerid, lastlogout } = data;

        // Replace slashes with spaces in the date string
        lastlogout = lastlogout.replace(/\//g, ' ');

        // Your existing logic for updating or adding user data goes here
        const existingEntryIndex = ipStatusData.findIndex(entry => entry.user === user);

        if (existingEntryIndex !== -1) {
            // Entry already exists, update it
            // console.log(`Entry already exists for user ${user}, updating...`);
            // Check if each field has a value other than "-"
            if (user !== '-') ipStatusData[existingEntryIndex].user = user;
            if (ip !== '-') ip = 'logout';
            if (service !== '-') ipStatusData[existingEntryIndex].service = service;
            if (phone !== '-') ipStatusData[existingEntryIndex].phone = phone;
            if (callerid !== '-') ipStatusData[existingEntryIndex].callerid = callerid;
            if (lastlogout !== '-') ipStatusData[existingEntryIndex].lastlogout = lastlogout;
            if (lastdisconnectreason !== '-') ipStatusData[existingEntryIndex].lastdisconnectreason = lastdisconnectreason;
            if (lastcallerid !== '-') ipStatusData[existingEntryIndex].lastcallerid = lastcallerid;
            if (address !== '-') ipStatusData[existingEntryIndex].address = address;
            // Update the status based on the new IP
            // ipStatusData[existingEntryIndex].status = await checkUptime(ipStatusData[existingEntryIndex].ip);
            currentStatus = ipStatusData[existingEntryIndex].status;
            newStatus = await checkUptime(ipStatusData[existingEntryIndex].ip);
            if (isNumeric(ipStatusData[existingEntryIndex].status)) {
                if (newStatus === 'DOWN') {
                    webhookTimeout = setTimeout(() => {
                        new DiscordWebhook('Uptime Miko', `${ipStatusData[existingEntryIndex].user}`, `${ipStatusData[existingEntryIndex].ip}`, `${ipStatusData[existingEntryIndex].service}`, `DOWN`, `${ipStatusData[existingEntryIndex].lastdisconnectreason}`, `${ipStatusData[existingEntryIndex].phone}`,`${ipStatusData[existingEntryIndex].address}`, `Please check it ASAP`, 16711680, 'https://ceritabaru.web.id/down.png', false).send();
                    }, randomDelay(1000, 2000));
                    ipStatusData[existingEntryIndex].status = newStatus;
                    console.log(`Uptime for ${ipStatusData[existingEntryIndex].user}:`, 'DOWN');
                }
            }
            if (ipStatusData[existingEntryIndex].status === 'DOWN') {
                if (isNumeric(newStatus)) {
                    webhookTimeout = setTimeout(() => {
                        new DiscordWebhook('Uptime Miko', `${ipStatusData[existingEntryIndex].user}`, `${ipStatusData[existingEntryIndex].ip}`, `${ipStatusData[existingEntryIndex].service}`, `UP`, `${ipStatusData[existingEntryIndex].lastdisconnectreason}`, `${ipStatusData[existingEntryIndex].phone}`,`${ipStatusData[existingEntryIndex].address}`, `-`, 65280, 'https://ceritabaru.web.id/up.png', false).send();
                    }, randomDelay(1000, 2000));
                    ipStatusData[existingEntryIndex].status = newStatus;
                    console.log(`Uptime for ${ipStatusData[existingEntryIndex].user}:`, 'UP');
                }
            }
        } else {
            // Entry doesn't exist, add it with an initial status
            const status = await checkUptime(ip);
            if (status === 'DOWN') {
                webhookTimeout = setTimeout(() => {
                    new DiscordWebhook('Uptime Miko', `${user}`, `${ip}`, `${service}`, `DOWN`, `${lastdisconnectreason}`, `${phone}`,`${address}`, `Please check it ASAP`, 16711680, 'https://ceritabaru.web.id/down.png', false).send();
                    console.log(`Uptime for ${user}:`, 'DOWN');
                }, randomDelay(1000, 2000));
            } else {
                webhookTimeout = setTimeout(() => {
                    new DiscordWebhook('Uptime Miko', `${user}`, `${ip}`, `${service}`, `UP`, `${lastdisconnectreason}`, `${phone}`,`${address}`, `-`, 65280, 'https://ceritabaru.web.id/up.png', false).send();
                    console.log(`Uptime for ${user}:`, 'UP');
                }, randomDelay(1000, 2000));
            }
            ipStatusData.push({
                user,
                ip,
                service,
                status,
                phone,
                callerid,
                lastlogout: lastlogout,
                lastdisconnectreason,
                lastcallerid,
                address,
                timestamp: Date.now(),
            });
        }

        // Save the data to the file
        saveDataToFile(ipStatusData);

        // Emit the updated data to all clients
        io.emit('ipStatus', ipStatusData);

        // Send a response back to MikroTik
        res.json({ success: true, message: 'Data updated successfully' });
    } catch (error) {
        console.error('Error updating data:', error);
        // Send an error response back to MikroTik
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Listen for form submissions
io.on('connection', (socket) => {
    // console.log('A user connected');

    socket.emit('initialData', ipStatusData);

    socket.on('modifyDatabase', async (data) => {
        console.log('Received submission from website: ', data);
        if (webhookTimeout) {
            clearTimeout(webhookTimeout);
        }
        const { user, ip, service, status, phone, callerid, lastlogout, lastdisconnectreason, lastcallerid, address, timestamp } = data;

        try {
            // Check if the entry already exists for the user
            const existingEntryIndex = ipStatusData.findIndex(entry => entry.user === user);

            if (existingEntryIndex !== -1) {
                // Entry already exists, update it without modifying certain fields
                // console.log(`Entry already exists for user ${user}, updating...`);
                const existingEntry = ipStatusData[existingEntryIndex];
                if (user !== '') ipStatusData[existingEntryIndex].user = user;
                if (ip !== '') ipStatusData[existingEntryIndex].ip = ip;
                if (service !== '') ipStatusData[existingEntryIndex].service = service;
                if (phone !== '') ipStatusData[existingEntryIndex].phone = phone;
                ipStatusData[existingEntryIndex].callerid = existingEntry.callerid;
                ipStatusData[existingEntryIndex].lastlogout = existingEntry.lastlogout;
                ipStatusData[existingEntryIndex].lastdisconnectreason = existingEntry.lastdisconnectreason;
                ipStatusData[existingEntryIndex].lastcallerid = existingEntry.lastcallerid;
                if (address !== '') ipStatusData[existingEntryIndex].address = address;
                existingEntry.timestamp = Date.now();

                // Update the status based on the new IP
                // ipStatusData[existingEntryIndex].status = await checkUptime(ipStatusData[existingEntryIndex].ip);
                currentStatus = ipStatusData[existingEntryIndex].status;
                newStatus = await checkUptime(ipStatusData[existingEntryIndex].ip);
                if (isNumeric(ipStatusData[existingEntryIndex].status)) {
                    if (newStatus === 'DOWN') {
                        webhookTimeout = setTimeout(() => {
                            new DiscordWebhook('Uptime Miko', `${ipStatusData[existingEntryIndex].user}`, `${ipStatusData[existingEntryIndex].ip}`, `${ipStatusData[existingEntryIndex].service}`, `DOWN`, `${ipStatusData[existingEntryIndex].lastdisconnectreason}`, `${ipStatusData[existingEntryIndex].phone}`,`${ipStatusData[existingEntryIndex].address}`, `Please check it ASAP`, 16711680, 'https://ceritabaru.web.id/down.png', false).send();
                        }, randomDelay(1000, 2000));
                        ipStatusData[existingEntryIndex].status = newStatus;
                        console.log(`Uptime for ${ipStatusData[existingEntryIndex].user}:`, 'DOWN');
                    }
                }
                if (ipStatusData[existingEntryIndex].status === 'DOWN') {
                    if (isNumeric(newStatus)) {
                        webhookTimeout = setTimeout(() => {
                            new DiscordWebhook('Uptime Miko', `${ipStatusData[existingEntryIndex].user}`, `${ipStatusData[existingEntryIndex].ip}`, `${ipStatusData[existingEntryIndex].service}`, `UP`, `${ipStatusData[existingEntryIndex].lastdisconnectreason}`, `${ipStatusData[existingEntryIndex].phone}`,`${ipStatusData[existingEntryIndex].address}`, `-`, 65280, 'https://ceritabaru.web.id/up.png', false).send();
                        }, randomDelay(1000, 2000));
                        ipStatusData[existingEntryIndex].status = newStatus;
                        console.log(`Uptime for ${ipStatusData[existingEntryIndex].user}:`, 'UP');
                    }
                }
            } else {
                // Entry doesn't exist, add it with an initial status
                const status = await checkUptime(ip);
                if (status === 'DOWN') {
                    webhookTimeout = setTimeout(() => {
                        new DiscordWebhook('Uptime Miko', `${user}`, `${ip}`, `${service}`, `DOWN`, `${lastdisconnectreason}`, `${phone}`,`${address}`, `Please check it ASAP`, 16711680, 'https://ceritabaru.web.id/down.png', false).send();
                    }, randomDelay(1000, 2000));
                    console.log(`Uptime for ${user}:`, 'DOWN')
                } else {
                    webhookTimeout = setTimeout(() => {
                        new DiscordWebhook('Uptime Miko', `${user}`, `${ip}`, `${service}`, `UP`, `${lastdisconnectreason}`, `${phone}`,`${address}`, `-`, 65280, 'https://ceritabaru.web.id/up.png', false).send();
                    }, randomDelay(1000, 2000));
                    console.log(`Uptime for ${user}:`, 'UP')
                }
                ipStatusData.push({
                    user,
                    ip,
                    service,
                    status,
                    phone,
                    callerid,
                    lastlogout,
                    lastdisconnectreason,
                    lastcallerid,
                    address,
                    timestamp: Date.now(),
                });
            }

            // Save the data to the file
            saveDataToFile(ipStatusData);

            // Emit the updated data to all clients
            io.emit('ipStatus', ipStatusData);
            io.emit('dataSaved', getUsernames());
        } catch (error) {
            console.error('Error checking uptime or updating data:', error);
        }
    });

    socket.on('deleteDatabase', (data) => {
        const { username } = data;

        // Remove the entry from the ipStatusData array
        ipStatusData = ipStatusData.filter(entry => entry.user !== username);

        // Save the updated data to the file
        saveDataToFile(ipStatusData);

        // Emit the updated data to all clients
        io.emit('ipStatus', ipStatusData);
    });
});

const checkUptime = async (ip) => {
    if (ip === '-' || ip === 'logout') return 'DOWN'; // Return DOWN if the IP is not set
    const maxRetries = 1;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const pingPromise = ping.promise.probe(ip, { timeout: 200, min_reply: 3 });
            const result = await Promise.race([pingPromise, new Promise((_, reject) => setTimeout(() => reject('Timeout'), 3000))]);

            if (result) {
                // console.log(`Uptime for ${ip}:`, result.time);
                return result.time; // Return the round-trip time if the host is reachable
            } else {
                // console.log(`Retrying for ${ip}...`);
                retryCount++;
            }
        } catch (error) {
            // console.error(`Uptime for ${ip}:`, error);
            return 'DOWN'; // Assume the status is down if there is an error
        }
    }

    // If max retries are reached and still not successful, consider it as DOWN
    // console.log(`Max retries reached for ${ip}, marking as DOWN`);
    return 'DOWN';
};


const checkAndEmitUptime = async () => {
    if (webhookTimeout) {
        clearTimeout(webhookTimeout);
    }
    try {
        // Use Promise.all to execute all checkUptime calls in parallel
        const results = await Promise.all(
            ipStatusData.map(async (entry) => {
                const { user, ip, status } = entry;
                try {
                    const lastStatus = status;
                    const newStatus = await checkUptime(ip);
                    return { user, lastStatus, newStatus };
                } catch (error) {
                    // console.error(`Error checking uptime for ${user}:`, error);
                    // Return a placeholder value or handle the error as needed
                    return { user, status: 'DOWN' };
                }
            })
        );

        // Update ipStatusData based on the results
        for (const result of results) {
            const { user, lastStatus, newStatus } = result;
            const entryIndex = ipStatusData.findIndex((e) => e.user === user);
            if (entryIndex !== -1) {
                // ipStatusData[entryIndex].status = newStatus;
                // ipStatusData[entryIndex].timestamp = Date.now();
                currentStatus = ipStatusData[entryIndex].status;
                if (isNumeric(lastStatus)) {
                    if (newStatus === 'DOWN' && ipStatusData[entryIndex].service !== 'pppoe') {
                        webhookTimeout = setTimeout(() => {
                            new DiscordWebhook('Uptime Miko', `${ipStatusData[entryIndex].user}`, `${ipStatusData[entryIndex].ip}`, `${ipStatusData[entryIndex].service}`, `DOWN`, `${ipStatusData[entryIndex].lastdisconnectreason}`, `${ipStatusData[entryIndex].phone}`,`${ipStatusData[entryIndex].address}`, `Please check it ASAP`, 16711680, 'https://ceritabaru.web.id/down.png', false).send();
                        }, randomDelay(1000, 2000));
                        ipStatusData[entryIndex].status = newStatus;
                        ipStatusData[entryIndex].timestamp = Date.now();
                    }
                }
                if (lastStatus === 'DOWN') {
                    if (isNumeric(newStatus) && ipStatusData[entryIndex].service !== 'pppoe') {
                        webhookTimeout = setTimeout(() => {
                            new DiscordWebhook('Uptime Miko', `${ipStatusData[entryIndex].user}`, `${ipStatusData[entryIndex].ip}`, `${ipStatusData[entryIndex].service}`, `UP`, `${ipStatusData[entryIndex].lastdisconnectreason}`, `${ipStatusData[entryIndex].phone}`,`${ipStatusData[entryIndex].address}`, `-`, 65280, 'https://ceritabaru.web.id/up.png', false).send();
                        }, randomDelay(1000, 2000));
                        ipStatusData[entryIndex].status = newStatus;
                        ipStatusData[entryIndex].timestamp = Date.now();
                    }
                }
            } else {
                console.error(`Entry not found for user ${user}`);
            }
        }
        // Emit the result to the connected clients
        io.emit('ipStatus', ipStatusData);
        // Save the data to the file
        saveDataToFile(ipStatusData);
    } catch (error) {
        console.error('Error checking uptime or updating data:', error);
    }
};

// Call the function once on startup
checkAndEmitUptime();
// Implement logic for checking and emitting IP uptime status
setInterval(checkAndEmitUptime, 60000);

const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Helper function to read data from the file
function readDataFile() {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return null;
    }
}

function readConfigFile() {
    try {
        const config = fs.readFileSync(configFilePath, 'utf8');
        return JSON.parse(config);
    } catch (error) {
        console.error('Error reading config file:', error);
        return null;
    }
}

// Helper function to save config data to the file
function saveConfigToFile(config) {
    try {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
        // console.log('Config saved to file successfully!');
    } catch (error) {
        console.error('Error saving config to file:', error);
    }
}

// Helper function to save data to the file
function saveDataToFile(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        // console.log('Check and emit done... Data saved to file successfully!');
    } catch (error) {
        console.error('Error saving data to file:', error);
    }
}

function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

function randomDelay(min, max) {
    // Function to generate a random delay between min and max seconds
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
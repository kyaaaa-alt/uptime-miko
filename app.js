const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ping = require('ping');
const fs = require('fs');
const {response} = require("express");

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server);

const cors = require('cors');
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true }));

// Path to the data file
const dataFilePath = 'data.json';

// Read initial data from the file or create an empty array
let ipStatusData = readDataFile() || [];

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

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
    console.log('Received form api:', req.body);

    try {
        const data = req.body;
        const { user, ip, service, phone, lastdisconnectreason, address } = data;
        let { callerid, lastcallerid, lastlogout } = data;

        // Normalize MAC addresses (remove colons or dashes)
        callerid = normalizeMacAddress(callerid);
        lastcallerid = normalizeMacAddress(lastcallerid);

        // Replace slashes with spaces in the date string
        lastlogout = lastlogout.replace(/\//g, ' ');

        // Your existing logic for updating or adding user data goes here
        const existingEntryIndex = ipStatusData.findIndex(entry => entry.user === user);

        if (existingEntryIndex !== -1) {
            // Entry already exists, update it
            console.log(`Entry already exists for user ${user}, updating...`);
            // Check if each field has a value other than "-"
            if (ip !== '-') ipStatusData[existingEntryIndex].ip = ip;
            if (service !== '-') ipStatusData[existingEntryIndex].service = service;
            if (phone !== '-') ipStatusData[existingEntryIndex].phone = phone;
            if (callerid !== '-') ipStatusData[existingEntryIndex].callerid = callerid;
            if (lastlogout !== '-') ipStatusData[existingEntryIndex].lastlogout = lastlogout;
            if (lastdisconnectreason !== '-') ipStatusData[existingEntryIndex].lastdisconnectreason = lastdisconnectreason;
            if (lastcallerid !== '-') ipStatusData[existingEntryIndex].lastcallerid = lastcallerid;
            if (address !== '-') ipStatusData[existingEntryIndex].address = address;
            // Update the status based on the new IP
            ipStatusData[existingEntryIndex].status = await checkUptime(ipStatusData[existingEntryIndex].ip);
        } else {
            // Entry doesn't exist, add it with an initial status
            const status = await checkUptime(ip);
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
    console.log('A user connected');

    socket.emit('initialData', ipStatusData);

    socket.on('modifyDatabase', async (data) => {
        console.log('Received form data:', data);

        const { user, ip, service, status, phone, callerid, lastlogout, lastdisconnectreason, lastcallerid, address, timestamp } = data;

        try {
            // Check if the entry already exists for the user
            const existingEntryIndex = ipStatusData.findIndex(entry => entry.user === user);

            if (existingEntryIndex !== -1) {
                // Entry already exists, update it without modifying certain fields
                console.log(`Entry already exists for user ${user}, updating...`);
                const existingEntry = ipStatusData[existingEntryIndex];
                ipStatusData[existingEntryIndex] = {
                    user,
                    ip,
                    service,
                    status,
                    phone,
                    // Do not update these fields if the entry already exists
                    callerid: existingEntry.callerid,
                    lastlogout: existingEntry.lastlogout,
                    lastdisconnectreason: existingEntry.lastdisconnectreason,
                    lastcallerid: existingEntry.lastcallerid,
                    address,
                    timestamp: Date.now(),
                };
                // Update the status based on the new IP
                ipStatusData[existingEntryIndex].status = await checkUptime(ipStatusData[existingEntryIndex].ip);
            } else {
                // Entry doesn't exist, add it with an initial status
                const status = await checkUptime(ip);
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
            io.emit('dataSaved', 'ok');
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
    const maxRetries = 1;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const pingPromise = ping.promise.probe(ip, { timeout: 200, min_reply: 3 });
            const result = await Promise.race([pingPromise, new Promise((_, reject) => setTimeout(() => reject('Timeout'), 3000))]);

            if (result) {
                console.log(`Uptime for ${ip}:`, result.avg);
                return result.avg; // Return the round-trip time if the host is reachable
            } else {
                console.log(`Retrying for ${ip}...`);
                retryCount++;
            }
        } catch (error) {
            console.error(`Uptime for ${ip}:`, error);
            return 'DOWN'; // Assume the status is down if there is an error
        }
    }

    // If max retries are reached and still not successful, consider it as DOWN
    console.log(`Max retries reached for ${ip}, marking as DOWN`);
    return 'DOWN';
};


const checkAndEmitUptime = async () => {
    try {
        // Use Promise.all to execute all checkUptime calls in parallel
        const results = await Promise.all(
            ipStatusData.map(async (entry) => {
                const { user, ip } = entry;
                try {
                    const status = await checkUptime(ip);
                    return { user, status };
                } catch (error) {
                    console.error(`Error checking uptime for ${user}:`, error);
                    // Return a placeholder value or handle the error as needed
                    return { user, status: 'ERROR' };
                }
            })
        );

        // Update ipStatusData based on the results
        for (const result of results) {
            const { user, status } = result;
            const entryIndex = ipStatusData.findIndex((e) => e.user === user);
            if (entryIndex !== -1) {
                ipStatusData[entryIndex].status = status;
                ipStatusData[entryIndex].timestamp = Date.now();
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

// Helper function to save data to the file
function saveDataToFile(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Check and emit done... Data saved to file successfully!');
    } catch (error) {
        console.error('Error saving data to file:', error);
    }
}

function normalizeMacAddress(macAddress) {
    // Remove colons and dashes from MAC address
    return macAddress.replace(/[:\-]/g, '').toUpperCase();
}

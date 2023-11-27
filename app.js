const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ping = require('ping');
const fs = require('fs');
const {response} = require("express");

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server);

// Path to the data file
const dataFilePath = 'data.json';

// Read initial data from the file or create an empty array
let ipStatusData = readDataFile() || [];

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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
                // Entry already exists, update it
                console.log(`Entry already exists for user ${user}, updating...`);
                ipStatusData[existingEntryIndex] = {
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
        } catch (error) {
            console.error('Error checking uptime or updating data:', error);
        }
    });
});

const checkUptime = async (ip) => {
    try {
        const result = await ping.promise.probe(ip, { timeout: 1500, min_reply: 3 });
        return result.avg;
    } catch (error) {
        console.error(`Error checking uptime for ${ip}:`, error);
        return 'DOWN'; // Assume the status is down if there is an error
    }
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

// Implement logic for checking and emitting IP uptime status
setInterval(checkAndEmitUptime, 20000);

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
        console.log('Data saved to file');
    } catch (error) {
        console.error('Error saving data to file:', error);
    }
}

const axios = require('axios')
const fs = require('fs');
const configFilePath = 'config.json';
let configData = readConfigFile() || {};
function readConfigFile() {
    try {
        const config = fs.readFileSync(configFilePath, 'utf8');
        return JSON.parse(config);
    } catch (error) {
        console.error('Error reading config file:', error);
        return null;
    }
}
const defaultWebhookUrl = configData.discord;

class DiscordWebhook {
    constructor(title = '', user, ip, service, status, lastdisconnectreason, phone, location = '-', act = '-', color= 5174599, img = 'https://ceritabaru.web.id/ping.png', mention = false) {
        this.title = title
        this.user = user
        this.ip = ip
        this.service = service
        this.status = status
        this.lastdisconnectreason = lastdisconnectreason
        this.phone = phone
        this.location = location
        this.act = act
        this.color = color
        this.img = img
        this.mention = mention == true ? '<@&1048107430485180466> ' : ' '
    }

    async send() {
        const dateTemplate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        const timeTemplate = { hour: '2-digit', minute: '2-digit' }
        const date = new Date().toLocaleDateString('id-ID', dateTemplate)
        const time = new Date().toLocaleTimeString('id-ID', timeTemplate)
        let payload = {
            username: 'Uptime-Miko',
            embeds: [
                {
                    title: `${this.title}`,
                    color: this.color,
                    thumbnail: {
                        url: `${this.img}`,
                    },
                    footer: {
                        text: `📅 ${date} @${time}`,
                    },
                    fields: [
                        {
                            name: 'User',
                            value: `${this.user}`,
                            inline: true,
                        },
                        {
                            name: 'IP Address',
                            value: `${this.ip}`,
                            inline: true,
                        },
                        {
                            name: 'Service',
                            value: `${this.service}`,
                            inline: true,
                        },
                        {
                            name: 'Status',
                            value: `${this.status}`,
                            inline: true,
                        },
                        {
                            name: 'Last Disconnect Reason',
                            value: `${this.lastdisconnectreason}`,
                            inline: true,
                        },
                        {
                            name: 'Phone Number',
                            value: `${this.phone}`,
                            inline: true,
                        },
                        {
                            name: 'Location',
                            value: `${this.location}`,
                            inline: true,
                        },
                        {
                            name: 'Note',
                            value: `${this.act}`,
                            inline: false,
                        }
                    ]
                },
            ],
            content: `@here Uptime for ${this.user} (${this.ip}) is ${this.status}`,
            allowed_mentions: {
                roles: ['1048107430485180466']
            }
        };

        let data = JSON.stringify(payload);
        var config = {
            method: "POST",
            url: defaultWebhookUrl,
            headers: { "Content-Type": "application/json" },
            data: data,
        };

        axios(config)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                console.log(error);
                return error;
            });
    }
}

module.exports = {
    DiscordWebhook
}
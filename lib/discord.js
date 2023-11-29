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
    constructor(title = '', msg, act = '-', color= 5174599, mention = false) {
        this.title = title
        this.msg = msg
        this.act = act
        this.color = color
        this.mention = mention == true ? '<@&1048107430485180466> ' : ' '
    }

    async send() {
        const dateTemplate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        const timeTemplate = { hour: '2-digit', minute: '2-digit' }
        const date = new Date().toLocaleDateString('id-ID', dateTemplate)
        const time = new Date().toLocaleTimeString('id-ID', timeTemplate)
        let payload = {
            username: 'WA-API',
            embeds: [
                {
                    title: `${this.title}`,
                    color: this.color,
                    thumbnail: {
                        url: 'https://ceritabaru.web.id/ping.png',
                    },
                    footer: {
                        text: `📅 ${date} @${time}`,
                    },
                    fields: [
                        {
                            name: 'Messages',
                            value: `${this.msg}`,
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
            content: `${this.mention} `,
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
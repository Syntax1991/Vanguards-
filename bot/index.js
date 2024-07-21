require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content.startsWith('!joinraid')) {
        const raidName = message.content.split(' ')[1];

        const response = await fetch('http://localhost:3000/api/raids');
        const raids = await response.json();
        const raid = raids.find(r => r.name === raidName);

        if (raid) {
            // Implement logic to join the raid
            message.channel.send(`You have joined the raid: ${raid.name}`);
        } else {
            message.channel.send(`Raid ${raidName} not found.`);
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = client;

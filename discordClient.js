const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('Discord bot logged in'))
    .catch(err => console.error('Error logging in Discord bot:', err));

module.exports = client;

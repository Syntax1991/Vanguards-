const { Client, GatewayIntentBits, Partials, InteractionType } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.on('interactionCreate', async interaction => {
    if (interaction.type !== InteractionType.MessageComponent) return;

    const [action, raidId] = interaction.customId.split('_');
    console.log(`Action: ${action}, Raid ID: ${raidId}`);

    if (!raidId) return interaction.reply({ content: 'Invalid Raid ID', ephemeral: true });

    switch (action) {
        case 'role_select':
            // Handle role selection
            // interaction.values[0] will contain the selected role
            console.log(`Selected Role: ${interaction.values[0]}`);
            break;
        case 'class_select':
            // Handle class selection
            // interaction.values[0] will contain the selected class
            console.log(`Selected Class: ${interaction.values[0]}`);
            break;
        case 'status_select':
            // Handle status selection
            // interaction.values[0] will contain the selected status
            console.log(`Selected Status: ${interaction.values[0]}`);
            break;
        case 'sign_in':
            // Handle sign in button click
            console.log(`Signing in for Raid ID: ${raidId}`);
            break;
        case 'alts':
            // Handle alts button click
            console.log(`Opening alts modal for Raid ID: ${raidId}`);
            break;
        case 'unregister':
            // Handle unregister button click
            console.log(`Unregistering for Raid ID: ${raidId}`);
            break;
        default:
            console.log(`Unknown action: ${action}`);
    }

    interaction.reply({ content: `Action received: ${action}`, ephemeral: true });
});

client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('Discord bot logged in'))
    .catch(err => console.error('Error logging in Discord bot:', err));

module.exports = client;

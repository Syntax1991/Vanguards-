require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const client = require('./discordClient');
const { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const app = express();
const PORT = 3000;

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const raidSchema = new mongoose.Schema({
    date: String,
    time: String,
    raidLeader: String,
    location: String,
    difficulty: String,
    type: String,
    participants: [{
        userId: String,
        klasse: String,
        rolle: String,
        status: String
    }]
});

const Raid = mongoose.model('Raid', raidSchema);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/create-raid', async (req, res) => {
    const { date, time, raidLeader, location, difficulty, type } = req.body;

    const newRaid = new Raid({
        date,
        time,
        raidLeader,
        location,
        difficulty,
        type
    });

    try {
        const savedRaid = await newRaid.save();

        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) {
            console.error('Guild not found. GUILD_ID:', process.env.GUILD_ID);
            return res.status(404).send('Guild not found');
        }

        const channel = await guild.channels.create({
            name: `${location}-${difficulty}-${date}`,
            type: ChannelType.GuildText,
            topic: `Raid: ${location} - ${date} ${time}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                    deny: [PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`📅 New Raid Created: ${location}`)
            .setDescription(`**Date:** ${date}\n**Time:** ${time}\n**Raid Leader:** <@${raidLeader}>\n**Location:** ${location}\n**Difficulty:** ${difficulty}\n**Type:** ${type}`)
            .addFields(
                { name: '📋 Summary', value: `**Date:** ${date}\n**Time:** ${time}\n**Raid Leader:** <@${raidLeader}>\n**Location:** ${location}\n**Difficulty:** ${difficulty}\n**Type:** ${type}`, inline: false },
                { name: '📊 Participants', value: 'No participants yet.', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Use the selections below to sign up!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`class_${savedRaid._id}`)
                    .setPlaceholder('Select your class')
                    .addOptions([
                        { label: 'Warrior', value: 'Warrior' },
                        { label: 'Mage', value: 'Mage' },
                        { label: 'Druid', value: 'Druid' },
                        // add more options as needed
                    ]),
                new StringSelectMenuBuilder()
                    .setCustomId(`role_${savedRaid._id}`)
                    .setPlaceholder('Select your role')
                    .addOptions([
                        { label: 'Tank', value: 'Tank' },
                        { label: 'Healer', value: 'Healer' },
                        { label: 'DPS', value: 'DPS' },
                        // add more options as needed
                    ]),
                new StringSelectMenuBuilder()
                    .setCustomId(`status_${savedRaid._id}`)
                    .setPlaceholder('Select your status')
                    .addOptions([
                        { label: 'Saved', value: 'saved' },
                        { label: 'Unsaved', value: 'unsaved' }
                    ])
            );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`sign_in_${savedRaid._id}`)
                    .setLabel('Sign In')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`alts_${savedRaid._id}`)
                    .setLabel('Alts')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`sign_out_${savedRaid._id}`)
                    .setLabel('Sign Out')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ embeds: [embed], components: [row, buttonRow] });

        res.status(201).send(savedRaid);
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
});

app.get('/api/raids', async (req, res) => {
    try {
        const raids = await Raid.find();
        res.send(raids);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.get('/api/raids/:id', async (req, res) => {
    try {
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');
        res.send(raid);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.put('/api/raids/:id', async (req, res) => {
    try {
        const { date, time, raidLeader, location, difficulty, type } = req.body;
        const updatedRaid = await Raid.findByIdAndUpdate(req.params.id, {
            date,
            time,
            raidLeader,
            location,
            difficulty,
            type
        }, { new: true });

        if (!updatedRaid) return res.status(404).send('Raid not found');
        res.send(updatedRaid);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.put('/api/raids/:id/add-participant', async (req, res) => {
    try {
        const { name, role, status } = req.body;
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');

        raid.participants.push({ name, role, status });
        await raid.save();

        res.send(raid);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.put('/api/raids/:id/remove-participant', async (req, res) => {
    try {
        const { name } = req.body;
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');

        raid.participants = raid.participants.filter(p => p.name !== name);
        await raid.save();

        res.send(raid);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.get('/api/raid-leaders', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) {
            console.error('Guild not found. GUILD_ID:', process.env.GUILD_ID);
            return res.status(404).send('Guild not found');
        }

        const role = guild.roles.cache.find(r => r.name === 'Raidleader');
        if (!role) {
            console.error('Role not found');
            return res.status(404).send('Role not found');
        }

        console.log(`Role found: ${role.name}`);

        const membersWithRole = role.members.map(member => ({
            id: member.user.id,
            username: member.user.username
        }));

        console.log('Members with role:', membersWithRole);

        res.send(membersWithRole);
    } catch (err) {
        console.error('Error fetching raid leaders:', err);
        res.status(500).send(err);
    }
});

app.get('/raid/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'raid.html'));
});

app.get('*', (req, res) => {
    res.redirect('/');
});

app.put('/api/raids/:id/signup', async (req, res) => {
    try {
        const { userId, klasse, rolle, status } = req.body;
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');

        const participantExists = raid.participants.some(p => p.userId === userId);
        if (participantExists) {
            return res.status(400).send('User already signed up');
        }

        raid.participants.push({ userId, klasse, rolle, status });
        await raid.save();

        res.send(raid);
    } catch (err) {
        res.status(400).send(err);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isSelectMenu() && !interaction.isButton()) return;

        const [action, raidId] = interaction.customId.split('_');
        console.log(`Interaction received: ${interaction.customId}`);
        console.log(`Action: ${action}, Raid ID: ${raidId}`);

        const raid = await Raid.findById(raidId);
        if (!raid) {
            return interaction.reply({ content: 'Invalid Raid ID', ephemeral: true });
        }

        if (interaction.isSelectMenu()) {
            if (action === 'class') {
                const selectedClass = interaction.values[0];
                interaction.reply({ content: `Class selected: ${selectedClass}`, ephemeral: true });
            } else if (action === 'role') {
                const selectedRole = interaction.values[0];
                interaction.reply({ content: `Role selected: ${selectedRole}`, ephemeral: true });
            } else if (action === 'status') {
                const selectedStatus = interaction.values[0];
                interaction.reply({ content: `Status selected: ${selectedStatus}`, ephemeral: true });
            }
        } else if (interaction.isButton()) {
            if (action === 'sign_in') {
                interaction.reply({ content: 'You have signed in!', ephemeral: true });
            } else if (action === 'alts') {
                interaction.reply({ content: 'Alt characters registered.', ephemeral: true });
            } else if (action === 'sign_out') {
                interaction.reply({ content: 'You have signed out!', ephemeral: true });
            } else {
                interaction.reply({ content: 'Unknown action', ephemeral: true });
            }
        }
    } catch (err) {
        console.error('Error processing interaction:', err);
        interaction.reply({ content: 'There was an error processing your selection.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

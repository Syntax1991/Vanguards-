require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const client = require('./discordClient');
const { PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        name: String,
        role: String,
        status: String,
        class: String
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

        const embed = {
            color: 0x0099ff,
            title: `📅 New Raid Created: ${location}`,
            description: `**Date:** ${date}\n**Time:** ${time}\n**Raid Leader:** <@${raidLeader}>\n**Location:** ${location}\n**Difficulty:** ${difficulty}\n**Type:** ${type}`,
            fields: [
                {
                    name: '📋 Summary',
                    value: `**Date:** ${date}\n**Time:** ${time}\n**Raid Leader:** <@${raidLeader}>\n**Location:** ${location}\n**Difficulty:** ${difficulty}\n**Type:** ${type}`,
                    inline: false
                },
                {
                    name: '📊 Participants',
                    value: 'No participants yet.',
                    inline: false
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Use the dropdowns below to sign up!',
            },
        };

        const roleOptions = [
            { label: 'Tank', value: 'Tank' },
            { label: 'Healer', value: 'Healer' },
            { label: 'DPS', value: 'DPS' }
        ];

        const classOptions = [
            { label: 'Death Knight', value: 'Death Knight' },
            { label: 'Demon Hunter', value: 'Demon Hunter' },
            { label: 'Druid', value: 'Druid' },
            { label: 'Hunter', value: 'Hunter' },
            { label: 'Mage', value: 'Mage' },
            { label: 'Monk', value: 'Monk' },
            { label: 'Paladin', value: 'Paladin' },
            { label: 'Priest', value: 'Priest' },
            { label: 'Rogue', value: 'Rogue' },
            { label: 'Shaman', value: 'Shaman' },
            { label: 'Warlock', value: 'Warlock' },
            { label: 'Warrior', value: 'Warrior' }
        ];

        const statusOptions = [
            { label: 'Unsaved', value: 'Unsaved' },
            { label: 'Saved', value: 'Saved' }
        ];

        const roleRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`role_select_${savedRaid._id}`)
                    .setPlaceholder('Select Role')
                    .addOptions(roleOptions)
            );

        const classRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`class_select_${savedRaid._id}`)
                    .setPlaceholder('Select Class')
                    .addOptions(classOptions)
            );

        const statusRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`status_select_${savedRaid._id}`)
                    .setPlaceholder('Select Status')
                    .addOptions(statusOptions)
            );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`sign_in_${savedRaid._id}`)
                    .setLabel('Sign In')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`alts_${savedRaid._id}`)
                    .setLabel('Alts')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`unregister_${savedRaid._id}`)
                    .setLabel('Unregister')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ embeds: [embed], components: [roleRow, classRow, statusRow, buttonRow] });

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
        const { name, role, status, class: className } = req.body;
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');

        raid.participants.push({ name, role, status, class: className });
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

        // Fetch all members of the guild
        const members = await guild.members.fetch();
        console.log('All guild members:', members.map(member => member.user.username));

        const membersWithRole = role.members.map(member => ({
            id: member.user.id,
            username: member.user.username
        }));

        console.log('Members with role:', membersWithRole);  // Debugging-Ausgabe

        res.send(membersWithRole);
    } catch (err) {
        console.error('Error fetching raid leaders:', err);
        res.status(500).send(err);
    }
});

app.get('/raid/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'raid-details.html'));
});

app.get('*', (req, res) => {
    res.redirect('/');
});

app.put('/api/raids/:id/signup', async (req, res) => {
    try {
        const { userId, klasse, rolle, status } = req.body;  // Benutzer-ID, Klasse, Rolle und Status des Teilnehmers
        const raid = await Raid.findById(req.params.id);
        if (!raid) return res.status(404).send('Raid not found');

        // Überprüfe, ob der Benutzer bereits angemeldet ist
        const participantExists = raid.participants.some(p => p.userId === userId);
        if (participantExists) {
            return res.status(400).send('User already signed up');
        }

        // Füge den Teilnehmer hinzu
        raid.participants.push({ userId, klasse, rolle, status });
        await raid.save();

        res.send(raid);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

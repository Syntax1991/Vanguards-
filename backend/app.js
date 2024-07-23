require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const client = require('./discordClient');
const { PermissionsBitField, ChannelType } = require('discord.js');
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
        status: String
    }]
});

const Raid = mongoose.model('Raid', raidSchema);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

client.once('ready', async () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);

    const guilds = client.guilds.cache.map(guild => ({ id: guild.id, name: guild.name }));
    console.log('Available guilds:', guilds);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.error('Guild not found. GUILD_ID:', process.env.GUILD_ID);
    } else {
        console.log(`Guild found: ${guild.name}`);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN)
    .catch(err => console.error('Error logging in Discord bot:', err));

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
                text: 'Use the reactions below to sign up!',
            },
        };

        await channel.send({ embeds: [embed] });

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
    res.sendFile(path.join(__dirname, '../frontend', 'raid.html'));
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

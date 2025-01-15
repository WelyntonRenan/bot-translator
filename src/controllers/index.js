const fs = require('fs');
const path = require('path');
const db = require('../database');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const bot = new TelegramBot(BOT_TOKEN);

const channelsFilePath = path.join(__dirname, '../channels.json');

const readChannelsConfig = () => {
    const data = fs.readFileSync(channelsFilePath, 'utf8');
    return JSON.parse(data);
};

const writeChannelsConfig = (config) => {
    fs.writeFileSync(channelsFilePath, JSON.stringify(config, null, 4), 'utf8');
};

let CHANNEL_CONFIGS = readChannelsConfig();

const renderIndex = (req, res) => {
    db.all('SELECT * FROM child_channels', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar canais:', err);
            res.status(500).send('Erro ao buscar canais');
            return;
        }
        const channels = {};
        rows.forEach(row => {
            channels[row.id] = {
                language: row.language,
                voice_id: row.voice_id,
                tutorial_link: row.tutorial_link,
                account_creation_link: row.account_creation_link,
                support_user: row.support_user
            };
        });

        db.get('SELECT * FROM master_group WHERE id = ?', [process.env.GROUP_MASTER_ID], (err, masterGroup) => {
            if (err) {
                console.error('Erro ao buscar grupo mestre:', err);
                res.status(500).send('Erro ao buscar grupo mestre');
                return;
            }
            res.render('index', { title: 'Canais do Bot', channels, masterGroup });
        });
    });
};

const getChannels = (req, res) => {
    db.all('SELECT * FROM child_channels', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar canais:', err);
            res.status(500).send('Erro ao buscar canais');
            return;
        }
        const channels = {};
        rows.forEach(row => {
            channels[row.id] = {
                language: row.language,
                voice_id: row.voice_id,
                tutorial_link: row.tutorial_link,
                account_creation_link: row.account_creation_link,
                support_user: row.support_user
            };
        });
        res.json(channels);
    });
};

const addChannel = (req, res) => {
    const { channelId, language, voice_id, tutorial_link, account_creation_link, support_user } = req.body;
    console.log('Adding channel:', { channelId, language, voice_id, tutorial_link, account_creation_link, support_user });
    db.run(
        'INSERT INTO child_channels (id, language, voice_id, tutorial_link, account_creation_link, support_user) VALUES (?, ?, ?, ?, ?, ?)',
        [channelId, language, voice_id, tutorial_link, account_creation_link, support_user],
        (err) => {
            if (err) {
                console.error('Erro ao adicionar canal:', err);
                res.status(500).send('Erro ao adicionar canal');
                return;
            }
            res.json({ success: true });
        }
    );
};

const editChannel = (req, res) => {
    const { channelId, language, voice_id, tutorial_link, account_creation_link, support_user } = req.body;
    console.log('Editing channel:', { channelId, language, voice_id, tutorial_link, account_creation_link, support_user });
    db.run(
        'UPDATE child_channels SET language = ?, voice_id = ?, tutorial_link = ?, account_creation_link = ?, support_user = ? WHERE id = ?',
        [language, voice_id, tutorial_link, account_creation_link, support_user, channelId],
        function(err) {
            if (err) {
                console.error('Erro ao editar canal:', err);
                res.status(500).send('Erro ao editar canal');
                return;
            }
            console.log(`Rows updated: ${this.changes}`);
            res.json({ success: true });
        }
    );
};

const removeChannel = (req, res) => {
    const { channelId } = req.params;
    console.log('Removing channel with ID:', channelId);
    db.run('DELETE FROM child_channels WHERE id = ?', [channelId], (err) => {
        if (err) {
            console.error('Erro ao remover canal:', err);
            res.status(500).send('Erro ao remover canal');
            return;
        }
        res.json({ success: true });
    });
};

const editMasterGroup = (req, res) => {
    const { language, voice_id, tutorial_link, account_creation_link, support_user } = req.body;
    console.log('Editing master group:', { language, voice_id, tutorial_link, account_creation_link, support_user });
    db.run(
        'UPDATE master_group SET language = ?, voice_id = ?, tutorial_link = ?, account_creation_link = ?, support_user = ? WHERE id = ?',
        [language, voice_id, tutorial_link, account_creation_link, support_user, process.env.GROUP_MASTER_ID],
        (err) => {
            if (err) {
                console.error('Erro ao editar grupo mestre:', err);
                res.status(500).send('Erro ao editar grupo mestre');
                return;
            }
            res.json({ success: true });
        }
    );
};

module.exports = {
    renderIndex,
    getChannels,
    addChannel,
    editChannel,
    removeChannel,
    editMasterGroup
};

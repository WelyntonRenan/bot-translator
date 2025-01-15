const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
require('dotenv').config();

const BOT_TOKEN = '7769694986:AAGDBgB3dckSDRlXl7Z_e6oXNCYRFvmvXak';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Arquivo para armazenar os grupos
const groupsFilePath = './groups.json';

// Função para salvar grupos no arquivo
const saveGroups = (groups) => {
    fs.writeFileSync(groupsFilePath, JSON.stringify(groups, null, 2));
};

// Carregar grupos do arquivo ou criar novo
const loadGroups = () => {
    if (fs.existsSync(groupsFilePath)) {
        return JSON.parse(fs.readFileSync(groupsFilePath, 'utf-8'));
    }
    return {};
};

let groups = loadGroups();

// Capturar evento quando o bot é adicionado a um grupo
bot.on('message', (msg) => {
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const groupId = msg.chat.id;
        const groupName = msg.chat.title;

        if (!groups[groupId]) {
            groups[groupId] = { id: groupId, name: groupName };
            saveGroups(groups);

            console.log(`[INFO] Bot adicionado ao grupo: ${groupName} (${groupId})`);
            bot.sendMessage(groupId, `Olá, grupo ${groupName}! Agora estou ativo aqui.`);
        }
    }
});

// Comando para listar os grupos
bot.onText(/\/listargrupos/, (msg) => {
    if (msg.chat.type === 'private') {
        const groupList = Object.values(groups)
            .map((group) => `• ${group.name} (${group.id})`)
            .join('\n');

        bot.sendMessage(msg.chat.id, `Grupos registrados:\n\n${groupList}`);
    }
});

console.log('[INFO] Bot iniciado e aguardando mensagens...');

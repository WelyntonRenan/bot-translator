// filepath: src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Tabela para o grupo mestre
    db.run(`
        CREATE TABLE IF NOT EXISTS master_group (
            id TEXT PRIMARY KEY,
            language TEXT,
            voice_id TEXT,
            tutorial_link TEXT,
            account_creation_link TEXT,
            support_user TEXT
        )
    `);

    // Tabela para canais filhos
    db.run(`
        CREATE TABLE IF NOT EXISTS child_channels (
            id TEXT PRIMARY KEY,
            language TEXT,
            voice_id TEXT,
            tutorial_link TEXT,
            account_creation_link TEXT,
            support_user TEXT
        )
    `);

    // Tabela para tokens
    db.run(`
        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT
        )
    `);
});

module.exports = db;
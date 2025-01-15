// filepath: src/app.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const routes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json()); // Middleware para processar JSON
app.use('/', routes);

app.listen(PORT, () => {
    console.log(`[INFO] Servidor rodando na porta ${PORT}`);
});
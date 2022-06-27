const express = require('express');
const app = express();
const server = require('http').createServer(app);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
var path = require('path');

const config = require('./config');

const model = require('./models/user');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    cors({
        credentials: true,
        origin: 'http://localhost:3000',
    }),
);
app.use(fileUpload({ limits: { fileSize: 1024 * 1024 * 1024 } }));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Передаем обработку запросов указанным маршрутам
require(`./socket`).init(server);
require('./routes/http')(app);

// На служебный запрос отправляем заголовки
app.options('*', (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.set('Access-Control-Allow-Credentials', true);
    res.set('Access-Control-Max-Age', 86400);
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set(
        'Access-Control-Allow-Headers',
        'Origin,Content-Type,X-Auth-Token,Authorization',
    );
    res.status(200).end();
});

// На левый запрос отправляем ошибку
app.all(config.server.prefix + '/*', (req, res) => {
    console.log('Левый запрос', req.method + '\n' + req.originalUrl);
    res.status(404).end();
});

// сбрасываем онлайн у всех перед перезапуском
const update_online = async () => {
    await model.update_online(false, null, false, 'pullall');
};

server.listen(
    config.server.port,
    (_) => console.log('Сервер запущен на порте ' + config.server.port),
    update_online(),
);

const config = require('../../config');
const controller = require('../../controllers/http/file');
const request = require('../../lib/request');

module.exports = (app, section) => {
    app.post(
        config.server.prefix + '/file',
        request.receive(),
        controller.upload,
    );
};

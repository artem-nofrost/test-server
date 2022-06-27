const uuid = require('uuid').v4;

const upload = (req, res) => {
    if (!req.files || !req.files.file)
        return res.send({ error: 'Файл должен быть формата jpeg или png!' });

    let file = req.files.file;

    // Проверяем тип файла
    if (!/image\/(jpe?g|png)/.test(file.mimetype)) {
        return res
            .status(406)
            .send({ error: 'Файл должен быть формата jpeg или png!' });
    }

    // Сохраняем файл по указанному адресу
    const fileName = uuid() + file.name.slice(file.name.indexOf('.'));
    file.mv('images/' + fileName, (err) => {
        if (err) {
            return res.status(500).send({ error: 'internal' });
        }
        res.send({ response: '/images/' + fileName });
    });
};

exports.upload = upload;

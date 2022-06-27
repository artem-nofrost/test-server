const ObjectID = require('mongodb').ObjectID;
const model = require('../../models/user');
const log = require('../../lib/log');

// // Получение списка
const list = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    let userId;
    if (!refreshToken) {
        res.status(404).send({ error: 'user_not_found' });
        return;
    } else {
        const [err, user] = await model.find({ refresh_token: refreshToken });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        userId = user._id;
    }

    let data = req.query.search; // получаем строку
    if (data === undefined) {
        data = '';
    }
    let limitedData = []; // объект с данными найденных пользователей
    let dataLength = 0; // количество найденных пользователей
    let limit = 8;

    [err, dataLength, limitedData] = await model.load({
        where: {
            fname: {
                $regex: '.*' + data + '.*',
                $options: 'i',
            },
            _id: { $ne: userId },
        },
        firstName: data === '' ? '.' : data,
        limit: limit,
        skip: 0,
    });
    if (err) {
        log('internal', err);
        res.status(500).send({ error: 'internal' });
        return;
    }
    res.send({ response: [limitedData, dataLength] });
};

const load_more = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    let userId;
    if (!refreshToken) {
        res.status(404).send({ error: 'user_not_found' });
        return;
    } else {
        const [err, user] = await model.find({ refresh_token: refreshToken });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        userId = user._id;
    }

    let { searchParam, skip } = req.body; // получаем строку

    if (searchParam === undefined) {
        searchParam = '';
    }

    let limitedData = []; // объект с данными найденных пользователей
    let limit = 8;

    [err, limitedData] = await model.load_more({
        where: {
            fname: {
                $regex: '.*' + searchParam + '.*',
                $options: 'i',
            },
            _id: { $ne: userId },
        },
        firstName: data === '' ? '.' : data,
        limit: limit,
        skip: skip,
    });
    if (err) {
        log('internal', err);
        res.status(500).send({ error: 'internal' });
        return;
    }

    res.send({ response: limitedData });
};

const get_current_user = async (req, res) => {
    const id = req.body.id;
    if (ObjectID.isValid(req.body.id)) {
        let [err, user] = await model.find({ _id: new ObjectID(id) });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        res.send({ response: user });
    } else {
        res.status(404).send({ error: 'user_not_found' });
    }
};

module.exports = {
    list,
    load_more,
    get_current_user,
};

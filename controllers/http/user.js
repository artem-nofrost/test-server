const model = require('../../models/user');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config').user;
const log = require('../../lib/log');

const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.access_secret_key, {
        expiresIn: '30m',
    });
};

const validateRefreshToken = async (token) => {
    try {
        const data = jwt.verify(token, config.refresh_secret_key);
        return [null, data];
    } catch (err) {
        return [err];
    }
};

const validateAccessToken = async (token) => {
    try {
        const data = jwt.verify(token, config.access_secret_key);
        return [null, data];
    } catch (err) {
        return [err];
    }
};

// добавляем пользователя и токены
const add = async (req, res) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
        const { email } = req.body;
        const [err, user] = await model.find({ email: email });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        if (user) {
            const valError = 'Пользователь с таким email уже существует';
            res.send({ errorData: valError });
        } else {
            const hashedPass = await hashIt(req.body.password);
            const new_user = {
                fname: req.body.fname,
                date: req.body.date,
                gender: req.body.gender,
                email: req.body.email,
                password: hashedPass,
                avatarUrl: req.body.avatarUrl,
            };
            // создаём пользователя и добавляем в базу данных
            const data_user = model.create(new_user);
            const [err] = await model.add(data_user);
            if (err) {
                log('internal', err);
                res.status(500).send({ error: 'internal' });
                return;
            }

            const user = {
                ...new_user,
                access_token: generateAccessToken({ email: new_user.email }),
            };
            res.cookie('refresh_token', data_user.refresh_token, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
            });
            res.send({ response: user });
        }
    } else {
        const valError = valResult.errors[0].msg;
        res.send({ errorData: valError });
    }
};

// Получение пользователя для проверки перед логинизацией
const get = async (req, res) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
        const { email, password } = req.body;
        const [err, user] = await model.find({ email: email });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        if (user) {
            const comparePass = await compareIt(password, user.password);
            if (comparePass) {
                let [err, newRefreshToken] = await model.update_refresh(email, {
                    email: email,
                });
                if (err) {
                    log('internal', err);
                    res.status(500).send({ error: 'internal' });
                    return;
                }

                const new_user = {
                    fname: user.fname,
                    date: user.date,
                    gender: user.gender,
                    email: user.email,
                    password: user.password,
                };

                const editionUser = {
                    ...new_user,
                    access_token: generateAccessToken({ email: user.email }),
                };
                res.cookie('refresh_token', newRefreshToken, {
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                });
                res.send({ response: editionUser });
            } else {
                const valError = 'Неверный пароль или email';
                res.send({ errorData: valError });
            }
        } else {
            const valError = 'Неверный пароль или email';
            res.send({ errorData: valError });
        }
    } else {
        const valError = valResult.errors[0].msg;
        res.send({ errorData: valError });
    }
};

// Проверка пользователя на авторизированность
const confirm = async (req, res) => {
    const authHeader = req.headers.authorization; // получаем аксесс токен
    const accessToken = authHeader.split(' ')[1];
    const [errAccess, data] = await validateAccessToken(accessToken);
    // если аксесс токен не устарел
    if (data) {
        const [err, user] = await model.find({ email: data.email });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
        }
        if (user) {
            let [err, newRefreshToken] = await model.update_refresh(
                user.email,
                {
                    email: user.email,
                },
            );
            if (err) {
                log('internal', err);
                res.status(500).send({ error: 'internal' });
            }
            const new_user = {
                id: user._id,
                fname: user.fname,
                date: user.date,
                gender: user.gender,
                email: user.email,
                password: user.password,
            };

            const editionUser = {
                ...new_user,
                access_token: generateAccessToken({ email: user.email }),
            };
            res.cookie('refresh_token', newRefreshToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
            });
            res.send({ response: editionUser });
        } else {
            res.status(404).send({ error: 'user_not_found' });
        }
    } else {
        // если токен(аксесс) устарел или неверный - проверяем рефреш токен
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            res.status(404).send({ error: 'user_not_found' });
        }
        const [errVal, data] = await validateRefreshToken(refreshToken);
        const [err, user] = await model.find({ email: data.email });
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
        }
        if (data && user) {
            let [err, newRefreshToken] = await model.update_refresh(
                user.email,
                {
                    email: user.email,
                },
            );
            if (err) {
                log('internal', err);
                res.status(500).send({ error: 'internal' });
            }

            const new_user = {
                id: user._id,
                fname: user.fname,
                date: user.date,
                gender: user.gender,
                email: user.email,
                password: user.password,
            };

            const editionUser = {
                ...new_user,
                access_token: generateAccessToken({ email: user.email }),
            };
            res.cookie('refresh_token', newRefreshToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
            });
            res.send({ response: editionUser });
        } else {
            res.status(404).send({ error: 'user_not_found' });
        }
    }
};

// Проверка пользователя на авторизированность
const out = async (req, res) => {
    // получаем рефреш токен
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
        res.status(404).send({ error: 'user_not_found' });
        return;
    }
    const [err, user] = await model.find({ refresh_token: refreshToken });
    if (err) {
        log('internal', err);
        res.status(500).send({ error: 'internal' });
        return;
    }
    if (user) {
        let email = user.email;
        let [err] = await model.delete_refresh(email);
        if (err) {
            log('internal', err);
            res.status(500).send({ error: 'internal' });
            return;
        }
        res.clearCookie('refresh_token');
        res.send({ response: 'Токен удалён' });
    } else {
        res.status(404).send({ error: 'user_not_found' });
    }
};

const valid_reg = [
    body('fname').notEmpty().withMessage('Укажите имя'),
    body('date')
        .not()
        .isEmpty()
        .withMessage('Укажите дату рождения')
        .isISO8601()
        .toDate()
        .withMessage('Некорректная дата рождения'),
    body('gender').notEmpty().withMessage('Укажите пол'),
    body('email')
        .notEmpty()
        .withMessage('Укажите Email')
        .isEmail()
        .withMessage('Некорректный Email'),
    body('password')
        .notEmpty()
        .withMessage('Укажите пароль')
        .custom((value) => !/\s/.test(value))
        .withMessage('Пароль не должен содержать пробелы')
        .isLength({ min: 8 })
        .withMessage('Используйте не менее 8 символов в пароле'),
];

const valid_login = [
    body('email')
        .notEmpty()
        .withMessage('Укажите Email')
        .isEmail()
        .withMessage('Некорректный Email'),
    body('password').notEmpty().withMessage('Укажите пароль'),
];

// хэшируем парарль
async function hashIt(password) {
    const saltRounds = 10;
    const hashedPass = await bcrypt.hash(password, saltRounds);

    return hashedPass;
}

// сравнение введенного пароля с хэшированным
async function compareIt(userPassword, hashedPassword) {
    const validPassword = await bcrypt.compare(userPassword, hashedPassword);
    return validPassword;
}

module.exports = {
    add,
    valid_reg,
    valid_login,
    get,
    confirm,
    out,
};

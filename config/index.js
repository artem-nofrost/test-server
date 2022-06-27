const v4 = require('uuid').v4;

module.exports = {
    server: {
        port: 7500,
        prefix: '/api',
        adresss: 'http://localhost',
    },
    db: {
        url: 'mongodb+srv://User22:aD5jBMdGVVeF3SpQ@cluster0.2wd4e.mongodb.net/Test1',
        name: 'Test1',
    },
    logs: {
        console: true,
        db: true,
    },
    user: {
        session: {
            formate_id: v4,
            duration: 1000 * 60 * 30,
        },
        access_secret_key: 'Test1_access564343',
        refresh_secret_key: 'Test1_refresh564343',
    },
};

require('dotenv').config();

module.exports = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || 'database_development',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432
    },
    test: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME + '_test' || 'database_test',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432
    },
    production: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME + '_prod' || 'database_production',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432
    }
};
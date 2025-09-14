'use strict';

const Sequelize = require('sequelize');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../sequelize.config.js')[env];

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const models = require('./models')(sequelize, Sequelize.DataTypes);

const db = {
    ...models,
    sequelize,
    Sequelize,
};

module.exports = db;
import tApi from 'node-telegram-bot-api';
import { Sequelize } from 'sequelize';

import { TZ } from '@src/constants';

import config from '../config';

const { PORT, HOST, DB_PASSWORD, DB_USERNAME, DB_NAME, TOKEN } = config;

export const bot = new tApi(TOKEN, { polling: true });

export const db = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
    host: HOST,
    port: PORT || 5432,
    dialect: 'postgres',
    timezone: TZ,
});

export async function initDB() {
    try {
        await db.authenticate();
        await db.sync();
    } catch (e) {
        console.log(e);
    }
}

export * from './queries';

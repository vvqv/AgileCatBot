import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../config/config.env') });

interface Config {
    NAME: string;
    TOKEN: string;
    DB_NAME: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    HOST: string;
    PORT: number;
    AGENDA_DB_HOST: string;
    AGENDA_DB_NAME: string;
    AGENDA_DB_USER: string;
    AGENDA_DB_PASS: string;
    ENCRYPTION_PRIVATE_KEY: string;
    ENCRYPTION_IV: string;
}

const getConfig = (): Partial<Config> => {
    return {
        NAME: process.env.NAME,
        TOKEN: process.env.TOKEN,
        DB_NAME: process.env.DB_NAME,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        HOST: process.env.HOST,
        PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
        AGENDA_DB_HOST: process.env.AGENDA_DB_HOST,
        AGENDA_DB_NAME: process.env.AGENDA_DB_NAME,
        AGENDA_DB_USER: process.env.AGENDA_DB_USER,
        AGENDA_DB_PASS: process.env.AGENDA_DB_PASS,
        ENCRYPTION_PRIVATE_KEY: process.env.ENCRYPTION_PRIVATE_KEY,
        ENCRYPTION_IV: process.env.ENCRYPTION_IV,
    };
};

const getSanitizedConfig = (config: Partial<Config>): Config => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
            throw new Error(`Missing key ${key} in config.env`);
        }
    }
    return config as Config;
};

const config = getConfig();

const sanitizedConfig = getSanitizedConfig(config);

export default sanitizedConfig;

declare namespace NodeJS {
    interface ProcessEnv {
        NAME: string;
        TOKEN: string;
        DB_NAME: string;
        DB_USERNAME: string;
        DB_PASSWORD: string;
        HOST: string;
        PORT: number;
        AGENDA_DB_NAME: string;
        AGENDA_DB_USER: string;
        AGENDA_DB_PASS: string;
        ENCRYPTION_PRIVATE_KEY: string;
        ENCRYPTION_IV: string;
    }
}

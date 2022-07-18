declare namespace NodeJS {
    interface ProcessEnv {
        NAME: string;
        TOKEN: string;
        DB_NAME: string;
        DB_USERNAME: string;
        DB_PASSWORD: string;
        HOST: string;
        PORT: string;
        TEAMS: string;
    }
}

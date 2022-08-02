import React from 'react';
import { Provider } from 'react-redux';

import { render, Root } from '@urban-bot/core';
import { UrbanBotTelegram } from '@urban-bot/telegram';

import { store } from '@reducers/store';
import { initDB } from '@src/db';
import { RootApp } from '@src/RootApp';

import config from './config';

const urbanBotTelegram = new UrbanBotTelegram({
    token: config.TOKEN,
    isPolling: true,
});

(async function () {
    await initDB();
    // await restoreJobs();
})();

render(
    <Root bot={urbanBotTelegram}>
        <Provider store={store}>
            <RootApp />
        </Provider>
    </Root>
);

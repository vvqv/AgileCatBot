import React from 'react';

import { Route, Router, useBotContext, useCommand } from '@urban-bot/core';

import { coreActions } from '@reducers/core';
import { useDispatch } from '@reducers/store';
import { MainMenu } from '@src/components';
import { ERRORS } from '@src/constants';
import { isDefined } from '@src/utils';

import { TeamsInfo } from '@components/TeamsInfo';

export function RootApp() {
    const { bot } = useBotContext();

    const dispatch = useDispatch();

    useCommand(({ chat, from }) => {
        const userId = from.id;
        const name = from.username;

        if (!isDefined(userId)) {
            return bot.sendMessage({
                chat,
                data: { text: ERRORS.unavailableUserId },
                nodeName: 'urban-text',
            });
        }

        if (!isDefined(name)) {
            return bot.sendMessage({
                chat,
                data: { text: ERRORS.pleaseSetNickName },
                nodeName: 'urban-text',
            });
        }

        dispatch(coreActions.setUserInfo({ name, userId }));
    });

    return (
        <Router withInitializeCommands>
            <Route path="/start">
                <MainMenu />
            </Route>
            <Route path="/info">
                <TeamsInfo />
            </Route>
        </Router>
    );
}

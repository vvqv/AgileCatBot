import { getAvailableUserChats } from '@api/chats';
import { getUserTeamInfo } from '@api/user';
import { Team } from '@db/types';
import { PayloadAction } from '@reduxjs/toolkit';
import { ApiResponse } from '@src/models';
import { isNotNil } from '@src/utils';
import TelegramBot from 'node-telegram-bot-api';
import { SagaIterator } from 'redux-saga';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import { coreActions, coreSelectors, CoreState } from './index';

export function* getUserAvailableChatsSage({ payload }: PayloadAction<{ userId: string }>) {
    const response: ApiResponse<TelegramBot.Chat[]> = yield call(
        getAvailableUserChats,
        payload.userId
    );

    if (isNotNil(response.data)) {
        const isSingleChat = response.data.length === 1;

        yield put(coreActions.getUserAvailableChatsSuccess(response.data));

        yield isSingleChat && put(coreActions.setActiveChat(response.data[0]));
    }

    if (isNotNil(response.error)) {
        yield put(coreActions.getUserAvailableChatsFailure(response.error));
    }
}

export function* getUserPermissionsSage() {
    const userInfo: CoreState['user'] = yield select(coreSelectors.getUserInfo);

    const { active }: CoreState['chats'] = yield select(coreSelectors.getUserChatsInfo);

    const response: ApiResponse<Team> = yield call(getUserTeamInfo, {
        userId: userInfo.data?.userId,
        chatId: `${active?.id}`,
    });

    if (isNotNil(response.data)) {
        yield put(coreActions.getUserTeamSuccess(response.data));
    }

    if (isNotNil(response.error)) {
        yield put(coreActions.getUserAvailableChatsFailure(response.error));
    }
}

export function* watchCoreServices(): SagaIterator {
    yield takeEvery(coreActions.getUserAvailableChatsRequest.type, getUserAvailableChatsSage);
    yield takeEvery(coreActions.getUserTeamRequest.type, getUserPermissionsSage);
}

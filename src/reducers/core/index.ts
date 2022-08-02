import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TeamInfo, UserInfo } from '@src/models';
import { PropertiesTypes } from '@src/utils';
import TelegramBot from 'node-telegram-bot-api';

import { RootState } from '../index';

export type CoreActionTypes = ReturnType<PropertiesTypes<typeof coreActions>>;

export type CoreState = {
    isLoading: boolean;
    licenseInfo: {
        isValid: boolean;
        validUntil?: Date;
    };
    chats: {
        available: TelegramBot.Chat[];
        active?: TelegramBot.Chat;
    };
    user: {
        data: UserInfo | null;
        team: TeamInfo | null;
    };
    error: string | null;
};

export const initialState: CoreState = {
    isLoading: false,
    licenseInfo: {
        isValid: false,
    },
    chats: {
        available: [],
    },
    user: {
        data: null,
        team: null,
    },
    error: null,
};

export const coreSlice = createSlice({
    name: 'core',
    initialState,
    reducers: {
        clearErrors: (state) => state,
        getLicenseInfoRequest: (state) => {
            return { ...state };
        },
        getUserAvailableChatsRequest: (state, _action: PayloadAction<{ userId: string }>) => {
            state.isLoading = true;

            return state;
        },
        getUserAvailableChatsSuccess: (state, { payload }: PayloadAction<TelegramBot.Chat[]>) => {
            state.chats.available = payload;
            state.isLoading = false;

            return state;
        },
        getUserAvailableChatsFailure: (state, { payload }: PayloadAction<string>) => {
            state.error = payload;
            state.isLoading = false;

            return state;
        },

        getUserTeamRequest: (state) => {
            state.isLoading = true;

            return state;
        },

        getUserTeamSuccess: (state, { payload }: PayloadAction<TeamInfo>) => {
            state.user.team = payload;
            state.isLoading = false;

            return state;
        },

        getUserTeamFailure: (state, { payload }: PayloadAction<string>) => {
            state.error = payload;
            state.isLoading = false;

            return state;
        },

        setActiveChat: (state, { payload }: PayloadAction<TelegramBot.Chat>) => {
            state.chats.active = payload;

            return state;
        },

        setUserInfo: (state, { payload }: PayloadAction<UserInfo>) => {
            state.user.data = payload;

            return state;
        },
    },
});

export const coreActions = {
    ...coreSlice.actions,
};

export const coreSelectors = {
    getLicenseInfo: (state: RootState) => state.core.licenseInfo,
    getCurrentSystemInfo: (state: RootState) => {
        return {
            isLoading: state.core.isLoading,
            error: state.core.error,
        };
    },
    getUserChatsInfo: (state: RootState) => state.core.chats,
    getUserInfo: (state: RootState) => state.core.user,
};

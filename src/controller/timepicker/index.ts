import { ERRORS } from '@src/constants';
import { bot } from '@src/model';
import { getCallbackQueryData, idKeys } from '@src/utils';

import { WithGoTo } from '../navigation';

import { createControlButtons, createTimePickerButtons } from './buttons';
import {
    ActionsTypes,
    ChangeAction,
    TimeParts,
    TimeValues,
    transformTimeValues,
} from './timepicker';

export function createTimePicker({
    selectAction,
    changeAction,
    values,
    goTo,
}: {
    selectAction?: string;
    changeAction?: ChangeAction;
    values?: TimeValues;
} & WithGoTo) {
    const { keyboard, currentTime } = createTimePickerButtons({ values, changeAction });

    const controls = createControlButtons({ selectAction, currentTime, goTo });

    return [...keyboard, ...controls];
}

const payload: { action?: string } = {};

export async function selectTime({
    messageId,
    chatId,
    action,
    values,
    changeAction,
    goTo,
}: idKeys & { action?: string; values?: TimeValues; changeAction?: ChangeAction } & WithGoTo) {
    payload.action = action;
    const keyboard = createTimePicker({ values, selectAction: payload.action, changeAction, goTo });

    return await bot.editMessageReplyMarkup(
        {
            inline_keyboard: keyboard,
        },
        { message_id: messageId, chat_id: chatId }
    );
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    const isWrongButton = data?.includes('time_null');
    const shouldChangeValue = data?.includes('timepicker_change_values');
    const shouldClearValue = data?.includes('time_picker_clear');

    if (isWrongButton) {
        await bot.sendMessage(ids.userId, ERRORS.wrongCalendarDate);
    }

    if (shouldChangeValue) {
        const [, action, timePart, values] = data.split(' ');

        return await selectTime({
            ...ids,
            values: transformTimeValues(values),
            action: payload.action,
            changeAction: {
                part: timePart as TimeParts,
                type: action as ActionsTypes,
            },
            goTo: 'manage_notifications',
        });
    }

    if (shouldClearValue) {
        return await selectTime({ ...ids, action: payload.action, goTo: 'manage_notifications' });
    }
});

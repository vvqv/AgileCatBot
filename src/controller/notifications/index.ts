import { createKeyboard } from '@utils/keyboards';
import i18next from 'i18next';
import moment from 'moment-timezone';

import { COMMANDS, ERRORS, TREATMENTS, TZ } from '@src/constants';
import {
    bot,
    checkUserAdminStatus,
    createNotification,
    deleteNotification,
    manageNotificationById,
    selectNotifications,
} from '@src/model';
import {
    getCallbackQueryData,
    idKeys,
    isDefined,
    isTruthy,
    sendWithCommandLine,
    WithCommandLine,
} from '@src/utils';

import { selectDate } from '../calendar';
import { deleteLastMessage } from '../chat';

import { getNotificationListKeyboard } from './buttons';
import { notificationsTypeMenu } from './constants';

export type NotificationsType = { type: 'public' | 'personal' };
export type NotificationPayload = Partial<NotificationsType> & {
    date?: Date;
    title?: string;
    description?: string;
};

const payload: NotificationPayload = {};

export async function manageNotifications({ fromCommandLine, ...keys }: idKeys & WithCommandLine) {
    const hasAccess = await checkUserAdminStatus(keys);

    const adminKeyboard = createKeyboard({ items: notificationsTypeMenu, goTo: 'main' });

    const userKeyboard = await getNotificationListKeyboard({ ...keys, type: 'personal' });

    return await sendWithCommandLine({
        fromCommandLine,
        messageText: COMMANDS.selectOption,
        keyboard: hasAccess ? adminKeyboard : userKeyboard,
        ...keys,
    });
}

async function showNotificationsInfo({
    notificationId,
    ...ids
}: idKeys & { notificationId: string } & NotificationsType) {
    const notificationData = await manageNotificationById(notificationId);
    const chatInfo = await bot.getChat(ids.chatId);

    if (!notificationData) {
        return await bot.sendMessage(ids.userId, ERRORS.notificationNotFound);
    }

    const { title, description, repeatedDaysAmount, repeatedHoursAmount, endDateTime } =
        notificationData;

    const time = moment(endDateTime).format('LT');

    function getNotificationDescription() {
        if (isTruthy(repeatedDaysAmount)) {
            return `Повторяющееся ${
                repeatedDaysAmount > 1
                    ? `${i18next.t('every', {
                          repeatedDaysAmount,
                      })} ${repeatedDaysAmount} ${i18next.t('days', {
                          count: repeatedDaysAmount,
                      })} в ${time}`
                    : `ежедневно в ${time}`
            } `;
        }

        if (isTruthy(repeatedHoursAmount)) {
            return `Повторяющееся ${
                repeatedHoursAmount > 1
                    ? `${i18next.t('every', {
                          repeatedHoursAmount,
                      })} ${repeatedHoursAmount} ${i18next.t('hours', {
                          count: repeatedHoursAmount,
                      })}`
                    : 'ежечасно'
            } `;
        }

        const localeDate = moment(endDateTime).tz(TZ).calendar().toLowerCase();

        return `Сработает ${localeDate}`;
    }

    const message =
        `<b>Уведомление: ${title}</b> в группе <b>"${chatInfo.title}"</b>\n\n` +
        `<b>Тип:</b> ${getNotificationDescription()} \n\n` +
        `<b>Содержание:</b>\n` +
        `${description}`;

    return await bot.sendMessage(ids.userId, message, { parse_mode: 'HTML' });
}

export async function initCreateNotification({ type, ...ids }: idKeys & NotificationsType) {
    const { userName, chatId } = ids;

    payload.type = type;
    payload.title = undefined;
    payload.description = undefined;

    const botMessage = await bot.sendMessage(chatId, `@${userName}, ${TREATMENTS.enterTitle}`, {
        reply_markup: {
            force_reply: true,
            selective: true,
        },
    });

    async function clearChat(userReplyId: number) {
        await deleteLastMessage({ ...ids, messageId: userReplyId });
        await deleteLastMessage({ ...ids, messageId: botMessage.message_id });
    }

    return bot.onReplyToMessage(botMessage.chat.id, botMessage.message_id, async (msg) => {
        payload.title = msg.text;

        return await enterDescription(ids).then(() => clearChat(msg.message_id));
    });
}

async function enterDescription(ids: idKeys) {
    const { userName, chatId } = ids;

    const botMessage = await bot.sendMessage(
        chatId,
        `@${userName}, ${TREATMENTS.enterDescription}`,
        {
            reply_markup: {
                force_reply: true,
                selective: true,
            },
        }
    );

    async function clearChat(userReplyId: number) {
        await deleteLastMessage({ ...ids, messageId: userReplyId });
        await deleteLastMessage({ ...ids, messageId: botMessage.message_id });
    }

    return bot.onReplyToMessage(botMessage.chat.id, botMessage.message_id, async (msg) => {
        payload.description = msg.text;

        return await selectDate({
            ...ids,
            action: 'select_notification_date',
            goTo: 'manage_notifications',
        }).then(() => clearChat(msg.message_id));
    });
}

async function addNotification({
    daysCount,
    hoursCount,
    ...keys
}: idKeys & { daysCount?: number; hoursCount?: number }) {
    const { title, type, date, description } = payload;

    if (!isTruthy(type) || !isTruthy(date) || !isTruthy(description) || !isTruthy(title)) {
        return await bot.sendMessage(keys.userId, ERRORS.notificationPayloadError);
    }

    const notificationInfo = await selectNotifications({ ...keys, type });

    if (isTruthy(notificationInfo) && notificationInfo.length > 0) {
        const hasSameNotification = isTruthy(
            notificationInfo.find(
                ({ description, endTime }) =>
                    description === payload.description && endTime === payload.date
            )
        );

        if (hasSameNotification) {
            return await bot.sendMessage(keys.userId, ERRORS.notificationExist);
        }
    }

    return await createNotification({
        ...keys,
        title,
        type,
        description,
        daysCount,
        hoursCount,
        endDate: date,
    }).then(async () => await deleteLastMessage(keys));
}

async function selectNotificationMode({ messageId, chatId }: idKeys) {
    const keyboard = createKeyboard({
        items: [
            ['notification_mode_single', COMMANDS.singleNotification],
            ['notification_mode_repeated', COMMANDS.repeatedNotification],
        ],
        goTo: 'select_notification_time',
    });

    return await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard },
        { message_id: messageId, chat_id: chatId }
    );
}

async function selectRepeatedType({ messageId, chatId }: idKeys) {
    const keyboard = createKeyboard({
        items: [
            ['notification_repeated_hourly', COMMANDS.notificationRepeatedHourly],
            ['notification_repeated_day', COMMANDS.notificationRepeatedDay],
            ['notification_repeated_week', COMMANDS.notificationRepeatedWeek],
            ['notification_repeated_two_weeks', COMMANDS.notificationRepeated2Weeks],
            ['notification_repeated_custom', COMMANDS.notificationRepeatedCustom],
        ],
        goTo: 'manage_notifications',
    });

    return await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard },
        { message_id: messageId, chat_id: chatId }
    );
}

async function selectRepeatedAmountType({ messageId, chatId }: idKeys) {
    const keyboard = createKeyboard({
        items: [
            ['notification_repeated_hour_amount', COMMANDS.notificationRepeatedCustomHoursCount],
            ['notification_repeated_day_amount', COMMANDS.notificationRepeatedCustomDaysCount],
        ],
        goTo: 'manage_notifications',
    });

    return await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard },
        { message_id: messageId, chat_id: chatId }
    );
}

async function selectCustomRepeatedAmount({ type, ...ids }: idKeys & { type: 'hours' | 'days' }) {
    const { chatId, userName, userId } = ids;

    const botMessage = await bot.sendMessage(
        chatId,
        `@${userName}, ${
            type === 'days'
                ? TREATMENTS.enterNotificationCustomDays
                : TREATMENTS.enterNotificationCustomHours
        }`,
        {
            reply_markup: {
                force_reply: true,
                selective: true,
            },
        }
    );

    async function clearChat(userReplyId: number) {
        await deleteLastMessage({ ...ids, messageId: userReplyId });
        await deleteLastMessage({ ...ids, messageId: botMessage.message_id });
    }

    return bot.onReplyToMessage(botMessage.chat.id, botMessage.message_id, async (msg) => {
        const messageCount = Number(msg.text);

        const payload: { daysCount?: number; hoursCount?: number } = {};

        if (!Number.isInteger(messageCount) || messageCount <= 0) {
            return await bot
                .sendMessage(userId, ERRORS.incorrectNumber)
                .then(() => clearChat(msg.message_id));
        }

        if (type === 'days') {
            payload.daysCount = messageCount;
        }

        if (type === 'hours') {
            payload.hoursCount = messageCount;
        }

        if (type === 'hours' && messageCount >= 24) {
            payload.daysCount = Math.floor(messageCount / 24);
            payload.hoursCount = messageCount % 24;
        }

        return await addNotification({
            ...ids,
            ...payload,
        }).then(() => clearChat(msg.message_id));
    });
}

async function notificationsMenu({
    fromCommandLine,
    type,
    ...ids
}: idKeys & NotificationsType & WithCommandLine) {
    payload.type = type;
    const keyboard = await getNotificationListKeyboard({ ...ids, type });

    return sendWithCommandLine({
        fromCommandLine,
        messageText: COMMANDS.selectOption,
        keyboard,
        ...ids,
    });
}

async function enterNotificationTime(ids: idKeys) {
    const { userId, chatId, userName } = ids;

    const botMessage = await bot.sendMessage(chatId, `@${userName}, ${TREATMENTS.enterTime}`, {
        reply_markup: {
            force_reply: true,
            selective: true,
        },
    });

    async function clearChat(userReplyId: number) {
        await deleteLastMessage({ ...ids, messageId: userReplyId });
        await deleteLastMessage({ ...ids, messageId: botMessage.message_id });
    }

    return bot.onReplyToMessage(botMessage.chat.id, botMessage.message_id, async (msg) => {
        const time = msg.text;

        if (!isDefined(time) || !time.match(/^([0-1]?\d|2[0-4]):([0-5]\d)(:[0-5]\d)?$/)) {
            return await bot
                .sendMessage(userId, ERRORS.incorrectTime)
                .then(() => clearChat(msg.message_id));
        }

        const [hours, minutes] = time.split(':');

        payload.date?.setHours(Number(hours));
        payload.date?.setMinutes(Number(minutes));

        return await selectNotificationMode(ids).then(() => clearChat(msg.message_id));
    });
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'manage_notifications': {
            return manageNotifications(ids);
        }

        case 'personal_notifications': {
            return await notificationsMenu({ ...ids, type: 'personal' });
        }

        case 'public_notifications': {
            return await notificationsMenu({ ...ids, type: 'public' });
        }

        case 'notification_mode_repeated': {
            return await selectRepeatedType(ids);
        }

        case 'notification_mode_single': {
            return await addNotification(ids);
        }

        case 'notification_repeated_hourly': {
            return await addNotification({ ...ids, hoursCount: 1 });
        }

        case 'notification_repeated_day': {
            return await addNotification({ ...ids, daysCount: 1 });
        }

        case 'notification_repeated_week': {
            return await addNotification({ ...ids, daysCount: 7 });
        }

        case 'notification_repeated_two_weeks': {
            return await addNotification({ ...ids, daysCount: 14 });
        }

        case 'notification_repeated_custom': {
            return await selectRepeatedAmountType(ids);
        }

        case 'notification_repeated_hour_amount': {
            return await selectCustomRepeatedAmount({ ...ids, type: 'hours' });
        }

        case 'notification_repeated_day_amount': {
            return await selectCustomRepeatedAmount({ ...ids, type: 'days' });
        }
    }

    const shouldCreateNotification = data.includes('create_notification');
    const shouldShowInfoNotification = data.includes('show_notification');
    const shouldDeleteNotification = data.includes('delete_notification');
    const onSelectDate = data?.includes('select_notification_date');
    const onSelectTime = data?.includes('select_notification_time');

    if (onSelectDate) {
        const [, day, month, year] = data.split(' ');
        payload.date = new Date(Number(year), Number(month), Number(day));

        return await enterNotificationTime(ids);
    }

    if (onSelectTime) {
        const [, value] = data.split(' ');
        const [hours, minutes] = value.split(':');
        payload.date?.setHours(Number(hours));
        payload.date?.setMinutes(Number(minutes));

        return await selectNotificationMode(ids);
    }

    if (shouldCreateNotification) {
        const [, type] = data.split(' ');

        return await initCreateNotification({ ...ids, type: type as NotificationsType['type'] });
    }

    if (shouldShowInfoNotification) {
        const [, type, notificationId] = data.split(' ');

        return await showNotificationsInfo({
            ...ids,
            type: type as NotificationsType['type'],
            notificationId,
        });
    }

    if (shouldDeleteNotification) {
        const [, type, notificationId] = data.split(' ');

        return await deleteNotification({
            ...ids,
            type: type as NotificationsType['type'],
            notificationId,
        }).then(async () => await manageNotifications(ids));
    }
});

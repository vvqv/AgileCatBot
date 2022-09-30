import { decryptData } from '@utils/encryption';
import { isTruthy } from '@utils/typeguards';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Model } from 'sequelize';

import config from '../config';
import { commands, ERRORS, tApiErrors } from '../constants';
import { deleteLastMessage } from '../controller';
import { bot, deleteUser } from '../model';

import { idKeys, KeyboardItem, Options, User, WithCommandLine } from './types';

export function isUrl(message?: string, target: 'chat' | 'reply' = 'chat') {
    if (!message) {
        return false;
    }

    const fromChat = /^(([!#@])https):\/\/(\w+:?\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@\-\/]))?$/;
    const fromReply = /^(https):\/\/(\w+:?\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@\-\/]))?$/;

    return target === 'chat' ? fromChat.test(message) : fromReply.test(message);
}

export function getUrlType(message?: string): Omit<Options, string> | null {
    if (!message) {
        return null;
    }

    const commandChar = message[0];

    const isNeedRegularReview = /!/.test(commandChar);
    const isNeedSingleReview = /@/.test(commandChar);

    switch (true) {
        case isNeedSingleReview: {
            return 'change_reviewer';
        }

        case isNeedRegularReview:
        default: {
            return 'review_pr';
        }
    }
}

export function getUrlFromMessage(message: string) {
    if (isUrl(message)) {
        const array = message.split('');
        array.shift();
        return array.join('');
    }

    return ERRORS.thisIsNotLink;
}

export function getRandomRecord(users: Model<User>[]): User {
    const randomId = Math.round(Math.random() * (users.length - 1));
    const data = users[randomId].get();

    return {
        ...data,
        userId: decryptData(data.userId),
        name: decryptData(data.name),
    };
}

export function createChatCommands(botName: string) {
    const data: Record<string, string[]> = {};

    Object.entries(commands).map(([command, list]) => {
        list.push(`${list[0]}@${botName}`);
        data[command] = list;
    });

    return data as unknown as typeof commands;
}

function getUrlResult({ reply_to_message, text = '' }: Message) {
    const isUrlCommand = isUrl(text) && !reply_to_message;

    return {
        isUserNeedsReview: isUrlCommand && getUrlType(text) === 'review_pr',
        isUserNeedsSingleReview: isUrlCommand && getUrlType(text) === 'change_reviewer',
    };
}

export async function getMessageData(message: Message) {
    const userName = message.from?.username;
    const userId = message.from?.id;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const msg = message.text || ''; // может быть стикером

    const { isUserNeedsSingleReview, isUserNeedsReview } = getUrlResult(message);

    if (!userId) {
        throw new Error(ERRORS.someIdsMissing);
    }

    const ids = {
        chatId,
        messageId,
        userName,
        userId,
    };

    const hasUserEnteredBotCommand = Object.values(commands).some((command) =>
        command.includes(msg)
    );

    const hasUserCalledBot =
        hasUserEnteredBotCommand || isUserNeedsReview || isUserNeedsSingleReview;

    return {
        hasUserCalledBot,
        isUserNeedsSingleReview,
        isUserNeedsReview,
        msg,
        ...ids,
    };
}

export function getCallbackQueryData(query: CallbackQuery) {
    const data = query.data as Options;
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const userName = query.from.username;
    const messageId = query.message?.message_id;

    if (!userName || !chatId || !messageId) {
        throw new Error(ERRORS.someIdsMissing);
    }

    const ids: idKeys = {
        userId,
        chatId,
        userName,
        messageId,
    };

    return { data, ...ids };
}

export async function sendWithCommandLine({
    fromCommandLine,
    messageText,
    keyboard,
    ...ids
}: idKeys & { keyboard: KeyboardItem[][]; messageText?: string } & WithCommandLine) {
    const { chatId, messageId } = ids;

    return fromCommandLine && messageText
        ? (await deleteLastMessage(ids)) &&
              bot.sendMessage(chatId, messageText, {
                  reply_markup: {
                      inline_keyboard: keyboard,
                  },
              })
        : await bot.editMessageReplyMarkup(
              {
                  inline_keyboard: keyboard,
              },
              { message_id: messageId, chat_id: chatId }
          );
}

export function generateRandomNumber() {
    return Math.floor(new Date().getTime() + Math.random() * 10000);
}

export async function checkForUserStartBot(args: idKeys) {
    return await bot
        .sendChatAction(args.userId, 'typing')
        .catch((error) => handleApiError({ error, ...args }));
}

export async function handleApiError({
    error,
    ...ids
}: idKeys & { error: { response: { body: { error_code: number; description: string } } } }) {
    const { userName, chatId } = ids;

    const name = isTruthy(userName) ? `@${userName}` : 'Уважаемый(ая)';

    await deleteLastMessage(ids);
    const code = error.response.body.error_code;
    const description = error.response.body.description;
    let message = '';

    function setMessage(msg: string) {
        message = msg;
    }

    const userBotConversationMessage = `${name}, ${ERRORS.userBotConversationError}\n https://t.me/${config.NAME}`;

    switch (code) {
        case 403: {
            description === tApiErrors.botUserRestriction && setMessage(userBotConversationMessage);

            if (description === tApiErrors.botBannedRestriction) {
                await deleteUser(ids);
                setMessage(`${name}, ${ERRORS.botWasBannedByTheUser}`);
            }
            break;
        }

        case 400: {
            description === tApiErrors.invalidPeerId && setMessage(userBotConversationMessage);
            break;
        }
    }

    isTruthy(message) && (await bot.sendMessage(chatId, message));

    return new Error(message);
}

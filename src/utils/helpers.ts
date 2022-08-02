import { User } from '@db/types';
import { decryptData } from '@utils/encryption';
import { Message } from 'node-telegram-bot-api';
import { Model } from 'sequelize';

import { commands, ERRORS } from '../constants';

export function isUrl(message?: string, target: 'chat' | 'reply' = 'chat') {
    if (!message) {
        return false;
    }

    const fromChat = /^(!https):\/\/(\w+:?\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@\-\/]))?$/;
    const fromReply = /^(https):\/\/(\w+:?\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@\-\/]))?$/;

    return target === 'chat' ? fromChat.test(message) : fromReply.test(message);
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

export async function getMessageData(message: Message) {
    const userName = message.from?.username;
    const userId = message.from?.id;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const msg = message.text || ''; // может быть стикером
    const isReply = !!message.reply_to_message;
    const isUserNeedsReview = isUrl(msg) && !isReply;

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

    const hasUserCalledBot = hasUserEnteredBotCommand || isUserNeedsReview;

    return {
        hasUserCalledBot,
        isUserNeedsReview,
        msg,
        ...ids,
    };
}

export function generateRandomNumber() {
    return Math.floor(new Date().getTime() + Math.random() * 10000);
}

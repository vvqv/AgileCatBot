import config from '@src/config';
import { ERRORS, NOTIFICATIONS, TREATMENTS } from '@src/constants';
import { bot, getUserInfo, getUsersMention } from '@src/model';
import { getUrlFromMessage, idKeys, isUrl } from '@src/utils';

import { getMainMenuButtons } from './buttons';
import { getMainMenuMessage } from './constants';

export async function selectAction(keys: idKeys) {
    await deleteLastMessage(keys);

    const message = getMainMenuMessage();
    const mainMenuButtons = await getMainMenuButtons(keys);

    return await bot.sendMessage(keys.chatId, message, {
        reply_markup: {
            inline_keyboard: mainMenuButtons,
        },
    });
}

export async function deleteLastMessage({ chatId, userId, messageId }: idKeys) {
    return await bot
        .deleteMessage(chatId, `${messageId}`)
        .catch(() => bot.sendMessage(userId, ERRORS.botCantDeleteMessages));
}

export async function restrictChatAction(keys: idKeys) {
    await deleteLastMessage(keys);
    return await bot.sendMessage(keys.chatId, TREATMENTS.botChatRestriction);
}

export async function sendMentions({
    userId,
    message,
    messageId,
    chatId,
    teamId,
    userName,
}: { message?: string; teamId?: string } & idKeys) {
    await deleteLastMessage({ chatId, messageId, userId, userName });

    const userInfo = await getUserInfo({ chatId, messageId, userId, userName });

    if (!userInfo) {
        return await bot.sendMessage(userId, ERRORS.userNotFound);
    }

    const mentions = await getUsersMention({ chatId, messageId, userId, userName, teamId });

    if (typeof mentions !== 'string') {
        return await bot.sendMessage(userId, ERRORS.usersAreNotEnough);
    }

    if (!message) {
        const replyMessage = await bot.sendMessage(
            chatId,
            `@${userInfo.name}, ${TREATMENTS.enterRequestLink}`,
            {
                reply_markup: {
                    force_reply: true,
                    selective: true,
                },
            }
        );

        return bot.onReplyToMessage(replyMessage.chat.id, replyMessage.message_id, async (msg) => {
            const isCorrectUrl = isUrl(msg.text, 'reply');

            const newMessage = isCorrectUrl
                ? `${NOTIFICATIONS.newRequest}\n${msg.text}\n${mentions}`
                : ERRORS.incorrectReplyLink;

            return await bot
                .sendMessage(isCorrectUrl ? chatId : userId, newMessage)
                .then(async () => {
                    await bot.deleteMessage(chatId, `${msg.message_id}`);
                    await bot.deleteMessage(chatId, `${replyMessage.message_id}`);
                });
        });
    }

    const newMessage = `${NOTIFICATIONS.newRequest}\n${getUrlFromMessage(message)}\n${mentions}`;

    return await bot.sendMessage(chatId, newMessage);
}

export async function greetingsUser(args: idKeys) {
    const greetingsMessage =
        `${TREATMENTS.greetingsUser}\n` +
        `${TREATMENTS.initializeBot} @${config.NAME} ${TREATMENTS.andActivate}\n` +
        `${TREATMENTS.thenSelectTeam}`;

    return await bot.sendMessage(args.chatId, greetingsMessage);
}

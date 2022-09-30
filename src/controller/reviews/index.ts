import { ERRORS, NOTIFICATIONS, TREATMENTS } from '@src/constants';
import { bot, getRandomUserFromAnotherTeam, getUserInfo, getUserTeamInfo } from '@src/model';
import { getCallbackQueryData, getUrlFromMessage, idKeys, isDefined, isUrl } from '@src/utils';

import { deleteLastMessage, sendMentions } from '../chat';

export async function changeReviewer(ids: idKeys & { message?: string }) {
    const { userId, chatId, message } = ids;

    const userInfo = await getUserInfo(ids);
    const userTeamInfo = await getUserTeamInfo(ids);

    await deleteLastMessage(ids);

    if (!userInfo || !userTeamInfo) {
        return await bot.sendMessage(userId, ERRORS.userNotFound);
    }

    const randomUser = await getRandomUserFromAnotherTeam(chatId, userTeamInfo.teamId);

    if (!randomUser) {
        return await bot.sendMessage(userId, ERRORS.userNotFound);
    }

    if (isDefined(message)) {
        const newMessage = `${NOTIFICATIONS.extraRequest}\n${getUrlFromMessage(message)}\n@${
            randomUser.name
        }`;

        return await bot.sendMessage(chatId, newMessage);
    }

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

        const message = isCorrectUrl
            ? `${NOTIFICATIONS.extraRequest}\n${msg.text}\n@${randomUser.name}`
            : ERRORS.incorrectReplyLink;

        return await bot.sendMessage(chatId, message).then(async () => {
            await bot.deleteMessage(chatId, `${msg.message_id}`);
            await bot.deleteMessage(chatId, `${replyMessage.message_id}`);
        });
    });
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'review_pr': {
            return await sendMentions(ids);
        }

        case 'change_reviewer': {
            return await changeReviewer(ids);
        }
    }
});

import { ERRORS, TREATMENTS } from '@src/constants';
import { bot, registerLicenseKey, verifyLicenseInfo } from '@src/model';
import { getCallbackQueryData, idKeys } from '@src/utils';

import { deleteLastMessage } from '../chat';

export async function setLicenseKey(keys: idKeys) {
    const { userId, userName, chatId } = keys;

    await deleteLastMessage(keys);

    if (!userName) {
        return await bot.sendMessage(userId, ERRORS.pleaseSetNickName);
    }

    const replyMessage = await bot.sendMessage(
        chatId,
        `@${userName}, ${TREATMENTS.enterLicenseKey}`,
        {
            reply_markup: {
                force_reply: true,
                selective: true,
            },
        }
    );

    return bot.onReplyToMessage(replyMessage.chat.id, replyMessage.message_id, async (msg) => {
        const keys = {
            chatId,
            userId,
            userName,
            messageId: msg.message_id,
            licenseKey: msg.text || '',
        };

        const data = await verifyLicenseInfo(keys);

        async function removeMessages() {
            await bot.deleteMessage(chatId, `${msg.message_id}`);
            await bot.deleteMessage(chatId, `${replyMessage.message_id}`);
        }

        if (data?.isAvailable) {
            return await registerLicenseKey(keys).then(removeMessages);
        }

        return await bot.sendMessage(userId, ERRORS.licenseDenied).then(removeMessages);
    });
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'set_license': {
            return await setLicenseKey(ids);
        }

        case 'get_license': {
            return;
        }
    }
});

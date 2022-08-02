import { UserGroupsModel } from '@db/models';
import { ERRORS } from '@src/constants';
import { bot } from '@src/db';
import { ApiResponse } from '@src/models';
import { decryptData, encryptData } from '@utils/encryption';
import TelegramBot from 'node-telegram-bot-api';

export async function getAvailableUserChats(
    userId: string
): Promise<ApiResponse<TelegramBot.Chat[]>> {
    try {
        const userModels = await UserGroupsModel.findAll({
            where: { userId: encryptData(userId) },
        });

        const chats: TelegramBot.Chat[] = [];

        for (const model of userModels) {
            const data = model.get();

            const chat = await bot.getChat(decryptData(data.chatId));

            chats.push(chat);
        }

        return { data: chats };
    } catch (err) {
        return { error: ERRORS.errorOccurred };
    }
}

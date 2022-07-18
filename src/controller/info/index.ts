import { ERRORS, TREATMENTS } from '@src/constants';
import { bot, getTeamInfo, getTeamUsersList, getUserTeamInfo, updateUser } from '@src/model';
import { getCallbackQueryData, idKeys, isTruthy, WithCommandLine } from '@src/utils';

import { deleteLastMessage } from '../chat';

import { getInfoButtons } from './buttons';

export async function getInformation({ fromCommandLine, ...keys }: idKeys & WithCommandLine) {
    const { messageId, chatId } = keys;
    const keyboard = await getInfoButtons(keys);

    return fromCommandLine
        ? (await deleteLastMessage(keys)) &&
              bot.sendMessage(chatId, TREATMENTS.whatInfoYouNeed, {
                  reply_markup: { inline_keyboard: keyboard },
              })
        : bot.editMessageReplyMarkup(
              { inline_keyboard: keyboard },
              {
                  message_id: messageId,
                  chat_id: chatId,
              }
          );
}

export async function sendTeamInfo(keys: idKeys & { teamId: string }) {
    const usersList = await getTeamUsersList(keys);
    const teamData = await getTeamInfo(keys);
    const chatInfo = await bot.getChat(keys.chatId);

    if (!teamData) {
        return await bot.sendMessage(keys.userId, ERRORS.teamNotFound);
    }

    const { teamName } = teamData;

    const message =
        `<b>"${teamName}"</b> в группе <b>"${chatInfo.title}"</b>\n\n` +
        `${usersList.length > 0 ? `<b>Состав участников:</b> ${usersList.join(', ')}\n\n` : ''}`;

    return await bot.sendMessage(keys.userId, message, { parse_mode: 'HTML' });
}

export async function sendUserTeamInfo(keys: idKeys) {
    const { userId, chatId } = keys;

    const userTeamInfo = await getUserTeamInfo(keys);

    if (!userTeamInfo) {
        return await bot.sendMessage(userId, ERRORS.userNotFound);
    }

    const groupName = await bot.getChat(chatId);

    const message = `В группе "${groupName.title}", ваша команда: ${userTeamInfo.teamName}`;

    return await bot.sendMessage(userId, message).finally(() => deleteLastMessage(keys));
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'get_info': {
            return await getInformation(ids);
        }

        case 'about_me': {
            return await sendUserTeamInfo(ids);
        }

        case 'enable_vacation': {
            return await updateUser({
                ...ids,
                isOnVacation: true,
            });
        }

        case 'disable_vacation': {
            return await updateUser({
                ...ids,
                isOnVacation: false,
            });
        }

        default: {
            const shouldSendInfoAboutSpecificTeam = data.includes('get_info_team');

            if (shouldSendInfoAboutSpecificTeam) {
                const [, teamId] = data.split(' ');

                return await sendTeamInfo({ ...ids, teamId });
            }
        }
    }
});

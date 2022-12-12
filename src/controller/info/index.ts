import { selectDate } from '@controller/calendar';
import { getBotInfo } from '@controller/info/constants';
import moment from 'moment';

import { ERRORS, TREATMENTS } from '@src/constants';
import {
    bot,
    getAllTeamsInfo,
    getTeamInfo,
    getTeamUsersList,
    getUserInfo,
    getUserTeamInfo,
    updateUser,
} from '@src/model';
import { getCallbackQueryData, idKeys, isNotNil, WithCommandLine } from '@src/utils';

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
    const userInfo = await getUserInfo(keys);

    if (!userInfo || !userTeamInfo) {
        return await bot.sendMessage(userId, ERRORS.userNotFound);
    }

    const groupName = await bot.getChat(chatId);

    const message = `В группе "${groupName.title}", ваша команда: ${
        userTeamInfo.teamName
    }\n\nСтатус: ${
        isNotNil(userInfo.endVacationDateTime)
            ? 'В отпуске до ' + moment(userInfo.endVacationDateTime).format('DD.MM')
            : 'Не в отпуске'
    }`;

    return await bot.sendMessage(userId, message).finally(() => deleteLastMessage(keys));
}

export async function sendAllTeamsInfo(keys: idKeys) {
    const usersList = await getAllTeamsInfo(keys);
    const chatInfo = await bot.getChat(keys.chatId);

    let message = `В группе <b>"${chatInfo.title}"</b>:\n\n`;

    for (const teamData of usersList) {
        const { teamName, users } = await teamData;

        message +=
            `<b>"${teamName}"</b>\n` +
            `${
                usersList.length > 0
                    ? `Состав участников: ${
                          users.length > 0 ? users.join(', ') : ERRORS.usersNotFound
                      }\n\n`
                    : ''
            }`;
    }

    return await bot
        .sendMessage(keys.userId, message, { parse_mode: 'HTML' })
        .finally(() => deleteLastMessage(keys));
}

export async function toggleVacation({ fromCommandLine, ...ids }: idKeys & WithCommandLine) {
    const userData = await getUserInfo(ids);
    const userTeam = await getUserTeamInfo(ids);

    if (isNotNil(userData) && isNotNil(userTeam)) {
        const { isOnVacation } = userData;

        return isOnVacation
            ? await updateUser({
                  ...ids,
                  vacationDate: null,
              })
            : await selectVacationEndDate({ fromCommandLine, ...ids });
    }

    return await bot
        .sendMessage(ids.userId, ERRORS.userNotFound)
        .finally(() => deleteLastMessage(ids));
}

export async function getAboutBotInfo(ids: idKeys) {
    return await bot
        .sendMessage(ids.userId, getBotInfo(), { parse_mode: 'HTML' })
        .finally(() => deleteLastMessage(ids));
}

async function selectVacationEndDate({ fromCommandLine, ...ids }: idKeys & WithCommandLine) {
    const minDate = new Date();
    const maxDate = new Date();

    maxDate.setDate(maxDate.getDate() + 21);

    return await selectDate({
        ...ids,
        fromCommandLine,
        minDate,
        maxDate,
        action: 'select_vacation_date',
        goTo: 'main',
    });
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'get_info': {
            return await getInformation(ids);
        }

        case 'about_bot': {
            return await getAboutBotInfo(ids);
        }

        case 'about_me': {
            return await sendUserTeamInfo(ids);
        }

        case 'all_teams': {
            return await sendAllTeamsInfo(ids);
        }

        case 'enable_vacation': {
            return await selectVacationEndDate(ids);
        }

        case 'disable_vacation': {
            return await updateUser({
                ...ids,
                vacationDate: null,
            });
        }

        default: {
            const shouldSendInfoAboutSpecificTeam = data.includes('get_info_team');
            const shouldUpdateVacationInfo = data.includes('select_vacation_date');

            if (shouldSendInfoAboutSpecificTeam) {
                const [, teamId] = data.split(' ');

                return await sendTeamInfo({ ...ids, teamId });
            }

            if (shouldUpdateVacationInfo) {
                const [, date, month, year] = data.split(' ');

                return await updateUser({
                    ...ids,
                    vacationDate: new Date(Number(year), Number(month), Number(date)),
                });
            }
        }
    }
});

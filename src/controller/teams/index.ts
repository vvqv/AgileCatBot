import { TREATMENTS } from '@src/constants';
import { bot, deleteTeam, TeamQueryPayload, updateTeam, updateUser } from '@src/model';
import { getCallbackQueryData, idKeys, isTruthy, WithCommandLine } from '@src/utils';

import { deleteLastMessage, sendMentions } from '../chat';

import { getManageTeamsButtons } from './buttons';

export async function removeTeam(args: TeamQueryPayload) {
    await deleteTeam(args);

    return await manageTeams(args);
}

export async function specificTeamReview({ fromCommandLine, ...ids }: idKeys & WithCommandLine) {
    const { chatId, messageId } = ids;

    const keyboard = await getManageTeamsButtons({
        ...ids,
        selector: 'select_team_review',
    });

    return fromCommandLine
        ? (await deleteLastMessage(ids)) &&
              bot.sendMessage(chatId, TREATMENTS.selectTeam, {
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

export async function updateTeamName({ teamId, ...ids }: TeamQueryPayload) {
    const { chatId, userName } = ids;

    const message = await bot.sendMessage(chatId, `@${userName}, ${TREATMENTS.enterTeamName}`, {
        reply_markup: {
            force_reply: true,
            selective: true,
        },
    });

    async function finishFlow(userReplyId: number) {
        await deleteLastMessage({ ...ids, messageId: userReplyId });
        await deleteLastMessage({ ...ids, messageId: message.message_id });
        return await manageTeams(ids);
    }

    return bot.onReplyToMessage(message.chat.id, message.message_id, async (msg) => {
        const teamName = msg.text;

        const shouldUpdateTeam = isTruthy(teamId) && isTruthy(teamName);

        const keys: idKeys = {
            ...ids,
            messageId: msg.message_id,
        };

        return shouldUpdateTeam
            ? await updateTeam({ ...keys, teamId, teamName }).then(() => finishFlow(msg.message_id))
            : await updateTeam({ ...keys, teamName }).then(() => finishFlow(msg.message_id));
    });
}

export async function manageTeams(ids: idKeys) {
    const { messageId, chatId } = ids;

    const keyboard = await getManageTeamsButtons({
        ...ids,
        selector: 'select_team',
    });

    return await bot.editMessageReplyMarkup(
        {
            inline_keyboard: keyboard,
        },
        { message_id: messageId, chat_id: chatId }
    );
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'manage_teams': {
            return await manageTeams(ids);
        }

        case 'add_team': {
            return await updateTeamName(ids);
        }

        case 'specific_team_review': {
            return await specificTeamReview(ids);
        }

        default: {
            const shouldEditTeam = data.includes('edit_team');
            const shouldDeleteTeam = data.includes('delete_team');
            const shouldSelectTeam = data.includes('select_team');
            const shouldSelectSpecificTeamForReview = data.includes('select_team_review');

            if (shouldSelectSpecificTeamForReview) {
                const [, teamId] = data.split(' ');
                return await sendMentions({ ...ids, teamId });
            }

            if (shouldEditTeam) {
                const [, teamId] = data.split(' ');
                return await updateTeamName({ ...ids, teamId });
            }

            if (shouldDeleteTeam) {
                const [, teamId] = data.split(' ');
                return await removeTeam({ ...ids, teamId });
            }

            if (shouldSelectTeam) {
                const [, teamId] = data.split(' ');

                return await updateUser({
                    isOnVacation: false,
                    teamId,
                    ...ids,
                });
            }
        }
    }
});

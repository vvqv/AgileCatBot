import 'module-alias/register';

import config from './config';
import { ERRORS, setBotCommands } from './constants';
import {
    changeReviewer,
    deleteLastMessage,
    getInformation,
    greetingsUser,
    restrictChatAction,
    selectAction,
    sendMentions,
    specificTeamReview,
    toggleVacation,
} from './controller';
import { restoreJobs } from './controller/shedules';
import { bot, deleteUser, initDB } from './model';
import { createChatCommands, getMessageData, idKeys, isDefined } from './utils';

async function init() {
    await initDB();
    await restoreJobs();

    await bot.setMyCommands(setBotCommands);

    const commands = createChatCommands(config.NAME);

    bot.on('message', async (message) => {
        const {
            isUserNeedsReview,
            isUserNeedsSingleReview,
            hasUserCalledBot,
            msg,
            userName,
            ...keys
        } = await getMessageData(message);

        const ids: idKeys = {
            ...keys,
            userName: userName || '',
        };

        if (hasUserCalledBot) {
            if (!isDefined(userName)) {
                await deleteLastMessage({ ...keys, userName: '' });
                return await bot.sendMessage(keys.chatId, ERRORS.pleaseSetNickName);
            }

            return ids.chatId === ids.userId
                ? await restrictChatAction(ids)
                : commands.start.includes(msg)
                ? await selectAction(ids)
                : commands.info.includes(msg)
                ? await getInformation({ ...ids, fromCommandLine: true })
                : commands.change.includes(msg)
                ? await changeReviewer(ids)
                : commands.review.includes(msg)
                ? await sendMentions(ids)
                : commands.reviewCommand.includes(msg)
                ? await specificTeamReview({ ...ids, fromCommandLine: true })
                : commands.vacation.includes(msg)
                ? await toggleVacation({ ...ids, fromCommandLine: true })
                : isUserNeedsReview
                ? await sendMentions({ ...ids, message: msg })
                : isUserNeedsSingleReview
                ? await changeReviewer({ ...ids, message: msg })
                : null;
        }

        message.left_chat_member &&
            (await deleteUser({ ...ids, userId: message.left_chat_member.id }));

        message.new_chat_members && (await greetingsUser(ids));
    });
}

init();

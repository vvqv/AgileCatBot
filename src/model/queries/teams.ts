import { decryptData, encryptData } from '@utils/encryption';
import uId from 'uniqid';

import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { generateRandomNumber, idKeys, isDefined, isTruthy } from '@src/utils';

import { bot, checkUserAdminStatus } from '../index';
import { TeamsModel } from '../models';

export type TeamQueryPayload = idKeys & {
    teamName?: string;
    teamId?: string;
};

export async function getTeams({ chatId }: idKeys) {
    const models = await TeamsModel.findAll({ where: { chatId: encryptData(`${chatId}`) } });

    if (models.length === 0) {
        return [];
    }

    return models.map((model) => {
        const { teamId, teamName } = model.get();

        return [teamId, decryptData(teamName)];
    });
}

export async function getTeamInfo({ chatId, teamId }: idKeys & { teamId: string }) {
    const model = await TeamsModel.findOne({ where: { chatId: encryptData(`${chatId}`), teamId } });

    if (!model) {
        return null;
    }

    const data = model.get();

    return { ...data, teamName: decryptData(data.teamName), chatId: decryptData(data.chatId) };
}

export async function addTeam({ teamName, ...ids }: TeamQueryPayload) {
    const { chatId, userId } = ids;

    const hasAccess = await checkUserAdminStatus(ids);

    if (!hasAccess) {
        return await bot.sendMessage(userId, ERRORS.youAreNotAdmin);
    }

    if (!isTruthy(teamName)) {
        return await bot.sendMessage(userId, ERRORS.dataCorrupted);
    }

    const teamId = uId();
    return await TeamsModel.create({
        id: generateRandomNumber(),
        chatId: encryptData(`${chatId}`),
        teamName: encryptData(teamName),
        teamId,
    });
}

export async function deleteTeam({
    userId,
    chatId,
    teamId,
    messageId,
    userName,
}: TeamQueryPayload) {
    const hasAccess = await checkUserAdminStatus({ userId, chatId, messageId, userName });

    if (!hasAccess) {
        return await bot.sendMessage(userId, ERRORS.youAreNotAdmin);
    }

    const model = await TeamsModel.findOne({ where: { chatId: encryptData(`${chatId}`), teamId } });

    if (!model) {
        return await bot.sendMessage(userId, ERRORS.teamNotFound);
    }

    return await model
        .destroy()
        .then(async () => await bot.sendMessage(userId, NOTIFICATIONS.recordDeleted));
}

export async function updateTeam(args: TeamQueryPayload) {
    const { teamName, teamId, userId } = args;

    const hasAccess = await checkUserAdminStatus(args);

    if (!hasAccess) {
        return await bot.sendMessage(userId, ERRORS.youAreNotAdmin);
    }

    if (!teamName) {
        return await bot.sendMessage(userId, ERRORS.dataCorrupted);
    }

    if (!isDefined(teamId)) {
        const model = await TeamsModel.findOne({
            where: { teamName: encryptData(teamName) },
        });

        return model
            ? await bot.sendMessage(userId, ERRORS.alreadyInTeam)
            : await addTeam(args).then(
                  async () => await bot.sendMessage(userId, NOTIFICATIONS.newRecord)
              );
    }

    const model = await TeamsModel.findOne({ where: { teamId } });

    if (!model) {
        return await bot.sendMessage(userId, ERRORS.teamNotFound);
    }

    model.set({ teamName: encryptData(teamName) });

    return await model
        .save()
        .then(async () => await bot.sendMessage(userId, NOTIFICATIONS.recordUpdated));
}

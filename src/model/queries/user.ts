import { decryptData, encryptData } from '@utils/encryption';
import { Model, Op } from 'sequelize';

import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { deleteLastMessage } from '@src/controller';
import {
    generateRandomNumber,
    getRandomRecord,
    idKeys,
    isDefined,
    isNotNil,
    Licenses,
    Teams,
    User,
    UserGroups,
} from '@src/utils';

import { bot } from '../index';
import { LicensesModel, TeamsModel, UserGroupsModel, UserModel } from '../models';

type UserPayload = Partial<Pick<UserGroups, 'teamId'>> & idKeys & { vacationDate?: Date | null };

export async function convertAllData() {
    const licensesModel = await LicensesModel.findAll();
    const userModel = await UserModel.findAll();
    const userGroupsModel = await UserGroupsModel.findAll();
    const teamsModel = await TeamsModel.findAll();

    for (const model of licensesModel) {
        const data = model.get();

        const newData: Licenses = {
            ...data,
            chatId: isNotNil(data.chatId) ? encryptData(data.chatId) : data.chatId,
        };

        model.set(newData);

        await model.save();
    }

    for (const model of teamsModel) {
        const data = model.get();

        const newData: Teams = {
            ...data,
            teamName: isNotNil(data.teamName) ? encryptData(data.teamName) : data.teamName,
            chatId: isNotNil(data.chatId) ? encryptData(data.chatId) : data.chatId,
        };

        model.set(newData);

        await model.save();
    }

    for (const model of userModel) {
        const data = model.get();

        const newData: User = {
            ...data,
            userId: isNotNil(data.userId) ? encryptData(data.userId) : data.userId,
            name: isNotNil(data.name) ? encryptData(data.name) : data.name,
        };

        model.set(newData);

        await model.save();
    }

    for (const model of userGroupsModel) {
        const data = model.get();

        const newData: UserGroups = {
            ...data,
            userId: isNotNil(data.userId) ? encryptData(data.userId) : data.userId,
            chatId: isNotNil(data.chatId) ? encryptData(data.chatId) : data.chatId,
        };

        model.set(newData);

        await model.save();
    }
}

/** Функция получения информации о пользователе */
export async function getUserInfo({ userId }: idKeys) {
    const user = await UserModel.findOne({ where: { userId: encryptData(`${userId}`) } });

    if (!user) {
        return null;
    }

    const data = user.get();

    return {
        ...data,
        name: decryptData(data.name),
        userId: decryptData(data.userId),
    };
}

export async function getTeamUsersList({ teamId, chatId }: idKeys & { teamId: string }) {
    const usersModel = await UserModel.findAll({
        include: {
            model: UserGroupsModel,
            where: { teamId, chatId: encryptData(`${chatId}`) },
        },
    });

    if (!usersModel) {
        return [];
    }

    return usersModel.map((model) => `@${decryptData(model.get().name)}`);
}

export async function checkUserAdminStatus({ chatId, userId }: idKeys) {
    const chatAdmins = await bot.getChatAdministrators(chatId);

    return !!chatAdmins.find((admin) => admin.user.id === userId);
}

export async function getUserTeamInfo({
    userId,
    chatId,
    teamId: outerTeamId,
}: idKeys & { teamId?: string }) {
    const userModel = await UserGroupsModel.findOne({
        where: { userId: encryptData(`${userId}`), chatId: encryptData(`${chatId}`) },
    });

    if (!userModel) {
        return null;
    }

    const { teamId } = userModel.get();

    const teamsModel = await TeamsModel.findOne({
        where: { chatId: encryptData(`${chatId}`), teamId: outerTeamId || teamId },
    });

    if (!teamsModel) {
        return null;
    }

    const data = teamsModel.get();

    return {
        ...data,
        chatId: decryptData(data.chatId),
        teamName: decryptData(data.teamName),
    };
}

export async function getUsersMention({
    teamId, // Прокидываем teamId, если выбираем для меншенов конкретную группу
    ...ids
}: idKeys & { teamId?: string }) {
    const { userId, chatId } = ids;

    async function sendMsg(msg: string) {
        return await bot.sendMessage(userId, msg);
    }

    // Будет селект всей группы
    const shouldSelectAllUsersFromTeam = !!teamId;

    const userInfo = await getUserInfo(ids);
    const userTeamInfo = await getUserTeamInfo({ ...ids, teamId });

    if (!userTeamInfo || !userInfo) {
        return sendMsg(ERRORS.userNotFound);
    }

    const usersFromSameTeam = await UserModel.findAll({
        include: {
            model: UserGroupsModel,
            required: true,
            where: { chatId: encryptData(`${chatId}`), teamId: userTeamInfo.teamId },
        },
        where: {
            userId: {
                [Op.ne]: encryptData(`${userId}`),
            },
            isOnVacation: {
                [Op.ne]: true,
            },
        },
    });

    if (shouldSelectAllUsersFromTeam) {
        return usersFromSameTeam
            .map((user) => {
                const data = user.get();

                return `@${decryptData(data.name)}`;
            })
            .join(', ');
    }

    const firstUser = usersFromSameTeam.length > 0 ? getRandomRecord(usersFromSameTeam) : undefined;

    const secondUser = await getRandomUserFromAnotherTeam(chatId, userTeamInfo.teamId);

    if (!secondUser) {
        return undefined;
    }

    if (!firstUser) {
        const randomUser = await getRandomUserFromAnotherTeam(
            chatId,
            userTeamInfo.teamId,
            secondUser.userId
        );

        return `${randomUser ? `@${randomUser.name}` : ''} @${secondUser.name}`;
    }

    return `@${firstUser.name} @${secondUser.name}`;
}

async function addUser({
    teamId,
    userModel,
    userGroupModel,
    ...ids
}: idKeys & {
    teamId?: string;
    userModel: Model | null;
    userGroupModel: Model | null;
}) {
    const { userId, userName, chatId } = ids;

    async function createUser() {
        return await UserModel.create({
            id: generateRandomNumber(),
            userId: encryptData(`${userId}`),
            name: encryptData(userName),
            isOnVacation: false,
            endVacationDateTime: null,
        });
    }

    async function createUserGroupRecord(model: Model) {
        const { userId } = model.get();

        const hasTeamId = isDefined(teamId);

        return hasTeamId
            ? await UserGroupsModel.create({
                  id: generateRandomNumber(),
                  chatId: encryptData(`${chatId}`),
                  userId,
                  teamId,
              })
            : await bot.sendMessage(userId, ERRORS.dataCorrupted);
    }

    async function finishFlow() {
        await bot.sendMessage(userId, NOTIFICATIONS.newRecord);
        return await deleteLastMessage(ids);
    }

    async function createError(reason: unknown) {
        return await bot.sendMessage(userId, `${ERRORS.errorOccurred} ${reason}`);
    }

    if (!isNotNil(userModel)) {
        return await createUser().then(createUserGroupRecord).then(finishFlow).catch(createError);
    }

    if (isNotNil(userModel) && !isNotNil(userGroupModel)) {
        return await createUserGroupRecord(userModel).then(finishFlow).catch(createError);
    }

    return await createError(ERRORS.dataCorrupted).then(() => deleteLastMessage(ids));
}

export async function updateUser({ teamId, vacationDate, ...ids }: UserPayload) {
    const { userId, userName, chatId } = ids;

    const shouldUpdateVacation = isDefined(vacationDate);

    if (!isDefined(userName)) {
        return await bot.sendMessage(userId, ERRORS.pleaseSetNickName);
    }

    const userModel = await UserModel.findOne({
        where: { userId: encryptData(`${userId}`) },
    });

    // один чат - одна группа
    const userGroupModel = await UserGroupsModel.findOne({
        where: { chatId: encryptData(`${chatId}`), userId: encryptData(`${userId}`) },
    });

    if (!userModel || !userGroupModel) {
        return await addUser({
            ...ids,
            teamId,
            userModel,
            userGroupModel,
        });
    }

    if (userGroupModel.get().teamId === teamId) {
        await bot.sendMessage(userId, ERRORS.alreadyInTeam);
        return await deleteLastMessage(ids);
    }

    if (shouldUpdateVacation) {
        const fieldsToSetUserModel: Partial<User> = {
            isOnVacation: isNotNil(vacationDate),
            endVacationDateTime: isNotNil(vacationDate) ? vacationDate : null,
        };

        userModel.set(fieldsToSetUserModel);
    }

    userGroupModel.set({
        teamId,
        chatId: encryptData(`${chatId}`),
        userId: encryptData(`${userId}`),
    });

    try {
        await userModel
            .save()
            .then(async () => await userGroupModel.save())
            .then(async () => await bot.sendMessage(userId, NOTIFICATIONS.recordUpdated));
    } catch (reason) {
        await bot.sendMessage(userId, `${ERRORS.errorOccurred} ${reason}`);
    }
    return await deleteLastMessage(ids);
}

export async function deleteUser({ userId, chatId }: idKeys) {
    const userGroupsModel = await UserGroupsModel.findOne({
        where: { userId: encryptData(`${userId}`), chatId: encryptData(`${chatId}`) },
    });

    async function removeUser() {
        const userModel = await UserModel.findOne({
            where: { userId: encryptData(`${userId}`) },
        });

        if (userModel) {
            await userModel.destroy();
        }
    }

    async function checkHasUserGroups() {
        const userGroups = await UserGroupsModel.findAll({
            where: {
                userId: encryptData(`${userId}`),
            },
        });

        return userGroups.length > 0;
    }

    isNotNil(userGroupsModel) &&
        (await userGroupsModel
            .destroy()
            .then(async () => {
                const hasUserGroups = await checkHasUserGroups();
                !hasUserGroups && (await removeUser());
            })
            .then(async () => await bot.sendMessage(chatId, NOTIFICATIONS.userDeleted)));
}

/** Функция получения случайного пользователя из другой команды */
export async function getRandomUserFromAnotherTeam(
    chatId: number,
    teamId: string,
    excludeId?: string
) {
    const extra = excludeId ? { userId: { [Op.ne]: encryptData(excludeId) } } : undefined;

    await checkForExpiredVacations();

    const anotherTeamUsers = await UserModel.findAll({
        include: {
            model: UserGroupsModel,
            required: true,
            where: {
                chatId: encryptData(`${chatId}`),
                teamId: {
                    [Op.ne]: teamId,
                },
            },
        },
        where: {
            isOnVacation: {
                [Op.ne]: true,
            },
            ...extra,
        },
    });

    if (anotherTeamUsers.length === 0) {
        return null;
    }

    if (anotherTeamUsers.length === 1) {
        const data = anotherTeamUsers[0].get();

        return {
            ...data,
            userId: decryptData(data.userId),
            name: decryptData(data.name),
        };
    }

    return getRandomRecord(anotherTeamUsers);
}

export async function checkForExpiredVacations() {
    const currentDate = new Date();

    const expiredVacationUsers = await UserModel.findAll({
        where: {
            isOnVacation: true,
            endVacationDateTime: {
                [Op.lt]: currentDate,
            },
        },
    });

    return expiredVacationUsers.map(async (userModel) => {
        userModel.set({ isOnVacation: false, endVacationDateTime: null });

        return await userModel.save();
    });
}

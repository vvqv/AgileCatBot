import { TeamsModel, UserGroupsModel, UserModel } from '@db/models';
import { Team, User } from '@db/types';
import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { bot } from '@src/db';
import { ApiResponse } from '@src/models';
import { generateRandomNumber, getRandomRecord, isDefined, isNotNil } from '@src/utils';
import { decryptData, encryptData } from '@utils/encryption';
import { Model, Op } from 'sequelize';

/** Функция получения информации о пользователе */
export async function getUserInfo({ userId }: { userId: string }) {
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

export async function getTeamUsersList({ teamId, chatId }: { teamId: string; chatId: string }) {
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

export async function checkUserAdminStatus({ chatId, userId }: { chatId: string; userId: string }) {
    const chatAdmins = await bot.getChatAdministrators(chatId);

    return !!chatAdmins.find((admin) => `${admin.user.id}` === userId);
}

export async function getUserTeamInfo({
    userId,
    chatId,
}: {
    userId?: string;
    chatId: string;
}): Promise<ApiResponse<Team>> {
    const userModel = await UserGroupsModel.findOne({
        where: { userId: encryptData(`${userId}`), chatId: encryptData(`${chatId}`) },
    });

    if (!userModel) {
        return {
            error: ERRORS.userNotFound,
        };
    }

    const { teamId } = userModel.get();

    const teamsModel = await TeamsModel.findOne({
        where: { chatId: encryptData(`${chatId}`), teamId },
    });

    if (!teamsModel) {
        return {
            error: ERRORS.teamNotFound,
        };
    }

    const team = teamsModel.get();

    return {
        data: {
            ...team,
            chatId: decryptData(team.chatId),
            teamName: decryptData(team.teamName),
        },
    };
}

export async function getUsersMention({
    // teamId, // Прокидываем teamId, если выбираем для меншенов конкретную группу
    ...ids
}: {
    chatId: string;
    userId: string;
}) {
    const { userId, chatId } = ids;

    async function sendMsg(msg: string) {
        return await bot.sendMessage(userId, msg);
    }

    // Будет селект всей группы
    // const shouldSelectAllUsersFromTeam = !!teamId;

    const userInfo = await getUserInfo(ids);

    //FIXME: Подумать как будем селектить всю группу не прокидывая teamId. Новый метод api?
    const { data: userTeamInfo } = await getUserTeamInfo({ userId, chatId });

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

    // if (shouldSelectAllUsersFromTeam) {
    //     return usersFromSameTeam
    //         .map((user) => {
    //             const data = user.get();
    //
    //             return `@${decryptData(data.name)}`;
    //         })
    //         .join(', ');
    // }

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
}: {
    userId: string;
    chatId: string;
    userName: string;
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
        return await bot.sendMessage(userId, NOTIFICATIONS.newRecord);
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

    return await createError(ERRORS.dataCorrupted);
}

export async function updateUser({
    teamId,
    isOnVacation,
    ...ids
}: {
    userId: string;
    chatId: string;
    userName: string;
    teamId: string;
    isOnVacation: boolean;
}) {
    const { userId, userName, chatId } = ids;

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
        return await bot.sendMessage(userId, ERRORS.alreadyInTeam);
    }

    const fieldsToSetUserModel: Partial<User> = {
        isOnVacation,
        endVacationDateTime: null,
    };

    if (isOnVacation) {
        const endVacationDate = new Date();
        endVacationDate.setDate(endVacationDate.getDate() + 7);

        fieldsToSetUserModel.endVacationDateTime = endVacationDate;
    }

    userModel.set(fieldsToSetUserModel);
    userGroupModel.set({
        teamId,
        chatId: encryptData(`${chatId}`),
        userId: encryptData(`${userId}`),
    });

    try {
        return await userModel
            .save()
            .then(async () => await userGroupModel.save())
            .then(async () => await bot.sendMessage(userId, NOTIFICATIONS.recordUpdated));
    } catch (reason) {
        return await bot.sendMessage(userId, `${ERRORS.errorOccurred} ${reason}`);
    }
}

export async function deleteUser({
    userId,
    chatId,
}: {
    userId: string;
    chatId: string;
    userName: string;
}) {
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
        (await userGroupsModel.destroy().then(async () => {
            const hasUserGroups = await checkHasUserGroups();
            !hasUserGroups && (await removeUser());
        }));
}

/** Функция получения случайного пользователя из другой команды */
export async function getRandomUserFromAnotherTeam(
    chatId: string,
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

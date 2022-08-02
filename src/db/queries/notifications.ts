import { ChatId, UserId } from '@db/types';
import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { bot } from '@src/db';
import { generateRandomNumber, isNotNil, isTruthy } from '@src/utils';
import { decryptData, encryptData } from '@utils/encryption';
import uId from 'uniqid';

import { ChatNotificationsModel, UserNotificationsModel } from '../models';

type NotificationsType = any;

type NotificationsPayload = {
    title: string;
    description: string;
    endDate: Date;
    startDate?: Date;
};

export async function selectNotifications({
    userId,
    chatId,
    type,
}: ChatId & UserId & NotificationsType) {
    const models =
        type === 'personal'
            ? await UserNotificationsModel.findAll({ where: { userId: `${userId}` } })
            : await ChatNotificationsModel.findAll({ where: { chatId: `${chatId}` } });

    if (models.length === 0) {
        return [];
    }
    return models.map((model) => {
        const data = model.get();
        return {
            title: decryptData(data.title),
            description: decryptData(data.description),
            notificationId: data.notificationId,
            startTime: data.startDateTime,
            endTime: data.endDateTime,
        };
    });
}

export async function manageNotificationById(id: string, shouldDelete?: boolean) {
    const personalNotification = await UserNotificationsModel.findOne({
        where: { notificationId: id },
    });
    const publicNotification = await ChatNotificationsModel.findOne({
        where: { notificationId: id },
    });

    const notificationModel = isNotNil(personalNotification)
        ? personalNotification
        : isNotNil(publicNotification)
        ? publicNotification
        : null;

    if (isNotNil(notificationModel) && shouldDelete) {
        await notificationModel.destroy();
        return null;
    }

    if (!isNotNil(notificationModel)) {
        return null;
    }

    const data = notificationModel.get();

    if ('chatId' in data) {
        const { chatId, description, title, ...restData } = data;
        return {
            ...restData,
            chatId: decryptData(chatId),
            description: decryptData(description),
            title: decryptData(title),
        };
    }

    const { userId, description, title, ...restData } = data;

    return {
        ...restData,
        userId: decryptData(userId),
        description: decryptData(description),
        title: decryptData(title),
    };
}

export async function deleteNotification({
    userId,
    type,
    notificationId,
}: UserId & NotificationsType & { notificationId: string }) {
    const model =
        type === 'personal'
            ? await UserNotificationsModel.findOne({
                  where: { notificationId: `${notificationId}` },
              })
            : await ChatNotificationsModel.findOne({
                  where: { notificationId: `${notificationId}` },
              });

    if (!isTruthy(model)) {
        return bot.sendMessage(userId, ERRORS.notificationNotFound);
    }

    return model.destroy().then(async () => {
        // const manager = await notifyManager;
        // await manager.cancel({ name: notificationId });
        return await bot.sendMessage(userId, NOTIFICATIONS.recordDeleted);
    });
}

export async function createNotification({
    title,
    description,
    endDate,
    startDate,
    userId,
    chatId,
    type,
    daysCount,
    hoursCount,
}: UserId &
    ChatId &
    NotificationsPayload &
    NotificationsType & { daysCount?: number; hoursCount?: number }) {
    const startDateTime = startDate || new Date();

    const notificationId = uId();

    const payload = {
        notificationId,
        title: encryptData(title),
        description: encryptData(description),
        startDateTime,
        endDateTime: new Date(endDate),
        repeatedDaysAmount: daysCount,
        repeatedHoursAmount: hoursCount,
    };

    async function createScheduleJob(_id: string) {
        // await defineJob({
        //     name: notificationId,
        //     message: encryptData(description),
        //     chatId: encryptData(`${id}`),
        //     startDate: startDateTime,
        //     endDate,
        //     daysCount,
        //     hoursCount,
        // });

        return await bot.sendMessage(userId, NOTIFICATIONS.newRecord);
    }

    return type === 'personal'
        ? await UserNotificationsModel.create({
              id: generateRandomNumber(),
              ...payload,
              userId: encryptData(`${userId}`),
          })
              .then(async () => await createScheduleJob(userId))
              .catch(async () => await bot.sendMessage(userId, ERRORS.dataCorrupted))
        : await ChatNotificationsModel.create({
              id: generateRandomNumber(),
              ...payload,
              chatId: encryptData(`${chatId}`),
          })
              .then(async () => await createScheduleJob(chatId))
              .catch(async () => await bot.sendMessage(userId, ERRORS.dataCorrupted));
}

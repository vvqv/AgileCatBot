import { ChatId, UserId } from '@db/types';
import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { isNotNil } from '@src/utils';
import { encryptData } from '@utils/encryption';
import { Op } from 'sequelize';

import { bot } from '../index';
import { LicensesModel } from '../models';

export async function verifyLicenseInfo({
    chatId,
    licenseKey,
}: ChatId & {
    licenseKey?: string;
}) {
    const currentDate = new Date();

    if (licenseKey) {
        const model = await LicensesModel.findOne({
            where: {
                licenseKey: `${licenseKey}`,
            },
        });

        const data = model?.get();

        return data
            ? {
                  isValid: data?.expirationDate ? data.expirationDate > currentDate : true,
                  validUntil: data.expirationDate,
                  isAvailable: !data.chatId,
              }
            : {};
    }

    const activeLicenses = await LicensesModel.findOne({
        where: {
            chatId: encryptData(`${chatId}`),
        },
    });

    if (!activeLicenses) {
        return {};
    }

    const { expirationDate } = activeLicenses.get();

    const isLicenseActive = expirationDate ? expirationDate > currentDate : true;

    return {
        isValid: isLicenseActive,
        validUntil: expirationDate ? expirationDate : 'Вечная лицензия',
    };
}

export async function registerLicenseKey({
    chatId,
    licenseKey,
    userId,
}: ChatId &
    UserId & {
        licenseKey: string;
    }) {
    const model = await LicensesModel.findOne({ where: { licenseKey } });

    if (!model) {
        return await bot.sendMessage(userId, ERRORS.licenseDenied);
    }
    // TODO: Сделать механизм генерации ключей и установки срока годности
    model.set({ licenseKey, chatId: encryptData(`${chatId}`), expirationDate: null });

    return await model.save().then(() => bot.sendMessage(userId, NOTIFICATIONS.licenseAccepted));
}

export async function getVerifiedChats() {
    const models = await LicensesModel.findAll({
        where: {
            chatId: {
                [Op.not]: null,
            },
            licenseKey: {
                [Op.not]: null,
            },
        },
    });

    return models.reduce<string[]>((acc, model) => {
        const { chatId } = model.get();

        if (isNotNil(chatId)) {
            return [...acc, chatId];
        }

        return acc;
    }, []);
}

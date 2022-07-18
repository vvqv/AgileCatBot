import { encryptData } from '@utils/encryption';

import { ERRORS, NOTIFICATIONS } from '@src/constants';
import { idKeys } from '@src/utils';

import { bot } from '../index';
import { LicensesModel } from '../models';

export async function verifyLicenseInfo({ chatId, licenseKey }: idKeys & { licenseKey?: string }) {
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
}: idKeys & { licenseKey: string }) {
    const model = await LicensesModel.findOne({ where: { licenseKey } });

    if (!model) {
        return await bot.sendMessage(userId, ERRORS.licenseDenied);
    }
    // TODO: Сделать механизм генерации ключей и установки срока годности
    model.set({ licenseKey, chatId: encryptData(`${chatId}`), expirationDate: null });

    return await model.save().then(() => bot.sendMessage(userId, NOTIFICATIONS.licenseAccepted));
}

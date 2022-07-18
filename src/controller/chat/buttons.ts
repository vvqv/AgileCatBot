import { createKeyboard } from '@utils/keyboards';

import { getUserInfo, verifyLicenseInfo } from '@src/model';
import { idKeys, isNotNil, KeyboardItem } from '@src/utils';

import { licenseMenu, mainMenu, reviewMenu } from './constants';

export async function getMainMenuButtons(keys: idKeys): Promise<KeyboardItem[][]> {
    const data = await verifyLicenseInfo(keys);

    if (!data?.isValid) {
        return createKeyboard({ items: licenseMenu });
    }

    const user = await getUserInfo(keys);

    if (!isNotNil(user)) {
        return createKeyboard({
            items: mainMenu,
        });
    }

    const vacationButtons = await getVacationButtons(keys);

    const buttons = [...reviewMenu, ...mainMenu];

    return createKeyboard({ items: buttons, extraButtons: [vacationButtons] });
}

export async function getVacationButtons(keys: idKeys): Promise<KeyboardItem[]> {
    const user = await getUserInfo(keys);

    if (!user) {
        return [];
    }

    return [
        {
            text: `${user.isOnVacation ? 'Выключить' : 'Включить'} режим отпуска \u{1F334}`,
            callback_data: `${user.isOnVacation ? 'disable' : 'enable'}_vacation`,
        },
    ];
}

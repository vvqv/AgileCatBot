import { COMMANDS } from '@src/constants';
import { selectNotifications } from '@src/model';
import { idKeys, KeyboardItem } from '@src/utils';

import { getBackButton, quitButton } from '../chat/constants';

import { NotificationsType } from './index';

export async function getNotificationListKeyboard({
    type,
    ...keys
}: idKeys & NotificationsType): Promise<KeyboardItem[][]> {
    const notifications = await selectNotifications({ ...keys, type });

    function createActionButtons(id: string): KeyboardItem[] {
        return [
            { text: '\u{2139}', callback_data: `show_notification ${type} ${id}` },
            { text: '\u{274C}', callback_data: `delete_notification ${type} ${id}` },
        ];
    }

    const addButton = [
        {
            text: `${COMMANDS.create}  \u{2795}`,
            callback_data: `create_notification ${type}`,
        },
    ];

    const keyboard = notifications.map(({ title, notificationId }) => {
        return [
            { text: title, callback_data: notificationId },
            ...createActionButtons(notificationId),
        ];
    });

    const controls = [...quitButton, ...getBackButton('main')];

    return [...keyboard, addButton, controls];
}

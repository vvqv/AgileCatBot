import { manageNotifications } from '@src/controller';
import { bot } from '@src/model';
import { getCallbackQueryData, idKeys, Menus } from '@src/utils';

import { deleteLastMessage, selectAction } from '../chat';
import { manageTeams } from '../teams';

export type WithGoTo = { goTo?: Menus };

export async function navigateTo({ menuItem, ...keys }: idKeys & { menuItem: string }) {
    switch (menuItem as Menus) {
        case 'manage_teams': {
            return await manageTeams(keys);
        }

        case 'manage_notifications': {
            return await manageNotifications(keys);
        }

        case 'main':
        default: {
            return await selectAction(keys);
        }
    }
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    switch (data) {
        case 'quit': {
            return await deleteLastMessage(ids);
        }

        default: {
            const shouldGoBack = data.includes('go_back');

            if (shouldGoBack) {
                const [, menuItem] = data.split(' ');
                return await navigateTo({ ...ids, menuItem });
            }
        }
    }
});

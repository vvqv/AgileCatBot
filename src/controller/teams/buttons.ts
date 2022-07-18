import { createKeyboard } from '@utils/keyboards';

import { COMMANDS } from '@src/constants';
import { checkUserAdminStatus, getTeams } from '@src/model';
import { idKeys, KeyboardItem } from '@src/utils';

import { getBackButton, quitButton } from '../chat/constants';

export async function getManageTeamsButtons({
    selector,
    withBackButton = true,
    ...ids
}: idKeys & { selector: string; withBackButton?: boolean }): Promise<KeyboardItem[][]> {
    const teams = await getTeams(ids);

    const hasAccess = await checkUserAdminStatus(ids);

    if (hasAccess) {
        function createActionButtons(teamId: string): KeyboardItem[] {
            return [
                { text: `\u{2139}`, callback_data: `get_info_team ${teamId}` },
                { text: `\u{270F}`, callback_data: `edit_team ${teamId}` },
                { text: `\u{274C}`, callback_data: `delete_team ${teamId}` },
            ];
        }

        const addButton = [{ text: `${COMMANDS.addTeam} \u{2795}`, callback_data: 'add_team' }];

        const keyboard = teams.map(([key, value]) => [
            { text: value, callback_data: `${selector} ${key}` },
            ...createActionButtons(key),
        ]);

        const backButton = withBackButton ? getBackButton('main') : [];

        const controls = [...quitButton, ...backButton];

        return [...keyboard, addButton, controls];
    }

    return createKeyboard({
        items: selector ? teams.map(([key, value]) => [`${selector} ${key}`, value]) : teams,
        goTo: withBackButton ? 'main' : undefined,
    });
}

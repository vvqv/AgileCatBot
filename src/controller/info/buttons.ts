import { createKeyboard } from '@utils/keyboards';

import { idKeys, KeyboardItem } from '@src/utils';

import { getManageTeamsButtons } from '../teams/buttons';

import { infoMenu } from './constants';

export async function getInfoButtons(keys: idKeys): Promise<KeyboardItem[][]> {
    const keyboard = createKeyboard({ items: infoMenu, withActionButton: false });
    const teamsKeyboard = await getManageTeamsButtons({ ...keys, selector: 'get_info_team' });

    return [...keyboard, ...teamsKeyboard];
}

import { getBackButton, quitButton } from '@controller/chat/constants';

import { WithGoTo } from '@src/controller';

import { KeyboardItem } from '../types';

export function createKeyboard({
    items,
    goTo,
    extraButtons,
    withActionButton = true,
}: {
    items: string[][];
    extraButtons?: KeyboardItem[][];
    withActionButton?: boolean;
} & WithGoTo): KeyboardItem[][] {
    const keyboard: KeyboardItem[][] = [];

    function modifyItem(key: string, value: string) {
        const item: KeyboardItem[] = [{ text: value, callback_data: key }];
        keyboard.push(item);
    }

    items.forEach(([key, value]) => modifyItem(key, value));

    extraButtons &&
        extraButtons.map((buttons) => {
            keyboard.push(buttons);
        });

    const actionButtons = withActionButton
        ? goTo
            ? [...quitButton, ...getBackButton(goTo)]
            : quitButton
        : [];

    keyboard.push(actionButtons);

    return keyboard;
}

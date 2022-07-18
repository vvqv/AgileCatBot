import { createKeyboard } from '@utils/keyboards';

import { COMMANDS } from '@src/constants';
import { isDefined, KeyboardItem } from '@src/utils';

import { WithGoTo } from '../navigation';

import {
    ActionsTypes,
    ChangeAction,
    getTimePickerData,
    timeParts,
    TimeParts,
    TimeValues,
    transformTimeValues,
} from './timepicker';

function getActionButton({
    type,
    values,
    timePart,
}: {
    type?: ActionsTypes;
    values?: TimeValues;
    timePart?: TimeParts;
}): KeyboardItem {
    if (isDefined(type) && isDefined(timePart) && isDefined(values)) {
        return {
            text: type === 'plus' ? '\u{1F53C}' : '\u{1F53D}',
            callback_data: `timepicker_change_values ${
                type === 'plus' ? 'plus' : 'minus'
            } ${timePart} ${transformTimeValues(values)}`,
        };
    }

    return {
        text: '­',
        callback_data: 'time_null',
    };
}

function getTimeValueButtons(values: TimeValues) {
    return Object.keys(values).reduce<KeyboardItem[]>((acc, cur) => {
        acc.push({ text: String(values[cur as TimeParts]), callback_data: 'time_null' });
        return acc;
    }, []);
}

export function createTimePickerButtons({
    values,
    changeAction,
}: {
    values?: TimeValues;
    changeAction?: ChangeAction;
}) {
    const { currentValues, currentTime } = getTimePickerData({ values, action: changeAction });

    const topRowButtons = timeParts.map((part) =>
        getActionButton({ type: 'plus', timePart: part, values: currentValues })
    );
    const bottomRowButtons = timeParts.map((part) =>
        getActionButton({ type: 'minus', timePart: part, values: currentValues })
    );

    const timeValueButtons: KeyboardItem[] = getTimeValueButtons(currentValues);

    return {
        keyboard: [topRowButtons, timeValueButtons, bottomRowButtons],
        currentTime,
    };
}

export function createControlButtons({
    selectAction,
    currentTime,
    goTo,
}: {
    selectAction?: string;
    currentTime?: string;
} & WithGoTo) {
    const actionButtons = createKeyboard({
        items: [],
        extraButtons: [
            [
                { text: COMMANDS.clear, callback_data: 'time_picker_clear' },
                { text: COMMANDS.submit, callback_data: `${selectAction} ${currentTime}` },
            ],
        ],
        withActionButton: false,
    });

    const navButtons = createKeyboard({ items: [], goTo });

    return [...actionButtons, ...navButtons];
}

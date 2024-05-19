import { createKeyboard } from '@utils/keyboards';
import moment from 'moment';

import { ERRORS, TREATMENTS } from '@src/constants';
import { bot } from '@src/model';
import {
    getCallbackQueryData,
    idKeys,
    isDefined,
    KeyboardItem,
    sendWithCommandLine,
    WithCommandLine,
} from '@src/utils';

import { WithGoTo } from '../navigation';

import { getCalendarData } from './calendar';

const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const payload: { action?: string; minDate?: Date; maxDate?: Date } & WithGoTo = {};

function getNavigationButtons({
    year,
    month,
    goTo,
}: {
    month: number;
    year: number;
} & WithGoTo) {
    const keyboard: KeyboardItem[] = [];

    const { monthNumber, monthText, yearNumber } = getCalendarData({ month, year });

    const prevButton = {
        text: `\u{25c0}`,
        callback_data: `calendar_actions_back ${monthNumber - 1} ${yearNumber}`,
    };
    const nextButton = {
        text: `\u{25b6}`,
        callback_data: `calendar_actions_next ${monthNumber + 1} ${yearNumber}`,
    };

    const yearButton = { text: `${monthText} ${yearNumber}`, callback_data: 'calendar_null' };

    keyboard.push(prevButton);
    keyboard.push(yearButton);
    keyboard.push(nextButton);

    return createKeyboard({
        items: [],
        extraButtons: [keyboard],
        goTo,
    });
}

export function createCalendar({
    selectAction,
    currentMonth,
    currentYear,
    minDate,
    maxDate,
    goTo,
}: {
    selectAction: string;
    currentMonth?: number;
    currentYear?: number;
    minDate?: Date;
    maxDate?: Date;
} & WithGoTo) {
    const { monthCalendar, monthNumber, yearNumber } = getCalendarData({
        month: currentMonth,
        year: currentYear,
    });

    const month: Array<string[] | number[]> = [days, ...monthCalendar];

    function isDateAvailable(day: number): KeyboardItem {
        const defaultItem = {
            text: `${day}`,
            callback_data: `${selectAction} ${day} ${monthNumber} ${yearNumber}`,
        };
        const restrictedItem = { text: '­', callback_data: 'calendar_null' };
        const currentDate = new Date(yearNumber, monthNumber, day);

        return (isDefined(maxDate) && maxDate < currentDate) ||
            (isDefined(minDate) && minDate > currentDate)
            ? restrictedItem
            : defaultItem;
    }

    const monthDaysKeyboard: KeyboardItem[][] = month.map((week) => {
        return week.map((day) => {
            return typeof day === 'string'
                ? { text: day, callback_data: 'calendar_null' }
                : day === 0
                ? { text: '­', callback_data: 'calendar_null' }
                : isDateAvailable(day);
        });
    });

    return [
        ...monthDaysKeyboard,
        ...getNavigationButtons({ year: yearNumber, month: monthNumber, goTo }),
    ];
}

export async function selectDate({
    minDate = new Date(moment().year(), moment().month()),
    maxDate = new Date(moment().year() + 1, 1),
    fromCommandLine = false,
    action,
    monthTo,
    yearTo,
    goTo,
    ...ids
}: idKeys & {
    action: string;
    monthTo?: number;
    yearTo?: number;
    minDate?: Date;
    maxDate?: Date;
} & WithGoTo &
    WithCommandLine) {
    payload.action = action;
    payload.goTo = goTo;
    payload.minDate = minDate;
    payload.maxDate = maxDate;

    const keyboard = createCalendar({
        selectAction: action,
        currentMonth: monthTo,
        currentYear: yearTo,
        maxDate,
        minDate,
        goTo: payload.goTo,
    });

    return await sendWithCommandLine({
        fromCommandLine,
        messageText: TREATMENTS.selectDate,
        keyboard,
        ...ids,
    });
}

bot.on('callback_query', async (msg) => {
    const { data, ...ids } = getCallbackQueryData(msg);

    const shouldGoBack = data?.includes('calendar_actions_back');
    const shouldGoNext = data?.includes('calendar_actions_next');
    const isWrongButton = data?.includes('calendar_null');

    if (shouldGoNext || shouldGoBack) {
        const [, monthNumber, yearNumber] = data.split(' ');

        return await selectDate({
            ...ids,
            action: payload.action || 'calendar_null',
            monthTo: Number(monthNumber),
            yearTo: Number(yearNumber),
            minDate: payload.minDate,
            maxDate: payload.maxDate,
            goTo: payload.goTo,
        });
    }

    if (isWrongButton) {
        await bot.sendMessage(ids.userId, ERRORS.wrongCalendarDate);
    }
});

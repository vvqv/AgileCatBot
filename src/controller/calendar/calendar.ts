import { Calendar } from 'calendar';

import { isDefined } from '@src/utils';

export function getCalendarData({ month, year }: { month?: number; year?: number }) {
    const calendar = new Calendar(1);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let monthNumber = isDefined(month) ? month : currentMonth;
    let yearNumber = isDefined(year) ? year : currentYear;

    if (monthNumber < 0) {
        monthNumber = monthNumber + 12;
        yearNumber--;
    }

    if (monthNumber > 11) {
        monthNumber = monthNumber - 12;
        yearNumber++;
    }

    const monthNamesArray = [
        'Янв.',
        'Фев.',
        'Март',
        'Апр.',
        'Май',
        'Июнь',
        'Июль',
        'Авг.',
        'Сен.',
        'Окт.',
        'Ноя.',
        'Дек.',
    ];
    const monthText = monthNamesArray[monthNumber];
    const monthCalendar = calendar.monthDays(yearNumber, monthNumber);

    return { monthCalendar, monthText, monthNumber, yearNumber, currentMonth, currentYear };
}

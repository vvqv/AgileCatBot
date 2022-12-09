import { version } from 'package-json';

import { COMMANDS } from '@src/constants';
import { KeyboardItem, Menus } from '@src/utils';

export const reviewMenu = [
    ['review_pr', `${COMMANDS.requestReview} \u{270D}`],
    ['specific_team_review', `${COMMANDS.specificTeamReview} \u{1F465}`],
    ['change_reviewer', `${COMMANDS.changeReviewer} \u{1F502}`],
];

export const notificationsMenu = [
    ['manage_notifications', `${COMMANDS.manageNotifications} \u{1F514}`],
];

export const mainMenu = [
    ['get_info', `${COMMANDS.getInfo} \u{2139}`],
    ['manage_teams', `${COMMANDS.selectTeam} \u{1F464}`],
];

export const licenseMenu = [
    ['set_license', COMMANDS.enterLicenseKey],
    ['get_license', COMMANDS.getLicenseKey],
];

export const quitButton: KeyboardItem[] = [{ text: `\u{1F51A}`, callback_data: 'quit' }];

export const aboutBotButton: KeyboardItem[] = [
    { text: `${COMMANDS.getBotInfo} \u{1F638}`, callback_data: 'about_bot' },
];

export function getBackButton(menuItem: Menus): KeyboardItem[] {
    return [{ text: `\u{1F519}`, callback_data: `go_back ${menuItem}` }];
}

export function getMainMenuMessage() {
    return `Мяу! Вас приветствует Agile Cat \u{1F638}\n Текущая версия: ${version}\nВыбери действие:`;
}

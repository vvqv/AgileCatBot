import TelegramBot from 'node-telegram-bot-api';

export type Options =
    | 'quit'
    | 'get_info'
    | 'enable_vacation'
    | 'disable_vacation'
    | 'change_reviewer'
    | 'review_pr'
    | 'specific_team_review'
    | 'get_license'
    | 'set_license'
    | 'manage_teams'
    | 'add_team'
    | 'about_me'
    | 'all_teams'
    | 'create_notification'
    | 'manage_notifications'
    | 'public_notifications'
    | 'personal_notifications'
    | string;

export const menuItems = [
    'main',
    'select_team',
    'manage_teams',
    'manage_notifications',
    'select_notification_date',
    'select_notification_time',
] as const;

export type Menus = typeof menuItems[number];

export type User = {
    id: number;
    userId: string;
    name: string;
    isOnVacation: boolean;
    endVacationDateTime: Date | null;
};

export type UserGroups = {
    id: number;
    userId: string;
    chatId: string;
    teamId: string;
};

export type Licenses = {
    id: number;
    licenseKey: string;
    chatId: string;
    expirationDate: Date | null;
};

export type Teams = {
    id: number;
    chatId: string;
    teamName: string;
    teamId: string;
};

export type UserNotifications = {
    id: number;
    notificationId: string;
    title: string;
    description: string;
    userId: string;
    startDateTime: Date;
    endDateTime: Date;
    repeatedDaysAmount: number | null;
    repeatedHoursAmount: number | null;
};

export type ChatNotifications = {
    id: number;
    notificationId: string;
    title: string;
    description: string;
    chatId: string;
    startDateTime: Date;
    endDateTime: Date;
    repeatedDaysAmount: number | null;
    repeatedHoursAmount: number | null;
};

export type idKeys = {
    chatId: number;
    userId: number;
    messageId: number;
    userName: string;
};

export type KeyboardItem = TelegramBot.InlineKeyboardButton;

export type WithCommandLine = { fromCommandLine?: boolean };

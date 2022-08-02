export type UserId = Pick<User, 'userId'>;
export type ChatId = Pick<UserGroup, 'chatId'>;
export type UserName = Pick<User, 'name'>;

export type User = {
    id: number;
    userId: string;
    name: string;
    isOnVacation: boolean;
    endVacationDateTime: Date | null;
};

export type UserGroup = {
    id: number;
    userId: string;
    chatId: string;
    teamId: string;
};

export type License = {
    id: number;
    licenseKey: string | null;
    chatId: string | null;
    expirationDate: Date | null;
};

export type Team = {
    id: number;
    chatId: string;
    teamName: string;
    teamId: string;
};

export type UserNotification = {
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

export type ChatNotification = {
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

import { Team, User } from '@db/types';

export type ApiResponse<T> = {
    data?: T;
    error?: string;
};

export type UserInfo = Pick<User, 'userId' | 'name'>;
export type TeamInfo = Pick<Team, 'teamName' | 'teamId'>;

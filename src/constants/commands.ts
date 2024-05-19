import { COMMANDS } from '@constants/messages';
import { BotCommand } from 'node-telegram-bot-api';

export const commands = {
    start: ['/start'],
    info: ['/info'],
    change: ['/change'],
    review: ['/review'],
    vacation: ['/vacation'],
    reviewCommand: ['/team'],
};

export const setBotCommands: BotCommand[] = [
    {
        command: '/start',
        description: COMMANDS.initBot,
    },
    {
        command: '/review',
        description: COMMANDS.requestReview,
    },
    {
        command: '/team',
        description: COMMANDS.specificTeamReview,
    },
    {
        command: '/change',
        description: COMMANDS.changeReviewer,
    },
    {
        command: '/vacation',
        description: COMMANDS.enableVacation,
    },
    {
        command: '/info',
        description: COMMANDS.getInfo,
    },
];

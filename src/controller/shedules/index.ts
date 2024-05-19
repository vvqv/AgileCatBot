import { decryptData } from '@utils/encryption';
import { Agenda, Job } from 'agenda';
import moment from 'moment-timezone';
import { MongoClient } from 'mongodb';

import config from '@src/config';
import { TZ } from '@src/constants';
import { bot, manageNotificationById } from '@src/model';
import { isDefined, isNotNil, isTruthy } from '@src/utils';

export const notifyManager = getNotifyAgendaManager();

async function getNotifyAgendaManager() {
    const client = new MongoClient(`mongodb://${config.AGENDA_DB_HOST}/${config.AGENDA_DB_NAME}`, {
        auth: { username: `${config.AGENDA_DB_USER}`, password: `${config.AGENDA_DB_PASS}` },
    });

    await client.connect().catch((err) => {
        throw new Error(err);
    });

    const db = client.db();
    db.collection('jobs');

    return new Agenda({
        mongo: db,
        processEvery: '5 seconds',
    });
}

export async function defineJob({
    name,
    ...data
}: {
    name: string;
    message: string;
    chatId: string;
    startDate: Date;
    endDate: Date;
    daysCount?: number;
    hoursCount?: number;
}) {
    const agenda = await notifyManager;

    agenda.define(name, async (job: Job) => {
        const data = job.attrs.data;

        if (!isDefined(data)) {
            return;
        }

        const { chatId, message, daysCount, hoursCount } = data;

        await bot.sendMessage(decryptData(chatId), decryptData(message));

        const shouldDeleteNotification = !isTruthy(daysCount) && !isTruthy(hoursCount);

        if (shouldDeleteNotification) {
            await manageNotificationById(name, true);
            await job.remove();
        }
    });

    const job = agenda.create(name, data);

    job.unique({ name });

    const { hoursCount, daysCount, endDate } = data;

    const date = moment(endDate).tz(TZ, true).toDate();

    if (hoursCount || daysCount) {
        job.schedule(date);

        job.repeatEvery(`${hoursCount || daysCount} ${hoursCount ? 'hours' : 'days'}`, {
            skipImmediate: true,
            timezone: TZ,
        });

        await job.save();
    } else {
        job.schedule(date);

        await job.save();
    }
}

async function reDefineJob({ agenda, name }: { agenda: Agenda; name: string }) {
    agenda.define(name, async (job: Job) => {
        const data = job.attrs.data;

        if (!isDefined(data)) {
            return;
        }

        const { chatId, message, daysCount, hoursCount } = data;

        await bot.sendMessage(chatId, message);

        const shouldDeleteNotification = !isTruthy(daysCount) && !isTruthy(hoursCount);

        if (shouldDeleteNotification) {
            await manageNotificationById(name, true);
            await job.remove();
        }
    });
}

export async function restoreJobs() {
    moment.locale('ru');

    const manager = await notifyManager;

    await manager.start();

    const jobs = await manager.jobs();

    for (const job of jobs) {
        const id = job.attrs.name;

        /**
         * Проверяем, есть ли id нотификации в БД
         * */
        const data = await manageNotificationById(id);

        if (isNotNil(data)) {
            /**
             * Если событие валидно, создаем новую джобу, т.к джобе нужен коллбек
             * Если невалидно - удаляем нотификацию из БД
             * */

            await reDefineJob({
                name: id,
                agenda: manager,
            });
        }
    }
}

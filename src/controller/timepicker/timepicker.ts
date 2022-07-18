import { isDefined } from '@src/utils';

export const timeParts = ['hours1', 'hours2', 'minutes1', 'minutes2'] as const;
export type TimeParts = typeof timeParts[number];
export type ActionsTypes = 'plus' | 'minus' | 'reset';

export type TimeValues = Record<TimeParts, number>;
export type ChangeAction = { type: ActionsTypes; part: TimeParts };

const initialValues: TimeValues = { hours1: 0, hours2: 0, minutes1: 0, minutes2: 0 };

export function transformTimeValues(v: string): TimeValues;
export function transformTimeValues(v: TimeValues): number[][];
export function transformTimeValues(v: number[][]): TimeValues;
export function transformTimeValues(values: TimeValues | number[][] | string) {
    if (typeof values === 'string') {
        const [h1, h2, m1, m2] = values.split(',');

        return {
            hours1: Number(h1),
            hours2: Number(h2),
            minutes1: Number(m1),
            minutes2: Number(m2),
        };
    }

    if (Array.isArray(values)) {
        return {
            hours1: values[0][0],
            hours2: values[0][1],
            minutes1: values[1][0],
            minutes2: values[1][1],
        };
    }

    return [
        [values.hours1, values.hours2],
        [values.minutes1, values.minutes2],
    ];
}

export function getTimePickerData({
    values = initialValues,
    action,
}: {
    values?: TimeValues;
    action?: ChangeAction;
}) {
    const defaultValues = {
        currentValues: initialValues,
        currentTime: undefined,
    };

    if (!isDefined(action)) {
        return defaultValues;
    }

    const newValues = isDefined(values) ? { ...values } : initialValues;

    const { type, part } = action;

    if (type === 'reset') {
        return defaultValues;
    }

    Object.keys(newValues).map((key) => {
        if (key === part) {
            const currentValue = newValues[key];
            const h1 = newValues.hours1.toString();
            const h2 = newValues.hours2.toString();
            const m1 = newValues.minutes1.toString();
            const m2 = newValues.minutes2.toString();

            switch (part) {
                case 'hours1': {
                    newValues[key] =
                        h1.match(/[0-1]/) && type === 'plus'
                            ? currentValue + 1
                            : currentValue > 0 && type === 'minus'
                            ? currentValue - 1
                            : currentValue;

                    newValues.hours2 =
                        newValues.hours1 > 1 && !h2.match(/[0-3]/) && type === 'plus'
                            ? 3
                            : newValues.hours2;

                    break;
                }

                case 'hours2': {
                    newValues[key] =
                        ((h1.match(/[0-1]/) && h2.match(/[0-8]/)) || h2.match(/[0-2]/)) &&
                        type === 'plus'
                            ? currentValue + 1
                            : currentValue > 0 && type === 'minus'
                            ? currentValue - 1
                            : currentValue;

                    break;
                }

                case 'minutes1': {
                    newValues[key] =
                        m1.match(/[0-4]/) && type === 'plus'
                            ? currentValue + 1
                            : newValues.minutes1 > 0 && type === 'minus'
                            ? currentValue - 1
                            : currentValue;

                    break;
                }

                case 'minutes2': {
                    newValues[key] =
                        m2.match(/[0-8]/) && type === 'plus'
                            ? currentValue + 1
                            : newValues.minutes2 > 0
                            ? currentValue - 1
                            : currentValue;
                    break;
                }
            }
        }
    });

    const hours = `${newValues.hours1}${newValues.hours2}`;
    const minutes = `${newValues.minutes1}${newValues.minutes2}`;
    const today = new Date();
    today.setHours(Number(hours));
    today.setMinutes(Number(minutes));

    return {
        currentValues: newValues,
        currentTime: `${today.getUTCHours()}:${today.getUTCMinutes()}`,
    };
}

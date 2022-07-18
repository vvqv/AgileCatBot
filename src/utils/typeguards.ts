export function isTruthy<T>(value: T): value is Exclude<T, undefined | null | 0 | false | ''> {
    return !!value;
}

export function isNotNil<T>(value: T): value is Exclude<T, undefined | null> {
    return value !== undefined && value !== null;
}

export function isDefined<T>(value: T): value is Exclude<T, undefined> {
    return value !== undefined;
}

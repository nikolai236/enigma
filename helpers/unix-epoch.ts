import { SECOND } from "./time-utils";

export function dateToUnixEpoch(date: Date) {
    return Number(date) / SECOND;
}

export function unixEpochToDate(unixEpoch: number) {
    return new Date(unixEpoch * SECOND);
}
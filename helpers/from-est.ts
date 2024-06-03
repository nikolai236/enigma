import * as moment from 'moment-timezone';
import { SECOND } from './time-utils';
import { UTCTimestamp } from 'lightweight-charts';
import { dateToUnixEpoch, unixEpochToDate } from './unix-epoch';

export function getMidnightOpen(unixEpoch: number): Date;
export function getMidnightOpen(date: Date): Date;
export function getMidnightOpen(arg: Date|number) {
    if (!(arg instanceof Date)) {
        arg = new Date(arg * SECOND);
    }
    return fromEST(arg, 0, 0);
}

export function toEst(unixEpoch: UTCTimestamp): [number, number] {
    const nyTime = moment
        .utc(unixEpochToDate(unixEpoch))
        .tz('America/New_York');

    return [nyTime.hour(), nyTime.minute()];
}

export function fromEST(unixEpoch: UTCTimestamp, hours: number, minutes?: number): UTCTimestamp;
export function fromEST(date: Date, hours: number, minute?: number): Date;
export function fromEST(date: Date|UTCTimestamp, hours: number, minutes=0) {

    const returnUnixEpoch = typeof date === 'number';
    if (returnUnixEpoch) {
        date = unixEpochToDate(date as UTCTimestamp);
    }

    const ret = moment
        .utc(date)
        .tz('America/New_York')
        .hours(hours)
        .minutes(minutes)
        .toDate();

    return returnUnixEpoch ? dateToUnixEpoch(ret) : ret;
}

export function isDuringDST(date: Date) {
    return moment
        .utc(date)
        .tz('America/New_York')
        .isDST();
}
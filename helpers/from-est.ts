import * as moment from 'moment-timezone';
import { SECOND } from './time-utils';

export function getMidnightOpen(unixEpoch: number): Date;
export function getMidnightOpen(date: Date): Date;
export function getMidnightOpen(arg: Date|number) {
    if (!(arg instanceof Date)) {
        arg = new Date(arg * SECOND);
    }
    return fromEST(arg, 0, 0);
}

export function fromEST(date: Date, hours: number, minutes=0) {
    return moment
        .utc(date)
        .tz('America/New_York')
        .hours(hours)
        .minutes(minutes)
        .toDate()
}
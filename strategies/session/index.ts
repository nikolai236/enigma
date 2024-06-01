import { UTCTimestamp } from "lightweight-charts";
import { MINUTE, DAY, fromEST, SECOND, unixEpochToDate, dateToUnixEpoch } from "../../helpers";

const invalidInputErr = new Error(
    'Invalid input'
);

class Session {
    public start: [number, number];
    public end: [number, number];

    constructor(
        start: [number, number] | number,
        end: [number, number] | number,
    ) {
        if ([start, end].some(
            e => Array.isArray(e) ? e.length !== 2 : typeof e !== 'number')
        ) {
            throw invalidInputErr;
        }

        this.start = Array.isArray(start) ? start : [start, 0];
        this.end = Array.isArray(end) ? end : [end, 0];

        const hours = [this.start, this.end].map(e => e[0]);
        const minutes = [this.start, this.end].map(e => e[1])

        if (hours.some(h => h < 0 || h > 24)) {
            throw invalidInputErr;
        }

        if (minutes.some(m => m < 0 || m > 59)) {
            throw invalidInputErr;
        }
    }

    isTimePointInSession(time: UTCTimestamp) {
        const { start, end } = this.getStartEndTimes(time);
        return start > time && time < end;
    }

    getPricePointsOnlyDuringSession(times: UTCTimestamp[]) {
        return times.filter(t => this.isTimePointInSession(t));
    }

    getStartEndTimes(time: UTCTimestamp) {
        const endTime = (this.start[0] > this.end[0] ?
            time + DAY / SECOND : time) as UTCTimestamp;

        const start = fromEST(time, ...this.start);
        const end = fromEST(endTime, ...this.end);
        // console.log(fromEST(unixEpochToDate(time), ...this.start))

        return { start, end };
    }

    getStartEndFromArray(times: UTCTimestamp[]) {
        let [currTime] = times;
        const lastTime = times.at(-1)!;

        const ret: { start: UTCTimestamp, end: UTCTimestamp }[] = [];

        while(currTime < lastTime) {
            const { start, end } = this.getStartEndTimes(currTime);
            console.log(unixEpochToDate(currTime), unixEpochToDate(start))

            if (ret.length !== 0) {
                ret.push({ start, end });
                // @ts-ignore
                currTime += DAY/SECOND as UTCTimestamp;
                continue;
            }

            if (start >= currTime) {
                ret.push({ start, end });
            }

            currTime = start + DAY/SECOND as UTCTimestamp;
        }

        return ret;
    }
}

export const extendedSilverBulletSession = new Session([9, 30], 11);
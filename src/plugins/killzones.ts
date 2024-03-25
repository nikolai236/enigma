import { Candle } from "../../types/ohlcv";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function toETDate(unixEpoch: number) {
    return new Date((new Date(unixEpoch)).toLocaleString(
        'en-US', { timeZone: 'America/New_York' },
    ));
}

function getKillZoneIntervals(data: Candle[]) {
    const intervalStart = new Date(data.at(0 )!.time).setHours(0, 0, 0, 0);
    const intervalEnd   = new Date(data.at(-1)!.time).setHours(0, 0, 0, 0);

    const killzones: { [key: string]: [number, number] }[] = [];

    for(let currTime=intervalStart; currTime<=intervalEnd; currTime += DAY) {
        killzones.push({
            nyo: [currTime + 8 * HOUR + 30 * MINUTE, currTime + 11 * HOUR],
        })
    }
}
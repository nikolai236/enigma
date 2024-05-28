import { CandleRange } from "./candle-range";
import { DAY, SECOND, dateToUnixEpoch, getMidnightOpen, isDuringDST } from "../../helpers";
import { Candle, PDEnum } from "../../types/ohlcv";

export * from './candle-range';

export function getDailyRanges(candles: Candle[]) {
	const rangesObject = candles
		.map(c => [c, getMidnightOpen(c.time).toString()] as [Candle, string])
		.filter(([_, mno], _i, arr) => mno !== arr.at(0)?.[1] &&  mno !== arr.at(-1)?.[1])
		.reduce<{ [k: string]: Candle[] }>((ret, [c, key]) => ({
			...ret,
			[key]: key in ret ? [...ret[key], c] : [c],
		}), {});

	return Object.entries(rangesObject)
		.map(([k, e]) => new DailyRange(new Date(k), e))
		.sort((a, b) => a.openTime - b.openTime);
}

export function checkDRPDForTimePoints(toCheck: { time: number; }[], allCandles: Candle[]) {
	const pds: PDEnum[] = [];
	const dailyRanges = getDailyRanges(allCandles);

	let i = 0;
	let j = 0;

	while(i < dailyRanges.length && j < toCheck.length) {
		const dr = dailyRanges[i];
		const { time } = toCheck[j];

		if (!dr.contains(time)) {
			i++;
			continue;
		}

		const pd = dr.getPremiumDiscountAtTime(time);
		pds.push(pd);
		j++;
	}

	// if (pds.length !== toCheck.length) {
	// 	throw new Error('Invalid input');
	// }

	const mnos = dailyRanges.map(dr => dr.openTime);
	return { pds, mnos };
}

export class DailyRange extends CandleRange {
	constructor(openTime: Date, candles: Candle[]) {
		super(DAY, openTime, candles, false);
	}
}
import { CandleRange } from "./candle-range";
import { DAY, getMidnightOpen } from "../../helpers";
import { Candle, PDEnum } from "../../types/ohlcv";

export * from './candle-range';

export function getDailyRanges(candles: Candle[]): CandleRange[] {
	const rangesObject = candles
		.map(c => [c, getMidnightOpen(c.time).toString()] as [Candle, string])
		.reduce((ret, [c, key]) => ({
			...ret,
			[key]: ret[key] ? [...ret[key], c] : [c],
		}), {});

	return Object.keys(rangesObject)
		.map(k => new DailyRange(new Date(k), rangesObject[k]))
		.sort((a, b) => a.openTime - b.openTime);
}

export function checkDRPDForTimePoints(toCheck: { time: number; }[], allCandles: Candle[]) {
	const pds = [] as PDEnum[];
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

	if (pds.length !== toCheck.length) {
		throw new Error('Invlaid input');
	}

	const mnos = dailyRanges.map(dr => dr.open);
	return { pds, mnos };
}

export class DailyRange extends CandleRange {
	constructor(openTime: Date, candles: Candle[]) {
		super(DAY, openTime, candles);
	}
}
import { readdir, readFile } from 'fs/promises';
import { resolve, join } from "path";
import { Candle, TimeFrameEnum, TimeFrame } from "../../types/ohlcv";

export async function getData(contractDir: string): Promise<{ [tf in TimeFrameEnum]?: Candle[] }>
export async function getData(contractDir: string, specificTf: TimeFrame): Promise<Candle[]>
export async function getData(contractDir: string, specificTf?: TimeFrame) {

	const tfs = getTimeframes()
		.filter(tf => specificTf == null || tf == specificTf);
	
	const data = await Promise.all(tfs.map(async tf => {
		const fileName = (await readdir(contractDir))
			.find(f => f.endsWith('_' + tf + '.ohlcv'))!;

		const buff = await readFile(join(contractDir, fileName));
		const data = readOHLCV(buff.toString('binary'));

		return { key: tf, data };
	}));

	const ret = data.reduce<{ [tf in TimeFrameEnum]?: Candle[] }>(
		(obj, { key, data}) => ({ ...obj, [key]: data }), {}
	);

	return specificTf !== undefined ? ret[specificTf] : ret;
}

function readOHLCV(csvString: string) {
	return csvString
		.split('\n')
		.filter(row => row != '')
		.map(row => row
			.split(',')
			.map(s => isNaN(Number(s)) ? s : Number(s))
		).map(([date, open, high, low, close, volume]) => ({
			time: stringToUTCDate(date as string),
			open,
			high,
			low,
			close,
			volume,
		})) as Candle[];
}

function stringToUTCDate(date: string): number {
	const obj = new Date(date);
	return Date.UTC(
		obj.getUTCFullYear(),
		obj.getUTCMonth(),
		obj.getUTCDate(),
		obj.getUTCHours(),
		obj.getUTCMinutes(),
		obj.getUTCSeconds(),
	) / 1000;
}

export function getTimeframes() {
	return Object
		.values(TimeFrameEnum)
		.map(e => e.replace('_', '')) as TimeFrame[];
}

export function isTimeFrameValid(str: string): str is TimeFrame {
	return (new Set(getTimeframes())).has(str as TimeFrame);
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
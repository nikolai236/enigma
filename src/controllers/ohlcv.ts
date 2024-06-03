import { readdir, readFile } from 'fs/promises';
import { resolve, join } from "path";
import { Candle, TimeFrameEnum, TimeFrame } from "../../types/ohlcv";
import { getContractExpiration } from '../macros/contracts';

export async function getCandlesticks(contractName: string, assetDir: string): Promise<{ [tf in TimeFrameEnum]?: Candle[] }>
export async function getCandlesticks(contractName: string, assetDir: string, specificTf: TimeFrame): Promise<Candle[]>
export async function getCandlesticks(contractName: string, assetDir: string, specificTf?: TimeFrame) {

	const [_, contractMonth] = contractName.split('_');
	const contractDir = join(assetDir, contractName);

	const expiration = getContractExpiration(contractMonth) + DAY;
	const tfs = getTimeframes()
		.filter(tf => specificTf == null || tf == specificTf);

	const ret: { [tf in TimeFrameEnum]?: Candle[] } = {};
	await Promise.all(tfs.map(async tf => {

		const fileName = (await readdir(contractDir))
			.find(f => f.endsWith('_' + tf + '.ohlcv'))!;

		const buff = await readFile(join(contractDir, fileName));
		const candles = readOHLCV(buff.toString('binary'))
			.filter(c => c.time < expiration / SECOND);

		ret[tf] = candles;
	}));

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
	return (new Set<string>(getTimeframes())).has(str);
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
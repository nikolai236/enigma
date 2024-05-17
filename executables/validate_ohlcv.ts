import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { TimeFrameEnum } from '../types/ohlcv';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

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

function readCSV(csvString: string) {
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
		}));
}

function getTFs() {
	return Object
		.values(TimeFrameEnum)
		.map(e => e.replace('_', '')) as TimeFrameEnum[];
}

export function nominationToInterval(nomination: string) {
	const obj = { D: 0, H: 0, m: 0, s: 0 };
	nomination
		.split(',')
		.forEach((e) => {
			const key = e.slice(-1);
			obj[key] = Number(e.slice(0, -1));
		});

	return obj.D * DAY + obj.H * HOUR + obj.m * MINUTE + obj.s * SECOND;
}

async function areTfsParallel(contractDir: string) {
	const data = {};
	await Promise.all(getTFs().map(async tf => {
		const fileName = (await readdir(contractDir))
			.find(f => f.endsWith(tf + '.ohlcv'))!;

		const buff = await readFile(
			join(contractDir, fileName)
		);

		data[tf] = readCSV(buff.toString('binary'));
	}));

	for(const candle of data['4H']) {
		
	}
}
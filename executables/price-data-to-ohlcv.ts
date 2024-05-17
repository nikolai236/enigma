import { createReadStream, createWriteStream } from 'fs';
import { parse } from 'csv-parse';
import { join, basename } from 'path';
import { nominationToInterval, MINUTE } from "./merge-ask-bid-files";

class Candle {
	high: number;
	low: number;
	close: number;

	constructor(
		public closeTime: number,
		public volume: number,
		public open: number
	) {
		this.high  = open;
		this.low   = open;
		this.close = open;
	}

	supplementData(volume: number, price: number) {
		this.volume += volume;

		this.low = Math.min(price, this.low);
		this.high = Math.max(price, this.high);
		this.close = price;
	}
}

async function getCandlestickData(fileName: string, interval=5*MINUTE) {
	const candles: Candle[] = [];

	await new Promise<void>(resolve => createReadStream(fileName)
		.pipe(parse())
		.on('data', (row) => {

			const [ dateTime, price, volume ] = row as [string, string, string];
			const [ date, time ] = dateTime.split('T');

			const [ year, month, day,      ] = date.split('-').map(s => Number(s));
			const [ hour, minutes, seconds ] = time.split(':').map(s => Number(s));

			const rowDate = Date.UTC(
				year, month - 1, day, hour, minutes, seconds
			);

			if(candles.length !== 0 && rowDate < candles.at(-1)!.closeTime) {
				candles
					.at(-1)!
					.supplementData(Number(volume), Number(price));
				return;
			}

			candles.push(new Candle(
				rowDate - (rowDate % interval) + interval,
				Number(volume),
				Number(price),
			));
		})
		.on('end', () => resolve())
	);

	return candles;
}

export async function loadOHLCVFile(
	inputFile: string, outputFolder: string, intervalStr: string
) {
	const interval = nominationToInterval(intervalStr);
	const candleData = await getCandlestickData(inputFile, interval);

	const name = basename(inputFile);
	const out = join(outputFolder, `${name}_${intervalStr}.ohlcv`);

	const stream = createWriteStream(out, { flags: 'w' });
	const drain = () => new Promise<void>(r => stream.once('drain', () => r()));

	for(const { open, high, low, close, closeTime, volume } of candleData) {
		const iso = new Date(Number(closeTime) - interval)
			.toISOString()
			.split('.')[0];

		const priceData = [open, high, low, close]
			.map(s => s.toFixed(5))
			.join();

		const row = `${iso},${priceData},${volume}\n`;

		stream.write(row) || await drain();
	}
	stream.end();
}

if(require.main === module) {
	const [_a, _b, inp, out, intervalStr] = process.argv;
	loadOHLCVFile(inp, out, intervalStr);
}
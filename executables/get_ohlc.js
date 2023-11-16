const { createReadStream, createWriteStream } = require('fs');
const { parse } = require('csv-parse');
const { join } = require('path');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

class Candle {
    constructor(closeTime, volume, open) {
        this.closeTime = closeTime;
        this.volume = volume;

        this.open  = open;
        this.high  = open;
        this.low   = open;
        this.close = open;
    }

    addPriceData(volume, price) {
        this.volume += volume;

        this.low = Math.min(price, this.low);
        this.high = Math.max(price, this.high);
        this.close = price;
    }
}

async function getCandlestickData(fileName, interval=5*MINUTE) {
    const candles = [];

    await new Promise(resolve => createReadStream(fileName)
        .pipe(parse())
        .on('data', (row) => {

            const [ dateTime, price, volume ] = row;
            const [ date, time ] = dateTime.split('T');

            const [ year, month, day,      ] = date.split('-').map(s => Number(s));
            const [ hour, minutes, seconds ] = time.split(':').map(s => Number(s));

            const rowDate = Date.UTC(
                year, month - 1, day, hour, minutes, seconds
            );
            if(
                candles.length === 0 ||
                rowDate >= candles.at(-1).closeTime
            ) {

                const newCloseTime = rowDate - (rowDate % interval) + interval;

                candles.push(new Candle(
                    newCloseTime, Number(volume), Number(price)
                ));
                return;
            }

            candles.at(-1).addPriceData(Number(volume), Number(price));
        })
        .on('end', () => resolve())
    );

    return candles;
}

async function loadOHLCVFile(inputFile, interval, outputDir='.') {
    const candles = await getCandlestickData(inputFile, interval);
    const outputFile = join(outputDir, 'ohlcv.txt');

    const stream = createWriteStream(outputFile, { flags: 'w' });
    const drain = () => new Promise(r => stream.once('drain', () => r()));

    for(const { open, high, low, close, closeTime, volume } of candles) {
        const iso = new Date(Number(closeTime) - interval)
            .toISOString()
            .split('.')[0];

        const priceData = [open, high, low, close].map(s => s.toFixed(5)).join();
        const row = `${iso},${priceData},${volume}\n`;

        stream.write(row) || await drain();
    }
    stream.end();
}

async function main() {
    const fileName = process.argv[2];
    await loadOHLCVFile(fileName, HOUR);
}
main();
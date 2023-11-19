const { createReadStream, createWriteStream } = require('fs');
const { parse } = require('csv-parse');
const { join, basename } = require('path');
const { nominationToInterval } = require('./merge-ask-bid-files');

class Candle {
    constructor(closeTime, volume, open) {
        this.closeTime = closeTime;
        this.volume = volume;

        this.open  = open;
        this.high  = open;
        this.low   = open;
        this.close = open;
    }

    supplementData(volume, price) {
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

            candles.at(-1).supplementData(Number(volume), Number(price));
        })
        .on('end', () => resolve())
    );

    return candles;
}

async function loadOHLCVFile(inputFile, outputFolder, intervalStr) {
    const interval = nominationToInterval(intervalStr);
    const candleData = await getCandlestickData(inputFile, interval);

    const name = basename(inputFile);
    const out = join(outputFolder, `${name}_${intervalStr}.ohlcv`);

    const stream = createWriteStream(out, { flags: 'w' });
    const drain = () => new Promise(r => stream.once('drain', () => r()));

    for(const { open, high, low, close, closeTime, volume } of candleData) {
        const iso = new Date(Number(closeTime) - interval)
            .toISOString()
            .split('.')[0];

        const priceData = [open, high, low, close].map(s => s.toFixed(5)).join();
        const row = `${iso},${priceData},${volume}\n`;

        stream.write(row) || await drain();
    }
    stream.end();
}

async function main(inp, out, interval) {
    await loadOHLCVFile(inp, out, interval);
}

if(require.main === module) {
    const [_a, _b, inp, out, interval] = process.argv;
    main(inp, out, interval);
}

module.exports = { loadOHLCVFile };
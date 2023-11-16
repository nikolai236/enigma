const { createReadStream } = require('fs');
const { parse } = require('csv-parse');
const { writeFile } = require('fs/promises');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

class Candle {
    constructor(closeTime, ...args) {
        this.closeTime = closeTime;
        this.open = args[0];
        this.high = Math.max(...args);
        this.low = Math.min(...args);
        this.close = args[args.length-1];
    }

    addPriceData(...args) {
        this.low = Math.min(this.low, ...args);
        this.high = Math.max(this.high, ...args);
        this.close = args.at(-1);
    }
}

function isVolumeImbalanceOrGap(candles, idx) {
    if(idx === 0) return false;

    const lastCandle = candles[idx-1];
    const thisCandle = candles[idx];

    const lastCandleBullish = lastCandle.close < lastCandle.open;
    const thisCandleBullish = thisCandle.close < thisCandle.open;

    return (
        (lastCandleBullish && thisCandleBullish && lastCandle.close < thisCandle.open) ||
        (!lastCandleBullish && !thisCandleBullish && lastCandle.close > thisCandle.open)
    );
}

async function readPriceData(interval) {
    const candles = [];

    await new Promise(resolve => createReadStream('./data.txt')
        .pipe(parse())
        .on('data', (data) => {

            const [ date, time, o, m, c, _v ] = data;
            const [ month, day, year       ] = date.split('/').map(s => Number(s));
            const [ hour, minutes, seconds ] = time.split(':').map(s => Number(s));
            const currDate = new Date(Date.UTC(year, month - 1, day, hour, minutes, seconds));

            if(
                candles.length === 0 ||
                currDate >= candles.at(-1).closeTime
            ) {

                const newCloseTime = Number(currDate) - (Number(currDate) % interval) + interval;
                const newCandle = new Candle(
                    new Date(newCloseTime),
                    ...[o, m, c].map(s => Number(s)),
                );

                candles.push(newCandle);
                return;
            }

            candles.at(-1).addPriceData(
                ...[o, m, c].map(s => Number(s))
            );
        }).on('end', () => resolve())
    );

    return candles;
}

async function loadOHLCFile(interval, intervalName) {
    const candles = await readPriceData(interval);
    
    const data = candles.reduce((data, { open, high, low, close, closeTime }, idx) => {
        const date = Number(closeTime) - interval;
        return data += `${new Date(date).toISOString()},${open},${high},${low},${close}\n`;
    }, '');

    await writeFile(
        `${intervalName}-ohlc1.txt`,
        data,
        { flag:'w' }
    );
}

async function main() {
    await loadOHLCFile(15 * MINUTE, '15m');
}

main();
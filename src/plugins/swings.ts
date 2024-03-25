import { Candle } from "../../types/ohlcv";

export function findSwings(data: Candle[]) {
    console.log(data.length)
    let leg: 0|1|2 = 0;

    const highs: (Candle & { idx?: number })[] = [];
    for(let i=1; i<data.length; i++) {
        if(data[i-1].low == data[i].low) continue;

        if(data[i-1].high < data[i].high) {
            leg = 1;
            continue;
        }
        
        if(leg == 1 && data[i-1].high > data[i].high) {
            leg = 0;
            highs.push({ ...data[i-1], idx: i-1 });
            continue;
        }

        leg = 0;
    }

    const lows: (Candle & { idx: number })[] = [];
    for(let i=1; i<data.length; i++) {
        if(data[i-1].low == data[i].low) continue;

        if(data[i-1].low > data[i].low) {
            leg = 1;
            continue;
        }

        if(leg == 1 && data[i-1].low < data[i].low) {
            leg = 0;
            lows.push({ ...data[i-1], idx: i-1 });
            continue;
        }

        leg = 0;
    }

    return { highs, lows };
}
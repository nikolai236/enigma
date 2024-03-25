import { NextFunction, Request, Response, Router } from "express";
import { readdir, readFile } from 'fs/promises';
import { resolve, join } from "path";
import { getContractExpiration, sortContracts } from "../macros/contracts";
import { Candle } from "../../types/ohlcv";
import { findSwings } from "../plugins/swings";

const router = Router();
export default router;

const SECOND = 1000;
let i = 0;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

declare global {
    namespace Express {
        interface Request {
            context: {
                dataFolders?: string[];
                assetDir?: string;
            };
        }
    }
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
        })) as Candle[];
}

function getTFs() {
    return Object
        .values(TimeFrameEnum)
        .map(e => e.replace('_', '')) as TimeFrameEnum[];
}

function getSmallerTF(tf: TimeFrameEnum) {
    const idx = getTFs().indexOf(tf);
    if(idx >= tf.length) return null;
    else return getTFs()[idx+1];
}

enum TimeFrameEnum {
    _4H='4H',
    _1H='1H',
    _15m='15m',
    _5m='5m',
    _1m='1m',
}

function getDrawOnLiquidity(currData: Candle[]) {
    console.log(currData.length)
    const { highs, lows } = findSwings(currData);

    const bullishDOL = highs.at(-1)!;
    const bearishDOL = lows.at( -1)!;

    const currLowestLow = Math.min(
        ...currData.slice(bearishDOL.idx!).map(c => c.low),
    );

    const currrHighestHigh = Math.max(
        ...currData.slice(bullishDOL.idx!).map(c => c.high),
    );

    if(bearishDOL.low > currLowestLow)
        return { bullishDOL, bearishDOL, bullish: true };
    if(bullishDOL.high < currrHighestHigh)
        return { bearishDOL, bullishDOL, bullish: false };

    const distToBullishDOL = bullishDOL.high - currData.at(-1)!.close;
    const distToBearishDOL = currData.at(-1)!.close - bearishDOL.low;

    const DOL = distToBullishDOL > distToBearishDOL ? bullishDOL : bearishDOL;
    return {
        bearishDOL,
        bullishDOL,
        bullish: DOL === bullishDOL,
    };
}

export function nominationToInterval(nomination) {
    const obj = { D: 0, H: 0, m: 0, s: 0 };
    nomination
        .split(',')
        .forEach((e) => {
            const key = e.slice(-1);
            obj[key] = Number(e.slice(0, -1));
        });

    const a = obj.D * DAY + obj.H * HOUR + obj.m * MINUTE + obj.s * SECOND;
    return a;
}

async function getData(assetDir: string, contractName: string, specificTf?: TimeFrameEnum) {
    const contractDir = join(assetDir, contractName);
    if(!contractDir.startsWith(assetDir!)) throw Error('403');

    const ret = {};
    for(const tf of getTFs()) {
        if(specificTf != null && specificTf !== tf) continue;

        const fileName = (await readdir(contractDir))
            .find(f => f.endsWith('_' + tf + '.ohlcv'))!;

        const buff = await readFile(
            join(contractDir, fileName)
        );

        ret[tf] = readCSV(buff.toString('binary'));
    }

    return ret;
}

type CandleDataType = { [key in TimeFrameEnum]: Candle[]; };
type ReverseFunction = (data: Candle[], ctx?: any) => boolean;

function objectEdited(
    original: {[key: string]: any;}, edited: {[key: string]: any;},
) {
    return (
        Object.keys(original).length !== Object.keys(edited).length ||
        Object.keys(original).some(k => {
            return original[k] !== edited[k]
        })
    );
}

// class CandleStickData {
//     constructor(public data) {
//         for(const key in data) {
//             const interval = 
//         }
//     }
// }

class LiquiditySeeker {
    drawOnLiquidity: { [key in TimeFrameEnum]?: Candle; };
    stratCtx: any = {};

    constructor(
        public candleData: CandleDataType,
        public currTf?: TimeFrameEnum,
        public strategy?: { [key in TimeFrameEnum]?: ReverseFunction },
    ) {
        this.drawOnLiquidity = {};
        if(strategy == null) return;

        this.currTf = this.useStrategy(strategy);
    }

    useStrategy(strat: { [key in TimeFrameEnum]?: ReverseFunction }) {
        let firstTf: TimeFrameEnum|null = null;
        for(const tf of getTFs()) {
            if(strat[tf] == null) continue;
            firstTf = tf;
            break;
        }

        if(firstTf == null) throw Error('No tf in input?');
        return firstTf;
    }

    addData(toAdd: CandleDataType) {
        const a = this.candleData[this.currTf!].length
        for(const tf in toAdd) {
            const data = this.candleData[tf] as Candle[];
            const lastAdded = data.at(-1)!.time;

            data.push(
                ...toAdd[tf].slice(toAdd[tf].indexOf(
                    ({ time }) => time > lastAdded,
                )),
            );
        }

        if(this.strategy == null) return true;

        const currTfData = this.candleData[this.currTf!];

        const reverse = this.strategy![this.currTf!]?.(currTfData, this.stratCtx) ?? true;

        if(reverse) {
            console.log(currTfData.length, a, this.currTf)
            const tf = getSmallerTF(this.currTf!);
            if(tf == null) return true;
            this.currTf = tf;
        }
    }

    absorbData(data: CandleDataType) {
        let idx = 0;
        let tf;

        const ret = {
            stopped: [] as number[],
            ctx: [] as any[],
        };
        ret.ctx.push({ ...this.stratCtx });

        while(idx + 1 < data[this.currTf!].length) {
            tf = this.currTf!
            if(objectEdited(ret.ctx.at(-1), this.stratCtx)) {
                ret.ctx.push({ ...this.stratCtx });
            }

            const mainInterval = nominationToInterval(tf);
            const partial = Object.keys(data).reduce((ret, tfKey) => {
                const interval = nominationToInterval(tfKey);
                const n = Math.floor(mainInterval / interval);
                return {
                    ...ret, [tfKey]: data[tfKey].slice(
                        idx * n, (idx + 1) * n
                    ),
                };
            }, {} as CandleDataType);

            const stopStart = this.addData(partial);
            const newInterval = nominationToInterval(this.currTf!);

            if(stopStart) {
                ret.stopped.push(data[this.currTf!][idx].time)
                this.currTf = this.useStrategy(this.strategy!);

                idx = Math.floor(idx * (mainInterval/newInterval)) + 1;
                continue;
            } // this may alter this.currTf

            idx++;
            if(tf !== this.currTf) {
                idx *= (mainInterval/newInterval);
            }
        }

        return ret;
    }
}

async function validateAssetFolder(req: Request, res: Response, next: NextFunction) {
    try {
        const root = resolve('public/ohlcv/');
        const assetDir = join(root, req.params.assetName);

        if(!assetDir.startsWith(root)) return res.sendStatus(403);
        const dataFolders = await readdir(assetDir);

        req.context ??= {};
        Object.assign(
            req.context,
            { dataFolders, assetDir },
        );

        return next();
    } catch(err) {
        console.log(err);
        return res.sendStatus(404);
    }
}

router.use('/:assetName/', validateAssetFolder);

router.get('/:assetName/', async (req, res) => {
    return res.json({
        contracts: sortContracts(
            req.context.dataFolders!
        ),
    });
});

router.get('/:assetName/:contractName/raids/', async (req, res) => {
    return;

    const assetDir = resolve('public/ohlcv', req.params.assetName);
    let data: CandleDataType;
    try {
        data = await getData(
            assetDir, req.params.contractName,
        ) as CandleDataType;
    } catch(err) {
        console.log(err);
        return res.sendStatus(404);
    }

    const expireDate = getContractExpiration(req.params.contractName.split('_')[1]);
    Object.keys(data)
        .forEach(k =>
            data[k] = data[k]
                .filter((candle: Candle) => candle.time * 1000 < expireDate + DAY)
        );

    const { sample, toAdd } = Object.keys(data).reduce((ret, tf) => {
        const idx = 4 * HOUR / nominationToInterval(tf)
        return {
            ...ret,
            sample: {
                ...ret.sample,
                [tf]: [...data[tf].slice(0, idx).map(e => ({ ...e }))]
            },
            toAdd: {
                ...ret.toAdd,
                [tf]: [...data[tf].slice(idx).map(e => ({ ...e }))]
            }
        }
    }, {
        sample: {} as CandleDataType,
        toAdd:  {} as  CandleDataType,
    });

    const takeLiquidity = (candles: Candle[], ctx: { bearishDOL?: Candle; bullishDOL?: Candle; bullish?: boolean; }) => {
        let { bearishDOL, bullishDOL, bullish } = ctx;
        if(bearishDOL == null || bullishDOL == null || bullish == null) {
            console.log(candles.length);
            ({ bearishDOL, bullishDOL, bullish } = getDrawOnLiquidity(candles));

            const curr = candles.at(-1);

            Object.assign(ctx, {
                bearishDOL, bullishDOL, bullish, curr
            });
        }

        const DOL = bullish ? bullishDOL : bearishDOL;
        const reverse = bullish ?
            candles.at(-1)!.high >= DOL.high :
            candles.at(-1)!.low  <= DOL.low;

        if(reverse) {
            Object.keys(ctx).forEach(k => delete ctx[k]);
        }
        return reverse;
    }

    const isFVG = (candles: Candle[]) => {
        const isBullish = (candleIdx: number) =>
            candles.at(candleIdx)!.open > candles.at(candleIdx)!.close;
    
        return isBullish(-2) ?
            candles.at(-3)!.high < candles.at(-1)!.low :
            candles.at(-3)!.low  > candles.at(-1)!.high;
    }

    const seeker = new LiquiditySeeker(sample, undefined, {
        '15m': takeLiquidity,
        // '5m': isFVG,
    });

    const ret = seeker.absorbData(toAdd);
    return res.json(ret);
});

router.get('/:assetName/:contractName/:timeframe/', async (req, res) => {

    const assetDir = resolve('public/ohlcv', req.params.assetName);
    let data: Candle[];
    try {
        data = (await getData(
            assetDir,
            req.params.contractName,
            req.params.timeframe as TimeFrameEnum
        ))[req.params.timeframe];
    } catch(err) {
        console.log(err);
        return res.sendStatus(404);
    }

    const expireDate = getContractExpiration(req.params.contractName.split('_')[1]);
    data = data.filter(candle => candle.time * 1000 < expireDate + DAY);

    return res.json({ candleData: data });
});
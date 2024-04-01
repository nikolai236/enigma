import { NextFunction, Request, Response, Router } from "express";
import { readdir, readFile } from 'fs/promises';
import { resolve, join } from "path";
import { getContractExpiration, sortContracts } from "../macros/contracts";
import { Candle } from "../../types/ohlcv";

const router = Router();
export default router;

const SECOND = 1000;
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

enum TimeFrameEnum {
    _4H='4H',
    _1H='1H',
    _15m='15m',
    _5m='5m',
    _1m='1m',
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
    console.log(contractDir)
    if(!contractDir.startsWith(assetDir!)) throw new Error('Unauthorized');
    console.log(contractDir)

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

router.get('/:assetName/:contractName/:timeframe/', async (req, res) => {
    const assetDir = resolve('public/ohlcv', req.params.assetName);
    let data: Candle[];
    try {
        data = (await getData(
            assetDir,
            req.params.contractName,
            req.params.timeframe as TimeFrameEnum
        ))[req.params.timeframe];
        if (data == null) throw new Error('couldnt get data')
    } catch(err) {
        console.log(err);
        return res.sendStatus(404);
    }

    const expireDate = getContractExpiration(req.params.contractName.split('_')[1]);
    data = data.filter(candle => candle.time * 1000 < expireDate + DAY);

    return res.json({ candleData: data });
});
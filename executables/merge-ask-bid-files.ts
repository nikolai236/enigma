import { WriteStream, createWriteStream } from 'fs';
import { readFile, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { gunzip } from 'zlib';
import { SingleBar, Presets } from 'cli-progress';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function toETDate(unixEpoch: number) {
    return new Date((new Date(unixEpoch)).toLocaleString(
        'en-US', { timeZone: 'America/New_York' },
    ));
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

export function getIntervalNomination(interval: number) {
    const nameObj = {
        D: Math.floor(   interval / DAY),
        H: Math.floor((  interval % DAY) / HOUR),
        m: Math.floor((( interval % DAY) % HOUR) / MINUTE),
        s: Math.floor((((interval % DAY) % HOUR) % MINUTE) / SECOND)
    };

    return Object.entries(nameObj)
        .filter(([_, value]) => value != 0)
        .map(([key, value]) => `${value}${key}`)
        .join()
}

async function readGzip(data: Buffer) {
    const decompressed = await new Promise<string>(
        (resolve, reject) => gunzip(
            data,
            (err, decompressed) => {
                if(err != null) return reject(err);
                resolve(decompressed.toString('binary'));
            }
        ),
    );
    return decompressed;
}

type GroupedFileNameEntry = { ASK?: string; BID?: string };

function groupFiles(files: string[]) {
    const grouped = files.reduce((ret, f) => {
        const key = f.replace(/ASK|BID/, '');
        const type = f.split('_').at(-3)!;
        return {
            ...ret,
            [key]: {
                ...ret[key],
                [type]: f,
            },
        }
    }, {});
    return Object.values(grouped) as GroupedFileNameEntry[];
}

async function sortByDate(fileNames: GroupedFileNameEntry[]) {
    const extractDate = ({ ASK , BID }: GroupedFileNameEntry) => {
        const fileName = (ASK ?? BID)!;

        const tmp = fileName.split('_');
        const hours = tmp.at(-1);
        const [ year, month, day ] = tmp
            .at(-2)!
            .split('-')
            .map(s => Number(s));

        return toETDate(Date.UTC(
            year, month - 1, day, Number(hours),
        ));
    };

    return [...fileNames].sort((a, b) => {
        const date1 = extractDate(a);
        const date2 = extractDate(b);
        return Number(date1) - Number(date2);
    });
}

async function writeData(
    askBidData: string[][], interval: number, writer: WriteStream, meanSpread=0, spreadIdx=0
) {
    const typedData = askBidData.map(([type, date, price, volume]) => 
        [type, Number(date), Number(price), Number(volume)]
    );

    const priceData = typedData.reduce((ret, [type, date, price, volume]) => {
        const key = Number(date) - (Number(date) % interval);
        return {
            ...ret,
            [key]: {
                ...ret[key],
                [type]: [
                    ...(ret[key]?.[type] ?? []),
                    [price, volume],
                ],
            }
        };
    }, {} as { [timesatmp: string]: { [type: string]: number[][] }; });

    const rowData = Object.entries(priceData)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([date, { ASK, BID }]) => {
            let price: number;
            if(ASK != null && BID != null) {
                const askSum = ASK.reduce((sum, [price]) => sum + price, 0) / ASK.length;
                const bidSum = BID.reduce((sum, [price]) => sum + price, 0) / BID.length;

                price = (askSum + bidSum) / 2;
                meanSpread = (meanSpread * spreadIdx + askSum - bidSum) / (spreadIdx + 1);
                spreadIdx++;
            } else {
                price =
                    ((ASK ?? BID)?.reduce((sum, [price]) => sum + price, 0) /
                    (ASK ?? BID)?.length);
            }

            const volume = [...(ASK ?? []), ...(BID ?? [])]
                .reduce((sum, [_, volume]) => sum + volume, 0);

            if(isNaN(price)) return null;

            return { date, price, volume, };
        })
        .filter(<nonNull>(e: nonNull|null): e is nonNull => e != null);

    const drainStream = () => new Promise<void>(r => writer.once('drain', () => r()));
    for(const { date, price, volume } of rowData) {

        const iso = new Date(Number(date)).toISOString().split('.')[0];
        const displayPrice = price.toFixed(5);

        writer.write(`${iso},${displayPrice},${volume}\n`) || await drainStream();
    }
}

async function decompressAndMerge(
    groupedFileNames: GroupedFileNameEntry[], intervalStr: string, inpDir: string, out: string
) {
    const porgressBar = new SingleBar({}, Presets.shades_classic);
    porgressBar.start(groupedFileNames.length, 0);

    const interval = nominationToInterval(intervalStr);

    const decompress = async (filename: string|undefined, type: 'ASK'|'BID') => {
        if(filename == null) return [];

        const path = join(inpDir, filename);
        const data = await readFile(path);

        return (await readGzip(data))
            .split('\n')
            .filter(row => row !== '')
            .map(row => [type, ...row.split(',')]);
    }

    const stream = createWriteStream(out, { flags: 'w' });

    for(const { ASK, BID } of groupedFileNames) {
        const [askData, bidData] = await Promise.all([
            decompress(ASK, 'ASK'),
            decompress(BID, 'BID'),
        ]);

        await writeData(
            [...askData, ...bidData],
            interval,
            stream,
        );
        porgressBar.increment();
    }

    stream.end();
    porgressBar.stop();
}

export async function mergeAskBidData(
    files: string[], preffix: string, outDir: string, intervalStr: string
) {
    const inputDirRoot = dirname(files[0]);
    files = files.map(f => basename(f)); // files may be full paths

    const grouped = groupFiles(files);
    const sorted  = await sortByDate(grouped);

    const out = join(outDir, `${preffix}_${intervalStr}`);
    await decompressAndMerge(sorted, intervalStr, inputDirRoot, out);
}

if(require.main === module) {
    const [preffix, intervalStr, inpDir, outDir] = process.argv.slice(2);

    readdir(inpDir)
        .then(async (fileNames) => {
            fileNames = fileNames.filter(n => n.startsWith(preffix));

            await mergeAskBidData(
                fileNames, preffix, outDir, intervalStr
            );
        });
}
const { createWriteStream } = require('fs');
const { readFile, readdir } = require('fs/promises');
const { join } = require('path');
const { gunzip } = require('zlib');
const { SingleBar, Presets } = require('cli-progress');

function ETDate(unixEpoch) {
    return new Date((new Date(unixEpoch)).toLocaleString(
        'en-US',
        { timeZone: 'America/New_York' },
    ));
}

async function readGzip(data) {
    const uncompressed = await new Promise(
        (resolve, reject) => gunzip(
            data,
            (err, decompressed) => {
                if(err != null) return reject(err);
                resolve(decompressed.toString('binary'));
            }
        ),
    );
    return uncompressed;
}

function groupFiles(files) {
    const grouped = files.reduce((ret, f) => {
        const key = f.replace(/ASK|BID/, '');
        const type = f.split('_').at(-3);
        return {
            ...ret,
            [key]: {
                ...ret[key],
                [type]: f,
            },
        }
    }, {});

    // console.dir(Object.values(grouped).filter(a => a.length !== 2));

    return Object.values(grouped);
}

async function sortByDate(fileNames) {
    const extractDate = ({ ASK , BID }) => {
        const fileName = ASK ?? BID;

        const tmp = fileName.split('_');
        const hours = tmp.at(-1);
        const [ year, month, day ] = tmp.at(-2)
            .split('-').map(s => Number(s));

        return ETDate(Date.UTC(
            year, month - 1, day, Number(hours),
        ));
    };

    return [...fileNames].sort((a, b) => {
        const date1 = extractDate(a);
        const date2 = extractDate(b);
        return date1 - date2;
    });
}

async function mergeAskBidData(groupedFileNames, root, outputFile) {
    const porgressBar = new SingleBar({}, Presets.shades_classic);
    porgressBar.start(groupedFileNames.length, 0);

    const decompress = async (filename, type) => {
        if(filename == null) return [];

        const path = join(root, filename);
        const data = await readFile(path);

        return (await readGzip(data))
            .split('\n')
            .filter(row => row !== '')
            .map(row => [type, ...row.split(',')]);
    }

    const stream = createWriteStream(outputFile, { flags: 'w' });

    for(const { ASK, BID } of groupedFileNames) {
        const [askData, bidData] = await Promise.all([
            decompress(ASK, 'ASK'),
            decompress(BID, 'BID'),
        ]);

        await writeData(
            [...askData, ...bidData],
            1000,
            stream,
        );
        porgressBar.increment();
    }

    stream.end();
    porgressBar.stop();
}

async function writeData(askBidData, interval, writer, meanSpread=0, spreadIdx=0) {
    const typedData = askBidData.map(([type, date, price, volume]) => 
        [type, Number(date), Number(price), Number(volume)]
    );

    const priceData = typedData.reduce((ret, [type, date, price, volume]) => {
        const key = date - (date % interval);
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
    }, {});

    const rowData = Object.entries(priceData)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([date, { ASK, BID }]) => {
            let price;
            if(ASK != null && BID != null) {
                const askSum = ASK.reduce((sum, [price]) => sum + price, 0) / ASK.length;
                const bidSum = BID.reduce((sum, [price]) => sum + price, 0) / BID.length;

                price = (askSum + bidSum) / 2;
                meanSpread = (meanSpread * (spreadIdx) + askSum - bidSum) / (spreadIdx + 1);
                spreadIdx++;
            } else {
                price = ((ASK ?? BID)?.reduce((sum, [price]) => sum + price, 0) / (ASK ?? BID)?.length);
            }

            const volume = [...(ASK ?? []), ...(BID ?? [])]
                .reduce((sum, [_, volume]) => sum + volume, 0);

            if(isNaN(price)) return null;

            return { date, price, volume, };
        })
        .filter(e => e != null);

    const drainStream = () => new Promise(r => writer.once('drain', () => r()));
    for(const { date, price, volume } of rowData) {

        const iso = new Date(Number(date)).toISOString().split('.')[0];
        const displayPrice = price.toFixed(5);

        writer.write(`${iso},${displayPrice},${volume}\n`) || await drainStream();
    }
}

async function main() {
    const folderPath = process.argv[2];

    let files   = await readdir(folderPath);
    files = files.filter(n => n.startsWith('ES_U23'));

    const grouped = groupFiles(files);
    const sorted  = await sortByDate(grouped);

    await mergeAskBidData(sorted, folderPath, 'test-output');
}
main();
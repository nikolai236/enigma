import { mergeAskBidData, DAY, HOUR, MINUTE, intervalToNomination } from './merge-ask-bid-files';
import { existsSync } from 'fs';
import { readdir, mkdir, rm } from 'fs/promises';
import { join, basename } from 'path';
import { loadOHLCVFile } from './price-data-to-ohlcv';
import cluster from 'cluster';
import { availableParallelism } from 'os';

const numCpus = availableParallelism();

function availibleIntervals() {
    return [DAY, 4 * HOUR, HOUR, 15 * MINUTE, 5 * MINUTE, MINUTE]
        .map(i => intervalToNomination(i));
}

async function overwriteFolder(path: string) {
    if(existsSync(path)) {
        await rm(path, { recursive: true });
    }
    await mkdir(path);
}

async function getFilesAndPreffixes(dir: string) {
    const files = await readdir(dir);
    const preffixes = files
        .map(f => {
            const [first, second] = f.split('_');
            return first + (['ASK', 'BID'].includes(second) ? '' : '_' + second);
        })
        .filter((val, i, arr) => arr.indexOf(val) === i);

    return { files, preffixes };
}

function getMergeAskBidDataPromises(
    files: string[], preffixes: string[], intervalStr: string, inputDir: string, outputDir: string
) {
    return preffixes.map((pref) => async () => {
        const out = join(outputDir, pref);
        await overwriteFolder(out);

        const filesToMerge = files
            .filter(f => f.startsWith(pref))
            .map(f => join(inputDir, f));

        await mergeAskBidData(filesToMerge, pref, out, intervalStr);
        return out;
    });
}

async function writeOHLCVForDataDir(inp: string, outputDir: string) {
    const out = join(outputDir, basename(inp));
    await overwriteFolder(out);

    const files = await readdir(inp);

    await Promise.all(files.map(f => Promise.all(
        availibleIntervals().map(interval => loadOHLCVFile(
            join(inp, f), out, interval
        ))))
    );
}

async function getAllDrills(
    inp: string, out1: string, out2: string, intervalStr: string
) {
    const { files, preffixes } = await getFilesAndPreffixes(inp);
    const drills = getMergeAskBidDataPromises(files, preffixes, intervalStr, inp, out1)
        .map(promise => async () => {
            const dataFolder = await promise();
            await writeOHLCVForDataDir(dataFolder, out2);
        });

    const ret = [] as typeof drills[];
    const drillsPerCpu = Math.floor(drills.length / numCpus);
    const leftOver = drills.length % numCpus;

    for(let i=0; i<numCpus; i++) {
        ret[i] = [];
        for(let j=0; j<drillsPerCpu; j++) {
            ret[i].push(drills[j + i * drillsPerCpu]);
        }
    }

    for(let j=0; j<leftOver; j++) {
        ret[j].push(
            drills[drillsPerCpu * numCpus + j]
        );
    }

    return ret;
}

if(require.main === module) {
    const [folderPath, outputDir1, outputDir2, intervalStr] = process.argv.slice(2);

    if(cluster.isPrimary) {
        for(let i = 0; i < numCpus; i++) {
            const worker = cluster.fork();
            worker.send(i);
        }
    
        cluster.on('exit', (worker, code, signal) => {
            console.log(
                `${worker.process.pid} exited with code ${code} and signal ${signal}`
            );
            process.exit();
        });
    } else (async () => {
        const idx = await new Promise<number>(
            r => process.on('message', (msg) => r(msg as number))
        );

        const drills = await getAllDrills(
            folderPath, outputDir1, outputDir2, intervalStr
        );
    
        const toExecute = drills[idx];
        await Promise.all(toExecute.map(e => e()));
    })();
}
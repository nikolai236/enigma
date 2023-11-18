const { mergeAskBidData, DAY, HOUR, MINUTE } = require('./merge-ask-bid-files');
const { existsSync, promises: { readdir, mkdir, rm } } = require('fs');
const { join } = require('path');
const { loadOHLCVFile } = require('./price-data-to-ohlcv');

function availibleIntervals() {
    return [DAY, 4 * HOUR, HOUR, 15 * MINUTE, 5 * MINUTE, MINUTE];
}

async function overwriteFolder(path) {
    if(existsSync(path)) {
        await rm(path, { recursive: true });
    }
    await mkdir(path);
}

async function main(inputFolder, outputFolder1, outputFolder2, interval) {
    const files = await readdir(inputFolder);
    const preffixes = files
        .map(f => f.split('_')[0])
        .filter((val, i, arr) => arr.indexOf(val) !== i);

    await Promise.all(preffixes.map(async (pref) => {
        const out = join(outputFolder1, pref);
        await overwriteFolder(out);

        const filesToMerge = files
            .filter(f => f.startsWith(pref))
            .map(f => join(inputFolder, f));

        mergeAskBidData(
            interval,
            filesToMerge,
            pref,
            join(outputFolder1),
        );
    }));

    const assetFolders = await readdir(outputFolder1);
    await Promise.all(assetFolders.map(async (folder) => {
        const inp = join(outputFolder1, folder);
        const out = join(outputFolder2, folder);

        await overwriteFolder(out);

        await Promise.all(
            availibleIntervals().map(interval => loadOHLCVFile(
                inp, out, interval
            ))
        );
    }));
}

if(require.main === module) {
    const folderPath = process.argv[2];
    const outputDir1 = process.argv[3];
    const outputDir2 = process.argv[4]; 
    const interval   = process.argv[5];

    main(folderPath, outputDir1, outputDir2, interval);
}
import * as express from 'express';
import * as morgan from 'morgan';
import { dirname, join } from 'path';
import { constants, access } from 'fs/promises';

const app = express();

async function getAppPath() {
    for (let path of module.paths) {
        try {
            await access(path, constants.F_OK);
            return dirname(path);
        } catch {} // 62.73.69.228  192.168.1.155
    }
}

async function main() {
    const root = await getAppPath() as string;

    app.use(express.static(join(root, 'public')));
    app.use(morgan('dev'))
    app.get('/public/modules/lightweight-charts/lightweight-charts.standalone.production.mjs', (req, res) => {
        res.sendFile(join(root, '/public/modules/lightweight-charts/lightweight-charts.standalone.production.mjs'))
    });

    app.get('/', async (req, res) => {
        res.sendFile(join(root!, 'public/chart.html'));
    });

    app.listen(5600);
}
main();
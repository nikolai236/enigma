"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const app = express();
async function getAppPath() {
    for (let path of module.paths) {
        try {
            await (0, promises_1.access)(path, promises_1.constants.F_OK);
            return (0, path_1.dirname)(path);
        }
        catch { } // 62.73.69.228  192.168.1.155
    }
}
async function main() {
    const root = await getAppPath();
    app.use(express.static((0, path_1.join)(root, 'public')));
    app.get('/public/modules/lightweight-charts/lightweight-charts.standalone.production.mjs', (req, res) => {
        res.sendFile((0, path_1.join)(root, '/public/modules/lightweight-charts/lightweight-charts.standalone.production.mjs'));
    });
    app.get('/', async (req, res) => {
        res.sendFile((0, path_1.join)(root, 'public/chart.html'));
    });
    app.listen(5600);
}
main();

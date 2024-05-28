import { Router } from "express";

import swingRouter from "./swing";
import fvgRouter from "./fair-value-gap";
import { checkForMSS, checkForMSSWithFVG } from "../../../plugins/market-structure-shift";
import { CandleRange, checkDRPDForTimePoints, getDailyRanges } from "../../../plugins/range";
import { PDEnum } from "../../../types/ohlcv";

const router = Router();
export default router;

router.use('/fvgs/', fvgRouter);
router.use('/swings/', swingRouter);

router.get('/mss/', (req, res) => {
    const { timeframe, candles } = req.context;
    const markers = checkForMSSWithFVG(true, candles!, timeframe!);

    return res.json(markers);
});

router.get('/mnos/', (req, res) => {
    const { candles } = req.context;
    const drs = getDailyRanges(candles!);
    return res.json(drs.map(dr => dr.openTime));
});

router.get('/mss-in-discount/', (req, res) => {
    const { timeframe, candles } = req.context;
    const markers = checkForMSSWithFVG(true, candles!, timeframe!);

    const { pds, mnos } = checkDRPDForTimePoints(markers.stop.map(time => ({ time })), candles!);

    markers.stop = markers.stop.filter((_, i) => pds[i] !== PDEnum.Premium);
    markers.start = markers.start.filter((_, i) => pds[i] !== PDEnum.Premium);

    return res.json({
        markers, mnos
    });
});
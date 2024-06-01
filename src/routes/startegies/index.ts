import { Router } from "express";

import swingRouter from "./swing";
import fvgRouter from "./fair-value-gap";
import { checkForMSS, checkForMSSWithFVG } from "../../../strategies/market-structure-shift";
import { CandleRange, checkDRPDForTimePoints, getDailyRanges } from "../../../strategies/range";
import { PDEnum } from "../../../types/ohlcv";
import { extendedSilverBulletSession } from "../../../strategies/session";
import { UTCTimestamp } from "lightweight-charts";

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

    return res.json({ markers, mnos });
});

router.get('/silver-bullet/', (req, res) => {
    const { candles } = req.context;
    const times = candles!.map(c => c.time) as UTCTimestamp[];
    const ret = extendedSilverBulletSession.getStartEndFromArray(times);

    console.log(ret);
    return res.json(ret);
});
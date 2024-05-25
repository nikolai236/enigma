import { Router } from "express";

import swingRouter from "./swing";
import fvgRouter from "./fair-value-gap";
import { checkForMSS, checkForMSSWithFVG } from "../../../plugins/market-structure-shift.ts";

const router = Router();
export default router;

router.use('/fvgs/', fvgRouter);
router.use('/swings/', swingRouter);

router.get('/mss/', (req, res) => {
    const { timeframe, candles } = req.context;
    const markers = checkForMSSWithFVG(true, candles!, timeframe!);

    return res.json(markers);
})
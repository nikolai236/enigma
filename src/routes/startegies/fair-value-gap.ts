import { Router } from "express";
import { findFVGsInCandles } from "../../../strategies/fair-value-gap";

const router = Router();
export default router;

router.get('/', (req, res) => {
    const { timeframe, candles } = req.context;
    const fvgs = findFVGsInCandles(candles!, timeframe!);

    return res.json({
        fvgs: fvgs.map(({ high, low, time }) => ({
            high, low, time
        }))
    });
});
import { Router } from "express";
import { getChartFvgs } from "../../../plugins/fair-value-gap";

const router = Router();
export default router;

router.get('/', (req, res) => {
    const { timeframe, candles } = req.context;
    const fvgs = getChartFvgs(candles!, timeframe!);

    return res.json({
        fvgs: fvgs.map(({ high, low, time }) => ({
            high, low, time
        }))
    });
});
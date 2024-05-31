import { Router } from "express";
import { getChartSwings } from "../../../strategies/swing";

const router = Router();
export default router;

router.get('/', (req, res) => {
    const { timeframe, candles } = req.context;
    const swings = getChartSwings(candles!, timeframe!);

    return res.json({
        swings: swings.map(({ isHigh, extreme, time }) => ({
            isHigh, extreme, time
        }))
    });
});
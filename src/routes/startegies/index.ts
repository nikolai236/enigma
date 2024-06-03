import { Router } from "express";

import swingRouter from "./swing";
import fvgRouter from "./fair-value-gap";
import { checkForMSS, checkForMSSWithFVG } from "../../../strategies/market-structure-shift";
import { CandleRange, DailyRange, checkDRPDForTimePoints, getDailyRanges } from "../../../strategies/range";
import { Candle, IFairValueGap, PDEnum, TimeFrameEnum } from "../../../types/ohlcv";
import { extendedSilverBulletSession } from "../../../strategies/session";
import { UTCTimestamp } from "lightweight-charts";
import { getCandlesticks } from "../../controllers/ohlcv";
import { findFVGsInCandles } from "../../../strategies/fair-value-gap";
import { DAY, SECOND, unixEpochToDate } from "../../../helpers";

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

	const { pds, mnos } = checkDRPDForTimePoints(markers.mss.map(time => ({ time })), candles!);

	markers.mss = markers.mss.filter((_, i) => pds[i] !== PDEnum.Premium);
	markers.origin = markers.origin.filter((_, i) => pds[i] !== PDEnum.Premium);

	return res.json({ markers, mnos });
});

router.get('/silver-bullet/', (req, res) => {
	const { candles } = req.context;
	const times = candles!.map(c => c.time) as UTCTimestamp[];
	const ret = extendedSilverBulletSession.getStartEndFromArray(times);

	return res.json(ret);
});

router.get('/2022-model/v1/', async (req, res) => {
	const { timeframe, candles, assetDir, contractName } = req.context;
	if (timeframe !== TimeFrameEnum._1m) {
		return res.sendStatus(400);
	}

	const fvgs: IFairValueGap[] = (await Promise.all(
		[TimeFrameEnum._15m, TimeFrameEnum._1H].map(async tf => {
			const candles = await getCandlesticks(contractName!, assetDir!, tf);
			const fvgs = findFVGsInCandles(candles, tf);
			return fvgs;
		})
	)).flat().sort((a, b) => a.time - b.time);

	let { origin, mss, candlesRet } = checkForMSSWithFVG(true, candles!, timeframe);
	const mssObj = origin.reduce<{ [start: number]: number }>(
		(obj, s, i) => ({ ...obj, [s]: mss[i] }), {}
	);
	const candleObj = origin.reduce<{ [start: number]: Candle|undefined }>(
		(obj, s, i) => ({ ...obj, [s]: candlesRet?.origin?.[i] }), {}
	);
	const mssCandleObj = origin.map(t => mssObj[t]).reduce<{ [stop: number]: Candle|undefined }>(
		(obj, s, i) => ({ ...obj, [s]: candlesRet?.mss?.[i] }), {}
	);

	origin = extendedSilverBulletSession.getTimePointsDuringSession(
		origin as UTCTimestamp[]
	);
	origin = checkDRPDForTimePoints(origin.map(o => ({ time: o })), candles!).pds
		.map((pd, i) => [origin[i], pd])
		.filter(([_, pd]) => pd === PDEnum.Discount)
		.map(([a]) => a);

	let tIdx = 0;
	const drs = getDailyRanges(candles!);

	const actualDrs = [] as DailyRange[];
	for(const dr of drs) {
		if (tIdx === origin.length) break;

		while (tIdx < origin.length && dr.contains(origin[tIdx])) {
			actualDrs.push(dr);
			tIdx++;
		}
	}

	const ret = origin.map<[Candle, Candle, number, IFairValueGap[]]>((time, i) => {
		const period = 3 * DAY / SECOND;
		const lookbackFvgs = fvgs.filter(fvg =>
			fvg.time < time && fvg.time > time - period
		);

		const candle = candleObj[time];
		const reactions = lookbackFvgs.filter((fvg) => {
			return candle!.low < fvg.high && candle!.close > fvg.low;
		});

		return [candle!,mssCandleObj[mssObj[time]]!, drs[i].equilibrium, reactions];
	}).filter(([_a, _b, _c, fvg]) => fvg.length > 0);

	return res.json(ret.map(([stop, entry, target, fvgs]) => ({
		stop, entry, target, context: { fvgs },
	})));
});
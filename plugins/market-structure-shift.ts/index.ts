import { MINUTE, SECOND } from "../../executables/merge-ask-bid-files";
import { Candle, TimeFrame, ThreeCandleFormation } from "../../types/ohlcv";
import { getChartFvgs } from "../fair-value-gap";
import Swing, { areCandlesSwing } from "../swing";

export function checkForMSS(bullish: boolean, candles: Candle[], timeframe: TimeFrame) {
	let stx: Swing|undefined;
	let sty: Swing|undefined;
	const ret: number[] = []

	const reset = () => {
		stx = undefined;
		sty = undefined;
	};

	for(let i=0; i<candles.length-2; i++) {
		if (stx !== undefined && stx.isViolated(candles[i].high)) {
			ret.push(candles[i].time);
			reset();
			continue;
		}

		const swing = areCandlesSwing(
			candles.slice(i, i+3) as ThreeCandleFormation,
			timeframe,
		);
		if(swing === undefined) continue;
		if (bullish === swing.isHigh) {
			stx = swing;
			continue;
		}

		sty = sty === undefined ?
			swing : Swing.getMoreExtreme(swing as Swing, sty);
	}

	return ret;
}

export function checkForMSSWithFVG(bullish: boolean, candles: Candle[], timeframe: TimeFrame) {
	const ret = { start: [], stop: [] } as { start: number[], stop: number[] };
	let stxs: Swing[] = [];
	let sty: Swing|undefined;

	let mssLegIdx: number|undefined = undefined;
	let oldMssLegIdx: number|undefined  = undefined;

	const reset = () => {
		stxs = [];
		sty = undefined;
		oldMssLegIdx = mssLegIdx;
		mssLegIdx = undefined;
	};

	for(let i=1; i<candles.length-2; i++) {
		// const log = () => 1692219600 <= candles[i].time && candles[i].time <= 1692262800;
		// if (log()) console.log(candles[i].time, mssLegIdx && candles[mssLegIdx].time, sty?.time, stxs.at(-1)?.time);
		if (stxs.length > 0 && stxs.at(-1)!.isViolated(candles[i]) && stxs.at(-1)!.time !== candles[i].time) {
			if(mssLegIdx == null && oldMssLegIdx == null) {
				stxs = [];
				reset();
			} else {
				const leg = candles.slice(mssLegIdx ?? oldMssLegIdx!, i+2);
				const fvgs = getChartFvgs(leg, timeframe);

				if(fvgs.length !== 0) {
					ret.stop.push(candles[i].time);
					ret.start.push(candles[mssLegIdx ?? oldMssLegIdx!].time);

					stxs = [];
					reset();
				}

				stxs.pop();
				reset()
			}
		}

		const swing = areCandlesSwing(
			candles.slice(i-1, i+2) as ThreeCandleFormation,
			timeframe,
		);

		if(swing === undefined) continue;
		if (bullish === swing.isHigh) {
			reset();
			stxs.push(swing);
			continue;
		}
		
		if (mssLegIdx === oldMssLegIdx) sty = undefined;
		sty = sty === undefined ?
			swing : Swing.getMoreExtreme(swing as Swing, sty);
		
		if (sty === swing) {
			oldMssLegIdx = mssLegIdx;
			mssLegIdx = i;
		}
	}

	return ret;
}
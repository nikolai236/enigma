import { MINUTE, SECOND } from "../../executables/merge-ask-bid-files";
import { Candle, TimeFrame, ThreeCandleFormation } from "../../types/ohlcv";
import { findFVGsInCandles } from "../fair-value-gap";
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
			swing : Swing.maxExtreme(swing as Swing, sty);
	}

	return ret;
}

/*
	This is an algorithm that finds Market Structure Shifts within an array of candles.
	These are short-term changes in market sentiment e.g. shift from bearish to bullish.

	The fair value gap indicates a change in narrative with an instutional sponsorship behind
	the shift, making it a lot stronger of a confirmation for a all-out reversal

	The function returns two arrays with the same size, one with counter-narrative origin swings
	labeled 'start', where a hypothetical stop-loss would be placed and another labeled 'stop'
	showing the acutal MSS occurring.

	The algotithm looks for a shift to happen, then looks for a FVG inside that leg, if it does not
	find one discrads the MSS and looks for the next high to be taken wth FVG. It will not return shifts
	where the FVG occured after the high was violated
*/

// TODO algo gives 'incorrect' SL when the MSS candle is the protetcted low low
export function checkForMSSWithFVG(bullish: boolean, candles: Candle[], timeframe: TimeFrame) {
	const ret: { start: number[], stop: number[] } = { start: [], stop: [] };

	/* The last of these swings in this array is the swing 
		violated fro the MSS to occur e. g. a swing high when bullish */
	let stxs: Swing[] = [];

	/* This is either the most extreme, counter-narrative swing
		after the violated swing was if such does not exist
		the one prior to the violation swing created is taken */
	let sty: Swing|undefined;

	let mssLegIdx: number|undefined = undefined;
	let oldMssLegIdx: number|undefined  = undefined;

	const reset = () => {
		sty = undefined;
		oldMssLegIdx = undefined;
		mssLegIdx = undefined;
	};

	const handleViolated = (violationIdx: number) => {
		if(mssLegIdx == null && oldMssLegIdx == null) {
			stxs = [];
			return reset();
		}

		const legIdx = mssLegIdx ?? oldMssLegIdx!;
		const leg = candles.slice(legIdx-1, violationIdx+2);
		const fvgs = findFVGsInCandles(leg, timeframe);

		if(fvgs.length !== 0) {
			ret.stop.push(candles[violationIdx].time);
			ret.start.push(candles[legIdx].time);

			stxs = [];
		}

		stxs.pop();
		return reset();
	}

	for(let i=1; i<candles.length-2; i++) {
		if (
			stxs.length > 0 &&
			stxs.at(-1)!.isViolated(candles[i]) &&
			stxs.at(-1)!.time !== candles[i].time
		) {
			handleViolated(i);
		}

		const potentialSwing = candles.slice(i-1, i+2) as ThreeCandleFormation;
		const swing = areCandlesSwing(potentialSwing, timeframe);

		if(swing == undefined) {
			continue;
		}

		if (bullish === swing.isHigh) {
			sty = undefined;
			oldMssLegIdx = mssLegIdx;
			mssLegIdx = undefined;
			stxs.push(swing);

			continue;
		}

		sty = sty === undefined ? swing : Swing.maxExtreme(swing, sty);

		if (sty === swing) {
			oldMssLegIdx = mssLegIdx;
			mssLegIdx = i;
		}
	}

	return ret;
}
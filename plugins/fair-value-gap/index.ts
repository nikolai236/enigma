import { Candle, IFairValueGap, ThreeCandleFormation, TimeFrame } from "../../types/ohlcv";

export const badFvgInput = new Error('Bad fvg input');

/**
* This Fair Value Gap is defined by the space between candle1 and candle2 no matter if there is a body or not
* Only exception is if the open of c2 is higher than the high of c3 when bullish or if the "displacement" candle
* happens to be bearish	in the bullish scenario
*/
export function areCandlesFvg(
	candles: ThreeCandleFormation,
	timeframe: TimeFrame,
	minFvgLength=0,
	throwException=true,
): FairValueGap|void {
	if(candles.length !== 3)
		if (throwException) throw badFvgInput;
		else return;

	const [c1, displ, c3] = candles;

	if(c1.high < displ.high) {
		
		const high = c3.low;
		const low = c1.high;
		
		if(high <= low + minFvgLength) return;
		if(displ.open > displ.close) return;
		if(displ.open > c3.high) return;
		
		return new FairValueGap(high, low, displ.time, timeframe, minFvgLength);

	} else if (c1.low > displ.low) {

		const high = c1.low;
		const low = c3.high;

		if(low >= high - minFvgLength) return;
		if(displ.open < displ.close) return;
		if(displ.open < c3.low) return;

		return new FairValueGap(high, low, displ.time, timeframe, minFvgLength);
	}
}

export function getChartFvgs(candles: Candle[], timeframe: TimeFrame, minFvgLength=0): FairValueGap[] {
	return candles
		.slice(0, -2)
		.map((_, i) => {
			const ret = areCandlesFvg(
				candles.slice(i, i+3) as ThreeCandleFormation,
				timeframe,
				minFvgLength,
				false,
			);
			return ret;
		})
		.filter((fvg): fvg is FairValueGap => fvg != null);

}
/**
 * A fair value gap can be defined as a three candle formation where there's a gap beteen
 * candle 1 and candle 3, this gap is used as a tool for us to recognise "smart money"
 * participation in the marketplace.
*/
export default class FairValueGap implements IFairValueGap {
	constructor(
		public high: number,
		public low: number,
		public time: number,
		public timeframe: TimeFrame,
		minFvgLength=0,
	) {
		if(high - low <= minFvgLength) throw badFvgInput;
	}

	get bullish() {
		return this.high > this.low;
	}

	get CE() {
		return this.low + (this.high - this.low) / 2;
	}
}
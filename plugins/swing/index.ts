import { Candle, ISwing, ThreeCandleFormation, TimeFrame } from "../../types/ohlcv";

export const badSwingInput = new Error('Bad swing input');

export function areCandlesSwing(
	candles: ThreeCandleFormation,
	timeframe: TimeFrame,
	minThreshhold=0
): Swing|void {
	if(candles.length !== 3) throw badSwingInput;

	const [c1, extreme, c3] = candles;

	if(c1.high + minThreshhold < extreme.high && c3.high + minThreshhold < extreme.high) {
		return new Swing(extreme.high, true, extreme.time, timeframe);
	}

	if(c1.low - minThreshhold > extreme.low && c3.low - minThreshhold > extreme.low) {
		return new Swing(extreme.low, false, extreme.time, timeframe);
	}
}

export function getChartSwings(candles: Candle[], timeframe: TimeFrame, minThreshhold=0) {
	return candles
		.map((_, i) => areCandlesSwing(
			candles.slice(i, i+3) as ThreeCandleFormation,
			timeframe,
			minThreshhold
		))
		.filter((sx): sx is Swing => sx != null);
}

/**
 * A swing high or low is a three candle formation where the second candle has either a
 * higher high or a lower low than the other ones. This formation helps us identify where
 * untapped liquidity resides.
 */
export default class Swing implements ISwing {
	constructor(
		public extreme: number,
		public isHigh: boolean,
		public time: number,
		public timeframe: TimeFrame,
	) {}

	static maxExtreme(stx: Swing, sty: Swing) {
		if(stx.isHigh !== sty.isHigh) {
			throw new Error('Incomparable');
		}

		if(stx.isHigh) return stx.extreme > sty.extreme ?
			stx : sty;
		
		return stx.extreme < sty.extreme ? stx : sty;
	}

	isViolated(pricePoint: number, minThreshhold?: number): boolean;
	isViolated(candle: Candle,     minThreshhold?: number): boolean;
	isViolated(subject: Candle|number, minThreshhold=0) {

		let pricePoint = subject as number;
		if(typeof subject !== 'number') {

			if(subject.time <= this.time) throw badSwingInput;
			try {
				this.validateCandleAlignsWithExtreme(subject);
			} catch { return false; }

			pricePoint = this.isHigh ? subject.high : subject.low;
		}

		return this.isHigh ?
			pricePoint + minThreshhold > this.extreme :
			pricePoint - minThreshhold < this.extreme;
	}

	isViolatedWithClose(candle: Candle, minThreshhold=0) {

		if(candle.time <= this.time) throw badSwingInput;
		this.validateCandleAlignsWithExtreme(candle);

		return this.isHigh ?
			candle.close + minThreshhold > this.extreme :
			candle.close - minThreshhold < this.extreme;
	}

	private validateCandleAlignsWithExtreme(candle: Candle) {
		const bothBullish = this.isHigh  && candle.open <= candle.close;
		const bothBearish = !this.isHigh && candle.open >= candle.close;

		if(!bothBearish && !bothBullish) throw badSwingInput;
	}
}
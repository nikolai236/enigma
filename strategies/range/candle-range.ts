import { Candle, IFairValueGap, IRange, PDEnum } from "../../types/ohlcv";
import { dateToUnixEpoch, SECOND } from "../../helpers";

export class Range implements IRange {
	public candles: Candle[];

	high: number;
	low: number;

	openTime: number;
	closeTime: number;

	get open() {
		return this.candles[0].open;
	}

	get close() {
		return this.candles.at(-1)!.close;
	}

	get equilibrium() {
		if (this.high == null || this.low == null) {
			throw new Error('range high and/or low not set');
		}

		return (this.high + this.low) / 2;
	}

	constructor(openTime: Date|number, closeTime: Date|number, candles: Candle[], strict=true) {
		if (candles.length === 0) {
			throw new Error('Candle array cannot be empty');
		}
		this.candles = candles;

		if (openTime instanceof Date) {
			openTime = dateToUnixEpoch(openTime);
		}
		this.openTime = openTime;

		if (closeTime instanceof Date) {
			closeTime = dateToUnixEpoch(closeTime);
		}
		this.closeTime = closeTime;

		const invalidCandleInput = new Error(`Invalid candles inputted ${this.openTime}`);

		if(strict && this.candles[0].time > openTime) {
			throw invalidCandleInput;
		}

		if(strict && this.candles[0].time < openTime) {
			let i = 0;
			const len = this.candles.length;
			while(i < len && this.candles[i].time !== this.openTime) { i++; }

			if (i == len - 1) throw invalidCandleInput;
			this.candles = this.candles.slice(i);
		}

		if (strict && this.candles.at(-1)!.time < this.closeTime) {
			throw invalidCandleInput;
		}

		if(strict && this.candles.at(-1)!.time > closeTime) {
			let i = this.candles.length - 1;
			while(i <= 0 && this.candles[i].time !== this.closeTime) { i--; }

			if (i == 0) throw invalidCandleInput;
			this.candles = this.candles.slice(0, i+1);
		}

		this.update();
	}

	getPremiumFVGs(fvgs: IFairValueGap[]) {
		return fvgs.filter(fvg =>
			fvg.low < this.high && fvg.low > this.equilibrium
		);
	}

	getDiscountFVGs(fvgs: IFairValueGap[]) {
		return fvgs.filter(fvg =>
			fvg.high > this.low && fvg.high < this.equilibrium
		);
	}

	getPremiumDiscount(price?: number) {
		price ??= this.close;

		return price > this.equilibrium ?
			PDEnum.Premium : this.close < this.equilibrium ?
				PDEnum.Discount : PDEnum.Equilibrium;
	}

	update() {
		this.high = Math.max(...this.candles.map(c => c.high));
		this.low  = Math.min(...this.candles.map(c => c.low ));
	}
}

export class CandleRange extends Range {
	constructor(public length: number, openTime: Date, candles: Candle[], strict=true) {
		const open = dateToUnixEpoch(openTime);
		const close = open + length / SECOND;

		super(open, close, candles, strict);
	}

	public contains(unixEpoch: number): boolean;
	public contains(candle: Candle): boolean;
	public contains(arg: Candle|number): boolean {
		if (typeof arg !== 'number') {
			arg = arg.time;
		}

		return this.openTime <= arg && arg <= this.closeTime;
	}

	public getPremiumArraysAtTime(unixEpoch: number, fvgs: IFairValueGap[]) {
		fvgs = fvgs.filter(fvg => fvg.time <= unixEpoch);
		const range = this.buildRange(unixEpoch);
		return range.getPremiumFVGs(fvgs);
	}

	public getDiscountArraysAtTime(unixEpoch: number, fvgs: IFairValueGap[]) {
		fvgs = fvgs.filter(fvg => fvg.time <= unixEpoch);
		const range = this.buildRange(unixEpoch);
		return range.getDiscountFVGs(fvgs);
	}

	public getPremiumDiscountAtTime(unixEpoch: number): PDEnum;
	public getPremiumDiscountAtTime(candle: Candle): PDEnum;
	public getPremiumDiscountAtTime(arg: Candle|number) {
		if (typeof arg === 'number') {
			arg = this.candles.find(c => c.time === arg)!;
			if (arg === undefined) {
				arg = this.candles.at(-1)!;
				// throw new Error(
				// 	'argument unixEpoch must be a specific time of a candle'
				// );
			}
		}

		const range = this.buildRange(arg.time);
		return range.getPremiumDiscount();
	}

	private buildRange(end?: number): Range {
		if (end && !this.contains(end)) {
			throw new Error('argument otiside of daily time range');
		}
		end ??= this.candles.at(-1)!.time;

		let i = 0;
		while (i < this.candles.length && this.candles[i].time <= end) { i++; }
		const rangeCandles = this.candles.slice(0, i+1);

		return new Range(this.openTime, end, rangeCandles, false);
	}
}
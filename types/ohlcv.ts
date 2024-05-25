export interface Candle {
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;

	time: number;
}

export type ThreeCandleFormation = [Candle, Candle, Candle];

export interface IFairValueGap {
	high: number;
	low: number;
	time: number;
}

export interface ISwing {
	extreme: number;
	isHigh: boolean;
	time: number;
}

export enum TimeFrameEnum {
	_4H='4H',
	_1H='1H',
	_15m='15m',
	_5m='5m',
	_1m='1m',
};
export type TimeFrame = (typeof TimeFrameEnum)[keyof typeof TimeFrameEnum];
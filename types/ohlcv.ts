export interface Candle {
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;

	time: number;
}

export type ThreeCandleFormation = [Candle, Candle, Candle];

export enum TimeFrameEnum {
	_4H='4H',
	_1H='1H',
	_15m='15m',
	_5m='5m',
	_1m='1m',
};

export type TimeFrame = keyof typeof TimeFrameEnum;
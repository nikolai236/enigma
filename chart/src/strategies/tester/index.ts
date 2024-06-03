import { Candle } from "../../../../types/ohlcv";
import { Position } from "../../../../types/strategies";

export default class StrategyTester {
    constructor(
        public candles: Candle[],
        public getStrategy: (name: string) => Promise<Position[]>
    ) {}

    async testStategy(name: string) {
        const positions = await this.getStrategy(name);
        console.log(positions);

        let posIdx = 0;
        let entered = false;

        const losses: Position[] = [];
        const wins: Position[] = [];

        for(const candle of this.candles) {
            let pos = positions[posIdx];
            const bullish = pos.stop.low < pos.entry.low;
            if (entered) {
                if (
                    bullish ?
                        candle.low <= pos.stop.low :
                        candle.high >= pos.stop.high
                ) {
                    losses.push(pos);
                    entered = false;
                    posIdx++;
                } else if (
                    bullish ?
                        candle.high >= pos.target :
                        candle.high <= pos.target
                ) {
                    wins.push(pos);
                    entered = false;
                    posIdx++;
                }
            }

            pos = positions[posIdx];
            if(!entered && candle.time === pos.entry.time) {
                entered = true;
            }
        }

        console.log(losses.length, wins.length);
    }
}
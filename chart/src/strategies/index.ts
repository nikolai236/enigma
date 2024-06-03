import { createChart } from "../../modules/lightweight-charts/lightweight-charts.standalone.development.mjs";
import { IChartApi, ISeriesApi, UTCTimestamp } from "../../modules/lightweight-charts/typings.js";

import { IFairValueGap, TimeFrame, Candle } from "../../../types/ohlcv.js";
import { SECOND, formatTime, nominationToInterval } from "../helpers/dates.js";
import Rectangle, { Point } from "../lwc-plugins/rectangle.js";
import VertLine from "../lwc-plugins/vertical-line.js";
import StrategyTester from "./tester/index.js";
import { Position } from "../../../types/strategies.js";

type CandleSeries = ISeriesApi<'Candlestick'>;

class FVG {
	rectangle: Rectangle;

	constructor(fvg: IFairValueGap, extent: number, series: CandleSeries) {
		console.log(fvg)
		const p1 = { price: fvg.high, time: fvg.time } as Point;
		const p2 = { price: fvg.low, time: fvg.time + extent } as Point;

		series.attachPrimitive(new Rectangle(p2, p1));
	} // TODO: some fvgs if they are big enough do not show but are still taken into account (1691161200)
}

class MNO {
	line: VertLine;

	constructor(time: UTCTimestamp, chart: IChartApi, series: CandleSeries) {
		this.line = new VertLine(chart, series, time);
		series.attachPrimitive(this.line);
	}
}

export default class StartegyManager {
	public tf: TimeFrame;
	public name: string;
	public candles: Candle[] = [];

	public chart: IChartApi;
	public series: CandleSeries;

	private assetUrl: string;

	public tester: StrategyTester;

	public fvgs: FVG[];
	public mnos: MNO[];

	constructor(params: URLSearchParams) {
		const assetName    = params.get('assetName');
		const contractName = params.get('contractName');
		const tf           = params.get('tf') as TimeFrame|null;

		if(assetName == null || tf == null) {
			throw new Error('Invalid url parameters');
		}

		this.tf = tf;
		this.name = contractName ?? assetName;

		const enc = encodeURIComponent;
		const assetStr = `${enc(assetName)}${contractName == null?'':`/${enc(contractName)}`}`;

		this.assetUrl = `/ohlcv/assets/${assetStr}`;
	}

	public async loadCandlesFromParams() {
		const url = `${this.assetUrl}/${this.tf}/`;
		const resp = await fetch(url);

		if (!resp.ok) {
			throw new Error(resp.status == 404 ?
				`Data for '${this.name}' not added to public` :
				`Something went wrong`
			);
		}

		this.candles = (await resp.json()).candleData;

		const chart = createChart(document.querySelector('.chartWrapper'), {
				autoSize: true,
				localization: { timeFormatter: formatTime },
			},
		);

		const series = chart.addCandlestickSeries({
			upColor: '#26a69a',
			downColor: '#ef5350',
			borderVisible: true,
			wickUpColor: '#26a69a',
			wickDownColor: '#ef5350'
		});

		this.series = series;
		this.chart = chart;
		// @ts-ignore
		this.series.setData(this.candles);
		chart.timeScale().fitContent();

		const getPos = (async (name: string) => {
			const url = `${this.buildStartegyUrl(this.tf)}/${name}/`;
			return await (await fetch(url)).json() as Position[];
		}).bind(this) as (name: string) => Promise<Position[]>;

		this.tester = new StrategyTester(this.candles, getPos);
	}

	public async loadFVGs(tf: TimeFrame) {
		const url = `${this.buildStartegyUrl(tf)}/fvgs/`;
		const result = await (await fetch(url)).json();
		const fvgs = result.fvgs as IFairValueGap[];

		const extent = 10 * nominationToInterval(tf) / SECOND;
		this.fvgs = fvgs.slice(0, 35).map(fvg => new FVG(fvg, extent, this.series));
	}

	public async seeMss() { 
		const url = `${this.buildStartegyUrl(this.tf)}/mss/`;
		const { start, stop } = await (await fetch(url)).json();

		this.series.setMarkers([...stop.map(time => ({
			time: time,
			position: 'aboveBar', 
			color: '#f68410', 
			shape: 'circle', 
			text: 'B'
		})), ...start.map(time => ({
			time: time,
			position: 'belowBar', 
			color: '#f68410', 
			shape: 'circle', 
			text: 'A'
		}))].sort((a, b) => a.time - b.time));
	}

	public async showMNOs() {
		const url = `${this.buildStartegyUrl(this.tf)}/mnos/`;
		const mnos: UTCTimestamp[] = await (await fetch(url)).json();

		this.mnos = mnos.map(mno => new MNO(mno, this.chart, this.series));
	}

	public async test2022Model() {
		await this.tester.testStategy('2022-model/v1');
		// const url = `${this.buildStartegyUrl(this.tf)}/2022-model/v1/`;
		// const entries = await (await fetch(url)).json();

		// const start = entries.map(e => e[0]);
		// const stop = entries.map(e => e[1]);
		// const fvgs = entries.map(e => e[2][0]);

		// this.series.setMarkers([...stop.map(time => ({
		// 	time: time,
		// 	position: 'aboveBar', 
		// 	color: '#f68410', 
		// 	shape: 'circle', 
		// 	text: 'B'
		// })), ...start.map(time => ({
		// 	time: time,
		// 	position: 'belowBar', 
		// 	color: '#f68410', 
		// 	shape: 'circle', 
		// 	text: 'A'
		// }))].sort((a, b) => a.time - b.time));

		// const extent = 10 * nominationToInterval(this.tf) / SECOND;
		// this.fvgs = fvgs.map(fvg => new FVG(fvg, extent, this.series));
	}

	public async isMSSinDiscount() {
		const url = `${this.buildStartegyUrl(this.tf)}/mss-in-discount/`;
		const { mnos, markers } = await (await fetch(url)).json();

		this.series.setMarkers([...markers.stop.map(time => ({
			time: time,
			position: 'aboveBar', 
			color: '#f68410', 
			shape: 'circle', 
			text: 'B'
		})), ...markers.start.map(time => ({
			time: time,
			position: 'belowBar', 
			color: '#f68410', 
			shape: 'circle', 
			text: 'A'
		}))].sort((a, b) => a.time - b.time));

		this.mnos = mnos.map(mno => new MNO(mno, this.chart, this.series));
	}

	async showSB() {
		const url = `${this.buildStartegyUrl(this.tf)}/silver-bullet/`;
		const lines = await (await fetch(url)).json();
		lines.forEach(l => new MNO(l.end, this.chart, this.series));
	}

	private buildStartegyUrl(tf: TimeFrame) {
		return `${this.assetUrl}/${tf}/strategies`;
	}
}
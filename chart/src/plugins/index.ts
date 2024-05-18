import { createChart } from "../../modules/lightweight-charts/lightweight-charts.standalone.development.mjs";
import { IChartApi, ISeriesApi, Time } from "../../modules/lightweight-charts/typings.js";

import { IFairValueGap, TimeFrame, Candle } from "../../../types/ohlcv.js";
import { formatTime } from "../helpers/dates.js";
import Rectangle, { defaultOptions } from "../lwc-plugins/rectangle.js";

function stringToUTCDate(date: string): Time {
	const obj = new Date(date);
	return Date.UTC(
		obj.getUTCFullYear(),
		obj.getUTCMonth(),
		obj.getUTCDate(),
		obj.getUTCHours(),
		obj.getUTCMinutes(),
		obj.getUTCSeconds(),
	) / 1000 as Time;
}

export default class PluginManager {
	public tf: TimeFrame;
	public name: string;
	public candles: Candle[] = [];

	public chart: IChartApi;
	public series: ISeriesApi<'Candlestick'>;

	private assetUrl: string;

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

		series.setData(this.candles);
		chart.timeScale().fitContent();

		const r = new Rectangle({ price: 4206, time: '2023-08-23'  }, { price: 4306, time: '2023-10-23'  });
		series.attachPrimitive(r);
		console.log(r);
	}

	public async loadFVGs(tf: TimeFrame) {
		return;
		const url = `${this.buildPluginsUrl(tf)}/fvgs/`;
		const result = await (await fetch(url)).json();
		const fvgs = result.fvgs as IFairValueGap[];
	}

	private buildPluginsUrl(tf: TimeFrame) {
		return `${this.assetUrl}/${tf}/plugins`;
	}
}
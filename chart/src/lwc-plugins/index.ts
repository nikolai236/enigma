import {
	ISeriesPrimitive,
	Time,
	IChartApi,
	ISeriesApi,
	SeriesOptionsMap,
	DataChangedScope,
	SeriesAttachedParameter,
} from "../../modules/lightweight-charts/typings.js";


// https://github.com/tradingview/lightweight-charts/blob/master/plugin-examples/src/plugins/plugin-base.ts
export abstract class PluginBase implements ISeriesPrimitive<Time>{
	private _chart?: IChartApi;
	private _series?: ISeriesApi<keyof SeriesOptionsMap>;
	
	private _requestUpdate?: () => void;
	private _fireDataUpdated = (scope: DataChangedScope) => {
		this.dataUpdated && this.dataUpdated(scope);
	}
	
	protected dataUpdated?(scope: DataChangedScope): void;
	protected requestUpdate(): void {
		this._requestUpdate && this._requestUpdate();
	}
	
	public attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
		this._chart = chart;
		this._series = series;
		this._series.subscribeDataChanged(this._fireDataUpdated);
		this._requestUpdate = requestUpdate;
		this.requestUpdate();
	}
	
	public detached() {
		this._series?.unsubscribeDataChanged(this._fireDataUpdated);
		this._chart = undefined;
		this._series = undefined;
		this._requestUpdate = undefined;
	}
	
	public get chart(): IChartApi {
		return ensureDefined(this._chart);
	}
	
	public get series(): ISeriesApi<keyof SeriesOptionsMap> {
		return ensureDefined(this._series);
	}
}

export interface BitmapPositionLength {
	/** coordinate for use with a bitmap rendering scope */
	position: number;
	/** length for use with a bitmap rendering scope */
	length: number;
}

export function positionsBox(
	position1Media: number,
	position2Media: number,
	pixelRatio: number
): BitmapPositionLength {
	const scaledPosition1 = Math.round(pixelRatio * position1Media);
	const scaledPosition2 = Math.round(pixelRatio * position2Media);

	return {
		position: Math.min(scaledPosition1, scaledPosition2),
		length: Math.abs(scaledPosition2 - scaledPosition1) + 1,
	};
}

export function ensureDefined(value: undefined): never;
export function ensureDefined<T>(value: T | undefined): T;
export function ensureDefined<T>(value: T | undefined): T {
	if (value === undefined) {
		throw new Error('Value is undefined');
	}

	return value;
}
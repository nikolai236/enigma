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

/**
 * Determines the bitmap position and length for a dimension of a shape to be drawn.
 * @param position1Media - media coordinate for the first point
 * @param position2Media - media coordinate for the second point
 * @param pixelRatio - pixel ratio for the corresponding axis (vertical or horizontal)
 * @returns Position of of the start point and length dimension.
 */
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

function centreOffset(lineBitmapWidth: number): number {
	return Math.floor(lineBitmapWidth * 0.5);
}

/**
 * Calculates the bitmap position for an item with a desired length (height or width), and centred according to
 * an position coordinate defined in media sizing.
 * @param positionMedia - position coordinate for the bar (in media coordinates)
 * @param pixelRatio - pixel ratio. Either horizontal for x positions, or vertical for y positions
 * @param desiredWidthMedia - desired width (in media coordinates)
 * @returns Position of of the start point and length dimension.
 */
export function positionsLine(
	positionMedia: number,
	pixelRatio: number,
	desiredWidthMedia: number = 1,
	widthIsBitmap?: boolean
): BitmapPositionLength {

	const scaledPosition = Math.round(pixelRatio * positionMedia);
	const lineBitmapWidth = widthIsBitmap ?
		desiredWidthMedia : Math.round(desiredWidthMedia * pixelRatio);

	const offset = centreOffset(lineBitmapWidth);
	const position = scaledPosition - offset;

	return { position, length: lineBitmapWidth };
}
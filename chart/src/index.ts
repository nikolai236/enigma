import { Candle } from '../../types/ohlcv';
import { createChart } from '../modules/lightweight-charts/lightweight-charts.standalone.production.mjs';

function weekDayToString(idx: number): string {
    return [
        "Mon", "Tue", "Wed", "Thurs", "Fr", "Sat", "Sun"
    ][idx];
}

function monthToString(idx: number): string {
    return [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug","Sept","Oct","Nov","Dec"
    ][idx];
}

function formatTime(unixEpoch: number) {
    const date = new Date(unixEpoch * 1000);

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = weekDayToString(date.getDay());
    const month = monthToString(date.getMonth());
    const year = date.getFullYear() - 2000;

    return `${hours}:${minutes} ${day} ${month} '${year}`
}

async function retreiveCandleData(
    assetFolder: string, assetName: string, timeframe: '4H'|'1H'|'15m'|'5m'|'1m'
) {
    const enc = encodeURIComponent;
    const resp = await fetch(
        `/ohlcv/assets/${enc(assetFolder)}/${enc(assetName)}/${timeframe}/`
    );
    const data = await resp.json();
    return data.candleData as Candle[];
}

async function retreiveMarkers(
    assetFolder: string, assetName: string,
) {
    const enc = encodeURIComponent;
    const resp = await fetch(
        `/ohlcv/assets/${enc(assetFolder)}/${enc(assetName)}/raids/`
    );
    const { stopped, ctx } = await resp.json();
    const ctxMarkers = ctx
        .map(e => Object.entries(e))
        .flat(1)
        .filter(([_, val]) => val?.time != null)
        .map(([key, val]) => ({ text: key, time: val.time }));

    return [
        ...ctxMarkers.map(({ time, text }) => ({
            time,
            position: 'aboveBar',
            color: '#f68410',
            shape: 'circle',
            text,
        })),
        ...stopped.map(time => ({
            time,
            position: 'aboveBar',
            color: '#f68410',
            shape: 'circle',
            text: 'Stop',
        }))
    ].sort((a, b) => a.time - b.time);
}

async function main() {
    const chart = createChart(document.querySelector('.chartWrapper'), {
            autoSize: true,
            localization: { timeFormatter: formatTime },
        },
    );

    const data = await retreiveCandleData(
        'ES', 'ES_Z23', '15m'
    );

    const series = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
    });

    series.setData(data);
    const markers = await retreiveMarkers('ES', 'ES_Z23');
    series.setMarkers(markers);

    chart.timeScale().fitContent();
}
main();
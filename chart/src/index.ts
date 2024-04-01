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

async function retreiveCandleData(): Promise<Candle[]|void> {
    const params = new URLSearchParams(window.location.search);

    const assetName = params.get('assetName');
    const contractName = params.get('contractName');
    const tf = params.get('tf') as '4H'|'1H'|'15m'|'5m'|'1m'|null;

    if (assetName == null || tf == null) {
        return alert('No asset name or timeframe procvided in url params')
    }

    const enc = encodeURIComponent;
    const assetStr = `${enc(assetName)}${contractName == null?'':`/${enc(contractName)}`}`;
    const url = `/ohlcv/assets/${assetStr}/${tf}`;

    const resp = await fetch(url);
    if (!resp.ok) return alert(
        resp.status == 404 ? `Data for ${assetStr} not added to public` : `Something went wrong`
    );

    const data = await resp.json();
    return data.candleData as Candle[];
}

async function main() {
    const chart = createChart(document.querySelector('.chartWrapper'), {
            autoSize: true,
            localization: { timeFormatter: formatTime },
        },
    );

    const data = await retreiveCandleData();

    const series = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
    });

    series.setData(data);

    chart.timeScale().fitContent();
}
main();
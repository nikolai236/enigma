import { createChart } from '../../public/modules/lightweight-charts/lightweight-charts.standalone.production.mjs';

function stringDate(date: string) {
    const obj = new Date(date);
    return Date.UTC(
        obj.getUTCFullYear(),
        obj.getUTCMonth(),
        obj.getUTCDate(),
        obj.getUTCHours(),
        obj.getUTCMinutes(),
        obj.getUTCSeconds(),
    ) / 1000;
}

async function getOHLCVData() {
    const resp = await fetch('ohlcv.txt');
    const csvData = await resp.text();

    return csvData
        .split('\n')
        .filter(row => row != '')
        .map(row => row.split(','))
        .map(([date, open, high, low, close, volume]) => ({
            time: stringDate(date),
            open,
            high,
            low,
            close,
            volume,
        }));
}

async function main() {
    const chart = createChart(document.querySelector('.chartWrapper'), {
        autoSize: true
    });
    const data = await getOHLCVData();
    console.log(data[0])
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
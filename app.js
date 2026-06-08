// Ganti isi app.js Anda dengan ini untuk tes
const chart = LightweightCharts.createChart(document.body, {
    width: window.innerWidth,
    height: window.innerHeight,
    layout: {
        background: { color: '#000000' },
        textColor: '#DDD',
    },
});
console.log("Isi variabel chart:", chart);
console.log("Apakah addCandlestickSeries ada?", typeof chart.addCandlestickSeries);
const candleSeries = chart.addCandlestickSeries();
candleSeries.setData([
    { time: '2026-06-01', open: 100, high: 120, low: 90, close: 110 },
    { time: '2026-06-02', open: 110, high: 130, low: 105, close: 125 },
]);

console.log("Chart test berjalan!");

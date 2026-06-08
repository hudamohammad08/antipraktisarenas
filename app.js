// 1. Deklarasikan variabel di luar agar bisa diakses semua fungsi
let candleSeries;
let chart;

window.addEventListener('load', function() {
    const container = document.getElementById('chart');
    
    // 2. Inisialisasi Chart & CandleSeries
    chart = LightweightCharts.createChart(container, {
        layout: { background: { color: '#0b0f17' }, textColor: '#DDD' },
        width: container.clientWidth,
        height: container.clientHeight,
    });

    candleSeries = chart.addCandlestickSeries(); 
    
    // 3. Panggil fungsi untuk mengambil data
    fetchAndRenderChart();
});

// Fungsi fetch sekarang bisa melihat 'candleSeries' karena berada di scope yang sama
async function fetchAndRenderChart() {
    try {
        const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQk1O9CGYTBQ2_GdpqRCJd6LFXj2DJZddPaZXzXuYpdFeYgBd6dYEpaJQnowmAO1oKJ3XlCLmQzIPex/pub?output=csv";
        const response = await fetch(SHEET_URL);
        const csvData = await response.text();
        
        const parsedData = parseCSV(csvData);
        
        // Sekarang ini akan berhasil karena candleSeries sudah dikenali
        candleSeries.setData(parsedData); 
        console.log("Data berhasil dimuat ke chart!");
    } catch (error) {
        console.error("Gagal mengambil data dari Sheet:", error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    return lines.slice(1).map(line => {
        const [time, open, high, low, close] = line.split(',');
        return {
            time: time,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close)
        };
    }).filter(d => d.time);
}

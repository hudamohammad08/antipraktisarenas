window.addEventListener('load', () => {
    // 1. Cek apakah library benar-benar terdeteksi
    if (typeof LightweightCharts === 'undefined') {
        console.error("Library LightweightCharts tidak ditemukan!");
        return;
    }

    const container = document.getElementById('chart');
    if (!container) {
        console.error("Element #chart tidak ditemukan!");
        return;
    }

    // 2. Inisialisasi Chart
    // Kita gunakan format standar agar tidak terpengaruh minification
    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { type: 'solid', color: '#0b0f17' },
            textColor: '#8a97ad',
        },
        grid: {
            vertLines: { color: '#1a2233' },
            horzLines: { color: '#1a2233' },
        },
    });

    console.log("Objek chart dibuat:", chart);

    // 3. Tambahkan Series
    // Kita cek apakah fungsi ada di dalam objek 'chart'
    if (typeof chart.addCandlestickSeries === 'function') {
        const candleSeries = chart.addCandlestickSeries();
        
        // Data Dummy
        candleSeries.setData([
            { time: '2026-06-01', open: 1800, high: 1820, low: 1790, close: 1810 },
            { time: '2026-06-02', open: 1810, high: 1830, low: 1800, close: 1825 }
        ]);
        
        console.log("Chart berhasil diisi data.");
    } else {
        console.error("Fungsi addCandlestickSeries tidak ditemukan! Struktur objek:", Object.keys(chart));
    }
});

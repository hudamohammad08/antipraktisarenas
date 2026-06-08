window.addEventListener('load', function() {
    console.log("Memulai inisialisasi...");

    // Cek apakah library sudah terload
    if (typeof LightweightCharts === 'undefined') {
        console.error("Library LightweightCharts belum terload!");
        return;
    }

    const chartContainer = document.getElementById('chart');
    if (!chartContainer) {
        console.error("Elemen #chart tidak ditemukan!");
        return;
    }

    // Buat chart
    const chart = LightweightCharts.createChart(chartContainer, {
        layout: { background: { color: '#0b0f17' }, textColor: '#8a97ad' },
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight
    });

    // Pastikan chart berhasil dibuat sebelum menambah series
    if (chart && typeof chart.addCandlestickSeries === 'function') {
        const candleSeries = chart.addCandlestickSeries();
        console.log("CandleSeries berhasil dibuat!");
        
        // Data dummy untuk tes
        candleSeries.setData([
            { time: '2026-06-01', open: 10, high: 15, low: 8, close: 12 }
        ]);
    } else {
        console.error("Gagal membuat chart, objek tidak valid:", chart);
    }
});

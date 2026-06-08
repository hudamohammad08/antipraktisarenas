document.addEventListener('DOMContentLoaded', () => {
    console.log("Memulai Inisialisasi Chart...");

    const chartContainer = document.getElementById('chart');
    const chart = LightweightCharts.createChart(chartContainer, {
        layout: { background: { color: '#0b0f17' }, textColor: '#8a97ad' },
        grid: { vertLines: { color: '#1a2233' }, horzLines: { color: '#1a2233' } },
    });

    const candleSeries = chart.addCandlestickSeries();

    // Data dummy agar chart muncul meski fetch gagal
    const dummyData = [
        { time: '2026-06-01', open: 1800, high: 1820, low: 1790, close: 1810 },
        { time: '2026-06-02', open: 1810, high: 1830, low: 1800, close: 1825 }
    ];
    candleSeries.setData(dummyData);

    // Fungsi Fetch yang Aman
    async function fetchData() {
        try {
            console.log("Mencoba mengambil data...");
            const response = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vQk1O9CGYTBQ2_GdpqRCJd6LFXj2DJZddPaZXzXuYpdFeYgBd6dYEpaJQnowmAO1oKJ3XlCLmQzIPex/pub?output=csv");
            
            if (!response.ok) throw new Error("Gagal akses Sheets");
            
            console.log("Data berhasil dimuat!");
            // Lanjutkan parsing data di sini jika perlu
        } catch (error) {
            console.error("Error pada Fetch Data:", error);
            alert("Database Error: Cek console (F12) untuk detail.");
        }
    }

    fetchData();
});

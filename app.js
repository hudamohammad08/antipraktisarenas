// Ganti URL ini dengan link CSV yang Anda dapatkan dari Google Sheets
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQk1O9CGYTBQ2_GdpqRCJd6LFXj2DJZddPaZXzXuYpdFeYgBd6dYEpaJQnowmAO1oKJ3XlCLmQzIPex/pub?output=csv";

async function fetchAndRenderChart() {
    try {
        const response = await fetch(SHEET_URL);
        const csvData = await response.text();
        
        // Proses Parsing CSV ke format JSON yang dibutuhkan Chart
        const parsedData = parseCSV(csvData);
        
        // Masukkan ke dalam chart
        candleSeries.setData(parsedData);
    } catch (error) {
        console.error("Gagal mengambil data dari Sheet:", error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    // Asumsi baris pertama adalah header (time,open,high,low,close), jadi kita mulai dari index 1
    return lines.slice(1).map(line => {
        const [time, open, high, low, close] = line.split(',');
        return {
            time: time,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close)
        };
    }).filter(d => d.time); // Hapus baris kosong
}

// Panggil fungsi ini saat halaman dimuat
window.addEventListener('load', () => {
    // ... (kode inisialisasi chart Anda)
    fetchAndRenderChart();
});

const $ = id => document.getElementById(id);
const chart = LightweightCharts.createChart($('chart'), {
    layout: { background: { color: '#0b0f17' }, textColor: '#8a97ad' },
    grid: { vertLines: { color: '#1a2233' }, horzLines: { color: '#1a2233' } }
});
const candleSeries = chart.addCandlestickSeries();
const zoneCanvas = $('zoneCanvas');
const ctx = zoneCanvas.getContext('2d');

let drawings = [];
let currentTool = 'cursor';
let isDrawing = false;
let startPoint = null;

// Mengatur ukuran Canvas agar sesuai Chart
function resizeCanvas() {
    const rect = $('chart').getBoundingClientRect();
    zoneCanvas.width = rect.width;
    zoneCanvas.height = rect.height;
    requestAnimationFrame(drawAll);
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 500);

// Logika Render Menggunakan requestAnimationFrame (Mencegah Lag)
function drawAll() {
    ctx.clearRect(0, 0, zoneCanvas.width, zoneCanvas.height);
    const timeScale = chart.timeScale();
    
    drawings.forEach(d => {
        const x1 = timeScale.timeToCoordinate(d.timeStart);
        const y1 = candleSeries.priceToCoordinate(d.priceStart);
        const x2 = timeScale.timeToCoordinate(d.timeEnd || d.timeStart);
        const y2 = candleSeries.priceToCoordinate(d.priceEnd || d.priceStart);
        
        if (x1 === null || y1 === null) return;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        
        if (d.type === 'trend') {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        } else if (d.type === 'box') {
            ctx.fillStyle = 'rgba(245, 179, 1, 0.2)';
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        }
    });
}

// Event Mouse
zoneCanvas.addEventListener('mousedown', e => {
    if (currentTool === 'cursor') return;
    isDrawing = true;
    const rect = zoneCanvas.getBoundingClientRect();
    startPoint = { 
        price: candleSeries.coordinateToPrice(e.clientY - rect.top),
        time: chart.timeScale().coordinateToTime(e.clientX - rect.left)
    };
    drawings.push({ type: currentTool, timeStart: startPoint.time, priceStart: startPoint.price });
});

zoneCanvas.addEventListener('mousemove', e => {
    if (!isDrawing) return;
    const rect = zoneCanvas.getBoundingClientRect();
    let current = drawings[drawings.length - 1];
    current.timeEnd = chart.timeScale().coordinateToTime(e.clientX - rect.left);
    current.priceEnd = candleSeries.coordinateToPrice(e.clientY - rect.top);
    requestAnimationFrame(drawAll);
});

zoneCanvas.addEventListener('mouseup', () => { isDrawing = false; });

// Switch Tool
document.querySelectorAll('#toolSeg button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#toolSeg button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;

        if (currentTool === 'cursor') {
            zoneCanvas.classList.remove('drawing-mode');
            chart.applyOptions({ handleScroll: true, handleScale: true }); // Aktifkan Scroll
        } else {
            zoneCanvas.classList.add('drawing-mode');
            chart.applyOptions({ handleScroll: false, handleScale: false }); // Kunci Scroll
        }
    });
});

window.clearAllDrawings = () => { drawings = []; drawAll(); };

// Listener agar Gambar tetap menempel saat Chart di-scroll/zoom
chart.timeScale().subscribeVisibleLogicalRangeChange(drawAll);

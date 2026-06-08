(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  
  // ==========================================
  // CONFIG & STATE DATA
  // ==========================================
  const TELEGRAM_TOKEN = "8776331759:AAFVup_qefWDme_yz7PYUvzDcXJNlJ70yLU";
  const TELEGRAM_CHAT_ID = "-1003742641612";
  const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQk1O9CGYTBQ2_GdpqRCJd6LFXj2DJZddPaZXzXuYpdFeYgBd6dYEpaJQnowmAO1oKJ3XlCLmQzIPex/pub?output=csv";
  
  let masterCandles = []; 
  let allCandles = [];    
  let visibleIdx = 0, speedMs = 2000, playing = false, playTimer = null;
  let currentTF = 'Base'; 
  
  let balance = 10000.00;
  let openTrades = []; 
  let tempOrderSide = '';

  // STATE DRAWING TOOLS
  let currentTool = 'cursor'; 
  let drawings = [];         
  let isDrawing = false;
  let drawStartPoint = null; 

  // ==========================================
  // INITIALIZE LIGHTWEIGHT CHART
  // ==========================================
  const chart = LightweightCharts.createChart($('chart'), {
    autoSize: true, 
    layout: { background: { type: 'solid', color: '#0b0f17' }, textColor: '#8a97ad' },
    grid: { vertLines: { color: '#1a2233' }, horzLines: { color: '#1a2233' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#1f2a3d' },
    timeScale: { borderColor: '#1f2a3d', timeVisible: true, rightOffset: 5, barSpacing: 10 }
  });
  
  const candleSeries = chart.addCandlestickSeries({ 
    upColor: '#22c55e', downColor: '#ef4444', 
    borderUpColor: '#22c55e', borderDownColor: '#ef4444',
    wickUpColor: '#22c55e', wickDownColor: '#ef4444' 
  });

  const zoneCanvas = $('zoneCanvas');
  const ctx = zoneCanvas.getContext('2d');

  function resizeZoneCanvas() {
    const rect = $('chart').getBoundingClientRect();
    zoneCanvas.width = rect.width;
    zoneCanvas.height = rect.height;
    redrawAllDrawings();
  }

  // ==========================================
  // RENDER ENGINE: TRADINGVIEW STYLE MATHEMATICS
  // ==========================================
  function redrawAllDrawings() {
    ctx.clearRect(0, 0, zoneCanvas.width, zoneCanvas.height);
    if (!allCandles.length) return;

    const timeScale = chart.timeScale();
    const pScale = chart.priceScale('right');
    const maxW = zoneCanvas.width - pScale.width();

    drawings.forEach(d => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, maxW, zoneCanvas.height);
      ctx.clip();

      const xStart = timeScale.timeToCoordinate(d.timeStart);
      const xEnd = d.timeEnd ? timeScale.timeToCoordinate(d.timeEnd) : maxW;
      const yStart = candleSeries.priceToCoordinate(d.priceStart);
      const yEnd = candleSeries.priceToCoordinate(d.priceEnd);

      // 1. FIBONACCI RETRACEMENT
      if (d.type === 'fib' && xStart !== null && yStart !== null && yEnd !== null) {
        const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const fibColors = ['#ef4444', '#f59e0b', '#10b981', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'];
        
        fibLevels.forEach((lvl, idx) => {
          const yLvl = yStart + (yEnd - yStart) * lvl;
          const priceLvl = d.priceStart + (d.priceEnd - d.priceStart) * lvl;

          ctx.strokeStyle = fibColors[idx];
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xStart, yLvl);
          ctx.lineTo(xEnd === null ? maxW : xEnd, yLvl);
          ctx.stroke();

          ctx.fillStyle = fibColors[idx];
          ctx.font = '10px monospace';
          ctx.fillText(`Fib ${lvl} (${priceLvl.toFixed(2)})`, xStart + 8, yLvl - 4);
        });
      }
      // 2. PERSEGI (BOX AREA)
      else if (d.type === 'box' && xStart !== null && xEnd !== null && yStart !== null && yEnd !== null) {
        ctx.fillStyle = 'rgba(245, 179, 1, 0.12)';
        ctx.strokeStyle = '#f5b301';
        ctx.lineWidth = 1.5;
        ctx.fillRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
        ctx.strokeRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
      }
      // 3. GARIS TREN (DIAGONAL TRENDLINE)
      else if (d.type === 'trend' && xStart !== null && xEnd !== null && yStart !== null && yEnd !== null) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
      }
      // 4. RENTANG HARGA (PRICE RANGE MEASUREMENT)
      else if (d.type === 'pricerange' && xStart !== null && xEnd !== null && yStart !== null && yEnd !== null) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.strokeStyle = '#a855f7';
        ctx.setLineDash([4, 4]);
        ctx.fillRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
        ctx.strokeRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
        ctx.setLineDash([]);

        const pDiff = d.priceEnd - d.priceStart;
        const pPct = (pDiff / d.priceStart) * 100;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        const txt = `${pDiff >= 0 ? '▲' : '▼'} ${pDiff.toFixed(2)} (${pPct.toFixed(2)}%)`;
        ctx.fillText(txt, xStart + (xEnd - xStart) / 2 - 45, yStart + (yEnd - yStart) / 2);
      }
      // 5. LINGKARAN (CIRCLE)
      else if (d.type === 'circle' && xStart !== null && xEnd !== null && yStart !== null && yEnd !== null) {
        const radius = Math.sqrt(Math.pow(xEnd - xStart, 2) + Math.pow(yEnd - yStart, 2));
        ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(xStart, yStart, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      // 6 & 7. POSISI PEMBELIAN & PENJUALAN (RISK & REWARD SETUP)
      else if ((d.type === 'long' || d.type === 'short') && xStart !== null && xEnd !== null && yStart !== null && d.priceTarget && d.priceStop) {
        const yTarget = candleSeries.priceToCoordinate(d.priceTarget);
        const yStop = candleSeries.priceToCoordinate(d.priceStop);

        if (yTarget !== null && yStop !== null) {
          const isLong = d.type === 'long';
          // Area Profit (Hijau)
          ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
          ctx.strokeStyle = '#22c55e';
          ctx.fillRect(xStart, isLong ? yTarget : yStart, xEnd - xStart, Math.abs(yTarget - yStart));
          ctx.strokeRect(xStart, isLong ? yTarget : yStart, xEnd - xStart, Math.abs(yTarget - yStart));

          // Area Resiko / SL (Merah)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
          ctx.strokeStyle = '#ef4444';
          ctx.fillRect(xStart, isLong ? yStart : yStop, xEnd - xStart, Math.abs(yStop - yStart));
          ctx.strokeRect(xStart, isLong ? yStart : yStop, xEnd - xStart, Math.abs(yStop - yStart));

          // Label Info R:R Ratio Tengah
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.fillText(`R:R Ratio: 2.0 (Auto)`, xStart + 6, yStart + 3);
        }
      }
      // 8. JALUR (PATH POLYLINE MULTI-POINTS)
      else if (d.type === 'path' && d.points && d.points.length > 0) {
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        d.points.forEach((pt, pIdx) => {
          const pX = timeScale.timeToCoordinate(pt.time);
          const pY = candleSeries.priceToCoordinate(pt.price);
          if (pX !== null && pY !== null) {
            if (pIdx === 0) ctx.moveTo(pX, pY);
            else ctx.lineTo(pX, pY);
          }
        });
        ctx.stroke();

        // Titik simpul kecil disetiap klik jalur
        d.points.forEach(pt => {
          const pX = timeScale.timeToCoordinate(pt.time);
          const pY = candleSeries.priceToCoordinate(pt.price);
          if (pX !== null && pY !== null) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(pX, pY, 3, 0, 2*Math.PI); ctx.fill();
          }
        });
      }

      ctx.restore();
    });
  }

  chart.timeScale().subscribeVisibleLogicalRangeChange(redrawAllDrawings);
  chart.timeScale().subscribeVisibleTimeRangeChange(redrawAllDrawings);
  window.addEventListener('resize', resizeZoneCanvas);

  // ==========================================
  // INTERACTIVE MOUSE / TOUCH EVENTS DRAWING
  // ==========================================
  zoneCanvas.style.pointerEvents = 'auto';

  chart.subscribeCrosshairMove((param) => {
    if (param.seriesData) {
      const d = param.seriesData.get(candleSeries);
      if (d) updateHUD(d);
    }
    
    // Logika render pratinjau (Preview) ketika kursor ditarik dinamis
    if (isDrawing && currentTool !== 'cursor' && currentTool !== 'path' && param.point) {
      const pScale = chart.priceScale('right');
      const maxW = zoneCanvas.width - pScale.width();
      if (param.point.x > maxW) return;

      const currentPrice = candleSeries.coordinateToPrice(param.point.y);
      const currentTime = chart.timeScale().coordinateToTime(param.point.x);

      if (currentPrice && currentTime) {
        let activeObj = drawings[drawings.length - 1];
        activeObj.priceEnd = currentPrice;
        activeObj.timeEnd = currentTime;

        // Formula khusus Posisi Risk/Reward Otomatis Rasio 1:2
        if (currentTool === 'long') {
          activeObj.priceTarget = currentPrice;
          const targetPips = currentPrice - drawStartPoint.price;
          activeObj.priceStop = drawStartPoint.price - (targetPips / 2);
        } else if (currentTool === 'short') {
          activeObj.priceTarget = currentPrice;
          const targetPips = drawStartPoint.price - currentPrice;
          activeObj.priceStop = drawStartPoint.price + (targetPips / 2);
        }
        redrawAllDrawings();
      }
    }
  });

  zoneCanvas.addEventListener('mousedown', (e) => {
    if (currentTool === 'cursor') return;
    
    const rect = zoneCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pScale = chart.priceScale('right');
    if (mouseX > zoneCanvas.width - pScale.width()) return; 

    const price = candleSeries.coordinateToPrice(mouseY);
    const time = chart.timeScale().coordinateToTime(mouseX);

    if (!price || !time) return;

    // Spesifik Handling Fitur 8: Jalur (Multi-Click Node)
    if (currentTool === 'path') {
      let activePath = drawings.find(d => d.type === 'path' && !d.isCompleted);
      if (!activePath) {
        drawings.push({
          id: Date.now(), type: 'path', isCompleted: false, points: [{ time: time, price: price }]
        });
        toast("Jalur dimulai! Klik area lain untuk cabang.", "success");
      } else {
        activePath.points.push({ time: time, price: price });
      }
      redrawAllDrawings();
      return;
    }

    // Model Drag & Release standar
    isDrawing = true;
    drawStartPoint = { time: time, price: price };
    drawings.push({ id: Date.now(), type: currentTool, timeStart: time, priceStart: price, timeEnd: time, priceEnd: price });
  });

  window.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      drawStartPoint = null;
      toast(`Alat berhasil dipasang`, "success");
    }
  });

  // Switcher antar tombol Drawing Mode
  document.querySelectorAll('#toolSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#toolSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;

      // Finalisasi Jalur Path lama jika berganti tool
      drawings.forEach(d => { if(d.type === 'path') d.isCompleted = true; });

      if (currentTool !== 'cursor') {
        zoneCanvas.classList.add('drawing-mode');
        chart.applyOptions({ handleScroll: false, handleScale: false }); // Kunci navigasi chart bawaan
      } else {
        zoneCanvas.classList.remove('drawing-mode');
        chart.applyOptions({ handleScroll: true, handleScale: true }); // Aktifkan scroll chart
      }
    });
  });

  window.clearAllDrawings = function() {
    drawings = [];
    redrawAllDrawings();
    toast("Semua coretan gambar dibersihkan", "error");
  };

  // ==========================================
  // PARSER, FILTER MARKET LIBUR & RESAMPLER
  // ==========================================
  function parseCleanNumber(str) {
    if (!str) return 0;
    let s = str.toString().replace(/['"\s]/g, '');
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    let r = parseFloat(s);
    return isNaN(r) ? 0 : r;
  }

  async function fetchHistory() {
    try {
      const res = await fetch(SPREADSHEET_URL + "&t=" + new Date().getTime());
      if (!res.ok) throw new Error("Gagal mengambil data");
      const csv = await res.text();
      const rows = csv.trim().split('\n');
      rows.shift(); 
      
      masterCandles = rows.map(r => {
        const cols = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let timeStr = (cols[0] || '').replace(/["']/g, ''); 
        return { 
          time: Math.floor(new Date(timeStr.replace(' ', 'T') + 'Z').getTime() / 1000), 
          open: parseCleanNumber(cols[1]), high: parseCleanNumber(cols[2]), 
          low: parseCleanNumber(cols[3]), close: parseCleanNumber(cols[4]), rawDate: timeStr 
        };
      }).filter(c => {
        if (!c.time || !c.close || c.close <= 0) return false;
        
        // Filter Akhir Pekan (Sabtu & Minggu)
        const dateObj = new Date(c.time * 1000);
        const utcDay = dateObj.getUTCDay(); 
        const utcHours = dateObj.getUTCHours();
        if (utcDay === 6) return false; // Sabtu libur
        if (utcDay === 0 && utcHours < 22) return false; // Minggu sebelum 22:00 libur
        return true;
      }).sort((a,b) => a.time - b.time);

      if(masterCandles.length === 0) throw new Error("Dataset kosong.");

      $('inStartDate').value = masterCandles[0].rawDate.split(' ')[0];
      $('inEndDate').value = masterCandles[masterCandles.length - 1].rawDate.split(' ')[0];

      applyFilters(); 
      $('loadingOverlay').style.display = 'none';
      $('hud').style.display = 'flex'; $('pnlBadge').style.display = 'flex';
      $('statusBox').className = 'status ok'; $('statusText').innerText = 'Connected';
      setTimeout(resizeZoneCanvas, 300);
    } catch(e) {
      $('statusBox').className = 'status err'; $('statusText').innerText = 'Error Database';
      $('loadingOverlay').innerHTML = `<div class="card"><h3 style="color:#ef4444">⚠ Error Parser</h3><p>${e.message}</p></div>`;
    }
  }

  function aggregateCandles(data, tf) {
    if (tf === 'Base') return data;
    let periodSec = tf === '1H' ? 3600 : tf === '4H' ? 14400 : tf === '1D' ? 86400 : 0;
    if (!periodSec) return data;

    let resampled = [], cur = null;
    data.forEach(d => {
      let periodStart = Math.floor((d.time + 25200) / periodSec) * periodSec - 25200;
      if (!cur || cur.time !== periodStart) {
        if (cur) resampled.push(cur);
        cur = { time: periodStart, open: d.open, high: d.high, low: d.low, close: d.close };
      } else {
        cur.high = Math.max(cur.high, d.high);
        cur.low = Math.min(cur.low, d.low);
        cur.close = d.close;
      }
    });
    if (cur) resampled.push(cur);
    return resampled;
  }

  window.applyFilters = function() {
    let startVal = $('inStartDate').value, endVal = $('inEndDate').value;
    if (!startVal) { toast("Start Date wajib!", "error"); return; }
    let startUnix = new Date(startVal + "T00:00:00Z").getTime() / 1000;
    let endUnix = endVal ? new Date(endVal + "T23:59:59Z").getTime() / 1000 : Infinity;

    let dateFiltered = masterCandles.filter(c => c.time >= startUnix && c.time <= endUnix);
    if (dateFiltered.length === 0) { toast("Data kosong pada tanggal ini!", "error"); return; }

    stopPlay();
    openTrades.forEach(t => candleSeries.removePriceLine(t.lineObj));
    openTrades = []; drawings = [];
    balance = 10000.00; calculateFloatingPnL(0);
    
    allCandles = aggregateCandles(dateFiltered, currentTF);
    visibleIdx = Math.min(60, allCandles.length); 
    candleSeries.setData(allCandles.slice(0, visibleIdx));
    
    setTimeout(() => { chart.timeScale().scrollToRealTime(); resizeZoneCanvas(); }, 150);
    if(visibleIdx > 0) updateHUD(allCandles[visibleIdx - 1]);
    updateProgress();
    closeModal('dateModal');
  }

  // ==========================================
  // SIMULATION REPLAY MECHANISM & ORDERS TRACKING
  // ==========================================
  function nextCandle() {
    if (visibleIdx >= allCandles.length) { stopPlay(); toast('Data sudah paling ujung!', 'success'); return; }
    const c = allCandles[visibleIdx];
    candleSeries.update(c);
    visibleIdx++;
    updateHUD(c); updateProgress();

    let closedAny = false;
    for (let i = openTrades.length - 1; i >= 0; i--) {
      let t = openTrades[i], hitPx = 0, reason = '';
      if (t.side === 'BUY') {
        if (t.sl > 0 && c.low <= t.sl) { hitPx = t.sl; reason = 'SL Hit'; }
        else if (t.tp > 0 && c.high >= t.tp) { hitPx = t.tp; reason = 'TP Hit'; }
      } else {
        if (t.sl > 0 && c.high >= t.sl) { hitPx = t.sl; reason = 'SL Hit'; }
        else if (t.tp > 0 && c.low <= t.tp) { hitPx = t.tp; reason = 'TP Hit'; }
      }
      if (hitPx > 0) { executeCloseTrade(t.id, hitPx, reason); closedAny = true; }
    }
    calculateFloatingPnL(c.close);
    if(closedAny) renderTerminal();
    redrawAllDrawings();
  }

  window.openOrderModal = function(side) {
    if(!allCandles.length) return;
    tempOrderSide = side;
    $('orderTitle').innerText = `New ${side} Order`;
    $('inEntry').value = "0"; 
    openModal('orderModal');
  }

  // TELEGRAM INTEGRATION
  async function pushToTelegram(msg) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' }) });
    } catch (e) { console.error("Gagal terhubung ke Telegram API:", e); }
  }

  $('confirmOrderBtn').addEventListener('click', () => {
    let lot = parseFloat($('inLot').value) || 0.1, entryInput = parseFloat($('inEntry').value) || 0;
    let sl = parseFloat($('inSl').value) || 0, tp = parseFloat($('inTp').value) || 0;
    let currentPx = allCandles[visibleIdx - 1].close;
    let entry = entryInput > 0 ? entryInput : currentPx;

    let trade = { id: Date.now(), side: tempOrderSide, lot: lot, entry: entry, sl: sl, tp: tp, lineObj: null };
    trade.lineObj = candleSeries.createPriceLine({
      price: entry, color: trade.side === 'BUY' ? '#22c55e' : '#ef4444', lineWidth: 1, lineStyle: 2, title: `${trade.side} ${lot}L`
    });

    openTrades.push(trade); closeModal('orderModal');
    calculateFloatingPnL(currentPx); renderTerminal();

    let teleMsg = `🔔 <b>NEW POSITION EXECUTION</b>\n\n• <b>Type:</b> ${trade.side}\n• <b>Lot Size:</b> ${trade.lot} Lot\n• <b>Entry Price:</b> ${trade.entry.toFixed(2)}\n• <b>Timeframe:</b> ${currentTF}`;
    pushToTelegram(teleMsg);
  });

  function calculateFloatingPnL(currentPx) {
    let totalPnL = 0;
    openTrades.forEach(t => {
      t.livePnl = (t.side === 'BUY' ? (currentPx - t.entry) : (t.entry - currentPx)) * t.lot * 100;
      totalPnL += t.livePnl;
    });
    $('balanceVal').innerText = fmtMoney(balance);
    $('pnlVal').innerText = fmtMoney(totalPnL);
    $('pnlVal').className = 'value ' + (totalPnL >= 0 ? 'pos' : 'neg');
    $('btnTerminal').innerText = `💼 (${openTrades.length})`;
  }

  window.executeCloseTrade = function(id, forcePrice = 0, reason = 'Manual') {
    let idx = openTrades.findIndex(t => t.id === id);
    if(idx === -1) return;
    let t = openTrades[idx];
    let closePx = forcePrice > 0 ? forcePrice : allCandles[visibleIdx - 1].close;
    balance += (t.side === 'BUY' ? (closePx - t.entry) : (t.entry - closePx)) * t.lot * 100;
    candleSeries.removePriceLine(t.lineObj); openTrades.splice(idx, 1); 
    calculateFloatingPnL(closePx); renderTerminal();
  }

  $('btnTerminal').addEventListener('click', () => { renderTerminal(); openModal('terminalModal'); });

  function renderTerminal() {
    let html = '';
    if (openTrades.length === 0) {
      html = '<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--muted)">Tidak ada posisi aktif</td></tr>';
    } else {
      openTrades.forEach(t => {
        html += `<tr>
          <td style="color:var(--${t.side==='BUY'?'green':'red'})"><b>${t.side}</b></td><td>${t.lot}</td><td>${t.entry.toFixed(2)}</td>
          <td style="font-size:9px; color:var(--muted)">S:${t.sl||'-'}<br>T:${t.tp||'-'}</td>
          <td class="${t.livePnl>=0?'pos':'neg'}"><b>$${t.livePnl.toFixed(2)}</b></td>
          <td><button class="btn-close" onclick="executeCloseTrade(${t.id})">X</button></td>
        </tr>`;
      });
    }
    $('terminalBody').innerHTML = html;
  }

  // ==========================================
  // UTILS & CONTROL BINDINGS
  // ==========================================
  window.openModal = function(id) { $(id).classList.add('open'); }
  window.closeModal = function(id) { $(id).classList.remove('open'); }
  function updateHUD(c) { $('ohlc').innerHTML = `<span><b>O</b>${c.open.toFixed(2)}</span><span><b>H</b>${c.high.toFixed(2)}</span><span><b>L</b>${c.low.toFixed(2)}</span><span style="color:${c.close>=c.open?'#22c55e':'#ef4444'}"><b style="color:var(--muted)">C</b>${c.close.toFixed(2)}</span>`; }
  function updateProgress() { $('progressLabel').innerText = `Bar ${visibleIdx}/${allCandles.length}`; }
  function fmtMoney(n) { return (n<0?'-':'') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2}); }
  function togglePlay() { playing = !playing; $('playBtn').innerHTML = playing ? '⏸ Pause' : '▶ Play'; if(playing) playTimer = setInterval(nextCandle, speedMs); else clearInterval(playTimer); }
  function stopPlay() { playing = false; $('playBtn').innerHTML = '▶ Play'; clearInterval(playTimer); }
  
  let tTimer; window.toast = function(m, k) { $('toast').textContent=m; $('toast').className='toast show '+k; clearTimeout(tTimer); tTimer=setTimeout(()=>$('toast').className='toast',3000); }

  $('nextBtn').addEventListener('click', nextCandle);
  $('playBtn').addEventListener('click', togglePlay);
  
  document.querySelectorAll('#speedSeg button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#speedSeg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); speedMs = parseInt(b.dataset.speed);
      if(playing) { stopPlay(); togglePlay(); }
    });
  });

  document.querySelectorAll('#tfSeg button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#tfSeg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); currentTF = b.dataset.tf; applyFilters();
    });
  });

  fetchHistory();
})();

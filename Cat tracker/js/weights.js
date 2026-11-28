/* Weight chart (hand-drawn SVG, no library) + editable daily weigh-in table
   for kittens in the chart stage (default: "At home"). */
(function () {
  'use strict';
  var esc = UI.esc, $all = UI.$all;
  var wrap = document.getElementById('chart-wrap');
  var legendEl = document.getElementById('chart-legend');
  var tableEl = document.getElementById('weight-table');
  var headingEl = document.getElementById('weights-heading');
  var rangeDays = 14;
  var extraDates = [];        // days added with "+ Add day" that have no weights yet
  var skipTable = false;      // don't redraw the table while someone is typing in it
  var NS = 'http://www.w3.org/2000/svg';

  function kittens() {
    return Store.kittensInStage(Store.state.settings.chartStageId);
  }
  function rangeStart() {
    return rangeDays ? Store.addDays(Store.today(), -(rangeDays - 1)) : '0000-00-00';
  }

  function niceStep(span, target) {
    var raw = span / target, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  function series() {
    var from = rangeStart(), seen = {};
    return kittens().map(function (k) {
      // Two kittens with the same color get a dashed line so they stay tell-apart.
      var key = (k.collarColor || 'slot' + (k.colorSlot || 0)).toLowerCase(), dashed = !!seen[key];
      seen[key] = true;
      var lum = k.collarColor ? Store.luminance(k.collarColor) : 0.5;
      return {
        k: k, color: Store.kittenColor(k), dashed: dashed, halo: lum > 0.85 || lum < 0.15,
        pts: Store.weightsFor(k.id).filter(function (w) { return w.date >= from; })
          .map(function (w) { return { date: w.date, v: Store.toUnit(w.grams), g: w.grams }; })
      };
    });
  }

  function renderChart() {
    var st = Store.getStage(Store.state.settings.chartStageId);
    headingEl.textContent = 'Weights — ' + (st ? st.name : '');
    var data = series(), all = [];
    data.forEach(function (s) { s.pts.forEach(function (p) { all.push(p); }); });

    legendEl.innerHTML = data.length > 1 ? data.map(function (s) {
      return '<span><i class="swatch" style="background:' + s.color + (s.dashed ? ';opacity:.6' : '') + '"></i>' + esc(s.k.name || 'Unnamed') + '</span>';
    }).join('') : '';

    if (!all.length) {
      wrap.innerHTML = '<div class="empty" style="padding:40px 0;text-align:center">' +
        (data.length ? 'No weigh-ins in this time range yet. Add some in the table below.' :
          'No kittens in the "' + esc(st ? st.name : '') + '" stage.') + '</div>';
      return;
    }

    var W = Math.max(320, wrap.clientWidth || 700), H = 320;
    var m = { l: 52, r: data.length <= 4 ? 90 : 16, t: 14, b: 30 };
    var dates = all.map(function (p) { return p.date; }).sort();
    var d0 = rangeDays ? rangeStart() : dates[0], d1 = Store.today();
    if (dates[dates.length - 1] > d1) d1 = dates[dates.length - 1];
    var spanDays = Math.max(1, Store.daysBetween(d0, d1));
    var vals = all.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi - lo < 0.0001) { lo -= Math.max(0.1, lo * 0.1); hi += Math.max(0.1, hi * 0.1); }
    var step = niceStep(hi - lo, 5);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    if (lo < 0) lo = 0;

    function x(d) { return m.l + (Store.daysBetween(d0, d) / spanDays) * (W - m.l - m.r); }
    function y(v) { return m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b); }

    var dec = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    var unit = Store.unitShort();
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="' + NS + '" role="img" aria-label="Weight chart">';
    // grid + y labels
    for (var v = lo; v <= hi + step / 2; v += step) {
      svg += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/>' +
        '<text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--ink-3)">' + v.toFixed(dec) + '</text>';
    }
    svg += '<text x="4" y="' + (m.t + 4) + '" font-size="11" fill="var(--ink-3)">' + unit + '</text>';
    // x labels
    var every = Math.max(1, Math.ceil(spanDays / 7));
    for (var i = 0; i <= spanDays; i += every) {
      var dd = Store.addDays(d0, i);
      svg += '<text x="' + x(dd) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--ink-3)">' + esc(Store.fmtDate(dd)) + '</text>';
    }
    svg += '<line id="xhair" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="var(--ink-3)" stroke-width="1" style="display:none"/>';
    // lines
    var labels = [];
    data.forEach(function (s) {
      if (!s.pts.length) return;
      var path = s.pts.map(function (p, j) { return (j ? 'L' : 'M') + x(p.date).toFixed(1) + ',' + y(p.v).toFixed(1); }).join('');
      // White or black collars get a gray outline so the line shows on any background.
      if (s.halo) svg += '<path d="' + path + '" fill="none" stroke="var(--ink-3)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>';
      svg +='<path d="' + path + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' +
        (s.dashed ? ' stroke-dasharray="6 4"' : '') + '/>';
      s.pts.forEach(function (p) {
        svg += '<circle cx="' + x(p.date) + '" cy="' + y(p.v) + '" r="4" fill="' + s.color + '" stroke="' + (s.halo ? 'var(--ink-3)' : 'var(--surface)') + '" stroke-width="' + (s.halo ? 1.5 : 2) + '"/>';
      });
      var last = s.pts[s.pts.length - 1];
      labels.push({ y: y(last.v), x: x(last.date), name: s.k.name || 'Unnamed' });
    });
    // direct labels at line ends (only when few kittens), nudged apart
    if (data.length <= 4) {
      labels.sort(function (a, b) { return a.y - b.y; });
      for (var j = 1; j < labels.length; j++) if (labels[j].y - labels[j - 1].y < 14) labels[j].y = labels[j - 1].y + 14;
      labels.forEach(function (l) {
        svg += '<text x="' + (l.x + 8) + '" y="' + (l.y + 4) + '" font-size="12" font-weight="600" fill="var(--ink-2)">' + esc(l.name) + '</text>';
      });
    }
    svg += '<rect id="hit" x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/>';
    svg += '</svg><div class="chart-tip" id="chart-tip"></div>';
    wrap.innerHTML = svg;
    bindHover(data, d0, spanDays, W, m, x);
  }

  function bindHover(data, d0, spanDays, W, m, x) {
    var svgEl = wrap.querySelector('svg'), hit = wrap.querySelector('#hit');
    var xh = wrap.querySelector('#xhair'), tip = wrap.querySelector('#chart-tip');
    function show(clientX) {
      var r = svgEl.getBoundingClientRect(), scale = W / r.width;
      var px = (clientX - r.left) * scale;
      var day = Math.round(((px - m.l) / (W - m.l - m.r)) * spanDays);
      day = Math.max(0, Math.min(spanDays, day));
      var date = Store.addDays(d0, day), rows = '';
      data.forEach(function (s) {
        var p = s.pts.filter(function (q) { return q.date === date; })[0];
        if (p) rows += '<div class="row"><i class="dot" style="background:' + s.color + '"></i>' + esc(s.k.name || 'Unnamed') + '<b>' + esc(Store.fmtWeight(p.g)) + '</b></div>';
      });
      var cx = x(date);
      xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.display = '';
      tip.innerHTML = '<div style="font-weight:700;margin-bottom:2px">' + esc(Store.fmtDate(date, true)) + '</div>' + (rows || '<div class="row">No weigh-ins</div>');
      tip.style.display = 'block';
      var left = cx / scale + 12;
      if (left + tip.offsetWidth > r.width) left = cx / scale - tip.offsetWidth - 12;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = '10px';
    }
    function hide() { xh.style.display = 'none'; tip.style.display = 'none'; }
    hit.addEventListener('mousemove', function (e) { show(e.clientX); });
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchstart', function (e) { show(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener('touchmove', function (e) { show(e.touches[0].clientX); }, { passive: true });
  }

  /* ---------- table ---------- */
  function cellHTML(kid, date) {
    var w = Store.getWeight(kid, date), u = Store.state.settings.unit, g = w ? w.grams : null;
    var attrs = ' data-k="' + kid + '" data-d="' + date + '"';
    if (u === 'lboz') {
      var lo = g != null ? Store.splitLbOz(g) : { lb: '', oz: '' };
      return '<td class="lboz"><input type="number" inputmode="decimal" min="0" step="1" data-part="lb"' + attrs + ' value="' + lo.lb + '">' +
        '<span class="unit">lb</span><input type="number" inputmode="decimal" min="0" step="0.1" data-part="oz"' + attrs + ' value="' + lo.oz + '"><span class="unit">oz</span></td>';
    }
    var n = g != null ? Store.toUnit(g) : '';
    if (n !== '') n = u === 'g' ? Math.round(n) : u === 'kg' ? n.toFixed(3) : u === 'oz' ? n.toFixed(1) : n.toFixed(2);
    var step = u === 'g' ? '1' : u === 'kg' ? '0.001' : u === 'oz' ? '0.1' : '0.01';
    return '<td><input type="number" inputmode="decimal" min="0" step="' + step + '"' + attrs + ' value="' + n + '"><span class="unit">' + Store.unitShort(u) + '</span></td>';
  }

  function renderTable() {
    var ks = kittens();
    if (!ks.length) { tableEl.innerHTML = ''; return; }
    var from = rangeStart(), set = {};
    set[Store.today()] = true;
    extraDates.forEach(function (d) { set[d] = true; });
    ks.forEach(function (k) { Store.weightsFor(k.id).forEach(function (w) { if (w.date >= from) set[w.date] = true; }); });
    var dates = Object.keys(set).sort().reverse();
    var html = '<table class="wt"><thead><tr><th>Date</th>' + ks.map(function (k) {
      return '<th><i class="dot" style="background:' + Store.kittenColor(k) + '"></i>' + esc(k.name || 'Unnamed') + '</th>';
    }).join('') + '</tr></thead><tbody>';
    dates.forEach(function (d) {
      html += '<tr><td class="date">' + esc(Store.fmtDate(d, true)) + '</td>' + ks.map(function (k) { return cellHTML(k.id, d); }).join('') + '</tr>';
    });
    tableEl.innerHTML = html + '</tbody></table>';
  }

  tableEl.addEventListener('change', function (e) {
    var inp = e.target;
    if (!inp.hasAttribute('data-k')) return;
    var kid = inp.getAttribute('data-k'), d = inp.getAttribute('data-d'), g;
    if (inp.hasAttribute('data-part')) {
      var cell = inp.parentNode;
      var lb = cell.querySelector('[data-part=lb]').value, oz = cell.querySelector('[data-part=oz]').value;
      g = lb === '' && oz === '' ? null : Store.fromLbOz(lb, oz);
    } else {
      g = inp.value === '' ? null : Store.fromUnit(inp.value);
    }
    skipTable = true;
    Store.setWeight(kid, d, g);
    skipTable = false;
  });

  /* ---------- controls ---------- */
  document.getElementById('weight-range').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    rangeDays = +b.getAttribute('data-days');
    $all('button', this).forEach(function (x) { x.classList.toggle('active', x === b); });
    render();
  });
  document.getElementById('add-weigh-day').addEventListener('click', function () {
    var root = UI.openModal('<div class="modal-head"><h2>Add a weigh-in day</h2><button class="btn" data-x>Close</button></div>' +
      '<label class="field"><span>Date</span><input type="date" id="wd-date" value="' + Store.addDays(Store.today(), -1) + '"></label>' +
      '<div class="modal-foot"><button class="btn primary" data-ok>Add row</button><button class="btn" data-x>Cancel</button></div>');
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (!e.target.closest('[data-ok]')) return;
      var d = root.querySelector('#wd-date').value;
      if (d) {
        extraDates.push(d);
        if (rangeDays && d < rangeStart()) {
          rangeDays = 0;
          $all('#weight-range button').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-days') === '0'); });
        }
      }
      UI.closeModal(); render();
    });
  });
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderChart, 200); });

  function render() {
    renderChart();
    if (!skipTable) renderTable();
  }

  window.Weights = { render: render };
})();

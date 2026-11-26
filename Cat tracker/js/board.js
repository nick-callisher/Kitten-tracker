/* Kanban board with press-and-hold drag for touch (iOS 12 has no reliable
   HTML5 drag and drop for web pages) plus mouse drag for testing on a PC. */
(function () {
  'use strict';
  var esc = UI.esc;
  var boardEl = document.getElementById('board');

  function genderHTML(g) {
    if (g === 'Female') return '<span title="Female">&#9792; F</span>';
    if (g === 'Male') return '<span title="Male">&#9794; M</span>';
    return g ? esc(g) : '';
  }

  function cardHTML(k) {
    var lw = Store.latestWeights(k.id), wHTML = '';
    if (lw.last) {
      wHTML = esc(Store.fmtWeight(lw.last.grams));
      if (lw.prev) {
        var diff = lw.last.grams - lw.prev.grams;
        var cls = Math.abs(diff) < 1 ? 'flat' : diff > 0 ? 'up' : 'down';
        var sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
        wHTML += '<span class="delta ' + cls + '">' + sign + esc(Store.fmtWeight(Math.abs(diff))) + '</span>';
      }
      if (lw.last.date !== Store.today()) wHTML += ' <span class="card-sub">(' + esc(Store.fmtDate(lw.last.date)) + ')</span>';
    } else {
      wHTML = '<span class="card-sub">No weight yet</span>';
    }
    var sub = [k.cNumber ? esc(k.cNumber.toUpperCase()) : '', genderHTML(k.gender)].filter(Boolean).join(' · ');
    var sub2 = [k.breed, k.color].filter(Boolean).map(esc).join(' · ');
    var tracked = Store.isTracked(k);
    var rows = '';
    if (tracked) rows += '<div><span class="lbl">Dewormer</span>' + UI.dueHTML(Store.nextDewormer(k)) + '</div>';
    if (k.spayDate) rows += '<div><span class="lbl">Spay/neuter</span>' + UI.dueHTML(k.spayDate) + '</div>';
    else if (tracked) rows += '<div><span class="lbl">Spay/neuter</span><span class="pill ok">Not booked</span></div>';
    var fv = Store.nextFvrcp(k);
    if (fv && tracked) rows += '<div><span class="lbl">FVRCP</span>' + UI.dueHTML(fv) + '</div>';
    return '<div class="card" data-id="' + k.id + '" style="--kc:' + Store.kittenColor(k) + '">' +
      '<div class="card-top"><div class="card-photo">' + UI.photoHTML(k) + '</div>' +
      '<div class="card-main"><div class="card-name">' + esc(k.name || 'Unnamed') + '</div>' +
      '<div class="card-sub">' + sub + '</div>' +
      (sub2 ? '<div class="card-sub">' + sub2 + '</div>' : '') +
      '<div class="card-weight">' + wHTML + '</div></div></div>' +
      (rows ? '<div class="card-dates">' + rows + '</div>' : '') + '</div>';
  }

  function render() {
    var scroll = boardEl.scrollLeft;
    boardEl.innerHTML = Store.state.stages.map(function (st) {
      var ks = Store.kittensInStage(st.id);
      return '<div class="column" data-stage="' + st.id + '">' +
        '<div class="column-head"><span>' + esc(st.name) + '</span><span class="count">' + ks.length + '</span>' +
        '<span class="spacer"></span><button class="btn small" data-add="' + st.id + '" aria-label="Add kitten to ' + esc(st.name) + '">+</button></div>' +
        '<div class="column-cards">' + ks.map(cardHTML).join('') + '</div></div>';
    }).join('');
    boardEl.scrollLeft = scroll;
  }

  /* ---------- drag and drop ---------- */
  var HOLD_MS = 300, MOVE_CANCEL = 10;
  var press = null;   // pending press { card, x, y, timer }
  var drag = null;    // active drag { card, ghost, offX, offY, marker, column, index }
  var suppressClick = false;
  var scrollTimer = null;

  function startDrag(card, x, y) {
    var r = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('pressing');
    ghost.style.width = r.width + 'px';
    document.body.appendChild(ghost);
    card.classList.add('dragging-src');
    var marker = document.createElement('div');
    marker.className = 'drop-marker';
    drag = { card: card, ghost: ghost, offX: x - r.left, offY: y - r.top, marker: marker, column: null, index: 0, x: x, y: y };
    moveDrag(x, y);
    scrollTimer = setInterval(autoScroll, 30);
  }

  function moveDrag(x, y) {
    drag.x = x; drag.y = y;
    drag.ghost.style.left = (x - drag.offX) + 'px';
    drag.ghost.style.top = (y - drag.offY) + 'px';
    var under = document.elementFromPoint(x, y);
    var col = under && under.closest ? under.closest('.column') : null;
    if (drag.column && drag.column !== col) drag.column.classList.remove('drop-target');
    if (!col) { if (drag.marker.parentNode) drag.marker.parentNode.removeChild(drag.marker); drag.column = null; return; }
    col.classList.add('drop-target');
    drag.column = col;
    var list = col.querySelector('.column-cards');
    var cards = UI.$all('.card', list).filter(function (c) { return c !== drag.card; });
    var idx = cards.length;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { idx = i; break; }
    }
    drag.index = idx;
    var before = cards[idx] || null;
    if (drag.marker.nextSibling !== before || drag.marker.parentNode !== list) list.insertBefore(drag.marker, before);
  }

  function autoScroll() {
    if (!drag) return;
    var edge = 60, speed = 14;
    var br = boardEl.getBoundingClientRect();
    if (drag.x > br.right - edge) boardEl.scrollLeft += speed;
    else if (drag.x < br.left + edge) boardEl.scrollLeft -= speed;
    if (drag.y > window.innerHeight - edge) window.scrollBy(0, speed);
    else if (drag.y < edge + 60) window.scrollBy(0, -speed);
    moveDrag(drag.x, drag.y);
  }

  function endDrag(cancel) {
    clearInterval(scrollTimer);
    var d = drag; drag = null;
    if (!d) return;
    d.ghost.parentNode.removeChild(d.ghost);
    d.card.classList.remove('dragging-src');
    if (d.marker.parentNode) d.marker.parentNode.removeChild(d.marker);
    if (d.column) d.column.classList.remove('drop-target');
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 400);
    if (cancel || !d.column) return;
    var stageId = d.column.getAttribute('data-stage');
    var k = Store.getKitten(d.card.getAttribute('data-id'));
    var others = Store.kittensInStage(stageId).filter(function (o) { return o.id !== k.id; });
    others.splice(d.index, 0, k);
    var moved = k.stageId !== stageId;
    k.stageId = stageId;
    others.forEach(function (o, i) { o.order = i; });
    Store.save();
    if (moved) UI.toast((k.name || 'Kitten') + ' moved to ' + Store.getStage(stageId).name);
  }

  function cancelPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press.card.classList.remove('pressing');
    press = null;
  }

  // Touch
  boardEl.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { cancelPress(); return; }
    var card = e.target.closest('.card');
    if (!card) return;
    var t = e.touches[0];
    press = { card: card, x: t.clientX, y: t.clientY };
    card.classList.add('pressing');
    press.timer = setTimeout(function () {
      var p = press; press = null;
      p.card.classList.remove('pressing');
      startDrag(p.card, p.x, p.y);
    }, HOLD_MS);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (drag) { e.preventDefault(); moveDrag(t.clientX, t.clientY); return; }
    if (press && (Math.abs(t.clientX - press.x) > MOVE_CANCEL || Math.abs(t.clientY - press.y) > MOVE_CANCEL)) cancelPress();
  }, { passive: false });

  document.addEventListener('touchend', function () { cancelPress(); if (drag) endDrag(false); });
  document.addEventListener('touchcancel', function () { cancelPress(); if (drag) endDrag(true); });
  boardEl.addEventListener('contextmenu', function (e) { if (e.target.closest('.card')) e.preventDefault(); });

  // Mouse (for testing on a computer)
  var mouse = null;
  boardEl.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var card = e.target.closest('.card');
    if (!card) return;
    mouse = { card: card, x: e.clientX, y: e.clientY };
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (drag && mouse) { moveDrag(e.clientX, e.clientY); return; }
    if (mouse && (Math.abs(e.clientX - mouse.x) > 6 || Math.abs(e.clientY - mouse.y) > 6)) {
      startDrag(mouse.card, mouse.x, mouse.y);
      moveDrag(e.clientX, e.clientY);
    }
  });
  document.addEventListener('mouseup', function () {
    if (drag && mouse) endDrag(false);
    mouse = null;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drag) endDrag(true); });

  // Tap to open, + to add
  boardEl.addEventListener('click', function (e) {
    if (suppressClick) return;
    var add = e.target.closest('[data-add]');
    if (add) { KittenEditor.open(null, add.getAttribute('data-add')); return; }
    var card = e.target.closest('.card');
    if (card) KittenEditor.open(card.getAttribute('data-id'));
  });

  window.Board = { render: render, isDragging: function () { return !!drag; } };
})();

/* Month calendar. Spay/neuter, dewormer and FVRCP dates come straight from the
   kitten cards, so editing in either place updates both. Manual events are
   stored separately and can optionally be tied to a kitten. */
(function () {
  'use strict';
  var esc = UI.esc, $ = UI.$;
  var calEl = document.getElementById('calendar');
  var titleEl = document.getElementById('cal-title');
  var listEl = document.getElementById('cal-day-list');
  var legendEl = document.getElementById('cal-legend');
  var now = new Date();
  var viewY = now.getFullYear(), viewM = now.getMonth();
  var selected = Store.today();
  var MAX_CHIPS = 3;

  function gridStart() {
    var first = new Date(viewY, viewM, 1);
    var offset = (first.getDay() - Store.state.settings.weekStart + 7) % 7;
    first.setDate(1 - offset);
    return Store.toISO(first);
  }

  function render() {
    var s = Store.state.settings;
    titleEl.textContent = Store.MONTHS_LONG[viewM] + ' ' + viewY;
    legendEl.innerHTML = s.apptTypes.map(function (t) {
      return '<span><i class="dot" style="background:' + esc(t.color) + '"></i>' + esc(t.name) + '</span>';
    }).join('');
    var start = gridStart(), end = Store.addDays(start, 41), t = Store.today();
    var events = Store.eventsBetween(start, end), byDay = {};
    events.forEach(function (e) { (byDay[e.date] = byDay[e.date] || []).push(e); });

    var html = '';
    for (var i = 0; i < 7; i++) html += '<div class="cal-dow">' + Store.DOW[(i + s.weekStart) % 7] + '</div>';
    for (var d = 0; d < 42; d++) {
      var iso = Store.addDays(start, d), date = Store.parseISO(iso), evs = byDay[iso] || [];
      var cls = 'cal-day' + (date.getMonth() !== viewM ? ' other' : '') + (iso === t ? ' today' : '') + (iso === selected ? ' selected' : '');
      html += '<div class="' + cls + '" data-date="' + iso + '"><span class="cal-num">' + date.getDate() + '</span>';
      evs.slice(0, MAX_CHIPS).forEach(function (e) {
        html += '<div class="cal-ev" style="background:' + esc(Store.apptType(e.type).color) + '">' +
          (e.time ? esc(Store.fmtTime(e.time)) + ' ' : '') + esc(e.title) + '</div>';
      });
      if (evs.length > MAX_CHIPS) html += '<div class="cal-more">+' + (evs.length - MAX_CHIPS) + ' more</div>';
      html += '</div>';
    }
    calEl.innerHTML = html;
    renderDay();
  }

  var dayEvents = [];
  function renderDay() {
    dayEvents = Store.eventsBetween(selected, selected);
    var html = '<div class="view-toolbar"><h3>' + esc(Store.fmtDate(selected, true)) + '</h3><span class="spacer"></span>' +
      '<button class="btn small" data-add-on="' + selected + '">+ Add event this day</button></div>';
    if (!dayEvents.length) html += '<div class="empty">Nothing scheduled.</div>';
    dayEvents.forEach(function (e, i) {
      var tag = e.source === 'manual' ? 'Calendar event' : 'From kitten card';
      html += '<div class="ev-row" data-ev="' + i + '"><span class="when">' + (e.time ? esc(Store.fmtTime(e.time)) : 'All day') + '</span>' +
        '<i class="dot" style="background:' + esc(Store.apptType(e.type).color) + '"></i>' +
        '<div class="grow">' + esc(e.title) + (e.notes ? '<div class="tag">' + esc(e.notes) + '</div>' : '') + '</div>' +
        '<span class="tag">' + tag + '</span></div>';
    });
    listEl.innerHTML = html;
  }

  /* ---------- event editor ---------- */
  function kittenOptions(sel) {
    var ks = Store.state.kittens.filter(function (k) { return !k.archived || k.id === sel; });
    return '<option value="">— None —</option>' + ks.map(function (k) {
      return '<option value="' + k.id + '"' + (k.id === sel ? ' selected' : '') + '>' + esc(Store.kittenLabel(k)) + '</option>';
    }).join('');
  }

  // Manual event (new or existing).
  function openEvent(ev, date) {
    var isNew = !ev;
    ev = ev ? JSON.parse(JSON.stringify(ev)) : { id: Store.uid(), title: '', type: 'vet', date: date || selected, time: '', kittenId: '', notes: '' };
    var types = Store.state.settings.apptTypes.map(function (t) { return { value: t.id, label: t.name }; });
    var root = UI.openModal(
      '<div class="modal-head"><h2>' + (isNew ? 'Add event' : 'Edit event') + '</h2><button class="btn" data-x>Close</button></div>' +
      '<label class="field"><span>Type</span><select id="ev-type">' + UI.options(types, ev.type) + '</select></label>' +
      '<label class="field"><span>Kitten (optional)</span><select id="ev-kitten">' + kittenOptions(ev.kittenId) + '</select>' +
      '<div class="field-hint" id="ev-link-hint"></div></label>' +
      '<label class="field" id="ev-title-wrap"><span>Title</span><input type="text" id="ev-title" value="' + esc(ev.title) + '" placeholder="e.g. Vet check-up"></label>' +
      '<div class="grid2"><label class="field"><span>Date</span><input type="date" id="ev-date" value="' + esc(ev.date) + '"></label>' +
      '<label class="field"><span>Time (optional)</span><input type="time" id="ev-time" value="' + esc(ev.time) + '"></label></div>' +
      '<label class="field"><span>Notes</span><textarea id="ev-notes">' + esc(ev.notes) + '</textarea></label>' +
      '<div class="modal-foot"><button class="btn primary" data-save>Save</button><button class="btn" data-x>Cancel</button>' +
      '<span class="spacer"></span>' + (isNew ? '' : '<button class="btn danger" data-del>Delete</button>') + '</div>');

    function linked() {
      var type = $('#ev-type', root).value, kid = $('#ev-kitten', root).value;
      return isNew && kid && (type === 'spay' || type === 'deworm' || type === 'fvrcp') ? type : '';
    }
    function updateHint() {
      var l = linked();
      $('#ev-link-hint', root).textContent = l === 'spay' ? 'This sets the spay/neuter appointment on the kitten\'s card.' :
        l === 'deworm' ? 'This sets the next dewormer date on the kitten\'s card; later doses follow every ' + Store.state.settings.dewormIntervalDays + ' days.' :
        l === 'fvrcp' ? 'This adds an FVRCP dose to the kitten\'s card.' : '';
      $('#ev-title-wrap', root).style.display = l ? 'none' : '';
    }
    $('#ev-type', root).addEventListener('change', updateHint);
    $('#ev-kitten', root).addEventListener('change', updateHint);
    updateHint();

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (e.target.closest('[data-del]')) {
        if (confirm('Delete this event?')) {
          Store.state.events = Store.state.events.filter(function (x) { return x.id !== ev.id; });
          Store.save(); UI.closeModal();
        }
        return;
      }
      if (!e.target.closest('[data-save]')) return;
      ev.type = $('#ev-type', root).value;
      ev.kittenId = $('#ev-kitten', root).value;
      ev.title = $('#ev-title', root).value.trim();
      ev.date = $('#ev-date', root).value;
      ev.time = $('#ev-time', root).value;
      ev.notes = $('#ev-notes', root).value.trim();
      if (!ev.date) { alert('Please pick a date.'); return; }
      var l = linked();
      if (l) { saveToKitten(l, ev); return; }
      if (!ev.title) ev.title = Store.apptType(ev.type).name;
      if (isNew) Store.state.events.push(ev);
      else Store.state.events = Store.state.events.map(function (x) { return x.id === ev.id ? ev : x; });
      Store.save(); UI.closeModal(); UI.toast('Event saved');
    });
  }

  function saveToKitten(type, ev) {
    var k = Store.getKitten(ev.kittenId);
    if (type === 'spay') {
      if (k.spayDate && k.spayDate !== ev.date && !confirm(k.name + ' already has a spay/neuter appointment on ' + Store.fmtDate(k.spayDate) + '. Replace it?')) return;
      k.spayDate = ev.date; k.spayTime = ev.time; if (ev.notes) k.spayNotes = ev.notes;
    } else if (type === 'deworm') {
      if (!k.firstDewormer) k.firstDewormer = ev.date; else k.dewormerNext = ev.date;
    } else {
      k.fvrcp = k.fvrcp || [];
      k.fvrcp.push({ date: ev.date, given: false });
      k.fvrcp.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    }
    Store.save(); UI.closeModal(); UI.toast('Added to ' + (k.name || 'kitten') + '\'s card');
  }

  // Event that lives on a kitten card.
  function openLinked(e) {
    var k = Store.getKitten(e.kittenId);
    if (e.source === 'deworm') { KittenEditor.open(k.id); return; }
    var isSpay = e.source === 'spay';
    var fv = isSpay ? null : k.fvrcp[e.index];
    var root = UI.openModal(
      '<div class="modal-head"><h2>' + (isSpay ? 'Spay/neuter' : 'FVRCP #' + (e.index + 1)) + ' — ' + esc(Store.kittenLabel(k)) + '</h2>' +
      '<button class="btn" data-x>Close</button></div>' +
      '<p class="field-hint">This appointment is saved on the kitten\'s card. Changes here update the card too.</p>' +
      '<div class="grid2"><label class="field"><span>Date</span><input type="date" id="ln-date" value="' + esc(e.date) + '"></label>' +
      (isSpay ? '<label class="field"><span>Time</span><input type="time" id="ln-time" value="' + esc(k.spayTime) + '"></label>' :
        '<label class="field check" style="margin-top:22px"><input type="checkbox" id="ln-given"' + (fv.given ? ' checked' : '') + '>Given</label>') + '</div>' +
      (isSpay ? '<label class="field"><span>Notes</span><input type="text" id="ln-notes" value="' + esc(k.spayNotes) + '"></label>' : '') +
      '<div class="modal-foot"><button class="btn primary" data-save>Save</button><button class="btn" data-card>Open kitten card</button>' +
      '<span class="spacer"></span><button class="btn danger" data-del>Remove</button></div>');
    root.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (ev.target.closest('[data-card]')) { UI.closeModal(); KittenEditor.open(k.id); return; }
      if (ev.target.closest('[data-del]')) {
        if (!confirm('Remove this appointment from ' + (k.name || 'the kitten') + '\'s card?')) return;
        if (isSpay) { k.spayDate = ''; k.spayTime = ''; } else k.fvrcp.splice(e.index, 1);
        Store.save(); UI.closeModal(); return;
      }
      if (!ev.target.closest('[data-save]')) return;
      var d = $('#ln-date', root).value;
      if (!d) { alert('Please pick a date.'); return; }
      if (isSpay) { k.spayDate = d; k.spayTime = $('#ln-time', root).value; k.spayNotes = $('#ln-notes', root).value.trim(); }
      else { fv.date = d; fv.given = $('#ln-given', root).checked; }
      Store.save(); UI.closeModal(); UI.toast('Saved to card');
    });
  }

  /* ---------- wiring ---------- */
  calEl.addEventListener('click', function (e) {
    var day = e.target.closest('.cal-day');
    if (!day) return;
    selected = day.getAttribute('data-date');
    var d = Store.parseISO(selected);
    if (d.getMonth() !== viewM) { viewY = d.getFullYear(); viewM = d.getMonth(); }
    render();
  });
  listEl.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add-on]');
    if (add) { openEvent(null, add.getAttribute('data-add-on')); return; }
    var row = e.target.closest('[data-ev]');
    if (!row) return;
    var ev = dayEvents[+row.getAttribute('data-ev')];
    if (ev.source === 'manual') {
      var orig = Store.state.events.filter(function (x) { return x.id === ev.id; })[0];
      openEvent(orig);
    } else openLinked(ev);
  });
  function shift(n) { viewM += n; if (viewM < 0) { viewM = 11; viewY--; } if (viewM > 11) { viewM = 0; viewY++; } render(); }
  document.getElementById('cal-prev').addEventListener('click', function () { shift(-1); });
  document.getElementById('cal-next').addEventListener('click', function () { shift(1); });
  document.getElementById('cal-today').addEventListener('click', function () {
    var n = new Date(); viewY = n.getFullYear(); viewM = n.getMonth(); selected = Store.today(); render();
  });
  document.getElementById('add-event').addEventListener('click', function () { openEvent(null, selected); });

  window.Calendar = { render: render };
})();

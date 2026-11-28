/* Data store: everything is saved in this browser's localStorage.
   On iPad, the Home Screen app keeps its own separate storage from Safari,
   so always open the app from the same place.
   Weights are stored in grams internally and converted for display. */
(function () {
  'use strict';

  var KEY = 'kittenTracker.v1';
  var GRAMS_PER_LB = 453.59237;
  var GRAMS_PER_OZ = GRAMS_PER_LB / 16;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaults() {
    var home = uid(), spay = uid(), shelter = uid();
    return {
      version: 1,
      stages: [
        { id: home, name: 'At home', track: true },
        { id: spay, name: 'Ready for spay/neuter', track: true },
        { id: shelter, name: 'At shelter', track: false }
      ],
      kittens: [],
      weights: [],   // { id, kittenId, date: 'YYYY-MM-DD', grams }
      events: [],    // manual events { id, title, date, time, type, kittenId, notes }
      documents: [], // { id, kittenId, name, category, date, mime, size, notes, thumb, added } — file data is in DocsDB
      settings: {
        unit: 'lb',              // lb | lboz | oz | g | kg
        dewormIntervalDays: 14,
        dewormDoses: 6,          // total doses shown in the schedule
        fvrcpIntervalDays: 21,
        dueSoonDays: 3,
        chartStageId: home,
        weekStart: 0,            // 0 = Sunday, 1 = Monday
        theme: 'light',
        textSize: 'm',
        backupReminderDays: 7,
        cNumberYear: String(new Date().getFullYear()).slice(-2),
        docCategories: ['Vet record', 'Vaccine record', 'Intake form', 'Spay/neuter', 'Test results', 'Photo', 'Other'],
        apptTypes: [
          { id: 'spay', name: 'Spay/neuter', color: '#d03b3b' },
          { id: 'deworm', name: 'Dewormer', color: '#1baf7a' },
          { id: 'fvrcp', name: 'FVRCP vaccine', color: '#6250d6' },
          { id: 'vet', name: 'Vet visit', color: '#2a78d6' },
          { id: 'other', name: 'Other', color: '#7a7974' }
        ]
      },
      meta: { lastBackup: null, created: new Date().toISOString() }
    };
  }

  var state;
  var listeners = [];

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        state = migrate(JSON.parse(raw));
        return;
      }
    } catch (e) {
      console.warn('Could not load saved data', e);
    }
    state = defaults();
  }

  // Fill in any settings added in later versions.
  function migrate(s) {
    var d = defaults();
    if (!s.stages || !s.stages.length) s.stages = d.stages;
    s.kittens = s.kittens || [];
    s.weights = s.weights || [];
    s.events = s.events || [];
    s.documents = s.documents || [];
    s.meta = s.meta || d.meta;
    s.settings = s.settings || {};
    for (var k in d.settings) {
      if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
    }
    if (!findStage(s, s.settings.chartStageId)) s.settings.chartStageId = s.stages[0].id;
    return s;
  }

  function findStage(s, id) {
    for (var i = 0; i < s.stages.length; i++) if (s.stages[i].id === id) return s.stages[i];
    return null;
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('Could not save! Storage may be full. Try removing some photos or exporting a backup.\n\n' + e.message);
      return false;
    }
    for (var i = 0; i < listeners.length; i++) listeners[i]();
    return true;
  }

  /* ---------- dates (always local 'YYYY-MM-DD' strings) ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    if (!s) return null;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function today() { return toISO(new Date()); }
  function addDays(iso, n) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  function daysBetween(a, b) { // b - a, in whole days
    return Math.round((parseISO(b) - parseISO(a)) / 86400000);
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtDate(iso, withDow) {
    if (!iso) return '';
    var d = parseISO(iso);
    return (withDow ? DOW[d.getDay()] + ', ' : '') + MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':'), h = +p[0];
    return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' AM' : ' PM');
  }

  /* ---------- weight units ---------- */
  var UNITS = {
    lb: 'Pounds (lb)',
    lboz: 'Pounds + ounces (lb oz)',
    oz: 'Ounces (oz)',
    g: 'Grams (g)',
    kg: 'Kilograms (kg)'
  };
  function fmtWeight(grams, unit) {
    if (grams == null || isNaN(grams)) return '';
    unit = unit || state.settings.unit;
    if (unit === 'lb') return (grams / GRAMS_PER_LB).toFixed(2) + ' lb';
    if (unit === 'oz') return (grams / GRAMS_PER_OZ).toFixed(1) + ' oz';
    if (unit === 'g') return Math.round(grams) + ' g';
    if (unit === 'kg') return (grams / 1000).toFixed(3) + ' kg';
    var lo = splitLbOz(grams);
    return lo.lb + ' lb ' + lo.oz + ' oz';
  }
  function splitLbOz(grams) {
    var totalOz = Math.round((grams / GRAMS_PER_OZ) * 10) / 10;
    var lb = Math.floor(totalOz / 16);
    var oz = Math.round((totalOz - lb * 16) * 10) / 10;
    return { lb: lb, oz: oz };
  }
  // Number in the current unit (lboz -> decimal lb) for charts/inputs.
  function toUnit(grams, unit) {
    unit = unit || state.settings.unit;
    if (unit === 'lb' || unit === 'lboz') return grams / GRAMS_PER_LB;
    if (unit === 'oz') return grams / GRAMS_PER_OZ;
    if (unit === 'kg') return grams / 1000;
    return grams;
  }
  function fromUnit(value, unit) {
    unit = unit || state.settings.unit;
    var v = parseFloat(value);
    if (isNaN(v)) return null;
    if (unit === 'lb' || unit === 'lboz') return v * GRAMS_PER_LB;
    if (unit === 'oz') return v * GRAMS_PER_OZ;
    if (unit === 'kg') return v * 1000;
    return v;
  }
  function fromLbOz(lb, oz) {
    var l = parseFloat(lb) || 0, o = parseFloat(oz) || 0;
    if (!lb && !oz && lb !== 0 && oz !== 0) return null;
    return l * GRAMS_PER_LB + o * GRAMS_PER_OZ;
  }
  function unitShort(unit) {
    unit = unit || state.settings.unit;
    return unit === 'lboz' ? 'lb' : unit;
  }

  /* ---------- kittens ---------- */
  function newKitten(stageId) {
    return {
      id: uid(),
      stageId: stageId || state.stages[0].id,
      order: Date.now(),
      name: '', cNumber: '', gender: '', breed: '', color: '',
      photo: '', intakeDate: today(),
      firstDewormer: '', dewormerNext: '',
      spayDate: '', spayTime: '', spayNotes: '',
      fvrcp: [],            // [{ date, given }]
      felv: '', fiv: '', testDate: '',
      notes: '',
      colorSlot: pickColorSlot(),
      archived: false
    };
  }
  function pickColorSlot() {
    var used = [0, 0, 0, 0, 0, 0, 0, 0];
    state.kittens.forEach(function (k) { if (!k.archived) used[k.colorSlot || 0]++; });
    var best = 0;
    for (var i = 1; i < 8; i++) if (used[i] < used[best]) best = i;
    return best;
  }
  function kittenColor(k) {
    return 'var(--s' + (((k.colorSlot || 0) % 8) + 1) + ')';
  }
  function getKitten(id) {
    for (var i = 0; i < state.kittens.length; i++) if (state.kittens[i].id === id) return state.kittens[i];
    return null;
  }
  function kittenLabel(k) {
    if (!k) return '';
    return (k.name || 'Unnamed') + (k.cNumber ? ' (' + k.cNumber + ')' : '');
  }
  function upsertKitten(k) {
    var existing = getKitten(k.id);
    if (existing) {
      for (var p in k) existing[p] = k[p];
    } else {
      state.kittens.push(k);
    }
    return save();
  }
  function deleteKitten(id) {
    state.kittens = state.kittens.filter(function (k) { return k.id !== id; });
    state.weights = state.weights.filter(function (w) { return w.kittenId !== id; });
    state.events.forEach(function (e) { if (e.kittenId === id) e.kittenId = ''; });
    var gone = state.documents.filter(function (d) { return d.kittenId === id; });
    state.documents = state.documents.filter(function (d) { return d.kittenId !== id; });
    gone.forEach(function (d) { if (window.DocsDB) DocsDB.remove(d.id); });
    save();
  }

  /* ---------- documents (details only; files are in DocsDB) ---------- */
  function documentsFor(kittenId) {
    return state.documents.filter(function (d) { return kittenId == null || d.kittenId === kittenId; })
      .sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : (b.date || '') > (a.date || '') ? 1 : (b.added < a.added ? -1 : 1); });
  }
  function getDocument(id) {
    for (var i = 0; i < state.documents.length; i++) if (state.documents[i].id === id) return state.documents[i];
    return null;
  }
  function docsTotalKB() {
    return Math.round(state.documents.reduce(function (n, d) { return n + (d.size || 0); }, 0) / 1024);
  }
  function kittensInStage(stageId) {
    return state.kittens
      .filter(function (k) { return k.stageId === stageId && !k.archived; })
      .sort(function (a, b) { return a.order - b.order; });
  }
  function isTracked(k) {
    if (k.archived) return false;
    var st = findStage(state, k.stageId);
    return !!(st && st.track);
  }

  // C number like c123-26. Accepts upper or lower case.
  var CNUM_RE = /^c\d{1,4}-\d{2}$/i;
  function normalizeCNumber(v) {
    v = (v || '').trim().toLowerCase().replace(/\s+/g, '');
    if (/^\d{1,4}$/.test(v)) v = 'c' + v + '-' + state.settings.cNumberYear;
    else if (/^\d{1,4}-\d{2}$/.test(v)) v = 'c' + v;
    else if (/^c\d{1,4}$/.test(v)) v = v + '-' + state.settings.cNumberYear;
    return v;
  }

  /* ---------- dewormer schedule ---------- */
  // First dose date, then every N days. Typing a "next due" date by hand
  // moves the rest of the schedule to follow from that date.
  function dewormSchedule(k) {
    var s = state.settings, out = [];
    if (!k.firstDewormer && !k.dewormerNext) return out;
    var interval = +s.dewormIntervalDays || 14, total = Math.max(1, +s.dewormDoses || 6);
    if (k.firstDewormer) out.push(k.firstDewormer);
    var d = k.dewormerNext || addDays(k.firstDewormer, interval);
    while (out.length < total) {
      if (!k.firstDewormer || d > k.firstDewormer) out.push(d);
      d = addDays(d, interval);
    }
    return out;
  }
  function nextDewormer(k) {
    var t = today(), sch = dewormSchedule(k);
    for (var i = 0; i < sch.length; i++) {
      // first dose itself counts as given
      if (i === 0 && k.firstDewormer && sch[0] === k.firstDewormer) continue;
      if (sch[i] >= t) return sch[i];
    }
    return '';
  }
  function nextFvrcp(k) {
    var due = (k.fvrcp || []).filter(function (v) { return v.date && !v.given; })
      .map(function (v) { return v.date; }).sort();
    return due[0] || '';
  }

  // 'over' | 'soon' | 'ok' | ''
  function dueStatus(iso) {
    if (!iso) return '';
    var diff = daysBetween(today(), iso);
    if (diff < 0) return 'over';
    if (diff <= (+state.settings.dueSoonDays || 0)) return 'soon';
    return 'ok';
  }

  /* ---------- weights ---------- */
  function weightsFor(kittenId) {
    return state.weights.filter(function (w) { return w.kittenId === kittenId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function getWeight(kittenId, date) {
    for (var i = 0; i < state.weights.length; i++) {
      var w = state.weights[i];
      if (w.kittenId === kittenId && w.date === date) return w;
    }
    return null;
  }
  function setWeight(kittenId, date, grams) {
    var w = getWeight(kittenId, date);
    if (grams == null || isNaN(grams) || grams <= 0) {
      if (w) state.weights.splice(state.weights.indexOf(w), 1);
    } else if (w) {
      w.grams = grams;
    } else {
      state.weights.push({ id: uid(), kittenId: kittenId, date: date, grams: grams });
    }
    return save();
  }
  function latestWeights(kittenId) {
    var list = weightsFor(kittenId);
    return { last: list[list.length - 1] || null, prev: list[list.length - 2] || null };
  }

  /* ---------- calendar events ---------- */
  function apptType(id) {
    var types = state.settings.apptTypes;
    for (var i = 0; i < types.length; i++) if (types[i].id === id) return types[i];
    return types[types.length - 1];
  }
  // All events (from kitten cards + manual) between two dates inclusive.
  function eventsBetween(from, to) {
    var out = [];
    function add(e) { if (e.date >= from && e.date <= to) out.push(e); }
    state.kittens.forEach(function (k) {
      if (k.archived) return;
      var label = kittenLabel(k);
      if (k.spayDate) add({ source: 'spay', type: 'spay', date: k.spayDate, time: k.spayTime,
        title: 'Spay/neuter: ' + label, kittenId: k.id, notes: k.spayNotes });
      if (isTracked(k)) {
        var sch = dewormSchedule(k);
        sch.forEach(function (d, i) {
          add({ source: 'deworm', type: 'deworm', date: d, time: '', kittenId: k.id,
            title: 'Dewormer #' + (i + 1) + ': ' + label });
        });
      }
      (k.fvrcp || []).forEach(function (v, i) {
        if (v.date) add({ source: 'fvrcp', type: 'fvrcp', date: v.date, time: '', kittenId: k.id,
          index: i, given: v.given, title: 'FVRCP #' + (i + 1) + (v.given ? ' (given)' : '') + ': ' + label });
      });
    });
    state.events.forEach(function (e) {
      var copy = {};
      for (var p in e) copy[p] = e[p];
      copy.source = 'manual';
      var k = e.kittenId ? getKitten(e.kittenId) : null;
      if (k && e.title.indexOf(k.name) === -1) copy.title = e.title + ' — ' + kittenLabel(k);
      add(copy);
    });
    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.time || '99') < (b.time || '99') ? -1 : 1;
    });
    return out;
  }

  /* ---------- backup ---------- */
  function exportJSON() {
    return JSON.stringify(state, null, 1);
  }
  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || !data.stages || !data.kittens) throw new Error('This does not look like a Kitten Tracker backup.');
    var files = data.documentFiles || null;
    delete data.documentFiles;
    state = migrate(data);
    save();
    // Backups may include document files; restore them if present.
    if (!window.DocsDB) return Promise.resolve();
    if (!files) return Promise.resolve();
    return DocsDB.clear().then(function () {
      return Promise.all(Object.keys(files).map(function (id) { return DocsDB.put(id, files[id]); }));
    });
  }
  // Full backup including document files (can be large).
  function exportWithFiles() {
    if (!window.DocsDB || !state.documents.length) return Promise.resolve(exportJSON());
    var files = {};
    return Promise.all(state.documents.map(function (d) {
      return DocsDB.get(d.id).then(function (data) { if (data) files[d.id] = data; });
    })).then(function () {
      var copy = JSON.parse(JSON.stringify(state));
      copy.documentFiles = files;
      return JSON.stringify(copy);
    });
  }
  function markBackedUp() {
    state.meta.lastBackup = new Date().toISOString();
    save();
  }
  function resetAll() {
    state = defaults();
    if (window.DocsDB) DocsDB.clear();
    save();
  }
  function storageUsedKB() {
    try { return Math.round((window.localStorage.getItem(KEY) || '').length * 2 / 1024); } catch (e) { return 0; }
  }

  load();

  window.Store = {
    get state() { return state; },
    uid: uid, save: save,
    onChange: function (fn) { listeners.push(fn); },
    // dates
    today: today, toISO: toISO, parseISO: parseISO, addDays: addDays, daysBetween: daysBetween,
    fmtDate: fmtDate, fmtTime: fmtTime, MONTHS_LONG: MONTHS_LONG, DOW: DOW,
    // units
    UNITS: UNITS, fmtWeight: fmtWeight, toUnit: toUnit, fromUnit: fromUnit,
    fromLbOz: fromLbOz, splitLbOz: splitLbOz, unitShort: unitShort,
    // stages
    getStage: function (id) { return findStage(state, id); },
    // kittens
    newKitten: newKitten, getKitten: getKitten, upsertKitten: upsertKitten, deleteKitten: deleteKitten,
    kittensInStage: kittensInStage, kittenLabel: kittenLabel, kittenColor: kittenColor, isTracked: isTracked,
    CNUM_RE: CNUM_RE, normalizeCNumber: normalizeCNumber,
    dewormSchedule: dewormSchedule, nextDewormer: nextDewormer, nextFvrcp: nextFvrcp, dueStatus: dueStatus,
    // weights
    weightsFor: weightsFor, getWeight: getWeight, setWeight: setWeight, latestWeights: latestWeights,
    // documents
    documentsFor: documentsFor, getDocument: getDocument, docsTotalKB: docsTotalKB,
    // events
    apptType: apptType, eventsBetween: eventsBetween,
    // backup
    exportJSON: exportJSON, exportWithFiles: exportWithFiles, importJSON: importJSON, markBackedUp: markBackedUp,
    resetAll: resetAll, storageUsedKB: storageUsedKB
  };
})();

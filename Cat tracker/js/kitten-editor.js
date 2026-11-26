/* Add / edit a kitten. Works on a copy; nothing is saved until "Save". */
(function () {
  'use strict';
  var esc = UI.esc, $ = UI.$, $all = UI.$all;
  var draft, isNew, root;
  var TEST_OPTS = ['', 'Negative', 'Positive', 'Pending'];

  function weightInputs(prefix) {
    var u = Store.state.settings.unit;
    if (u === 'lboz') {
      return '<div class="grid2"><input type="number" inputmode="decimal" step="1" min="0" id="' + prefix + '-lb" placeholder="lb">' +
        '<input type="number" inputmode="decimal" step="0.1" min="0" id="' + prefix + '-oz" placeholder="oz"></div>';
    }
    var step = u === 'g' ? '1' : u === 'kg' ? '0.001' : u === 'oz' ? '0.1' : '0.01';
    return '<input type="number" inputmode="decimal" step="' + step + '" min="0" id="' + prefix + '" placeholder="' + Store.unitShort(u) + '">';
  }
  function readWeight(prefix) {
    var u = Store.state.settings.unit;
    if (u === 'lboz') {
      var lb = $('#' + prefix + '-lb', root).value, oz = $('#' + prefix + '-oz', root).value;
      if (lb === '' && oz === '') return null;
      return Store.fromLbOz(lb, oz);
    }
    var v = $('#' + prefix, root).value;
    return v === '' ? null : Store.fromUnit(v);
  }
  function fillWeight(prefix, grams) {
    var u = Store.state.settings.unit;
    if (grams == null) return;
    if (u === 'lboz') {
      var lo = Store.splitLbOz(grams);
      $('#' + prefix + '-lb', root).value = lo.lb;
      $('#' + prefix + '-oz', root).value = lo.oz;
    } else {
      var n = Store.toUnit(grams);
      $('#' + prefix, root).value = u === 'g' ? Math.round(n) : u === 'kg' ? n.toFixed(3) : u === 'oz' ? n.toFixed(1) : n.toFixed(2);
    }
  }

  function scheduleHTML() {
    var sch = Store.dewormSchedule(draft), next = Store.nextDewormer(draft), t = Store.today();
    if (!sch.length) return '<div class="field-hint">Enter the 1st dose date and the rest of the schedule fills in every ' +
      Store.state.settings.dewormIntervalDays + ' days.</div>';
    return '<div class="schedule">' + sch.map(function (d, i) {
      var cls = d === next ? 'next' : d < t ? 'past' : '';
      return '<span class="' + cls + '">#' + (i + 1) + ' ' + esc(Store.fmtDate(d)) + '</span>';
    }).join('') + '</div>';
  }

  function fvrcpHTML() {
    if (!draft.fvrcp.length) return '<div class="empty">No FVRCP doses yet.</div>';
    return draft.fvrcp.map(function (v, i) {
      return '<div class="list-row"><b>#' + (i + 1) + '</b>' +
        '<input type="date" class="grow" data-fv-date="' + i + '" value="' + esc(v.date) + '">' +
        '<label class="check"><input type="checkbox" data-fv-given="' + i + '"' + (v.given ? ' checked' : '') + '>Given</label>' +
        '<button class="btn small danger" data-fv-del="' + i + '" aria-label="Remove dose">&times;</button></div>';
    }).join('');
  }

  function render() {
    var s = Store.state, k = draft;
    var stageOpts = s.stages.map(function (st) { return { value: st.id, label: st.name }; });
    var lw = Store.latestWeights(k.id);
    var html =
      '<div class="modal-head"><h2>' + (isNew ? 'Add kitten' : esc(k.name || 'Kitten')) + '</h2>' +
      '<button class="btn" data-act="cancel">Close</button></div>' +

      '<div class="photo-edit"><div class="card-photo" id="ke-photo">' + UI.photoHTML(k) + '</div><div>' +
      '<label class="btn file-btn">' + (k.photo ? 'Change photo' : 'Add photo') + '<input type="file" accept="image/*" id="ke-file"></label>' +
      (k.photo ? '<button class="btn" data-act="rotate">Rotate</button><button class="btn danger" data-act="nophoto">Remove</button>' : '') +
      '</div></div>' +

      '<div class="grid2">' +
      '<label class="field"><span>Name</span><input type="text" id="ke-name" value="' + esc(k.name) + '" autocomplete="off"></label>' +
      '<label class="field"><span>C number</span><input type="text" id="ke-cnum" value="' + esc(k.cNumber) + '" placeholder="c123-' + esc(s.settings.cNumberYear) + '" autocapitalize="off" autocorrect="off">' +
      '<div class="field-hint">Typing just 123 fills in c123-' + esc(s.settings.cNumberYear) + '</div><div class="field-error" id="ke-cnum-err"></div></label>' +
      '<label class="field"><span>Gender</span><select id="ke-gender">' + UI.options([
        { value: '', label: 'Unknown' }, 'Female', 'Male'], k.gender) + '</select></label>' +
      '<label class="field"><span>Stage</span><select id="ke-stage">' + UI.options(stageOpts, k.stageId) + '</select></label>' +
      '<label class="field"><span>Breed</span><input type="text" id="ke-breed" value="' + esc(k.breed) + '" placeholder="e.g. DSH"></label>' +
      '<label class="field"><span>Color</span><input type="text" id="ke-color" value="' + esc(k.color) + '" placeholder="e.g. Orange tabby"></label>' +
      '<label class="field"><span>Intake date</span><input type="date" id="ke-intake" value="' + esc(k.intakeDate) + '"></label>' +
      '</div>' +

      '<div class="section-title">Weight</div>' +
      '<div class="grid2"><label class="field"><span>Weight (' + esc(Store.UNITS[s.settings.unit]) + ')</span>' + weightInputs('ke-w') + '</label>' +
      '<label class="field"><span>Weigh-in date</span><input type="date" id="ke-wdate" value="' + Store.today() + '"></label></div>' +
      '<div class="field-hint">' + (lw.last ? 'Last: ' + esc(Store.fmtWeight(lw.last.grams)) + ' on ' + esc(Store.fmtDate(lw.last.date)) +
        '. Full history is on the Weights tab.' : 'No weigh-ins yet.') + '</div>' +

      '<div class="section-title">Dewormer</div>' +
      '<div class="grid2"><label class="field"><span>1st dewormer dose</span><input type="date" id="ke-dw1" value="' + esc(k.firstDewormer) + '"></label>' +
      '<label class="field"><span>Next dewormer due</span><input type="date" id="ke-dwnext" value="' + esc(k.dewormerNext || Store.nextDewormer(k)) + '">' +
      '<div class="field-hint" id="ke-dw-hint">' + (k.dewormerNext ? 'Set by hand. <a href="#" data-act="dwauto">Go back to automatic</a>' : 'Automatic (every ' + s.settings.dewormIntervalDays + ' days). Change it to set your own date.') + '</div></label></div>' +
      '<div id="ke-schedule">' + scheduleHTML() + '</div>' +

      '<div class="section-title">Spay / neuter appointment</div>' +
      '<div class="grid3"><label class="field"><span>Date</span><input type="date" id="ke-spay" value="' + esc(k.spayDate) + '"></label>' +
      '<label class="field"><span>Time</span><input type="time" id="ke-spaytime" value="' + esc(k.spayTime) + '"></label>' +
      '<label class="field"><span>Notes</span><input type="text" id="ke-spaynotes" value="' + esc(k.spayNotes) + '" placeholder="Clinic, drop-off…"></label></div>' +

      '<div class="section-title">FVRCP vaccines</div>' +
      '<div id="ke-fvrcp">' + fvrcpHTML() + '</div>' +
      '<button class="btn small" data-act="addfv" style="margin-top:8px">+ Add dose</button>' +

      '<div class="section-title">FeLV / FIV test</div>' +
      '<div class="grid3"><label class="field"><span>FeLV</span><select id="ke-felv">' + UI.options(TEST_OPTS.map(function (o) { return { value: o, label: o || 'Not tested' }; }), k.felv) + '</select></label>' +
      '<label class="field"><span>FIV</span><select id="ke-fiv">' + UI.options(TEST_OPTS.map(function (o) { return { value: o, label: o || 'Not tested' }; }), k.fiv) + '</select></label>' +
      '<label class="field"><span>Test date</span><input type="date" id="ke-testdate" value="' + esc(k.testDate) + '"></label></div>' +

      '<div class="section-title">Notes</div>' +
      '<textarea id="ke-notes" placeholder="Feeding, meds, personality…">' + esc(k.notes) + '</textarea>' +

      '<div class="modal-foot"><button class="btn primary" data-act="save">Save</button>' +
      '<button class="btn" data-act="cancel">Cancel</button><span class="spacer"></span>' +
      (isNew ? '' : '<button class="btn" data-act="archive">' + (k.archived ? 'Restore from archive' : 'Archive') + '</button>' +
        '<button class="btn danger" data-act="delete">Delete</button>') + '</div>';

    root = UI.openModal(html);
    bind();
  }

  // Copy form values into the draft (without saving).
  function collect() {
    draft.name = $('#ke-name', root).value.trim();
    draft.cNumber = Store.normalizeCNumber($('#ke-cnum', root).value);
    draft.gender = $('#ke-gender', root).value;
    draft.stageId = $('#ke-stage', root).value;
    draft.breed = $('#ke-breed', root).value.trim();
    draft.color = $('#ke-color', root).value.trim();
    draft.intakeDate = $('#ke-intake', root).value;
    draft.firstDewormer = $('#ke-dw1', root).value;
    draft.spayDate = $('#ke-spay', root).value;
    draft.spayTime = $('#ke-spaytime', root).value;
    draft.spayNotes = $('#ke-spaynotes', root).value.trim();
    draft.felv = $('#ke-felv', root).value;
    draft.fiv = $('#ke-fiv', root).value;
    draft.testDate = $('#ke-testdate', root).value;
    draft.notes = $('#ke-notes', root).value;
    $all('[data-fv-date]', root).forEach(function (inp) { draft.fvrcp[+inp.getAttribute('data-fv-date')].date = inp.value; });
    $all('[data-fv-given]', root).forEach(function (inp) { draft.fvrcp[+inp.getAttribute('data-fv-given')].given = inp.checked; });
  }

  function refreshSchedule() {
    $('#ke-schedule', root).innerHTML = scheduleHTML();
    var hint = $('#ke-dw-hint', root);
    hint.innerHTML = draft.dewormerNext ? 'Set by hand. <a href="#" data-act="dwauto">Go back to automatic</a>' :
      'Automatic (every ' + Store.state.settings.dewormIntervalDays + ' days). Change it to set your own date.';
  }

  function bind() {
    $('#ke-file', root).addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      collect();
      UI.resizePhoto(f, 320, function (url) { draft.photo = url; render(); });
    });
    $('#ke-cnum', root).addEventListener('blur', function () {
      var v = Store.normalizeCNumber(this.value);
      this.value = v;
      $('#ke-cnum-err', root).textContent = v && !Store.CNUM_RE.test(v) ? 'Expected a format like c123-26' : '';
    });
    $('#ke-dw1', root).addEventListener('change', function () {
      draft.firstDewormer = this.value;
      if (!draft.dewormerNext) $('#ke-dwnext', root).value = Store.nextDewormer(draft);
      refreshSchedule();
    });
    $('#ke-dwnext', root).addEventListener('change', function () {
      draft.dewormerNext = this.value;
      refreshSchedule();
    });
    root.addEventListener('click', onClick);
  }

  function onClick(e) {
    var t = e.target.closest('[data-act],[data-fv-del]');
    if (!t) return;
    if (t.hasAttribute('data-fv-del')) {
      collect(); draft.fvrcp.splice(+t.getAttribute('data-fv-del'), 1);
      $('#ke-fvrcp', root).innerHTML = fvrcpHTML();
      return;
    }
    var act = t.getAttribute('data-act');
    if (act === 'dwauto') {
      e.preventDefault();
      draft.dewormerNext = '';
      $('#ke-dwnext', root).value = Store.nextDewormer(draft);
      refreshSchedule();
    } else if (act === 'addfv') {
      collect();
      var last = draft.fvrcp.length ? draft.fvrcp[draft.fvrcp.length - 1].date : '';
      draft.fvrcp.push({ date: last ? Store.addDays(last, +Store.state.settings.fvrcpIntervalDays || 21) : Store.today(), given: false });
      $('#ke-fvrcp', root).innerHTML = fvrcpHTML();
    } else if (act === 'rotate') {
      collect();
      UI.rotatePhoto(draft.photo, function (url) { draft.photo = url; render(); });
    } else if (act === 'nophoto') {
      collect(); draft.photo = ''; render();
    } else if (act === 'cancel') {
      UI.closeModal();
    } else if (act === 'save') {
      save();
    } else if (act === 'archive') {
      collect(); draft.archived = !draft.archived;
      Store.upsertKitten(draft); UI.closeModal();
      UI.toast(draft.archived ? 'Archived. Find it under Settings → Archive.' : 'Restored');
    } else if (act === 'delete') {
      if (confirm('Delete ' + (draft.name || 'this kitten') + ' and all of their weights? This cannot be undone.\n\nTip: use Archive instead to keep their records.')) {
        Store.deleteKitten(draft.id); UI.closeModal(); UI.toast('Deleted');
      }
    }
  }

  function save() {
    collect();
    if (draft.cNumber && !Store.CNUM_RE.test(draft.cNumber) &&
      !confirm('The C number "' + draft.cNumber + '" doesn\'t match the usual format (c123-26). Save anyway?')) return;
    if (!draft.name && !draft.cNumber && !confirm('This kitten has no name or C number. Save anyway?')) return;
    var g = readWeight('ke-w'), wdate = $('#ke-wdate', root).value || Store.today();
    if (!Store.upsertKitten(draft)) return;
    if (g != null && g > 0) Store.setWeight(draft.id, wdate, g);
    UI.closeModal();
    UI.toast(isNew ? 'Kitten added' : 'Saved');
  }

  function open(id, stageId) {
    var existing = id ? Store.getKitten(id) : null;
    isNew = !existing;
    draft = JSON.parse(JSON.stringify(existing || Store.newKitten(stageId)));
    draft.fvrcp = draft.fvrcp || [];
    render();
    if (!isNew) {
      var w = Store.getWeight(draft.id, Store.today());
      if (w) fillWeight('ke-w', w.grams);
    }
  }

  window.KittenEditor = { open: open };
})();

/* Settings tab. */
(function () {
  'use strict';
  var esc = UI.esc, $ = UI.$;
  var el = document.getElementById('settings');
  var quiet = false; // set while saving from here so we don't redraw under the user's finger

  function set(fn) { fn(Store.state); quiet = true; Store.save(); quiet = false; }

  function stagesHTML() {
    var s = Store.state;
    return s.stages.map(function (st, i) {
      var n = Store.kittensInStage(st.id).length;
      return '<div class="list-row stage-row">' +
        '<input type="text" data-stage-name="' + st.id + '" value="' + esc(st.name) + '" aria-label="Stage name">' +
        '<label class="check" title="Show dewormer/spay due dates and include in reminders"><input type="checkbox" data-stage-track="' + st.id + '"' + (st.track ? ' checked' : '') + '>Reminders</label>' +
        '<span class="card-sub">' + n + '</span>' +
        '<button class="btn small" data-stage-up="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move left">&larr;</button>' +
        '<button class="btn small" data-stage-down="' + i + '"' + (i === s.stages.length - 1 ? ' disabled' : '') + ' aria-label="Move right">&rarr;</button>' +
        '<button class="btn small danger" data-stage-del="' + st.id + '" aria-label="Delete stage">&times;</button></div>';
    }).join('');
  }

  function typesHTML() {
    return Store.state.settings.apptTypes.map(function (t) {
      return '<div class="list-row"><input type="color" class="color-input" data-type-color="' + t.id + '" value="' + esc(t.color) + '">' +
        '<input type="text" class="grow" data-type-name="' + t.id + '" value="' + esc(t.name) + '"></div>';
    }).join('');
  }

  function archiveHTML() {
    var ks = Store.state.kittens.filter(function (k) { return k.archived; });
    if (!ks.length) return '<div class="empty">No archived kittens.</div>';
    return ks.map(function (k) {
      var st = Store.getStage(k.stageId);
      return '<div class="list-row"><span class="grow">' + esc(Store.kittenLabel(k)) + ' <span class="card-sub">— ' + esc(st ? st.name : '') + '</span></span>' +
        '<button class="btn small" data-open="' + k.id + '">View</button><button class="btn small" data-restore="' + k.id + '">Restore</button></div>';
    }).join('');
  }

  function render() {
    if (quiet) return;
    var s = Store.state, cfg = s.settings;
    var stageOpts = s.stages.map(function (st) { return { value: st.id, label: st.name }; });
    var unitOpts = Object.keys(Store.UNITS).map(function (u) { return { value: u, label: Store.UNITS[u] }; });
    var last = s.meta.lastBackup ? Store.fmtDate(Store.toISO(new Date(s.meta.lastBackup))) : 'Never';

    el.innerHTML =
      '<div class="set-card"><h2>Stages</h2><p class="desc">Columns on the board. Rename, reorder, add or remove them. ' +
      '"Reminders" shows dewormer/spay due dates on cards in that stage and includes them in the alerts at the top.</p>' +
      stagesHTML() + '<div class="list-row"><input type="text" class="grow" id="new-stage" placeholder="New stage name">' +
      '<button class="btn" data-act="add-stage">+ Add stage</button></div></div>' +

      '<div class="set-card"><h2>Weights</h2><p class="desc">Weights are stored precisely, so switching units converts everything automatically.</p>' +
      '<div class="grid2"><label class="field"><span>Unit of measure</span><select data-cfg="unit">' + UI.options(unitOpts, cfg.unit) + '</select></label>' +
      '<label class="field"><span>Stage shown on weight chart</span><select data-cfg="chartStageId">' + UI.options(stageOpts, cfg.chartStageId) + '</select></label></div></div>' +

      '<div class="set-card"><h2>Medical schedule</h2>' +
      '<div class="grid2"><label class="field"><span>Dewormer every (days)</span><input type="number" min="1" data-cfg-num="dewormIntervalDays" value="' + cfg.dewormIntervalDays + '"></label>' +
      '<label class="field"><span>Dewormer doses to schedule</span><input type="number" min="1" max="20" data-cfg-num="dewormDoses" value="' + cfg.dewormDoses + '"></label>' +
      '<label class="field"><span>FVRCP booster every (days)</span><input type="number" min="1" data-cfg-num="fvrcpIntervalDays" value="' + cfg.fvrcpIntervalDays + '"></label>' +
      '<label class="field"><span>Warn when due within (days)</span><input type="number" min="0" data-cfg-num="dueSoonDays" value="' + cfg.dueSoonDays + '"></label></div></div>' +

      '<div class="set-card"><h2>C numbers</h2><p class="desc">Year used when you type a short C number (e.g. 123 becomes c123-' + esc(cfg.cNumberYear) + ').</p>' +
      '<label class="field" style="max-width:200px"><span>Current year (2 digits)</span><input type="text" maxlength="2" inputmode="numeric" data-cfg="cNumberYear" value="' + esc(cfg.cNumberYear) + '"></label></div>' +

      '<div class="set-card"><h2>Calendar</h2>' +
      '<label class="field" style="max-width:260px"><span>Week starts on</span><select data-cfg-num="weekStart">' + UI.options([{ value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' }], String(cfg.weekStart)) + '</select></label>' +
      '<p class="desc">Appointment types and colors</p>' + typesHTML() + '</div>' +

      '<div class="set-card"><h2>Document categories</h2><p class="desc">Used to sort documents. Renaming a category updates existing documents.</p>' +
      '<div class="tag-list">' + cfg.docCategories.map(function (c, i) {
        return '<div class="list-row"><input type="text" data-cat-name="' + i + '" value="' + esc(c) + '">' +
          '<button class="btn small danger" data-cat-del="' + i + '" aria-label="Delete category">&times;</button></div>';
      }).join('') + '</div>' +
      '<div class="list-row"><input type="text" class="grow" id="new-cat" placeholder="New category">' +
      '<button class="btn" data-act="add-cat">+ Add</button></div></div>' +

      '<div class="set-card"><h2>Display</h2><div class="grid2">' +
      '<label class="field"><span>Theme</span><select data-cfg="theme">' + UI.options([{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], cfg.theme) + '</select></label>' +
      '<label class="field"><span>Text size</span><select data-cfg="textSize">' + UI.options([{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }, { value: 'xl', label: 'Extra large' }], cfg.textSize) + '</select></label></div></div>' +

      '<div class="set-card"><h2>Archive</h2><p class="desc">Archived kittens are hidden from the board and calendar but their records are kept.</p>' + archiveHTML() + '</div>' +

      '<div class="set-card"><h2>Backup &amp; data</h2><p class="desc">All data lives only on this device. If the iPad is reset or website data is cleared, it is gone — ' +
      'export a backup regularly and keep it in Notes, Files or email. Last backup: <b>' + esc(last) + '</b>. Storage used: ' + Store.storageUsedKB() + ' KB of about 5,000 KB for kitten info, plus ' +
      (Documents.fmtSize(Store.docsTotalKB() * 1024) || '0 KB') + ' of documents (' + s.documents.length + ' files, stored separately).</p>' +
      '<label class="field" style="max-width:260px"><span>Remind me to back up every (days)</span><input type="number" min="0" data-cfg-num="backupReminderDays" value="' + cfg.backupReminderDays + '"><div class="field-hint">0 turns the reminder off.</div></label>' +
      '<div class="modal-foot"><button class="btn primary" data-act="export">Export backup</button>' +
      '<button class="btn" data-act="import">Import backup</button><span class="spacer"></span>' +
      '<button class="btn danger" data-act="reset">Erase all data</button></div></div>' +

      '<div class="set-card"><h2>Install on iPad</h2><p class="desc">In Safari tap the Share button, then <b>Add to Home Screen</b>. ' +
      'Always open the app from that icon: on iOS 12 the Home Screen app keeps its own data, separate from Safari.</p></div>' +

      '<div class="set-card"><h2>App version ' + esc(App.version) + '</h2><p class="desc">The app checks for updates each time you open it. ' +
      'Updating never touches your kittens, weights or documents.</p>' +
      '<button class="btn" data-act="update-check">Check for updates</button></div>';
  }

  /* ---------- backup ---------- */
  function exportBackup() {
    var json = Store.exportJSON(), name = 'kitten-tracker-backup-' + Store.today() + '.json';
    var nDocs = Store.state.documents.length;
    var root = UI.openModal('<div class="modal-head"><h2>Export backup</h2><button class="btn" data-x>Close</button></div>' +
      '<p class="desc">Tap <b>Download file</b> if it works on your device. Otherwise tap <b>Copy</b> and paste it into a note or email to yourself.</p>' +
      (nDocs ? '<label class="check" style="margin-bottom:6px"><input type="checkbox" id="bk-files" checked>Include document files in the download (' +
        Documents.fmtSize(Store.docsTotalKB() * 1024) + ')</label>' +
        '<p class="field-hint" style="margin-top:0">The copy/paste text below never includes document files — only their names and details.</p>' : '') +
      '<textarea id="bk-text" readonly style="min-height:180px;font-family:monospace;font-size:12px">' + esc(json) + '</textarea>' +
      '<div class="modal-foot"><button class="btn primary" data-dl>Download file</button><button class="btn" data-copy>Copy</button><button class="btn" data-x>Done</button></div>');
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (e.target.closest('[data-dl]')) {
        var withFiles = $('#bk-files', root) && $('#bk-files', root).checked;
        (withFiles ? Store.exportWithFiles() : Promise.resolve(json)).then(function (text) {
          var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
          var a = document.createElement('a');
          a.href = url; a.download = name; a.target = '_blank';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          Store.markBackedUp();
        }, function (err) { alert('Backup failed: ' + (err.message || err)); });
        return;
      }
      if (e.target.closest('[data-copy]')) {
        var ta = $('#bk-text', root);
        ta.removeAttribute('readonly'); ta.focus(); ta.setSelectionRange(0, ta.value.length);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.setAttribute('readonly', '');
        UI.toast(ok ? 'Copied — paste it somewhere safe' : 'Select all the text and copy it');
        if (ok) Store.markBackedUp();
      }
    });
  }

  function importBackup() {
    var root = UI.openModal('<div class="modal-head"><h2>Import backup</h2><button class="btn" data-x>Close</button></div>' +
      '<p class="desc"><b>This replaces everything currently in the app.</b> Choose a backup file, or paste the backup text below.</p>' +
      '<label class="btn file-btn">Choose file<input type="file" accept=".json,application/json,text/plain" id="bk-file"></label>' +
      '<textarea id="bk-paste" placeholder="…or paste backup text here" style="margin-top:10px;min-height:140px;font-family:monospace;font-size:12px"></textarea>' +
      '<div class="modal-foot"><button class="btn primary" data-go>Import</button><button class="btn" data-x>Cancel</button></div>');
    $('#bk-file', root).addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { $('#bk-paste', root).value = r.result; };
      r.readAsText(f);
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (!e.target.closest('[data-go]')) return;
      var text = $('#bk-paste', root).value.trim();
      if (!text) { alert('Choose a file or paste backup text first.'); return; }
      if (!confirm('Replace all current data with this backup?')) return;
      var p;
      try { p = Store.importJSON(text); } catch (err) { alert('Import failed: ' + err.message); return; }
      UI.closeModal(); App.applyDisplay();
      p.then(function () { UI.toast('Backup restored'); }, function (err) { alert('Kittens restored, but some document files could not be saved: ' + (err.message || err)); });
    });
  }

  /* ---------- events ---------- */
  el.addEventListener('change', function (e) {
    var t = e.target, id;
    if (t.hasAttribute('data-cfg')) {
      var key = t.getAttribute('data-cfg'), val = t.value;
      if (key === 'cNumberYear' && !/^\d{2}$/.test(val)) { alert('Use two digits, e.g. 26'); t.value = Store.state.settings.cNumberYear; return; }
      set(function (s) { s.settings[key] = val; });
      if (key === 'theme' || key === 'textSize') App.applyDisplay();
    } else if (t.hasAttribute('data-cfg-num')) {
      var k2 = t.getAttribute('data-cfg-num'), n = parseInt(t.value, 10);
      if (isNaN(n) || n < 0) { t.value = Store.state.settings[k2]; return; }
      set(function (s) { s.settings[k2] = n; });
    } else if ((id = t.getAttribute('data-stage-name'))) {
      var name = t.value.trim();
      if (!name) { t.value = Store.getStage(id).name; return; }
      set(function () { Store.getStage(id).name = name; });
    } else if ((id = t.getAttribute('data-stage-track'))) {
      set(function () { Store.getStage(id).track = t.checked; });
    } else if (t.hasAttribute('data-cat-name')) {
      var ci = +t.getAttribute('data-cat-name'), oldName = Store.state.settings.docCategories[ci], newName = t.value.trim();
      if (!newName) { t.value = oldName; return; }
      set(function (s) {
        s.settings.docCategories[ci] = newName;
        s.documents.forEach(function (d) { if (d.category === oldName) d.category = newName; });
      });
    } else if ((id = t.getAttribute('data-type-name'))) {
      set(function () { Store.apptType(id).name = t.value.trim() || Store.apptType(id).name; });
    } else if ((id = t.getAttribute('data-type-color'))) {
      set(function () { Store.apptType(id).color = t.value; });
    }
  });

  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var s = Store.state, act = t.getAttribute('data-act'), id, i;
    if (act === 'add-stage') {
      var inp = $('#new-stage', el), name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      s.stages.push({ id: Store.uid(), name: name, track: true });
      Store.save(); UI.toast('Stage added');
    } else if (act === 'add-cat') {
      var ci2 = $('#new-cat', el), cn = ci2.value.trim();
      if (!cn) { ci2.focus(); return; }
      s.settings.docCategories.push(cn); Store.save();
    } else if (t.hasAttribute('data-cat-del')) {
      var cats = s.settings.docCategories, cd = +t.getAttribute('data-cat-del');
      if (cats.length === 1) { alert('Keep at least one category.'); return; }
      var used = s.documents.filter(function (d) { return d.category === cats[cd]; }).length;
      if (used && !confirm(used + ' document(s) use "' + cats[cd] + '". They will keep that label. Delete the category?')) return;
      cats.splice(cd, 1); Store.save();
    } else if (act === 'update-check') {
      App.checkForUpdate(true);
    } else if (act === 'export') exportBackup();
    else if (act === 'import') importBackup();
    else if (act === 'reset') {
      if (confirm('Erase ALL kittens, weights, events and settings on this device? This cannot be undone.') &&
        confirm('Are you sure? Consider exporting a backup first.')) { Store.resetAll(); App.applyDisplay(); UI.toast('All data erased'); }
    } else if (t.hasAttribute('data-stage-up') || t.hasAttribute('data-stage-down')) {
      i = +(t.getAttribute('data-stage-up') || t.getAttribute('data-stage-down'));
      var j = t.hasAttribute('data-stage-up') ? i - 1 : i + 1;
      var tmp = s.stages[i]; s.stages[i] = s.stages[j]; s.stages[j] = tmp;
      Store.save();
    } else if ((id = t.getAttribute('data-stage-del'))) {
      deleteStage(id);
    } else if ((id = t.getAttribute('data-restore'))) {
      Store.getKitten(id).archived = false; Store.save(); UI.toast('Restored to the board');
    } else if ((id = t.getAttribute('data-open'))) {
      KittenEditor.open(id);
    }
  });

  function deleteStage(id) {
    var s = Store.state;
    if (s.stages.length === 1) { alert('You need at least one stage.'); return; }
    var st = Store.getStage(id);
    var inStage = s.kittens.filter(function (k) { return k.stageId === id; });
    var others = s.stages.filter(function (x) { return x.id !== id; });
    if (inStage.length) {
      if (!confirm('"' + st.name + '" has ' + inStage.length + ' kitten(s) (including archived). Move them to "' + others[0].name + '" and delete the stage?')) return;
      inStage.forEach(function (k) { k.stageId = others[0].id; });
    } else if (!confirm('Delete the stage "' + st.name + '"?')) return;
    s.stages = others;
    if (s.settings.chartStageId === id) s.settings.chartStageId = others[0].id;
    Store.save(); UI.toast('Stage deleted');
  }

  window.Settings = { render: render };
})();

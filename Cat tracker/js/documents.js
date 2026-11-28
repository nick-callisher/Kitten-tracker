/* Documents: upload, list and view files for each kitten.
   Used by the main Documents tab and the Documents tab on each kitten card. */
(function () {
  'use strict';
  var esc = UI.esc, $ = UI.$;
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/es5/build/';
  var ACCEPT = 'image/*,application/pdf,.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv';
  var MAX_MB = 15;
  var filter = { kitten: '', category: '', q: '' };

  /* ---------- helpers ---------- */
  function fmtSize(bytes) {
    if (!bytes) return '';
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  }
  function kind(d) {
    var m = d.mime || '';
    if (m.indexOf('image/') === 0) return 'img';
    if (m === 'application/pdf' || /\.pdf$/i.test(d.fileName || '')) return 'pdf';
    return 'file';
  }
  function iconHTML(d) {
    if (d.thumb) return '<div class="doc-icon"><img src="' + d.thumb + '" alt=""></div>';
    var k = kind(d), ext = ((d.fileName || '').split('.').pop() || 'file').slice(0, 4).toUpperCase();
    return '<div class="doc-icon ' + k + '">' + (k === 'pdf' ? 'PDF' : esc(ext)) + '</div>';
  }
  function dataUrlToBytes(url) {
    var b64 = url.slice(url.indexOf(',') + 1), bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read ' + file.name)); };
      r.readAsDataURL(file);
    });
  }
  function resizeImage(file, max, quality) {
    return new Promise(function (resolve) { UI.resizePhoto(file, max, resolve, quality); });
  }
  function shrinkDataUrl(url, max) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = function () { resolve(''); };
      img.src = url;
    });
  }
  function baseName(n) { return (n || 'Document').replace(/\.[^.]+$/, ''); }

  function kittenOptions(sel, allLabel) {
    var ks = Store.state.kittens.slice().sort(function (a, b) { return (a.archived - b.archived) || (a.name || '').localeCompare(b.name || ''); });
    return '<option value="">' + esc(allLabel) + '</option>' + ks.map(function (k) {
      return '<option value="' + k.id + '"' + (k.id === sel ? ' selected' : '') + '>' + esc(Store.kittenLabel(k)) + (k.archived ? ' (archived)' : '') + '</option>';
    }).join('');
  }
  function categoryOptions(sel, allLabel) {
    var cats = Store.state.settings.docCategories.slice();
    if (sel && cats.indexOf(sel) === -1) cats.push(sel); // keep a label whose category was deleted
    return (allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '') + UI.options(cats, sel);
  }

  /* ---------- list rows (shared) ---------- */
  function listHTML(docs, showKitten) {
    if (!docs.length) return '<div class="empty">No documents yet.</div>';
    return docs.map(function (d) {
      var k = d.kittenId ? Store.getKitten(d.kittenId) : null;
      var meta = [showKitten ? (k ? esc(Store.kittenLabel(k)) : 'General') : '', esc(d.category), esc(Store.fmtDate(d.date)), fmtSize(d.size)]
        .filter(Boolean).join(' · ');
      return '<div class="doc-row" data-doc="' + d.id + '">' + iconHTML(d) +
        '<div class="grow"><div class="doc-name">' + esc(d.name) + '</div><div class="card-sub">' + meta + '</div>' +
        (d.notes ? '<div class="card-sub doc-notes">' + esc(d.notes) + '</div>' : '') + '</div><span class="chev">&rsaquo;</span></div>';
    }).join('');
  }

  /* ---------- main tab ---------- */
  var viewEl = document.getElementById('documents');
  function render() {
    var docs = Store.documentsFor(null).filter(function (d) {
      if (filter.kitten === '_general' ? d.kittenId : filter.kitten && d.kittenId !== filter.kitten) return false;
      if (filter.category && d.category !== filter.category) return false;
      if (filter.q) {
        var k = d.kittenId ? Store.getKitten(d.kittenId) : null;
        var hay = (d.name + ' ' + d.notes + ' ' + d.category + ' ' + (k ? Store.kittenLabel(k) : '')).toLowerCase();
        if (hay.indexOf(filter.q.toLowerCase()) === -1) return false;
      }
      return true;
    });
    var total = Store.state.documents.length;
    viewEl.innerHTML =
      '<div class="doc-filters">' +
      '<select id="df-kitten" aria-label="Kitten">' + kittenOptions(filter.kitten, 'All kittens') +
        '<option value="_general"' + (filter.kitten === '_general' ? ' selected' : '') + '>General (no kitten)</option></select>' +
      '<select id="df-cat" aria-label="Category">' + categoryOptions(filter.category, 'All categories') + '</select>' +
      '<input type="text" id="df-q" placeholder="Search names and notes" value="' + esc(filter.q) + '">' +
      '</div>' +
      '<div class="card-sub" style="margin:0 0 8px">' + (docs.length === total ? total + ' document' + (total === 1 ? '' : 's') :
        'Showing ' + docs.length + ' of ' + total) + ' · ' + fmtSize(Store.docsTotalKB() * 1024 || 0) + '</div>' +
      '<div class="doc-list">' + listHTML(docs, true) + '</div>';
  }
  viewEl.addEventListener('change', function (e) {
    if (e.target.id === 'df-kitten') { filter.kitten = e.target.value; render(); }
    if (e.target.id === 'df-cat') { filter.category = e.target.value; render(); }
  });
  var searchTimer;
  viewEl.addEventListener('input', function (e) {
    if (e.target.id !== 'df-q') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      filter.q = e.target.value.trim();
      render();
      var q = $('#df-q', viewEl); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 300);
  });
  viewEl.addEventListener('click', function (e) {
    var row = e.target.closest('[data-doc]');
    if (row) openView(row.getAttribute('data-doc'));
  });
  document.getElementById('add-document').addEventListener('click', function () {
    openAdd(filter.kitten && filter.kitten !== '_general' ? filter.kitten : '');
  });

  /* ---------- add ---------- */
  // back(): called when this dialog closes (used to return to a kitten card).
  function openAdd(kittenId, back) {
    var files = [];
    var root = UI.openModal(
      '<div class="modal-head"><h2>Add document</h2><button class="btn" data-x>Close</button></div>' +
      '<label class="btn primary file-btn">Choose file(s)<input type="file" id="da-file" multiple accept="' + ACCEPT + '"></label>' +
      '<div class="field-hint">Photos, PDFs or other files. On the iPad you can take a photo of paperwork, pick from Photos, or browse Files/iCloud Drive.</div>' +
      '<div id="da-picked" class="card-sub" style="margin:8px 0 12px"></div>' +
      '<label class="field" id="da-name-wrap"><span>Name</span><input type="text" id="da-name" placeholder="e.g. Intake exam"></label>' +
      '<div class="grid2">' +
      '<label class="field"><span>Kitten</span><select id="da-kitten">' + kittenOptions(kittenId, 'General (no kitten)') + '</select></label>' +
      '<label class="field"><span>Category</span><select id="da-cat">' + categoryOptions('Vet record') + '</select></label>' +
      '<label class="field"><span>Document date</span><input type="date" id="da-date" value="' + Store.today() + '"></label>' +
      '</div>' +
      '<label class="field"><span>Notes</span><textarea id="da-notes" style="min-height:60px"></textarea></label>' +
      '<div class="modal-foot"><button class="btn primary" data-save disabled>Save</button><button class="btn" data-x>Cancel</button></div>',
      back);

    $('#da-file', root).addEventListener('change', function () {
      files = Array.prototype.slice.call(this.files || []);
      var big = files.filter(function (f) { return f.size > MAX_MB * 1048576 && f.type.indexOf('image/') !== 0; });
      if (big.length) {
        alert(big.map(function (f) { return f.name; }).join(', ') + ' is larger than ' + MAX_MB + ' MB and was skipped. Try a smaller scan or a photo instead.');
        files = files.filter(function (f) { return big.indexOf(f) === -1; });
      }
      $('#da-picked', root).textContent = files.length ? files.map(function (f) { return f.name + ' (' + fmtSize(f.size) + ')'; }).join(', ') : '';
      $('#da-name-wrap', root).style.display = files.length > 1 ? 'none' : '';
      if (files.length === 1 && !$('#da-name', root).value) $('#da-name', root).value = baseName(files[0].name);
      $('[data-save]', root).disabled = !files.length;
    });

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      var btn = e.target.closest('[data-save]');
      if (!btn || btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Saving…';
      var common = {
        kittenId: $('#da-kitten', root).value,
        category: $('#da-cat', root).value,
        date: $('#da-date', root).value || Store.today(),
        notes: $('#da-notes', root).value.trim()
      };
      var single = files.length === 1 ? $('#da-name', root).value.trim() : '';
      saveFiles(files, common, single).then(function (n) {
        UI.closeModal();
        UI.toast(n === 1 ? 'Document saved' : n + ' documents saved');
      }, function (err) {
        btn.disabled = false; btn.textContent = 'Save';
        alert('Could not save the document. The iPad may be out of storage space.\n\n' + (err && err.message ? err.message : err));
      });
    });
  }

  function saveFiles(files, common, singleName) {
    var saved = 0;
    // One at a time to keep memory low on older iPads.
    return files.reduce(function (p, f) {
      return p.then(function () {
        var isImg = f.type.indexOf('image/') === 0;
        return (isImg ? resizeImage(f, 1800, 0.82) : readAsDataURL(f)).then(function (data) {
          return (isImg ? shrinkDataUrl(data, 120) : Promise.resolve('')).then(function (thumb) {
            var id = Store.uid();
            return DocsDB.put(id, data).then(function () {
              Store.state.documents.push({
                id: id, kittenId: common.kittenId, name: singleName || baseName(f.name),
                fileName: isImg ? baseName(f.name) + '.jpg' : f.name,
                mime: isImg ? 'image/jpeg' : (f.type || 'application/octet-stream'),
                size: Math.round((data.length - data.indexOf(',') - 1) * 0.75),
                category: common.category, date: common.date, notes: common.notes,
                thumb: thumb, added: new Date().toISOString()
              });
              saved++;
              Store.save();
            });
          });
        });
      });
    }, Promise.resolve()).then(function () { return saved; });
  }

  /* ---------- view / edit ---------- */
  var pdfLoading = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfLoading) return pdfLoading;
    pdfLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { pdfLoading = null; reject(new Error('Could not load the PDF viewer (are you online?)')); };
      document.head.appendChild(s);
    });
    return pdfLoading;
  }

  function renderPdf(data, box) {
    box.innerHTML = '<div class="empty">Loading PDF…</div>';
    return loadPdfJs().then(function (pdfjs) {
      return pdfjs.getDocument({ data: dataUrlToBytes(data) }).promise;
    }).then(function (pdf) {
      box.innerHTML = '';
      var width = Math.min(1400, (box.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1));
      var chain = Promise.resolve();
      for (var i = 1; i <= pdf.numPages; i++) {
        (function (n) {
          chain = chain.then(function () {
            if (!box.parentNode) return; // dialog closed
            return pdf.getPage(n).then(function (page) {
              var vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: width / vp1.width });
              var c = document.createElement('canvas');
              c.width = Math.round(vp.width); c.height = Math.round(vp.height);
              c.className = 'doc-page';
              box.appendChild(c);
              return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            });
          });
        })(i);
      }
      return chain;
    });
  }

  function openFile(d, data) {
    var bytes = dataUrlToBytes(data), blob = new Blob([bytes], { type: d.mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.download = d.fileName || d.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function openView(id, back) {
    var d = Store.getDocument(id);
    if (!d) return;
    var zoom = 100, data = null;
    var root = UI.openModal(
      '<div class="modal-head"><h2>' + esc(d.name) + '</h2>' +
      '<button class="btn small" data-zoom="-1" aria-label="Zoom out">&minus;</button><button class="btn small" data-zoom="1" aria-label="Zoom in" style="margin:0 8px 0 4px">+</button>' +
      '<button class="btn" data-x>Close</button></div>' +
      '<div class="doc-viewer"><div class="doc-content" id="dv-content"><div class="empty">Loading…</div></div></div>' +
      '<div class="section-title">Details</div>' +
      '<label class="field"><span>Name</span><input type="text" id="dv-name" value="' + esc(d.name) + '"></label>' +
      '<div class="grid3">' +
      '<label class="field"><span>Kitten</span><select id="dv-kitten">' + kittenOptions(d.kittenId, 'General (no kitten)') + '</select></label>' +
      '<label class="field"><span>Category</span><select id="dv-cat">' + categoryOptions(d.category) + '</select></label>' +
      '<label class="field"><span>Document date</span><input type="date" id="dv-date" value="' + esc(d.date) + '"></label></div>' +
      '<label class="field"><span>Notes</span><textarea id="dv-notes" style="min-height:60px">' + esc(d.notes) + '</textarea></label>' +
      '<div class="card-sub">' + esc(d.fileName || '') + ' · ' + fmtSize(d.size) + ' · added ' + esc(Store.fmtDate(Store.toISO(new Date(d.added)))) + '</div>' +
      '<div class="modal-foot"><button class="btn primary" data-save>Save details</button>' +
      '<button class="btn" data-open>Open / share file</button><span class="spacer"></span>' +
      '<button class="btn danger" data-del>Delete</button></div>',
      back);
    var box = $('#dv-content', root);

    DocsDB.get(id).then(function (result) {
      data = result;
      if (!data) { box.innerHTML = '<div class="empty">The file for this document is missing on this device. It may have been restored from a backup without files.</div>'; return; }
      var k = kind(d);
      if (k === 'img') box.innerHTML = '<img src="' + data + '" alt="' + esc(d.name) + '" class="doc-page">';
      else if (k === 'pdf') return renderPdf(data, box);
      else box.innerHTML = '<div class="empty" style="text-align:center;padding:30px">This file type can\'t be previewed here.<br>Use <b>Open / share file</b>.</div>';
    }).catch(function (err) {
      box.innerHTML = '<div class="empty">Could not show this file: ' + esc(err.message || err) + '</div>';
    });

    root.addEventListener('click', function (e) {
      var z = e.target.closest('[data-zoom]');
      if (z) {
        zoom = Math.max(100, Math.min(300, zoom + 50 * +z.getAttribute('data-zoom')));
        box.style.width = zoom + '%';
        return;
      }
      if (e.target.closest('[data-x]')) { UI.closeModal(); return; }
      if (e.target.closest('[data-open]')) { if (data) openFile(d, data); return; }
      if (e.target.closest('[data-save]')) {
        d.name = $('#dv-name', root).value.trim() || d.name;
        d.kittenId = $('#dv-kitten', root).value;
        d.category = $('#dv-cat', root).value;
        d.date = $('#dv-date', root).value;
        d.notes = $('#dv-notes', root).value.trim();
        Store.save(); UI.closeModal(); UI.toast('Saved');
        return;
      }
      if (e.target.closest('[data-del]')) {
        if (!confirm('Delete "' + d.name + '"? This cannot be undone.')) return;
        Store.state.documents = Store.state.documents.filter(function (x) { return x.id !== d.id; });
        DocsDB.remove(d.id);
        Store.save(); UI.closeModal(); UI.toast('Document deleted');
      }
    });
  }

  window.Documents = { render: render, listHTML: listHTML, openAdd: openAdd, openView: openView, fmtSize: fmtSize };
})();

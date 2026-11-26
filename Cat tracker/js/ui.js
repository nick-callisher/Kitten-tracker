/* Shared UI helpers: escaping, modal, toast, photo resizing. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- modal ---------- */
  var back = document.getElementById('modal-back');
  var modal = document.getElementById('modal');
  var onClose = null;
  function openModal(html, closeCb) {
    modal.innerHTML = html;
    back.classList.add('open');
    back.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    onClose = closeCb || null;
    return modal;
  }
  function closeModal() {
    back.classList.remove('open');
    modal.innerHTML = '';
    document.body.style.overflow = '';
    var cb = onClose; onClose = null;
    if (cb) cb();
  }
  back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });

  /* ---------- toast ---------- */
  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- photos ---------- */
  // Shrink to fit within `max` px and save as JPEG so storage stays small.
  function resizePhoto(file, max, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, scale = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = function () { alert('Could not read that photo.'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  // iOS 12 ignores photo orientation when resizing, so offer a manual rotate.
  function rotatePhoto(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = img.height; c.height = img.width;
      var ctx = c.getContext('2d');
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      cb(c.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  }

  function photoHTML(k) {
    return k.photo ? '<img src="' + k.photo + '" alt="">' : '<span aria-hidden="true">&#128049;</span>';
  }

  function dueHTML(iso) {
    if (!iso) return '<span class="pill ok">—</span>';
    var st = Store.dueStatus(iso);
    var days = Store.daysBetween(Store.today(), iso);
    var rel = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 0 ? Math.abs(days) + 'd overdue' : '';
    var text = Store.fmtDate(iso) + (rel ? ' · ' + rel : '');
    return '<span class="pill ' + st + '">' + esc(text) + '</span>';
  }

  function options(list, selected) {
    return list.map(function (o) {
      var v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label;
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }

  window.UI = {
    esc: esc, $: $, $all: $all,
    openModal: openModal, closeModal: closeModal, toast: toast,
    resizePhoto: resizePhoto, rotatePhoto: rotatePhoto, photoHTML: photoHTML,
    dueHTML: dueHTML, options: options
  };
})();

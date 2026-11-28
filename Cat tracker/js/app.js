/* App shell: tabs, alerts banner, theme. */
(function () {
  'use strict';
  var esc = UI.esc;
  var current = 'board';
  var views = { board: Board, calendar: Calendar, weights: Weights, documents: Documents, settings: Settings };

  function applyDisplay() {
    var cfg = Store.state.settings, root = document.documentElement;
    root.setAttribute('data-theme', cfg.theme);
    root.setAttribute('data-size', cfg.textSize);
  }

  function renderAlerts() {
    var s = Store.state, cfg = s.settings, over = [], soon = [], t = Store.today();
    s.kittens.forEach(function (k) {
      if (!Store.isTracked(k)) return;
      var name = esc(k.name || k.cNumber || 'Unnamed');
      [['Dewormer', Store.nextDewormer(k)], ['Spay/neuter', k.spayDate], ['FVRCP', Store.nextFvrcp(k)]].forEach(function (p) {
        var st = Store.dueStatus(p[1]);
        if (p[0] === 'Spay/neuter' && st === 'over') return; // past appointment, assumed done
        var d = p[1] ? Store.daysBetween(t, p[1]) : 0;
        var txt = '<b>' + name + '</b> ' + p[0] + ' ' + (d < 0 ? Math.abs(d) + 'd overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + 'd');
        if (st === 'over') over.push(txt); else if (st === 'soon') soon.push(txt);
      });
    });
    var unweighed = Store.kittensInStage(cfg.chartStageId).filter(function (k) { return !Store.getWeight(k.id, t); })
      .map(function (k) { return esc(k.name || 'Unnamed'); });

    var html = '';
    if (over.length) html += '<div class="alert bad">&#9888; Overdue: ' + over.join(' · ') + '</div>';
    if (soon.length) html += '<div class="alert">Coming up: ' + soon.join(' · ') + '</div>';
    if (unweighed.length && current !== 'weights') html += '<div class="alert">Not weighed today: ' + unweighed.join(', ') + '</div>';
    if (+cfg.backupReminderDays > 0 && s.kittens.length) {
      var lb = s.meta.lastBackup ? Store.daysBetween(Store.toISO(new Date(s.meta.lastBackup)), t) : null;
      if (lb === null || lb >= +cfg.backupReminderDays)
        html += '<div class="alert">' + (lb === null ? 'You haven\'t backed up yet.' : 'Last backup was ' + lb + ' days ago.') +
          ' Go to Settings → Backup &amp; data.</div>';
    }
    document.getElementById('alerts').innerHTML = html;
  }

  function renderAll() {
    if (Board.isDragging()) return;
    renderAlerts();
    views[current].render();
  }

  function show(tab) {
    current = tab;
    UI.$all('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    UI.$all('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + tab); });
    try { sessionStorage.setItem('kt.tab', tab); } catch (e) { /* private mode */ }
    window.scrollTo(0, 0);
    renderAll();
  }

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.tab');
    if (b) show(b.getAttribute('data-tab'));
  });
  document.getElementById('add-kitten').addEventListener('click', function () { KittenEditor.open(null); });

  Store.onChange(renderAll);

  // Refresh due-date badges when the app comes back after midnight.
  var lastDay = Store.today();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Store.today() !== lastDay) { lastDay = Store.today(); renderAll(); }
  });

  window.App = { applyDisplay: applyDisplay, show: show };

  applyDisplay();
  var saved = null;
  try { saved = sessionStorage.getItem('kt.tab'); } catch (e) { /* ignore */ }
  show(views[saved] ? saved : 'board');
})();

/* Demo data for trying the app on a new device. Replaces everything.
   Dates are relative to today so due-date alerts always look realistic. */
(function () {
  'use strict';

  /* ---------- drawn kitten photos ---------- */
  function drawCat(opts) {
    var c = document.createElement('canvas'), S = 240;
    c.width = S; c.height = S;
    var g = c.getContext('2d'), s = S / 100;
    g.scale(s, s);
    g.fillStyle = opts.bg; g.fillRect(0, 0, 100, 100);
    function tri(a, b, cc, d, e, f, col) { g.fillStyle = col; g.beginPath(); g.moveTo(a, b); g.lineTo(cc, d); g.lineTo(e, f); g.closePath(); g.fill(); }
    function ell(x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
    tri(20, 52, 24, 14, 46, 32, opts.fur); tri(80, 52, 76, 14, 54, 32, opts.fur2 || opts.fur);
    tri(26, 44, 28, 22, 41, 33, '#f7b6c2'); tri(74, 44, 72, 22, 59, 33, '#f7b6c2');
    ell(50, 58, 36, 31, opts.fur);
    if (opts.patch) { ell(68, 48, 16, 14, opts.patch); ell(34, 70, 10, 8, opts.fur2 || opts.patch); }
    if (opts.stripes) { tri(46, 28, 50, 40, 54, 28, opts.stripes); tri(37, 30, 42, 40, 44, 29, opts.stripes); tri(63, 30, 58, 40, 56, 29, opts.stripes); }
    ell(50, 70, 17, 12, opts.muzzle || '#fde9d4');
    ell(36, 53, 6, 7, opts.eye || '#2b2118'); ell(64, 53, 6, 7, opts.eye || '#2b2118');
    ell(37.5, 51, 2, 2, '#ffffff'); ell(65.5, 51, 2, 2, '#ffffff');
    tri(45.5, 64, 54.5, 64, 50, 69, '#f7a0b2');
    return c.toDataURL('image/jpeg', 0.8);
  }

  /* ---------- a small, valid PDF ---------- */
  // PDF standard fonts here are plain ASCII: swap anything else (like em dashes) for '-'.
  function pdfText(s) { return String(s).replace(/[^\x20-\x7e]/g, '-').replace(/[\\()]/g, '\\$&'); }
  function makePdf(title, lines) {
    var content = 'BT /F1 20 Tf 50 740 Td (' + pdfText(title) + ') Tj ET\n';
    lines.forEach(function (l, i) { content += 'BT /F1 12 Tf 50 ' + (700 - i * 22) + ' Td (' + pdfText(l) + ') Tj ET\n'; });
    var objs = [
      '<</Type/Catalog/Pages 2 0 R>>',
      '<</Type/Pages/Kids[3 0 R]/Count 1>>',
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
      '<</Length ' + content.length + '>>\nstream\n' + content + 'endstream',
      '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'
    ];
    var out = '%PDF-1.4\n', offsets = [];
    objs.forEach(function (o, i) { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<</Size ' + (objs.length + 1) + '/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF\n';
    return 'data:application/pdf;base64,' + btoa(out);
  }

  /* ---------- the kittens ---------- */
  var LITTER_A = { intake: -18, deworm: -16, fv1: -16, test: -17 };
  var CATS = [
    { name: 'Mochi', c: 101, gender: 'Female', breed: 'DSH', color: 'Calico', collar: '#f48fb1', stage: 0, litter: LITTER_A, g0: 520, gain: 15,
      look: { bg: '#cde2fb', fur: '#ffffff', fur2: '#2b2118', patch: '#f4a259' }, spay: [20, '09:00', 'Shelter clinic — drop off by 8:00'],
      notes: 'Shy at first, loves wand toys. Eating wet + dry well.' },
    { name: 'Biscuit', c: 102, gender: 'Male', breed: 'DSH', color: 'Orange tabby', collar: '#1e88e5', stage: 0, litter: LITTER_A, g0: 560, gain: 17,
      look: { bg: '#fde3cf', fur: '#f4a259', stripes: '#d9822b' }, spay: [20, '09:00', 'Shelter clinic — drop off by 8:00'],
      notes: 'Biggest of the litter. Bossy at the food bowl — feed separately.' },
    { name: 'Pepper', c: 103, gender: 'Female', breed: 'DMH', color: 'Tuxedo', collar: '#2e7d32', stage: 0, litter: LITTER_A, g0: 470, gain: 13,
      look: { bg: '#d8f0e3', fur: '#2b2b2b', muzzle: '#ffffff', eye: '#c9a227' }, spay: [20, '09:30', 'Shelter clinic'],
      notes: 'Smallest — watch weight daily. Mild eye discharge cleared up.' },
    { name: 'Ziggy', c: 118, gender: 'Male', breed: 'DLH', color: 'Gray', collar: '#e53935', stage: 0,
      litter: { intake: -15, deworm: -14, fv1: -14, test: -15 }, g0: 610, gain: 14,
      look: { bg: '#ece6f8', fur: '#9e9e9e', stripes: '#7a7a7a' }, spay: [27, '08:30', 'Vet hospital — no food after midnight'],
      notes: 'Came in with an upper respiratory infection. On doxycycline twice daily until finished.' },
    { name: 'Luna', c: 87, gender: 'Female', breed: 'Siamese mix', color: 'Seal point', collar: '#8e24aa', stage: 1,
      litter: { intake: -40, deworm: -38, fv1: -38, test: -39 }, g0: 900, gain: 12,
      look: { bg: '#f8e6ef', fur: '#f3e3cf', fur2: '#5a4032', muzzle: '#5a4032', eye: '#4fc3f7' }, spay: [2, '08:30', 'Shelter clinic — bring carrier, no food after midnight'],
      notes: 'Very vocal and affectionate. Ready for adoption after surgery.' },
    { name: 'Oreo', c: 88, gender: 'Male', breed: 'DSH', color: 'Black & white', collar: '#fdd835', stage: 1,
      litter: { intake: -40, deworm: -38, fv1: -38, test: -39 }, g0: 950, gain: 13,
      look: { bg: '#fff6cc', fur: '#ffffff', patch: '#2b2b2b', fur2: '#2b2b2b' }, spay: [2, '08:30', 'Shelter clinic — same appointment as Luna'],
      notes: 'Playful, good with other cats. Litter-trained.' },
    { name: 'Ginger', c: 54, gender: 'Female', breed: 'DSH', color: 'Orange & white', collar: '#ffffff', stage: 2,
      litter: { intake: -70, deworm: -68, fv1: -68, test: -69 }, g0: 1150, gain: 10,
      look: { bg: '#e2f4e2', fur: '#f4a259', muzzle: '#ffffff', stripes: '#d9822b' }, spay: [-10, '09:00', 'Done — healed well'],
      notes: 'Returned to shelter for adoption. Great with kids.' },
    { name: 'Sprout', c: 41, gender: 'Male', breed: 'DSH', color: 'Brown tabby', collar: '#795548', stage: 2, archived: true,
      litter: { intake: -90, deworm: -88, fv1: -88, test: -89 }, g0: 1300, gain: 10,
      look: { bg: '#efe6dc', fur: '#8d6e63', stripes: '#5d4037' }, spay: [-30, '09:00', 'Done'],
      notes: 'Adopted! Archived example.' }
  ];

  function load() {
    var T = Store.today(), D = function (n) { return Store.addDays(T, n); };
    var yr = String(new Date().getFullYear()).slice(-2);
    Store.resetAll();
    var s = Store.state, stages = s.stages;

    CATS.forEach(function (c, i) {
      var k = Store.newKitten(stages[c.stage].id);
      k.order = i;
      k.name = c.name; k.cNumber = 'c' + ('00' + c.c).slice(-3) + '-' + yr;
      k.gender = c.gender; k.breed = c.breed; k.color = c.color; k.collarColor = c.collar;
      k.photo = drawCat(c.look);
      k.intakeDate = D(c.litter.intake);
      k.firstDewormer = D(c.litter.deworm);
      // Ziggy's dewormer was set by hand to today, so an alert shows.
      k.dewormerNext = c.name === 'Ziggy' ? T : '';
      k.spayDate = D(c.spay[0]); k.spayTime = c.spay[1]; k.spayNotes = c.spay[2];
      var fvInt = s.settings.fvrcpIntervalDays;
      k.fvrcp = [0, 1, 2].map(function (n) {
        var d = D(c.litter.fv1 + n * fvInt);
        return { date: d, given: d <= T };
      });
      k.felv = 'Negative'; k.fiv = 'Negative'; k.testDate = D(c.litter.test);
      k.notes = c.notes;
      k.archived = !!c.archived;
      s.kittens.push(k);

      // Daily weigh-ins from intake (max 21 days back), with a little day-to-day wobble.
      var days = Math.min(21, -c.litter.intake);
      for (var d = days; d >= 0; d--) {
        if (c.stage === 2 && d < 3) break; // went back to the shelter a few days ago
        var wobble = ((i * 7 + d * 13) % 5) - 2;
        s.weights.push({ id: Store.uid(), kittenId: k.id, date: D(-d), grams: c.g0 + (days - d) * c.gain + wobble * 3 });
      }
    });

    var byName = {};
    s.kittens.forEach(function (k) { byName[k.name] = k; });
    s.events.push(
      { id: Store.uid(), title: 'Recheck — upper respiratory', type: 'vet', date: D(3), time: '10:00', kittenId: byName.Ziggy.id, notes: 'Bring medication bottle' },
      { id: Store.uid(), title: 'Adoption event at pet store', type: 'other', date: D(6), time: '11:00', kittenId: '', notes: 'Bring Luna and Oreo if cleared' },
      { id: Store.uid(), title: 'Pick up foster supplies', type: 'other', date: D(-1), time: '15:00', kittenId: '', notes: 'Kitten food, litter, wipes' },
      { id: Store.uid(), title: 'Weight check at shelter', type: 'vet', date: D(10), time: '13:30', kittenId: byName.Pepper.id, notes: '' }
    );
    s.meta.lastBackup = new Date().toISOString();

    // Documents: an intake exam PDF for each foster plus a few photos of paperwork.
    var docs = [];
    function addDoc(k, name, category, date, data, mime, notes, thumb) {
      var id = Store.uid();
      docs.push({ id: id, data: data });
      s.documents.push({
        id: id, kittenId: k ? k.id : '', name: name, fileName: name.replace(/\W+/g, '-').toLowerCase() + (mime === 'application/pdf' ? '.pdf' : '.jpg'),
        mime: mime, size: Math.round((data.length - data.indexOf(',') - 1) * 0.75), category: category, date: date,
        notes: notes || '', thumb: thumb || '', added: new Date().toISOString()
      });
    }
    s.kittens.forEach(function (k) {
      addDoc(k, 'Intake exam', 'Intake form', k.intakeDate, makePdf('Intake exam — ' + k.name + ' (' + k.cNumber.toUpperCase() + ')', [
        'Date: ' + k.intakeDate, 'Gender: ' + k.gender + '   Breed: ' + k.breed + '   Color: ' + k.color,
        'Weight at intake: ' + Store.fmtWeight(Store.weightsFor(k.id)[0].grams), 'FeLV: Negative   FIV: Negative',
        'Dewormer (pyrantel) given: ' + k.firstDewormer, 'FVRCP #1 given: ' + k.fvrcp[0].date, 'Notes: ' + k.notes
      ]), 'application/pdf', 'Demo document');
    });
    var card = drawCat({ bg: '#ffffff', fur: '#cccccc' });
    addDoc(byName.Mochi, 'Vaccine card', 'Vaccine record', byName.Mochi.fvrcp[0].date, card, 'image/jpeg', 'Photo of the paper card', card);
    addDoc(byName.Ziggy, 'Doxycycline prescription', 'Vet record', D(-14), makePdf('Prescription — Ziggy', [
      'Doxycycline 25 mg/ml, 0.4 ml by mouth twice daily for 14 days', 'Give with food', 'Recheck in 2 weeks']), 'application/pdf', 'URI treatment');
    addDoc(null, 'Foster agreement', 'Other', D(-90), makePdf('Foster agreement', [
      'General foster care agreement (demo)', 'Signed copy on file at shelter']), 'application/pdf', 'Not tied to a kitten');

    Store.save();
    return Promise.all(docs.map(function (d) { return DocsDB.put(d.id, d.data); }));
  }

  window.Demo = { load: load };
})();

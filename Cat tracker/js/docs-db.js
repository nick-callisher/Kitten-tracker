/* File storage for documents, using IndexedDB (much more room than localStorage).
   Files are stored as data-URL strings: Safari 12 handles strings in IndexedDB
   more reliably than Blobs. Document details (name, kitten, date…) live in
   Store.state.documents; only the file contents are kept here, keyed by id. */
(function () {
  'use strict';
  var DB_NAME = 'kittenTrackerFiles', STORE = 'files';
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('This browser cannot store files.')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Could not open file storage.')); };
    });
    dbPromise.catch(function () { dbPromise = null; });
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode), store = tx.objectStore(STORE), result;
        var req = fn(store);
        if (req) req.onsuccess = function () { result = req.result; };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error || new Error('File storage error.')); };
        tx.onabort = function () { reject(tx.error || new Error('File storage is full or unavailable.')); };
      });
    });
  }

  window.DocsDB = {
    put: function (id, dataUrl) { return run('readwrite', function (s) { return s.put(dataUrl, id); }); },
    get: function (id) { return run('readonly', function (s) { return s.get(id); }); },
    remove: function (id) { return run('readwrite', function (s) { return s['delete'](id); }); },
    clear: function () { return run('readwrite', function (s) { return s.clear(); }); }
  };
})();

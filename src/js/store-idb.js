/* ==========================================================================
   Kho luu tru IndexedDB (U3, spec 002)
   - DB `pdf2trans` v1, 4 store: segments / glossaries / cache / meta
   - API promise, dung duoc ca khi IndexedDB bi chan/khong co (Node test):
     tu dong roi ve backend bo nho (Map) voi cung API, khong lam hong app.
   - Migration 1 lan: doc key localStorage cu (pdf_trans_store_v1:*,
     pdf_trans_cache_v1) ghi sang IndexedDB, GIU NGUYEN localStorage cu.
   ========================================================================== */
(function (global) {
  'use strict';

  var DB_NAME = 'pdf2trans';
  var DB_VERSION = 1;
  var STORE_SEGMENTS = 'segments';
  var STORE_GLOSSARIES = 'glossaries';
  var STORE_CACHE = 'cache';
  var STORE_META = 'meta';

  function isIndexedDBAvailable() {
    try {
      return typeof global.indexedDB !== 'undefined' && global.indexedDB !== null;
    } catch (e) { return false; }
  }

  /* ---- Backend bo nho (fallback + Node test) ---- */
  function MemoryBackend() {
    this.tables = {};
    var self = this;
    [STORE_SEGMENTS, STORE_GLOSSARIES, STORE_CACHE, STORE_META].forEach(function (s) {
      self.tables[s] = new Map();
    });
  }
  MemoryBackend.prototype._keyOf = function (store, value) {
    if (store === STORE_SEGMENTS || store === STORE_GLOSSARIES) return value.id;
    if (store === STORE_CACHE || store === STORE_META) return value.key;
    return value.id || value.key;
  };
  MemoryBackend.prototype.get = function (store, key) {
    return Promise.resolve(this.tables[store].get(key) || null);
  };
  MemoryBackend.prototype.put = function (store, value) {
    this.tables[store].set(this._keyOf(store, value), value);
    return Promise.resolve();
  };
  MemoryBackend.prototype.getAll = function (store) {
    return Promise.resolve(Array.from(this.tables[store].values()));
  };
  MemoryBackend.prototype.del = function (store, key) {
    this.tables[store].delete(key);
    return Promise.resolve();
  };
  MemoryBackend.prototype.clear = function (store) {
    this.tables[store].clear();
    return Promise.resolve();
  };

  /* ---- Backend IndexedDB that ---- */
  function IndexedDBBackend() {
    this._dbPromise = null;
  }
  IndexedDBBackend.prototype._open = function () {
    var self = this;
    if (self._dbPromise) return self._dbPromise;
    self._dbPromise = new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_SEGMENTS)) {
          var seg = db.createObjectStore(STORE_SEGMENTS, { keyPath: 'id' });
          seg.createIndex('fileId', 'fileId', { unique: false });
          seg.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_GLOSSARIES)) {
          db.createObjectStore(STORE_GLOSSARIES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Khong mo duoc IndexedDB')); };
    });
    return self._dbPromise;
  };
  IndexedDBBackend.prototype._tx = function (store, mode, fn) {
    return this._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var os = tx.objectStore(store);
        var out;
        try { out = fn(os); } catch (e) { reject(e); return; }
        // fn tra ve IDBRequest (get/put/getAll/delete/clear); ket qua doc
        // trong tx.oncomplete, luc do request da xong nen .result an toan.
        var request = out;
        tx.oncomplete = function () { resolve(request && request.result !== undefined ? request.result : undefined); };
        tx.onerror = function () { reject(tx.error || new Error('IndexedDB transaction loi')); };
        if (request) request.onerror = function () { reject(request.error || new Error('IndexedDB request loi')); };
      });
    });
  };
  IndexedDBBackend.prototype.get = function (store, key) {
    return this._tx(store, 'readonly', function (os) { return os.get(key); })
      .then(function (v) { return v === undefined ? null : v; });
  };
  IndexedDBBackend.prototype.put = function (store, value) {
    return this._tx(store, 'readwrite', function (os) { return os.put(value); }).then(function () {});
  };
  IndexedDBBackend.prototype.getAll = function (store) {
    return this._tx(store, 'readonly', function (os) { return os.getAll(); });
  };
  IndexedDBBackend.prototype.del = function (store, key) {
    return this._tx(store, 'readwrite', function (os) { return os.delete(key); }).then(function () {});
  };
  IndexedDBBackend.prototype.clear = function (store) {
    return this._tx(store, 'readwrite', function (os) { return os.clear(); }).then(function () {});
  };

  /* ---- API chung ---- */
  var backend = isIndexedDBAvailable() ? new IndexedDBBackend() : new MemoryBackend();

  var PdfTransDB = {
    backendName: isIndexedDBAvailable() ? 'indexeddb' : 'memory',
    stores: {
      segments: STORE_SEGMENTS,
      glossaries: STORE_GLOSSARIES,
      cache: STORE_CACHE,
      meta: STORE_META
    },
    get: function (store, key) { return backend.get(store, key); },
    put: function (store, value) { return backend.put(store, value); },
    getAll: function (store) { return backend.getAll(store); },
    del: function (store, key) { return backend.del(store, key); },
    clear: function (store) { return backend.clear(store); },

    /**
     * Migration 1 lan tu localStorage cu. Tra ve {migrated: bool, segments, cacheEntries}.
     * Chi chay khi meta 'migratedFromLocalStorage' chua co. Khong xoa localStorage cu.
     */
    migrateFromLocalStorage: function (storage) {
      var ls = storage || (typeof global.localStorage !== 'undefined' ? global.localStorage : null);
      if (!ls) return Promise.resolve({ migrated: false, segments: 0, cacheEntries: 0, reason: 'no-localStorage' });
      var self = this;
      return self.get(STORE_META, 'migratedFromLocalStorage').then(function (flag) {
        if (flag) return { migrated: false, segments: 0, cacheEntries: 0, reason: 'already-migrated' };
        var jobs = [];
        var segCount = 0;
        var cacheCount = 0;
        var keys = [];
        for (var i = 0; i < ls.length; i++) keys.push(ls.key(i));
        keys.forEach(function (k) {
          if (k.indexOf('pdf_trans_store_v1:') !== 0) return;
          var fileId = k.slice('pdf_trans_store_v1:'.length);
          try {
            var data = JSON.parse(ls.getItem(k));
            var segs = (data && data.segments) || {};
            Object.keys(segs).forEach(function (h) {
              var s = segs[h];
              jobs.push(self.put(STORE_SEGMENTS, {
                id: fileId + ':' + (s.page || 0) + ':' + (s.order || 0) + ':' + String(h).slice(0, 8),
                fileId: fileId, fileName: data.fileName || '',
                en: s.en, vi: s.vi || '', page: s.page || 0, order: s.order || 0,
                approved: !!s.approved, status: s.vi ? 'done' : 'pending',
                error: null, updatedAt: s.updatedAt || null
              }));
              segCount++;
            });
          } catch (e) { /* file hong thi bo qua file do */ }
        });
        try {
          var rawCache = ls.getItem('pdf_trans_cache_v1');
          if (rawCache) {
            var entries = JSON.parse(rawCache);
            if (Array.isArray(entries)) {
              entries.forEach(function (pair) {
                if (Array.isArray(pair) && pair.length === 2) {
                  jobs.push(self.put(STORE_CACHE, { key: pair[0], value: pair[1] }));
                  cacheCount++;
                }
              });
            }
          }
        } catch (e) { /* cache hong thi bo */ }
        return Promise.all(jobs).then(function () {
          return self.put(STORE_META, { key: 'migratedFromLocalStorage', value: true }).then(function () {
            return { migrated: true, segments: segCount, cacheEntries: cacheCount };
          });
        });
      });
    }
  };

  global.PdfTransDB = PdfTransDB;
  if (typeof module !== 'undefined' && module.exports) module.exports = PdfTransDB;
})(typeof window !== 'undefined' ? window : globalThis);

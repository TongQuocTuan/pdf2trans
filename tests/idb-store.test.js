// U3 IndexedDB store — mock test (backend bo nho vi Node khong co IndexedDB)
// Chay: node tests/idb-store.test.js
const PdfTransDB = require('../src/js/store-idb.js');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

// localStorage gia
class FakeStorage {
  constructor(entries) { this._m = new Map(Object.entries(entries || {})); }
  get length() { return this._m.size; }
  key(i) { return Array.from(this._m.keys())[i] || null; }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, v); }
}

(async () => {
  assert(PdfTransDB.backendName === 'memory', 'Node phai dung backend memory, duoc ' + PdfTransDB.backendName);

  // put/get/getAll/del co ban
  await PdfTransDB.put('segments', { id: 'f1:1:0:abcd', fileId: 'f1', en: 'Hello', vi: 'Xin chào', page: 1, order: 0, status: 'done' });
  const one = await PdfTransDB.get('segments', 'f1:1:0:abcd');
  assert(one && one.vi === 'Xin chào', 'get tra dung ban ghi');
  const missing = await PdfTransDB.get('segments', 'khong-co');
  assert(missing === null, 'get key khong co tra null');
  await PdfTransDB.put('segments', { id: 'f1:1:1:efgh', fileId: 'f1', en: 'World', vi: '', page: 1, order: 1, status: 'pending' });
  const all = await PdfTransDB.getAll('segments');
  assert(all.length === 2, 'getAll duoc 2 ban ghi');
  await PdfTransDB.del('segments', 'f1:1:1:efgh');
  assert((await PdfTransDB.getAll('segments')).length === 1, 'del xoa dung 1 ban ghi');
  await PdfTransDB.clear('segments');
  assert((await PdfTransDB.getAll('segments')).length === 0, 'clear xoa het');

  // Migration tu localStorage cu
  const ls = new FakeStorage({
    'pdf_trans_store_v1:fileA': JSON.stringify({
      fileName: 'chuong-7.pdf',
      segments: {
        hash1: { en: 'Hello world', vi: 'Xin chào thế giới', page: 1, order: 0, approved: true },
        hash2: { en: 'Second para', vi: '', page: 1, order: 1, approved: false }
      }
    }),
    'pdf_trans_store_v1:fileB': JSON.stringify({
      fileName: 'chuong-8.pdf',
      segments: { hash3: { en: 'Third', vi: 'Thứ ba', page: 2, order: 0, approved: false } }
    }),
    'pdf_trans_cache_v1': JSON.stringify([['google:Hello world', 'Xin chào thế giới'], ['google:Third', 'Thứ ba']]),
    'pdf_trans_engine': 'google'
  });
  const res1 = await PdfTransDB.migrateFromLocalStorage(ls);
  assert(res1.migrated === true, 'lan dau phai migrate');
  assert(res1.segments === 3, 'migrate 3 doan, duoc ' + res1.segments);
  assert(res1.cacheEntries === 2, 'migrate 2 muc cache, duoc ' + res1.cacheEntries);
  const segs = await PdfTransDB.getAll('segments');
  assert(segs.length === 3, 'store co 3 doan sau migrate');
  const approved = segs.find(s => s.en === 'Hello world');
  assert(approved && approved.status === 'done' && approved.approved === true, 'doan co vi -> done + approved');
  const pending = segs.find(s => s.en === 'Second para');
  assert(pending && pending.status === 'pending', 'doan chua co vi -> pending');
  const cache = await PdfTransDB.getAll('cache');
  assert(cache.length === 2, 'cache co 2 muc sau migrate');
  // localStorage cu GIU NGUYEN (duong lui)
  assert(ls.getItem('pdf_trans_store_v1:fileA') !== null, 'khong xoa localStorage cu');
  // Lan 2 khong migrate lai
  const res2 = await PdfTransDB.migrateFromLocalStorage(ls);
  assert(res2.migrated === false && res2.reason === 'already-migrated', 'lan 2 khong migrate lai');
  assert((await PdfTransDB.getAll('segments')).length === 3, 'lan 2 khong nhan doi doan');

  console.log('idb-store.test.js PASS');
})();

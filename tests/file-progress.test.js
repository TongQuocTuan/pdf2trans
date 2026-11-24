// U6 Bang tien do theo file — mock test (ham thuan tuy)
// Chay: node tests/file-progress.test.js
const computeFileProgress = require('../src/js/file-progress.js');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

const meta = [
  // Dung Date.parse de so sanh dung voi updatedAt cua doan (cung moc thoi gian)
  { key: 'file:A', value: { fileName: 'chuong-7.pdf', lastOpenedAt: Date.parse('2026-11-24T10:04:00.000Z') } },
  { key: 'file:B', value: { fileName: 'chuong-8.pdf', lastOpenedAt: Date.parse('2026-11-24T11:01:00.000Z') } },
  { key: 'file:C', value: { fileName: 'chuong-9.pdf', lastOpenedAt: Date.parse('2026-11-24T12:00:00.000Z') } },
  { key: 'migratedFromLocalStorage', value: true }, // khong phai file -> bo qua
];
const segments = [
  { fileId: 'A', fileName: 'chuong-7.pdf', en: 'a1', vi: 'v1', status: 'done', approved: true, updatedAt: '2026-11-24T10:00:00.000Z' },
  { fileId: 'A', fileName: 'chuong-7.pdf', en: 'a2', vi: 'v2', status: 'done', approved: true, updatedAt: '2026-11-24T10:01:00.000Z' },
  { fileId: 'A', fileName: 'chuong-7.pdf', en: 'a3', vi: 'v3', status: 'done', approved: false, updatedAt: '2026-11-24T10:02:00.000Z' },
  { fileId: 'A', fileName: 'chuong-7.pdf', en: 'a4', vi: 'v4', status: 'done', approved: false, updatedAt: '2026-11-24T10:03:00.000Z' },
  { fileId: 'A', fileName: 'chuong-7.pdf', en: 'a5', vi: '', status: 'error', approved: false, updatedAt: '2026-11-24T10:04:00.000Z' },
  { fileId: 'B', fileName: 'chuong-8.pdf', en: 'b1', vi: 'v1', status: 'done', approved: false, updatedAt: '2026-11-24T11:00:00.000Z' },
  { fileId: 'B', fileName: 'chuong-8.pdf', en: 'b2', vi: 'v2', status: 'done', approved: false, updatedAt: '2026-11-24T11:01:00.000Z' },
  // File D: co doan nhung khong co meta (mo tu truoc khi co U6)
  { fileId: 'D', fileName: 'chuong-10.pdf', en: 'd1', vi: 'v1', status: 'done', approved: true, updatedAt: '2026-11-23T09:00:00.000Z' },
];

const out = computeFileProgress(segments, meta);
assert(out.length === 4, 'duoc 4 file, hien co ' + out.length);
// Sap theo mo gan nhat: C (12:00) -> B (11:01) -> A (10:04) -> D (23/11)
assert(out[0].fileId === 'C', 'C mo gan nhat phai len dau, duoc ' + out[0].fileId);
assert(out[1].fileId === 'B', 'B dung thu 2, duoc ' + out[1].fileId);
assert(out[2].fileId === 'A', 'A dung thu 3, duoc ' + out[2].fileId);
assert(out[3].fileId === 'D', 'D cu nhat dung cuoi, duoc ' + out[3].fileId);
const a = out.find(f => f.fileId === 'A');
assert(a.total === 5 && a.translated === 4 && a.approved === 2 && a.failed === 1,
  'A: total 5, translated 4, approved 2, failed 1 — duoc ' + JSON.stringify(a));
assert(a.percent === 40, 'A: percent = approved/total = 40, duoc ' + a.percent);
const b = out.find(f => f.fileId === 'B');
assert(b.total === 2 && b.translated === 2 && b.approved === 0 && b.percent === 0, 'B dung so');
const c = out.find(f => f.fileId === 'C');
assert(c.total === 0 && c.translated === 0 && c.percent === 0, 'C chua dich: total 0, percent 0');
const d = out.find(f => f.fileId === 'D');
assert(d && d.fileName === 'chuong-10.pdf' && d.total === 1 && d.approved === 1, 'D khong meta van hien, lay ten tu doan');

console.log('file-progress.test.js PASS');

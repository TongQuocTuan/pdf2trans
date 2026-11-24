// U8/U9 Sua tay OCR + Tim & thay — mock test (ham thuan tuy)
// Chay: node tests/ocr-edit.test.js
const { splitTextAtCursor, mergeTexts, countFindMatches, findReplaceInSegments } = require('../src/js/ocr-edit.js');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

// --- U8: tach tai con tro ---
let parts = splitTextAtCursor('Regular exercise supports well-being and focus.', 25);
assert(parts && parts[0] === 'Regular exercise supports' && parts[1] === 'well-being and focus.',
  'tach dung tai vi tri con tro, duoc ' + JSON.stringify(parts));
assert(splitTextAtCursor('Hello world', 1) === null, 'con tro sat dau -> null (ben trai < 2 ky tu)');
assert(splitTextAtCursor('Hello world', 10) === null, 'con tro sat cuoi -> null (ben phai < 2 ky tu)');
assert(splitTextAtCursor('Hello world', 5)[0] === 'Hello' && splitTextAtCursor('Hello world', 5)[1] === 'world',
  'tach tai khoang trang thi trim 2 ben');

// --- U8: gop 2 doan ---
assert(mergeTexts('Page one introduces mindfulness.', 'Artificial intelligence is transforming.') ===
  'Page one introduces mindfulness. Artificial intelligence is transforming.', 'gop noi bang 1 khoang trang');
assert(mergeTexts('  Hello   ', '  world  ') === 'Hello world', 'gop gon khoang trang thua');

// --- U9: dem ---
const segs = [
  { en: 'e1', vi: 'DỊCH: Page one introduces mindfulness for daily life.', approved: true },
  { en: 'e2', vi: 'DỊCH: Artificial intelligence is transforming how we learn.', approved: false },
  { en: 'e3', vi: 'Chua dich', approved: false },
  { en: 'e4', vi: '', approved: false },
  { en: 'e5', vi: 'DỊCH: DỊCH: lap lai 2 lan.', approved: true },
];
let m = countFindMatches(segs, 'DỊCH:');
assert(m.segments === 3 && m.occurrences === 4, 'dem: 3 doan, 4 cho — duoc ' + JSON.stringify(m));
m = countFindMatches(segs, 'dịch:'); // khong phan biet hoa/thuong
assert(m.segments === 3 && m.occurrences === 4, 'dem khong phan biet hoa/thuong');
m = countFindMatches(segs, 'khong-co');
assert(m.segments === 0 && m.occurrences === 0, 'khong tim thay -> 0/0');
m = countFindMatches(segs, '');
assert(m.segments === 0 && m.occurrences === 0, 'tim rong -> 0/0');
m = countFindMatches(segs, 'DỊCH: Page'); // co dau . trong regex? khong, nhung kiem tra escape
assert(m.segments === 1, 'tim cum co khoang trang dung');

// --- U9: thay tat ca ---
let r = findReplaceInSegments(segs, 'DỊCH:', 'DỊCH-MỚI:');
assert(r.changedSegments === 3 && r.occurrences === 4, 'thay: 3 doan, 4 cho — duoc ' + JSON.stringify({ c: r.changedSegments, o: r.occurrences }));
assert(r.updated[0].vi === 'DỊCH-MỚI: Page one introduces mindfulness for daily life.', 'vi duoc thay');
assert(r.updated[0].approved === false, 'doan bi thay thi bo duyet');
assert(r.updated[4].vi === 'DỊCH-MỚI: DỊCH-MỚI: lap lai 2 lan.', 'thay ca 2 cho trong 1 doan');
assert(r.updated[2].vi === 'Chua dich' && r.updated[2].approved === false, 'doan khong chua tu tim thi giu nguyen');
assert(r.updated[1] !== segs[1] && r.updated[2] === segs[2], 'object moi cho doan doi, giu nguyen object doan khong doi');
r = findReplaceInSegments(segs, 'DỊCH:', 'Gia $100 & giam 50%'); // '$' khong duoc hieu la $&/$1
assert(r.updated[0].vi.includes('Gia $100 & giam 50%'), 'chuoi thay co $ van dung nguyen');
r = findReplaceInSegments(segs, '', 'x');
assert(r.changedSegments === 0, 'tim rong thi khong thay gi');

console.log('ocr-edit.test.js PASS');

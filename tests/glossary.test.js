// U1 Glossary — mock test (khong can trinh duyet, khong can mang)
// Chay: node tests/glossary.test.js
global.window = global;
const Glossary = require('../src/js/glossary.js');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

(async () => {
  // Dat lai trang thai sach
  Glossary.terms = [];
  Glossary.version = 0;

  // addTerm: them + cap nhat tu da co (khong trung)
  await Glossary.addTerm('mindfulness', 'chánh niệm');
  await Glossary.addTerm('machine learning', 'học máy');
  await Glossary.addTerm('machine', 'máy móc');
  await Glossary.addTerm('Mindfulness', 'chánh niệm (cap nhat)');
  assert(Glossary.terms.length === 3, 'trung tu phai gop, duoc 3 term, hien co ' + Glossary.terms.length);
  assert(Glossary.terms.find(t => t.en.toLowerCase() === 'mindfulness').vi === 'chánh niệm (cap nhat)',
    'cap nhat vi cua tu da co');

  // applyToText: tu dai khop truoc, khong phan biet hoa/thuong, tron tu
  const src = 'Mindfulness and machine learning improve machine performance.';
  const { text: sub, map } = Glossary.applyToText(src);
  assert(map.length === 3, 'ap 3 thuat ngu, duoc ' + map.length);
  assert(!/mindfulness/i.test(sub), 'cau goc khong con tu mindfulness');
  assert(!/machine learning/i.test(sub), 'cau goc khong con cum machine learning');
  const mappedEns = map.map(m => m.en.toLowerCase());
  assert(mappedEns.includes('machine learning'), 'cum dai "machine learning" khop truoc');
  assert(mappedEns.includes('machine'), '"machine" trong "machine performance" khop rieng');
  assert(/performance/.test(sub), '"performance" van con trong cau');
  // Gia lap engine tra ve: placeholder duoc giu nguyen
  const fakeTranslated = sub.replace(/performance\./, 'hiệu suất.');
  const restored = Glossary.restorePlaceholders(fakeTranslated, map);
  assert(restored.includes('chánh niệm (cap nhat)'), 'restore tra tu da chot: ' + restored);
  assert(restored.includes('học máy'), 'restore cum dai hoc may');
  assert(restored.includes('máy móc'), 'restore tu ngan may moc');

  // Ranh gioi tu: "art" khong khop trong "artificial"
  Glossary.terms = [{ en: 'art', vi: 'nghệ thuật', note: '' }];
  const r2 = Glossary.applyToText('Artificial intelligence is not art.');
  assert(r2.map.length === 1, '"art" chi khop 1 lan (o cuoi cau), duoc ' + r2.map.length);
  assert(/Artificial/.test(r2.text), '"Artificial" phai giu nguyen');

  // findUnapplied: bao doan nao chua dung tu da chot
  Glossary.terms = [{ en: 'mindfulness', vi: 'chánh niệm', note: '' }];
  const un1 = Glossary.findUnapplied('Mindfulness helps focus.', 'Chánh niệm giúp tập trung.');
  assert(un1.length === 0, 'da dung tu chot thi khong bao');
  const un2 = Glossary.findUnapplied('Mindfulness helps focus.', 'Tỉnh thức giúp tập trung.');
  assert(un2.length === 1 && un2[0].en === 'mindfulness', 'thieu tu chot thi bao');

  // fromJSON: sai dinh dang thi throw, khong nhap nua chung
  let threw = false;
  try { await Glossary.fromJSON('{}'); } catch (e) { threw = true; }
  assert(threw, 'thieu terms phai throw');
  threw = false;
  try { await Glossary.fromJSON('{"terms":[{"en":"a"}]}'); } catch (e) { threw = true; }
  assert(threw, 'term thieu vi phai throw');
  const before = Glossary.terms.length;
  threw = false;
  try { await Glossary.fromJSON('not json'); } catch (e) { threw = true; }
  assert(threw && Glossary.terms.length === before, 'json hong thi khong doi terms');
  await Glossary.fromJSON(JSON.stringify({ bookId: 'kim-chi-nam', terms: [{ en: 'resilience', vi: 'khả năng phục hồi' }] }));
  assert(Glossary.terms.length === 1 && Glossary.terms[0].en === 'resilience', 'nhap json hop le');

  // removeTerm
  await Glossary.removeTerm('resilience');
  assert(Glossary.terms.length === 0, 'xoa xong het terms');

  console.log('glossary.test.js PASS');
})();

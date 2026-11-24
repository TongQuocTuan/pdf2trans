// U4 Xuat .docx — test that (dung thu vien docx vendor that)
// Chay: node tests/docx-export.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

(async () => {
  // Nap file IIFE vendor vao sandbox -> lay global docx
  const iifePath = path.join(__dirname, '..', 'vendor', 'docx-9.16.0.iife.js');
  assert(fs.existsSync(iifePath), 'thieu file vendor docx-9.16.0.iife.js');
  // Thu vien docx dung TextEncoder/TextDecoder/Buffer — vm sandbox khong co san
  const { TextEncoder, TextDecoder } = require('util');
  const sandbox = { console, TextEncoder, TextDecoder, Blob: require('buffer').Blob, Buffer, process };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(iifePath, 'utf8'), sandbox);
  const docxLib = sandbox.docx;
  assert(docxLib && docxLib.Document && docxLib.Packer, 'IIFE phai xuat global docx co Document/Packer');

  const buildDocxDocument = require('../src/js/docx-export.js');
  const doc = buildDocxDocument(docxLib, {
    fileName: 'chuong-7.pdf',
    exportedAt: new Date('2026-11-24T13:00:00+07:00'),
    stats: { total: 4, approved: 1 },
    segments: [
      { en: 'Hello world', vi: 'Xin chào thế giới', page: 1, order: 0, approved: true },
      { en: 'Second para', vi: 'Đoạn thứ hai', page: 1, order: 1, approved: false },
      { en: 'Failed para', vi: '', page: 2, order: 0, approved: false }, // doan loi -> bo qua
      { en: 'Third page', vi: 'Trang thứ ba', page: 2, order: 1, approved: false }
    ]
  });
  const buf = await docxLib.Packer.toBuffer(doc);
  assert(buf.length > 1000, 'buffer docx phai > 1KB, duoc ' + buf.length);
  assert(buf.slice(0, 2).toString() === 'PK', 'docx phai la file zip (PK)');

  const tmpPath = path.join(__dirname, 'tmp-docx-test.docx');
  fs.writeFileSync(tmpPath, buf);
  const checks = JSON.parse(execSync(
    `python3 -c "import zipfile, json; z = zipfile.ZipFile('${tmpPath}'); xml = z.read('word/document.xml').decode('utf-8'); print(json.dumps({'title': 'Bản dịch — chuong-7.pdf' in xml, 'trang1': 'Trang 1' in xml, 'trang2': 'Trang 2' in xml, 'vi1': 'Xin chào thế giới' in xml, 'vi2': 'Đoạn thứ hai' in xml, 'chua_duyet': 'Đoạn thứ hai (chưa duyệt)' in xml, 'approved_khong_danh_dau': 'Xin chào thế giới (chưa duyệt)' not in xml, 'doan_loi_bo_qua': 'Failed para' not in xml}))"`,
    { encoding: 'utf8' }
  ));
  fs.unlinkSync(tmpPath);
  for (const [k, v] of Object.entries(checks)) assert(v === true, 'docx check that bai: ' + k);

  console.log('docx-export.test.js PASS');
})();

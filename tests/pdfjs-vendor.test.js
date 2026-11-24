// U5 Tu host PDF.js — test tinh (file vendor + tham chieu local)
// Chay: node tests/pdfjs-vendor.test.js
const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

const root = path.join(__dirname, '..');
const pdfMin = path.join(root, 'vendor', 'pdf.min.js');
const workerMin = path.join(root, 'vendor', 'pdf.worker.min.js');
assert(fs.existsSync(pdfMin), 'thieu vendor/pdf.min.js');
assert(fs.existsSync(workerMin), 'thieu vendor/pdf.worker.min.js');
assert(fs.statSync(pdfMin).size > 100000, 'pdf.min.js qua nho, co the tai hong');
assert(fs.statSync(workerMin).size > 500000, 'pdf.worker.min.js qua nho, co the tai hong');
const pdfSrc = fs.readFileSync(pdfMin, 'utf8');
assert(pdfSrc.includes('3.11.174'), 'pdf.min.js phai la ban 3.11.174');
assert(fs.existsSync(path.join(root, 'vendor', 'pdfjs-LICENSE.txt')), 'thieu vendor/pdfjs-LICENSE.txt (Apache-2.0)');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexHtml.includes('src="vendor/pdf.min.js"'), 'index.html phai nap vendor/pdf.min.js');
assert(!indexHtml.includes('cdnjs.cloudflare.com/ajax/libs/pdf.js'), 'index.html khong con CDN pdf.js');
const viewerJs = fs.readFileSync(path.join(root, 'src', 'js', 'pdf-viewer.js'), 'utf8');
assert(viewerJs.includes("workerSrc = 'vendor/pdf.worker.min.js'"), 'workerSrc phai tro vendor local');
assert(!viewerJs.includes('cdnjs.cloudflare.com/ajax/libs/pdf.js'), 'pdf-viewer.js khong con CDN pdf.js');

console.log('pdfjs-vendor.test.js PASS');

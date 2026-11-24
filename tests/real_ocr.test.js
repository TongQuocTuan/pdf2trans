const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const DIR = __dirname; // duong dan theo file test, khong theo cwd
(async()=>{
  const t0 = Date.now();
  const { data } = await Tesseract.recognize(path.join(DIR, 'sample-clean.png'), 'eng', {
    langPath: path.join(DIR, 'tessdata'),
    logger: m => { if (m.status==='recognizing text') console.log('recognizing', Math.round(m.progress*100)+'%'); }
  });
  console.log('OCR time ms:', Date.now()-t0);
  console.log('TEXT:', JSON.stringify(data.text));
  console.log('PARAS:', JSON.stringify(data.paragraphs.map(p=>({text:p.text.trim(), bbox:p.bbox}))));
  fs.writeFileSync(path.join(DIR, 'real_ocr_result.json'), JSON.stringify({text: data.text, paragraphs: data.paragraphs, confidence: data.confidence}, null, 1));
  console.log('saved real_ocr_result.json');
})().catch(e=>{ console.error('OCR FAILED:', e.message); process.exit(1); });

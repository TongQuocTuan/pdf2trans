const Tesseract = require('tesseract.js');
const path = require('path');
(async()=>{
  const { data } = await Tesseract.recognize(path.join(__dirname, 'sample-clean-2x.png'), 'eng', { langPath: path.join(__dirname, 'tessdata') });
  console.log('2x TEXT:', JSON.stringify(data.text));
  const exp = "Hello world from a scanned page.\nSecond paragraph here.\n";
  console.log('2x exact match:', data.text === exp ? 'PASS' : 'CHECK');
})();

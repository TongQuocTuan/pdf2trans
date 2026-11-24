// Chay code that cua v3-ocr (_paragraphsFromTesseract) tren ket qua OCR THAT
class FakeEl {
  constructor(tag){ this.tagName=tag; this.children=[]; this.style={}; this.textContent=''; this.innerHTML=''; this.clientHeight=800;
    this.classList={ _s:new Set(), add:(...c)=>c.forEach(x=>this.classList._s.add(x)), remove:(...c)=>c.forEach(x=>this.classList._s.delete(x)), toggle:(c,f)=>{f?this.classList._s.add(c):this.classList._s.delete(c)}, contains:(c)=>this.classList._s.has(c) }; }
  appendChild(c){ this.children.push(c); return c; }
  setAttribute(){} querySelector(){ return null; } getContext(){ return {}; }
}
global.window = global;
global.document = { getElementById: ()=> new FakeEl('div'), createElement: (t)=> new FakeEl(t) };
global.pdfjsLib = { GlobalWorkerOptions:{} };
global.window.matchMedia = ()=>({matches:false});
const fs=require('fs');
const path=require('path');
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'pdf-viewer.js'),'utf8'));
const real = JSON.parse(fs.readFileSync(path.join(__dirname, 'real_ocr_result.json'),'utf8'));
// Anh hien thi scale 1 (900px), OCR tren anh goc -> convert he so 1
const parasImg = window.pdfViewer._paragraphsFromTesseract(real, (x0,y0,x1,y1)=>({x:x0,y:y0,width:x1-x0,height:y1-y0}));
console.log('v3 code on REAL image OCR:', JSON.stringify(parasImg));
// PDF scan: OCR tren canvas scale 2, hien thi scale 1 -> he so 0.5; mo phong bang bbox nhan 2
const real2x = JSON.parse(JSON.stringify(real));
real2x.paragraphs.forEach(p=>{ p.bbox={x0:p.bbox.x0*2,y0:p.bbox.y0*2,x1:p.bbox.x1*2,y1:p.bbox.y1*2}; });
const parasPdf = window.pdfViewer._paragraphsFromTesseract(real2x, (x0,y0,x1,y1)=>({x:x0*0.5,y:y0*0.5,width:(x1-x0)*0.5,height:(y1-y0)*0.5}));
console.log('v3 code on REAL 2x (PDF scan path):', JSON.stringify(parasPdf));
console.log('PDF-scan box matches image box:', JSON.stringify(parasImg)===JSON.stringify(parasPdf) ? 'PASS' : 'FAIL');

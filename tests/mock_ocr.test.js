class FakeEl {
  constructor(tag){ this.tagName=tag; this.children=[]; this.style={}; this.textContent=''; this.innerHTML=''; this.clientHeight=800;
    this.classList={ _s:new Set(), add:(...c)=>c.forEach(x=>this.classList._s.add(x)), remove:(...c)=>c.forEach(x=>this.classList._s.delete(x)), toggle:(c,f)=>{f?this.classList._s.add(c):this.classList._s.delete(c)}, contains:(c)=>this.classList._s.has(c) };
  }
  appendChild(c){ this.children.push(c); return c; }
  setAttribute(){} querySelector(){ return null; } getContext(){ return {}; }
}
global.window = global;
global.document = { getElementById: ()=> new FakeEl('div'), createElement: (t)=> new FakeEl(t) };
global.pdfjsLib = { GlobalWorkerOptions:{}, renderTextLayer:()=>({promise:Promise.resolve()}) };
global.requestAnimationFrame = (cb)=> setTimeout(cb, 0);
global.performance = { now: ()=> Date.now() };
global.window.matchMedia = ()=>({matches:false});
global.window.devicePixelRatio = 1;
global.URL = { createObjectURL: ()=>'blob:fake', revokeObjectURL: ()=>{} };
global.Image = class { constructor(){ this.naturalWidth=1000; this.naturalHeight=500; } set src(v){ setTimeout(()=>this.onload&&this.onload(),0); } };
global.Tesseract = { recognize: async (src, lang, opts)=>{
  if (lang!=='eng') throw new Error('lang should be eng, got '+lang);
  opts.logger({status:'recognizing text', progress:0.5});
  return { data: { paragraphs: [
    { text:'Hello world from a scanned page.', bbox:{x0:100,y0:50,x1:600,y1:80} },
    { text:'Second paragraph here.', bbox:{x0:100,y0:100,x1:400,y1:130} },
    { text:'x', bbox:{x0:0,y0:0,x1:5,y1:5} },
  ]}};
}};
const fs=require('fs');
const path=require('path');
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'pdf-viewer.js'),'utf8'));
(async()=>{
  const v = window.pdfViewer;
  const file = { type:'image/png', name:'scan.png', size:12345, lastModified: 999 };
  console.log('loadImageFile:', await v.loadImageFile(file), '| docType:', v.docType, '| pages:', v.totalPages);
  console.log('no OCR yet:', JSON.stringify(await v.getPageTextBlocks(1)));
  const paras = await v.runOcrOnCurrentPage();
  console.log('OCR paras:', JSON.stringify(paras));
  console.log('box check (x=100,y=50):', paras[0].box.x===100 && paras[0].box.y===50 ? 'PASS' : 'FAIL');
  console.log('short para filtered (2 paras):', paras.length===2 ? 'PASS' : 'FAIL');
  console.log('hasOcrForPage:', v.hasOcrForPage(1) ? 'PASS' : 'FAIL');
  const wordsData = { words:[
    {text:'First', block_num:0, par_num:0, line_num:0, word_num:0, bbox:{x0:10,y0:10,x1:50,y1:30}},
    {text:'line', block_num:0, par_num:0, line_num:0, word_num:1, bbox:{x0:55,y0:10,x1:90,y1:30}},
    {text:'Second', block_num:0, par_num:1, line_num:1, word_num:0, bbox:{x0:10,y0:40,x1:70,y1:60}},
    {text:'para', block_num:0, par_num:1, line_num:1, word_num:1, bbox:{x0:75,y0:40,x1:110,y1:60}},
  ]};
  console.log('words fallback:', JSON.stringify(v._paragraphsFromTesseract(wordsData, (x0,y0,x1,y1)=>({x:x0,y:y0,width:x1-x0,height:y1-y0}))));
  console.log('empty data:', JSON.stringify(v._paragraphsFromTesseract({}, (x0,y0,x1,y1)=>({x:0,y:0,width:1,height:1}))));
  v.docType='pdf'; v.ocrParagraphs={};
  const viewport = { width:1224, height:1584, convertToViewportPoint:(x,y)=>[x, 1584-y] };
  const origCreate = global.document.createElement;
  global.document.createElement = (t)=>{ const el=new FakeEl(t); if(t==='canvas'){ el.toBlob=(cb)=>cb({type:'image/png'}); el.width=1224; el.height=1584; } return el; };
  v.pdfDoc = { getPage: async()=>({ getTextContent: async()=>({items:[]}), getViewport: ()=>viewport, render: ()=>({promise:Promise.resolve()}), cleanup:()=>{} }) };
  v.scale = 1.0; v.currentPage = 1;
  const pdfParas = await v.runOcrOnCurrentPage();
  console.log('PDF scan OCR (factor 1/2, x=50,y=25):', pdfParas[0].box.x===50 && pdfParas[0].box.y===25 ? 'PASS' : 'FAIL');
  delete global.Tesseract;
  try { await v.runOcrOnCurrentPage(); console.log('missing Tesseract: FAIL'); }
  catch(e){ console.log('missing Tesseract throws: PASS'); }
})();

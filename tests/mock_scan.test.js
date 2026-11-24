class FakeEl {
  constructor(tag){ this.tagName=tag; this.children=[]; this.style={}; this.textContent=''; this.innerHTML=''; this.clientHeight=792;
    this.classList={ _s:new Set(), add:(...c)=>c.forEach(x=>this.classList._s.add(x)), remove:(...c)=>c.forEach(x=>this.classList._s.delete(x)), toggle:(c,f)=>{f?this.classList._s.add(c):this.classList._s.delete(c)}, contains:(c)=>this.classList._s.has(c) };
  }
  appendChild(c){ this.children.push(c); return c; }
  setAttribute(){} querySelector(){ return null; } getContext(){ return {}; }
}
global.window = global;
global.document = { getElementById: ()=> new FakeEl('div'), createElement: (t)=> new FakeEl(t) };
global.pdfjsLib = { GlobalWorkerOptions:{}, renderTextLayer:()=>({promise:Promise.resolve()}) };
let rafTime=0;
global.requestAnimationFrame = (cb)=> setTimeout(()=>{ rafTime+=200; cb(); }, 0);
global.performance = { now: ()=> rafTime };
global.window.matchMedia = ()=>({matches:false});
global.window.devicePixelRatio = 1;
const fs=require('fs');
const path=require('path');
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'pdf-viewer.js'),'utf8'));
(async()=>{
  const v = window.pdfViewer;
  const items = [
    {str:'Hello world, this is', transform:[12,0,0,12,100,700], height:12, width:150, fontName:'F1'},
    {str:'a test of grouping.', transform:[12,0,0,12,280,700], height:12, width:120, fontName:'F1'},
    {str:'Next para-', transform:[12,0,0,12,100,685], height:12, width:80, fontName:'F1'},
    {str:'graph continues here.', transform:[12,0,0,12,100,670], height:12, width:140, fontName:'F1'},
    {str:'Far away heading', transform:[12,0,0,12,100,600], height:12, width:110, fontName:'F1'},
  ];
  const viewport = { width:612, height:792, convertToViewportPoint:(x,y)=>[x, 792-y] };
  v.pdfDoc = { getPage: async()=>({ getTextContent: async()=>({items}), getViewport: ()=>viewport, render: ()=>({promise:Promise.resolve()}), cleanup:()=>{} }) };
  const paras = await v.getPageTextBlocksWithBoxes(1);
  console.log('paras:', paras.length===3 ? 'PASS (3)' : 'FAIL '+paras.length, '| first box y=80:', paras[0]?.box.y===80 ? 'PASS' : 'FAIL');
  console.log('getPageTextBlocks strings:', (await v.getPageTextBlocks(1)).length===3 ? 'PASS' : 'FAIL');
  v.container = new FakeEl('div'); v.bilingualContainer = new FakeEl('div');
  v._renderToken=1; await v.renderPageToContainer(1, v.bilingualContainer, 1);
  console.log('overlay created:', !!v._scanOverlay ? 'PASS' : 'FAIL');
  console.log('playScan:', await v.playScan(paras) ? 'PASS' : 'FAIL', '| overlay cleared:', v._scanOverlay.innerHTML==='' ? 'PASS' : 'FAIL');
  global.window.matchMedia = ()=>({matches:true});
  console.log('reduced-motion playScan false:', await v.playScan(paras)===false ? 'PASS' : 'FAIL');
  global.window.matchMedia = ()=>({matches:false});
  v.setScanFxEnabled(false);
  console.log('disabled playScan false:', await v.playScan(paras)===false ? 'PASS' : 'FAIL');
})();

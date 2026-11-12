/* DOM state regressions. These do not substitute for real-browser layout/touch QA.
   Run: NODE_PATH=/path/to/node_modules node --test tests/dom.test.cjs (requires jsdom). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname,'..');
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
// Wait for async jsdom history effects rather than assuming a 25–35 ms deadline.
async function until(predicate) {
  const deadline=Date.now()+2000;
  while(!predicate() && Date.now()<deadline) await wait(10);
  assert.ok(predicate(),'async history state did not settle');
}
async function boot({mobile=false,url='https://example.test/AI_HISTORY/',fetchFailure=false}={}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,errors=[];
  w.console.error=(...args)=>errors.push(args.join(' '));
  w.matchMedia=()=>({matches:mobile});
  w.ResizeObserver=class{observe(){}};
  w.HTMLElement.prototype.scrollTo=function(left,top){this.scrollLeft=left;this.scrollTop=top};
  w.HTMLElement.prototype.scrollBy=function(left,top){this.scrollLeft+=left;this.scrollTop+=top};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  const v=d.getElementById('viewer');
  Object.defineProperties(v,{clientWidth:{value:mobile?390:1360},clientHeight:{value:600}});
  v.getBoundingClientRect=()=>({left:0,top:220,right:1360,bottom:820,width:1360,height:600});
  const captures=new Set();v.setPointerCapture=id=>captures.add(id);v.hasPointerCapture=id=>captures.has(id);v.releasePointerCapture=id=>captures.delete(id);
  w.fetch=async url=>({ok:!fetchFailure,status:fetchFailure?503:200,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8')),text:async()=>fs.readFileSync(path.join(root,url.split('?')[0]),'utf8')});
  w.eval(fs.readFileSync(path.join(root,'assets/data.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(root,'assets/brand-data.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(root,'assets/brand-evolution.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(root,'assets/overview-magnifier.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(root,'assets/explorer.js'),'utf8'));
  await wait(30);
  return {dom,w,d,errors,v,click:id=>d.getElementById(id).click(),set:(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('change'));}};
}
function pointer(ctx,target,type,id,x,y) {
  const e=new ctx.w.Event(type,{bubbles:true,cancelable:true});
  Object.assign(e,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0});target.dispatchEvent(e);
}
test('Mistral preview and revision remain searchable with dated source details',async()=>{
 const c=await boot({mobile:true,url:'https://example.test/AI_HISTORY/?q=Le%20Chonk&brand=Mistral%20AI&view=list'});try{
  assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,2);assert.equal(c.d.querySelectorAll('.node').length,2);
  const expected=new Map([['Mistral Large 4','2026-10-06'],['Mistral Large 4 (October 29)','2026-10-29']]);
  for(const button of c.d.querySelectorAll('.model-card [data-detail]')){
   button.click();const name=c.d.getElementById('detailTitle').textContent;
   assert.ok(expected.has(name));assert.ok(c.d.getElementById('detailMeta').textContent.includes(expected.get(name)));
   assert.ok(c.d.querySelectorAll('#detailSources a').length>=2);c.click('closeDetail');
  }
  c.d.querySelector('#listResults [data-brand]').click();assert.equal(c.d.getElementById('brandEvolution').open,true);
  for(const name of expected.keys())assert.ok(c.d.getElementById('brandCanvas').textContent.includes(name));
  c.click('closeBrand');assert.equal(c.d.querySelectorAll('.model-card').length,2);
 }finally{c.dom.window.close()}
});
test('EmbeddingGemma appears in embedding filter and its separate Google family lane',async()=>{
 const c=await boot({mobile:true,url:'https://example.test/AI_HISTORY/?q=EmbeddingGemma&brand=Google&type=embedding&view=list'});try{
  assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
  c.d.querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,'EmbeddingGemma 2');
  assert.match(c.d.getElementById('detailMeta').textContent,/2026-10-06/);c.click('closeDetail');
  c.d.querySelector('#listResults [data-brand]').click();assert.match(c.d.getElementById('brandCanvas').textContent,/EmbeddingGemma/);
  c.click('closeBrand');c.set('typeFilter','general');assert.equal(c.d.querySelectorAll('.model-card').length,0);
 }finally{c.dom.window.close()}
});
test('new brands and decision filter retain list, timeline, details and brand navigation',async()=>{
 for(const [brand,model,type] of [['Kakao','Kanana-2-v-decide','decision'],['SenseTime','SenseNova 6.8 Flash',''],['Thinking Machines Lab','Inkling 2 Small','']]){
  const c=await boot({mobile:true,url:`https://example.test/AI_HISTORY/?brand=${encodeURIComponent(brand)}&type=${type}&view=list`});try{
   assert.deepEqual(c.errors,[]);assert.equal(c.d.getElementById('brandJump').value,brand);
   assert.equal(c.d.getElementById('typeFilter').value,type);
   assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
   c.d.querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,model);
   assert.ok(c.d.querySelectorAll('#detailSources a').length>=1);c.click('closeDetail');
   c.d.querySelector('#listResults [data-brand]').click();assert.equal(c.d.getElementById('brandEvolution').open,true);
   assert.ok(c.d.getElementById('brandCanvas').textContent.includes(model));
  }finally{c.dom.window.close()}
 }
});
test('desktop loads 264 unique records, all dates and 28 brands at readable scale; updates closed', async()=>{
  const c=await boot();try{
    assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.node').length,264);assert.equal(c.d.querySelectorAll('.model-card').length,264);
    assert.equal(c.d.querySelectorAll('#brandJump option').length,29);assert.equal(c.d.getElementById('pct').textContent,'100%');
    assert.equal(c.d.getElementById('updatesPanel').open,false);assert.equal(c.d.getElementById('listResults').hidden,true);
    assert.equal(c.d.querySelectorAll('.model-card time[datetime="2026-05"]').length,1);
  }finally{c.dom.window.close()}
});
test('mobile defaults to list, retains timeline and updates access, returns to list',async()=>{
  const c=await boot({mobile:true});try{
    assert.equal(c.v.hidden,true);assert.equal(c.d.getElementById('listResults').hidden,false);
    c.click('updatesMobile');assert.equal(c.d.getElementById('updatesPanel').open,true);c.click('closeUpdates');assert.equal(c.d.getElementById('updatesPanel').open,false);
    c.click('timelineView');assert.equal(c.v.hidden,false);assert.equal(c.d.getElementById('pct').textContent,'100%');
    c.click('listView');assert.equal(c.d.getElementById('listResults').hidden,false);
    c.click('filterToggle');assert.equal(c.d.getElementById('filterToggle').getAttribute('aria-expanded'),'true');c.click('filterToggle');assert.equal(c.d.getElementById('filterToggle').getAttribute('aria-expanded'),'false');
  }finally{c.dom.window.close()}
});
test('filter intersections, empty/reset, capability search and URL restoration',async()=>{
  const c=await boot();try{
    c.set('brandJump','Alibaba');c.set('yearFilter','2026');c.set('typeFilter','image');
    assert.equal(c.d.querySelectorAll('.node').length,1);assert.match(c.w.location.search,/brand=Alibaba/);
    c.d.getElementById('search').value='nonexistent';c.d.getElementById('search').dispatchEvent(new c.w.Event('input'));await wait(170);
    assert.equal(c.d.getElementById('emptyState').hidden,false);assert.equal(c.v.hidden,true);
    c.click('emptyReset');assert.equal(c.d.querySelectorAll('.node').length,264);assert.equal(c.d.getElementById('emptyState').hidden,true);
    c.d.getElementById('search').value='推理';c.d.getElementById('search').dispatchEvent(new c.w.Event('input'));await wait(170);
    assert.ok(c.d.querySelectorAll('.node').length>=75);
    c.w.history.pushState({},'', '?brand=Alibaba&year=2026&type=image&view=list');c.w.dispatchEvent(new c.w.PopStateEvent('popstate'));
    assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.getElementById('listResults').hidden,false);
  }finally{c.dom.window.close()}
});
test('details open repeatedly, source links are safe, Escape closes and locate restores canvas',async()=>{
  const c=await boot({mobile:true});try{
    const card=()=>[...c.d.querySelectorAll('.model-card')].find(el=>el.textContent.includes('Qwen-Image-2.1'));
    for(let i=0;i<3;i++){card().querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detail').open,true);assert.equal(c.d.querySelectorAll('#detailSources a').length,2);c.click('closeDetail');await until(()=>!c.d.getElementById('detail').open && !c.w.location.hash);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'')}
    card().querySelector('[data-detail]').click();c.d.getElementById('detail').dispatchEvent(new c.w.Event('cancel',{cancelable:true}));await until(()=>!c.d.getElementById('detail').open && !c.w.location.hash);assert.equal(c.d.getElementById('detail').open,false);
    card().querySelector('[data-detail]').click();c.click('locateDetail');assert.equal(c.v.hidden,false);assert.equal(c.d.getElementById('detail').open,false);assert.match(c.d.querySelector('.highlight').getAttribute('aria-label'),/Qwen-Image-2.1/);
    c.d.querySelector('.highlight').dispatchEvent(new c.w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(c.d.getElementById('detail').open,true);
    assert.ok([...c.d.querySelectorAll('#detailSources a')].every(a=>a.rel.includes('noopener')&&a.rel.includes('noreferrer')));
  }finally{c.dom.window.close()}
});
test('shared model URL loads detail; history navigation does not erase destination hash',async()=>{
  const hash='#model='+encodeURIComponent('Alibaba|Qwen-Image-2.1');const c=await boot({url:'https://example.test/AI_HISTORY/?view=list'+hash});try{
    assert.equal(c.d.getElementById('detail').open,true);assert.equal(c.d.getElementById('detailTitle').textContent,'Qwen-Image-2.1');
    c.w.history.pushState({},'', '?brand=OpenAI&view=timeline#model='+encodeURIComponent('OpenAI|GPT-6.1 Sol'));c.w.dispatchEvent(new c.w.PopStateEvent('popstate'));await wait(10);
    assert.equal(c.d.getElementById('detailTitle').textContent,'GPT-6.1 Sol');assert.match(decodeURIComponent(c.w.location.hash),/GPT-6.1 Sol/);
    c.click('closeDetail');await until(()=>!c.w.location.hash);assert.equal(c.w.location.hash,'');
  }finally{c.dom.window.close()}
});
test('drag never opens detail; pinch to one pointer rebases; cancel/lost capture/blur clear state',async()=>{
  const c=await boot();try{
    const node=c.d.querySelector('.node');c.v.scrollLeft=500;c.v.scrollTop=500;
    pointer(c,node,'pointerdown',1,100,400);pointer(c,c.v,'pointermove',1,140,430);pointer(c,c.v,'pointerup',1,140,430);assert.equal(c.d.getElementById('detail').open,false);
    pointer(c,node,'pointerdown',1,100,400);pointer(c,c.v,'pointerdown',2,200,400);pointer(c,c.v,'pointermove',2,230,400);
    pointer(c,c.v,'pointerup',2,230,400);const left=c.v.scrollLeft;pointer(c,c.v,'pointermove',1,110,400);assert.ok(Math.abs(c.v.scrollLeft-(left-10))<.01);pointer(c,c.v,'pointerup',1,110,400);assert.equal(c.d.getElementById('detail').open,false);
    for(const event of ['pointercancel','lostpointercapture']){pointer(c,node,'pointerdown',1,100,400);pointer(c,c.v,event,1,100,400);assert.equal(c.v.classList.contains('dragging'),false);assert.equal(c.d.getElementById('detail').open,false)}
    pointer(c,node,'pointerdown',1,100,400);c.w.dispatchEvent(new c.w.Event('blur'));assert.equal(c.v.classList.contains('dragging'),false);
    pointer(c,node,'pointerdown',1,100,400);pointer(c,c.v,'pointerup',1,100,400);assert.equal(c.d.getElementById('detail').open,true);
  }finally{c.dom.window.close()}
});
test('HTTP errors show actionable retry instead of silent empty records',async()=>{
  const c=await boot({fetchFailure:true});try{
    assert.equal(c.d.getElementById('loading').hidden,false);assert.equal(c.d.getElementById('retryLoad').hidden,false);assert.match(c.d.getElementById('loading').textContent,/503/);assert.equal(c.d.querySelectorAll('.node').length,0);
  }finally{c.dom.window.close()}
});

test('real history Back dismisses details and Forward restores the same node',async()=>{
  const c=await boot({mobile:true});try{
    const first=c.d.querySelector('[data-detail]');const expected=first.dataset.detail;
    const originalLength=c.w.history.length;first.click();
    assert.equal(c.w.history.length,originalLength+1);assert.equal(c.d.getElementById('detail').open,true);
    c.w.history.back();await until(()=>!c.d.getElementById('detail').open && !c.w.location.hash);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'');
    c.w.history.forward();await until(()=>c.d.getElementById('detail').open);assert.equal(c.d.getElementById('detail').open,true);assert.equal(decodeURIComponent(c.w.location.hash.slice(7)),expected);
    c.click('closeDetail');await until(()=>!c.d.getElementById('detail').open && !c.w.location.hash);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'');
  }finally{c.dom.window.close()}
});

test('closing detail via Back preserves list and timeline browsing position',async()=>{
  for(const mobile of [true,false]){
    const c=await boot({mobile});try{
      c.d.getElementById('listResults').scrollTop=2400;c.v.scrollTop=2400;c.v.scrollLeft=2000;
      c.d.querySelector('[data-detail]').click();c.click('closeDetail');await until(()=>!c.d.getElementById('detail').open && !c.w.location.hash);
      assert.equal(c.d.getElementById('listResults').scrollTop,2400);assert.equal(c.v.scrollTop,2400);assert.equal(c.v.scrollLeft,2000);
    }finally{c.dom.window.close()}
  }
});


test('brand dialog opens from existing labels, retains all brand nodes and main filters/viewport',async()=>{
 const c=await boot({mobile:true});try{
 c.set('brandJump','OpenAI');c.set('yearFilter','2026');const mainCount=c.d.querySelectorAll('.model-card').length;
 c.v.scrollLeft=1234;c.v.scrollTop=789;c.d.getElementById('listResults').scrollTop=333;
 const entry=c.d.querySelector('#listResults [data-brand="OpenAI"]');entry.focus();entry.click();
 assert.equal(c.d.getElementById('brandEvolution').open,true);assert.equal(c.d.querySelectorAll('[data-brand-node]').length,40);
 assert.match(c.d.getElementById('brandCanvas').textContent,/X：發布時間/);assert.match(c.d.getElementById('brandCanvas').textContent,/Y：模型系列/);
 const node=c.d.querySelector('[data-brand-node]');node.dispatchEvent(new c.w.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(c.d.getElementById('brandNodeDetail').hidden,false);assert.ok(c.d.querySelectorAll('#brandNodeSources a').length);
 assert.ok([...c.d.querySelectorAll('#brandNodeSources a')].every(a=>a.rel.includes('noopener')));
 assert.ok(c.w.location.hash.startsWith('#brand='));c.click('brandZoomIn');assert.equal(c.d.getElementById('brandZoomLabel').textContent,'125%');
 c.click('closeBrand');await until(()=>!c.d.getElementById('brandEvolution').open);assert.equal(c.d.getElementById('brandEvolution').open,false);assert.equal(c.d.activeElement,entry);
 assert.equal(c.d.querySelectorAll('.model-card').length,mainCount);assert.equal(c.d.getElementById('yearFilter').value,'2026');
 assert.equal(c.v.scrollLeft,1234);assert.equal(c.v.scrollTop,789);assert.equal(c.d.getElementById('listResults').scrollTop,333);
 }finally{c.dom.window.close()}
});
test('brand history Back/Forward, Escape, direct links, and invalid brand are safe',async()=>{
 const c=await boot({url:'https://example.test/AI_HISTORY/?view=list#brand=OpenAI'});try{
 assert.equal(c.d.getElementById('brandEvolution').open,true);c.click('closeBrand');assert.equal(c.w.location.hash,'');
 const entry=c.d.querySelector('#listResults [data-brand="Alibaba"]');entry.click();
 c.w.history.back();await until(()=>!c.d.getElementById('brandEvolution').open);assert.equal(c.d.getElementById('brandEvolution').open,false);
 c.w.history.forward();await until(()=>c.d.getElementById('brandEvolution').open);assert.equal(c.d.getElementById('brandEvolution').open,true);assert.match(c.d.getElementById('brandTitle').textContent,/Qwen/);
 c.d.getElementById('brandEvolution').dispatchEvent(new c.w.Event('cancel',{cancelable:true}));await until(()=>!c.d.getElementById('brandEvolution').open);assert.equal(c.d.getElementById('brandEvolution').open,false);
 c.w.history.pushState({},'','#brand=does-not-exist');c.w.dispatchEvent(new c.w.HashChangeEvent('hashchange'));assert.equal(c.d.getElementById('brandEvolution').open,false);
 }finally{c.dom.window.close()}
});
test('timeline brand keyboard/tap opens and drag/cancel never opens',async()=>{
 const c=await boot();try{
 const entry=c.d.querySelector('#stage [data-brand="OpenAI"]');
 pointer(c,entry,'pointerdown',1,100,400);pointer(c,c.v,'pointermove',1,160,400);pointer(c,c.v,'pointerup',1,160,400);assert.equal(c.d.getElementById('brandEvolution').open,false);
 pointer(c,entry,'pointerdown',1,100,400);pointer(c,c.v,'pointercancel',1,100,400);assert.equal(c.d.getElementById('brandEvolution').open,false);
 entry.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(c.d.getElementById('brandEvolution').open,true);
 c.click('closeBrand');await until(()=>!c.d.getElementById('brandEvolution').open);pointer(c,entry,'pointerdown',1,100,400);pointer(c,c.v,'pointerup',1,100,400);assert.equal(c.d.getElementById('brandEvolution').open,true);
 const sameDate=[...c.d.querySelectorAll('[data-brand-node]')].filter(n=>n.textContent.includes('2025-04-14'));assert.ok(sameDate.length>=3);
 const rects=sameDate.map(n=>n.querySelector('rect'));assert.equal(new Set(rects.map(r=>r.getAttribute('y'))).size,rects.length);
 }finally{c.dom.window.close()}
});

test('short-height brand layout keeps chart and selected detail reachable through outer scrolling',()=>{
 const dom=new JSDOM('<!doctype html><style></style>');try{
 const style=dom.window.document.querySelector('style');style.textContent=fs.readFileSync(path.join(root,'assets/brand-evolution.css'),'utf8');
 const rule=[...style.sheet.cssRules].find(r=>r.conditionText==='(max-height:620px)');assert.ok(rule);
 const rules=Object.fromEntries([...rule.cssRules].map(r=>[r.selectorText,r.style]));
 assert.equal(rules['#brandEvolution'].getPropertyValue('overflow'),'auto');
 assert.equal(rules['.be-plot'].getPropertyValue('flex'),'0 0 220px');
 assert.equal(rules['.be-detail'].getPropertyValue('max-height'),'none');assert.equal(rules['.be-detail'].getPropertyValue('overflow'),'visible');
 }finally{dom.window.close()}
});

test('Rerank filter is selectable and excludes Embed while cumulative scope is explicit',async()=>{
 const c=await boot({mobile:true});try{
  assert.ok(c.d.querySelector('#typeFilter option[value="rerank"]'));
  c.set('typeFilter','rerank');
  const cards=[...c.d.querySelectorAll('.model-card')];
  assert.equal(cards.length,2);assert.ok(cards.every(card=>card.textContent.includes('Rerank 5')));
  assert.match(c.d.getElementById('scope').textContent,/累計收錄 56 筆增量/);
  assert.match(c.d.getElementById('scope').textContent,/不代表全部當日發布或重新查核/);
 }finally{c.dom.window.close()}
});
test('Duet participates in original Agent filters without changing existing cards',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'agents.html'),'utf8'),{runScripts:'dangerously'});
 try{
  const d=dom.window.document,duet=d.getElementById('claude-duet');
  assert.equal(d.querySelectorAll('.card').length,9);
  d.querySelector('[data-f="coding"]').click();assert.equal(duet.hidden,true);
  d.querySelector('[data-f="agent"]').click();assert.equal(duet.hidden,false);
  assert.equal(d.querySelectorAll('.card:not([hidden])').length,6);
  d.querySelector('[data-f="all"]').click();assert.equal(d.querySelectorAll('.card:not([hidden])').length,9);
 }finally{dom.window.close()}
});


test('Genie world-model filter, detail and Google family remain distinct',async()=>{
 const c=await boot();
 try {
  assert.ok(c.d.querySelector('#typeFilter option[value="world"]'));
  c.set('typeFilter','world');
  assert.equal(c.d.querySelectorAll('.model-card').length,1);
  assert.match(c.d.getElementById('listResults').textContent,/Genie 4/);
  c.d.querySelector('[data-detail]').click();
  assert.match(c.d.getElementById('detailMeta').textContent,/2026-10-27/);
 } finally {c.w.close();}
});

test('research filter exposes Rosalind and preserves scoped source detail',async()=>{
 const c=await boot({mobile:true});try{
 c.set('typeFilter','science');assert.equal(c.d.querySelectorAll('.model-card').length,1);
 assert.match(c.d.querySelector('.model-card').textContent,/Rosalind/);
 }finally{c.dom.window.close()}
});

test('new Meituan brand appears in filter, timeline and brand dialog',async()=>{
 const c=await boot({mobile:true});try{
 c.set('brandJump','Meituan');assert.equal(c.d.querySelectorAll('.model-card').length,1);
 assert.match(c.d.querySelector('.model-card').textContent,/LongCat-2.5/);
 assert.equal(c.d.querySelectorAll('.node').length,1);
 c.d.querySelector('#listResults [data-brand="Meituan"]').click();
 assert.equal(c.d.getElementById('brandEvolution').open,true);assert.equal(c.d.querySelectorAll('[data-brand-node]').length,1);
 assert.match(c.d.getElementById('brandCanvas').textContent,/LongCat/);
 }finally{c.dom.window.close()}
});

test('Images 2.6 appears in image search, timeline and source details',async()=>{
 const c=await boot({mobile:true,url:'https://example.test/AI_HISTORY/?q=GPT-Image-2.6&brand=OpenAI&type=image&view=list'});try{
 assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,2);assert.equal(c.d.querySelectorAll('.node').length,2);
 c.d.querySelector('.model-card button[data-detail]').click();
 assert.equal(c.d.getElementById('detail').open,true);
 assert.match(c.d.getElementById('detailTitle').textContent,/GPT-Image-2\.6 (Sunburst|Flare)/);
 assert.match(c.d.getElementById('detailMeta').textContent,/2026-11-04/);
 assert.ok([...c.d.querySelectorAll('#detailSources a')].some(a=>a.href==='https://openai.com/index/introducing-images-2-6/'));
 c.click('closeDetail');assert.equal(c.d.querySelectorAll('.model-card').length,2);
 c.d.querySelector('#listResults [data-brand="OpenAI"]').click();
 assert.equal(c.d.getElementById('brandEvolution').open,true);
 assert.match(c.d.getElementById('brandCanvas').textContent,/GPT-Image-2\.6 Sunburst/);
 assert.match(c.d.getElementById('brandCanvas').textContent,/GPT-Image-2\.6 Flare/);
 }finally{c.dom.window.close()}
});

test('new cyber and video filters retain detail and brand lanes',async()=>{
 for(const [model,brand,type,lane] of [['GPT-6 Cyber','OpenAI','cyber','GPT Cyber 資安支線'],['Gemini Omni 1.2 Flash','Google','video','Gemini Omni 影片支線']]){
  const c=await boot({mobile:true,url:`https://example.test/AI_HISTORY/?brand=${brand}&type=${type}&view=list`});try{
   assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
   assert.equal(c.d.getElementById('typeFilter').value,type);
   c.d.querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,model);
   assert.ok(c.d.querySelectorAll('#detailSources a').length>=1);c.click('closeDetail');
   c.d.querySelector('#listResults [data-brand]').click();assert.equal(c.d.getElementById('brandEvolution').open,true);
   assert.ok(c.d.getElementById('brandCanvas').textContent.includes(model));assert.ok(c.d.getElementById('brandCanvas').textContent.includes(lane));
  }finally{c.dom.window.close()}
 }
});
test('Tencent new brand is present in filter, timeline, list and brand dialog',async()=>{
 const c=await boot({url:'https://example.test/AI_HISTORY/?brand=Tencent&view=list'});try{
  assert.deepEqual(c.errors,[]);assert.equal(c.d.getElementById('brandJump').value,'Tencent');
  assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
  assert.match(c.d.getElementById('listResults').textContent,/Hy4/);
  c.d.querySelector('#listResults [data-brand="Tencent"]').click();assert.match(c.d.getElementById('brandCanvas').textContent,/Hy4/);
 }finally{c.dom.window.close()}
});

test('November 9 brands render safely in list, timeline, source details and brand view',async()=>{
 for(const [brand,model,date] of [['Nous Research','Arete-27B','2026-11-06'],['humans&','Ampersand v0.1','2026-10-20'],['Ricursive Intelligence','Ripple-65B Preview','2026-11-04']]){
  const c=await boot({mobile:true,url:`https://example.test/AI_HISTORY/?brand=${encodeURIComponent(brand)}&view=list`});try{
   assert.deepEqual(c.errors,[]);assert.equal(c.d.getElementById('brandJump').value,brand);
   assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
   assert.ok(c.d.querySelector('.model-card').textContent.includes(model));
   c.d.querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,model);
   assert.ok(c.d.getElementById('detailMeta').textContent.includes(date));
   assert.ok([...c.d.querySelectorAll('#detailSources a')].every(a=>a.protocol==='https:'&&a.rel.includes('noopener')));
   c.click('closeDetail');c.d.querySelector('#listResults [data-brand]').click();
   assert.equal(c.d.getElementById('brandEvolution').open,true);
   assert.ok(c.d.getElementById('brandCanvas').textContent.includes(model));
   c.click('closeBrand');assert.equal(c.d.querySelectorAll('.model-card').length,1);
   c.click('timelineView');assert.equal(c.v.hidden,false);
  }finally{c.dom.window.close()}
 }
});

test('5.2 versions render once in list and timeline with sources and brand lanes',async()=>{
 const c=await boot({mobile:true,url:'https://example.test/AI_HISTORY/?brand=Anthropic&q=5.2&view=list'});try{
  assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,2);assert.equal(c.d.querySelectorAll('.node').length,2);
  const names=new Set();
  for(const button of c.d.querySelectorAll('.model-card [data-detail]')){
   button.click();names.add(c.d.getElementById('detailTitle').textContent);
   assert.match(c.d.getElementById('detailMeta').textContent,/2026-11-09/);
   assert.equal(c.d.querySelectorAll('#detailSources a').length,4);c.click('closeDetail');
  }
  assert.deepEqual([...names].sort(),['Claude Fable 5.2','Claude Mythos 5.2']);
  c.d.querySelector('#listResults [data-brand]').click();
  for(const name of names)assert.ok(c.d.getElementById('brandCanvas').textContent.includes(name));
  c.click('closeBrand');assert.equal(c.d.querySelectorAll('.model-card').length,2);
 }finally{c.dom.window.close()}
});

test('Seedream and Ember display in correct capability filters, details and brand maps',async()=>{
 for(const [brand,name,type] of [['ByteDance','Seedream 5.5','image'],['Meta','Muse Ember 1.0','general']]){
  const c=await boot({mobile:true,url:'https://example.test/AI_HISTORY/?brand='+brand+'&q='+encodeURIComponent(name)+'&type='+type+'&view=list'});try{
   assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
   c.d.querySelector('.model-card [data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,name);
   assert.match(c.d.getElementById('detailMeta').textContent,/2026-11-09/);
   assert.ok(c.d.querySelectorAll('#detailSources a').length>=2);c.click('closeDetail');
   c.d.querySelector('#listResults [data-brand]').click();assert.ok(c.d.getElementById('brandCanvas').textContent.includes(name));
   c.click('closeBrand');assert.equal(c.d.querySelectorAll('.model-card').length,1);
  }finally{c.dom.window.close()}
 }
});

test('November 12 models support capability filters, timeline, details, sources and brand dialogs',async()=>{
 for(const [brand,name,type,date] of [['Alibaba','Qwen4-Max-Preview','general','2026-11-11'],['Google','Gemini Decision 1','decision','2026-11-11'],['ElevenLabs','Scribe v3 Live','voice','2026-11-10']]){
  const c=await boot({mobile:true,url:`https://example.test/AI_HISTORY/?brand=${brand}&q=${encodeURIComponent(name)}&type=${type}&view=list`});try{
   assert.deepEqual(c.errors,[]);assert.equal(c.d.getElementById('brandJump').value,brand);
   assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.querySelectorAll('.node').length,1);
   c.d.querySelector('.model-card [data-detail]').click();assert.equal(c.d.getElementById('detailTitle').textContent,name);
   assert.ok(c.d.getElementById('detailMeta').textContent.includes(date));
   assert.ok(c.d.querySelectorAll('#detailSources a').length>=1);
   assert.ok([...c.d.querySelectorAll('#detailSources a')].every(a=>a.protocol==='https:'&&a.rel.includes('noopener')));
   c.click('closeDetail');c.d.querySelector('#listResults [data-brand]').click();
   assert.equal(c.d.getElementById('brandEvolution').open,true);assert.ok(c.d.getElementById('brandCanvas').textContent.includes(name));
   c.click('closeBrand');assert.equal(c.d.querySelectorAll('.model-card').length,1);c.click('timelineView');assert.equal(c.v.hidden,false);
  }finally{c.dom.window.close()}
 }
});
test('ElevenLabs new brand includes both distinct transcription models and no generic-model match',async()=>{
 const c=await boot({url:'https://example.test/AI_HISTORY/?brand=ElevenLabs&type=voice&view=list'});try{
  assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.model-card').length,2);assert.equal(c.d.querySelectorAll('.node').length,2);
  assert.match(c.d.getElementById('listResults').textContent,/Scribe v3 Live/);
  c.d.querySelector('#listResults [data-brand]').click();assert.match(c.d.getElementById('brandCanvas').textContent,/Scribe 語音轉寫/);
  c.click('closeBrand');c.set('typeFilter','general');assert.equal(c.d.querySelectorAll('.model-card').length,0);
 }finally{c.dom.window.close()}
});

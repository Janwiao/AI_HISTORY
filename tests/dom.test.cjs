/* DOM state regressions. These do not substitute for real-browser layout/touch QA.
   Run: NODE_PATH=/path/to/node_modules node --test tests/dom.test.cjs (requires jsdom). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname,'..');
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
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
  w.eval(fs.readFileSync(path.join(root,'assets/timeline.js'),'utf8'));
  await wait(30);
  return {dom,w,d,errors,v,click:id=>d.getElementById(id).click(),set:(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('change'));}};
}
function pointer(ctx,target,type,id,x,y) {
  const e=new ctx.w.Event(type,{bubbles:true,cancelable:true});
  Object.assign(e,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0});target.dispatchEvent(e);
}
test('desktop loads 227 unique records, all dates and 19 brands at readable scale; updates closed', async()=>{
  const c=await boot();try{
    assert.deepEqual(c.errors,[]);assert.equal(c.d.querySelectorAll('.node').length,227);assert.equal(c.d.querySelectorAll('.model-card').length,227);
    assert.equal(c.d.querySelectorAll('#brandJump option').length,20);assert.equal(c.d.getElementById('pct').textContent,'100%');
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
    c.click('emptyReset');assert.equal(c.d.querySelectorAll('.node').length,227);assert.equal(c.d.getElementById('emptyState').hidden,true);
    c.d.getElementById('search').value='推理';c.d.getElementById('search').dispatchEvent(new c.w.Event('input'));await wait(170);
    assert.ok(c.d.querySelectorAll('.node').length>=75);
    c.w.history.pushState({},'', '?brand=Alibaba&year=2026&type=image&view=list');c.w.dispatchEvent(new c.w.PopStateEvent('popstate'));
    assert.equal(c.d.querySelectorAll('.model-card').length,1);assert.equal(c.d.getElementById('listResults').hidden,false);
  }finally{c.dom.window.close()}
});
test('details open repeatedly, source links are safe, Escape closes and locate restores canvas',async()=>{
  const c=await boot({mobile:true});try{
    const card=()=>[...c.d.querySelectorAll('.model-card')].find(el=>el.textContent.includes('Qwen-Image-2.1'));
    for(let i=0;i<3;i++){card().querySelector('[data-detail]').click();assert.equal(c.d.getElementById('detail').open,true);assert.equal(c.d.querySelectorAll('#detailSources a').length,2);c.click('closeDetail');await wait(25);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'')}
    card().querySelector('[data-detail]').click();c.d.getElementById('detail').dispatchEvent(new c.w.Event('cancel',{cancelable:true}));await wait(25);assert.equal(c.d.getElementById('detail').open,false);
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
    c.click('closeDetail');await wait(25);assert.equal(c.w.location.hash,'');
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
    c.w.history.back();await wait(35);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'');
    c.w.history.forward();await wait(35);assert.equal(c.d.getElementById('detail').open,true);assert.equal(decodeURIComponent(c.w.location.hash.slice(7)),expected);
    c.click('closeDetail');await wait(35);assert.equal(c.d.getElementById('detail').open,false);assert.equal(c.w.location.hash,'');
  }finally{c.dom.window.close()}
});

test('closing detail via Back preserves list and timeline browsing position',async()=>{
  for(const mobile of [true,false]){
    const c=await boot({mobile});try{
      c.d.getElementById('listResults').scrollTop=2400;c.v.scrollTop=2400;c.v.scrollLeft=2000;
      c.d.querySelector('[data-detail]').click();c.click('closeDetail');await wait(35);
      assert.equal(c.d.getElementById('listResults').scrollTop,2400);assert.equal(c.v.scrollTop,2400);assert.equal(c.v.scrollLeft,2000);
    }finally{c.dom.window.close()}
  }
});

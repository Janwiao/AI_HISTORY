const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Agent product stays separate, carries preview scope and safe source link',()=>{
 const page=read('agents.html');
 assert.equal((page.match(/<article class="card"/g)||[]).length,9);
 for(const name of ['dots','Hermes Agent','OpenClaw','Jev','Codex','Claude Code','Claude Duet']) assert.ok(page.includes(name));
 assert.match(page,/id="claude-duet" data-checked-at="2026-10-26"/);
 assert.match(page,/美國 Pro／Max 使用者候補申請/);
 assert.match(page,/href="https:\/\/claude.com\/resources\/articles\/claude-duet" target="_blank" rel="noopener noreferrer"/);
});
test('changed runtime and manifest URLs use fresh cache revisions',()=>{
 const page=read('index.html');
 for(const asset of ['data.js','brand-data.js','explorer.js']) assert.ok(page.includes(`assets/${asset}?v=20261108-content1`));
 assert.ok(read('assets/explorer.js').includes('data/updates.json?v=20261108-content1'));
});


test('dots texting stays a US Pro beta product event, preserving original cards',()=>{
 const page=read('agents.html');
 assert.match(page,/data-product="openai-dots" data-checked-at="2026-10-30"/);
 assert.match(page,/2026-10-28 · Texting beta/);assert.match(page,/美國 Pro/);assert.match(page,/iMessage 或 RCS/);
 assert.match(page,/不是新模型或全球全面開放/);
 assert.equal((page.match(/<article class="card"/g)||[]).length,9);
});



test('new Agent cards are dated product events with scoped previews and safe sources',()=>{
 const {JSDOM}=require('jsdom');const dom=new JSDOM(read('agents.html'),{runScripts:'dangerously'});const d=dom.window.document;
 try{
  assert.equal(d.querySelectorAll('article.card').length,9);
  const studio=d.getElementById('mistral-studio'),muse=d.getElementById('meta-muse');
  for(const card of [studio,muse]){
   assert.equal(card.dataset.k,'agent');assert.equal(card.dataset.checkedAt,'2026-11-06');
   assert.ok(card.querySelector('time[datetime="2026-11-05"]'));
   assert.ok([...card.querySelectorAll('a')].every(a=>a.protocol==='https:'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')));
  }
  assert.match(studio.textContent,/公開預覽/);assert.match(studio.textContent,/私人預覽/);assert.match(studio.textContent,/不將公告日視為產品首次推出/);
  assert.match(muse.textContent,/美國/);assert.match(muse.textContent,/即將推出/);assert.match(muse.textContent,/不是新的基礎模型/);
  for(const filter of ['coding','decision','agent','all']){
   d.querySelector(`[data-f="${filter}"]`).click();
   for(const card of [studio,muse])assert.equal(card.hidden,!['agent','all'].includes(filter));
  }
 }finally{dom.window.close()}
});

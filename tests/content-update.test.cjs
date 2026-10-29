const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Agent product stays separate, carries preview scope and safe source link',()=>{
 const page=read('agents.html');
 assert.equal((page.match(/<article class="card"/g)||[]).length,7);
 for(const name of ['dots','Hermes Agent','OpenClaw','Jev','Codex','Claude Code','Claude Duet']) assert.ok(page.includes(name));
 assert.match(page,/id="claude-duet" data-checked-at="2026-10-26"/);
 assert.match(page,/美國 Pro／Max 使用者候補申請/);
 assert.match(page,/href="https:\/\/claude.com\/resources\/articles\/claude-duet" target="_blank" rel="noopener noreferrer"/);
});
test('changed runtime and manifest URLs use fresh cache revisions',()=>{
 const page=read('index.html');
 for(const asset of ['data.js','brand-data.js','explorer.js']) assert.ok(page.includes(`assets/${asset}?v=20261029-content1`));
 assert.ok(read('assets/explorer.js').includes('data/updates.json?v=20261029-content1'));
});


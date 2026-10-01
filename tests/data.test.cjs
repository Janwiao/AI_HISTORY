const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/data.js');
const updates = require('../data/updates.json');
test('strict UTC dates preserve month precision and reject invalid rollover', () => {
  assert.deepEqual(D.parseDate('2026-05'), { time: Date.UTC(2026,4,1), precision:'month', year:2026 });
  assert.equal(D.parseDate('2024-02-29').time, Date.UTC(2024,1,29));
  for (const date of ['2026-02-29','2026-13-01','2026-04-31','2026-00','not-a-date','2026-2-1','']) assert.equal(D.parseDate(date),null,date);
});
test('merge preserves replacement semantics and reports bad records', () => {
  const base = [{vendor:'A',model:'One',date:'2024-01'},{vendor:'B',model:'Two',date:'2026-02-30'}];
  const result = D.merge(base,[{vendor:'A',model:'One',date:'2024-01-12'},{vendor:'New',model:'Three',date:'2026-10-01'}]);
  assert.equal(result.rows.length,2); assert.equal(result.invalid.length,1); assert.equal(result.mergedCount,1);
  assert.equal(result.rows[0].isUpdated,true); assert.equal(result.rows[1].vendor,'New');
});
test('multiword search, vendor aliases, year and capability intersection', () => {
  const row = D.merge([],updates.additions).rows.find(r => r.model === 'Qwen-Image-2.1');
  assert.equal(D.matches(row,{query:'QWEN Image',brand:'Alibaba',year:'2026',type:'image'}),true);
  assert.equal(D.matches(row,{query:'阿里',type:'voice'}),false);
  assert.equal(D.matches(row,{query:'通義千問'}),true);
  assert.equal(D.matches(row,{year:'2025'}),false);
  assert.ok(!D.types({tags:'VOICE'}).includes('reasoning'));
  assert.ok(D.types({tags:'R/A/MM/OW'}).includes('reasoning'));
});
test('Qwen sources use canonical announcements and disclose Image license', () => {
  const image = updates.additions.find(r=>r.model==='Qwen-Image-2.1');
  const omni = updates.additions.find(r=>r.model==='Qwen3.8-Omni-Flash');
  assert.equal(image.sources[0],'https://qwen.ai/blog?id=qwen-image-2.1');
  assert.ok(image.sources[1].endsWith('/LICENSE')); assert.match(image.note,/商用需另行/);
  assert.equal(omni.sources[0],'https://qwen.ai/blog?id=qwen3.8-omni-flash');
  assert.equal(omni.date,'2026-09-18'); assert.equal(image.date,'2026-09-20');
});

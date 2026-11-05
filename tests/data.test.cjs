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

test('October update dates and sources are explicit; revision and product identities stay separate', () => {
  assert.equal(updates.checkedAt,'2026-11-05');
  assert.equal(updates.additions.length,35);
  assert.equal(new Set(updates.additions.map(D.key)).size,35);
  const dates = {'GPT-6.1 Terra':'2026-10-26','Claude Haiku 5.5':'2026-10-07','DeepSeek-V4.1-Flash-1017':'2026-10-17','Grok Voice 3.0':'2026-10-14','Rerank 5 Pro':'2026-10-21','Rerank 5 Fast':'2026-10-21','GLM-Legal':'2026-10-13','North Small Translate 1.0':'2026-09-09','GLM-5.3-Flash':'2026-08-27'};
  for (const [model,date] of Object.entries(dates)) {
    const row=updates.additions.find(r=>r.model===model);
    assert.equal(row.date,date); assert.ok(D.parseDate(date).time<=D.parseDate(updates.checkedAt).time);
    assert.ok(row.sources.length>0 && row.sources.every(s=>new URL(s).protocol==='https:'));
  }
  assert.ok(updates.additions.some(r=>r.model==='DeepSeek-V4.1-Flash'));
  assert.ok(!updates.additions.some(r=>r.model==='Claude Duet'));
});
test('Rerank is a retrieval ranking capability, not embedding or general generation',()=>{
  for (const row of updates.additions.filter(r=>r.tags==='RERANK')) {
    assert.deepEqual(D.types(row),['rerank']);
    assert.equal(D.matches(row,{type:'rerank'}),true);
    assert.equal(D.matches(row,{type:'embedding'}),false);
  }
  assert.ok(D.types({tags:'EMBED',category:'Embedding／檢索'}).includes('embedding'));
});


test('Genie 4 is a dated research-preview world model, not Gemini flagship',()=>{
 const row=updates.additions.find(r=>r.model==='Genie 4');
 assert.equal(row.date,'2026-10-27'); assert.equal(row.vendor,'Google');
 assert.match(row.note,/可信測試者/); assert.match(row.note,/即將推出/);
 assert.equal(row.sources[0],'https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/');
 assert.ok(D.types(row).includes('world')); assert.ok(!D.types(row).includes('general'));
 assert.equal(require('../assets/brand-data.js').family(row).id,'genie');
});

test('Carbon and Live additions preserve announcement dates and restricted rollout scope',()=>{
 const carbon=updates.additions.find(r=>r.model==='Gemini 4 Carbon');
 assert.equal(carbon.date,'2026-10-28'); assert.match(carbon.note,/部分資安防禦者/); assert.match(carbon.note,/仍待推出/);
 assert.equal(carbon.sources[0],'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/');
 for(const name of ['GPT-Live-1.1','GPT-Live-1.1 Quip']){
  const row=updates.additions.find(r=>r.model===name);
  assert.equal(row.date,'2026-10-15'); assert.ok(D.types(row).includes('voice'));
  assert.equal(row.sources[0],'https://deploymentsafety.openai.com/gpt-live-1-1/');
 }
});

test('Luna dated revision uses body date, not URL date or an invented 6.1 name',()=>{
 const row=updates.additions.find(r=>r.model==='GPT-6 Luna (October 29)');
 assert.equal(row.date,'2026-10-29'); assert.match(row.note,/ChatGPT/); assert.match(row.note,/不是 GPT-6.1 Luna/);
 assert.ok(updates.additions.some(r=>r.model==='GPT-6 Luna'&&r.date==='2026-09-22'));
 assert.equal(row.sources[0],'https://deploymentsafety.openai.com/gpt-6-luna-october-28-2026-addendum');
});

test('dated Luna revision stays in named Luna lane',()=>{assert.equal(require('../assets/brand-data.js').family({vendor:'OpenAI',model:'GPT-6 Luna (October 29)'}).id,'gpt-luna');});

test('Legal availability follow-up preserves beta date and does not infer identity or API rollout',()=>{
 const row=updates.additions.find(r=>r.model==='GLM-Legal');
 assert.equal(row.date,'2026-10-13');assert.equal(updates.additions.length,35);
 assert.match(row.note,/10\/29/);assert.match(row.note,/GLM-5.3-flashX-Legal/);
 assert.match(row.note,/未明說/);assert.match(row.note,/不推論 API 已全面開放/);
 assert.ok(row.sources.includes('https://autoclaw.z.ai/blog/model/GLM-5.3-flashX-Legal/'));
 assert.equal(updates.additions.filter(r=>/Legal/.test(r.model)).length,1);
});

test('Rosalind is a restricted research deployment, not new base weights or general successor',()=>{
 const row=updates.additions.find(r=>r.model==='GPT-6 Rosalind Research');
 assert.equal(row.date,'2026-10-30');assert.match(row.note,/相同權重/);assert.match(row.note,/有限推出/);assert.match(row.note,/不在 Chat/);
 assert.ok(D.types(row).includes('science'));assert.ok(!D.types(row).includes('general'));
 assert.equal(require('../assets/brand-data.js').family(row).id,'gpt-rosalind');
});
test('Argon retains announcement date and records later scoped availability without duplicate',()=>{
 const rows=updates.additions.filter(r=>r.model==='Gemini 4 Argon');assert.equal(rows.length,1);
 assert.equal(rows[0].date,'2026-09-30');assert.match(rows[0].note,/10\/13/);assert.match(rows[0].note,/指定/);
 assert.ok(rows[0].sources.some(s=>s.endsWith('/introducing-gemini-4-argon/')));
});

test('LongCat formal API release preserves distinct article and preview dates',()=>{
 const row=updates.additions.find(r=>r.model==='LongCat-2.5');assert.equal(row.vendor,'Meituan');assert.equal(row.date,'2026-11-02');
 assert.match(row.note,/11\/1/);assert.match(row.note,/LongCat-2.5-Preview/);assert.match(row.note,/不據此宣稱權重已開放/);
 assert.equal(updates.additions.filter(r=>r.model==='LongCat-2.5').length,1);
 assert.equal(require('../assets/brand-data.js').family(row).id,'longcat');
 assert.ok(D.types(row).includes('multimodal'));assert.ok(!row.tags.includes('OW'));
});

test('Images 2.6 keeps two named API models in the image branch',()=>{
 const B=require('../assets/brand-data.js');
 const rows=updates.additions.filter(r=>/^GPT-Image-2\.6 /.test(r.model));
 assert.equal(rows.length,2);
 for(const variant of ['Sunburst','Flare']) {
  const row=rows.find(r=>r.model===`GPT-Image-2.6 ${variant}`);
  assert.equal(row.vendor,'OpenAI');assert.equal(row.date,'2026-11-04');
  assert.deepEqual(D.types(row),['image']);assert.equal(B.family(row).id,'openai-image');
  assert.match(row.note,/不推論底層權重是否不同/);
  assert.ok(row.sources.includes(`https://developers.openai.com/api/docs/models/gpt-image-2.6-${variant.toLowerCase()}`));
 }
});
test('Cohere OpenRouter expansion preserves four original model release dates',()=>{
 for(const name of ['Embed 5 Pro','Embed 5 Fast','Rerank 5 Pro','Rerank 5 Fast']) {
  const rows=updates.additions.filter(r=>r.vendor==='Cohere'&&r.model===name);
  assert.equal(rows.length,1);const row=rows[0];
  assert.equal(row.date,name.startsWith('Embed')?'2026-09-30':'2026-10-21');
  assert.match(row.note,/11\/4/);assert.match(row.note,/OpenRouter/);assert.match(row.note,/不另計新模型/);
  assert.ok(row.sources.includes('https://docs.cohere.com/v2/changelog/embed-rerank-v5-openrouter'));
 }
});

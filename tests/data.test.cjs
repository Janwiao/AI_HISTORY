const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/data.js');
const updates = require('../data/updates.json');
test('November 8 backfill distinguishes Mistral preview from improved open-weight revision',()=>{
 const preview=updates.additions.find(r=>r.model==='Mistral Large 4');
 const release=updates.additions.find(r=>r.model==='Mistral Large 4 (October 29)');
 assert.equal(preview.vendor,'Mistral AI');assert.equal(preview.date,'2026-10-06');
 assert.equal(release.vendor,'Mistral AI');assert.equal(release.date,'2026-10-29');
 assert.ok(!D.tags(preview).includes('OW'));assert.ok(D.tags(release).includes('OW'));
 assert.match(preview.note,/公開預覽/);assert.match(preview.note,/權重仍是/);
 assert.match(release.note,/本站/);assert.match(release.note,/不是官方新型號/);
 assert.match(release.note,/Model-as-a-Service/);assert.match(release.note,/另取得商用授權/);
 assert.equal(release.sources[0],'https://mistral.ai/news/mistral-large-4-oss/');
 for(const row of [preview,release])assert.ok(D.types(row).includes('general'));
 assert.ok(!updates.additions.some(r=>r.model==='Le Chonk'||r.model==='Mistral Studio'));
});
test('EmbeddingGemma 2 is an open multimodal embedder rather than a generative or audio model',()=>{
 const row=updates.additions.find(r=>r.model==='EmbeddingGemma 2');
 assert.equal(row.vendor,'Google');assert.equal(row.date,'2026-10-06');
 assert.deepEqual(D.types(row),['multimodal','embedding']);
 assert.ok(D.tags(row).includes('OW'));assert.match(row.note,/Apache 2.0/);
 assert.match(row.note,/Model Garden.*後續計畫/);
 assert.ok(row.sources.includes('https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2'));
});
test('November 7 additions use verified announcement dates without duplicating products or Highspeed',()=>{
 const expected={'Kimi K3.1 Pro':['Moonshot AI','2026-10-24'],'SenseNova 6.8 Flash':['SenseTime','2026-11-02'],'Inkling 2 Small':['Thinking Machines Lab','2026-11-05'],'Kanana-2-v-decide':['Kakao','2026-11-06']};
 for(const [name,[vendor,date]] of Object.entries(expected)){
  const rows=updates.additions.filter(r=>r.model===name);assert.equal(rows.length,1);
  assert.equal(rows[0].vendor,vendor);assert.equal(rows[0].date,date);
  assert.ok(rows[0].sources.every(s=>new URL(s).protocol==='https:'));
 }
 assert.ok(!updates.additions.some(r=>/Highspeed|^Tinker$/.test(r.model)));
 const sense=updates.additions.find(r=>r.model==='SenseNova 6.8 Flash');
 assert.match(sense.note,/內部研發版/);assert.match(sense.sources[0],/20261103/);
});
test('Inkling and Kimi distinguish hosted availability from promised and observed weights',()=>{
 const ink=updates.additions.find(r=>r.model==='Inkling 2 Small');
 assert.ok(!D.tags(ink).includes('OW'));assert.match(ink.note,/封閉權重/);assert.match(ink.note,/計畫/);
 const kimi=updates.additions.find(r=>r.model==='Kimi K3.1 Pro');
 assert.match(kimi.note,/首次公開日期未核實/);assert.match(kimi.note,/不推論不同權重/);
 assert.ok(kimi.sources.includes('https://www.moonshot.ai/'));
});
test('Kanana decisions are multimodal classification rather than general generation or Agent product',()=>{
 const row=updates.additions.find(r=>r.model==='Kanana-2-v-decide');
 assert.deepEqual(D.types(row),['decision','multimodal']);
 assert.equal(D.matches(row,{type:'decision'}),true);assert.equal(D.matches(row,{type:'general'}),false);
 assert.match(row.note,/機率、選項或分數/);assert.match(row.note,/Jev/);
});
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
  assert.equal(updates.checkedAt,'2026-11-14');
  assert.equal(updates.additions.length,58);
  assert.equal(new Set(updates.additions.map(D.key)).size,58);
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
 assert.equal(row.date,'2026-10-13');assert.equal(updates.additions.length,58);
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

test('November 6 model additions retain exact availability and specialized branches',()=>{
 const B=require('../assets/brand-data.js');
 const cyber=updates.additions.find(r=>r.model==='GPT-6 Cyber');
 assert.equal(cyber.date,'2026-11-05');assert.equal(cyber.vendor,'OpenAI');
 assert.deepEqual(D.types(cyber),['cyber']);assert.equal(B.family(cyber).id,'gpt-cyber');
 assert.match(cyber.note,/部分已核准/);assert.match(cyber.note,/仍待推出/);assert.ok(!D.types(cyber).includes('general'));
 const omni=updates.additions.find(r=>r.model==='Gemini Omni 1.2 Flash');
 assert.equal(omni.date,'2026-11-05');assert.equal(omni.vendor,'Google');
 assert.deepEqual(D.types(omni),['video']);assert.equal(B.family(omni).id,'gemini-omni');
 assert.match(omni.note,/15 秒/);assert.match(omni.note,/一般可用/);assert.match(omni.note,/AI Ultra/);assert.match(omni.note,/分批/);
 const hy=updates.additions.find(r=>r.model==='Hy4');
 assert.equal(hy.date,'2026-11-04');assert.equal(hy.vendor,'Tencent');
 assert.equal(B.family(hy).id,'tencent-hy');assert.ok(D.types(hy).includes('multimodal'));
 assert.match(hy.note,/不據此宣稱權重已開放/);assert.match(hy.note,/Hy4 Preview/);assert.match(hy.note,/Hy4 Flash 仍是預告/);assert.ok(!hy.tags.includes('OW'));
 for(const row of [cyber,omni,hy])assert.equal(updates.additions.filter(r=>D.key(r)===D.key(row)).length,1);
 assert.ok(!updates.additions.some(r=>/Mistral Studio|Meta Muse|Hy4 Flash/.test(r.model)));
});

test('November 9 backfill uses first-party dates and keeps derivative models distinct from products',()=>{
 const expected={'Arete-27B':['Nous Research','2026-11-06'],'Ampersand v0.1':['humans&','2026-10-20'],'Ripple-65B Preview':['Ricursive Intelligence','2026-11-04']};
 for(const [model,[vendor,date]] of Object.entries(expected)){
  const rows=updates.additions.filter(r=>r.model===model);assert.equal(rows.length,1);
  assert.equal(rows[0].vendor,vendor);assert.equal(rows[0].date,date);
  assert.ok(D.types(rows[0]).includes('general'));
  assert.ok(rows[0].sources.every(s=>new URL(s).protocol==='https:'));
 }
 const arete=updates.additions.find(r=>r.model==='Arete-27B');
 assert.match(arete.note,/Qwen3.8-27B/);assert.match(arete.note,/監督式微調/);assert.match(arete.note,/開發者自述/);
 assert.ok(D.tags(arete).includes('OW'));assert.ok(!D.types(arete).includes('multimodal'));
 const amp=updates.additions.find(r=>r.model==='Ampersand v0.1');
 assert.match(amp.note,/GLM 5.3/);assert.match(amp.note,/Agents API/);assert.ok(!D.tags(amp).includes('OW'));
 const ripple=updates.additions.find(r=>r.model==='Ripple-65B Preview');
 assert.match(ripple.note,/Apache 2.0/);assert.match(ripple.note,/BF16／NVFP4.*不重複計數/);assert.match(ripple.note,/Fireworks.*計畫/);
 assert.ok(D.tags(ripple).includes('OW'));assert.ok(D.types(ripple).includes('coding'));
 assert.ok(!updates.additions.some(r=>/hermes-security|^Meta Muse$|^Agents API$/.test(r.model)));
});

test('Fable and Mythos 5.2 are dated named versions with shared underlying model and scoped access',()=>{
 const names=['Claude Fable 5.2','Claude Mythos 5.2'];
 for(const name of names){
  const rows=updates.additions.filter(r=>r.model===name);assert.equal(rows.length,1);
  const row=rows[0];assert.equal(row.vendor,'Anthropic');assert.equal(row.date,'2026-11-09');
  assert.match(row.note,/相同底層模型/);assert.match(row.note,/不代表兩組不同權重/);
  assert.match(row.note,/fast mode 不另計模型/);assert.ok(!D.tags(row).includes('OW'));
  assert.ok(row.sources.includes('https://platform.claude.com/docs/en/release-notes/overview'));
 }
 assert.match(updates.additions.find(r=>r.model===names[0]).note,/一般提供/);
 assert.match(updates.additions.find(r=>r.model===names[1]).note,/受限存取/);
 assert.ok(!updates.additions.some(r=>/5.2.*fast/i.test(r.model)));
});

test('November 11 additions use primary dates and distinguish model modalities and future Pro',()=>{
 const image=updates.additions.find(r=>r.model==='Seedream 5.5'),ember=updates.additions.find(r=>r.model==='Muse Ember 1.0');
 for(const row of [image,ember]){
  assert.equal(row.date,'2026-11-09');assert.equal(updates.additions.filter(r=>D.key(r)===D.key(row)).length,1);
  assert.ok(!D.tags(row).includes('OW'));assert.ok(row.sources.every(s=>s.startsWith('https://')));
 }
 assert.equal(image.vendor,'ByteDance');assert.deepEqual(D.types(image),['image']);assert.match(image.note,/Pro 版本將後續推出/);
 assert.ok(!updates.additions.some(r=>r.model==='Seedream 5.5 Pro'));
 assert.equal(ember.vendor,'Meta');assert.ok(D.types(ember).includes('general'));assert.ok(D.types(ember).includes('multimodal'));
 assert.ok(!D.types(ember).includes('voice'));assert.ok(!D.types(ember).includes('video'));assert.match(ember.note,/輸出文字/);
 assert.match(ember.note,/muse-ember-1.0/);
});
test('Carbon GA supplements rather than replaces initial restricted announcement',()=>{
 const rows=updates.additions.filter(r=>r.model==='Gemini 4 Carbon');assert.equal(rows.length,1);
 const r=rows[0];assert.equal(r.date,'2026-10-28');assert.match(r.note,/2026-11-10/);assert.match(r.note,/一般可用（GA）/);
 assert.match(r.note,/Ultra/);assert.match(r.note,/分批推出/);assert.match(r.note,/不把 11\/10 擴大可用另計新模型/);
 assert.ok(r.sources.includes('https://aistudio.google.com/docs/changelog'));
});

test('November 12 additions preserve primary dates, distinct modalities and preview access',()=>{
 const expected={'Qwen4-Max-Preview':['Alibaba','2026-11-11'],'Gemini Decision 1':['Google','2026-11-11'],'Scribe v3':['ElevenLabs','2026-11-10'],'Scribe v3 Live':['ElevenLabs','2026-11-10']};
 for(const [name,[vendor,date]] of Object.entries(expected)){
  const rows=updates.additions.filter(r=>r.model===name);assert.equal(rows.length,1);
  assert.equal(rows[0].vendor,vendor);assert.equal(rows[0].date,date);assert.ok(!D.tags(rows[0]).includes('OW'));
  assert.ok(rows[0].sources.length&&rows[0].sources.every(s=>new URL(s).protocol==='https:'));
 }
 const qwen=updates.additions.find(r=>r.model==='Qwen4-Max-Preview');
 assert.ok(D.types(qwen).includes('general'));assert.ok(D.types(qwen).includes('multimodal'));
 assert.ok(!D.types(qwen).includes('video'));assert.match(qwen.note,/僅限 Token Plan/);assert.match(qwen.note,/不支援按量付費/);
 assert.match(qwen.note,/11\/25 24:00（UTC\+8）/);assert.match(qwen.note,/期滿退役/);
 const decision=updates.additions.find(r=>r.model==='Gemini Decision 1');
 assert.deepEqual(D.types(decision),['decision','multimodal']);assert.match(decision.note,/Google Cloud.*後續計畫/);
 for(const name of ['Scribe v3','Scribe v3 Live']){
  const row=updates.additions.find(r=>r.model===name);assert.deepEqual(D.types(row),['voice']);assert.match(row.note,/ElevenAPI/);
 }
 assert.ok(!updates.additions.some(r=>['Decisions API','ElevenAgents','Qwen4-Max'].includes(r.model)));
});

test('Hydrogen is a November 12 GA model, not an Orchestrator product node',()=>{
 const r=updates.additions.find(r=>r.model==='Gemini 4 Hydrogen');assert.equal(r.date,'2026-11-12');assert.equal(r.vendor,'Google');
 assert.ok(D.types(r).includes('general'));assert.ok(D.types(r).includes('multimodal'));assert.ok(!D.tags(r).includes('OW'));
 assert.match(r.note,/一般可用/);assert.match(r.note,/分批推出/);assert.match(r.note,/免費用戶透過自動選模/);
 assert.equal(require('../assets/brand-data.js').family(r).id,'gemini');assert.ok(!updates.additions.some(r=>r.model==='Orchestrator'));
});

test('SOV is non-streaming ASR with primary date and open weights',()=>{const r=updates.additions.find(r=>r.model==='SOV-Transcribe-1');assert.equal(r.date,'2026-11-12');assert.deepEqual(D.types(r),['voice']);assert.ok(D.tags(r).includes('OW'));assert.match(r.note,/非串流/);assert.match(r.note,/Apache 2.0/);assert.equal(require('../assets/brand-data.js').family(r).id,'sov-transcribe-voice');});

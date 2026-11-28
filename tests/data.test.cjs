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
 assert.ok(D.tags(ink).includes('OW'));assert.match(ink.note,/11\/5.*封閉權重/);assert.match(ink.note,/11\/12.*Apache 2\.0/);
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
  assert.equal(updates.checkedAt,'2026-11-28');
  assert.equal(updates.additions.length,123);
  assert.equal(new Set(updates.additions.map(D.key)).size,123);
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


test('Genie 4 is a dated world model with a later rollout, not Gemini flagship',()=>{
 const row=updates.additions.find(r=>r.model==='Genie 4');
 assert.equal(row.date,'2026-10-27'); assert.equal(row.vendor,'Google');
 assert.match(row.note,/可信測試者/); assert.match(row.note,/11\/18.*Ultra/);assert.match(row.note,/11\/19.*Interactions API/); assert.equal(updates.additions.filter(r=>r.model==='Genie 4').length,1);
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
 assert.equal(row.date,'2026-10-13');assert.equal(updates.additions.length,123);
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
 assert.match(hy.note,/11\/20.*Instruct 權重.*Tencent Hy License 1.0/);assert.match(hy.note,/Hy4 Preview/);assert.match(hy.note,/Hy4 flash 另立節點/);assert.ok(hy.tags.includes('OW'));
 for(const row of [cyber,omni,hy])assert.equal(updates.additions.filter(r=>D.key(r)===D.key(row)).length,1);
 assert.ok(!updates.additions.some(r=>/Mistral Studio|Meta Muse/.test(r.model)));
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
 assert.match(qwen.note,/11\/25 10:00（UTC\+8）/);assert.match(qwen.note,/退場/);
 const decision=updates.additions.find(r=>r.model==='Gemini Decision 1');
 assert.deepEqual(D.types(decision),['decision','multimodal']);assert.match(decision.note,/Google Cloud.*後續計畫/);
 for(const name of ['Scribe v3','Scribe v3 Live']){
  const row=updates.additions.find(r=>r.model===name);assert.deepEqual(D.types(row),['voice']);assert.match(row.note,/ElevenAPI/);
 }
 assert.ok(!updates.additions.some(r=>['Decisions API','ElevenAgents'].includes(r.model)));
});

test('Hydrogen is a November 12 GA model, not an Orchestrator product node',()=>{
 const r=updates.additions.find(r=>r.model==='Gemini 4 Hydrogen');assert.equal(r.date,'2026-11-12');assert.equal(r.vendor,'Google');
 assert.ok(D.types(r).includes('general'));assert.ok(D.types(r).includes('multimodal'));assert.ok(!D.tags(r).includes('OW'));
 assert.match(r.note,/一般可用/);assert.match(r.note,/分批推出/);assert.match(r.note,/免費用戶透過自動選模/);
 assert.equal(require('../assets/brand-data.js').family(r).id,'gemini');assert.ok(!updates.additions.some(r=>r.model==='Orchestrator'));
});

test('SOV is non-streaming ASR with primary date and open weights',()=>{const r=updates.additions.find(r=>r.model==='SOV-Transcribe-1');assert.equal(r.date,'2026-11-12');assert.deepEqual(D.types(r),['voice']);assert.ok(D.tags(r).includes('OW'));assert.match(r.note,/非串流/);assert.match(r.note,/Apache 2.0/);assert.equal(require('../assets/brand-data.js').family(r).id,'sov-transcribe-voice');});

test('LLMON and Duo preserve preview scope and distinct dates',()=>{for(const n of [3,8]){const r=updates.additions.find(x=>x.model===`Granite-4.1-${n}B-LLMON-preview`);assert.equal(r.date,'2026-11-12');assert.match(r.note,/不是.*安全保證/);assert.ok(D.types(r).includes('general'));assert.ok(D.tags(r).includes('OW'));}for(const v of ['1.0','1.2']){const r=updates.additions.find(x=>x.model===`Duo-${v}`);assert.equal(r.date,'2026-11-13');assert.ok(D.types(r).includes('world'));assert.match(r.note,/研究預覽/);assert.match(r.note,/Duo v2.*預告/);}assert.ok(!updates.additions.some(x=>x.model==='LLMON'||x.model==='Duo-2.0'));});

test('November 17 update preserves four separate model records and weights/access evidence',()=>{
 const B=require('../assets/brand-data.js');
 for(const [vendor,model,date,family] of [
  ['Alibaba','Qwen4-Max','2026-11-16','qwen'],
  ['Baidu','ERNIE 5.5 Flash Base','2026-11-05','ernie-flash'],
  ['Baidu','ERNIE 5.5 Flash Preview','2026-11-11','ernie-flash'],
  ['MiniMax','MiniMax H3-Image','2026-11-11','minimax-h-image']
 ]){
  const rows=updates.additions.filter(r=>r.vendor===vendor&&r.model===model);
  assert.equal(rows.length,1);assert.equal(rows[0].date,date);assert.equal(B.family(rows[0]).id,family);
  assert.ok(rows[0].sources.every(s=>new URL(s).protocol==='https:'));
 }
 const get=name=>updates.additions.find(r=>r.model===name);
 const base=get('ERNIE 5.5 Flash Base'), preview=get('ERNIE 5.5 Flash Preview');
 assert.ok(D.tags(base).includes('OW'));assert.ok(D.tags(preview).includes('OW'));
 assert.match(base.note,/非|不是 Apache 2.0/);assert.match(preview.note,/千帆 API 已開放/);
 assert.match(preview.note,/後訓練權重已依 Apache 2.0 提供/);assert.ok(!D.types(preview).includes('multimodal'));
 const img=get('MiniMax H3-Image');assert.deepEqual(D.types(img),['image']);
 assert.match(img.note,/11\/10.*Community License/);assert.ok(D.tags(img).includes('OW'));
 const qwen=get('Qwen4-Max');assert.match(qwen.note,/新加坡區域／國際部署/);
 assert.ok(D.types(qwen).includes('multimodal'));assert.ok(!D.types(qwen).includes('video'));
 assert.equal(get('Qwen4-Max-Preview').date,'2026-11-11');
});

test('Nov 18 records keep separate model identities, capability lanes and first-party access dates',()=>{
 const B=require('../assets/brand-data.js');
 const expected=[
  ['OpenAI','GPT-6.2 Astra','2026-11-17','gpt-astra','general'],
  ['OpenAI','GPT-6.2 Sol','2026-11-17','gpt-sol','general'],
  ['Microsoft','MAI Code 2','2026-11-17','mai-code','coding'],
  ['Microsoft','MAI Code 2 Flash','2026-11-17','mai-code','coding'],
  ['Microsoft','MAI Image 2.7','2026-10-27','mai-image','image'],
  ['Microsoft','MAI Image 2.7 Flash','2026-11-17','mai-image','image'],
  ['Microsoft','Microsoft-Decision-1.1','2026-11-17','microsoft-decision','decision'],
  ['Liquid AI','d1.2','2026-11-16','liquid-decision','decision'],
  ['Liquid AI','d1.2-ultra','2026-11-16','liquid-decision','decision'],
 ];
 const get=name=>updates.additions.find(row=>row.model===name);
 for(const [vendor,name,date,family,type] of expected){
  const rows=updates.additions.filter(r=>r.vendor===vendor&&r.model===name);
  assert.equal(rows.length,1);const row=rows[0];
  assert.equal(row.date,date);assert.equal(B.family(row).id,family);assert.ok(D.types(row).includes(type));
  assert.ok(row.sources.length&&row.sources.every(source=>new URL(source).protocol==='https:'));
  assert.ok(!D.tags(row).includes('OW'));
  if(type==='decision') assert.deepEqual(D.types(row),['decision','multimodal']);
 }
 assert.match(get('MAI Image 2.7').note,/10\/27.*11\/17.*不視為正式版/);
 assert.match(get('MAI Code 2 Flash').note,/Copilot 已一般可用.*Foundry 則為限量存取預覽/);
 assert.match(get('GPT-6.2 Astra').note,/gpt-6\.2-astra.*ChatGPT Work 與 Codex/);
 assert.match(get('GPT-6.2 Sol').note,/Ultrafast 是執行選項/);
 assert.match(get('d1.2').note,/OpenRouter 與 Vercel 是後續計畫/);
 assert.ok(!updates.additions.some(r=>/^(?:Canvas|Copilot Fusion|Ultrafast|MAI Realtime 1)$/.test(r.model)));
});

test('Nov 19 additions distinguish API rollout, hosted release and open weights',()=>{
 const B=require('../assets/brand-data.js');
 const find=(vendor,model)=>updates.additions.find(r=>r.vendor===vendor&&r.model===model);
 const neon=find('Google','Gemini 4 Neon'), flash=find('Tencent','Hy4 flash'), rose=find('RadixArk','DaisyRose-27B');
 assert.equal(neon.date,'2026-11-18');assert.match(neon.note,/付費.*GA/);assert.equal(B.family(neon).id,'gemini');
 assert.equal(flash.date,'2026-11-16');assert.match(flash.note,/Tencent Hy License/);assert.ok(D.tags(flash).includes('OW'));assert.equal(B.family(flash).id,'tencent-hy');
 assert.equal(rose.date,'2026-11-18');assert.match(rose.note,/Qwen3\.8-27B/);assert.match(rose.note,/Apache 2\.0/);assert.equal(B.family(rose).id,'daisyrose');
});

test('Sage and Olala records distinguish capabilities and announcement, API and weight dates', () => {
  const find=(vendor,model)=>updates.additions.find(r=>r.vendor===vendor&&r.model===model);
  const sage=find('Shanghai AI Lab','Sage-S2.1-Flash');
  const mini=find('OVHcloud','Olala-v1.0-mini-7A1B');
  const mt=find('OVHcloud','Olala-v1.0-translate');
  const sum=find('OVHcloud','Olala-v1.0-summarize');
  assert.equal(sage.date,'2026-11-16');
  assert.ok(D.types(sage).includes('science'));
  assert.ok(!D.types(sage).includes('general'));
  assert.deepEqual([mini.date,mt.date,sum.date],Array(3).fill('2026-11-18'));
  assert.match(mini.note,/11\/17.*11\/18.*11\/19/);
  assert.deepEqual(D.types(mt),['translation']);
  assert.ok(D.types(sum).includes('reasoning'));
  for (const row of [sage,mini,mt,sum]) assert.ok(row.sources.every(url=>new URL(url).protocol==='https:'));
});

test('November 21 separates primary releases from API milestones and packaging',()=>{
 const pick=name=>updates.additions.find(r=>r.model===name);
 const aion=pick('Aion-1.0-Instruct-2.3B'), ideo=pick('Ideogram 4.6'), loop=pick('SenseNova-Loop-9B'), live=pick('GPT-Live-1.1');
 assert.equal(aion.date,'2026-11-19');assert.match(aion.note,/MIT.*origin trial.*開發者預覽/);
 assert.equal(ideo.date,'2026-11-19');assert.ok(D.types(ideo).includes('image'));assert.match(ideo.note,/未確認 4.6 有公開權重/);
 assert.equal(loop.date,'2026-11-17');assert.ok(D.types(loop).includes('multimodal'));assert.match(loop.note,/Apache 2.0.*同意分享帳號資訊/);
 assert.equal(live.date,'2026-10-15');assert.match(live.note,/11\/19.*gpt-live-1\.1.*不代表 Quip/);
 assert.equal(updates.additions.filter(r=>r.model.startsWith('GPT-Live-1.1')).length,2);
});

test('November 22 distinguishes released weights, video understanding, forensics, and avatar generation', () => {
 const pick=m=>updates.additions.find(r=>r.model===m);
 const mini=pick('Inkling 2 Mini');
 assert.equal(mini.date,'2026-11-20');
 assert.deepEqual(D.tags(mini),['R','A','MM','OW']);
 assert.match(mini.note,/26\.4B.*3\.4B.*5\.4B/);
 const family=updates.additions.filter(r=>r.model.startsWith('WeMM-Video-'));
 assert.deepEqual(family.map(r=>r.model),['WeMM-Video-2B','WeMM-Video-4B','WeMM-Video-9B','WeMM-Video-35B-A3B']);
 for(const r of family){
  assert.equal(r.date,'2026-11-20');
  assert.match(r.note,/不生成影片/);
  assert.equal(D.matches(r,{type:'multimodal'}),true);
  assert.equal(D.matches(r,{type:'video'}),false);
 }
 const forensics=pick('WeVisForensics'), avatar=pick('LongCat-Video-Avatar 1.6');
 assert.equal(forensics.date,'2026-11-19');
 assert.match(forensics.note,/五個角色 LoRA.*不是完整獨立基座權重/);
 assert.equal(avatar.date,'2026-11-13');
 assert.match(avatar.note,/模型卡標 MIT/);
 assert.equal(D.matches(avatar,{type:'video'}),true);
});

test('November 23 keeps model releases distinct from hosting and weights milestones',()=>{
 const row=(vendor,model)=>updates.additions.find(r=>r.vendor===vendor&&r.model===model);
 const mac=row('Mind Lab','Macaron-V1.1');
 assert.equal(mac.date,'2026-09-22'); assert.ok(D.tags(mac).includes('OW')); assert.ok(!D.types(mac).includes('multimodal'));
 assert.match(mac.note,/11\/16.*11\/20.*未驗證 Pro 另有獨立權重/);
 for(const model of ['bison-1','groundhog-1']){
   const decision=row('Baseten',model);assert.equal(decision.date,'2026-11-20');
   assert.deepEqual(D.types(decision),['decision','multimodal']);assert.ok(D.tags(decision).includes('OW'));
 }
 const flash=row('Reson8','Rumble-2-Flash'),full=row('Reson8','Rumble-2');
 assert.equal(flash.date,'2026-11-03');assert.match(flash.note,/11\/18.*Apache 2\.0/);
 assert.equal(full.date,'2026-11-10');assert.ok(!D.tags(full).includes('OW'));
 assert.ok(D.types(flash).includes('voice')&&D.types(full).includes('voice'));
 assert.equal(updates.additions.filter(r=>/Venti/.test(r.model)).length,0);
});

test('Nov 24 distinguishes public access, regional/product rollout and native modalities',()=>{
 const B=require('../assets/brand-data.js');
 const up=updates.additions;
 const by=m=>up.find(r=>r.model===m);
 const glm=by('GLM-5.4'), sol=by('GPT-6.2 Sol');
 assert.equal(glm.date,'2026-11-23');assert.match(glm.note,/公共 API 尚未推出/);assert.ok(!D.tags(glm).includes('OW'));
 assert.equal(sol.date,'2026-11-17');assert.match(sol.note,/11\/23.*Chat 分頁.*不改 Work／Codex 模型/);
 for(const m of ['LingSante-3.1-flash','LingSante-3.1-air-VL']){
   const r=by(m);assert.equal(r.date,'2026-11-23');assert.ok(D.types(r).includes('science'));assert.ok(D.tags(r).includes('OW'));assert.equal(B.family(r).id,'lingsante');
 }
 assert.ok(!D.types(by('LingSante-3.1-flash')).includes('multimodal'));
 assert.ok(D.types(by('LingSante-3.1-air-VL')).includes('multimodal'));
 assert.equal(B.family(by('Ming-3.0-tts-0.5B')).id,'ming-tts-voice');
 for(const r of up.filter(x=>/^WePocketModel|^WeMM-Ecom/.test(x.model))){
   assert.equal(r.date,'2026-11-23');assert.ok(D.tags(r).includes('OW'));assert.ok(!D.types(r).includes('video'));
   assert.equal(B.family(r).id,r.model.startsWith('WePocket')?'wepocket':'wemm-ecom');
 }
 assert.equal(up.filter(x=>/^WePocketModel|^WeMM-Ecom/.test(x.model)).length,7);
});

test('Nov 25 adds distinct Hy-MT3 sizes and U1.6 image model without counting formats',()=>{
 const B=require('../assets/brand-data.js');
 const group=updates.additions.filter(r=>r.model.startsWith('Hy-MT3-'));
 assert.deepEqual(group.map(r=>r.model),['Hy-MT3-1.8B','Hy-MT3-7B','Hy-MT3-30B-A3B']);
 for(const r of group){
  assert.equal(r.vendor,'Tencent');assert.equal(r.date,'2026-11-24');
  assert.deepEqual(D.types(r),['translation']);assert.equal(B.family(r).id,'hy-mt-translation');
  assert.ok(D.tags(r).includes('OW'));assert.match(r.note,/Apache 2.0/);
 }
 const images=updates.additions.filter(r=>r.model.startsWith('SenseNova-U1.6'));
 assert.equal(images.length,1);
 assert.equal(images[0].date,'2026-11-24');
 assert.ok(D.types(images[0]).includes('image'));assert.equal(B.family(images[0]).id,'sensenova-u-image');
});

test('Alibaba stable decision model is a specialist; retired Qwen preview preserves the original date',()=>{
 const manifest=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../data/updates.json'),'utf8'));
 const stable=manifest.additions.filter(row=>row.vendor==='Alibaba'&&row.model==='decision-model');
 assert.equal(stable.length,1);
 assert.equal(stable[0].date,'2026-11-25');
 assert.match(stable[0].tags,/DECISION/);
 assert.match(stable[0].note,/新加坡/);
 assert.match(stable[0].note,/不等於通用結構化輸出/);
 const preview=manifest.additions.find(row=>row.model==='Qwen4-Max-Preview');
 assert.equal(preview.date,'2026-11-11');
 assert.match(preview.note,/11\/25 10:00（UTC\+8）退場/);
 assert.match(preview.note,/轉送 qwen4-max/);
 assert.equal(manifest.additions.find(row=>row.model==='Qwen4-Max').date,'2026-11-16');
 assert.ok(!manifest.additions.some(row=>/Jules|Antigravity/i.test(row.model)));
});

test('November 28 adds two image models and leaves the separate Layer preview out of the model count',()=>{
 const manifest=require('../data/updates.json');
 const niji=manifest.additions.filter(row=>row.model==='Niji 8');
 const ming=manifest.additions.filter(row=>row.model==='Ming-Image-0.2-Design');
 assert.equal(niji.length,1);assert.equal(ming.length,1);
 assert.deepEqual([niji[0].date,ming[0].date],['2026-11-24','2026-11-26']);
 assert.equal(niji[0].tags,'IMAGE');assert.equal(ming[0].tags,'IMAGE/OW');
 assert.match(niji[0].note,/Discord/);assert.match(ming[0].note,/MIT/);
 assert.ok(!manifest.additions.some(row=>row.model==='Ming-Image-0.2-Design-Layer'));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const D = require('../assets/data.js');
const B = require('../assets/brand-data.js');
const updates = require('../data/updates.json');

// The archived snapshot has simple text-only SVG labels. Keep this fixture
// reader dependency-free; the application uses DOMParser for the actual file.
function baseline() {
  const html = fs.readFileSync(path.join(__dirname, '../archive/2026-10-01-base.html'), 'utf8');
  const decode = text => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const out = [];
  let vendor;
  for (const match of html.matchAll(/<text\b[^>]*class="vendor"[^>]*>([^<]*)<\/text>|<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
    if (match[1] !== undefined) { vendor = decode(match[1]).trim(); continue; }
    const read = type => new RegExp(`<text\\b[^>]*class="${type}"[^>]*>([^<]*)<\\/text>`).exec(match[2]);
    const model = read('model'), date = read('date'), tags = read('tag');
    if (vendor && model && date) out.push({ vendor, model: decode(model[1]).trim(), date: date[1].trim(), tags: tags ? tags[1].trim() : '', category: '歷史節點' });
  }
  return out;
}
const records = D.merge(baseline(), updates.additions).rows;
const classify = (vendor, model, extra = {}) => B.family({ vendor, model, ...extra });

test('UMD exposes the same small API in a browser without dependencies', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/brand-data.js'), 'utf8'), context);
  assert.equal(typeof context.window.BrandEvolutionData.family, 'function');
  assert.equal(typeof context.window.BrandEvolutionData.group, 'function');
  assert.equal(context.window.BrandEvolutionData.family({ vendor: 'OpenAI', model: 'GPT-4' }).id, 'gpt');
});

test('all 227 merged nodes are retained exactly once with no product injection', () => {
  assert.equal(baseline().length, 208);
  assert.equal(records.length, 227);
  assert.equal(new Set(records.map(D.key)).size, 227);
  const all = [];
  for (const vendor of new Set(records.map(row => row.vendor))) {
    const lanes = B.group(records, vendor);
    assert.ok(lanes.length > 0, vendor);
    assert.equal(new Set(lanes.map(lane => lane.id)).size, lanes.length, vendor);
    assert.ok(lanes.every(lane => lane.rows.length > 0), vendor);
    all.push(...lanes.flatMap(lane => lane.rows));
  }
  assert.equal(all.length, records.length);
  assert.equal(new Set(all).size, records.length);
  assert.deepEqual(all.map(D.key).sort(), records.map(D.key).sort());
  assert.ok(all.every(row => records.includes(row)));
  assert.ok(!all.some(row => /^(dots?|ChatGPT|Codex CLI|Agents? & Tools)$/i.test(row.model)));
});

test('OpenAI GPT, each o-series, Codex, Live, and named GPT branches stay separate', () => {
  const expected = {
    'GPT-4': 'gpt', 'GPT-4o': 'gpt', 'GPT-4.1 mini': 'gpt', 'GPT-5.3 Instant': 'gpt',
    'o1': 'o1', 'o1-preview': 'o1', 'o1-mini': 'o1', 'o3': 'o3', 'o3-mini': 'o3', 'o4-mini': 'o4',
    'GPT-5-Codex': 'codex', 'GPT-5.1-Codex-Max': 'codex', 'GPT-5.3-Codex': 'codex',
    'GPT-Live-1': 'gpt-live', 'GPT-5.6 Sol Preview': 'gpt-sol', 'GPT-5.6 Sol': 'gpt-sol',
    'GPT-6 Sol': 'gpt-sol', 'GPT-6.1 Sol': 'gpt-sol', 'GPT-5.6 Luna': 'gpt-luna',
    'GPT-6 Luna': 'gpt-luna', 'GPT-5.6 Terra': 'gpt-terra', 'GPT-6 Astra': 'gpt-astra'
  };
  for (const [model, id] of Object.entries(expected)) assert.equal(classify('OpenAI', model).id, id, model);
  assert.equal(classify('OpenAI', 'GPT-5', { tags: 'R/A/MM', category: '通用／程式／Agent' }).id, 'gpt');
  assert.equal(classify('OpenAI', 'GPT-Live-1', { category: '即時語音／全雙工' }).id, 'gpt-live');
});

test('explicit image, voice, embedding, and translation names keep their own lanes', () => {
  const examples = [
    ['Alibaba', 'Qwen-Image-2.1', 'qwen-image'],
    ['Alibaba', 'Qwen3.8-LiveTranslate', 'qwen-translation'],
    ['Alibaba', 'Qwen3.8-Omni-Flash', 'qwen-omni'],
    ['Google', 'Gemini 3.8 Flash TTS', 'gemini-tts'],
    ['Google', 'Gemini 3.8 Flash-Lite TTS', 'gemini-tts'],
    ['Google', 'Gemini 3.8 Live with Live Avatar', 'gemini-live'],
    ['Cohere', 'Command A Translate', 'cohere-translation'],
    ['Cohere', 'North Small Translate 1.0', 'cohere-translation'],
    ['Cohere', 'Embed 5 Pro', 'cohere-embedding'],
    ['Cohere', 'Embed 5 Fast', 'cohere-embedding']
  ];
  for (const [vendor, model, id] of examples) assert.equal(classify(vendor, model).id, id, model);
  // An explicitly named translation branch wins over its voice category.
  assert.equal(classify('Alibaba', 'Qwen3.8-LiveTranslate', { category: '即時翻譯／語音' }).id, 'qwen-translation');
  assert.equal(classify('OpenAI', 'GPT-4o', { category: '語音' }).id, 'gpt-voice');
  assert.equal(classify('Google', 'Gemini 3.8 Flash', { category: '影像生成' }).id, 'gemini-image');
});

test('unknown names and vendors use a retained fallback without cross-vendor guessing', () => {
  for (const row of [
    { vendor: 'Unknown', model: 'GPT-4', category: '語音' },
    { vendor: 'OpenAI', model: 'Mystery', category: '影像生成' },
    { vendor: 'Anthropic', model: 'GPT-4' },
    { vendor: 'OpenAI partner', model: 'GPT-4' },
    { vendor: 'constructor', model: 'GPT-4' },
    { vendor: 'OpenAI', model: 'ChatGPT' },
    { vendor: 'OpenAI', model: 'Codex CLI' },
    { vendor: 'OpenAI', model: 'dots' },
    { vendor: 'OpenAI', model: 'GPT-4 + unrelated product' },
    {}
  ]) assert.deepEqual(B.family(row), { id: 'other', label: '其他／未分類' });
  const row = { vendor: 'OpenAI', model: 'Mystery', time: 123 };
  assert.strictEqual(B.group([row], 'OpenAI')[0].rows[0], row);
  assert.deepEqual(B.group([row], 'Missing'), []);
  assert.deepEqual(B.group([], 'OpenAI'), []);
});

test('group does not mutate rows, preserves month precision, and sorts ties stably', () => {
  const time = Date.UTC(2026, 4, 1);
  const a = Object.freeze({ vendor: 'OpenAI', model: 'GPT-4', time, date: '2026-05', precision: 'month', mark: 'first' });
  const b = Object.freeze({ vendor: 'OpenAI', model: 'GPT-4', time, date: '2026-05-01', precision: 'day', mark: 'second' });
  const z = Object.freeze({ vendor: 'OpenAI', model: 'GPT-5', time, date: '2026-05-01', precision: 'day' });
  const early = Object.freeze({ vendor: 'OpenAI', model: 'GPT-5.5', time: time - 1 });
  const input = Object.freeze([z, a, early, b]);
  const grouped = B.group(input, 'OpenAI');
  assert.deepEqual(grouped[0].rows, [early, a, b, z]);
  assert.deepEqual(input, [z, a, early, b]);
  assert.equal(grouped[0].rows[1].precision, 'month');
  assert.equal(grouped[0].rows[1].date, '2026-05');
  assert.notStrictEqual(grouped[0].rows, input);
  grouped[0].rows.pop();
  assert.equal(input.length, 4);
});

test('every archived and updated model has an explicit name-based grouping', () => {
  assert.deepEqual(records.filter(row => B.family(row).id === 'other').map(D.key), []);
  for (const vendor of new Set(records.map(row => row.vendor))) {
    for (const lane of B.group(records, vendor)) {
      assert.deepEqual(lane.rows, lane.rows.slice().sort((a, b) => a.time - b.time || a.model.localeCompare(b.model)));
    }
  }
});

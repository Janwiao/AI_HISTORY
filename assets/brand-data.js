/* Name-based lanes for the brand view. These are display groups, not verified
   ancestry, upgrade paths, or capability claims. Unknown records are retained. */
(function (root) {
  'use strict';
  const OTHER = { id: 'other', label: '其他／未分類' };
  const rule = (id, label, pattern) => ({ id, label, pattern });
  const catalogs = new Map([
    ['OpenAI', [
      rule('gpt', 'GPT', /^GPT-\d+(?:\.\d+)*(?:o)?(?: (?:Turbo|mini|nano|Instant))?$/i),
      rule('o1', 'o1', /^o1(?:[- ](?:mini|preview|pro))?$/i),
      rule('o3', 'o3', /^o3(?:[- ](?:mini|preview|pro))?$/i),
      rule('o4', 'o4', /^o4(?:[- ](?:mini|preview|pro))?$/i),
      rule('codex', 'Codex 模型', /^(?:GPT-\d+(?:\.\d+)*-Codex(?:-[a-z\d]+)*|codex-mini(?:-latest)?)$/i),
      rule('gpt-sol', 'GPT Sol', /^GPT-\d+(?:\.\d+)* Sol(?: Preview)?$/i),
      rule('gpt-luna', 'GPT Luna', /^GPT-\d+(?:\.\d+)* Luna(?: Preview)?$/i),
      rule('gpt-terra', 'GPT Terra', /^GPT-\d+(?:\.\d+)* Terra(?: Preview)?$/i),
      rule('gpt-astra', 'GPT Astra', /^GPT-\d+(?:\.\d+)* Astra(?: Preview)?$/i),
      rule('gpt-live', 'GPT-Live', /^GPT-Live-\d+(?:\.\d+)*(?:[- ][a-z\d]+)*$/i),
      rule('openai-image', '影像模型', /^(?:GPT-Image-\d+(?:\.\d+)*(?:[- ][a-z\d]+)*|DALL[·-]E[- ]\d+)$/i),
      rule('openai-voice', '語音模型', /^(?:whisper-\d+|tts-\d+(?:-hd)?|GPT-(?:Realtime|Audio)(?:[- ][a-z\d.]+)*|GPT-\d+(?:\.\d+)*o-(?:audio|realtime|transcribe|tts)(?:[- ][a-z\d]+)*)$/i),
      rule('openai-embedding', 'Embedding 模型', /^text-embedding-[a-z\d-]+$/i)
    ]],
    ['Anthropic', [
      rule('claude-opus', 'Claude Opus', /^Claude (?:\d+(?:\.\d+)* )?Opus(?: \d+(?:\.\d+)*)?(?: \(New\))?$/i),
      rule('claude-sonnet', 'Claude Sonnet', /^Claude (?:\d+(?:\.\d+)* )?Sonnet(?: \d+(?:\.\d+)*)?(?: \(New\))?$/i),
      rule('claude-haiku', 'Claude Haiku', /^Claude (?:\d+(?:\.\d+)* )?Haiku(?: \d+(?:\.\d+)*)?(?: \(New\))?$/i),
      rule('claude-fable', 'Claude Fable', /^Claude Fable \d+(?:\.\d+)*$/i),
      rule('claude-mythos', 'Claude Mythos', /^Claude Mythos \d+(?:\.\d+)*$/i)
    ]],
    ['Google', [
      rule('gemini-tts', 'Gemini TTS', /^Gemini \d+(?:\.\d+)* Flash(?:-Lite)? TTS$/i),
      rule('gemini-live', 'Gemini Live', /^Gemini \d+(?:\.\d+)* Live(?: with Live Avatar)?$/i),
      rule('gemini', 'Gemini', /^Gemini (?:\d+(?:\.\d+)*(?: [a-z\d-]+)*|Omni Flash)$/i),
      rule('gemma', 'Gemma', /^Gemma \d+(?:\.\d+)*(?: [a-z\d-]+)*$/i),
      rule('google-image', 'Imagen', /^Imagen \d+(?:\.\d+)*(?: [a-z\d-]+)*$/i)
    ]],
    ['xAI', [rule('grok', 'Grok', /^Grok(?:[- ]\d+(?:\.\d+)*V?(?: [a-z\d ()-]+)*| Beta)$/i)]],
    ['DeepSeek', [
      rule('deepseek-coder', 'DeepSeek Coder', /^DeepSeek-Coder-V\d+(?:\.\d+)*(?:[- ][a-z\d]+)*$/i),
      rule('deepseek-r', 'DeepSeek R', /^DeepSeek-R\d+(?:\.\d+)*(?:[- ][a-z\d]+)*$/i),
      rule('deepseek-v', 'DeepSeek V', /^DeepSeek-V\d+(?:\.\d+)*(?:[- ][a-z\d]+)*$/i)
    ]],
    ['Moonshot AI', [rule('kimi', 'Kimi', /^Kimi(?:[- ]K\d+(?:\.\d+)*(?: [a-z\d]+)*|-thinking-preview)$/i)]],
    ['Alibaba', [
      rule('qwen-image', 'Qwen Image', /^Qwen-Image(?:[- ][a-z\d.]+)*$/i),
      rule('qwen-translation', 'Qwen 翻譯', /^Qwen\d+(?:\.\d+)*-LiveTranslate(?:[- ][a-z\d]+)*$/i),
      rule('qwen-voice', 'Qwen 語音', /^Qwen\d+(?:\.\d+)*-(?:TTS|ASR)(?:[- ][a-z\d.]+)*$/i),
      rule('qwen-embedding', 'Qwen Embedding', /^Qwen\d+(?:\.\d+)*-Embedding(?:[- ][a-z\d.]+)*$/i),
      rule('qwen-omni', 'Qwen Omni', /^Qwen\d+(?:\.\d+)*-Omni(?:[- ][a-z\d]+)*$/i),
      rule('qwen-vl', 'Qwen VL', /^Qwen\d+(?:\.\d+)*-VL(?:[- ][a-z\d]+)*$/i),
      rule('qwq', 'QwQ', /^QwQ-\d+B(?:-Preview)?$/i),
      rule('qwen', 'Qwen', /^Qwen\d+(?:\.\d+)*(?:[- ][a-z\d.]+)*$/i)
    ]],
    ['Z.ai / Zhipu', [rule('glm', 'GLM', /^GLM-\d+(?:\.\d+)*V?(?:[- ][a-z\d]+)*$/i)]],
    ['MiniMax', [rule('minimax-m', 'MiniMax M', /^MiniMax M\d+(?:\.\d+)*$/i)]],
    ['Meta', [rule('llama', 'Llama', /^Llama \d+(?:\.\d+)*(?: [a-z\d]+)*$/i)]],
    ['Mistral AI', [
      rule('mistral', 'Mistral', /^Mistral (?:\d+B|Large|Medium|Small)(?: \d+(?:\.\d+)*)?$/i),
      rule('mixtral', 'Mixtral', /^Mixtral \d+x\d+B$/i),
      rule('magistral', 'Magistral', /^Magistral(?: [a-z\d.]+)*$/i)
    ]],
    ['Cohere', [
      rule('cohere-translation', '翻譯模型', /^(?:Command A Translate|North Small Translate \d+(?:\.\d+)*)$/i),
      rule('cohere-embedding', 'Embed', /^Embed \d+(?:\.\d+)*(?: (?:Pro|Fast))?$/i),
      rule('command', 'Command', /^Command (?:R\+?|A\+?)(?: (?:Vision|Reasoning))?$/i),
      rule('north-code', 'North Code', /^North Mini Code$/i)
    ]],
    ['AI21 Labs', [rule('jamba', 'Jamba', /^Jamba(?:\d+)?(?:[- ][a-z\d.]+)*$/i)]],
    ['Perplexity', [rule('sonar', 'Sonar', /^Sonar(?: (?:Pro|API|Deep|Research|Reasoning))*$/i)]],
    ['NVIDIA', [rule('nemotron', 'Nemotron', /^(?:Llama Nemotron Reasoning Family|Llama-\d+(?:\.\d+)*-Nemotron-[a-z\d-]+|Nemotron \d+(?:\.\d+)*(?: [a-z\d]+)*)$/i)]],
    ['Amazon', [rule('nova', 'Amazon Nova', /^Amazon Nova (?:Micro \/ Lite \/ Pro|Premier)$/i)]],
    ['Microsoft', [rule('phi', 'Phi', /^Phi-\d+(?:\.\d+)*(?:-reasoning(?:-vision| \/ reasoning-plus)?)?$/i)]],
    ['Baidu', [rule('ernie', 'ERNIE', /^ERNIE (?:\d+(?:\.\d+)*(?: Open-source Family)?|X\d+)$/i)]],
    ['ByteDance', [rule('seed', 'Seed', /^Seed\d+(?:\.\d+)*(?:-VL)?$/i)]]
  ]);
  // Only explicit specialized categories may split an otherwise recognized name.
  // General, reasoning, coding, and multimodal tags never imply a family.
  const specialties = [
    rule('translation', '翻譯（依原始類別）', /翻譯|translation|translate/i),
    rule('embedding', 'Embedding（依原始類別）', /embedding|向量嵌入/i),
    rule('image', '影像（依原始類別）', /影像生成|影像編輯|圖像生成|圖像編輯|image generation|image editing/i),
    rule('voice', '語音（依原始類別）', /語音|音訊|text.to.speech|speech|audio/i)
  ];
  const specializedIds = new Set([
    'gpt-live', 'openai-image', 'openai-voice', 'openai-embedding', 'gemini-tts',
    'gemini-live', 'google-image', 'qwen-image', 'qwen-translation', 'qwen-voice',
    'qwen-embedding', 'cohere-translation', 'cohere-embedding'
  ]);
  function resolve(row) {
    const rules = catalogs.get(row && row.vendor);
    if (!rules) return OTHER;
    const name = String(row.model || '').trim();
    const match = rules.find(item => item.pattern.test(name));
    if (!match) return OTHER;
    if (specializedIds.has(match.id)) return match;
    const specialty = specialties.find(item => item.pattern.test(String(row.category || '')));
    return specialty ? { id: `${match.id}-${specialty.id}`, label: specialty.label } : match;
  }
  function family(row) {
    const { id, label } = resolve(row);
    return { id, label };
  }
  function group(rows, vendor) {
    const lanes = new Map();
    // Copy before sorting; the caller's row objects and array remain untouched.
    const selected = rows.map((row, index) => ({ row, index }))
      .filter(item => vendor == null || item.row.vendor === vendor)
      .sort((a, b) => {
        const at = Number.isFinite(a.row.time) ? a.row.time : Infinity;
        const bt = Number.isFinite(b.row.time) ? b.row.time : Infinity;
        return (at === bt ? 0 : at - bt) || String(a.row.model || '').localeCompare(String(b.row.model || '')) || a.index - b.index;
      });
    for (const { row } of selected) {
      const descriptor = family(row);
      if (!lanes.has(descriptor.id)) lanes.set(descriptor.id, { ...descriptor, rows: [] });
      lanes.get(descriptor.id).rows.push(row);
    }
    const order = (catalogs.get(vendor) || []).flatMap(item => [item.id, ...specialties.map(specialty => `${item.id}-${specialty.id}`)]);
    const rank = id => id === OTHER.id ? Infinity : order.includes(id) ? order.indexOf(id) : order.length;
    return [...lanes.values()].sort((a, b) => {
      const ar = rank(a.id), br = rank(b.id);
      return ar === br ? 0 : ar - br;
    });
  }
  const api = { family, group };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BrandEvolutionData = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Shared, dependency-free data rules. Dates are UTC; month-only dates stay month-only. */
(function (root) {
  'use strict';
  const key = row => `${row.vendor}|${row.model}`;
  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value || '');
    if (!match) return null;
    const year = +match[1], month = +match[2], day = +(match[3] || 1);
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { time, precision: match[3] ? 'day' : 'month', year };
  }
  function tags(row) { return String(row.tags || '').split(/[\s/·,]+/).filter(Boolean); }
  function types(row) {
    const t = tags(row), c = row.category || '';
    const found = [];
    if (t.includes('R') || /推理/.test(c)) found.push('reasoning');
    if (t.includes('A') || /程式|Coding|Agent/i.test(c)) found.push('coding');
    if (t.includes('MM') || /多模態|全模態/.test(c)) found.push('multimodal');
    if (t.includes('VOICE') || /語音|音訊/.test(c)) found.push('voice');
    if (t.includes('IMAGE') || /影像生成|影像編輯/.test(c)) found.push('image');
    if (t.includes('EMBED') || /Embedding|檢索/i.test(c)) found.push('embedding');
    if (t.includes('MT') || /翻譯/.test(c)) found.push('translation');
    if (!found.some(x => ['voice','image','embedding','translation'].includes(x))) found.push('general');
    return found;
  }
  const labels = { general: '通用模型', reasoning: '推理', coding: '程式／Agent 能力', multimodal: '多模態', voice: '語音', image: '影像', embedding: 'Embedding', translation: '翻譯' };
  function category(row) {
    return row.category && row.category !== '歷史節點' ? row.category : types(row).filter(x => x !== 'general').map(x => labels[x]).join('／') || '通用模型';
  }
  function merge(base, additions) {
    const map = new Map(base.map(row => [key(row), { ...row, isUpdated: false }]));
    additions.forEach(row => map.set(key(row), { ...row, isUpdated: true }));
    const invalid = [], rows = [];
    for (const row of map.values()) {
      const parsed = parseDate(row.date);
      if (!parsed) invalid.push(row);
      else rows.push({ ...row, time: parsed.time, precision: parsed.precision, year: parsed.year });
    }
    rows.sort((a, b) => a.time - b.time || a.model.localeCompare(b.model));
    return { rows, invalid, mergedCount: base.length + additions.length - map.size };
  }
  function matches(row, filters) {
    const haystack = `${row.vendor} ${row.vendor === 'Alibaba' ? 'Qwen 阿里 通義千問' : ''} ${row.vendor === 'xAI' ? 'Grok' : ''} ${row.model} ${row.category || ''} ${row.note || ''} ${row.tags || ''} ${types(row).map(type => labels[type]).join(' ')} ${category(row)}`.toLocaleLowerCase().normalize('NFKC');
    const words = (filters.query || '').toLocaleLowerCase().normalize('NFKC').trim().split(/\s+/).filter(Boolean);
    return words.every(word => haystack.includes(word)) && (!filters.brand || row.vendor === filters.brand) && (!filters.year || String(row.year) === filters.year) && (!filters.type || types(row).includes(filters.type));
  }
  const api = { key, parseDate, tags, types, labels, category, merge, matches };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TimelineData = api;
})(typeof window !== 'undefined' ? window : globalThis);

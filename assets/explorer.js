'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const D = window.TimelineData, viewer = $('viewer'), stage = $('stage'), sizer = $('sizer');
  const overviewMagnifier = window.OverviewMagnifier?.create({ viewer, stage, controls: document.querySelector('.zoom-controls') });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const mobile = () => matchMedia('(max-width:760px)').matches;
  let manifest, rows = [], shown = [], brands = [], positions = new Map(), width = 12080, height = 5400, scale = 1;
  let ready = false, mode = mobile() ? 'list' : 'timeline', currentDetail = null, opener = null, searchTimer, toastTimer;
  const filters = { query: '', brand: '', year: '', type: '' };
  const formatBrand = brand => brand === 'Alibaba' ? 'Alibaba / Qwen' : brand === 'xAI' ? 'xAI / Grok' : brand;
  const dateLabel = row => row.date + (row.precision === 'month' ? '（月份）' : '');
  function parseBaseline(text) {
    const doc = new DOMParser().parseFromString(text, 'text/html'), svg = doc.querySelector('svg');
    if (!svg) throw Error('歷史底稿缺少 SVG');
    brands = [...svg.querySelectorAll('text.vendor')].map(el => ({
      name: el.textContent.trim(), top: +el.getAttribute('y') - 64,
      symbol: el.previousElementSibling?.textContent || '•',
      color: el.previousElementSibling?.previousElementSibling?.getAttribute('fill') || '#526589'
    }));
    return [...svg.querySelectorAll('a')].flatMap(anchor => {
      const box = anchor.querySelector('rect'), name = anchor.querySelector('text.model'), date = anchor.querySelector('text.date');
      if (!box || !name || !date) return [];
      const brand = [...brands].reverse().find(item => item.top <= +box.getAttribute('y'));
      if (!brand) throw Error('歷史節點找不到品牌');
      return [{ vendor: brand.name, model: name.textContent.trim(), date: date.textContent.trim(),
        tags: anchor.querySelector('text.tag')?.textContent.trim() || '', category: '歷史節點',
        note: '沿用 2026-10-01 更新前網站底稿；日期、規格與來源尚未逐筆重新查核。', sources: [anchor.getAttribute('href')].filter(Boolean) }];
    });
  }
  function readUrl() {
    const query = new URL(location.href).searchParams;
    filters.query = query.get('q') || '';
    filters.brand = brands.some(b => b.name === query.get('brand')) ? query.get('brand') : '';
    filters.year = rows.some(r => String(r.year) === query.get('year')) ? query.get('year') : '';
    filters.type = D.labels[query.get('type')] ? query.get('type') : '';
    mode = ['timeline','list'].includes(query.get('view')) ? query.get('view') : mobile() ? 'list' : 'timeline';
    $('search').value = filters.query;
    $('brandJump').value = filters.brand;
    $('yearFilter').value = filters.year;
    $('typeFilter').value = filters.type;
  }
  function writeUrl(push = false) {
    const url = new URL(location.href);
    for (const [field, param] of [['query','q'],['brand','brand'],['year','year'],['type','type']]) {
      if (filters[field]) url.searchParams.set(param, filters[field]); else url.searchParams.delete(param);
    }
    url.searchParams.set('view', mode);
    const path = url.pathname + url.search + url.hash;
    if (path !== location.pathname + location.search + location.hash) history[push ? 'pushState' : 'replaceState']({}, '', path);
  }
  function syncToolbar() { document.documentElement.style.setProperty('--bar', Math.ceil($('toolbar').getBoundingClientRect().height) + 'px'); }
  if ('ResizeObserver' in window) new ResizeObserver(syncToolbar).observe($('toolbar'));
  window.addEventListener('resize', syncToolbar);
  syncToolbar();

  function renderTimeline() {
    overviewMagnifier?.setOverview(false);
    positions = new Map();
    const activeBrands = brands.filter(b => shown.some(r => r.vendor === b.name));
    const startYear = filters.year ? +filters.year : Math.min(2023, ...shown.map(r => r.year));
    const start = Date.UTC(startYear, 0, 1);
    const end = filters.year ? Date.UTC(startYear + 1, 0, 1) : Math.max(D.parseDate(manifest.checkedAt).time, ...shown.map(r => r.time)) + 21 * 86400000;
    const left = 90, span = Math.max(2300, (end - start) / 86400000 * 8), padding = 200;
    width = left + span + padding;
    const xOf = row => left + (row.time - start) / (end - start) * span;
    let y = 105;
    for (const brand of activeBrands) {
      brand.rows = shown.filter(r => r.vendor === brand.name);
      const ends = [];
      for (const row of brand.rows) {
        const w = Math.max(244, Math.min(440, 44 + row.model.length * 9.4));
        const x = xOf(row), bx = Math.max(left, Math.min(x - w / 2, width - w - 35));
        let tier = ends.findIndex(edge => edge + 18 < bx);
        if (tier < 0) tier = ends.length;
        ends[tier] = bx + w;
        positions.set(D.key(row), { x, bx, w, tier });
      }
      brand.top = y;
      brand.height = 106 + Math.max(1, ends.length) * 94;
      brand.base = y + brand.height - 27;
      for (const row of brand.rows) {
        const p = positions.get(D.key(row));
        p.by = brand.base - 96 - p.tier * 94;
        p.cy = p.by + 38;
      }
      y += brand.height;
    }
    height = y + 120;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="AI 模型發布時間軸"><style>text{font-family:Arial,"PingFang TC","Microsoft JhengHei",sans-serif;fill:#1b2943}.model{font-size:16px;font-weight:700}.date{font-size:12px;fill:#4c5d79}.category{font-size:11px;fill:#586882}</style><rect width="100%" height="100%" fill="#f5f7fb"/>`;
    const ticks = [];
    for (let yr = startYear; yr <= new Date(end).getUTCFullYear(); yr++) {
      for (const month of [0,3,6,9]) {
        const time = Date.UTC(yr,month,1);
        if (time < start || time > end) continue;
        ticks.push({ x: left + (time - start) / (end - start) * span, label: `${yr} · Q${month / 3 + 1}`, major: !month });
      }
    }
    activeBrands.forEach((brand, i) => {
      const color = /^#[\da-f]{3,8}$/i.test(brand.color) ? brand.color : '#526589';
      svg += `<rect x="0" y="${brand.top}" width="${width}" height="${brand.height}" fill="${i % 2 ? '#f2f5fa' : '#fff'}"/><line x1="0" x2="${width}" y1="${brand.top + brand.height}" y2="${brand.top + brand.height}" stroke="#dce3ef"/>`;
      for (const tick of ticks) svg += `<line x1="${tick.x}" x2="${tick.x}" y1="${brand.top}" y2="${brand.top + brand.height}" stroke="${tick.major ? '#d3dbea' : '#e5eaf2'}" ${tick.major ? '' : 'stroke-dasharray="4 8"'}/>`;
      svg += `<line x1="${left}" x2="${width - 40}" y1="${brand.base}" y2="${brand.base}" stroke="${color}" opacity=".4" stroke-width="2"/>`;
      for (const row of brand.rows) {
        const p = positions.get(D.key(row));
        svg += `<line x1="${p.x}" x2="${p.x}" y1="${brand.base}" y2="${p.by + 76}" stroke="${color}" opacity=".45"/><circle cx="${p.x}" cy="${brand.base}" r="5" fill="${color}"/>`;
        svg += `<a href="#model=${encodeURIComponent(D.key(row))}" data-key="${esc(D.key(row))}" class="node" role="button" tabindex="0" aria-label="${esc(`${row.model}，${row.vendor}，${dateLabel(row)}，查看詳情與來源`)}"><rect class="card" x="${p.bx}" y="${p.by}" width="${p.w}" height="76" rx="10" fill="${row.isUpdated ? '#edf1ff' : '#fff'}" stroke="${color}" stroke-width="1.25"/><text x="${p.bx + 13}" y="${p.by + 24}" class="model">${esc(row.model)}</text><text x="${p.bx + 13}" y="${p.by + 44}" class="date">${esc(row.date)}${row.precision === 'month' ? ' · 月份' : ''}${row.isUpdated ? ' · 本次收錄' : ''}</text><text x="${p.bx + 13}" y="${p.by + 63}" class="category">${esc(D.category(row).slice(0, 38))}</text></a>`;
      }
      // Reposition only this label horizontally while panning; model nodes remain at their exact dates.
      svg += `<g class="lane-label" data-top="${brand.top}"><a class="brand-entry" data-brand="${esc(brand.name)}" href="#brand=${encodeURIComponent(brand.name)}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="查看 ${esc(formatBrand(brand.name))} 品牌演進圖"><title>點擊查看品牌演進圖</title><rect x="0" y="${brand.top + 9}" width="330" height="32" rx="7" fill="${i % 2 ? '#f2f5fa' : '#fff'}"/><circle cx="16" cy="${brand.top + 25}" r="4" fill="${color}"/><text x="29" y="${brand.top + 30}" style="font-size:15px;font-weight:700">${esc(formatBrand(brand.name))}<tspan style="fill:#687992;font-size:11px;font-weight:400">　${brand.rows.length} 個節點 ↗</tspan></text></a></g>`;
    });
    svg += '<g id="dateRuler"><rect width="100%" height="40" fill="#f5f7fb"/>';
    for (const tick of ticks) svg += `<text x="${tick.x + 6}" y="26" style="font-size:13px;fill:#536580;font-weight:700">${tick.label}</text>`;
    svg += '</g></svg>';
    stage.innerHTML = svg;
    stage.style.width = width + 'px'; stage.style.height = height + 'px';
    applyZoom(scale, 0, 0);
    updateStickyLabels();
  }
  function updateStickyLabels() {
    if (!ready && !positions.size) return;
    stage.querySelectorAll('.lane-label').forEach(label => label.setAttribute('transform', `translate(${viewer.scrollLeft / scale + 16},0)`));
    const ruler = $('dateRuler');
    if (ruler) ruler.setAttribute('transform', `translate(0,${viewer.scrollTop / scale})`);
  }
  let scrollFrame;
  viewer.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = null; updateStickyLabels(); }); });
  function applyZoom(next, cx = viewer.clientWidth / 2, cy = viewer.clientHeight / 2) {
    overviewMagnifier?.setOverview(false);
    const worldX = (viewer.scrollLeft + cx) / scale, worldY = (viewer.scrollTop + cy) / scale;
    scale = Math.max(.025, Math.min(3, next));
    sizer.style.width = width * scale + 'px'; sizer.style.height = height * scale + 'px';
    stage.style.transform = `scale(${scale})`;
    viewer.scrollLeft = worldX * scale - cx; viewer.scrollTop = worldY * scale - cy;
    $('pct').textContent = `${scale < .1 ? (scale * 100).toFixed(1) : Math.round(scale * 100)}%`;
    $('minusBtn').disabled = scale <= .025; $('plusBtn').disabled = scale >= 3;
    updateStickyLabels();
  }
  function jump(key, focus = false) {
    const pos = positions.get(key); if (!pos) return;
    applyZoom(1);
    viewer.scrollLeft = pos.bx + pos.w / 2 - viewer.clientWidth / 2;
    viewer.scrollTop = Math.max(0, pos.cy - viewer.clientHeight / 2);
    stage.querySelectorAll('.highlight').forEach(node => node.classList.remove('highlight'));
    const node = [...stage.querySelectorAll('[data-key]')].find(node => node.dataset.key === key);
    node?.classList.add('highlight');
    if (focus) node?.focus({ preventScroll: true });
    updateStickyLabels();
  }
  function latest(initial = false) {
    // Start with the first matching brand, preserving the familiar cross-brand reading order.
    const first = brands.find(b => shown.some(r => r.vendor === b.name));
    const candidates = initial && first ? shown.filter(r => r.vendor === first.name) : shown;
    if (candidates.length) jump(D.key(candidates[candidates.length - 1]));
  }
  function renderList() {
    $('listResults').innerHTML = [...shown].reverse().map(row => `<article class="model-card"><div class="card-top"><button class="brand-label brand-entry" data-brand="${esc(row.vendor)}" aria-haspopup="dialog" aria-label="查看 ${esc(formatBrand(row.vendor))} 品牌演進圖">${esc(formatBrand(row.vendor))} ↗</button>${row.isUpdated ? '<span class="record-status">本次收錄</span>' : ''}</div><h2><button class="model-title" data-detail="${esc(D.key(row))}">${esc(row.model)}</button></h2><time datetime="${esc(row.date)}">${esc(dateLabel(row))}</time><p class="category">${esc(D.category(row))}</p><div class="card-actions"><button data-detail="${esc(D.key(row))}">詳情與來源 ↗</button><button data-locate="${esc(D.key(row))}" aria-label="在時間軸定位 ${esc(row.model)}">定位時間軸</button></div></article>`).join('') + '<p class="list-footer">依發布日期由新到舊。月份資料保留原有精度；「本次收錄」為本批增量紀錄。<br>歷史底稿尚未逐筆重新查核；模型能力分類不代表 Agent 產品升代。</p>';
  }
  function setMode(next, save = true) {
    overviewMagnifier?.setOverview(false);
    resetGesture();
    mode = next;
    const timeline = mode === 'timeline';
    viewer.hidden = !timeline || !shown.length;
    $('timelineOverlay').hidden = !timeline || !shown.length;
    $('listResults').hidden = timeline || !shown.length;
    $('timelineView').setAttribute('aria-pressed', String(timeline));
    $('listView').setAttribute('aria-pressed', String(!timeline));
    if (save) writeUrl(true);
  }
  function applyFilters({ save = true, push = false } = {}) {
    resetGesture();
    shown = rows.filter(row => D.matches(row, filters));
    const count = ['brand','year','type'].filter(field => filters[field]).length;
    $('filterCount').textContent = count ? `(${count})` : '';
    $('resetFilters').hidden = !count && !filters.query;
    $('resultCount').innerHTML = `<strong>${shown.length}</strong> / ${rows.length} 個節點 <span>· ${new Set(shown.map(r => r.vendor)).size} 品牌</span>`;
    $('emptyState').hidden = !!shown.length;
    renderList();
    if (shown.length) { renderTimeline(); latest(true); }
    setMode(mode, false);
    $('listResults').scrollTop = 0;
    if (save) writeUrl(push);
    syncToolbar();
  }
  function resetFilters() {
    clearTimeout(searchTimer);
    Object.keys(filters).forEach(field => { filters[field] = ''; });
    $('search').value = $('brandJump').value = $('yearFilter').value = $('typeFilter').value = '';
    applyFilters({ push: true });
  }
  function validSources(row) {
    return (row.sources || []).flatMap(source => {
      try { const url = new URL(source); return url.protocol === 'https:' || url.protocol === 'http:' ? [url] : []; } catch { return []; }
    });
  }
  function showDetail(key, updateHash = true) {
    const row = rows.find(row => D.key(row) === key); if (!row) return;
    currentDetail = row;
    if (!$('detail').open) opener = document.activeElement;
    $('detailVendor').textContent = formatBrand(row.vendor);
    $('detailTitle').textContent = row.model;
    $('detailMeta').textContent = `${dateLabel(row)} · ${D.category(row)}`;
    $('detailTags').innerHTML = D.types(row).map(type => `<span>${esc(D.labels[type])}</span>`).join('');
    $('detailNote').textContent = row.note;
    $('detailProvenance').textContent = row.isUpdated ? `本次增量收錄 · 資料批次 ${manifest.checkedAt}。請以原始來源及授權條款為準。` : '歷史底稿紀錄；本次未逐筆重新查核。';
    $('detailSources').replaceChildren();
    validSources(row).forEach((url, i) => {
      const anchor = document.createElement('a');
      anchor.href = url.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      const title = /\/LICENSE(?:$|[?#])/i.test(url.pathname) ? '授權條款' : `來源 ${i + 1}`;
      const label = document.createElement('span'); label.textContent = title;
      const host = document.createElement('small'); host.textContent = url.hostname;
      label.append(host); anchor.append(label, document.createTextNode('↗'));
      anchor.setAttribute('aria-label', `${title}：${url.hostname}（另開分頁）`);
      $('detailSources').append(anchor);
    });
    if (!$('detailSources').children.length) $('detailSources').textContent = '這筆底稿尚無可用來源。';
    $('copyStatus').textContent = '';
    if (!$('detail').open) $('detail').showModal();
    if (updateHash) { const url = new URL(location.href); url.hash = `model=${encodeURIComponent(key)}`; if (url.hash !== location.hash) history.pushState({timelineDetail:true}, '', url); }
  }
  function closeDetail({ keepHash = false, restoreFocus = true, replaceHistory = false } = {}) {
    if (!keepHash) {
      if (history.state?.timelineDetail && !replaceHistory) history.back();
      else removeDetailHash();
    }
    $('detail').close();
    if (restoreFocus && opener?.isConnected) opener.focus({preventScroll:true});
  }
  function removeDetailHash() {
    if (location.hash.startsWith('#model=')) history.replaceState({}, '', location.pathname + location.search);
  }
  function modelFromHash() {
    if (!location.hash.startsWith('#model=')) return null;
    try { return decodeURIComponent(location.hash.slice(7)); } catch { return null; }
  }
  function locate(key) {
    if (!shown.some(row => D.key(row) === key)) resetFilters();
    setMode('timeline'); jump(key, true);
  }
  function renderUpdates() {
    $('stamp').textContent = `資料批次 ${manifest.checkedAt}`;
    $('updatesButton').textContent = `本次更新 ${manifest.additions.length}`;
    $('scope').textContent = `${manifest.checkedAt} 批次收錄 ${manifest.additions.length} 筆增量；包括新增或更正，不代表全部皆於當日發布。`;
    $('changeList').innerHTML = [...manifest.additions].sort((a,b) => (D.parseDate(b.date)?.time || 0) - (D.parseDate(a.date)?.time || 0)).map(row => `<article class="change"><span class="record-status">本次收錄</span><h3>${esc(row.model)}</h3><div class="change-meta">${esc(formatBrand(row.vendor))} · ${esc(row.date)} · ${esc(row.category)}</div><p>${esc(row.note)}</p><div class="actions"><button data-update-detail="${esc(D.key(row))}">詳情與來源</button><button data-update-locate="${esc(D.key(row))}">定位時間軸</button></div></article>`).join('');
  }
  function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500); }

  // A gesture remains a drag after any movement or second pointer. Rebase at every
  // pointer-count transition so two fingers -> one finger never jumps or opens a node.
  const pointers = new Map(); let pan = null, pinch = null, gestureMoved = false, tapKey = null, tapBrand = null;
  function resetGesture() {
    const ids = [...pointers.keys()]; pointers.clear(); pan = pinch = null; tapKey = tapBrand = null; gestureMoved = false;
    viewer.classList.remove('dragging');
    ids.forEach(id => { try { if (viewer.hasPointerCapture(id)) viewer.releasePointerCapture(id); } catch {} });
  }
  function rebaseGesture() {
    const points = [...pointers.values()];
    if (points.length >= 2) {
      const [a,b] = points, rect = viewer.getBoundingClientRect();
      const x = (a.x+b.x)/2 - rect.left, y = (a.y+b.y)/2 - rect.top;
      pinch = { distance: Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)), scale, worldX: (viewer.scrollLeft+x)/scale, worldY: (viewer.scrollTop+y)/scale };
      pan = null; gestureMoved = true; tapKey = tapBrand = null;
    } else if (points.length === 1) { pan = { ...points[0], left: viewer.scrollLeft, top: viewer.scrollTop }; pinch = null; }
  }
  viewer.addEventListener('pointerdown', event => {
    if (!ready || event.pointerType === 'mouse' && event.button !== 0) return;
    if (!pointers.size) { gestureMoved = false; tapKey = event.target.closest('[data-key]')?.dataset.key || null; tapBrand = event.target.closest('[data-brand]')?.dataset.brand || null; }
    pointers.set(event.pointerId, { x:event.clientX, y:event.clientY }); rebaseGesture();
    try { viewer.setPointerCapture(event.pointerId); } catch {}
    viewer.classList.add('dragging'); event.preventDefault();
  });
  viewer.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
    if (pointers.size >= 2 && pinch) {
      const [a,b] = [...pointers.values()], rect = viewer.getBoundingClientRect();
      const cx = (a.x+b.x)/2-rect.left, cy = (a.y+b.y)/2-rect.top;
      applyZoom(pinch.scale * Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance, cx, cy);
      viewer.scrollLeft = pinch.worldX*scale-cx; viewer.scrollTop = pinch.worldY*scale-cy;
      updateStickyLabels();
    } else if (pan) {
      const dx = event.clientX-pan.x, dy = event.clientY-pan.y;
      if (Math.hypot(dx,dy)>5) gestureMoved = true;
      if (gestureMoved) { viewer.scrollLeft = pan.left-dx; viewer.scrollTop = pan.top-dy; }
    }
    event.preventDefault();
  });
  function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const action = event.type === 'pointerup' && pointers.size === 1 && !gestureMoved ? tapKey : null;
    const brandAction = event.type === 'pointerup' && pointers.size === 1 && !gestureMoved ? tapBrand : null;
    pointers.delete(event.pointerId);
    if (event.type !== 'pointerup') { gestureMoved = true; tapKey = tapBrand = null; }
    if (pointers.size) rebaseGesture(); else resetGesture();
    if (action) showDetail(action);
    if (brandAction) window.BrandEvolution?.open(brandAction, true, [...stage.querySelectorAll('[data-brand]')].find(el => el.dataset.brand === brandAction));
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => viewer.addEventListener(type, finishPointer));
  window.addEventListener('blur', resetGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetGesture(); });
  viewer.addEventListener('click', event => {
    const brand = event.target.closest('[data-brand]');
    if (brand) { event.preventDefault(); if (event.detail === 0) window.BrandEvolution?.open(brand.dataset.brand, true, brand); return; }
    const node = event.target.closest('[data-key]');
    if (node) { event.preventDefault(); if (event.detail === 0) showDetail(node.dataset.key); }
  });
  viewer.addEventListener('keydown', event => {
    const brand = event.target.closest('[data-brand]');
    if (brand && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); window.BrandEvolution?.open(brand.dataset.brand, true, brand); return; }
    const node = event.target.closest('[data-key]');
    if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showDetail(node.dataset.key); return; }
    if (event.target !== viewer) return;
    const step = event.shiftKey ? 300 : 90;
    const directions = { ArrowLeft:[-step,0], ArrowRight:[step,0], ArrowUp:[0,-step], ArrowDown:[0,step] };
    if (directions[event.key]) { event.preventDefault(); viewer.scrollBy(...directions[event.key]); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); applyZoom(scale*1.2); }
    if (event.key === '-') { event.preventDefault(); applyZoom(scale/1.2); }
    if (event.key === '0') { event.preventDefault(); applyZoom(1); }
    if (event.key === 'Home') { event.preventDefault(); viewer.scrollTo(0,0); }
    if (event.key === 'End') { event.preventDefault(); latest(); }
  });
  viewer.addEventListener('wheel', event => {
    if (!ready || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault(); const rect = viewer.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewer.clientHeight : 1);
    applyZoom(scale*Math.exp(-delta*.002),event.clientX-rect.left,event.clientY-rect.top);
  }, { passive:false });
  $('fitBtn').onclick = () => { if (ready) { resetGesture(); applyZoom((viewer.clientWidth-20)/width,0,0); viewer.scrollTo(0,0); overviewMagnifier?.setOverview(true); toast('總覽適合看分布；點 100% 或「最新」回到閱讀大小'); } };
  $('readBtn').onclick = () => ready && applyZoom(1);
  $('plusBtn').onclick = () => ready && applyZoom(scale*1.25);
  $('minusBtn').onclick = () => ready && applyZoom(scale*.8);
  $('latestBtn').onclick = () => ready && latest();
  $('timelineView').onclick = () => { if (ready) { setMode('timeline'); latest(true); } };
  $('listView').onclick = () => ready && setMode('list');
  $('filterToggle').onclick = () => { const open = $('filters').classList.toggle('open'); $('filterToggle').setAttribute('aria-expanded', String(open)); syncToolbar(); };
  $('search').addEventListener('input', () => { if (!ready) return; clearTimeout(searchTimer); searchTimer = setTimeout(() => { filters.query = $('search').value.trim(); applyFilters(); }, 140); });
  $('search').addEventListener('keydown', event => { if (event.key === 'Escape') { $('search').value = ''; filters.query = ''; applyFilters(); } });
  [['brandJump','brand'],['yearFilter','year'],['typeFilter','type']].forEach(([id,field]) => $(id).onchange = () => { if (!ready) return; clearTimeout(searchTimer); filters.query = $('search').value.trim(); filters[field] = $(id).value; applyFilters({push:true}); });
  $('resetFilters').onclick = $('emptyReset').onclick = resetFilters;
  $('updatesButton').onclick = $('updatesMobile').onclick = () => { if (ready && !$('updatesPanel').open) $('updatesPanel').showModal(); };
  $('closeUpdates').onclick = () => $('updatesPanel').close();
  $('closeDetail').onclick = () => closeDetail();
  $('detail').addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
  for (const dialog of [$('detail'),$('updatesPanel')]) {
    let downOutside = false;
    dialog.addEventListener('pointerdown', event => { downOutside = event.target === dialog && outside(event,dialog); });
    dialog.addEventListener('click', event => { if (downOutside && event.target === dialog && outside(event,dialog)) { if (dialog === $('detail')) closeDetail(); else dialog.close(); } downOutside = false; });
  }
  function outside(event, el) { const r = el.getBoundingClientRect(); return event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom; }
  $('locateDetail').onclick = () => { const key = D.key(currentDetail); closeDetail({restoreFocus:false,replaceHistory:true}); locate(key); };
  $('copyLink').onclick = async () => {
    if (!currentDetail) return;
    const url = new URL(location.href); url.hash = `model=${encodeURIComponent(D.key(currentDetail))}`;
    try { await navigator.clipboard.writeText(url.href); $('copyStatus').textContent = '已複製，可分享這個模型的詳情連結'; }
    catch { $('copyStatus').textContent = '無法自動複製；可直接複製瀏覽器網址列的節點連結'; }
  };
  $('listResults').onclick = event => {
    const brand = event.target.closest('[data-brand]');
    if (brand) { window.BrandEvolution?.open(brand.dataset.brand, true, brand); return; }
    const detail = event.target.closest('[data-detail]'), location = event.target.closest('[data-locate]');
    if (detail) showDetail(detail.dataset.detail);
    if (location) locate(location.dataset.locate);
  };
  $('changeList').onclick = event => {
    const detail = event.target.closest('[data-update-detail]'), location = event.target.closest('[data-update-locate]');
    if (detail) { $('updatesPanel').close(); showDetail(detail.dataset.updateDetail); }
    if (location) { $('updatesPanel').close(); locate(location.dataset.updateLocate); }
  };
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); $('search').focus(); }
  });
  window.addEventListener('popstate', () => {
    if (!ready) return;
    const previousView = JSON.stringify({ ...filters, mode });
    if ($('detail').open) closeDetail({keepHash:true,restoreFocus:false});
    readUrl();
    // Closing a detail is not a new search. Preserve reading and canvas positions.
    if (JSON.stringify({ ...filters, mode }) !== previousView) applyFilters({save:false});
    const key = modelFromHash(); if (key) showDetail(key,false);
  });
  window.addEventListener('hashchange', () => { if (ready) { const key = modelFromHash(); if (key) showDetail(key,false); else if ($('detail').open) closeDetail({keepHash:true}); } });
  async function fetchChecked(url, kind) { const response = await fetch(url,{cache:'no-cache'}); if (!response.ok) throw Error(`${kind}讀取失敗（${response.status}）`); return response; }
  async function load() {
    $('retryLoad').hidden = true;
    try {
      manifest = await (await fetchChecked('data/updates.json?v=20261001-ux1','更新資料')).json();
      if (!Array.isArray(manifest.additions) || !D.parseDate(manifest.checkedAt)) throw Error('更新資料格式不正確');
      const base = parseBaseline(await (await fetchChecked(manifest.baselinePath,'歷史底稿')).text());
      const merged = D.merge(base,manifest.additions); rows = merged.rows;
      if (merged.invalid.length) throw Error(`${merged.invalid.length} 筆日期格式需要修正；為避免遺漏，暫停顯示`);
      for (const row of rows) if (!brands.some(b => b.name === row.vendor)) brands.push({name:row.vendor,symbol:'•',color:'#526589'});
      $('brandJump').innerHTML = '<option value="">所有品牌</option>' + brands.map(b => `<option value="${esc(b.name)}">${esc(formatBrand(b.name))}</option>`).join('');
      $('yearFilter').innerHTML = '<option value="">所有年份</option>' + [...new Set(rows.map(r => r.year))].sort((a,b)=>b-a).map(year=>`<option value="${year}">${year} 年</option>`).join('');
      $('typeFilter').innerHTML = '<option value="">所有能力</option>' + Object.entries(D.labels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
      window.BrandEvolution?.init({ rows, brands });
      readUrl(); ready = true; renderUpdates(); applyFilters({save:false}); $('loading').hidden = true;
      if (mobile()) $('gestureHelp').textContent = '單指拖曳 · 雙指縮放';
      const key = modelFromHash(); if (key) showDetail(key,false);
    } catch (error) {
      ready = false; $('loading').hidden = false; $('loading').querySelector('h2').textContent = '暫時無法載入時間軸';
      $('loading').querySelector('p').textContent = error.message; $('retryLoad').hidden = false;
      $('resultCount').textContent = '資料尚未載入'; console.error(error);
    }
  }
  $('retryLoad').onclick = load;
  load();
})();

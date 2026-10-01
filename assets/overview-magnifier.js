'use strict';
/* An optional, read-only overview lens. The main chart owns its zoom and gestures. */
(() => {
  let instance = 0;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function create({ viewer, stage, controls }) {
    if (!viewer || !stage || !controls) return null;
    const doc = viewer.ownerDocument, win = doc.defaultView;
    const prefix = `overview-lens-${++instance}-`;
    let overview = false, enabled = true, frame = 0, point = null;
    let original = null, copy = null, sticky = [], cloneCount = 0;
    const pressed = new Set(), cleanup = [];
    const button = doc.createElement('button');
    button.type = 'button'; button.className = 'overview-magnifier-toggle';
    button.hidden = true; button.setAttribute('aria-pressed', 'true');
    button.textContent = '⌕ 放大鏡：開';
    button.title = '總覽時以滑鼠指向時間軸，放大局部內容';
    controls.append(button);
    const lens = doc.createElement('div');
    lens.className = 'overview-magnifier-lens'; lens.hidden = true;
    lens.setAttribute('aria-hidden', 'true'); lens.setAttribute('inert', '');
    lens.style.pointerEvents = 'none';
    // A shadow boundary isolates the cloned SVG styles and model selectors.
    const shadow = lens.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = ':host{pointer-events:none}svg{position:absolute;display:block;max-width:none;pointer-events:none;overflow:hidden}.caption{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);padding:4px 9px;border-radius:20px;background:#17233bed;color:#fff;font:11px sans-serif;white-space:nowrap;pointer-events:none}';
    const caption = doc.createElement('span'); caption.className = 'caption';
    shadow.append(style, caption); doc.body.append(lens);
    function listen(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      cleanup.push(() => target.removeEventListener(type, fn, options));
    }
    function dismiss() {
      lens.hidden = true; point = null;
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
    }
    function available() {
      return overview && enabled && !viewer.hidden && !pressed.size &&
        !viewer.classList.contains('dragging') && !doc.querySelector('dialog[open]');
    }
    function discard() {
      dismiss(); copy?.remove(); original = copy = null; sticky = [];
    }
    function prepare(svg) {
      if (original === svg && copy) return;
      copy?.remove(); original = svg; copy = svg.cloneNode(true); cloneCount++;
      const ids = new Map();
      for (const el of [copy, ...copy.querySelectorAll('[id]')]) {
        if (!el.id) continue;
        ids.set(el.id, prefix + cloneCount + '-' + el.id);
        el.id = ids.get(el.id);
      }
      for (const el of [copy, ...copy.querySelectorAll('*')]) {
        el.removeAttribute('tabindex'); el.removeAttribute('role');
        for (const attr of [...el.attributes]) {
          if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
          else if (attr.value.includes('url(#')) {
            el.setAttribute(attr.name, attr.value.replace(/url\(#([^)]+)\)/g, (all, id) => ids.has(id) ? `url(#${ids.get(id)})` : all));
          }
        }
        if (el.localName === 'a') { el.removeAttribute('href'); el.removeAttribute('xlink:href'); }
        else for (const attr of ['href', 'xlink:href']) {
          const value = el.getAttribute(attr);
          if (value?.startsWith('#') && ids.has(value.slice(1))) el.setAttribute(attr, '#' + ids.get(value.slice(1)));
        }
      }
      copy.querySelectorAll('script,foreignObject').forEach(el => el.remove());
      copy.setAttribute('aria-hidden', 'true'); copy.setAttribute('focusable', 'false');
      copy.style.pointerEvents = 'none'; copy.style.transform = 'none';
      const sourceSticky = [...svg.querySelectorAll('.lane-label, #dateRuler')];
      const targetSticky = [...copy.querySelectorAll('.lane-label, [id$="-dateRuler"]')];
      sticky = sourceSticky.map((el, index) => [el, targetSticky[index]]);
      shadow.insertBefore(copy, caption);
    }
    function paint() {
      frame = 0;
      if (!point || !available()) { dismiss(); return; }
      const svg = stage.querySelector('svg');
      if (!svg) { dismiss(); return; }
      const r = viewer.getBoundingClientRect(), s = svg.getBoundingClientRect();
      const bounds = {
        left: Math.max(0, r.left + viewer.clientLeft), top: Math.max(0, r.top + viewer.clientTop),
        right: Math.min(win.innerWidth, r.left + viewer.clientLeft + viewer.clientWidth),
        bottom: Math.min(win.innerHeight, r.top + viewer.clientTop + viewer.clientHeight)
      };
      const { x, y } = point;
      if (x < bounds.left || x >= bounds.right || y < bounds.top || y >= bounds.bottom ||
          s.width <= 0 || s.height <= 0 || x < s.left || x >= s.right || y < s.top || y >= s.bottom) { dismiss(); return; }
      const box = (svg.getAttribute('viewBox') || `0 0 ${svg.getAttribute('width')} ${svg.getAttribute('height')}`).trim().split(/[ ,]+/).map(Number);
      if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) { dismiss(); return; }
      const size = Math.min(300, bounds.right - bounds.left - 16, bounds.bottom - bounds.top - 16);
      if (size < 96) { dismiss(); return; }
      const scale = s.width / box[2], zoom = Math.max(1, scale * 2.5);
      // getBoundingClientRect includes CSS scale and scroll, avoiding stale world coordinates.
      const sourceX = (x - s.left) / s.width * box[2];
      const sourceY = (y - s.top) / s.height * box[3];
      prepare(svg);
      for (const [source, target] of sticky) if (target) {
        if (source.hasAttribute('transform')) target.setAttribute('transform', source.getAttribute('transform'));
        else target.removeAttribute('transform');
      }
      lens.style.width = lens.style.height = size + 'px';
      lens.style.left = clamp(x - size / 2, bounds.left + 8, bounds.right - size - 8) + 'px';
      lens.style.top = clamp(y - size / 2, bounds.top + 8, bounds.bottom - size - 8) + 'px';
      // The SVG fills the lens content box; its center is the exact hovered chart point.
      const inner = size - 6;
      copy.style.width = box[2] * zoom + 'px'; copy.style.height = box[3] * zoom + 'px';
      copy.style.left = inner / 2 - sourceX * zoom + 'px';
      copy.style.top = inner / 2 - sourceY * zoom + 'px';
      caption.textContent = `放大鏡 · ${Math.round(zoom * 100)}%`;
      lens.hidden = false;
    }
    function move(event) {
      if (event.pointerType !== 'mouse' || event.buttons || !available()) { dismiss(); return; }
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = win.requestAnimationFrame(paint);
    }
    function setOverview(active) {
      overview = !!active; button.hidden = !overview;
      dismiss();
    }
    listen(button, 'click', () => {
      enabled = !enabled;
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = `⌕ 放大鏡：${enabled ? '開' : '關'}`;
      dismiss();
    });
    listen(viewer, 'pointermove', move, { passive: true });
    listen(viewer, 'pointerleave', dismiss);
    listen(viewer, 'pointerdown', event => { pressed.add(event.pointerId); dismiss(); }, { capture: true, passive: true });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(win, type, event => { pressed.delete(event.pointerId); dismiss(); }, true);
    listen(viewer, 'scroll', dismiss, { passive: true });
    listen(win, 'resize', dismiss);
    listen(win, 'blur', () => { pressed.clear(); dismiss(); });
    listen(doc, 'visibilitychange', () => { pressed.clear(); dismiss(); });
    listen(doc, 'brand-evolution-open', dismiss);
    const renders = new win.MutationObserver(discard);
    renders.observe(stage, { childList: true });
    const visibility = new win.MutationObserver(() => {
      if (viewer.hidden) setOverview(false);
      if (!available()) dismiss();
    });
    visibility.observe(viewer, { attributes: true, attributeFilter: ['hidden', 'class'] });
    for (const dialog of doc.querySelectorAll('dialog')) visibility.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    return {
      setOverview, dismiss,
      destroy() { discard(); renders.disconnect(); visibility.disconnect(); cleanup.forEach(fn => fn()); button.remove(); lens.remove(); }
    };
  }
  window.OverviewMagnifier = { create };
})();

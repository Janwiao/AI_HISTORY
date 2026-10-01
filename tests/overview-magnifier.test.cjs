/* Focused lens geometry/state tests; jsdom is not a browser layout engine. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../assets/overview-magnifier.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 25));
function boot() {
  const dom = new JSDOM('<div id="viewer"><div id="stage"><svg viewBox="0 0 10000 5000" width="10000" height="5000"><style>text{fill:red}</style><g id="dateRuler" transform="translate(0,0)"><text>2026</text></g><g class="lane-label"><text>OpenAI</text></g><a href="#model=test" tabindex="0" data-key="test"><text>Model</text></a></svg></div></div><div class="zoom-controls"></div><dialog id="detail"></dialog><dialog id="brandEvolution"></dialog>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, viewer = d.querySelector('#viewer'), stage = d.querySelector('#stage');
  Object.defineProperties(w, { innerWidth: { value: 1400 }, innerHeight: { value: 1000 } });
  Object.defineProperties(viewer, { clientWidth: { value: 1000 }, clientHeight: { value: 600 } });
  viewer.getBoundingClientRect = () => ({ left: 40, top: 180, right: 1040, bottom: 780, width: 1000, height: 600 });
  function setSVGRect(rect = { left: 40, top: 180, right: 1040, bottom: 680, width: 1000, height: 500 }) { stage.querySelector('svg').getBoundingClientRect = () => rect; }
  setSVGRect(); w.eval(source);
  const controller = w.OverviewMagnifier.create({ viewer, stage, controls: d.querySelector('.zoom-controls') });
  const button = d.querySelector('.overview-magnifier-toggle'), lens = d.querySelector('.overview-magnifier-lens');
  function pointer(type, { x = 540, y = 430, id = 1, pointerType = 'mouse', buttons = 0, target = viewer } = {}) {
    const e = new w.Event(type, { bubbles: true }); Object.assign(e, { clientX: x, clientY: y, pointerId: id, pointerType, buttons }); target.dispatchEvent(e);
  }
  return { dom, w, d, viewer, stage, controller, button, lens, pointer, setSVGRect };
}
test('only active overview mouse hover creates a read-only cached lens at correct scaled coordinates', async () => {
  const c = boot(); try {
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, true); assert.equal(c.button.hidden, true);
    c.controller.setOverview(true); assert.equal(c.button.hidden, false);
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    const copy = c.lens.shadowRoot.querySelector('svg');
    assert.equal(copy.style.width, '10000px'); assert.equal(copy.style.height, '5000px');
    assert.equal(parseFloat(copy.style.left), 147 - 5000); assert.equal(parseFloat(copy.style.top), 147 - 2500);
    assert.equal(c.lens.style.left, '390px'); assert.equal(c.lens.style.top, '280px');
    assert.equal(c.lens.style.pointerEvents, 'none'); assert.equal(c.lens.getAttribute('aria-hidden'), 'true');
    assert.equal(copy.querySelector('a').hasAttribute('href'), false); assert.equal(copy.querySelector('[tabindex]'), null);
    assert.notEqual(copy.querySelector('g').id, 'dateRuler'); assert.equal(c.d.querySelectorAll('#dateRuler').length, 1);
    const chartTransform = c.stage.style.transform, scroll = c.viewer.scrollLeft;
    c.pointer('pointermove', { x: 550 }); await tick(); assert.equal(c.lens.shadowRoot.querySelector('svg'), copy);
    assert.equal(c.stage.style.transform, chartTransform); assert.equal(c.viewer.scrollLeft, scroll);
    c.pointer('pointerleave'); assert.equal(c.lens.hidden, true);
  } finally { c.dom.window.close(); }
});
test('scroll offsets, non-origin viewBox and edge clipping map the hovered point without altering chart', async () => {
  const c = boot(); try {
    c.stage.querySelector('svg').setAttribute('viewBox', '20 30 10000 5000');
    c.setSVGRect({ left: -160, top: 80, right: 1840, bottom: 1080, width: 2000, height: 1000 });
    c.controller.setOverview(true); c.pointer('pointermove', { x: 45, y: 185 }); await tick();
    const copy = c.lens.shadowRoot.querySelector('svg');
    assert.equal(parseFloat(copy.style.left), 147 - 1025); assert.equal(parseFloat(copy.style.top), 147 - 525);
    assert.equal(c.lens.style.left, '48px'); assert.equal(c.lens.style.top, '188px');
    c.pointer('pointermove', { x: 1038, y: 778 }); await tick();
    assert.equal(c.lens.style.left, '732px'); assert.equal(c.lens.style.top, '472px');
    c.pointer('pointermove', { x: 1041, y: 778 }); await tick(); assert.equal(c.lens.hidden, true);
  } finally { c.dom.window.close(); }
});
test('toggle off, overview exit, list visibility and modal open dismiss without resurrecting stale hover', async () => {
  const c = boot(); try {
    c.controller.setOverview(true); c.pointer('pointermove'); await tick();
    c.button.click(); assert.equal(c.button.getAttribute('aria-pressed'), 'false'); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, true);
    c.button.click(); assert.equal(c.lens.hidden, true); c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.d.querySelector('#detail').open = true; await tick(); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, true);
    c.d.querySelector('#detail').open = false; await tick(); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.d.dispatchEvent(new c.w.CustomEvent('brand-evolution-open')); assert.equal(c.lens.hidden, true);
    c.controller.setOverview(false); c.pointer('pointermove'); await tick(); assert.equal(c.button.hidden, true); assert.equal(c.lens.hidden, true);
    c.controller.setOverview(true); c.viewer.hidden = true; await tick(); assert.equal(c.button.hidden, true);
  } finally { c.dom.window.close(); }
});
test('drag, multi-pointer pinch, lost capture, cancellation and blur suppress the lens; touch never enables it', async () => {
  const c = boot(); try {
    c.controller.setOverview(true); c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.pointer('pointerdown', { buttons: 1 }); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove', { buttons: 1 }); await tick(); assert.equal(c.lens.hidden, true);
    c.pointer('pointerdown', { id: 2, pointerType: 'touch' });
    c.pointer('pointerup'); c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, true);
    c.pointer('pointercancel', { id: 2, pointerType: 'touch' });
    c.pointer('pointermove', { pointerType: 'touch' }); await tick(); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.pointer('pointerdown'); c.pointer('lostpointercapture'); c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.pointer('pointerdown'); c.w.dispatchEvent(new c.w.Event('blur')); c.pointer('pointermove'); await tick(); assert.equal(c.lens.hidden, false);
    c.viewer.classList.add('dragging'); await tick(); assert.equal(c.lens.hidden, true);
  } finally { c.dom.window.close(); }
});
test('rerender discards stale clone; sticky transforms stay current; scrolling and resize dismiss', async () => {
  const c = boot(); try {
    c.controller.setOverview(true); c.pointer('pointermove'); await tick(); const old = c.lens.shadowRoot.querySelector('svg');
    c.stage.querySelector('#dateRuler').setAttribute('transform', 'translate(0,100)');
    c.pointer('pointermove'); await tick(); assert.equal(c.lens.shadowRoot.querySelector('g').getAttribute('transform'), 'translate(0,100)');
    c.stage.innerHTML = '<svg width="10000" height="5000" viewBox="0 0 10000 5000"><text>Filtered result</text></svg>'; c.setSVGRect();
    await tick(); assert.equal(c.lens.hidden, true); assert.equal(c.lens.shadowRoot.querySelector('svg'), null);
    c.pointer('pointermove'); await tick(); assert.notEqual(c.lens.shadowRoot.querySelector('svg'), old); assert.match(c.lens.shadowRoot.textContent, /Filtered result/);
    c.viewer.dispatchEvent(new c.w.Event('scroll')); assert.equal(c.lens.hidden, true);
    c.pointer('pointermove'); await tick(); c.w.dispatchEvent(new c.w.Event('resize')); assert.equal(c.lens.hidden, true);
    c.controller.destroy(); assert.equal(c.d.querySelector('.overview-magnifier-lens'), null); assert.equal(c.d.querySelector('.overview-magnifier-toggle'), null);
  } finally { c.dom.window.close(); }
});

test('full application hooks enter overview and leave on zoom, latest, view change and filtering', async () => {
  const root = path.join(__dirname, '..');
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, viewer = d.querySelector('#viewer');
  try {
    w.matchMedia = () => ({ matches: false }); w.ResizeObserver = class { observe() {} };
    w.HTMLElement.prototype.scrollTo = function(x, y) { this.scrollLeft = x; this.scrollTop = y; };
    w.HTMLElement.prototype.scrollBy = function(x, y) { this.scrollLeft += x; this.scrollTop += y; };
    w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
    w.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new w.Event('close')); };
    Object.defineProperties(w, { innerWidth: { value: 1400 }, innerHeight: { value: 1000 } });
    Object.defineProperties(viewer, { clientWidth: { value: 1360 }, clientHeight: { value: 600 } });
    viewer.getBoundingClientRect = () => ({ left: 0, top: 220, right: 1360, bottom: 820, width: 1360, height: 600 });
    w.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url.split('?')[0]), 'utf8')), text: async () => fs.readFileSync(path.join(root, url.split('?')[0]), 'utf8') });
    for (const script of d.querySelectorAll('script[src]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
    await tick();
    const button = d.querySelector('.overview-magnifier-toggle'), lens = d.querySelector('.overview-magnifier-lens');
    assert.ok(button); assert.equal(button.hidden, true);
    const hover = async () => {
      const svg = d.querySelector('#stage svg');
      svg.getBoundingClientRect = () => ({ left: 0, top: 220, right: 1340, bottom: 1000, width: 1340, height: 780 });
      const event = new w.Event('pointermove', { bubbles: true });
      Object.assign(event, { pointerType: 'mouse', buttons: 0, clientX: 600, clientY: 400 }); viewer.dispatchEvent(event); await tick();
    };
    for (const exit of ['readBtn', 'latestBtn', 'plusBtn', 'minusBtn', 'listView']) {
      d.querySelector('#timelineView').click(); d.querySelector('#fitBtn').click(); assert.equal(button.hidden, false);
      await hover(); assert.equal(lens.hidden, false);
      const transform = d.querySelector('#stage').style.transform; await hover(); assert.equal(d.querySelector('#stage').style.transform, transform);
      d.getElementById(exit).click(); assert.equal(button.hidden, true); assert.equal(lens.hidden, true);
    }
    d.querySelector('#timelineView').click(); d.querySelector('#fitBtn').click(); await hover();
    d.querySelector('#brandJump').value = 'OpenAI'; d.querySelector('#brandJump').dispatchEvent(new w.Event('change'));
    assert.equal(button.hidden, true); assert.equal(lens.hidden, true);
    d.querySelector('#fitBtn').click(); await hover();
    d.querySelector('#updatesButton').click(); await tick(); assert.equal(lens.hidden, true);
    assert.equal(d.querySelectorAll('#dateRuler').length, 1);
  } finally { dom.window.close(); }
});

// Click audit: crawl every route, flag clickable-looking things that do nothing, actions that throw,
// actions with no visible effect, links to routes that break, and "undefined"/NaN text.
//   node tools/audit.mjs [route,route…]   (server must be running on :8834)
// With routes (e.g. stock,demand) it crawls only those screens and links under them; output goes to
// _shots/audit-<routes>.json, otherwise _shots/audit.json. Kills only the Chrome it started.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8834/';
const PORT = +process.env.CDP_PORT || 9300 + Math.floor(Math.random() * 600);
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const TAG = ONLY.length ? '-' + ONLY.join('-').split('/').join('_') : '';
const inScope = h => !ONLY.length || ONLY.some(r => h === '#/' + r || h.startsWith('#/' + r + '/'));
const OUT = new URL('../_shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const prof = join(tmpdir(), 'mq-audit-' + PORT);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, seq = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 40; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {}
    await sleep(250);
  }
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
}
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text } : r.result?.result?.value; };

// Runs in the page before any script: remember which elements got their own listeners, keep the install prompt away.
const PRELUDE = `
try { sessionStorage.setItem('mq-install-dismissed', '1'); } catch (_) {}
(() => { const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) { if (this instanceof Element && /^(click|pointerdown|mousedown|touchstart|pointerup|input|change|keydown)$/.test(t)) this.__l = (this.__l || '') + t + ' '; return ael.call(this, t, f, o); };
})();`;

// In-page helpers, injected after load.
const HELPERS = `
window.__A = {
  label(e) { const t = (e.getAttribute('aria-label') || e.title || e.textContent || e.value || '').replace(/\\s+/g, ' ').trim().slice(0, 48); return e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + (t ? ' "' + t + '"' : ''); },
  visible(e) { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; },
  handled(e) {
    if (e.closest('input,select,textarea,label,summary,option')) return 'control';
    const a = e.closest('[data-act]'); if (a) return ACTIONS[a.dataset.act] ? 'act' : 'MISSING:' + a.dataset.act;
    if (e.closest('[data-go]')) return 'go';
    const l = e.closest('a[href]'); if (l) { const h = l.getAttribute('href'); if (h && h !== '#' && !/^javascript:/.test(h)) return 'href'; }
    for (let x = e; x && x !== document.body; x = x.parentElement) { if (x.__l || x.onclick || x.oninput || x.onchange || x.onpointerdown) return 'listener'; }
    return null;
  },
  scan(root) {
    root = root || document;
    const out = [];
    const cands = [...root.querySelectorAll('button, a, [data-act], [data-go], [role=button], .chip, .tab')];
    for (const e of root.querySelectorAll('body *')) if (!cands.includes(e) && getComputedStyle(e).cursor === 'pointer' && !e.closest('button,a,[data-act],[data-go]')) cands.push(e);
    for (const e of cands) {
      if (!this.visible(e)) continue;
      const how = this.handled(e);
      if (!how) out.push({ kind: 'dead', el: this.label(e) });
      else if (how.startsWith('MISSING')) out.push({ kind: 'missing-action', el: this.label(e), act: how.slice(8) });
    }
    return out;
  },
  sig() { const L = document.getElementById('layer'), T = document.getElementById('toasts'), A = document.getElementById('app'); const asst = document.querySelector('.assistant');
    const s = [location.hash, L ? L.innerHTML.length : 0, T ? T.innerHTML.length : 0, A ? A.innerHTML.length : 0, asst ? asst.innerHTML.length : -1, document.querySelectorAll('.install,.palette,.modal,.sheet').length].join('|');
    let hsh = 0; const str = (A ? A.innerHTML : '') + (L ? L.innerHTML : ''); for (let i = 0; i < str.length; i += 7) hsh = (hsh * 31 + str.charCodeAt(i)) | 0; return s + '|' + hsh; },
  badText() { const txt = (document.getElementById('app')?.innerText || '') + ' ' + (document.getElementById('layer')?.innerText || '') + ' ' + (document.querySelector('.assistant')?.innerText || '');
    const m = txt.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|\\bnull\\b|Infinity).{0,30}/g); return m ? [...new Set(m)].slice(0, 5) : []; },
  routes() { return [...new Set([...document.querySelectorAll('[data-go], a[href^="#/"]')].map(e => e.dataset.go || e.getAttribute('href')).filter(h => h && h.startsWith('#/')))]; },
  acts() { const seen = {}; [...document.querySelectorAll('[data-act]')].forEach((e, i) => { if (this.visible(e) || e.closest('.tabbar,.side')) { const k = e.dataset.act; (seen[k] = seen[k] || []).push(i); } }); return seen; },
  brokenImgs() { return [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map(i => i.src.split('/').pop().slice(0, 40)); }
};1`;

const DESK = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const MOB = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };

async function load(hash, vp) {
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await send('Page.navigate', { url: BASE + '?a=' + (++seq) + hash });
  await sleep(700);
  await evaluate(HELPERS);
  await sleep(150);
}

await connect();
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: PRELUDE });

const report = { routes: {}, dead: [], missing: [], throws: [], noEffect: [], badText: [], badRoutes: [], brokenImgs: [] };
const SKIP_EFFECT = new Set(['close', 'back']);   // closing an empty layer legitimately changes nothing

for (const vp of [DESK, MOB]) {
  const tag = vp.mobile ? 'm' : 'd';
  const queue = ONLY.length ? ONLY.map(r => '#/' + r) : ['#/login', '#/signup', '#/plans', '#/home', '#/portal/MQ-1042'], seen = new Set(queue);
  const testedActs = new Set();
  while (queue.length) {
    const hash = queue.shift();
    await load(hash, vp);
    const errs0 = await evaluate('window.__errs.slice()');
    if (errs0 && errs0.length) report.badRoutes.push({ vp: tag, hash, errs: errs0 });
    const landed = await evaluate('location.hash');
    if (landed !== hash) report.badRoutes.push({ vp: tag, hash, landed });
    const bt = await evaluate('__A.badText()'); if (bt && bt.length) report.badText.push({ vp: tag, hash, text: bt });
    for (const d of (await evaluate('__A.scan()')) || []) (d.kind === 'dead' ? report.dead : report.missing).push({ vp: tag, hash, ...d });
    const imgs = await evaluate('__A.brokenImgs()'); if (imgs && imgs.length) report.brokenImgs.push({ vp: tag, hash, imgs });
    for (const r of (await evaluate('__A.routes()')) || []) if (!seen.has(r) && inScope(r)) { seen.add(r); queue.push(r); }
    report.routes[tag + ' ' + hash] = true;

    // Fire each action once (first place it appears), then scan what it opened, then fire the actions inside it once.
    const acts = (await evaluate('__A.acts()')) || {};
    for (const [act, idxs] of Object.entries(acts)) {
      const key = act;
      if (testedActs.has(key)) continue; testedActs.add(key);
      await fire(hash, vp, tag, [[act, idxs[0]]], testedActs);
    }
  }
}

async function fire(hash, vp, tag, path, testedActs, depth = 0) {
  await load(hash, vp);
  let before;
  for (let i = 0; i < path.length; i++) {
    const [act, idx] = path[i];
    before = await evaluate('__A.sig()');
    const r = await evaluate(`(() => { const e = document.querySelectorAll('[data-act]')[${idx}]; if (!e || e.dataset.act !== ${JSON.stringify(act)}) return 'gone'; e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; })()`);
    if (r !== 'ok') { if (i === path.length - 1) report.noEffect.push({ vp: tag, hash, act: path.map(p => p[0]).join(' > '), why: 'element not found (' + JSON.stringify(r) + ')' }); return; }
    await sleep(i === path.length - 1 ? 650 : 450);
  }
  const act = path.map(p => p[0]).join(' > ');
  const errs = await evaluate('window.__errs.slice()');
  if (errs && errs.length) report.throws.push({ vp: tag, hash, act, errs });
  const after = await evaluate('__A.sig()');
  if (after === before && !SKIP_EFFECT.has(path[path.length - 1][0])) report.noEffect.push({ vp: tag, hash, act });
  const bt = await evaluate('__A.badText()'); if (bt && bt.length) report.badText.push({ vp: tag, hash, act, text: bt });
  // Scan whatever is open on top (sheet / modal / assistant / palette) for dead controls and untested actions.
  const opened = await evaluate(`(() => { const roots = [...document.querySelectorAll('#layer > *, .assistant, .palette')]; if (!roots.length) return null; const out = []; roots.forEach(r => out.push(...__A.scan(r))); const all = [...document.querySelectorAll('[data-act]')]; const inner = {}; roots.forEach(r => r.querySelectorAll('[data-act]').forEach(e => { if (__A.visible(e) && !(e.dataset.act in inner)) inner[e.dataset.act] = all.indexOf(e); })); return { out, inner }; })()`);
  if (opened && !opened.__err) {
    for (const d of opened.out) (d.kind === 'dead' ? report.dead : report.missing).push({ vp: tag, hash, inside: act, ...d });
    if (depth < 2) for (const [a2, idx2] of Object.entries(opened.inner)) {
      if (testedActs.has(a2)) continue; testedActs.add(a2);
      await fire(hash, vp, tag, [...path, [a2, idx2]], testedActs, depth + 1);
    }
  }
}

ws.close(); chrome.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}
// Collapse duplicates (same dead control on many routes).
const uniq = (arr, f) => { const m = new Map(); for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, { ...x, n: 0, where: [] }); const y = m.get(k); y.n++; if (y.where.length < 4) y.where.push(x.vp + ' ' + x.hash + (x.inside ? ' [' + x.inside + ']' : '')); } return [...m.values()]; };
report.dead = uniq(report.dead, x => x.el);
report.missing = uniq(report.missing, x => x.act);
writeFileSync(join(OUT, 'audit' + TAG + '.json'), JSON.stringify(report, null, 1));
console.log('routes', Object.keys(report.routes).length);
for (const k of ['badRoutes', 'throws', 'missing', 'noEffect', 'dead', 'badText', 'brokenImgs']) {
  console.log('\n== ' + k + ' (' + report[k].length + ')');
  for (const x of report[k].slice(0, 60)) console.log(' ', JSON.stringify(x).slice(0, 260));
}

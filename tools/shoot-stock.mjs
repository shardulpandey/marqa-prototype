// Screenshot the Stock module and the Demand panel (copy of shoot.mjs with its own scenarios) with an isolated headless Chrome over CDP.
//   node tools/shoot-stock.mjs [filter]   ([name, viewport, hash, js, fullPage, wait, role])      (server must be running on :8834)
// Writes PNGs to _shots/. Kills only the Chrome it started.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8834/';
const PORT = +process.env.CDP_PORT || 9300 + Math.floor(Math.random() * 600);
const OUT = new URL('../_shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const prof = join(tmpdir(), 'mq-shoot-' + PORT);
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
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

const DESK = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const MOB = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const D = 'D-20261016-002';
const tick = "document.querySelectorAll('[data-dem-tick]').forEach((c,i)=>{ if(i<2){ c.checked=true; c.dispatchEvent(new Event('change')); } })";
const S = [
  ['d-stk-list', DESK, '#/stock'], ['d-stk-list-all', DESK, '#/stock', "STK.status='all'; render()", true],
  ['d-stk-lots', DESK, '#/stock', "STK.kind='lot'; render()"], ['d-stk-jew', DESK, '#/stock', "STK.kind='jewellery'; STK.status='all'; render()"],
  ['d-stk-drawer', DESK, '#/stock/s7'], ['d-stk-drawer-full', DESK, '#/stock/s7', "document.querySelector('.sheet .sh-b').scrollTop=9999"],
  ['d-stk-drawer-memo', DESK, '#/stock/s11'],
  ['d-stk-move', DESK, '#/stock/s2', "document.querySelector('[data-act=stkIssue]').click()"],
  ['d-stk-move-lot', DESK, '#/stock/s7', "document.querySelector('[data-act=stkMemoOut]').click()"],
  ['d-stk-refuse', DESK, '#/stock/s1', "document.querySelector('[data-act=stkWhy]').click()"],
  ['d-stk-form', DESK, '#/stock', "ACTIONS.stkAdd()"],
  ['d-stk-cert', DESK, '#/stock', "ACTIONS.stkAdd(); document.querySelector('[data-act=stkCert]').click()", false, 1500],
  ['d-stk-form-bad', DESK, '#/stock', "ACTIONS.stkAdd(); document.querySelector('[data-act=stkFKind][data-k=jewellery]').click(); document.querySelector('[data-act=stkSave]').click()"],
  ['d-stk-edit', DESK, '#/stock/s7', "document.querySelector('[data-act=stkEdit]').click()"],
  ['d-stk-import', DESK, '#/stock', "ACTIONS.stkImport(); document.querySelector('[data-act=stkImpFile]').click(); document.querySelector('[data-act=stkImpPreview]').click()"],
  ['d-stk-export', DESK, '#/stock', "document.querySelector('[data-act=stkExport]').click()"],
  ['d-stk-sales', DESK, '#/stock/s2', null, false, 0, 'sales'],
  ['d-stk-ops', DESK, '#/stock', null, false, 0, 'ops'],
  ['d-stk-mkt', DESK, '#/stock', null, false, 0, 'marketing'],
  ['d-dem', DESK, '#/demand'], ['d-dem-all', DESK, '#/demand', "document.querySelector('[data-act=demMode][data-m=all]').click()", true],
  ['d-dem-issue', DESK, '#/demand', `document.querySelector('[data-act=demDia][data-id="${D}"]').click(); setTimeout(()=>{ ${tick} }, 600)`, false, 1300],
  ['d-dem-metal', DESK, '#/demand', `document.querySelector('[data-act=demMetal][data-id="${D}"]').click()`],
  ['d-dem-after', DESK, '#/demand', `document.querySelector('[data-act=demMetal][data-id="${D}"]').click(); document.querySelector('[data-act=demMetalGo]').click(); document.querySelector('[data-act=demDia][data-id="${D}"]').click(); setTimeout(()=>{ ${tick}; document.querySelector('[data-act=demDiaGo]').click(); DEM.mode='all'; render(); }, 600)`, true, 1500],
  ['m-stk-list', MOB, '#/stock'], ['m-stk-list-full', MOB, '#/stock', "STK.status='all'; render()", true],
  ['m-stk-drawer', MOB, '#/stock/s7'], ['m-stk-drawer-scroll', MOB, '#/stock/s7', "document.querySelector('.sheet .sh-b').scrollTop=700"],
  ['m-stk-move', MOB, '#/stock/s7', "document.querySelector('[data-act=stkIssue]').click()"],
  ['m-stk-form', MOB, '#/stock', "ACTIONS.stkAdd()"],
  ['m-stk-import', MOB, '#/stock', "ACTIONS.stkImport(); document.querySelector('[data-act=stkImpFile]').click(); document.querySelector('[data-act=stkImpPreview]').click(); setTimeout(()=>document.querySelector('.stk-mb').scrollTop=520,50)"],
  ['m-dem', MOB, '#/demand'], ['m-dem-full', MOB, '#/demand', "document.querySelector('[data-act=demMode][data-m=all]').click()", true],
  ['m-dem-issue', MOB, '#/demand', `document.querySelector('[data-act=demDia][data-id="${D}"]').click(); setTimeout(()=>{ ${tick} }, 600)`, false, 1300]
];

await connect();
await send('Page.enable'); await send('Runtime.enable');
// The install prompt fires in headless on every load; keep it out of the shots .
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { sessionStorage.setItem('mq-install-dismissed', '1'); sessionStorage.removeItem('stk-kind'); sessionStorage.setItem('mq-role', (/role=([a-z]+)/.exec(location.search) || [0, 'founders'])[1]); } catch (_) {}" });
const only = process.argv[2];
for (const [name, vp, hash, js, full, wait, role] of S) {
  if (only && !name.includes(only)) continue;
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  // A unique query string forces a full load, so panels and sheets from the previous shot don't carry over.
  await send('Page.navigate', { url: BASE + '?shot=' + name + (role ? '&role=' + role : '') + hash });
  await sleep(1300);
  await evaluate(`location.hash !== ${JSON.stringify(hash)} ? (location.hash = ${JSON.stringify(hash)}) : render(); window.scrollTo(0,0); 1`);
  await sleep(500);
  if (js) { const err = await evaluate(`try { ${js}; 'ok' } catch (e) { 'ERR ' + e.message }`); if (err !== 'ok') console.log(name, err); }
  await sleep(wait || 700);
  const errs = await evaluate('window.__errs || []');
  // Mobile emulation widens the layout viewport to fit overflowing content, so compare with the device width, not innerWidth.
  const over = await evaluate('document.documentElement.scrollWidth') - vp.width;
  if (over > 0) console.log(name, 'OVERFLOW x by', over, 'px:', await evaluate(`[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > ${vp.width} + 0.5 && !e.closest('.board,.tabs,.seg,.hscroll')).filter((e, _, all) => !all.includes(e.parentElement)).slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' w=' + Math.round(e.getBoundingClientRect().width) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"').join(' | ')`));
  const opts = { format: 'png' };
  if (full) {
    const h = await evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
    await send('Emulation.setDeviceMetricsOverride', { ...vp, height: Math.min(h, 6000) });
    await sleep(500);
  }
  const shot = await send('Page.captureScreenshot', opts);
  writeFileSync(join(OUT, name + '.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('shot', name, errs && errs.length ? 'ERRORS ' + JSON.stringify(errs) : '');
}
ws.close(); chrome.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}

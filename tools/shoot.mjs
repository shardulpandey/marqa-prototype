// Screenshot every flow of the prototype with an isolated headless Chrome over CDP.
//   node tools/shoot.mjs [filter]      (server must be running on :8834)
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
const S = [
  ['d-login', DESK, '#/login'], ['d-signup', DESK, '#/signup'], ['d-home', DESK, '#/home'], ['d-home-full', DESK, '#/home', null, true],
  ['d-leads', DESK, '#/leads'], ['d-leads-dup', DESK, '#/leads', "const p=document.getElementById('lfPhone'); p.value='99106 33218'; p.dispatchEvent(new Event('input'));"],
  ['d-pipeline', DESK, '#/pipeline'], ['d-pipeline-list', DESK, '#/pipeline', "ACTIONS.pipeView({dataset:{v:'list'}})"], ['d-orders', DESK, '#/orders'], ['d-quotes', DESK, '#/quotes'],
  ['d-deal-new', DESK, '#/deal/D-20261104-003'], ['d-deal-quote', DESK, '#/deal/D-20261101-002/quote'], ['d-deal-quote-full', DESK, '#/deal/D-20261101-005/quote', null, true],
  ['d-deal-nego', DESK, '#/deal/D-20261102-001'], ['d-deal-blocked', DESK, '#/deal/D-20261102-001', "document.querySelector('[data-act=dealMoveTo][data-to=\"Order Confirmed\"]').click()"],
  ['d-deal-move', DESK, '#/deal/D-20261009-003', "ACTIONS.dealMove()"], ['d-deal-s1', DESK, '#/deal/D-20261024-001/order', null, true], ['d-deal-qc', DESK, '#/deal/D-20261017-002/order', null, true],
  ['d-deal-billing', DESK, '#/deal/D-20261019-001/billing'], ['d-deal-activity', DESK, '#/deal/D-20261019-001/activity'], ['d-deal-msg', DESK, '#/deal/D-20261009-003', "ACTIONS.dealMsg(); setTimeout(()=>ACTIONS.msgSend({dataset:{k:'O6'}}),300)", false, 1200],
  ['d-deal-pdf', DESK, '#/deal/D-20261019-001', "ACTIONS.quotePdf()"], ['d-deal-sheet', DESK, '#/deal/D-20261019-001', "ACTIONS.pdSheet()"], ['d-deal-intl', DESK, '#/deal/D-20261102-004/quote'],
  ['d-customer', DESK, '#/customers/c1'], ['d-customers', DESK, '#/customers'], ['d-stock', DESK, '#/stock'], ['d-demand', DESK, '#/demand'], ['d-messages', DESK, '#/messages'], ['d-data', DESK, '#/data'],
  ['d-inbox', DESK, '#/inbox/t1'], ['d-campaigns', DESK, '#/campaigns'], ['d-store', DESK, '#/store'], ['d-studio', DESK, '#/studio'], ['d-production', DESK, '#/production'],
  ['d-schemes', DESK, '#/schemes'], ['d-billing', DESK, '#/billing'], ['d-reports', DESK, '#/reports'], ['d-settings', DESK, '#/settings/workflow'], ['d-access', DESK, '#/settings/access'], ['d-rates', DESK, '#/settings/rates'], ['d-plans', DESK, '#/plans'],
  ['d-ai', DESK, '#/home', "ACTIONS.openAssistant(); aiAsk('Which orders are late?'); setTimeout(()=>aiAsk('Price a 1 ct round solitaire in 18K'),900);", false, 2600],
  ['d-palette', DESK, '#/home', "ACTIONS.palette(); const i=document.getElementById('palIn'); i.value='oval'; i.dispatchEvent(new Event('input'));"],
  ['m-login', MOB, '#/login'], ['m-home', MOB, '#/home'], ['m-leads', MOB, '#/leads'], ['m-pipeline', MOB, '#/pipeline'], ['m-orders', MOB, '#/orders'],
  ['m-deal', MOB, '#/deal/D-20261019-001'], ['m-deal-quote', MOB, '#/deal/D-20261101-005/quote'], ['m-deal-order', MOB, '#/deal/D-20261024-001/order'], ['m-deal-billing', MOB, '#/deal/D-20261019-001/billing'],
  ['m-inbox', MOB, '#/inbox'], ['m-thread', MOB, '#/inbox/t1'], ['m-ai', MOB, '#/home', "ACTIONS.openAssistant(); aiAsk('Aaj kitne orders late hain?');", false, 1800], ['m-more', MOB, '#/home', 'ACTIONS.more()'],
  ['m-portal', MOB, '#/portal/SO-1042'], ['m-store', MOB, '#/store'], ['m-stock', MOB, '#/stock'], ['m-billing', MOB, '#/billing'], ['m-customer', MOB, '#/customers/c1'],
  ['m-install', MOB, '#/home', "deferredPrompt = deferredPrompt || { prompt() {}, userChoice: Promise.resolve() }; showInstall();", false, 900]
];

await connect();
await send('Page.enable'); await send('Runtime.enable');
// The install prompt fires in headless on every load; keep it out of the shots (m-install shows it on purpose).
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { if (!/shot=m-install/.test(location.search)) sessionStorage.setItem('mq-install-dismissed', '1'); } catch (_) {}" });
const only = process.argv[2];
for (const [name, vp, hash, js, full, wait] of S) {
  if (only && !name.includes(only)) continue;
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  // A unique query string forces a full load, so panels and sheets from the previous shot don't carry over.
  await send('Page.navigate', { url: BASE + '?shot=' + name + hash });
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

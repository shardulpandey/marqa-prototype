// Screenshots for the Dashboard, Reports and Contacts modules (copy of shoot.mjs with these scenarios).
//   node tools/shoot-dash.mjs [filter]      (server must be running on :8834)
// Each scenario names a role; the page loads with sessionStorage 'mq-role' set before any script runs.
// Full-page shots are also cut into tiles (<name>-1.png, -2.png…) so they stay legible. Kills only the Chrome it started.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8834/';
const PORT = +process.env.CDP_PORT || 9300 + Math.floor(Math.random() * 600);
const OUT = new URL('../_shots/dash/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const prof = join(tmpdir(), 'mq-shootdash-' + PORT);
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
// [name, viewport, role, hash, js, full]
const S = [
  ...['founders', 'sales', 'ops', 'marketing'].flatMap(r => [[`d-dash-${r}`, DESK, r, '#/home', null, true], [`m-dash-${r}`, MOB, r, '#/home', null, true]]),
  ['d-dash-30d', DESK, 'founders', '#/home', "ACTIONS.dashRange({ dataset: { r: '30d' } })"],
  ['d-dash-list', DESK, 'founders', '#/home', "ACTIONS.dashList({ dataset: { k: 'booked' } })"],
  ['m-dash-list', MOB, 'sales', '#/home', "ACTIONS.dashList({ dataset: { k: 'followups' } })"],
  ['d-contacts', DESK, 'founders', '#/customers', null, true], ['m-contacts', MOB, 'founders', '#/customers', null, true],
  ['d-contacts-mk', DESK, 'marketing', '#/customers'], ['d-contacts-ops', DESK, 'ops', '#/customers'],
  ['d-contacts-matrix', DESK, 'founders', '#/customers?met=1&bought=1&from=2026-08-06&to=2026-11-04'],
  ['d-contacts-search', DESK, 'founders', '#/customers', "const q=document.getElementById('conQ'); q.value='9811'; q.dispatchEvent(new Event('input'))"],
  ['d-contact', DESK, 'founders', '#/customers/c1', null, true], ['m-contact', MOB, 'founders', '#/customers/c1', null, true],
  ['d-contact-mk', DESK, 'marketing', '#/customers/c5', null, true], ['d-contact-intl', DESK, 'sales', '#/customers/c10', null, true],
  ['d-contact-form', DESK, 'founders', '#/customers/c10', "ACTIONS.conEdit({ dataset: { id: 'c10' } })"], ['m-contact-form', MOB, 'sales', '#/customers', 'ACTIONS.conNew()'],
  ['d-contact-form-err', DESK, 'founders', '#/customers', "ACTIONS.conNew(); document.getElementById('cf-name').value='Test Person'; document.getElementById('cf-phone').value='12345'; ACTIONS.conSave({ dataset: {} })"],
  ['d-contact-dupphone', DESK, 'founders', '#/customers', "ACTIONS.conNew(); document.getElementById('cf-name').value='Ananya I'; document.getElementById('cf-phone').value='98110 24567'; document.getElementById('cf-code').value='WEB'; ACTIONS.conSave({ dataset: {} })"],
  ['d-merge', DESK, 'founders', '#/customers/c14', "ACTIONS.conMerge({ dataset: { id: 'c14' } }); ACTIONS.conMergePick({ dataset: { id: 'c2' } })"],
  ['m-merge', MOB, 'sales', '#/customers/c14', "ACTIONS.conMerge({ dataset: { id: 'c14' } }); ACTIONS.conMergePick({ dataset: { id: 'c2' } })"],
  ['d-merge-pick', DESK, 'founders', '#/customers/c14', "ACTIONS.conMerge({ dataset: { id: 'c14' } }); const q=document.getElementById('conMergeQ'); q.value='mal'; q.dispatchEvent(new Event('input'))"],
  ['d-dupes', DESK, 'founders', '#/customers', 'ACTIONS.conDupes()'], ['d-google', DESK, 'founders', '#/customers', 'ACTIONS.conGoogle()'],
  ['d-export', DESK, 'founders', '#/customers/c1', "ACTIONS.conExport({ dataset: { id: 'c1' } })"], ['m-export', MOB, 'founders', '#/customers/c1', "ACTIONS.conExport({ dataset: { id: 'c1' } })"],
  ['d-erase-guard', DESK, 'founders', '#/customers/c1', "ACTIONS.conErase({ dataset: { id: 'c1' } })"], ['d-erase', DESK, 'founders', '#/customers/c13', "ACTIONS.conErase({ dataset: { id: 'c13' } })"],
  ['d-wa', DESK, 'founders', '#/customers/c13', "ACTIONS.conWa({ dataset: { id: 'c13' } })"], ['m-call', MOB, 'marketing', '#/customers/c13', "ACTIONS.conCall({ dataset: { id: 'c13' } })"],
  ['d-reports', DESK, 'founders', '#/reports', null, true], ['m-reports', MOB, 'founders', '#/reports', null, true],
  ['d-reports-90d', DESK, 'founders', '#/reports', "ACTIONS.repRange({ dataset: { r: '90d' } })"], ['d-reports-sales', DESK, 'sales', '#/reports']
];

await connect();
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { sessionStorage.setItem('mq-install-dismissed', '1'); const m = location.search.match(/role=(\\w+)/); sessionStorage.setItem('mq-role', m ? m[1] : 'founders'); } catch (_) {}" });
const only = process.argv[2];
for (const [name, vp, role, hash, js, full] of S) {
  if (only && !name.includes(only)) continue;
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await send('Page.navigate', { url: BASE + '?shot=' + name + '&role=' + role + hash });
  await sleep(1300);
  await evaluate(`location.hash !== ${JSON.stringify(hash)} ? (location.hash = ${JSON.stringify(hash)}) : render(); window.scrollTo(0,0); 1`);
  await sleep(500);
  if (js) { const err = await evaluate(`try { ${js}; 'ok' } catch (e) { 'ERR ' + e.message }`); if (err !== 'ok') console.log(name, err); }
  await sleep(800);
  const errs = await evaluate('window.__errs || []');
  const bad = await evaluate(`(() => { const t = (document.getElementById('app')?.innerText || '') + ' ' + (document.getElementById('layer')?.innerText || ''); const m = t.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\bnull\\b|Infinity|\\[object).{0,30}/g); return m ? m.slice(0, 4) : []; })()`);
  const over = await evaluate('document.documentElement.scrollWidth') - vp.width;
  if (over > 0) console.log(name, 'OVERFLOW x by', over, 'px:', await evaluate(`[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > ${vp.width} + 0.5 && !e.closest('.board,.tabs,.seg,.hscroll,.tbl-wrap')).filter((e, _, all) => !all.includes(e.parentElement)).slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' w=' + Math.round(e.getBoundingClientRect().width) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"').join(' | ')`));
  const shot = async (file, clip) => { const r = await send('Page.captureScreenshot', clip ? { format: 'png', clip, captureBeyondViewport: true } : { format: 'png' }); writeFileSync(join(OUT, file), Buffer.from(r.result.data, 'base64')); };
  if (full) {
    const h = Math.min(await evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'), 9000);
    await send('Emulation.setDeviceMetricsOverride', { ...vp, height: h });
    await sleep(600);
    await shot(name + '.png');
    const step = vp.mobile ? 1000 : 1100;
    if (h > step * 1.15) for (let y = 0, i = 1; y < h; y += step, i++) await shot(`${name}-${i}.png`, { x: 0, y, width: vp.width, height: Math.min(step, h - y), scale: 1 });
  } else await shot(name + '.png');
  console.log('shot', name, errs && errs.length ? 'ERRORS ' + JSON.stringify(errs) : '', bad && bad.length ? 'BADTEXT ' + JSON.stringify(bad) : '');
}
ws.close(); chrome.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}

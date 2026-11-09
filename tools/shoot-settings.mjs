// Screenshots of Settings (every tab), Data and Messages, as founders and as other roles, desktop 1440 and phone 390.
//   node tools/shoot-settings.mjs [filter]      (server must be running on :8834)
// Writes PNGs to _shots/set/. Long pages are cut into viewport-sized segments (name-1.png, name-2.png …) so they stay readable.
// A scenario's role is set in sessionStorage before any script runs. Kills only the Chrome it started.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8834/';
const PORT = +process.env.CDP_PORT || 9300 + Math.floor(Math.random() * 600);
const OUT = new URL('../_shots/set/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const prof = join(tmpdir(), 'mq-shoot-set-' + PORT);
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

const D = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const M = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
const TABS = ['rates', 'sheets', 'rules', 'options', 'workflow', 'boundaries', 'people', 'access', 'session', 'business', 'integrations', 'compliance'];
// [name, viewport, hash, role, js, full]
const S = [
  ...TABS.flatMap(t => [['d-set-' + t, D, '#/settings/' + t, 'founders', null, true], ['m-set-' + t, M, '#/settings/' + t, 'founders', null, true]]),
  ['d-set-root', D, '#/settings', 'founders'],
  ['d-data', D, '#/data', 'founders', null, true], ['m-data', M, '#/data', 'founders', null, true],
  ['d-messages', D, '#/messages', 'founders', null, true], ['m-messages', M, '#/messages', 'founders', null, true],
  // flows and layers
  ['d-set-sheets-edit', D, '#/settings/sheets', 'founders', "ACTIONS.setBand({dataset:{band:'GHI'}}); const c=document.querySelector('[data-cell]'); c.value='9999'; c.dispatchEvent(new Event('change'));"],
  ['d-set-sizeadd', D, '#/settings/sheets', 'founders', 'ACTIONS.setSizeAdd()'],
  ['d-set-user-new', D, '#/settings/people', 'founders', 'ACTIONS.setUserNew()'], ['m-set-user-edit', M, '#/settings/people', 'founders', "ACTIONS.setUserEdit({dataset:{id:'u2'}})"],
  ['d-set-access-grant', D, '#/settings/access', 'founders', "const cb=document.querySelector('[data-perm=\"sales|reports\"]'); cb.checked=true; cb.dispatchEvent(new Event('change'));"],
  ['d-set-sales-reports', D, '#/settings/access', 'founders', "const cb=document.querySelector('[data-perm=\"sales|reports\"]'); cb.checked=true; cb.dispatchEvent(new Event('change')); ACTIONS.setAccessSave(); setRole('sales'); render();"],
  ['d-set-opt-off', D, '#/settings/options', 'founders', "ACTIONS.setOptDel({dataset:{key:'source_channels',i:'4'}})"],
  ['d-set-integ-wa', D, '#/settings/integrations', 'founders', "ACTIONS.setInteg({dataset:{k:'wa'}})"], ['m-set-integ-igi', M, '#/settings/integrations', 'founders', "ACTIONS.setInteg({dataset:{k:'igi'}}); ACTIONS.setIgiLook();"],
  ['d-set-stage-rename', D, '#/settings/workflow', 'founders', "ACTIONS.setStageRename({dataset:{stage:'QC'}})"],
  ['d-set-logo', D, '#/settings/business', 'founders', 'ACTIONS.setLogo(); ACTIONS.setLogoPick({dataset:{v:"gold"}})'],
  ['d-data-preview', D, '#/data', 'founders', 'ACTIONS.datPick(); ACTIONS.datPreview();'], ['m-data-preview', M, '#/data', 'founders', 'ACTIONS.datPick(); ACTIONS.datPreview();', true],
  ['d-data-done', D, '#/data', 'founders', 'ACTIONS.datPick(); ACTIONS.datPreview(); ACTIONS.datImport();'],
  ['d-data-zoho', D, '#/data', 'founders', "ACTIONS.datZohoPreview(); document.querySelector('.dat-pre').scrollIntoView();"],
  ['d-data-undo-refused', D, '#/data', 'founders', "ACTIONS.datUndo({dataset:{id:'b14'}})"], ['m-data-purge', M, '#/data', 'founders', "ACTIONS.datPurge({dataset:{i:'0'}})"],
  ['d-msg-edit', D, '#/messages', 'founders', "ACTIONS.msgEdit({dataset:{key:'P2'}})"], ['m-msg-preview', M, '#/messages', 'founders', "ACTIONS.msgPreview({dataset:{key:'L3'}})"], ['m-msg-new', M, '#/messages', 'founders', 'ACTIONS.msgNew()'],
  // other roles
  ['d-ops-settings', D, '#/settings', 'ops'], ['m-ops-settings', M, '#/settings', 'ops', null, true], ['d-ops-rules', D, '#/settings/rules', 'ops'],
  ['d-ops-data', D, '#/data', 'ops'], ['d-ops-messages', D, '#/messages', 'ops', null, true],
  ['d-mkt-settings', D, '#/settings', 'marketing', null, true], ['m-mkt-settings', M, '#/settings', 'marketing', null, true], ['d-mkt-messages', D, '#/messages', 'marketing'], ['m-mkt-messages', M, '#/messages', 'marketing'],
  ['d-sales-settings', D, '#/settings', 'sales'], ['d-sales-messages', D, '#/messages', 'sales']
];

await connect();
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { sessionStorage.setItem('mq-install-dismissed', '1'); const r = new URLSearchParams(location.search).get('role'); if (r) sessionStorage.setItem('mq-role', r); } catch (_) {}" });
const only = process.argv[2];
let problems = 0;
for (const [name, vp, hash, role, js, full] of S) {
  if (only && !name.includes(only)) continue;
  for (const f of readdirSync(OUT)) if (f === name + '.png' || f.startsWith(name + '-')) rmSync(join(OUT, f));
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await send('Page.navigate', { url: BASE + '?shot=' + name + '&role=' + (role || 'founders') + hash });
  await sleep(1200);
  await evaluate(`location.hash !== ${JSON.stringify(hash)} ? (location.hash = ${JSON.stringify(hash)}) : render(); window.scrollTo(0,0); 1`);
  await sleep(450);
  if (js) { const e = await evaluate(`try { ${js}; 'ok' } catch (e) { 'ERR ' + e.message }`); if (e !== 'ok') { console.log(name, e); problems++; } }
  await sleep(600);
  const errs = await evaluate('window.__errs || []');
  const over = await evaluate('document.documentElement.scrollWidth') - vp.width;
  if (over > 0) { problems++; console.log(name, 'OVERFLOW x by', over, 'px:', await evaluate(`[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > ${vp.width} + 0.5 && !e.closest('.tbl-wrap,.set-nav,.seg,.dat-pre,.tabs')).filter((e, _, all) => !all.includes(e.parentElement)).slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' w=' + Math.round(e.getBoundingClientRect().width) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"').join(' | ')`)); }
  const bad = await evaluate(`(() => { const t = (document.getElementById('app')?.innerText || '') + ' ' + (document.getElementById('layer')?.innerText || ''); const m = t.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|\\bnull\\b|Infinity).{0,30}/g); return m ? [...new Set(m)].slice(0, 4) : []; })()`);
  if (bad && bad.length) { problems++; console.log(name, 'BAD TEXT', JSON.stringify(bad)); }
  if (errs && errs.length) { problems++; console.log(name, 'ERRORS', JSON.stringify(errs)); }
  const layerOpen = await evaluate("!!document.querySelector('#layer > *')");
  if (full && !layerOpen) {
    const h = Math.min(await evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'), 9000);
    await send('Emulation.setDeviceMetricsOverride', { ...vp, height: h });
    await sleep(500);
    const seg = vp.mobile ? 1200 : 1100; let n = 0;
    for (let y = 0; y < h; y += seg) {
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y, width: vp.width, height: Math.min(seg, h - y), scale: 1 } });
      writeFileSync(join(OUT, `${name}-${++n}.png`), Buffer.from(shot.result.data, 'base64'));
    }
    console.log('shot', name, n + ' segments', 'h=' + h);
  } else {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('shot', name);
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nno overflow, no errors, no bad text');
ws.close(); chrome.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}

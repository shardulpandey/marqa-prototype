// Screenshots of the SaaS screens (sign-in, plans, inbox, campaigns, store, studio, portal, billing, schemes,
// karigars, assistant): a copy of shoot.mjs with its own scenarios. PNGs go to _shots/saas/.
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
mkdirSync(join(OUT, 'saas'), { recursive: true });
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
  ['d-login', DESK, '#/login'], ['d-login-email', DESK, '#/login', 'ACTIONS.authEmail()'], ['d-login-otp', DESK, '#/login', 'ACTIONS.authSend()'],
  ['d-signup', DESK, '#/signup', 'WIZ.step=0;render()'], ['d-signup-2', DESK, '#/signup', 'WIZ.step=1;render()'], ['d-signup-3', DESK, '#/signup', 'WIZ.step=2;render();ACTIONS.wizSheet()'], ['d-signup-4', DESK, '#/signup', 'WIZ.step=3;render();ACTIONS.wizAdd()'], ['d-signup-5', DESK, '#/signup', "WIZ.step=4;render();ACTIONS.wizConnect({dataset:{i:'0'}})"],
  ['d-plans', DESK, '#/plans'], ['d-plans-switch', DESK, '#/plans', "ACTIONS.planSwitch({dataset:{p:'Growth'}})"], ['d-plans-manage', DESK, '#/plans', 'ACTIONS.planManage()'], ['d-plans-pending', DESK, '#/plans', "ACTIONS.planConfirm({dataset:{p:'Studio'}})"],
  ['d-notifs', DESK, '#/inbox', 'ACTIONS.notifs()'],
  ['d-inbox', DESK, '#/inbox/t1'], ['d-inbox-t4', DESK, '#/inbox/t4'], ['d-inbox-tpl', DESK, '#/inbox/t3', "ACTIONS.inbTpl({dataset:{t:'t3'}})"], ['d-inbox-attach', DESK, '#/inbox/t1', "ACTIONS.inbAttach({dataset:{t:'t1'}})"],
  ['d-inbox-visit', DESK, '#/inbox/t2', "ACTIONS.inbVisit({dataset:{t:'t2'}})"], ['d-inbox-call', DESK, '#/inbox/t6', "ACTIONS.inbCall({dataset:{t:'t6'}})"], ['d-inbox-sent', DESK, '#/inbox/t1', "document.querySelector('[data-act=inbSugg]').click(); document.querySelector('[data-act=inbSend]').click()", false, 2800],
  ['d-campaigns', DESK, '#/campaigns'], ['d-campaign-new', DESK, '#/campaigns', 'ACTIONS.newCampaign()'], ['d-campaign-open', DESK, '#/campaigns', "ACTIONS.cmpOpen({dataset:{id:'cp3'}})"],
  ['d-store', DESK, '#/store', "STORE_TAB='popup';render()"], ['d-store-req', DESK, '#/store', "STORE_TAB='requests';render()"], ['d-store-req-sheet', DESK, '#/store', "STORE_TAB='requests';render();ACTIONS.stoReq({dataset:{id:'W-310'}})"], ['d-store-sync', DESK, '#/store', "STORE_TAB='sync';render()"],
  ['d-studio', DESK, '#/studio', "STUDIO_TAB='photo';render()"], ['d-studio-listing', DESK, '#/studio', "STUDIO_TAB='listing';render();ACTIONS.genListing()", false, 2500], ['d-studio-estimate', DESK, '#/studio', "STUDIO_TAB='estimate';render()"],
  ['d-billing', DESK, '#/billing'], ['d-billing-full', DESK, '#/billing', null, true], ['d-billing-done', DESK, '#/billing', 'ACTIONS.billDone()'], ['d-billing-list', DESK, '#/billing', 'ACTIONS.billList()'], ['d-billing-search', DESK, '#/billing', "const q=document.getElementById('billQ'); q.value='FJ-22'; q.dispatchEvent(new Event('input'))"],
  ['d-schemes', DESK, '#/schemes'], ['d-schemes-report', DESK, '#/schemes', 'ACTIONS.schReport()'], ['d-schemes-enrol', DESK, '#/schemes', 'ACTIONS.schEnrol()'], ['d-schemes-redeem', DESK, '#/schemes', "ACTIONS.schRedeem({dataset:{c:'c11'}})"],
  ['d-production', DESK, '#/production'], ['d-karigar', DESK, '#/production/k1'], ['d-karigar-issue', DESK, '#/production/k1', "ACTIONS.kgMove({dataset:{dir:'issue',k:'k1'}})"], ['d-karigar-receive', DESK, '#/production', "ACTIONS.kgMove({dataset:{dir:'receive'}})"], ['d-karigar-msg', DESK, '#/production/k1', "ACTIONS.kgMsg({dataset:{k:'k1'}})"], ['d-karigar-assign', DESK, '#/production/k3', "ACTIONS.kgAssign({dataset:{k:'k3'}})"],
  ['d-portal', DESK, '#/portal/MQ-1042'],
  ['d-ai', DESK, '#/inbox', "ACTIONS.openAssistant(); aiAsk('What needs my attention today?'); setTimeout(()=>aiAsk('Price a 1 ct round solitaire in 18K'),900);", false, 2600],
  ['d-ai2', DESK, '#/inbox', "ACTIONS.openAssistant(); aiAsk('Which karigar is holding metal?'); setTimeout(()=>aiAsk('Draft a follow-up for Harsh Agarwal'),900);", false, 2600],
  ['d-ai3', DESK, '#/inbox', "ACTIONS.openAssistant(); aiAsk('Which follow-ups are due?'); setTimeout(()=>aiAsk('How did Instagram do?'),900);", false, 2600],
  ['d-ai4', DESK, '#/inbox', "ACTIONS.openAssistant(); aiAsk('Who has an anniversary this month?'); setTimeout(()=>aiAsk('What diamonds are in the safe?'),900);", false, 2600],
  ['m-login', MOB, '#/login'], ['m-signup', MOB, '#/signup', 'WIZ.step=3;render()'], ['m-plans', MOB, '#/plans', null, true],
  ['m-portal', MOB, '#/portal/MQ-1042', null, true], ['m-portal-qc', MOB, '#/portal/SO-1040', null, true], ['m-portal-done', MOB, '#/portal/D-20261003-002', null, true], ['m-portal-cert', MOB, '#/portal/MQ-1042', "ACTIONS.porCert({dataset:{d:'D-20261019-001',c:'LG620419872'}})"], ['m-portal-chat', MOB, '#/portal/MQ-1042', "ACTIONS.porChat({dataset:{d:'D-20261019-001'}})"],
  ['m-inbox', MOB, '#/inbox'], ['m-thread', MOB, '#/inbox/t1'], ['m-thread-t4', MOB, '#/inbox/t4'], ['m-inbox-visit', MOB, '#/inbox/t2', "ACTIONS.inbVisit({dataset:{t:'t2'}})"],
  ['m-ai', MOB, '#/inbox', "ACTIONS.openAssistant(); aiAsk('Aaj kitne orders late hain?');", false, 1800],
  ['m-store', MOB, '#/store', "STORE_TAB='popup';render()"], ['m-store-req', MOB, '#/store', "STORE_TAB='requests';render()"], ['m-studio', MOB, '#/studio', "STUDIO_TAB='estimate';render()", true],
  ['m-billing', MOB, '#/billing', null, true], ['m-billing-inv', MOB, '#/billing', 'ACTIONS.billDone()'], ['m-schemes', MOB, '#/schemes', null, true], ['m-campaigns', MOB, '#/campaigns', null, true],
  ['m-production', MOB, '#/production', null, true], ['m-karigar', MOB, '#/production/k1', null, true]
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
  const bad = await evaluate(`(() => { const t = document.body.innerText; const m = t.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|\\bnull\\b|Infinity).{0,30}/g); return m ? [...new Set(m)].slice(0, 4) : []; })()`);
  if (bad && bad.length) console.log(name, 'BAD TEXT', JSON.stringify(bad));
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
  writeFileSync(join(OUT, 'saas', name + '.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('shot', name, errs && errs.length ? 'ERRORS ' + JSON.stringify(errs) : '');
}
ws.close(); chrome.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}

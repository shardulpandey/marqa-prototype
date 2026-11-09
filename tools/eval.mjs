// Evaluate a JS expression on a route in an isolated headless Chrome and print the JSON result.
//   node tools/eval.mjs '#/route' 'expression' [mobile]
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PORT = 9300 + Math.floor(Math.random() * 600), prof = join(tmpdir(), 'mq-eval-' + PORT);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 40; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.addEventListener('open', r));
let seq = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const mob = process.argv[4] === 'mobile';
await send('Emulation.setDeviceMetricsOverride', mob ? { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{sessionStorage.setItem('mq-install-dismissed','1')}catch(_){}" });
await send('Page.navigate', { url: 'http://localhost:8834/?e=' + Date.now() + process.argv[2] }); await sleep(1400);
const r = await send('Runtime.evaluate', { expression: process.argv[3], awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(r.result.exceptionDetails ? r.result.exceptionDetails.exception.description : r.result.result.value, null, 1));
ws.close(); chrome.kill(); await sleep(200); try { rmSync(prof, { recursive: true, force: true }); } catch (_) {}

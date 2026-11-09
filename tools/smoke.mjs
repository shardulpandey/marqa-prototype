// Load every script in index.html order inside a fake DOM-less context and report the first error.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const store = {};
const noop = () => {};
const el = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : el, apply: () => el, construct: () => el, set: () => true });
const ctx = { console, setTimeout, clearTimeout, setInterval, Date, Math, JSON, Intl, Promise, URL, sessionStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, localStorage: { getItem: () => null, setItem: noop },
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: el, documentElement: el, title: '' },
  location: { hash: '#/home', replace: noop, search: '' }, navigator: { serviceWorker: { register: () => Promise.resolve() }, userAgent: '' }, history: { length: 1, back: noop },
  addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), innerWidth: 1440, scrollTo: noop, requestAnimationFrame: noop };
ctx.window = ctx; vm.createContext(ctx);
for (const s of srcs) {
  try { vm.runInContext(readFileSync(new URL('../' + s, import.meta.url), 'utf8'), ctx, { filename: s }); }
  catch (e) { console.log('FAIL in', s, '\n', e.stack.split('\n').slice(0, 4).join('\n')); if (s !== 'js/app.js') process.exit(1); }
}
const r = vm.runInContext(`({ deals: DEALS.length, contacts: CONTACTS.length, stock: STOCK_ITEMS.length,
  sample: DEALS.slice(0, 28).map(d => d.id + ' ' + d.stage + ' total=' + Math.round(d.calc.total) + ' bal=' + Math.round(money(d).balance) + ' miss=' + moveCheck(d, (nextStages(d)[0][1][0] || {}).key || d.stage).items.length + '/' + moveCheck(d, (nextStages(d)[0][1][0] || {}).key || d.stage).gates.length),
  backtest: computeLive({ purity: '14K', gold_rate_24k: 15600, gold_wt: 3.2, lines: [{ ct: 3, rate: 35000 }], making_rate: 1400, gst_pct: 3, usd_rate: 95, usd_spread: 2 }) })`, ctx);
console.log(JSON.stringify(r, null, 1));

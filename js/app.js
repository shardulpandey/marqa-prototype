/* Shell, router, navigation, search, install prompt */

// [key, label, icon, count, hot, permission]
const NAV = [
  { g: null, items: [['home', 'Dashboard', 'home']] },
  { g: 'Sell', items: [['leads', 'Leads', 'plus', 3], ['pipeline', 'Pipeline', 'funnel'], ['customers', 'Contacts', 'users'], ['quotes', 'Quotes', 'file'], ['inbox', 'WhatsApp inbox', 'chat', 3, true], ['messages', 'Messages', 'send'], ['campaigns', 'Campaigns', 'megaphone']] },
  { g: 'Make', items: [['orders', 'Orders', 'board', 1], ['demand', 'Demand', 'scale', 1, false, 'demand'], ['production', 'Karigars', 'hammer'], ['stock', 'Stock', 'gem', null, false, 'stock']] },
  { g: 'Grow', items: [['store', 'Online store', 'store', 1], ['studio', 'AI Studio', 'sparkles'], ['schemes', 'Gold schemes', 'coins']] },
  { g: 'Money', items: [['billing', 'Counter billing', 'receipt', null, false, 'payments.write'], ['reports', 'Reports', 'chart', null, false, 'reports']] },
  { g: 'Admin', items: [['data', 'Data', 'layers', null, false, 'data'], ['settings', 'Settings', 'settings']] }
];
// Live counts beside nav items
const navCount = k => { const L = dealsVisible().filter(d => !d.deleted); return { leads: L.filter(d => d.stage === 'New').length, orders: L.filter(d => lateBadge(d) === 'late').length,
  demand: L.filter(d => ['Order Confirmed', 'CAD In Progress', 'CAD Sent', 'CAD Approved', 'In Production', 'QC'].includes(d.stage) && !typeSkips(d).includes('CAD In Progress') && !(d.gold_issued_at && d.diamonds_issued_at)).length }[k]; };
const navAllowed = perm => !perm || (perm === 'data' ? isFounder() || can('import') || can('export.all') : can(perm));
const TABS = [['home', 'Home', 'home'], ['pipeline', 'Pipeline', 'funnel'], ['leads', 'Capture', 'plus'], ['inbox', 'Inbox', 'chat', 3]];

// Old links (enquiries/E-2291, orders/MQ-1042, quotes/MQ-...) land on the deal they belong to.
function parse() {
  const [name, id, sub] = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'login').split('/').map(x => x && decodeURIComponent(x));
  const toDeal = x => { const d = dealById(x) || DEALS.find(z => z.quote_no === x); return d ? { name: 'deal', id: d.id, sub: sub || null, redirect: true } : null; };
  if (name === 'enquiries') return (id && toDeal(id)) || { name: 'leads', id: null, redirect: true };
  if (name === 'orders' && id) return toDeal(id) || { name: 'orders', id: null, redirect: true };
  if (name === 'quotes' && id) return (id !== 'new' && toDeal(id)) || { name: 'quotes', id: null, redirect: id !== 'new' ? true : 'new' };
  if (name === 'contacts') return { name: 'customers', id: id || null, redirect: true };
  return { name: SCREENS[name] ? name : 'home', id: id || null, sub: sub || null };
}

// Readable name for a detail route; ids like "c1" or "t1" mean nothing to a person.
function subTitle(p) {
  if (p.name === 'deal') { const d = dealById(p.id); return d ? dealContact(d).name : p.id; }
  if (p.name === 'customers') { const c = contactById(p.id); return c ? c.name : p.id; }
  if (p.name === 'inbox') { const t = THREADS.find(x => x.id === p.id); return t ? cust(t.cust).name : p.id; }
  if (p.name === 'production') { const k = karigar(p.id); return k ? k.name : p.id; }
  if (p.name === 'stock') { const it = STOCK_ITEMS.find(x => x.id === p.id || x.code === p.id); return it ? it.code : p.id; }
  return p.id;
}
const crumbParent = p => p.name === 'deal' ? { href: '#/pipeline', title: 'Pipeline' } : null;

function shell(S, p, inner) {
  const nav = NAV.filter(sec => sec.items.some(it => navAllowed(it[5]))).map(sec => `<div class="nav-group">${sec.g ? `<div class="gh">${sec.g}</div>` : ''}<nav class="nav">${sec.items.filter(it => navAllowed(it[5])).map(([k, n, ic, cnt0, hot]) => { const cnt = navCount(k) ?? cnt0; return `<a href="#/${k}" class="${S.nav === k ? 'on' : ''}">${icon(ic)}${n}${cnt ? `<span class="cnt ${hot ? 'hot' : ''}">${cnt}</span>` : ''}</a>`; }).join('')}</nav></div>`).join('');
  const me = viewUser(), par = crumbParent(p) || { href: '#/' + p.name, title: S.title };
  const sub = p.id && !['settings'].includes(p.name);
  const crumbs = sub ? `<a href="${par.href}">${par.title}</a>${icon('chevR', 'sm')}<b>${esc(subTitle(p))}</b>` : `<b>${S.title}</b>`;
  return `<div class="shell">
    <aside class="side">
      <div class="brand">${BRAND.wordmark('wm')}</div>
      <button class="store" data-act="storeSwitch"><span class="sq">${BRAND.q('')}</span><span class="grow"><b style="font-weight:600;font-size:13px">Lajpat Nagar</b><small>MARQA · 2 stores</small></span>${icon('chevD', 'sm')}</button>
      ${nav}
      <div class="foot"><button class="who" data-act="viewAs" title="View the app as another role">${av(me.name, me.color === '#1A1A1A' ? '#8C6D3F' : me.color, 'sm')}<span class="grow"><span style="display:block;color:#EDE9E2;font-size:13px;font-weight:600">${me.name}</span><span class="vrole">${ROLES[VIEW.role]} · view as ▾</span></span></button>
        <button class="icon-btn" style="background:transparent;border-color:#2E2C2A;color:#BDB7AE" data-act="protoMap" title="Prototype map">${icon('grid', 'sm')}</button></div>
    </aside>
    <div class="main">
      <header class="topbar"><div class="crumbs">${crumbs}</div>
        <button class="search" data-act="palette">${icon('search', 'sm')}Search deals, contacts, stones<kbd>Ctrl K</kbd></button>
        <div class="rate-chip num" data-go="#/settings/rates" title="Today's metal rates"><span class="dot"></span>24K <b>${inr(SETTINGS.gold_rate_24k)}</b><span class="muted">/g</span></div>
        <button class="icon-btn" data-act="notifs" aria-label="Notifications">${icon('bell')}<span class="pip"></span></button>
        <button class="ai-btn" data-act="openAssistant">${icon('sparkles', 'sm')}Ask AI</button>
      </header>
      <header class="mob-top">${sub ? `<button class="icon-btn back" data-act="back" aria-label="Back">${icon('chevL')}</button>` : `<span class="sq" style="width:32px;height:32px;border-radius:9px;background:var(--ink);display:grid;place-items:center">${BRAND.q('')}</span>`}
        <div class="ttl truncate">${sub ? esc(subTitle(p)) : S.title}</div>
        <button class="icon-btn" data-act="palette" aria-label="Search">${icon('search')}</button><button class="icon-btn" data-act="notifs" aria-label="Notifications">${icon('bell')}<span class="pip"></span></button></header>
      <main class="content" id="view">${inner}</main>
    </div>
    <nav class="tabbar">${TABS.map(([k, n, ic, b]) => `<a href="#/${k}" class="${S.nav === k || (k === 'pipeline' && ['orders', 'quotes', 'deal'].includes(S.nav)) ? 'on' : ''}">${icon(ic)}${n}${b ? `<span class="b">${b}</span>` : ''}</a>`).join('')}
      <a href="javascript:void 0" data-act="more" class="${!['home', 'pipeline', 'orders', 'quotes', 'deal', 'leads', 'inbox'].includes(S.nav) ? 'on' : ''}">${icon('grid')}More</a></nav>
    <button class="fab" data-act="openAssistant" aria-label="Ask AI">${icon('sparkles', 'lg')}</button>
  </div>`;
}

function render() {
  const p = parse();
  if (p.redirect) { const h = '#/' + p.name + (p.id ? '/' + p.id : '') + (p.sub ? '/' + p.sub : ''); history.replaceState(null, '', h); lastHash = h; if (p.redirect === 'new') setTimeout(() => ACTIONS.newQuotePick && ACTIONS.newQuotePick(), 0); }
  const S = SCREENS[p.name];
  const inner = S.render(p);
  const app = document.getElementById('app');
  app.innerHTML = S.chrome === false ? inner : shell(S, p, inner);
  document.title = (p.id ? subTitle(p) + ' · ' : '') + S.title + ' · MARQA Pipeline';
  if (S.mount) S.mount(app, p);
}

/* ---------- navigation helpers ---------- */
let lastHash = '';
window.addEventListener('hashchange', () => {
  closeLayer();
  const base = h => h.split('/').slice(0, 2).join('/');
  const sameBase = base(location.hash) === base(lastHash);
  lastHash = location.hash; render();
  if (!sameBase || !location.hash.includes('/inbox')) window.scrollTo(0, 0);
});
ACTIONS.close = () => closeLayer();
ACTIONS.back = () => history.length > 1 ? history.back() : go('#/' + parse().name);
ACTIONS.more = () => openSheet({ title: 'All modules', body: `<div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:10px">${NAV.flatMap(s => s.items).filter(it => navAllowed(it[5])).map(([k, n, ic]) =>
    `<a href="#/${k}" class="card" style="padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center"><span class="badge gold" style="width:40px;height:40px;padding:0;justify-content:center;border-radius:12px">${icon(ic)}</span><span class="small strong">${n}</span></a>`).join('')}</div>
    <div class="stack-s mt-16"><button class="btn block" data-act="viewAs">${icon('users')}View as: ${ROLES[VIEW.role]}</button><button class="btn block" data-act="protoMap">${icon('grid')}Prototype map</button><button class="btn block" data-act="installHelp">${icon('download')}Add to home screen</button></div>` });
ACTIONS.storeSwitch = () => openModal(`<div class="card-b" style="padding:18px"><div class="label">Switch store</div><div class="list mt-8">${['Lajpat Nagar showroom', 'Online store (marqa.in)', 'All stores'].map((s, i) => `<div class="li" data-act="close">${icon(i === 1 ? 'globe' : i === 2 ? 'layers' : 'store')}<span class="grow">${s}</span>${i === 0 ? icon('check') : ''}</div>`).join('')}</div></div>`);

ACTIONS.viewAs = () => openSheet({ title: 'View as', sub: 'See exactly what each role can see and do. Founders always see everything.',
  body: `<div class="list card">${Object.entries(ROLES).map(([r, n]) => { const u = USERS.find(x => x.role === r && x.active); return `<div class="li" data-act="setRole" data-role="${r}">${av(u.name, u.color, 'sm')}<div class="grow"><div class="strong">${n} · ${u.name}</div><div class="xs muted">${{ founders: 'Everything, always. Delete, restore, overrides, exports.', sales: 'Leads, quotes, orders up to S1, payments, stock read-only.', ops: 'Orders S1–S6, QC, payments, Demand, stock. Sees only order-stage deals.', marketing: 'Leads, dashboards, templates. Phones masked, no money.' }[r]}</div></div>${VIEW.role === r ? icon('check') : ''}</div>`; }).join('')}</div>
    <div class="small muted mt-12">Permissions per role are set in Settings → Access.</div>` });
ACTIONS.setRole = el => { setRole(el.dataset.role); closeLayer(); render(); toast('Viewing as ' + ROLES[VIEW.role], 'users'); };

/* prototype map: every flow in one place */
ACTIONS.protoMap = () => openSheet({ title: 'Prototype map', sub: 'Every flow in this prototype', wide: true,
  body: [['Getting started', [['Sign in with OTP', '#/login'], ['New jeweller setup (5 steps)', '#/signup'], ['Plans and billing', '#/plans']]],
    ['Selling: one record from enquiry to delivery', [['Dashboard by role (try View as in the sidebar)', '#/home'], ['Capture a lead (voice, duplicate check)', '#/leads'], ['Pipeline: 18 stages, board and list', '#/pipeline'], ['Deal at New: first reply SLA', '#/deal/D-20261104-003'], ['Quote builder with rate sheet and versions', '#/deal/D-20261101-005/quote'], ['Stale quote: re-price', '#/deal/D-20261101-002/quote'], ['Negotiating: blocked until the advance', '#/deal/D-20261102-001'], ['International: size double-check', '#/deal/D-20261102-004/quote'], ['All quotes', '#/quotes'], ['Contacts and client profiles', '#/customers/c1'], ['WhatsApp inbox with AI', '#/inbox/t1'], ['Message templates and Due now', '#/messages'], ['Campaigns', '#/campaigns']]],
    ['Making', [['Orders board', '#/orders'], ['Order confirmed: karigar order sheet', '#/deal/D-20261024-001/order'], ['Awaiting metal and diamonds', '#/deal/D-20261016-002/order'], ['In production (late)', '#/deal/D-20261008-002'], ['QC: the 33-point form', '#/deal/D-20261017-002/order'], ['Ready: pre-delivery and balance', '#/deal/D-20261009-003'], ['Demand panel: issue metal and stones', '#/demand'], ['Karigars and metal balances', '#/production'], ['Stock ledger', '#/stock']]],
    ['Growing', [['Shopify custom-order popup', '#/store'], ['AI photo studio and listings', '#/studio'], ['Gold savings schemes', '#/schemes'], ['Client portal (client view)', '#/portal/SO-1042']]],
    ['Money and admin', [['Billing on a deal', '#/deal/D-20261019-001/billing'], ['Counter billing with old gold', '#/billing'], ['Reports: walk-in × purchase, client profiles', '#/reports'], ['Data: import, export, Trash', '#/data'], ['Settings: rates and rate sheets', '#/settings/rates'], ['Access: roles × permissions', '#/settings/access'], ['Options: every picklist', '#/settings/options'], ['People', '#/settings/people']]]]
    .map(([g, rows]) => `<div class="label ${g === 'Getting started' ? '' : 'mt-24'}">${g}</div><div class="card mt-8"><div class="list">${rows.map(([n, h]) => `<a class="li" href="${h}"><span class="grow">${n}</span><span class="xs muted">${h.replace('#/', '')}</span>${icon('chevR', 'sm')}</a>`).join('')}</div></div>`).join('')
    + `<div class="label mt-24">Also try</div><div class="card mt-8"><div class="card-b small ink2">Ctrl K to search · Ask AI (bottom right on a phone) · View as Sales, Ops or Marketing from the sidebar to see what each role sees · on a deal, click a later stage on the ladder to see the gates · type an existing client’s number in Leads.</div></div>` });

/* ---------- search palette ---------- */
ACTIONS.palette = () => {
  openModal(`<div class="palette"><div class="pin">${icon('search')}<input id="palIn" placeholder="Search deals, orders, contacts, stones, screens"><kbd class="xs muted">Esc</kbd></div><div class="res" id="palRes"></div></div>`, '', m => {
    const inp = m.querySelector('#palIn'), res = m.querySelector('#palRes');
    const all = [
      ...dealsVisible().map(d => ({ g: isOrder(d) ? 'Orders' : 'Deals', t: `${d.order_no || d.id} · ${dealTitle(d)}`, s: dealContact(d).name + ' · ' + stg(d.stage).label, h: '#/deal/' + d.id, ic: isOrder(d) ? 'board' : 'funnel', k: [d.quote_no, d.legacy, d.tag_no, dealContact(d).phone].join(' ') })),
      ...CONTACTS.map(c => ({ g: 'Contacts', t: c.name, s: maskPhone(c.phone) + ' · ' + c.city, h: '#/customers/' + c.id, ic: 'user', k: c.email + ' ' + c.instagram })),
      ...(can('stock') ? STOCK_ITEMS.map(x => ({ g: 'Stock', t: x.title || `${x.code} · ${x.carat ? x.carat.toFixed(2) + ' ct ' : ''}${x.shape || x.item_type || ''}`, s: STOCK_KINDS[x.kind] + ' · ' + STOCK_STATUS[stockBal(x).status][0], h: '#/stock/' + x.id, ic: 'gem', k: x.cert_no || '' })) : []),
      ...NAV.flatMap(s => s.items).filter(it => navAllowed(it[5])).map(([k, n, ic]) => ({ g: 'Go to', t: n, s: '', h: '#/' + k, ic }))
    ];
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      const hits = (q ? all.filter(a => (a.t + ' ' + a.s + ' ' + (a.k || '')).toLowerCase().includes(q)) : all.filter(a => a.g === 'Go to' || a.g === 'Orders').slice(0, 9)).slice(0, 14);
      const groups = [...new Set(hits.map(h => h.g))];
      res.innerHTML = groups.map(g => `<div class="pg">${g}</div>${hits.filter(h => h.g === g).map(h => `<div class="pr" data-go="${h.h}">${icon(h.ic, 'sm')}<span class="grow truncate">${esc(h.t)}</span><span class="xs muted truncate" style="max-width:40%">${esc(h.s)}</span></div>`).join('')}`).join('') || '<div class="empty small">No matches</div>';
    };
    inp.addEventListener('input', paint);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = res.querySelector('.pr'); if (f) go(f.dataset.go); } });
    paint(); inp.focus();
  });
};

/* ---------- events ---------- */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-act],[data-go]');
  if (!t) return;
  if (t.dataset.act && ACTIONS[t.dataset.act]) {
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) ev.preventDefault();
    ACTIONS[t.dataset.act](t, ev);
    return;
  }
  const g = t.dataset.go ? t : t.parentElement && t.parentElement.closest('[data-go]');
  if (g) { ev.preventDefault(); const h = g.dataset.go; if (location.hash === h) render(); else go(h); }
});
document.addEventListener('keydown', ev => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); ACTIONS.palette(); }
  if (ev.key === 'Escape') { if (layer().innerHTML) closeLayer(); else ACTIONS.closeAssistant(); }
});

/* ---------- install (PWA) ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  if (sessionStorageSafe('mq-install-dismissed')) return;
  setTimeout(showInstall, 2500);
});
function sessionStorageSafe(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) { return null; } }
function showInstall() {
  if (document.querySelector('.install') || !deferredPrompt) return;
  const el = document.createElement('div');
  el.className = 'install';
  el.innerHTML = `<span class="q">${BRAND.q('')}</span><div class="grow"><div style="font-weight:600;color:#fff">Install MARQA Pipeline</div><div class="small" style="color:#B9B2A8">Opens full screen, works offline for the floor</div></div><button class="btn sm gold" data-act="doInstall">Install</button><button class="icon-btn" style="background:transparent;border-color:#333;color:#B9B2A8" data-act="dismissInstall">${icon('x', 'sm')}</button>`;
  document.body.appendChild(el);
}
ACTIONS.doInstall = async () => { document.querySelector('.install')?.remove(); if (!deferredPrompt) return ACTIONS.installHelp(); deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; };
ACTIONS.dismissInstall = () => { document.querySelector('.install')?.remove(); sessionStorageSafe('mq-install-dismissed', '1'); };
ACTIONS.installHelp = () => {
  if (deferredPrompt) { closeLayer(); return ACTIONS.doInstall(); }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet({ title: 'Add to home screen', body: `<div class="stack">${(ios ? [['share', 'Tap the Share button in Safari'], ['plus', 'Choose “Add to Home Screen”'], ['check', 'Tap Add. MARQA opens full screen from your home screen.']] : [['more', 'Open the browser menu'], ['download', 'Choose “Install app” or “Add to Home screen”'], ['check', 'MARQA opens full screen and keeps working offline.']])
    .map(([ic, t], i) => `<div class="row"><span class="badge gold" style="width:34px;height:34px;padding:0;justify-content:center;border-radius:10px">${icon(ic, 'sm')}</span><span><b>${i + 1}.</b> ${t}</span></div>`).join('')}</div>` });
};
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------- boot ---------- */
if (!location.hash) location.replace('#/login');
lastHash = location.hash;
render();

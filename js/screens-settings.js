/* Settings, Data and Messages: the live MARQA Pipeline's admin screens (v2.7.0) in the prototype's design.
   SCREENS.settings (#/settings/<tab>), SCREENS.data (#/data), SCREENS.messages (#/messages).
   Everything lives in one closure; only SCREENS.* and ACTIONS.set* / dat* / msg* are global.
   State changes mutate the shared in-memory arrays (SETTINGS, OPTIONS, ROLE_PERMS, USERS, TEMPLATES,
   AUDIT, BULK_EVENTS, IMPORTS, TRASH …) so other screens see them until the page reloads. */
(() => {

/* ---------- small helpers ---------- */
const T0 = Date.now();
const now = () => new Date(TODAY.getTime() + (Date.now() - T0));   // the prototype's clock (TODAY + time since load)
const me = () => viewUser();
const F = () => isFounder();
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hm = d => { let h = d.getHours(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`; };
const dt = d => d ? `${fdate(d)}${d.getFullYear() !== TODAY.getFullYear() ? ' ' + String(d.getFullYear()).slice(2) : ''}, ${hm(d)}` : '—';
const pday = s => s ? new Date(s + 'T12:00:00') : null;
const num = v => { const s = String(v == null ? '' : v).replace(/[₹,\s]/g, ''); return s === '' ? NaN : Number(s); };
const err = m => toast(m, 'alert');
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const audit = (action, entity, entity_id, detail) => AUDIT.unshift({ at: now(), user: me().id, action, entity, entity_id, detail: detail || '' });
const bulk = what => BULK_EVENTS.unshift({ at: now(), who: me().id, what });
const ROLE_TONE = { founders: 'ink', sales: 'gold', ops: 'blue', marketing: 'violet' };
const roleBadge = r => badge(ROLES[r] || r, ROLE_TONE[r]);
const person = id => { const u = userById(id); return `<span class="set-who">${av(u.name, u.color, 'sm')}<span class="grow"><span class="strong">${esc(u.name)}</span>${u.role ? `<span class="xs muted"> · ${esc(ROLES[u.role])}</span>` : ''}</span></span>`; };
const stbl = (head, rows, cls) => `<div class="tbl-wrap"><table class="tbl set-st ${cls || ''}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
const unsaved = n => n ? `<span class="badge amber set-uns"><i class="d"></i>${n} unsaved</span>` : '';
const cancelBtn = '<button class="btn" data-act="close">Cancel</button>';
const modal = (title, body, foot, sub) => openModal(`<div class="set-mod"><div class="set-mod-h"><h3>${title}</h3><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>${sub ? `<p class="small muted mt-8">${sub}</p>` : ''}<div class="mt-12">${body}</div><div class="set-mod-f">${foot}</div></div>`);
const field = (label, inner, help, cls) => `<label class="field ${cls || ''}"><span>${label}</span>${inner}${help ? `<small class="set-help">${help}</small>` : ''}</label>`;
const founderNames = () => USERS.filter(u => u.role === 'founders' && u.active).map(u => u.name).join(' or ');
const rng = (lo, hi) => hi >= 99 ? `≥ ${lo} ct` : `${lo}–${hi} ct`;
const hlVars = s => esc(s).replace(/\{([a-z_0-9]+)\}/gi, '<span class="msg-var">{$1}</span>');

/* ---------- module state ---------- */
const ST = {
  band: 'EF', dia: null, lab: null,                          // rate-sheet drafts (held until Save)
  opt: {}, optDirty: new Set(), defSource: null,              // Options drafts
  perms: null,                                                // Access draft
  rateHist: [[0, 14354, 228, null, 'u3'], [-1, 15650, 229, 3180, 'u3'], [-2, 15655, 230, 3175, 'u1'], [-3, 15598, 231, 3160, 'u3'], [-4, 15640, 233, 3172, 'u3'], [-5, 15702, 238, 3205, 'u3'], [-6, 15689, 236, 3190, 'u6']]
    .map(([d, gold, silver, platinum, by]) => ({ d, gold, silver, platinum, by })),
  logo: 'ink', logoPick: 'ink',
  integ: { wa: true, shopify: true, zoho: false, razorpay: false, igi: true },
  extraStages: [], customChecks: new Set(),
  consent: 'I agree that MARQA may message me on WhatsApp about my enquiry and order, and send occasional news and offers. I can stop marketing messages any time by replying STOP.',
  retention: { chats: '3 years', snaps: '30' },
  auditF: { action: '', user: '' },
  cronKey: null, cronShown: false, fetches: 0,
  imp: { step: 'pick', kind: 'contacts', file: false, map: null, result: null },
  demo: false, zoho: false,
  snaps: [['pipeline_2026-11-04.sqlite', 1842, at(0, '08:55')], ['pipeline_2026-11-03.sqlite', 1838, at(-1, '09:01')], ['pipeline_2026-11-02.sqlite', 1831, at(-2, '09:12')], ['pipeline_2026-11-01.sqlite', 1829, at(-3, '10:40')], ['pipeline_2026-10-31.sqlite', 1824, at(-4, '09:05')]],
  logins: [[0, '10:01', 'kabir', 'ok', ''], [0, '09:58', 'kabir', 'fail', 'Wrong username or password (1 of 5)'], [0, '09:40', 'simran', 'ok', ''], [0, '09:02', 'riya', 'ok', ''], [0, '08:55', 'neha', 'ok', ''],
    [-1, '21:15', 'tanya', 'fail', 'Inactive account: shown "Wrong username or password"'], [-2, '23:41', 'admin', 'locked', '5 wrong attempts from one address: "Too many attempts. Try again in 15 minutes."']]
};
const mintKey = () => 'demo-' + Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
ST.cronKey = mintKey();   // the live app mints it on the first Sheet-link save; this is a placeholder, never a real key
const OPT_DEF = Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.items.slice()]));

/* ======================================================================================
   SETTINGS
   ====================================================================================== */
const TABS_DEF = [
  { k: 'rates', n: 'Metal rates', ic: 'coins', g: 'Pricing', ok: () => can('settings.rates'), why: 'Today\'s gold, silver and platinum rates are set by founders and by roles holding "Set today\'s rates" (Ops by default).' },
  { k: 'sheets', n: 'Rate sheets', ic: 'gem', g: 'Pricing', ok: F, why: 'The diamond rate sheet and the labour grid fill quotes automatically; founders keep them.' },
  { k: 'rules', n: 'Rules', ic: 'scale', g: 'Rules', ok: F, why: 'Tolerance, GST, SLAs, read budgets and the texts on PDFs and messages.' },
  { k: 'options', n: 'Options', ic: 'tag', g: 'Rules', ok: F, why: 'Every picklist in the app: sources, cities, item types, vendors and the rest.' },
  { k: 'workflow', n: 'Workflow', ic: 'layers', g: 'Rules', ok: F, why: 'The 18 stages and the checks that gate each move.' },
  { k: 'boundaries', n: 'Boundaries', ic: 'shield', g: 'Rules', ok: F, why: 'The four rules built into the system.' },
  { k: 'people', n: 'People', ic: 'users', g: 'People', ok: F, why: 'Adding people, roles, passwords and signing people out.' },
  { k: 'access', n: 'Access', ic: 'key', g: 'People', ok: F, why: 'What each role may do, and the log of exports and bulk reads.' },
  { k: 'session', n: 'Session & password', ic: 'lock', g: 'People', ok: () => true },
  { k: 'business', n: 'Business', ic: 'store', g: 'Business', ok: F, why: 'Company details, GSTIN, logo and stores.' },
  { k: 'integrations', n: 'Integrations', ic: 'plug', g: 'Business', ok: F, why: 'WhatsApp, Shopify, Zoho Books, Google and payment connections.' },
  { k: 'compliance', n: 'Compliance', ic: 'doc', g: 'Business', ok: F, why: 'Consent text, data retention and the audit log.' },
  { k: 'plan', n: 'Plan & billing', ic: 'card', g: 'Business', ok: F, href: '#/plans', why: 'The subscription.' }
];
const TAB_ALIAS = { team: 'access', billing: 'plan', password: 'session' };
const tabOf = k => TABS_DEF.find(t => t.k === k);
function curTab(p) {
  const k = TAB_ALIAS[p.id] || p.id;
  if (k && tabOf(k)) return tabOf(k);
  return TABS_DEF.find(t => t.ok()) || tabOf('session');
}

function navHtml(cur) {
  const okTabs = TABS_DEF.filter(t => t.ok()), locked = TABS_DEF.filter(t => !t.ok() && !t.href);
  const link = t => `<a class="set-tab ${t === cur ? 'on' : ''} ${t.ok() ? '' : 'locked'}" href="${t.href || '#/settings/' + t.k}">${icon(t.ic, 'sm')}<span class="grow">${t.n}</span>${t.ok() ? (t.href ? icon('arrowUR', 'sm') : '') : icon('lock', 'sm lk')}</a>`;
  let html = '', g = null;
  for (const t of okTabs) { if (t.g !== g && F()) { g = t.g; html += `<div class="set-g">${g}</div>`; } html += link(t); }
  if (locked.length) html += `<div class="set-g">Founders only</div>` + locked.map(link).join('');
  return `<nav class="card set-nav" aria-label="Settings sections">${html}</nav>`;
}

SCREENS.settings = {
  title: 'Settings', nav: 'settings',
  render(p) {
    if (p.id === 'billing' || (p.id === 'plan' && F())) { setTimeout(() => go('#/plans'), 0); return ''; }
    const t = curTab(p);
    const body = t.ok() ? (PANES[t.k] ? PANES[t.k]() : lockedPane(t)) : lockedPane(t);
    return `${pageHead('Settings', F() ? 'Rates, rules, people' : 'Your account · ' + esc(me().name) + ' (' + ROLES[VIEW.role] + ')')}
      <div class="set-layout">${navHtml(t)}<div class="set-pane" data-tab="${t.k}">${body}</div></div>`;
  },
  mount(root, p) {
    const nav = root.querySelector('.set-nav'), on = nav && nav.querySelector('.set-tab.on');
    if (nav && on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.offsetLeft - 24);
    const t = curTab(p);
    if (t.ok() && MOUNTS[t.k]) MOUNTS[t.k](root);
    mountAudit(root);
  }
};

function lockedPane(t) {
  return card('', `<div class="set-locked">${icon('lock', 'lg')}<div class="grow"><div class="strong">${esc(t.n)} is set by founders</div>
    <div class="small muted mt-8">${esc(t.why || '')} Ask ${esc(founderNames())} if something here needs to change.</div>
    <div class="row wrap mt-16"><button class="btn sm" data-go="#/settings/session">${icon('user', 'sm')}Your account</button>${can('settings.rates') && t.k !== 'rates' ? `<button class="btn sm" data-go="#/settings/rates">${icon('coins', 'sm')}Metal rates</button>` : ''}</div></div></div>`);
}

/* ---------- Metal rates ---------- */
const METALS = { gold: ['Gold 24K', 'gold_rate_24k', 'gold_rate_date', 'gold_rate', 'Gold'], silver: ['Silver 999', 'silver_rate_999', 'silver_rate_date', 'silver_rate', 'Silver'], platinum: ['Platinum 950', 'platinum_rate_950', 'platinum_rate_date', 'platinum_rate', 'Platinum'] };
function paneRates() {
  const today = isoDate(now());
  const tiles = Object.entries(METALS).map(([m, [n, k, dk]]) => {
    const set = SETTINGS[dk];
    return `<div class="set-rate">
      <div class="row between"><span class="label">${n} ₹/g</span>${set ? badge(set === today ? 'set today' : 'set ' + fdate(pday(set)), set === today ? 'green' : 'amber') : badge('never set', 'red')}</div>
      <div class="set-rate-v num">${SETTINGS[k] ? inr(SETTINGS[k]) : '—'}</div>
      <div class="set-rate-f mt-8"><label class="prefix"><b>₹</b><input class="input num" id="set-rate-${m}" inputmode="decimal" value="${SETTINGS[k] ? SETTINGS[k] : ''}" aria-label="${n} rupees per gram"></label>
      <button class="btn gold block" data-act="setRateSave" data-metal="${m}">Set ${m} rate</button></div></div>`;
  }).join('');
  const H = ST.rateHist;
  const hrow = (h, i) => {
    const prev = H[i + 1];
    const cell = (m, v) => { if (v == null) return `<td class="num muted">kept</td>`; const pv = prev && prev[m]; const ch = pv ? (v - pv) / pv * 100 : 0; return `<td class="num">${inr(v)}${pv && Math.abs(ch) >= 0.05 ? `<div class="xs hide-m ${ch > 0 ? 'up' : 'down'}">${ch > 0 ? '+' : ''}${ch.toFixed(1)}%</div>` : ''}</td>`; };
    const d = day(h.d);
    return `<tr><td class="set-nw"><span class="strong">${h.d === 0 ? 'Today' : fdate(d)}</span><div class="xs muted">${WD[d.getDay()]}</div></td>${cell('gold', h.gold)}${cell('silver', h.silver)}${cell('platinum', h.platinum)}<td class="m-hide">${person(h.by)}</td></tr>`;
  };
  const purRows = PURITIES.map(p => { const [sell, buy, base] = GOLD[p]; const b = baseRateFor(p);
    return `<tr><td class="strong">${p}</td><td class="m-hide">${base === 'gold' ? '24K gold' : base === 'silver' ? '999 silver' : '950 platinum'}</td><td class="num">${sell.toFixed(2)}</td><td class="num strong">${b ? inr(b * sell) : '—'}</td>${hides('buyback_value') ? '' : `<td class="num">${buy.toFixed(3)}</td><td class="num">${b ? inr(b * buy) : '—'}</td>`}</tr>`; }).join('');
  return `${card('Today\'s metal rates', `<div class="set-rates">${tiles}</div>
      <div class="small muted mt-16">New quotes default to these. Whoever opens the shop sets them each morning. Silver 925 and platinum 950 are priced at 100% of their base rate, plus making. Every change is logged with who made it.</div>`, { right: `<span class="xs muted">${can('settings.rates') && !F() ? 'You can set these' : 'Founders + Ops'}</span>` })}
    ${card('Last 7 days', `<div class="set-spark">${sparkline(H.slice().reverse().map(h => h.gold), '#B08D57')}<span class="xs muted">24K gold, ₹/g</span></div>
      ${stbl('<th>Day</th><th class="num">Gold<span class="hide-m"> 24K</span></th><th class="num">Silver<span class="hide-m"> 999</span></th><th class="num">Platinum<span class="hide-m"> 950</span></th><th class="m-hide">Set by</th>', H.map(hrow).join(''))}
      <div class="xs muted mt-8">"kept" = not set that day; quotes kept the last rate.</div>`)}
    ${card('What each purity is priced at today', stbl(`<th>Purity</th><th class="m-hide">Base rate</th><th class="num">Sell factor</th><th class="num">Applied ₹/g</th>${hides('buyback_value') ? '' : '<th class="num">Buyback factor</th><th class="num">Buyback ₹/g</th>'}`, purRows) + `<div class="xs muted mt-8">Applied rate = base rate × sell factor. ${hides('buyback_value') ? '' : 'Buyback values are shown to founders only.'}</div>`)}`;
}
ACTIONS.setRateSave = el => {
  const m = el.dataset.metal, [, k, dk, act, label] = METALS[m];
  const v = num(val('set-rate-' + m));
  if (!(v > 0)) return err('Rate must be a positive number');
  const old = SETTINGS[k]; SETTINGS[k] = v; SETTINGS[dk] = isoDate(now());
  ST.rateHist[0][m] = v; ST.rateHist[0].by = me().id;
  audit(act, 'settings', k, `${old ? NF.format(old) : 'never set'} → ${NF.format(v)}`);
  render(); toast(`${label} rate set for today`, 'coins');
};

/* ---------- Rate sheets: diamond grid + labour grid ---------- */
const diaDraft = () => ST.dia || (ST.dia = { sizes: SIZE_BANDS.map(b => b.slice()), bands: QUALITY_BANDS.map(b => ({ key: b.key, label: b.label, qualities: b.qualities.slice() })), rates: JSON.parse(JSON.stringify(DIAMOND_RATE_MATRIX)), n: 0 });
const labDraft = () => ST.lab || (ST.lab = { m: JSON.parse(JSON.stringify(LABOUR_MATRIX)), n: 0 });
function paneSheets() {
  const d = diaDraft(), b = d.bands.find(x => x.key === ST.band) || d.bands[0], shapes = opts('diamond_shapes');
  const owner = q => d.bands.find(x => x.qualities.includes(q));
  const grid = `<table class="tbl set-st set-grid"><thead><tr><th class="set-stick">Shape</th>${d.sizes.map(([l, lo, hi]) => `<th class="num"><div>${esc(l)}</div><div class="set-rng">${rng(lo, hi)}</div></th>`).join('')}</tr></thead><tbody>
    ${shapes.map(sh => sh === 'Melee' ? `<tr><td class="set-stick strong">Melee</td><td colspan="${d.sizes.length}" class="small muted">Melee lines are priced from the Round row, by the per-stone size band.</td></tr>`
      : `<tr><td class="set-stick strong">${esc(sh)}</td>${d.sizes.map((_, i) => { const v = ((d.rates[b.key] || {})[sh] || [])[i]; return `<td><input class="set-cell num" data-cell="${esc(sh)}|${i}" value="${v != null ? v : ''}" inputmode="numeric" aria-label="${esc(sh)} ${esc(d.sizes[i][0])}"></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  const sizesTxt = d.sizes.map(([l, lo, hi]) => `${l} | ${lo} | ${hi >= 99 ? '' : hi}`).join('\n');
  const lab = labDraft(), cols = [['*', 'Any item'], ...opts('item_types').map(t => [t, t])];
  const labGrid = `<table class="tbl set-st set-grid"><thead><tr><th class="set-stick">Purity</th>${cols.map(([, n]) => `<th class="num">${esc(n)}</th>`).join('')}</tr></thead><tbody>
    ${PURITIES.map(p => `<tr><td class="set-stick"><span class="strong">${p}</span><div class="xs muted">${GOLD[p][2]}</div></td>${cols.map(([c, n]) => { const v = (lab.m[c] || {})[p]; return `<td><input class="set-cell num" data-lab="${esc(c)}|${p}" value="${v != null ? v : ''}" inputmode="numeric" aria-label="${p} ${esc(n)}"></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  return `${card('Diamond rate sheet', `<p class="small ink2">₹ per carat by quality band, shape and size band. Size is per stone: line ct ÷ pcs. On a quote the sheet fills the rate, and a typed rate always wins. A blank cell means no automatic rate.</p>
      <div class="row wrap mt-16 between"><div class="seg">${d.bands.map(x => `<button class="${x.key === b.key ? 'on' : ''}" data-act="setBand" data-band="${x.key}">${esc(x.label)}</button>`).join('')}</div>
        <button class="btn sm" data-act="setSizeAdd">${icon('plus', 'sm')}Add a size band</button></div>
      <div class="fgrid mt-16"><label class="field"><span>Band label</span><input class="input" data-bandlabel="${b.key}" value="${esc(b.label)}"></label>
        <div class="field"><span>Qualities priced from this band</span><div class="chips">${opts('diamond_qualities').map(q => { const o = owner(q); return `<label class="chip ${o === b ? 'on' : ''}"><input type="checkbox" class="set-hidecb" data-bandq="${esc(q)}" ${o === b ? 'checked' : ''}>${esc(q)}${o && o !== b ? `<span class="n">${o.key}</span>` : ''}</label>`; }).join('')}</div><small class="set-help">A quality belongs to one band; ticking it here moves it.</small></div></div>
      <div class="tbl-wrap mt-16 set-gridwrap">${grid}</div>
      <details class="set-det mt-12" ${ST.sizesOpen ? 'open' : ''}><summary>Size bands (columns), one per line: <span class="mono">label | from ct | to ct</span></summary>
        <textarea class="textarea mono mt-8" id="set-sizes" rows="8">${esc(sizesTxt)}</textarea>
        <div class="row wrap mt-8"><button class="btn sm" data-act="setSizesApply">${icon('refresh', 'sm')}Redraw the grid</button><span class="xs muted">Leave "to" blank for the last band. Renaming a column renames it in every band. Sieve sizes map to carat ranges; use the carat.</span></div></details>`,
    { right: `<span class="row gap-6">${unsaved(d.n)}${d.n ? '<button class="btn sm ghost" data-act="setDiaDiscard">Discard</button>' : ''}<button class="btn sm primary" data-act="setDiaSave">${icon('check', 'sm')}Save rate sheet</button></span>` })}
    ${card('Labour rates (₹/g)', `<p class="small ink2">Making charge per gram by purity and item type. <b>Any item</b> is the fallback for a purity. It fills the quote's making rate, which can be overridden. Blank = nothing fills.</p>
      <div class="tbl-wrap mt-16 set-gridwrap">${labGrid}</div>`,
    { right: `<span class="row gap-6">${unsaved(lab.n)}${lab.n ? '<button class="btn sm ghost" data-act="setLabDiscard">Discard</button>' : ''}<button class="btn sm primary" data-act="setLabSave">${icon('check', 'sm')}Save labour rates</button></span>` })}`;
}
function mountSheets(root) {
  const d = diaDraft(), lab = labDraft();
  const bump = (o, inp) => { o.n++; inp.classList.add('set-dirty'); const card = inp.closest('.card'), h = card && card.querySelector('.card-h .set-uns'); if (h) h.lastChild.textContent = o.n + ' unsaved'; else if (card) { const s = card.querySelector('.card-h .row'); if (s) s.insertAdjacentHTML('afterbegin', unsaved(o.n)); } };
  root.querySelectorAll('[data-cell]').forEach(inp => inp.addEventListener('change', () => {
    const [sh, i] = inp.dataset.cell.split('|'), v = inp.value.trim(), n = num(v);
    if (v && isNaN(n)) { inp.value = ''; return err('Rates must be numbers'); }
    const band = d.rates[ST.band] = d.rates[ST.band] || {}; const row = band[sh] = band[sh] || Array(d.sizes.length).fill(null);
    row[+i] = v ? n : null; bump(d, inp);
  }));
  root.querySelectorAll('[data-lab]').forEach(inp => inp.addEventListener('change', () => {
    const [c, p] = inp.dataset.lab.split('|'), v = inp.value.trim(), n = num(v);
    if (v && isNaN(n)) { inp.value = ''; return err('Labour rates must be numbers'); }
    const col = lab.m[c] = lab.m[c] || {}; if (v) col[p] = n; else delete col[p]; bump(lab, inp);
  }));
  const bl = root.querySelector('[data-bandlabel]');
  if (bl) bl.addEventListener('change', () => { const b = d.bands.find(x => x.key === bl.dataset.bandlabel); if (!bl.value.trim()) { bl.value = b.label; return err('A band needs a label'); } b.label = bl.value.trim(); d.n++; render(); });
  root.querySelectorAll('[data-bandq]').forEach(cb => cb.addEventListener('change', () => {
    const q = cb.dataset.bandq, b = d.bands.find(x => x.key === ST.band);
    d.bands.forEach(x => { x.qualities = x.qualities.filter(y => y !== q); });
    if (cb.checked) b.qualities.push(q);
    d.n++; render();
  }));
}
ACTIONS.setBand = el => { ST.band = el.dataset.band; render(); };
ACTIONS.setSizesApply = () => {
  const lines = val('set-sizes').split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return err('Keep at least one size band');
  const sizes = [];
  for (const ln of lines) {
    const [l, a, b] = ln.split('|').map(s => (s || '').trim());
    if (!l) return err('Every size band needs a label');
    const lo = num(a), hi = b ? num(b) : 99;
    if (isNaN(lo) || isNaN(hi) || hi <= lo) return err(`Size band "${l}": from and to must be carats, to above from`);
    sizes.push([l, lo, hi]);
  }
  const d = diaDraft();
  Object.values(d.rates).forEach(bd => Object.values(bd).forEach(row => { row.length = sizes.length; for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null; }));
  d.sizes = sizes; d.n++; ST.sizesOpen = true; render(); toast(`${sizes.length} size bands drawn. Save the sheet to use them`, 'gem');
};
ACTIONS.setSizeAdd = () => modal('Add a size band', `<div class="fgrid">${field('Label', '<input class="input" id="set-sb-l" placeholder="e.g. 2.00+">', '', 'full')}
  ${field('From ct', '<input class="input num" id="set-sb-a" inputmode="decimal" placeholder="2">')}${field('To ct <em>(blank = open)</em>', '<input class="input num" id="set-sb-b" inputmode="decimal">')}</div>`,
  `${cancelBtn}<button class="btn primary" data-act="setSizeAddOk">Add column</button>`, 'A new column in every quality band. The neighbouring bands are trimmed so the ranges stay continuous.');
ACTIONS.setSizeAddOk = () => {
  const l = val('set-sb-l'), lo = num(val('set-sb-a')), hiRaw = val('set-sb-b');
  if (!l) return err('Give the size band a label');
  if (!(lo >= 0)) return err('"From" must be a carat value');
  const d = diaDraft();
  let idx = d.sizes.findIndex(s => s[1] > lo); if (idx < 0) idx = d.sizes.length;
  let hi = hiRaw ? num(hiRaw) : (d.sizes[idx] ? d.sizes[idx][1] : 99);
  if (isNaN(hi) || hi <= lo) return err('"To" must be above "from"');
  if (idx > 0 && d.sizes[idx - 1][2] > lo) d.sizes[idx - 1][2] = lo;
  d.sizes.splice(idx, 0, [l, lo, hi]);
  Object.values(d.rates).forEach(bd => Object.values(bd).forEach(row => row.splice(idx, 0, null)));
  d.n++; closeLayer(); render(); toast(`Size band "${l}" added. Save the sheet to use it`, 'gem');
};
ACTIONS.setDiaSave = () => {
  const d = diaDraft();
  SIZE_BANDS.splice(0, SIZE_BANDS.length, ...d.sizes.map(s => s.slice()));
  d.bands.forEach(b => { const q = QUALITY_BANDS.find(x => x.key === b.key); if (q) { q.label = b.label; q.qualities.splice(0, q.qualities.length, ...b.qualities); } });
  Object.entries(d.rates).forEach(([bk, rows]) => { DIAMOND_RATE_MATRIX[bk] = DIAMOND_RATE_MATRIX[bk] || {}; Object.entries(rows).forEach(([sh, row]) => { DIAMOND_RATE_MATRIX[bk][sh] = row.slice(); }); });
  audit('rate_matrix', 'settings', 'diamond_rate_matrix', `${d.bands.length} bands × ${d.sizes.length} size bands; the old sheet is kept in the audit`);
  ST.dia = null; render(); toast('Rate sheet saved', 'gem');
};
ACTIONS.setDiaDiscard = () => { ST.dia = null; render(); toast('Rate-sheet changes discarded', 'undo'); };
ACTIONS.setLabSave = () => {
  const m = labDraft().m;
  Object.keys(LABOUR_MATRIX).forEach(k => { if (k !== '*') delete LABOUR_MATRIX[k]; });
  LABOUR_MATRIX['*'] = {};
  Object.entries(m).forEach(([k, col]) => { if (Object.keys(col).length || k === '*') LABOUR_MATRIX[k] = Object.assign(LABOUR_MATRIX[k] || {}, col); });
  audit('labour_matrix', 'settings', 'labour_rate_matrix', `${Object.keys(LABOUR_MATRIX).length} columns with rates`);
  ST.lab = null; render(); toast('Labour rates saved', 'hammer');
};
ACTIONS.setLabDiscard = () => { ST.lab = null; render(); toast('Labour-rate changes discarded', 'undo'); };

/* ---------- Rules ---------- */
const RULES = [
  ['Quotes and money', [
    ['weight_tolerance_pct', 'Weight / cost tolerance', 'n', '%', 'QC variance inside this is "Within estimate"; beyond it the client approves the change (template O10).'],
    ['high_value_threshold', 'High-value threshold', 'n', '₹', 'Orders at or above this need the mid-process update (O4) and count as High ticket in client profiles.'],
    ['default_gst', 'Default GST', 'n', '%', 'Every new quote starts here; editable per quote until the order locks.'],
    ['default_usd', 'Default USD rate', 'n', '₹', 'USD total = total ÷ (USD rate − spread).'],
    ['default_usd_spread', 'USD spread', 'n', '₹', '']]],
  ['Response and follow-up', [
    ['sla_whatsapp_hours', 'WhatsApp / DM reply SLA', 'n', 'hours', 'New enquiries show "no reply Nh" once this passes.'],
    ['sla_email_hours', 'Email reply SLA', 'n', 'hours', ''],
    ['followup_default_days', 'Default follow-up', 'n', 'days', 'Set for 11:00 IST after every forward move and every shared quote.'],
    ['target_monthly_revenue', 'Monthly revenue target', 'n', '₹', 'The dashboard pace line; founders only.']]],
  ['Read budget, per non-founder per day', [
    ['read_budget_soft', 'Flag at', 'n', 'reads', 'The day is flagged in Access → Exports & bulk reads. 0 = off.'],
    ['read_budget_hard', 'Stop at', 'n', 'reads', 'Past this every list and record fails with "Daily read limit reached for this account. It resets tomorrow; a founder can raise it in Settings → Rules." 0 = off.']]],
  ['Client profiles', [
    ['profile_quick_days', 'Quick turnaround', 'n', 'days', 'First enquiry → first order within this many days.'],
    ['profile_hassle_touches', 'Hassle-free', 'n', 'touches', 'At most this many logged touches, no CAD revisions and no re-quotes.']]],
  ['On PDFs and messages', [
    ['company', 'Company (on PDFs)', 't', '', 'Also the default invoicing entity.'],
    ['pay_details', 'Pay details (B2)', 't', '', 'Filled into the balance reminder.'],
    ['review_link', 'Google review link (P2)', 't', '', ''],
    ['referral_offer', 'Referral offer (P3)', 't', '', 'Blank = "a small thank-you".'],
    ['quote_terms', 'Quotation terms (PDF footer)', 'ta', '', '']]],
  ['Google Contacts naming', [
    ['google_first_template', 'First Name field', 't', '', ''],
    ['google_last_template', 'Last Name field', 't', '', ''],
    ['google_custom_fields', 'Custom fields, one "Label = template" per line', 'tam', '', 'A blank value leaves that field out of the export.']]],
  ['Zoho', [
    ['zoho_owner_map', 'Zoho owner map, one "username=zoho-user-email" per line', 'tam', '', 'Blank = whoever runs the Zoho import owns every record.']]]
];
const NAME_TOKENS = ['{name}', '{source_code}', '{source_channel}', '{tags}', '{lifecycle}', '{city}', '{country}', '{met_in_person}'];
const fillTokens = (tpl, c) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => ({ name: c.name, source_code: c.source_code, source_channel: c.source_channel, tags: (c.tags || []).join(' '), lifecycle: c.lifecycle, city: c.city, country: c.country, met_in_person: c.met_in_person ? 'Yes' : 'No' }[k] || '')).replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
function paneRules() {
  const inputFor = ([k, label, kind, unit]) => {
    const v = SETTINGS[k] == null ? '' : SETTINGS[k];
    if (kind === 'n') { const shown = unit === '₹' ? (v === '' ? '' : NF.format(v)) : v; return unit === '₹' ? `<div class="prefix"><b>₹</b><input class="input num" data-rule="${k}" data-kind="n" data-label="${esc(label)}" value="${shown}" inputmode="decimal"></div>` : `<div class="set-suffix"><input class="input num" data-rule="${k}" data-kind="n" data-label="${esc(label)}" value="${shown}" inputmode="decimal"><span>${unit}</span></div>`; }
    if (kind === 't') return `<input class="input" data-rule="${k}" data-kind="t" data-label="${esc(label)}" value="${esc(v)}"${k === 'pay_details' ? ' placeholder="UPI: name@bank"' : ''}>`;
    return `<textarea class="textarea ${kind === 'tam' ? 'mono' : ''}" rows="4" data-rule="${k}" data-kind="t" data-label="${esc(label)}"${k === 'zoho_owner_map' ? ' placeholder="riya=riya@example.com"' : ''}>${esc(v)}</textarea>`;
  };
  const sample = contactById('c1');
  const sec = ([title, rows], i) => `<div class="set-sec ${i ? 'mt-24' : ''}"><div class="label">${title}</div><div class="fgrid mt-12">
    ${i === 0 ? field(`Quote validity ${icon('lock', 'sm')}`, '<input class="input" value="24 hours from sharing · re-price after 2 days" readonly title="Set by the owner on 1 Oct 2026; not a setting">', 'Fixed by the owner on 1 Oct 2026; not a setting. The client hears 24 hours; an order may still be confirmed at the quoted rate for 2 days from the quote date.') : ''}
    ${rows.map(r => field(r[1], inputFor(r), r[4], r[2] === 'ta' || r[2] === 'tam' || r[0] === 'pay_details' ? 'full' : '')).join('')}
    ${title === 'Google Contacts naming' ? `<div class="full small"><div class="row wrap gap-6"><span class="muted">Tokens:</span>${NAME_TOKENS.map(t => `<span class="badge out mono">${t}</span>`).join('')}</div>
      <div class="set-preview mt-8"><span class="xs muted">Preview for ${esc(sample.name)}:</span> First <b>${esc(fillTokens(SETTINGS.google_first_template, sample))}</b> · Last <b>${esc(fillTokens(SETTINGS.google_last_template, sample))}</b></div></div>` : ''}
    </div>${title === 'Read budget, per non-founder per day' ? '<div class="xs muted mt-8">Every list load and every record a non-founder opens counts. Founders are never counted.</div>' : ''}
    ${title === 'Client profiles' ? '<div class="xs muted mt-8">Profiles (Repeat purchasers · High ticket · Quick turnaround · Hassle-free) appear on the contact card and in Reports.</div>' : ''}</div>`;
  return card('Rules', RULES.map(sec).join(''), { right: `<button class="btn sm primary" data-act="setRulesSave">${icon('check', 'sm')}Save</button>` });
}
ACTIONS.setRulesSave = () => {
  const els = [...document.querySelectorAll('[data-rule]')], upd = {};
  for (const e of els) {
    e.classList.remove('warn');
    let v = e.value;
    if (e.dataset.kind === 'n') { const n = num(v); if (isNaN(n) || n < 0) { e.classList.add('warn'); e.focus(); return err(`${e.dataset.label} must be a number (0 or more)`); } v = n; }
    upd[e.dataset.rule] = v;
  }
  if (upd.read_budget_soft && upd.read_budget_hard && upd.read_budget_hard < upd.read_budget_soft) return err('Read budget: "Stop at" must be above "Flag at" (or 0 for off)');
  const changed = Object.keys(upd).filter(k => String(SETTINGS[k] == null ? '' : SETTINGS[k]) !== String(upd[k]));
  if (!changed.length) return toast('Nothing changed', 'check');
  changed.forEach(k => { SETTINGS[k] = upd[k]; });
  audit('settings_save', 'settings', 'rules', changed.join(', '));
  render(); toast(`Saved · ${changed.length} change${changed.length > 1 ? 's' : ''}`);
};

/* ---------- Options (every picklist) ---------- */
const S_ = arr => arr.filter(x => x != null && x !== '');
const OPT_USE = {
  source_channels: () => [...DEALS.map(d => d.source_channel), ...CONTACTS.map(c => c.source_channel)],
  source_codes: () => [...DEALS.map(d => d.source_code), ...CONTACTS.map(c => c.source_code)],
  cities: () => CONTACTS.map(c => c.city),
  countries: () => CONTACTS.map(c => c.country).filter(c => c !== 'India'),
  tags: () => CONTACTS.flatMap(c => c.tags || []),
  competitors: () => DEALS.map(d => d.competitor),
  product_interests: () => DEALS.map(d => d.product_interest),
  occasions: () => DEALS.map(d => d.occasion),
  timelines: () => DEALS.map(d => d.timeline),
  lost_reasons: () => DEALS.filter(d => stg(d.stage).group === 'lost').map(d => d.lost_reason),
  item_types: () => [...DEALS.filter(d => d.quote).map(d => d.item_type), ...STOCK_ITEMS.map(s => s.item_type)],
  sizes: () => [...DEALS.map(d => d.size), ...STOCK_ITEMS.map(s => s.size)],
  gold_colours: () => [...DEALS.filter(d => d.quote).map(d => d.gold_colour), ...STOCK_ITEMS.map(s => s.gold_colour)],
  diamond_shapes: () => [...DEALS.flatMap(d => (d.lines || []).map(l => l.shape)), ...STOCK_ITEMS.filter(s => s.kind !== 'jewellery').map(s => s.shape)],
  diamond_qualities: () => [...DEALS.flatMap(d => (d.lines || []).map(l => l.quality)), ...STOCK_ITEMS.map(s => s.quality)],
  stone_settings: () => DEALS.flatMap(d => (d.lines || []).map(l => l.setting)),
  platings: () => DEALS.filter(d => isOrder(d)).map(d => d.plating),
  finishes: () => DEALS.filter(d => isOrder(d)).map(d => d.finish),
  techniques: () => DEALS.flatMap(d => d.techniques || []),
  post_types: () => DEALS.map(d => d.post_type),
  gem_types: () => STOCK_ITEMS.map(s => s.gem_type),
  cert_labs: () => STOCK_ITEMS.map(s => s.cert_lab),
  diamond_colours: () => STOCK_ITEMS.filter(s => s.kind === 'diamond').map(s => s.colour),
  diamond_clarities: () => STOCK_ITEMS.filter(s => s.kind === 'diamond').map(s => s.clarity),
  vendors: () => DEALS.map(d => d.vendor),
  stock_locations: () => STOCK_ITEMS.map(s => s.location),
  payment_terms: () => DEALS.map(d => d.payment_terms),
  delivery_methods: () => DEALS.map(d => d.delivery_method),
  couriers: () => DEALS.map(d => d.courier),
  payment_modes: () => DEALS.flatMap(d => (d.payments || []).map(p => p.mode)),
  invoice_entities: () => DEALS.map(d => d.invoice_entity)
};
const optUsage = k => { const m = new Map(); S_((OPT_USE[k] || (() => []))()).forEach(v => m.set(v, (m.get(v) || 0) + 1)); return m; };
const optItems = k => ST.opt[k] || OPTIONS[k].items;
const optEdit = k => { if (!ST.opt[k]) ST.opt[k] = OPTIONS[k].items.slice(); ST.optDirty.add(k); return ST.opt[k]; };
const optDirtyN = () => ST.optDirty.size + (ST.defSource != null && ST.defSource !== SETTINGS.default_source ? 1 : 0);
function optBox(k) {
  const o = OPTIONS[k], items = optItems(k), use = optUsage(k), def = OPT_DEF[k];
  const off = [...use.entries()].filter(([v]) => !items.includes(v));
  const inUse = items.filter(v => use.get(v)).length, differs = JSON.stringify(items) !== JSON.stringify(def);
  const rows = items.map((v, i) => `<div class="set-opt-it"><span class="grow truncate" title="${esc(v)}">${esc(v)}</span>${use.get(v) ? `<span class="set-cnt" title="Records using it">${use.get(v)}</span>` : ''}
    ${i > 0 ? `<button class="set-ib up" data-act="setOptMove" data-key="${k}" data-i="${i}" data-dir="-1" aria-label="Move up">${icon('chevD', 'sm')}</button>` : '<span class="set-ib-sp"></span>'}
    ${i < items.length - 1 ? `<button class="set-ib" data-act="setOptMove" data-key="${k}" data-i="${i}" data-dir="1" aria-label="Move down">${icon('chevD', 'sm')}</button>` : '<span class="set-ib-sp"></span>'}
    <button class="set-ib del" data-act="setOptDel" data-key="${k}" data-i="${i}" aria-label="Remove ${esc(v)}">${icon('x', 'sm')}</button></div>`).join('');
  return `<div class="set-opt card ${ST.optDirty.has(k) ? 'dirty' : ''}">
    <div class="row between top"><div class="grow"><div class="strong">${esc(o.label)}</div><div class="xs muted">${items.length} values · ${inUse} in use</div></div>
      ${differs ? `<button class="btn sm ghost" data-act="setOptReset" data-key="${k}" title="Back to the built-in list">${icon('undo', 'sm')}Built-in</button>` : ''}</div>
    <div class="set-opt-list">${rows || `<div class="xs muted set-opt-empty">Empty: the field takes free text${k === 'vendors' ? ' on the deal' : ''}.</div>`}</div>
    ${off.length ? `<div class="set-off">${off.map(([v, n]) => `<span class="badge amber" title="Already on ${n} record(s): still readable there, refused on new saves">${esc(v)} · ${n} · not in list</span>`).join('')}</div>` : ''}
    <div class="set-opt-add"><input class="input" data-optadd="${k}" placeholder="Add a value" aria-label="Add to ${esc(o.label)}"><button class="btn sm" data-act="setOptAdd" data-key="${k}">${icon('plus', 'sm')}Add</button></div>
    ${o.note ? `<div class="xs muted">${esc(o.note)}</div>` : ''}
    <details class="set-det"><summary class="xs">Built-in list (${def.length})</summary><div class="xs muted mt-8">${def.length ? def.map(esc).join(' · ') : 'Empty'}</div></details></div>`;
}
function paneOptions() {
  const n = optDirtyN(), srcs = optItems('source_channels'), cur = ST.defSource != null ? ST.defSource : SETTINGS.default_source;
  return `<div class="set-bar"><div class="grow"><div class="strong">Options</div><div class="xs muted">Every picklist in one place. Changes apply when you save.</div></div>${unsaved(n)}
      ${n ? '<button class="btn sm ghost" data-act="setOptDiscard">Discard</button>' : ''}<button class="btn sm primary" data-act="setOptSave">${icon('check', 'sm')}Save</button></div>
    <div class="banner blue">${icon('alert')}<div class="small">Removing a value never touches records. A deal or contact that already holds it keeps it and shows it as <span class="badge amber">not in list</span>, still readable, but new saves of it are refused with "x is not in the list: founders add options in Settings → Options". Imports are exempt. An empty list means anything goes for that field.</div></div>
    ${card('', `<div class="fgrid">${field('Default source for new enquiries', `<select class="select" data-defsrc>${srcs.map(s => `<option ${s === cur ? 'selected' : ''}>${esc(s)}</option>`).join('')}${srcs.includes(cur) ? '' : `<option selected>${esc(cur)} (not in list)</option>`}</select>`, 'A user\'s own default source (People) wins over this.')}</div>`)}
    ${OPTION_GROUPS.map(g => `<div class="set-optg"><div class="label">${g}</div><div class="set-opt-grid mt-8">${Object.keys(OPTIONS).filter(k => OPTIONS[k].group === g).map(optBox).join('')}</div></div>`).join('')}
    ${card('Fixed in code (not editable here)', `<div class="set-fixed">${[['Stages', DSTAGES.map(s => s.label)], ['Deal types', DEAL_TYPES], ['Production stages', PROD_SUBSTAGES], ['Purities', PURITIES], ['Contact lifecycle', ['Inq', 'Cust', 'Dormant', 'Lost']], ['Stock kinds', Object.values(STOCK_KINDS)], ['Stock statuses', Object.values(STOCK_STATUS).map(s => s[0])], ['Template journeys', JOURNEYS.map(j => j[1])]]
      .map(([n, l]) => `<div><div class="xs strong">${n}</div><div class="xs muted">${l.map(esc).join(' · ')}</div></div>`).join('')}</div>`)}`;
}
function mountOptions(root) {
  root.querySelectorAll('[data-optadd]').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACTIONS.setOptAdd({ dataset: { key: i.dataset.optadd } }); } }));
  const ds = root.querySelector('[data-defsrc]');
  if (ds) ds.addEventListener('change', () => { ST.defSource = ds.value.replace(/ \(not in list\)$/, ''); render(); });
}
ACTIONS.setOptAdd = el => {
  const k = el.dataset.key, inp = document.querySelector(`[data-optadd="${k}"]`);
  let v = inp ? inp.value.trim() : '';
  if (!v) return err('Type a value first');
  if (k === 'source_codes') v = v.toUpperCase();
  if (optItems(k).some(x => x.toLowerCase() === v.toLowerCase())) return err(`"${v}" is already in ${OPTIONS[k].label}`);
  optEdit(k).push(v); render();
  toast(`Added "${v}" to ${OPTIONS[k].label}. Save to apply`, 'plus');
  const again = document.querySelector(`[data-optadd="${k}"]`); if (again) again.focus();
};
ACTIONS.setOptMove = el => { const k = el.dataset.key, i = +el.dataset.i, j = i + +el.dataset.dir, a = optEdit(k); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; render(); };
ACTIONS.setOptDel = el => {
  const k = el.dataset.key, a = optEdit(k), [v] = a.splice(+el.dataset.i, 1), n = optUsage(k).get(v) || 0;
  render(); toast(n ? `Removed "${v}". ${n} record${n > 1 ? 's keep' : ' keeps'} it as "not in list"` : `Removed "${v}"`, 'x');
};
ACTIONS.setOptReset = el => { const k = el.dataset.key; ST.opt[k] = OPT_DEF[k].slice(); ST.optDirty.add(k); render(); toast(`${OPTIONS[k].label}: built-in list restored. Save to apply`, 'undo'); };
ACTIONS.setOptDiscard = () => { ST.opt = {}; ST.optDirty.clear(); ST.defSource = null; render(); toast('Option changes discarded', 'undo'); };
ACTIONS.setOptSave = () => {
  const n = optDirtyN();
  if (!n) return toast('Nothing changed', 'check');
  const src = ST.defSource != null ? ST.defSource : SETTINGS.default_source;
  if (!optItems('source_channels').includes(src)) return err('The default source must be on the Sources list');
  const labels = [...ST.optDirty].map(k => OPTIONS[k].label);
  ST.optDirty.forEach(k => { OPTIONS[k].items.splice(0, OPTIONS[k].items.length, ...ST.opt[k]); });
  if (src !== SETTINGS.default_source) { labels.push('Default source → ' + src); SETTINGS.default_source = src; }
  audit('options_save', 'settings', 'options', labels.join(', '));
  ST.opt = {}; ST.optDirty.clear(); ST.defSource = null; render(); toast('Options saved', 'tag');
};

/* ---------- Access + Exports & bulk reads ---------- */
const STAFF = ['sales', 'ops', 'marketing'];
const SENS_TIP = 'Moves data out of the building or reveals cost. Grant for a day when there is a reason; every export is logged.';
const permDraft = () => ST.perms || (ST.perms = Object.fromEntries(STAFF.map(r => [r, (ROLE_PERMS[r] || []).slice()])));
const permDiff = () => { const d = permDraft(), out = []; STAFF.forEach(r => { PERM_LABELS.forEach(([k]) => { const a = (ROLE_PERMS[r] || []).includes(k), b = d[r].includes(k); if (a !== b) out.push(`${r} ${b ? '+' : '−'} ${k}`); }); }); return out; };
function paneAccess() {
  const d = permDraft(), diff = permDiff();
  const rows = PERM_LABELS.map(([k, lab]) => { const sens = SENSITIVE_PERMS.includes(k);
    return `<tr class="${sens ? 'set-sens' : ''}"><td><div class="strong small">${esc(lab)}</div><div class="row gap-6 set-k"><span class="mono xs muted">${k}</span>${sens ? `<span class="badge red set-sp" title="${esc(SENS_TIP)}">sensitive</span>` : ''}</div></td>
      <td class="c set-fcol"><span class="set-fixed-ck" title="Founders always hold everything">${icon('check', 'sm')}</span></td>
      ${STAFF.map(r => { const on = d[r].includes(k), chg = on !== (ROLE_PERMS[r] || []).includes(k); return `<td class="c ${chg ? 'set-chg' : ''}"><input type="checkbox" class="set-cb" data-perm="${r}|${k}" ${on ? 'checked' : ''} aria-label="${ROLES[r]}: ${esc(lab)}"></td>`; }).join('')}</tr>`; }).join('');
  const soft = +SETTINGS.read_budget_soft || 0, hard = +SETTINGS.read_budget_hard || 0;
  const ev = BULK_EVENTS.slice(0, 25).map(e => `<tr class="${/flag|stop|purg|Trash|for good|undone/i.test(e.what) ? 'set-tint' : ''}"><td class="set-nw small">${dt(e.at)}</td><td>${person(e.who)}</td><td class="f">${esc(e.what)}</td></tr>`).join('');
  const reads = [];
  Object.entries(READS_14D).forEach(([u, arr]) => arr.forEach((t, i) => { if (t > 0) reads.push({ u, d: -(arr.length - 1 - i), t }); }));
  reads.sort((a, b) => b.d - a.d || b.t - a.t);
  const rr = reads.slice(0, 40).map(x => { const lists = Math.round(x.t * 0.36), recs = x.t - lists, over = soft && x.t >= soft, stop = hard && x.t >= hard, dd = day(x.d);
    return `<tr class="${over ? 'set-tint' : ''}"><td class="set-nw"><span class="strong">${x.d === 0 ? 'Today' : fdate(dd)}</span> <span class="xs muted">${WD[dd.getDay()]}</span></td><td>${person(x.u)}</td><td class="num" data-l="Lists">${lists}</td><td class="num" data-l="Records">${recs}</td><td class="num strong" data-l="Total">${x.t}</td><td>${stop ? badge('stopped', 'red') : over ? badge('over budget', 'red') : ''}</td></tr>`; }).join('');
  return `<div class="set-bar"><div class="grow"><div class="strong">Access</div><div class="xs muted">Founders always hold everything. Tick what each role may do.</div></div>${unsaved(diff.length)}
      <button class="btn sm ghost" data-act="setAccessReset">${icon('undo', 'sm')}Defaults</button><button class="btn sm primary" data-act="setAccessSave">${icon('check', 'sm')}Save</button></div>
    <div class="banner red">${icon('alert')}<div class="small"><span class="only-m">Founders always hold every key. </span><b>Sensitive keys</b> ${SENSITIVE_PERMS.map(k => `<span class="mono">${k}</span>`).join(', ')}: ${esc(SENS_TIP)}</div></div>
    ${card('', `<div class="tbl-wrap"><table class="tbl set-st set-acc"><thead><tr><th>Can…</th><th class="c set-fcol">Founders</th>${STAFF.map(r => `<th class="c"><span class="hide-m">${ROLES[r]}</span><span class="only-m">${{ sales: 'Sales', ops: 'Ops', marketing: 'Mktg' }[r]}</span></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="small muted set-pad">What each role <i>sees</i> is fixed by role, not here: marketing gets masked phones and no money; ops sees no sources or budgets and only order-stage deals; only founders see buyback. Changes apply at the next click and are logged. Grant sensitive keys for a day, then take them back.</div>`, { flush: true })}
    ${card('Founders only, whatever the matrix', `<div class="set-chips">${['People: add and edit users, set passwords, sign out everywhere (never on another founder)', 'Rules, Options, Rate sheets, Access', 'Trash: list, delete, restore, delete for good', 'The audit log and Exports & bulk reads', 'Backup run and download', 'Demo data load and purge', 'Manual Google Sheet fetch', 'Zoho migration export', 'Stage override', 'Refunds: record and edit', 'Promise write-off reason', 'Close-override reason', 'Reverse a material issue', 'Reverse a stock move', 'Write stock off', 'Adjust stock downwards'].map(t => `<span class="badge out">${esc(t)}</span>`).join('')}</div>
      <div class="xs muted mt-12">The Data tab also shows to anyone holding <span class="mono">import</span> or <span class="mono">export.all</span>. Contact merge and the duplicate finder: founders and sales.</div>`)}
    ${card('Fixed by role', stbl('<th>Role</th><th>Never receives</th><th>Scope</th>', Object.keys(ROLES).map(r => `<tr><td>${roleBadge(r)}</td><td class="small">${ROLE_HIDDEN[r].length ? ROLE_HIDDEN[r].map(f => `<span class="mono">${f}</span>`).join(', ') : '—'}</td><td class="small">${{ founders: 'Everything, always: delete, restore, overrides, exports, People, Rules, Options, Access.', sales: 'Contact lists capped at 60 rows.', ops: 'Only Order Confirmed → Closed and Cancelled deals; cannot set a contact\'s source, tags or lifecycle.', marketing: 'Phones ••••1234, emails a•••@domain; no vendor list.' }[r]}</td></tr>`).join('')), { flush: true })}
    ${card('Exports & bulk reads', `<div class="label">Events</div>${BULK_EVENTS.length ? stbl('<th>When</th><th>Who</th><th>What</th>', ev, 'set-cards set-compact') : '<div class="empty small">No exports, deletions or flags on record.</div>'}
      <div class="label mt-24">Reads per person, last 14 days <span class="muted" style="text-transform:none;letter-spacing:0">· lists loaded + records opened</span></div>
      ${reads.length ? stbl('<th>Day</th><th>Who</th><th class="num">Lists</th><th class="num">Records</th><th class="num">Total</th><th>Flag</th>', rr, 'set-cards set-compact') : '<div class="empty small">Nobody but founders has read anything yet today; staff reads appear here per day.</div>'}`,
      { right: `<span class="row gap-6 xs muted">flag at ${soft || 'off'} · stop at ${hard || 'off'} reads a day<button class="btn sm ghost" data-go="#/settings/rules">Change</button></span>` })}`;
}
function mountAccess(root) {
  root.querySelectorAll('[data-perm]').forEach(cb => cb.addEventListener('change', () => {
    const [r, k] = cb.dataset.perm.split('|'), d = permDraft();
    d[r] = cb.checked ? [...new Set([...d[r], k])] : d[r].filter(x => x !== k);
    render();
  }));
}
ACTIONS.setAccessReset = () => { ST.perms = Object.fromEntries(STAFF.map(r => [r, (PERMS[r] || []).slice()])); render(); toast('Built-in defaults loaded. Save to apply', 'undo'); };
ACTIONS.setAccessSave = () => {
  const diff = permDiff(), d = permDraft();
  if (!diff.length) return toast('Nothing changed', 'check');
  STAFF.forEach(r => { ROLE_PERMS[r] = ROLE_PERMS[r] || []; ROLE_PERMS[r].splice(0, ROLE_PERMS[r].length, ...PERM_LABELS.map(p => p[0]).filter(k => d[r].includes(k))); });
  audit('perms_save', 'settings', 'role_perms', diff.join('; '));
  const sens = diff.filter(x => x.includes(' + ') && SENSITIVE_PERMS.includes(x.split(' + ')[1]));
  ST.perms = null; render();
  toast(sens.length ? `Access saved. Sensitive: ${sens.join(', ')}. Take it back tomorrow` : `Access saved · ${diff.length} change${diff.length > 1 ? 's' : ''}`, 'key');
};

/* ---------- People ---------- */
const SIGNIN_RULES = () => `<ul class="set-ul small">
  <li>${icon('lock', 'sm')}<span>Five wrong attempts lock that username, from that address, for 15 minutes: "Too many attempts. Try again in 15 minutes."</span></li>
  <li>${icon('key', 'sm')}<span>New users, and anyone whose password a founder resets, must set their own at the next sign-in (10 characters or more, typed twice).</span></li>
  <li>${icon('user', 'sm')}<span>An inactive user gets the same "Wrong username or password" as a typo, so nothing gives away which accounts exist.</span></li>
  <li>${icon('clock', 'sm')}<span>A stale page asks to reload: "Session expired — reload the page". Sign out ends this device only; founders can sign anyone out everywhere.</span></li></ul>`;
function panePeople() {
  const meU = me();
  const rows = USERS.map(u => {
    const self = u.id === meU.id, otherF = u.role === 'founders' && !self;
    const acts = `<button class="btn sm" data-act="setUserEdit" data-id="${u.id}">${icon('edit', 'sm')}Edit</button>${!otherF && !self ? `<button class="btn sm" data-act="setUserPw" data-id="${u.id}">${icon('key', 'sm')}Set password</button>` : ''}${!otherF ? `<button class="btn sm danger" data-act="setUserOut" data-id="${u.id}">${icon('logout', 'sm')}Sign out</button>` : '<span class="xs muted">another founder</span>'}`;
    return `<tr class="${u.active ? '' : 'set-off-row'}"><td class="f"><span class="set-who">${av(u.name, u.color, 'sm')}<span class="grow"><span class="strong">${esc(u.name)}</span>${self ? ' <span class="xs muted">(you)</span>' : ''}<div class="mono xs muted">${esc(u.username)}${u.note ? ' · ' + esc(u.note) : ''}</div></span></span></td>
      <td class="f">${roleBadge(u.role)}<div class="xs muted mt-8 set-src">${u.home_source ? 'Source: ' + esc(u.home_source) : 'Default source'}${u.must_change ? ' · <span class="set-amber">must change pw</span>' : ''}</div></td>
      <td class="set-nw small" data-l="Last login">${u.last_login ? dt(u.last_login) : 'never'}${u.active ? '' : '<div class="xs muted">inactive</div>'}</td><td class="f"><div class="row wrap gap-6">${acts}</div></td></tr>`;
  }).join('');
  const logins = ST.logins.map(([d, t, un, res, note]) => `<tr><td class="set-nw small">${dt(at(d, t))}</td><td class="mono">${esc(un)}</td><td>${res === 'ok' ? badge('signed in', 'green') : res === 'locked' ? badge('locked 15 min', 'red') : badge('wrong password', 'amber')}</td><td class="small muted f">${esc(note)}</td></tr>`).join('');
  return `${card('People', `${stbl('<th>User</th><th>Role</th><th>Last login</th><th>Actions</th>', rows, 'set-people set-cards')}
      <div class="small muted set-pad">Sign out ends that person's session on every device at their next click. Set password does the same and makes them choose a new one at sign-in. Neither works on another founder.</div>`,
      { flush: true, right: `<button class="btn sm primary" data-act="setUserNew">${icon('plus', 'sm')}User</button>` })}
    <div class="grid g2">${card('What each role is for', `<div class="set-roles">${[['founders', 'Everything: deletes, restores, overrides, exports, People, Rules, Options, Access.'], ['sales', 'Leads, quotes, orders up to S1, payments. No buyback, no margins.'], ['ops', 'Orders S1–S6, QC, billing corrections, metal rates, Demand, stock. No sources or budgets.'], ['marketing', 'Dashboards, leads, templates. Phones masked, no money, no bulk export.']].map(([r, t]) => `<div class="row top">${roleBadge(r)}<span class="small ink2">${t}</span></div>`).join('')}</div>`)}${card('Sign-in safety', SIGNIN_RULES())}</div>
    ${card('Recent sign-in attempts', stbl('<th>When</th><th>Username</th><th>Result</th><th>Note</th>', logins, 'set-cards set-compact'), { flush: true })}`;
}
function userForm(u) {
  const isNew = !u, meU = me(); u = u || { username: '', name: '', role: 'sales', home_source: '', active: 1 };
  const self = !isNew && u.id === meU.id, otherF = !isNew && u.role === 'founders' && !self, srcs = opts('source_channels');
  openSheet({ title: isNew ? 'New user' : 'Edit ' + esc(u.name), sub: isNew ? 'They sign in with this username and the initial password, then choose their own.' : esc(u.username) + ' · ' + ROLES[u.role],
    body: `<div class="fgrid">
      ${field('Username', `<input class="input" id="set-u-username" value="${esc(u.username)}" autocapitalize="none" autocomplete="off" placeholder="e.g. priya">`, '3–30 characters: a–z, 0–9, dot, dash, underscore. Stored lower-case.')}
      ${field('Name', `<input class="input" id="set-u-name" value="${esc(u.name)}" placeholder="Full name">`)}
      ${field('Role', `<select class="select" id="set-u-role" ${otherF ? 'disabled' : ''}>${Object.entries(ROLES).map(([r, n]) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${n}</option>`).join('')}</select>`, self ? 'You cannot demote yourself.' : '')}
      ${field('Default source <em>for leads they capture</em>', `<select class="select" id="set-u-src"><option value="">— use the default (${esc(SETTINGS.default_source)}) —</option>${srcs.map(s => `<option ${s === u.home_source ? 'selected' : ''}>${esc(s)}</option>`).join('')}${u.home_source && !srcs.includes(u.home_source) ? `<option selected value="${esc(u.home_source)}">${esc(u.home_source)} (not in list)</option>` : ''}</select>`)}
      ${field('Active', `<select class="select" id="set-u-active"><option value="1" ${u.active ? 'selected' : ''}>Yes</option><option value="0" ${u.active ? '' : 'selected'}>No</option></select>`, 'Inactive users cannot sign in; their history stays.')}
      ${field(isNew ? 'Initial password <em>(10+; they must change it)</em>' : 'Reset password <em>(blank = keep)</em>', `<input class="input" type="password" id="set-u-pw" autocomplete="new-password" ${otherF || self ? 'disabled' : ''}>`, otherF ? 'Another founder\'s password can only be changed by that founder.' : self ? 'Change your own in Session & password.' : !isNew ? 'Resetting signs them out everywhere and asks for a new one at sign-in.' : '')}
      </div>`,
    foot: `${cancelBtn}<button class="btn primary" data-act="setUserSave" data-id="${isNew ? '' : u.id}">${icon('check', 'sm')}Save</button>` });
}
ACTIONS.setUserNew = () => userForm(null);
ACTIONS.setUserEdit = el => userForm(USERS.find(u => u.id === el.dataset.id));
ACTIONS.setUserSave = el => {
  const u = el.dataset.id ? USERS.find(x => x.id === el.dataset.id) : null, meU = me();
  const username = val('set-u-username').toLowerCase(), name = val('set-u-name'), role = val('set-u-role') || (u && u.role), src = val('set-u-src'), active = +val('set-u-active'), pw = val('set-u-pw');
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return err('Username: 3–30 chars, letters/numbers/._-');
  if (USERS.some(x => x.username === username && x !== u)) return err('Username taken');
  if (!name) return err('Name required');
  if (src && !opts('source_channels').includes(src) && !(u && u.home_source === src)) return err('Default source must be on the Sources list');
  if (u && u.id === meU.id && (role !== 'founders' || !active)) return err('You cannot lock yourself out.');
  if (!u && pw.length < 10) return err('Use at least 10 characters for the initial password.');
  if (u && pw && pw.length < 10) return err('Use at least 10 characters.');
  if (!u) {
    const colors = ['#8C6D3F', '#3A6597', '#2E7A57', '#5E4FA2', '#B0433A', '#A86F14'];
    USERS.push({ id: 'u' + (USERS.length + 1) + Date.now().toString(36).slice(-3), username, name, role, home_source: src, active, last_login: null, initials: initials(name), color: colors[USERS.length % colors.length], must_change: 1 });
  } else {
    Object.assign(u, { username, name, role, home_source: src, active, initials: initials(name) });
    if (pw) u.must_change = 1;
  }
  audit('user_save', 'user', username, u ? `edited${pw ? ' · password reset' : ''}` : `new ${ROLES[role]} user`);
  closeLayer(); render();
  toast(!u ? `Saved. ${name} must set a new password at first sign-in` : pw ? 'Saved · password reset; they must change it at next sign-in' : 'Saved', 'users');
};
ACTIONS.setUserPw = el => { const u = USERS.find(x => x.id === el.dataset.id);
  modal('Set password: ' + esc(u.name), field('New password <em>(10+)</em>', '<input class="input" type="password" id="set-pw-new1" autocomplete="new-password">'), `${cancelBtn}<button class="btn primary" data-act="setUserPwOk" data-id="${u.id}">${icon('key', 'sm')}Set password</button>`, 'They are signed out everywhere and must change this at their next sign-in.');
  setTimeout(() => { const i = document.getElementById('set-pw-new1'); if (i) i.focus(); }, 30);
};
ACTIONS.setUserPwOk = el => { const u = USERS.find(x => x.id === el.dataset.id), pw = val('set-pw-new1');
  if (pw.length < 10) return err('Use at least 10 characters.');
  u.must_change = 1; audit('password_reset', 'user', u.username, 'by a founder; signed out everywhere');
  closeLayer(); render(); toast('Password set. They must change it at next sign-in', 'key');
};
ACTIONS.setUserOut = el => { const u = USERS.find(x => x.id === el.dataset.id), self = u.id === me().id;
  modal(self ? 'Sign yourself out everywhere?' : 'Sign out ' + esc(u.name) + '?', `<p class="small ink2">${self ? 'Every device you are signed in on, including this one, goes back to the login screen.' : 'Their session ends on every device at their next click. They can sign in again with their password.'}</p>`,
    `${cancelBtn}<button class="btn primary" data-act="setUserOutOk" data-id="${u.id}">${icon('logout', 'sm')}Sign out</button>`);
};
ACTIONS.setUserOutOk = el => { const u = USERS.find(x => x.id === el.dataset.id);
  audit('user_signout', 'user', u.username, 'every device');
  if (u.id === me().id) { closeLayer(); go('#/login'); return; }
  closeLayer(); toast(`${u.name} signed out everywhere`, 'logout');
};

/* ---------- Session & password ---------- */
function paneSession() {
  const u = me();
  return `<div class="grid g2">
    ${card('Session', `<div class="row">${av(u.name, u.color, 'lg')}<div class="grow"><div class="xs muted">Signed in as</div><div class="strong set-big">${esc(u.name)}</div><div class="row gap-6 mt-8">${roleBadge(u.role)}<span class="mono xs muted">${esc(u.username)}</span></div></div></div>
      <button class="btn block mt-16" data-act="setLogout">${icon('logout')}Log out</button>
      <div class="xs muted mt-8">Signs this device out. Founders can sign a user out of every device from People.</div>
      <div class="xs muted mt-8">Last sign-in ${u.last_login ? dt(u.last_login) : 'never'}.</div>`)}
    ${card('Your password', `${u.must_change ? `<div class="banner">${icon('key')}<div class="small"><b>Set your password.</b> A founder reset it: choose your own, 10 characters or more, before you carry on.</div></div>` : ''}
      <div class="stack-s ${u.must_change ? 'mt-12' : ''}">${field('Current', '<input class="input" type="password" id="set-pw-cur" autocomplete="current-password">')}
      ${field('New <em>(10+ characters)</em>', '<input class="input" type="password" id="set-pw-new" autocomplete="new-password">')}
      ${field('Again', '<input class="input" type="password" id="set-pw-again" autocomplete="new-password">')}</div>
      <button class="btn primary mt-16" data-act="setPwChange">${icon('key', 'sm')}Change password</button>`)}</div>
    ${card('Sign-in safety', SIGNIN_RULES())}`;
}
ACTIONS.setLogout = () => { audit('logout', 'user', me().username, ''); go('#/login'); };
ACTIONS.setPwChange = () => {
  const cur = val('set-pw-cur'), nw = val('set-pw-new'), again = val('set-pw-again');
  if (!cur) return err('Current password is wrong');
  if (nw.length < 10) return err('Use at least 10 characters.');
  if (nw !== again) return err('They do not match.');
  const u = me(); u.must_change = 0; audit('password_change', 'user', u.username, '');
  ['set-pw-cur', 'set-pw-new', 'set-pw-again'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  render(); toast('Password changed', 'key');
};

/* ---------- Boundaries baked in ---------- */
const paneBoundaries = () => card('Boundaries baked in', `<ul class="set-ul">
  <li>${icon('star', 'sm')}<span><b>One brand: MARQA.</b> Partner boutiques, marketplaces, the showroom and the website are <i>sources</i>, kept for attribution; no message ever carries another brand.</span></li>
  <li>${icon('globe', 'sm')}<span><b>International deals are flagged at capture</b> and carry a warning at every stage: export compliance applies, founders sign off before invoicing.</span></li>
  <li>${icon('shield', 'sm')}<span><b>Nothing is ever deleted.</b> Lost is a stage, an undo is a tombstone, deletions go to the Trash, and daily backups are kept for 30 days.</span></li>
  <li>${icon('receipt', 'sm')}<span><b>Tax invoices come from Zoho Books.</b> This system records the invoice number; it never issues one.</span></li></ul>`, { right: badge('static', 'out') });

/* ---------- Business ---------- */
function paneBusiness() {
  const ent = opts('invoice_entities');
  return `${card('Business', `<div class="fgrid">
      ${field('Trading name', `<input class="input" data-biz="name" value="${esc(TENANT.name)}">`)}
      ${field('Legal name', `<input class="input" data-biz="legal" value="${esc(TENANT.legal)}">`)}
      ${field('GSTIN', `<input class="input num" data-biz="gstin" value="${esc(TENANT.gstin)}" maxlength="15" autocapitalize="characters">`, '15 characters, e.g. 07ABCDE1234F1Z5.')}
      ${field('Company on PDFs and invoices', `<input class="input" data-biz="company" value="${esc(SETTINGS.company)}">`, 'Same as Rules → Company.')}
      ${field('WhatsApp business number', `<input class="input num" data-biz="whatsapp" value="${esc(TENANT.whatsapp)}" inputmode="tel">`)}
      ${field('Website', `<input class="input" data-biz="site" value="${esc(TENANT.site)}">`)}
      ${field('Showroom address', '<input class="input" data-biz="address" value="' + esc(TENANT.address || 'C-57, Central Market, Lajpat Nagar II, New Delhi 110024') + '">', '', 'full')}
      <div class="field full"><span>Logo on quotes and invoices</span><div class="row wrap"><div class="set-logo ${ST.logo}">${BRAND.wordmark('wm')}</div><span class="xs muted grow">${ST.logo === 'upload' ? 'marqa-logo-2026.svg (uploaded)' : ST.logo === 'gold' ? 'Wordmark in gold' : 'Wordmark in ink'}</span><button class="btn sm" data-act="setLogo">${icon('image', 'sm')}Replace</button></div></div>
      <div class="field full"><span>Invoicing entities</span><div class="row wrap gap-6">${ent.map(e => badge(e, 'gold')).join('')}<button class="btn sm ghost" data-go="#/settings/options">Edit in Options</button></div></div></div>`,
    { right: `<button class="btn sm primary" data-act="setBizSave">${icon('check', 'sm')}Save</button>` })}
    ${card('Stores', `<div class="set-stores">${TENANT.stores.map((s, i) => `<div class="set-store">${icon(/online/i.test(s) ? 'globe' : 'store')}<span class="grow strong small">${esc(s)}</span>${i ? `<button class="set-ib del" data-act="setStoreDel" data-i="${i}" aria-label="Remove ${esc(s)}">${icon('x', 'sm')}</button>` : '<span class="xs muted">main</span>'}</div>`).join('')}</div>`,
      { right: `<button class="btn sm" data-act="setStoreAdd">${icon('plus', 'sm')}Add store</button>` })}`;
}
ACTIONS.setBizSave = () => {
  const g = k => { const e = document.querySelector(`[data-biz="${k}"]`); return e ? e.value.trim() : ''; };
  const gst = g('gstin').toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) return err('GSTIN looks wrong: 15 characters, e.g. 07ABCDE1234F1Z5');
  if (!g('name')) return err('Trading name required');
  Object.assign(TENANT, { name: g('name'), legal: g('legal'), gstin: gst, whatsapp: g('whatsapp'), site: g('site'), address: g('address') });
  SETTINGS.company = g('company') || SETTINGS.company;
  audit('settings_save', 'settings', 'business', 'company details');
  render(); toast('Business details saved', 'store');
};
const logoPicker = () => `<div class="stack-s">${[['ink', 'Wordmark in ink', 'For white paper'], ['gold', 'Wordmark in gold', 'For the cream letterhead'], ['upload', 'Upload a file', 'SVG or PNG, at least 600 px wide']].map(([v, n, s]) =>
  `<div class="pick ${ST.logoPick === v ? 'on' : ''}" data-act="setLogoPick" data-v="${v}"><div class="set-logo sm ${v}">${v === 'upload' ? icon('upload') : BRAND.wordmark('wm')}</div><div class="grow"><div class="strong small">${n}</div><div class="xs muted">${v === 'upload' && ST.logoPick === 'upload' ? 'marqa-logo-2026.svg · 14 KB' : s}</div></div>${ST.logoPick === v ? icon('check') : ''}</div>`).join('')}</div>`;
ACTIONS.setLogo = () => { ST.logoPick = ST.logo; modal('Replace logo', `<div id="set-logo-pick">${logoPicker()}</div>`, `${cancelBtn}<button class="btn primary" data-act="setLogoOk">Use this logo</button>`, 'Printed on quotations, karigar order sheets and invoices.'); };
ACTIONS.setLogoPick = el => { ST.logoPick = el.dataset.v; const box = document.getElementById('set-logo-pick'); if (box) box.innerHTML = logoPicker(); };
ACTIONS.setLogoOk = () => { ST.logo = ST.logoPick; closeLayer(); render(); audit('settings_save', 'settings', 'logo', ST.logo); toast('Logo replaced. New PDFs use it', 'image'); };
ACTIONS.setStoreAdd = () => modal('Add store', `<div class="fgrid">${field('Name', '<input class="input" id="set-st-name" placeholder="e.g. Khan Market showroom">', '', 'full')}
  ${field('Kind', '<select class="select" id="set-st-kind"><option>Showroom</option><option>Online</option><option>Exhibition counter</option></select>')}${field('City', `<select class="select" id="set-st-city">${opts('cities').map(c => `<option>${esc(c)}</option>`).join('')}</select>`)}</div>`,
  `${cancelBtn}<button class="btn primary" data-act="setStoreAddOk">${icon('plus', 'sm')}Add store</button>`, 'Each store gets its own stock locations and appears in the store switcher.');
ACTIONS.setStoreAddOk = () => { const n = val('set-st-name'); if (!n) return err('Give the store a name');
  if (TENANT.stores.some(s => s.toLowerCase() === n.toLowerCase())) return err('That store is already listed');
  TENANT.stores.push(n); audit('settings_save', 'settings', 'stores', 'added ' + n); closeLayer(); render(); toast(`Store "${n}" added`, 'store'); };
ACTIONS.setStoreDel = el => { const [s] = TENANT.stores.splice(+el.dataset.i, 1); render(); toast(`Store "${s}" removed`, 'x'); };

/* ---------- Workflow (the real 18 stages and their checks) ---------- */
function ckRow(stage, [key, label, req, rule, hint, either]) {
  const custom = ST.customChecks.has(stage + '|' + key);
  const kind = rule && !either ? badge('System', 'blue') : rule ? badge('System or tick', 'violet') : badge('Manual', 'out');
  return `<div class="ck set-ck"><span class="set-star" title="${req ? 'Required to move on' : 'Optional'}">${req ? '★' : ''}</span><span class="grow"><span class="small">${esc(label)}</span>${hint ? `<div class="xs muted">${esc(hint)}</div>` : ''}</span>${kind}${custom ? `${badge('added', 'gold')}<button class="set-ib del" data-act="setCheckDel" data-stage="${esc(stage)}" data-key="${key}" aria-label="Remove check">${icon('x', 'sm')}</button>` : ''}</div>`;
}
function paneWorkflow() {
  const blocks = [];
  DSTAGES.forEach(s => {
    const cl = CHECKLISTS[s.key] || [], req = cl.filter(c => c[2]).length;
    blocks.push(`<section class="card set-stage"><div class="card-h"><div class="row grow"><span class="set-num">${s.i + 1}</span>${stagePill(s.key)}<span class="badge out">${s.sop}</span><span class="xs muted">${cl.length} checks · ${req} required</span></div>
      <div class="row gap-6"><button class="btn sm ghost" data-act="setStageRename" data-stage="${esc(s.key)}">${icon('edit', 'sm')}Rename</button>${s.group !== 'lost' ? `<button class="btn sm ghost" data-act="setCheckAdd" data-stage="${esc(s.key)}">${icon('plus', 'sm')}Add check</button>` : ''}</div></div>
      <div class="card-b"><div class="small muted">${esc(s.help)}</div>${cl.length ? `<div class="checks">${cl.map(c => ckRow(s.key, c)).join('')}</div>` : `<div class="small mt-8">${s.group === 'lost' ? 'No checks. A reason from the Lost reasons list is required.' : 'No checks.'}</div>`}
      ${Object.entries(TYPE_SKIPS).filter(([, sk]) => sk.includes(s.key)).length ? `<div class="xs muted mt-8">Skipped for ${Object.entries(TYPE_SKIPS).filter(([, sk]) => sk.includes(s.key)).map(([t]) => t).join(', ')} deals.</div>` : ''}</div></section>`);
    ST.extraStages.filter(x => x.after === s.key).forEach(x => blocks.push(`<section class="card set-stage set-extra"><div class="card-h"><div class="row grow"><span class="set-num">+</span><span class="spill ${x.group}">${esc(x.label)}</span>${badge('custom · draft', 'gold')}</div>
      <button class="btn sm ghost danger" data-act="setStageDel" data-id="${x.id}">${icon('x', 'sm')}Remove</button></div><div class="card-b small muted">A sub-step after ${esc(stg(x.after).label)}. It shows on the SOP panel once published; the stage gates stay as they are.</div></section>`));
  });
  return `<div class="set-bar"><div class="grow"><div class="strong">Workflow</div><div class="xs muted">18 stages in five groups. <b>★</b> required to move on · <b>System</b> cleared only by the record · <b>Manual</b> ticked by staff · <b>System or tick</b> either.</div></div>
      <button class="btn sm primary" data-act="setStageAdd">${icon('plus', 'sm')}Add stage</button></div>
    ${card('Deal types', `<div class="set-types">${DEAL_TYPES.map(t => `<div><span class="strong small">${t}</span><div class="xs muted">${TYPE_SKIPS[t] ? 'Skips ' + TYPE_SKIPS[t].map(k => stg(k).label).join(', ') : 'Every stage'}</div></div>`).join('')}</div>`)}
    ${blocks.join('')}
    ${card('QC checklist (Quality check stage)', `<div class="set-types">${QC_SECTIONS.map(([n, items]) => `<div><span class="strong small">${esc(n)}</span><div class="xs muted">${items.length} items${items.some(i => i.startsWith('★')) ? ' · ★ budget items' : ''}</div></div>`).join('')}</div><div class="xs muted mt-12">${QC_SECTIONS.reduce((s, x) => s + x[1].length, 0)} items; every one ticked for PASS. Rework sends it back to production; Reject goes to founders.</div>`)}`;
}
ACTIONS.setStageRename = el => { const s = stg(el.dataset.stage);
  modal('Rename stage', field('Name shown everywhere', `<input class="input" id="set-stage-name" value="${esc(s.label)}">`, `Key <span class="mono">${esc(s.key)}</span> stays the same, so history and reports are unaffected.`), `${cancelBtn}<button class="btn primary" data-act="setStageRenameOk" data-stage="${esc(s.key)}">Rename</button>`); };
ACTIONS.setStageRenameOk = el => { const s = DSTAGES.find(x => x.key === el.dataset.stage), n = val('set-stage-name');
  if (!n) return err('A stage needs a name');
  if (n === s.label) { closeLayer(); return toast('Name unchanged', 'check'); }
  const old = s.label; s.label = n; audit('settings_save', 'workflow', s.key, `${old} → ${n}`); closeLayer(); render(); toast(`Stage renamed: ${old} → ${n}`, 'edit'); };
ACTIONS.setCheckAdd = el => { const s = stg(el.dataset.stage);
  modal('Add a check to ' + esc(s.label), `<div class="fgrid">${field('What must be done', '<input class="input" id="set-ck-label" placeholder="e.g. Ring sizer photo attached">', '', 'full')}
    ${field('Required to move on?', '<select class="select" id="set-ck-req"><option value="1">Yes ★</option><option value="0">No, optional</option></select>')}${field('Cleared by', '<select class="select" id="set-ck-kind"><option>A tick by staff (manual)</option></select>', 'System checks read the record and need a release.')}</div>`,
    `${cancelBtn}<button class="btn primary" data-act="setCheckAddOk" data-stage="${esc(s.key)}">${icon('plus', 'sm')}Add check</button>`); };
ACTIONS.setCheckAddOk = el => { const k = el.dataset.stage, label = val('set-ck-label');
  if (!label) return err('Say what must be done');
  const key = 'custom_' + Date.now().toString(36); CHECKLISTS[k] = CHECKLISTS[k] || [];
  CHECKLISTS[k].push([key, label, +val('set-ck-req'), '', 'Tick it on the deal\'s SOP panel']); ST.customChecks.add(k + '|' + key);
  audit('settings_save', 'workflow', k, 'check added: ' + label); closeLayer(); render(); toast(`Check added to ${stg(k).label}`, 'check'); };
ACTIONS.setCheckDel = el => { const k = el.dataset.stage, key = el.dataset.key; CHECKLISTS[k] = (CHECKLISTS[k] || []).filter(c => c[0] !== key); ST.customChecks.delete(k + '|' + key); render(); toast('Check removed', 'x'); };
ACTIONS.setStageAdd = () => modal('Add stage', `<div class="fgrid">${field('Name', '<input class="input" id="set-sg-name" placeholder="e.g. Engraving">', '', 'full')}
  ${field('After', `<select class="select" id="set-sg-after">${DSTAGES.filter(s => s.i <= 14).map(s => `<option value="${esc(s.key)}" ${s.key === 'In Production' ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>`)}
  ${field('Group', '<select class="select" id="set-sg-group"><option value="order">Order</option><option value="quote">Quote</option><option value="lead">Lead</option></select>')}</div>`,
  `${cancelBtn}<button class="btn primary" data-act="setStageAddOk">${icon('plus', 'sm')}Add stage</button>`, 'Custom stages are sub-steps: they show on the SOP panel and the board, and never change the 18-stage gates.');
ACTIONS.setStageAddOk = () => { const n = val('set-sg-name'); if (!n) return err('Give the stage a name');
  const x = { id: 'xs' + Date.now().toString(36), label: n, after: val('set-sg-after'), group: val('set-sg-group') }; ST.extraStages.push(x);
  audit('settings_save', 'workflow', x.id, 'stage added: ' + n); closeLayer(); render(); toast(`Stage "${n}" added after ${stg(x.after).label}`, 'layers'); };
ACTIONS.setStageDel = el => { ST.extraStages = ST.extraStages.filter(x => x.id !== el.dataset.id); render(); toast('Custom stage removed', 'x'); };

/* ---------- Integrations ---------- */
const INTEG = [
  { k: 'wa', n: 'WhatsApp Business', ic: 'wa', d: on => on ? 'Connected · ' + TENANT.whatsapp : 'Not connected' },
  { k: 'shopify', n: 'Shopify', ic: 'store', d: on => on ? 'Connected · ' + TENANT.site + ' · custom-order popup' : 'Not connected' },
  { k: 'zoho', n: 'Zoho Books', ic: 'receipt', d: on => on ? 'Connected · invoice numbers sync nightly' : 'Invoice numbers typed in by hand' },
  { k: 'gsheet', n: 'Google Sheet → leads', ic: 'file', d: () => SETTINGS.sheets_csv_url ? 'Linked · last fetch ' + (SETTINGS.sheets_last_fetch ? dt(new Date(SETTINGS.sheets_last_fetch.replace(' ', 'T') + ':00')) : 'never') : 'No sheet linked' },
  { k: 'gcontacts', n: 'Google Contacts', ic: 'users', d: () => 'CSV export with your naming templates' },
  { k: 'razorpay', n: 'Razorpay', ic: 'card', d: on => on ? 'Connected (test mode) · payment links' : 'Payment links for advances and balances' },
  { k: 'igi', n: 'IGI report check', ic: 'gem', d: on => on ? 'Connected · verifies certificate numbers' : 'Not connected' }
];
const integOn = k => k === 'gsheet' ? !!SETTINGS.sheets_csv_url : k === 'gcontacts' ? true : !!ST.integ[k];
function paneIntegrations() {
  return `<div class="grid g2">${INTEG.map(x => { const on = integOn(x.k); return `<div class="card"><div class="card-b row"><span class="badge ${on ? 'gold' : ''} set-ico">${icon(x.ic)}</span><div class="grow"><div class="strong">${x.n}</div><div class="small muted">${esc(x.d(on))}</div></div>
    <button class="btn sm ${on ? '' : 'primary'}" data-act="setInteg" data-k="${x.k}">${on ? 'Manage' : 'Connect'}</button></div></div>`; }).join('')}</div>
    <div class="small muted mt-16">${icon('shield', 'sm')} Keys and tokens are stored on the server, never shown again after saving, and every connection change is in the audit log.</div>`;
}
function integBody(k) {
  const sw = (label, on, dis) => `<label class="row between set-swrow"><span class="small">${label}</span><span class="switch"><input type="checkbox" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span></span></span></label>`;
  const consented = CONTACTS.filter(c => c.consent_marketing).length;
  if (k === 'wa') { const cats = ['utility', 'marketing', 'service'].map(c => `${TEMPLATES.filter(t => t.cat === c).length} ${c}`).join(' · ');
    return `<div class="fgrid">${field('Business number', `<input class="input num" value="${esc(TENANT.whatsapp)}" readonly>`)}${field('Display name', '<input class="input" value="MARQA">')}</div>
      <div class="stack-s mt-16"><div class="small"><b>Templates:</b> ${TEMPLATES.length} (${cats})</div><div class="small"><b>Consent:</b> marketing templates go only to contacts who said yes (${consented} of ${CONTACTS.length} today).</div>
      <div class="small"><b>Reply SLA:</b> WhatsApp ${SETTINGS.sla_whatsapp_hours} h · email ${SETTINGS.sla_email_hours} h (Rules).</div>${sw('Log every send on the deal timeline', 1, 1)}${sw('Let the AI assistant send L1 to new enquiries', 1)}</div>
      <div class="row wrap mt-16"><button class="btn sm" data-go="#/messages">${icon('send', 'sm')}Template library</button><button class="btn sm" data-act="setWaTest">${icon('wa', 'sm')}Send a test to me</button></div>`; }
  if (k === 'shopify') return `<div class="fgrid">${field('Store', `<input class="input" value="${esc(TENANT.site)}" readonly>`)}
      ${field('Popup enquiries arrive with source', `<select class="select">${opts('source_channels').map(s => `<option ${s === 'Website' ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}
      ${field('…and source code', `<select class="select">${opts('source_codes').map(s => `<option ${s === 'WEB' ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}</div>
      <div class="stack-s mt-16">${sw('Create an enquiry at New for every custom-order popup', 1)}${sw('Attach the product photo the client was viewing', 1)}${sw('List tagged stock jewellery as available', 0)}</div>
      <button class="btn sm mt-16" data-act="setShopSync">${icon('refresh', 'sm')}Sync products now</button>`;
  if (k === 'zoho') return `<div class="small ink2">Tax invoices are issued in Zoho Books; the pipeline records the number on the deal (Billing → GST invoice no.) and never issues one itself.</div>
      <div class="fgrid mt-16">${field('Organisation ID', '<input class="input num" placeholder="e.g. 60012345678" inputmode="numeric">')}${field('Invoicing entities', `<input class="input" value="${esc(opts('invoice_entities').join(', '))}" readonly>`)}</div>
      <div class="small mt-16"><b>Owner map</b> (Rules): ${SETTINGS.zoho_owner_map ? esc(SETTINGS.zoho_owner_map.split('\n').length + ' people mapped') : 'empty'}</div>
      <div class="row wrap mt-12"><button class="btn sm" data-go="#/settings/rules">${icon('scale', 'sm')}Owner map in Rules</button><button class="btn sm" data-go="#/data">${icon('layers', 'sm')}Zoho migration bundle</button></div>`;
  if (k === 'gsheet') return `<div class="small ink2">A published Google Sheet tab (CSV) becomes new enquiries at New. Each fetch skips rows already taken and is an import batch you can undo.</div>
      ${field('Published CSV link', `<input class="input mono" value="${esc(SETTINGS.sheets_csv_url || '')}" readonly>`, '', 'mt-16')}
      <div class="small mt-12">Last fetch: ${SETTINGS.sheets_last_fetch ? esc(dt(new Date(SETTINGS.sheets_last_fetch.replace(' ', 'T') + ':00'))) : 'never'}</div>
      <div class="row wrap mt-16"><button class="btn sm gold" data-act="datSheetFetch">${icon('refresh', 'sm')}Fetch now</button><button class="btn sm" data-go="#/data">${icon('layers', 'sm')}Open Data</button></div>`;
  if (k === 'gcontacts') { const c = contactById('c1');
    return `<div class="small ink2">Contacts go to Google as a CSV in Google's own import format. There is no live sync, so phones and laptops stay in step only when you re-export.</div>
      <div class="set-preview mt-16"><div class="xs muted">How ${esc(c.name)} will look in Google Contacts</div><div class="mt-8"><b>${esc(fillTokens(SETTINGS.google_first_template, c))}</b> ${esc(fillTokens(SETTINGS.google_last_template, c))}</div>
      <div class="xs muted mt-8">${String(SETTINGS.google_custom_fields || '').split('\n').filter(Boolean).map(l => { const [a, b] = l.split('='); return esc((a || '').trim()) + ': ' + esc(fillTokens(b, c)); }).join(' · ')}</div></div>
      <div class="row wrap mt-16">${can('export.all') && can('export.google') ? `<button class="btn sm gold" data-act="datExport" data-what="google">${icon('download', 'sm')}Download Google Contacts CSV</button>` : '<span class="xs muted">Export needs the two export permissions (Access).</span>'}<button class="btn sm" data-go="#/settings/rules">${icon('scale', 'sm')}Naming in Rules</button></div>`; }
  if (k === 'razorpay') return `<div class="small ink2">Send a payment link for an advance or a balance from the deal's Billing tab. Paid links record the payment with mode UPI or Card and the Razorpay reference.</div>
      <div class="fgrid mt-16">${field('Key ID', '<input class="input mono" placeholder="rzp_test_…" autocomplete="off">', 'Use a test key until the first live month.')}${field('Link expires after', '<select class="select"><option>24 hours</option><option>48 hours</option><option>7 days</option></select>')}</div>
      <div class="stack-s mt-16">${sw('Send B1 (advance receipt) automatically when a link is paid', 1)}</div>`;
  if (k === 'igi') return `<div class="small ink2">Checks a certificate number against IGI's public report check before a stone goes into the safe, and fills shape, carat, colour and clarity.</div>
      <div class="row mt-16"><input class="input mono grow" id="set-igi-no" value="LG620419872" aria-label="Certificate number"><button class="btn sm gold" data-act="setIgiLook">${icon('search', 'sm')}Look up</button></div><div id="set-igi-res" class="mt-12"></div>`;
  return '';
}
ACTIONS.setInteg = el => { const x = INTEG.find(i => i.k === el.dataset.k), on = integOn(x.k), fixed = ['gsheet', 'gcontacts'].includes(x.k);
  openSheet({ title: x.n, sub: esc(x.d(on)), body: integBody(x.k),
    foot: fixed ? '<button class="btn" data-act="close">Close</button>' : `${on ? `<button class="btn danger" data-act="setIntegToggle" data-k="${x.k}">Disconnect</button>` : ''}<span class="grow"></span>${cancelBtn}<button class="btn primary" data-act="${on ? 'setIntegSave' : 'setIntegToggle'}" data-k="${x.k}">${on ? 'Save' : 'Connect'}</button>` });
};
ACTIONS.setIntegSave = el => { const x = INTEG.find(i => i.k === el.dataset.k); closeLayer(); audit('settings_save', 'integration', x.k, 'settings saved'); toast(`${x.n} settings saved`, 'plug'); };
ACTIONS.setIntegToggle = el => { const x = INTEG.find(i => i.k === el.dataset.k); ST.integ[x.k] = !ST.integ[x.k]; audit('settings_save', 'integration', x.k, ST.integ[x.k] ? 'connected' : 'disconnected');
  closeLayer(); render(); toast(ST.integ[x.k] ? `${x.n} connected${x.k === 'razorpay' ? ' in test mode' : ''}` : `${x.n} disconnected`, 'plug'); };
ACTIONS.setWaTest = () => toast(`Test message sent to ${me().name.split(' ')[0]} on WhatsApp`, 'wa');
ACTIONS.setShopSync = () => { const j = STOCK_ITEMS.filter(s => s.kind === 'jewellery').length; toast(`Synced: ${j} tagged jewellery pieces checked against ${TENANT.site}`, 'refresh'); };
ACTIONS.setIgiLook = () => { const no = val('set-igi-no').toUpperCase(), box = document.getElementById('set-igi-res'); if (!box) return;
  const s = STOCK_ITEMS.find(x => (x.cert_no || '').toUpperCase() === no && x.cert_lab === 'IGI');
  box.innerHTML = !no ? `<div class="banner red small">${icon('alert')}Type a certificate number.</div>` : s ? `<div class="banner blue small">${icon('check')}<div><b>IGI ${esc(s.cert_no)}</b>: ${esc(s.shape)} ${s.carat.toFixed(2)} ct · ${esc(s.colour)} ${esc(s.clarity)} · cut ${esc(s.cut || '—')}. Matches stock item <a class="strong" href="#/stock/${s.id}">${esc(s.code)}</a>.</div></div>`
    : `<div class="banner red small">${icon('alert')}<div>No IGI report found for ${esc(no)}. Check the number on the certificate (LG + 9 digits).</div></div>`; };

/* ---------- Compliance ---------- */
function paneCompliance() {
  const consented = CONTACTS.filter(c => c.consent_marketing).length;
  const sw = (t, on, dis) => `<label class="row between set-swrow"><span class="small">${t}</span><span class="switch"><input type="checkbox" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span></span></span></label>`;
  return `<div class="grid g2">
    ${card('Data protection (DPDP)', `${field('Consent text shown when a client\'s details are taken', `<textarea class="textarea" rows="4" id="set-consent">${esc(ST.consent)}</textarea>`)}
      <div class="stack-s mt-12">${sw('Ask every new client for marketing consent', 1)}${sw('Send marketing templates only to contacts who consented', 1, 1)}${sw('Let clients download their data from the portal', 1)}</div>
      <div class="small mt-12"><b>${consented}</b> of ${CONTACTS.length} contacts have marketing consent on record.</div>`,
      { right: `<button class="btn sm primary" data-act="setConsentSave">Save</button>` })}
    ${card('Data retention', `<div class="fgrid">${field('Timeline and chat history', `<select class="select" id="set-ret-chats">${['3 years', '5 years', 'Keep everything'].map(o => `<option ${o === ST.retention.chats ? 'selected' : ''}>${o}</option>`).join('')}</select>`)}
      ${field('Daily backup snapshots kept', `<select class="select" id="set-ret-snaps">${['14', '30', '60'].map(o => `<option ${o === ST.retention.snaps ? 'selected' : ''}>${o}</option>`).join('')}</select>`)}</div>
      <ul class="set-ul small mt-12"><li>${icon('shield', 'sm')}<span>Deleted records stay in the Trash until a founder deletes them for good, and a copy goes to the audit log first.</span></li>
      <li>${icon('doc', 'sm')}<span>The audit log is kept in full; the screen shows the last 300 entries.</span></li></ul>`,
      { right: `<button class="btn sm primary" data-act="setRetentionSave">Save</button>` })}
    ${card('Cash and KYC', `<div class="stack-s">${sw('Block cash of ₹2 lakh or more from one person in a day', 1)}${sw('Ask for PAN above ₹2 lakh', 1)}${sw('Alert at ₹10 lakh of linked cash (PMLA)', 1)}${sw('Require HUID before an invoice number is recorded', 1)}</div>`)}
    ${card('Security cues', SIGNIN_RULES())}</div>
    ${card('Audit log', auditTable(), { right: `<span class="xs muted">founders only</span>` })}`;
}
ACTIONS.setConsentSave = () => { const v = val('set-consent'); if (v.length < 20) return err('The consent text is too short to be meaningful'); const ch = v !== ST.consent; ST.consent = v; if (ch) audit('settings_save', 'settings', 'consent_text', 'consent text changed'); toast(ch ? 'Consent text saved. New clients see it from now on' : 'Nothing changed', 'shield'); };
ACTIONS.setRetentionSave = () => { ST.retention = { chats: val('set-ret-chats'), snaps: val('set-ret-snaps') }; audit('settings_save', 'settings', 'retention', `history ${ST.retention.chats} · ${ST.retention.snaps} snapshots`); toast('Retention saved', 'shield'); };

/* ---------- audit log (Compliance and Data) ---------- */
const recLink = a => { if (a.entity === 'deal' && dealById(a.entity_id)) return `<a class="set-link" href="#/deal/${esc(a.entity_id)}/activity">${esc(a.entity_id)}</a>`; if (a.entity === 'contact' && contactById(a.entity_id)) return `<a class="set-link" href="#/customers/${esc(a.entity_id)}">${esc(contactById(a.entity_id).name)}</a>`; return `<span class="xs muted">${esc(a.entity)}</span> <span class="mono xs">${esc(a.entity_id)}</span>`; };
function auditTable() {
  const f = ST.auditF, list = AUDIT.slice().sort((a, b) => b.at - a.at).slice(0, 300), actions = [...new Set(list.map(a => a.action))].sort();
  const rows = list.filter(a => (!f.action || a.action === f.action) && (!f.user || a.user === f.user));
  return `<div class="row wrap set-filters"><select class="select" data-auditf="action" aria-label="Filter by action"><option value="">All actions</option>${actions.map(a => `<option ${a === f.action ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <select class="select" data-auditf="user" aria-label="Filter by person"><option value="">Everyone</option>${USERS.map(u => `<option value="${u.id}" ${u.id === f.user ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select><span class="xs muted">${rows.length} of ${list.length} shown · last 300</span></div>
    ${rows.length ? `<div class="mt-12">${stbl('<th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Detail</th>', rows.map(a => `<tr><td class="set-nw small">${dt(a.at)}</td><td class="set-nw small">${esc(userName(a.user))}</td><td><span class="set-actn mono">${esc(a.action)}</span></td><td class="small">${recLink(a)}</td><td class="small f">${esc(a.detail)}</td></tr>`).join(''), 'set-audit set-cards set-compact')}</div>` : '<div class="empty small">Nothing matches these filters.</div>'}`;
}
function mountAudit(root) { root.querySelectorAll('[data-auditf]').forEach(s => s.addEventListener('change', () => { ST.auditF[s.dataset.auditf] = s.value; render(); })); }

const PANES = { rates: paneRates, sheets: paneSheets, rules: paneRules, options: paneOptions, access: paneAccess, people: panePeople, session: paneSession, boundaries: paneBoundaries, business: paneBusiness, workflow: paneWorkflow, integrations: paneIntegrations, compliance: paneCompliance };
const MOUNTS = { sheets: mountSheets, options: mountOptions, access: mountAccess };

/* ======================================================================================
   DATA
   ====================================================================================== */
const IMP_KINDS = { contacts: 'Contacts (or a Google Contacts export)', leads: 'Leads / enquiries (historical)', sales: 'Sales / invoices (historical)', qom: 'Quote & Order Manager v2 export', stock: 'Stock (diamonds, gems, lots, jewellery)' };
const IMP_FIELDS = ['name', 'first_name', 'middle_name', 'last_name', 'phone', 'phone_alt', 'email', 'city', 'state', 'country', 'instagram', 'source_code', 'origin', 'source_channel', 'campaign', 'tags', 'lifecycle', 'notes', 'birthday', 'anniversary', 'met_in_person', 'enquiry_date', 'product_interest', 'budget', 'budget_min', 'occasion', 'outcome', 'lost_reason', 'owner', 'order_date', 'invoice_no', 'order_no', 'amount', 'advance', 'paid', 'gold_wt', 'purity', 'diamond_ct', 'diamond_value', 'making_rate', 'delivered_date', 'tag_no', 'gst_pct', 'stage_qom'];
const STOCK_FIELDS = ['code', 'kind', 'shape', 'carat', 'pcs', 'colour', 'clarity', 'quality', 'cert_lab', 'cert_no', 'size_mm', 'vendor', 'cost', 'location', 'notes'];
const IMP_FILES = {
  contacts: { name: 'contacts_google_export.csv', kb: 61, rows: 214, google: true, headers: [['First Name', 'first_name'], ['Last Name', 'last_name'], ['Phone 1 - Value', 'phone'], ['E-mail 1 - Value', 'email'], ['Address 1 - City', 'city'], ['Labels', 'tags'], ['Birthday', 'birthday'], ['Notes', 'notes'], ['Organization Name', '']],
    sample: [['Meher Kaul', '+91 98101 22334', 'IG DM', 'Instagram', 'VIP', 'Inq', '', '', 'Meher | Instagram VIP (Inq)'], ['Raghav Bedi', '+91 99902 11876', 'REF', 'Referral', '', 'Cust', '', '', 'Raghav | Referral (Cust)'], ['Sana Qureshi', '', 'WEB', 'Website', '', 'Inq', '', ''], ['Dev & Anika Sood', '+91 98733 40021', 'WALKIN', 'Walk-in', 'REPEAT', 'Cust', '', ''], ['Ira Banerjee', '+44 7700 900877', 'WEB', 'Website', 'NRI', 'Inq', '', ''], ['Kunal Jain', '+91 98111 70433', 'GMB CALL', 'Google', '', 'Lost', '', '']] },
  leads: { name: 'enquiries_2025.csv', kb: 38, rows: 146, headers: [['Date', 'enquiry_date'], ['Client name', 'name'], ['Mobile', 'phone'], ['City', 'city'], ['Source', 'source_channel'], ['Campaign', 'campaign'], ['Looking for', 'product_interest'], ['Budget', 'budget'], ['Status', 'outcome'], ['Reason lost', 'lost_reason'], ['Owner', 'owner'], ['Remarks', '']],
    sample: [['Nikhil Ahuja', '+91 98990 31245', 'META', 'Meta ad', '', 'Quoted', '12 Mar 25', '₹1,20,000'], ['Ritu Saxena', '+91 99580 77412', 'WALKIN', 'Walk-in', '', 'Won', '18 Mar 25', '₹65,000'], ['Farah Ali', '', 'IG DM', 'Instagram', '', 'Lost', '02 Apr 25', '₹40,000'], ['Gaurav Mittal', '+91 98731 22981', 'REF', 'Referral', '', 'New', '09 Apr 25', '₹2,50,000'], ['Shreya Kapur', '+91 97170 60112', 'EXHIB', 'Exhibition', '', 'Won', '21 Apr 25', '₹90,000'], ['Ankit Batra', '+91 98102 55667', 'GMB CALL', 'Google', '', 'Lost', '30 Apr 25', '₹55,000']] },
  sales: { name: 'sales_register_fy25.csv', kb: 22, rows: 64, headers: [['Invoice date', 'order_date'], ['Invoice no', 'invoice_no'], ['Customer', 'name'], ['Mobile', 'phone'], ['City', 'city'], ['Item', ''], ['Amount', 'amount'], ['Advance', 'advance'], ['Paid', 'paid'], ['Gold wt', 'gold_wt'], ['Purity', 'purity'], ['Diamond ct', 'diamond_ct'], ['Delivered', 'delivered_date']],
    sample: [['Ritu Saxena', '+91 99580 77412', 'WALKIN', 'Walk-in', '', 'Delivered', '20 Mar 25', '₹64,800'], ['Shreya Kapur', '+91 97170 60112', 'EXHIB', 'Exhibition', '', 'Delivered', '28 Apr 25', '₹91,400'], ['Mansi Goyal', '+91 98111 40089', 'WEB', 'Website', '', 'Delivered', '06 May 25', '₹38,900'], ['Arvind Rao', '+91 99100 72214', 'REF', 'Referral', 'REPEAT', 'Delivered', '15 May 25', '₹2,12,000'], ['Tara Menon', '', 'IG DM', 'Instagram', '', 'Delivered', '22 May 25', '₹47,500'], ['Kabir Anand', '+91 98990 11223', 'WALKIN', 'Walk-in', '', 'Delivered', '03 Jun 25', '₹1,05,000']] },
  qom: { name: 'QOM_v2_export.csv', kb: 90, rows: 88, headers: [['quote_no', ''], ['order_no', 'order_no'], ['client', 'name'], ['phone', 'phone'], ['stage', 'stage_qom'], ['gold_wt', 'gold_wt'], ['purity', 'purity'], ['diamond_ct', 'diamond_ct'], ['diamond_value', 'diamond_value'], ['making_rate', 'making_rate'], ['tag_no', 'tag_no'], ['gst_pct', 'gst_pct']],
    sample: [['Pallavi Sinha', '+91 98103 22876', 'OTHER', 'Other', '', 'Order', '11 Jul 26', '₹1,48,200'], ['Rehan Khan', '+91 99711 40220', 'OTHER', 'Other', '', 'Quote', '14 Jul 26', '₹72,600'], ['Juhi Arora', '+91 98186 53411', 'OTHER', 'Other', '', 'Delivered', '19 Jul 26', '₹58,300'], ['Nitin Bhalla', '', 'OTHER', 'Other', '', 'Quote', '23 Jul 26', '₹33,900'], ['Simar Kohli', '+91 98995 70012', 'OTHER', 'Other', '', 'Order', '02 Aug 26', '₹2,06,000'], ['Varun Sethi', '+91 97170 99381', 'OTHER', 'Other', '', 'Delivered', '09 Aug 26', '₹81,750']] },
  stock: { name: 'stock_count_nov.csv', kb: 9, rows: 18, headers: [['code', 'code'], ['kind', 'kind'], ['shape', 'shape'], ['carat', 'carat'], ['colour', 'colour'], ['clarity', 'clarity'], ['cert_lab', 'cert_lab'], ['cert_no', 'cert_no'], ['cost', 'cost'], ['location', 'location']],
    sample: [['LG633120457', 'Diamond', 'Round', '1.05 ct', 'F VS1', 'IGI LG633120457', '₹22,400'], ['LG633120458', 'Diamond', 'Oval', '0.92 ct', 'E VVS2', 'IGI LG633120458', '₹19,800'], ['ML-17', 'Lot', 'Round', '6.20 ct', 'VS-FG', '—', '₹1,12,000'], ['CS-10', 'Gem', 'Pear', '1.60 ct', 'Pink sapphire', 'GSI 90311', '₹31,000'], ['FJ-2210', 'Jewellery', 'Ring', '0.48 ct', '14K yellow', 'HUID 4KD9TQ', '₹27,900'], ['LG598812230', 'Diamond', 'Round', '1.01 ct', 'F VS1', 'already in the ledger', '₹21,800']] }
};
const impCounts = () => { const f = IMP_FILES[ST.imp.kind], t = f.rows, map = ST.imp.map || {};
  const named = ST.imp.kind === 'stock' ? Object.values(map).includes('code') : Object.values(map).some(v => ['name', 'first_name', 'last_name'].includes(v));
  if (!named) return { t, created: 0, updated: 0, skipped: t, nophone: 0, named };
  const created = Math.round(t * (ST.imp.kind === 'stock' ? 0.83 : 0.8)), updated = ST.imp.kind === 'stock' ? 0 : Math.round(t * 0.17); return { t, created, updated, skipped: t - created - updated, nophone: Object.values(map).includes('phone') ? Math.round(t * 0.09) : t, named }; };
function importCard() {
  const I = ST.imp, f = IMP_FILES[I.kind];
  const kindSel = `<select class="select" data-datkind ${I.step !== 'pick' ? 'disabled' : ''}>${Object.entries(IMP_KINDS).map(([k, n]) => `<option value="${k}" ${k === I.kind ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  let body;
  if (I.step === 'pick') {
    body = `<p class="small ink2">CSV only. Re-uploading updates rather than duplicates: rows match on phone, then on invoice or order number. Google Contacts exports are recognised automatically, with First/Last Name read back through your naming templates and custom fields read by label.</p>
      <div class="stack-s mt-16">${field('What is in the file', kindSel)}
      ${I.file ? `<div class="dat-file">${icon('file')}<div class="grow"><div class="strong small">${esc(f.name)}</div><div class="xs muted">${f.kb} KB · ${f.rows} rows · comma-separated, UTF-8</div></div><button class="btn sm ghost" data-act="datPick">Change</button></div>`
        : `<div class="drop" data-act="datPick">${icon('upload', 'lg')}<div class="small strong mt-8">Choose a CSV file</div><div class="xs">Up to 20 MB. Comma, tab or semicolon; Windows-1252 is converted.</div></div>`}</div>
      <div class="row wrap mt-16"><button class="btn gold sm" data-act="datPreview">${icon('eye', 'sm')}Preview</button><span class="xs muted">Templates:</span>${['contacts', 'leads', 'sales', 'stock'].map(k => `<button class="btn sm ghost" data-act="datTemplate" data-k="${k}">${k}</button>`).join('')}</div>`;
  } else if (I.step === 'preview') {
    const c = impCounts(), fields = I.kind === 'stock' ? STOCK_FIELDS : IMP_FIELDS, amber = c.nophone > c.t / 2 || !c.named;
    const cols = I.kind === 'stock' ? ['Code', 'Kind', 'Shape / type', 'Size', 'Grade', 'Certificate', 'Cost'] : ['Name', 'Phone', 'Source', 'Channel', 'Tags', 'Status', 'Date', 'Amount'];
    body = `<div class="dat-file">${icon('file')}<div class="grow"><div class="strong small">${esc(f.name)}</div><div class="xs muted">${IMP_KINDS[I.kind]}</div></div><button class="btn sm ghost" data-act="datImpBack">${icon('chevL', 'sm')}Back</button></div>
      <div class="banner ${amber ? '' : 'blue'} mt-12 small">${icon(amber ? 'alert' : 'eye')}<div><b>${c.t} rows.</b> ${I.kind === 'stock' ? `${c.created} new · ${c.t - c.created - c.skipped} already in the ledger · ${c.skipped} invalid` : `${c.created} new · ${c.updated} will update existing · ${c.skipped} skipped (no name) · ${c.nophone} without a phone`}${f.google ? ' · Google Contacts format detected' : ''}${c.named ? '' : `. <b>No column is mapped to ${I.kind === 'stock' ? 'code' : 'name'}</b>, so every row would be skipped.`}</div></div>
      <details class="set-det mt-12" open><summary>Column mapping (adjust if a column was guessed wrong)</summary><div class="dat-map-g">${f.headers.map(([h], i) => `<label class="field"><span class="mono">${esc(h)}</span><select class="select" data-datmap="${i}"><option value="">(ignore)</option>${fields.map(x => `<option ${(I.map || {})[i] === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`).join('')}</div></details>
      <div class="label mt-16">First rows</div>
      <div class="mt-8">${stbl(cols.map(x => `<th>${x}</th>`).join(''), f.sample.map(r => `<tr>${r.slice(0, cols.length).map((x, i) => `<td class="${i === 0 ? 'strong' : 'set-nw'} small">${x ? esc(x) : '<span class="muted">—</span>'}${i === 0 && r[8] ? `<div class="xs muted">from "${esc(r[8])}"</div>` : ''}</td>`).join('')}</tr>`).join(''))}</div>
      <div class="row wrap mt-16"><button class="btn gold" data-act="datImport">${icon('upload', 'sm')}Import ${c.t} rows</button><span class="xs muted grow">Everything imports inside one transaction: it all lands or nothing does. Undo is available afterwards.</span></div>`;
  } else {
    const r = I.result;
    body = `<div class="banner blue small">${icon('check')}<div><b>Imported ${esc(r.file)}.</b> ${r.created} created · ${r.updated} updated · ${r.skipped} skipped${r.deals ? ` · ${r.deals} deals` : ''}. It is batch #${esc(r.id.replace('b', ''))} in Import history, where you can undo it.</div></div>
      <div class="grid g3 mt-12">${[['Created', r.created], ['Updated', r.updated], ['Skipped', r.skipped]].map(([k, v]) => `<div class="kpi card"><div class="k">${k}</div><div class="v num">${v}</div></div>`).join('')}</div>
      <button class="btn mt-16" data-act="datImpReset">${icon('upload', 'sm')}Import another file</button>`;
  }
  return card('Import', body, { right: badge(I.step === 'pick' ? 'step 1 of 2' : I.step === 'preview' ? 'step 2 of 2' : 'done', I.step === 'done' ? 'green' : 'out') });
}
ACTIONS.datPick = () => { ST.imp.file = true; render(); toast(`${IMP_FILES[ST.imp.kind].name} chosen`, 'file'); };
ACTIONS.datPreview = () => { if (!ST.imp.file) return err('Choose a file'); ST.imp.map = Object.fromEntries(IMP_FILES[ST.imp.kind].headers.map(([, g], i) => [i, g])); ST.imp.step = 'preview'; render(); };
ACTIONS.datImpBack = () => { ST.imp.step = 'pick'; render(); };
ACTIONS.datImpReset = () => { ST.imp = { step: 'pick', kind: ST.imp.kind, file: false, map: null, result: null }; render(); };
ACTIONS.datTemplate = el => toast(`${el.dataset.k}_template.csv downloaded: header + 1 example row`, 'download');
ACTIONS.datImport = () => {
  const I = ST.imp, f = IMP_FILES[I.kind], c = impCounts();
  if (!c.named) return err(`Import failed at row 2: no ${I.kind === 'stock' ? 'code' : 'name'} column is mapped`);
  const id = 'b' + (Math.max(0, ...IMPORTS.map(x => +x.id.replace(/\D/g, '') || 0)) + 1);
  const deals = ['leads', 'sales', 'qom'].includes(I.kind) ? c.created + c.updated : 0;
  IMPORTS.unshift({ id, kind: I.kind, file: f.name, total: c.t, created: c.created, updated: c.updated, skipped: c.skipped, at: now(), by: me().id, undo: true });
  audit('import', 'import', id, `${I.kind}: ${c.created} new, ${c.updated} updated, ${c.skipped} skipped`);
  I.result = { id, file: f.name, created: c.created, updated: c.updated, skipped: c.skipped, deals }; I.step = 'done';
  render(); toast(`Imported: ${c.created} created, ${c.updated} updated, ${deals} deals`, 'upload');
};

const EXP_TABLES = { contacts: ['Contacts', () => CONTACTS.length], deals: ['Deals', () => DEALS.length], payments: ['Payments', () => DEALS.reduce((s, d) => s + (d.payments || []).length, 0)], qc: ['QC_Checks', () => DEALS.reduce((s, d) => s + (d.qc || []).length, 0)], activities: ['Activities', () => DEALS.reduce((s, d) => s + (d.activities || []).length, 0)] };
function exportCard() {
  if (!can('export.all')) return card('Export', `<div class="set-locked small">${icon('lock')}<div>Your role cannot export. Founders grant "Export the full database" in Settings → Access, for a day, when there is a reason.</div></div>`);
  return card('Export', `<p class="small ink2">Everything leaves as a file you keep. Every export is logged with who, when and how many rows.</p>
    <div class="row wrap mt-16"><button class="btn primary sm" data-act="datExport" data-what="xlsx">${icon('download', 'sm')}Full database → Excel</button>
      ${can('export.google') ? `<button class="btn sm" data-act="datExport" data-what="google">${icon('users', 'sm')}Google Contacts CSV</button>` : '<span class="xs muted">Google Contacts CSV needs "Export the Google Contacts CSV" too.</span>'}</div>
    <div class="xs muted mt-8">The workbook has 11 sheets: README, Contacts, Deals, Deal_Lines, Payments, QC_Checks, Activities, Templates, Imports, Stock_Items, Stock_Moves.</div>
    <div class="label mt-16">One table as CSV</div><div class="row wrap gap-6 mt-8">${Object.entries(EXP_TABLES).map(([k, [n, c]]) => `<button class="btn sm ghost dat-csv" data-act="datExport" data-what="${k}">${icon('doc', 'sm')}${n}.csv <span class="xs muted">${c()}</span></button>`).join('')}</div>
    <div class="label mt-16">Intake templates</div><div class="row wrap gap-6 mt-8">${['contacts', 'leads', 'sales', 'stock'].map(k => `<button class="btn sm ghost" data-act="datTemplate" data-k="${k}">${icon('download', 'sm')}${k}_template.csv</button>`).join('')}</div>`);
}
ACTIONS.datExport = el => {
  const w = el.dataset.what, iso = isoDate(now());
  if (!can('export.all') || (w === 'google' && !can('export.google'))) return err('Your role cannot export this. Founders grant it in Settings → Access');
  let file, what, act, ev;
  if (w === 'xlsx') { file = `MARQA_pipeline_${iso}.xlsx`; what = '11 sheets'; act = 'export_xlsx'; ev = 'Exported the full database (Excel)'; }
  else if (w === 'google') { file = `google_contacts_${iso}.csv`; what = `${CONTACTS.length} contacts`; act = 'export_google'; ev = `Google Contacts CSV · ${CONTACTS.length} rows`; CONTACTS.forEach(c => { c.google_synced_at = now(); }); }
  else { const [n, c] = EXP_TABLES[w]; file = `${n}.csv`; what = `${c()} rows`; act = 'export_csv'; ev = `CSV table · ${n} · ${c()} rows`; }
  audit(act, 'export', w, `${file} · ${what}`); bulk(ev); render();
  toast(`${file} downloaded · ${what}. Logged`, 'download');
};

const lastFetch = () => SETTINGS.sheets_last_fetch ? new Date(SETTINGS.sheets_last_fetch.replace(' ', 'T') + ':00') : null;
function sheetCard() {
  const lf = lastFetch(), key = ST.cronShown ? ST.cronKey : '•'.repeat(ST.cronKey.length);
  return card('Google Sheet → leads', `<p class="small ink2">Publish the sheet tab to the web as CSV and paste the link. Each fetch skips rows already taken, creates the contact and an enquiry at New, matches on phone, and notes the row on an open enquiry if there is one. Columns are recognised by name.</p>
    ${field('Published CSV link', `<input class="input mono" id="dat-sheet-url" value="${esc(SETTINGS.sheets_csv_url || '')}" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?gid=0&amp;single=true&amp;output=csv">`, 'Only docs.google.com links are accepted.', 'mt-16')}
    <div class="row wrap mt-12"><button class="btn sm" data-act="datSheetSave">${icon('link', 'sm')}Save link</button><button class="btn gold sm" data-act="datSheetFetch">${icon('refresh', 'sm')}Fetch from Sheet now</button></div>
    <div class="small mt-12">${lf ? `Last fetch <b>${dt(lf)}</b>: ${ST.fetches ? '5 rows · 0 new enquiries · 0 noted on open enquiries · 5 already fetched · 0 without a name' : '5 rows · 4 new enquiries · 0 noted on open enquiries · 1 already fetched · 0 without a name'}.` : 'Never fetched.'} <span class="muted">Every fetch is an import batch: undo it below if a campaign sheet was wrong.</span></div>
    ${SETTINGS.sheets_csv_url ? `<details class="set-det mt-12" ${ST.cronOpen ? 'open' : ''}><summary>Fetch automatically (hPanel cron)</summary><div class="small mt-8">Every 15 minutes, add this cron command in hPanel:</div>
      <div class="dat-pre mt-8">*/15 * * * * curl -fsS "https://&lt;your-pipeline-domain&gt;/api/?r=sheets/cron&amp;key=${esc(key)}"</div>
      <div class="row wrap mt-8"><span class="mono small dat-key">${esc(key)}</span><button class="btn sm ghost" data-act="datCronReveal">${icon('eye', 'sm')}${ST.cronShown ? 'Hide' : 'Reveal'}</button><button class="btn sm ghost" data-act="datCronRotate">${icon('refresh', 'sm')}Rotate</button></div>
      <div class="xs muted mt-8">The key only allows a fetch, nothing else. Still, keep it private; rotating it stops the old cron line at once.</div></details>` : ''}
    <div class="xs muted mt-12">A Sheet cannot read the pipeline (that needs a login). To get data out, use the CSV downloads.</div>`, { right: '<span class="xs muted">campaign intake</span>' });
}
ACTIONS.datSheetSave = () => {
  const v = val('dat-sheet-url');
  let host = ''; try { host = new URL(v).hostname; } catch (_) {}
  if (host !== 'docs.google.com') return err('Only docs.google.com links are allowed: publish the sheet to the web as CSV and paste that link');
  const first = !SETTINGS.sheets_csv_url; SETTINGS.sheets_csv_url = v; if (first) ST.cronKey = mintKey();
  audit('settings_save', 'settings', 'sheets_csv_url', 'Sheet link saved'); render(); toast('Sheet link saved', 'link');
};
ACTIONS.datSheetFetch = () => {
  if (!SETTINGS.sheets_csv_url) return err('Set the Sheet CSV link in Data → Google Sheet first.');
  const first = !ST.fetches; ST.fetches++;
  const t = now(); SETTINGS.sheets_last_fetch = `${isoDate(t)} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const id = 'b' + (Math.max(0, ...IMPORTS.map(x => +x.id.replace(/\D/g, '') || 0)) + 1);
  IMPORTS.unshift({ id, kind: 'sheet', file: 'Google Sheet (campaign intake)', total: 5, created: first ? 4 : 0, updated: 0, skipped: first ? 1 : 5, at: t, by: me().id, undo: true });
  audit('sheets_fetch', 'import', id, first ? 'Google Sheet: 4 new leads, 1 already captured' : 'Google Sheet: nothing new');
  closeLayer(); render(); toast(first ? '4 new leads · 1 already captured' : '0 new leads · 5 already captured', 'refresh');
};
ACTIONS.datCronReveal = () => { ST.cronShown = !ST.cronShown; ST.cronOpen = true; render(); toast(ST.cronShown ? 'Key shown. Keep it private' : 'Key hidden', 'eye'); };
ACTIONS.datCronRotate = () => { ST.cronKey = mintKey(); ST.cronShown = false; ST.cronOpen = true; audit('settings_save', 'settings', 'sheets_cron_key', 'cron key rotated'); render(); toast('Cron key rotated. Update the hPanel cron line', 'refresh'); };

const ZSTAGE = s => s.key === 'Negotiating' ? 'Negotiation/Review' : s.key === 'Quoted' ? 'Proposal/Price Quote' : s.group === 'lead' ? (s.key === 'Qualified' ? 'Needs Analysis' : 'Qualification') : s.group === 'lost' ? 'Closed Lost' : 'Closed Won';
function zohoText() {
  const live = DEALS.filter(d => !d.deleted), orders = live.filter(isOrder), quotes = live.filter(d => d.quote_no);
  const val2 = d => d.actual_cost || d.est_cost || (d.calc ? d.calc.total : 0);
  const pays = live.flatMap(d => (d.payments || []).filter(p => !p.void)), paid = pays.reduce((s, p) => s + (p.kind === 'Refund' ? -p.amount : p.amount), 0);
  const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
  const src = {}; live.forEach(d => { src[d.source_channel] = (src[d.source_channel] || 0) + 1; });
  return [`Zoho migration bundle · preview ${dt(now())}`, '',
    `${pad('01_Contacts.csv', 24)}${pad(CONTACTS.length, 5)}rows`,
    `${pad('02_Deals.csv', 24)}${pad(live.length, 5)}rows · Σ ${inr(live.reduce((s, d) => s + val2(d), 0))}`,
    `${pad('03_Order_Pipeline.csv', 24)}${pad(orders.length, 5)}rows · Σ ${inr(orders.reduce((s, d) => s + val2(d), 0))}`,
    `${pad('04_Notes.csv', 24)}${pad(live.reduce((s, d) => s + d.activities.length, 0), 5)}rows`,
    `${pad('05_Tasks.csv', 24)}${pad(live.filter(d => isOpen(d) && d.next_action_at).length, 5)}rows`,
    `${pad('10_Quote_Order.csv', 24)}${pad(quotes.length, 5)}rows`,
    `${pad('11_Diamond_Lines.csv', 24)}${pad(live.reduce((s, d) => s + (d.lines || []).length, 0), 5)}rows`,
    `${pad('12_Payments.csv', 24)}${pad(pays.length, 5)}rows · Σ ${inr(paid)}`,
    `${pad('13_Stock_Items.csv', 24)}${pad(STOCK_ITEMS.length, 5)}rows`,
    '90_Field_Map · 91_Stage_Map · 92_Reconciliation · 00_README', '', 'Deals by stage → Zoho stage',
    ...DSTAGES.map(s => [s, live.filter(d => d.stage === s.key).length]).filter(x => x[1]).map(([s, n]) => `  ${pad(s.label, 22)}${pad(n, 4)}→ ${ZSTAGE(s)}`), '',
    'Lead source values', '  ' + Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '),
    ...(String(SETTINGS.zoho_owner_map || '').trim() ? [] : ['', 'Tip: fill Settings → Rules → Zoho owner map (username=email) so Zoho assigns the right owners; blank = whoever imports.']),
    '', 'Demo, merged and deleted rows are left out.'].join('\n');
}
const zohoCard = () => card('Zoho migration', `<p class="small ink2">The pipeline is interim until MARQA moves to Zoho. The bundle holds every record in Zoho's import shape. Read-only and repeatable: run it as often as you like.</p>
  <div class="row wrap mt-16"><button class="btn sm" data-act="datZohoPreview">${icon('eye', 'sm')}${ST.zoho ? 'Refresh counts' : 'Preview counts'}</button><button class="btn sm primary" data-act="datZohoDownload">${icon('download', 'sm')}Download Zoho bundle (.zip)</button></div>
  ${ST.zoho ? `<div class="dat-pre mt-12">${esc(zohoText())}</div>` : ''}`, { right: '<span class="xs muted">the exit door</span>' });
ACTIONS.datZohoPreview = () => { ST.zoho = true; render(); toast('Counts built', 'eye'); };
ACTIONS.datZohoDownload = () => { const f = `MARQA_zoho_bundle_${isoDate(now())}.zip`; audit('export_zoho', 'export', 'zoho', f + ' · 14 files'); bulk('Zoho bundle'); render(); toast(`${f} downloaded · 14 files. Logged`, 'download'); };

const backupCard = () => card('Backup', `<div class="row wrap"><button class="btn sm" data-act="datBackup">${icon('download', 'sm')}Download backup (db + photos)</button><button class="btn sm" data-act="datSnapshot">${icon('camera', 'sm')}Snapshot now</button></div>
  <div class="label mt-16">Latest snapshots</div><div class="dat-snaps mt-8">${ST.snaps.slice(0, 5).map(([n, kb, t]) => `<div class="row between small"><span class="mono">${esc(n)}</span><span class="muted set-nw">${NF.format(kb)} KB · ${dt(t)}</span></div>`).join('')}</div>
  <div class="xs muted mt-12">A snapshot is taken automatically on the first request of each day; ${ST.retention.snaps} are kept on the server. Download one weekly to Drive.</div>`);
ACTIONS.datBackup = () => { const f = `MARQA_backup_${isoDate(now())}.zip`; audit('backup_download', 'backup', f, 'db + photos'); bulk('Backup download'); render(); toast(`${f} downloaded: database + ${DEALS.reduce((s, d) => s + d.photos.length, 0)} photos. Logged`, 'download'); };
ACTIONS.datSnapshot = () => { const n = `pipeline_${isoDate(now())}.sqlite`, kb = ST.snaps[0][1] + 4; ST.snaps.unshift([n, kb, now()]); audit('backup', 'backup', n, NF.format(kb) + ' KB'); render(); toast(`Snapshot ${n} (${NF.format(kb)} KB)`, 'camera'); };

const demoCard = () => card('Demo data', ST.demo ? `<div class="small">The labelled demo dataset is loaded (names end in “(DEMO)”). <b>Purge it before real data goes in.</b></div><button class="btn sm danger mt-12" data-act="datDemoPurge">${icon('x', 'sm')}Purge demo data</button>`
  : `<div class="small muted">No demo data loaded. The demo set is 12 deals across every stage and 9 contacts, each marked (DEMO), for training new staff.</div><button class="btn sm mt-12" data-act="datDemoLoad">${icon('download', 'sm')}Load demo data</button>`);
ACTIONS.datDemoLoad = () => { ST.demo = true; audit('demo_load', 'demo', '-1', '12 deals, 9 contacts'); render(); toast('Demo data loaded: 12 deals and 9 contacts marked (DEMO)', 'download'); };
ACTIONS.datDemoPurge = () => modal('Purge demo data', `<p class="small ink2">Removes every record marked (DEMO): 12 deals, 9 contacts and their stock moves. Real records are untouched. This is a hard delete.</p>${field('Type PURGE to confirm', '<input class="input mono" id="dat-purge-demo" autocomplete="off" autocapitalize="characters">', '', 'mt-12')}`,
  `${cancelBtn}<button class="btn danger" data-act="datDemoPurgeOk">${icon('x', 'sm')}Purge</button>`);
ACTIONS.datDemoPurgeOk = () => { if (val('dat-purge-demo') !== 'PURGE') return err('Not purged: type PURGE exactly'); ST.demo = false; audit('demo_purge', 'demo', '-1', '12 deals, 9 contacts'); bulk('Demo data purged · 12 deals, 9 contacts'); closeLayer(); render(); toast('Removed 12 deals and 9 contacts', 'x'); };

const KIND_LABEL = { contacts: 'Contacts', leads: 'Leads', sales: 'Sales', qom: 'QOM', sheet: 'Sheet', stock: 'Stock' };
const historyCard = () => card('Import history', IMPORTS.length ? stbl('<th>#</th><th>When</th><th>Kind</th><th>File</th><th class="num">Rows</th><th class="num">Created</th><th class="num">Updated</th><th class="num">Skipped</th><th>By</th><th></th>',
  IMPORTS.slice(0, 50).map(x => `<tr class="${x.undone ? 'set-off-row' : ''}"><td class="mono">#${esc(x.id.replace('b', ''))}</td><td class="set-nw small">${dt(x.at)}</td><td>${badge(KIND_LABEL[x.kind] || x.kind, 'out')}</td><td class="small f">${esc(x.file)}</td><td class="num" data-l="Rows">${x.total}</td><td class="num" data-l="Created">${x.created}</td><td class="num" data-l="Updated">${x.updated}</td><td class="num" data-l="Skipped">${x.skipped}</td><td class="small set-nw">${esc(userName(x.by))}</td>
    <td>${x.undone ? badge('undone', '') : `<button class="btn sm danger" data-act="datUndo" data-id="${x.id}">${icon('undo', 'sm')}Undo</button>`}</td></tr>`).join(''), 'set-cards set-compact') : '<div class="empty small">No imports yet.</div>', { flush: true, right: `<span class="xs muted">last 50 batches</span>` });
const movedSince = imp => STOCK_ITEMS.filter(s => STOCK_MOVES.some(m => m.item === s.id && m.kind !== 'in' && !m.reversed && m.at > imp.at)).map(s => s.code);
const undoRefused = (x, msg) => modal(`Undo import #${esc(x.id.replace('b', ''))}`, `<div class="banner red small">${icon('alert')}<div>${esc(msg)}</div></div>`,
  `<button class="btn" data-act="close">Close</button><button class="btn primary" data-go="#/stock">${icon('gem', 'sm')}Open Stock</button>`);
ACTIONS.datUndo = el => { const x = IMPORTS.find(i => i.id === el.dataset.id); if (!x) return;
  // Stock batches undo through the Stock module (stkUndoImport); a batch with no item list (seed b14) is refused.
  if (x.kind === 'stock' && !x.items) { const moved = movedSince(x); return undoRefused(x, `Cannot undo: stock items from this import have moved since: ${(moved.length ? moved : ['ML-16']).slice(0, 4).join(', ')}. Reverse those moves first, or write the items off.`); }
  modal(`Undo import #${esc(x.id.replace('b', ''))}`, `<p class="small ink2">${esc(x.file)}: ${x.created} created, ${x.updated} updated.</p><p class="small ink2 mt-8">Records created by this import are hidden (never deleted). Updates to existing records are not reverted.</p>`,
    `${cancelBtn}<button class="btn danger" data-act="datUndoOk" data-id="${x.id}">${icon('undo', 'sm')}Undo</button>`); };
ACTIONS.datUndoOk = el => { const x = IMPORTS.find(i => i.id === el.dataset.id); if (!x) return closeLayer();
  if (x.kind === 'stock' && typeof stkUndoImport === 'function') {
    const r = stkUndoImport(x.id);            // audits itself; refuses when an item has moved since
    if (r.err) return undoRefused(x, r.err);
  } else { x.undone = true; audit('import_undo', 'import', x.id, `${x.file}: ${x.created} records hidden`); }
  bulk(`Import undone · #${x.id.replace('b', '')}`); closeLayer(); render(); toast('Undone', 'undo'); };

const ENT = { deal: 'Deal', contact: 'Contact', stock: 'Stock item', payment: 'Payment', activity: 'Timeline entry', photo: 'Photo' };
const liveDeal = id => { const d = id && dealById(id); return d && !d.deleted ? d : null; };
const voidedPay = (t, d) => d && (d.payments || []).find(p => p.void && (t.payment ? p.id === t.payment : String(t.label).startsWith(inr(p.amount) + ' ' + p.mode)));
// Deal entries that went to the Trash with a contact (they carry the deal as `record`, or say "With the contact").
const cascaded = (t, cid) => TRASH.filter(x => x !== t && x.entity === 'deal' && ((x.record && x.record.contact === cid) || (x.deal && /^With the contact/.test(x.reason || '') && (dealById(x.deal) || {}).contact === cid)));
function trashRestore(t) {
  if (t.entity === 'stock' && t.record && typeof stkTrashRestore === 'function') { const r = stkTrashRestore(t); return r.err ? r : { msg: r.msg || 'Restored', own: true }; }
  if (t.entity === 'deal') {
    const d = t.record || (t.deal && dealById(t.deal));
    if (d && !contactById(d.contact)) return { err: 'Its contact is in the Trash: restore the contact first, the deal comes back with it.' };
    if (d) { if (!DEALS.includes(d)) DEALS.push(d); d.deleted = false; }
    return { msg: 'Restored' };
  }
  if (t.entity === 'contact' && t.contact) {
    const c = t.contact;
    if (c.merged_into) return { err: 'A merged contact cannot be restored. Open the contact it was merged into.' };
    if (!CONTACTS.includes(c)) CONTACTS.push(c);
    delete c.deleted_at; delete c.deleted_by; delete c.delete_reason;
    const back = cascaded(t, c.id);
    back.forEach(x => { const d = x.record || dealById(x.deal); if (d) { if (!DEALS.includes(d)) DEALS.push(d); d.deleted = false; } TRASH.splice(TRASH.indexOf(x), 1); });
    return { msg: back.length ? `Restored with ${back.length} open enquir${back.length > 1 ? 'ies' : 'y'}` : 'Restored' };
  }
  if (t.entity === 'payment' || t.entity === 'activity' || t.entity === 'photo') {
    if (t.deal && dealById(t.deal) && dealById(t.deal).deleted) return { err: 'Its deal is in the Trash: restore the deal first.' };
    const d = liveDeal(t.deal);
    if (t.entity === 'payment') { const p = voidedPay(t, d); if (p) { p.void = false; logAct(d, { type: 'payment', dir: 'in', subject: 'Payment restored from the Trash', body: t.label }); return { msg: 'Restored · balance ' + inr(money(d).balance) }; } }
    if (t.entity === 'activity' && d && t.record) { d.activities.push(t.record); d.activities.sort((a, b) => b.at - a.at); }
    if (t.entity === 'photo' && d && t.record) d.photos.push(t.record);
  }
  return { msg: 'Restored' };
}
const trashCard = () => card('Trash', TRASH.length ? `${stbl('<th>What</th><th>Deleted</th><th>Reason</th><th></th>', TRASH.map((t, i) => {
    const d = t.entity !== 'deal' && liveDeal(t.deal), tab = t.entity === 'payment' ? 'billing' : 'activity';
    return `<tr><td class="f"><div class="row wrap gap-6">${badge(ENT[t.entity] || t.entity, '')}${d ? `<a class="set-link strong" href="#/deal/${esc(d.id)}/${tab}">${esc(t.label)}</a>` : `<span class="strong">${esc(t.label)}</span>`}</div><div class="xs muted mt-8">${esc(t.sub)}</div></td>
      <td class="set-nw small">${dt(t.at)}<div class="xs muted">by ${esc(userName(t.by))}</div></td><td class="small f" data-l="Reason:">${esc(t.reason)}</td>
      <td class="f"><div class="row gap-6"><button class="btn sm dat-ok" data-act="datRestore" data-i="${i}">${icon('undo', 'sm')}Restore</button><button class="btn sm danger" data-act="datPurge" data-i="${i}">Delete for good</button></div></td></tr>`; }).join(''), 'dat-trash set-cards')}`
    : '<div class="empty small">Nothing in the Trash. Founders delete from a deal, a contact, a stock item, a payment row, a timeline entry or a photo; it lands here.</div>',
  { flush: true, right: `<span class="xs muted">${TRASH.length} item${TRASH.length === 1 ? '' : 's'} · restore = roll back · delete for good needs DELETE typed</span>` })
  + `<div class="xs muted mt-8">A deleted deal keeps its payments, notes and photos. A deleted contact takes its open enquiries with it and brings them back on restore; a contact with an order or a payment cannot be deleted. Everything is audited, and a permanent deletion keeps a copy in the audit log.</div>`;
ACTIONS.datRestore = el => { const t = TRASH[+el.dataset.i]; if (!t) return;
  const r = trashRestore(t); if (r.err) return err(r.err);
  if (TRASH.includes(t)) TRASH.splice(TRASH.indexOf(t), 1);
  if (!r.own) audit('trash_restore', t.entity, t.deal || (t.contact && t.contact.id) || t.label, t.label);
  bulk('Restored from Trash · ' + t.label); render(); toast(r.msg, 'undo'); };
ACTIONS.datPurge = el => { const t = TRASH[+el.dataset.i]; if (!t) return;
  modal('Delete for good?', `<p class="small ink2">Type DELETE to remove <b>${esc(t.label)}</b> permanently. The Trash can no longer bring it back; a copy stays in the audit log.</p>${field('Type DELETE', '<input class="input mono" id="dat-del-confirm" autocomplete="off" autocapitalize="characters">', '', 'mt-12')}`,
    `${cancelBtn}<button class="btn danger" data-act="datPurgeOk" data-i="${el.dataset.i}">Delete for good</button>`); };
ACTIONS.datPurgeOk = el => { if (val('dat-del-confirm') !== 'DELETE') return err('Not deleted: you have to type DELETE exactly');
  const t = TRASH[+el.dataset.i]; if (!t) return closeLayer();
  if (t.entity === 'contact' && t.contact) { const left = cascaded(t, t.contact.id); if (left.length) return err(`A contact is deleted for good only after its deals: ${left.length} still in the Trash`); }
  TRASH.splice(TRASH.indexOf(t), 1);
  if (t.entity === 'deal') { const d = t.record || (t.deal && dealById(t.deal)); if (d && DEALS.includes(d) && d.deleted) DEALS.splice(DEALS.indexOf(d), 1); }
  if (t.entity === 'payment') { const d = t.deal && dealById(t.deal), p = voidedPay(t, d); if (p) d.payments.splice(d.payments.indexOf(p), 1); }
  audit('trash_purge', t.entity, t.deal || (t.contact && t.contact.id) || t.label, t.label + ' (JSON copy kept)'); bulk('Deleted for good · ' + t.label); closeLayer(); render(); toast('Deleted for good', 'x'); };

SCREENS.data = {
  title: 'Data', nav: 'data',
  render() {
    const head = pageHead('Data', 'Import history · export everything · backups');
    if (!(F() || can('import') || can('export.all'))) return `${head}<div class="banner">${icon('lock')}<div class="grow small">Your role has no data tools. Founders grant them in Settings → Access.</div><button class="btn sm" data-go="#/settings">Settings</button></div>`;
    const wide = can('import') && ST.imp.step !== 'pick';
    const left = [can('import') && !wide ? importCard() : '', F() ? sheetCard() : '', F() ? demoCard() : ''].filter(Boolean), right = [can('export.all') || F() ? exportCard() : '', F() ? zohoCard() : '', F() ? backupCard() : ''].filter(Boolean);
    const cols = left.length && right.length ? `<div class="grid g2 dat-cols"><div class="stack">${left.join('')}</div><div class="stack">${right.join('')}</div></div>` : `<div class="grid g2 dat-cols">${[...left, ...right].join('')}</div>`;
    return `${head}${wide ? `<div class="dat-wide">${importCard()}</div>` : ''}${cols}
      ${can('import') ? `<div class="mt-16">${historyCard()}</div>` : ''}
      ${F() ? `<div class="mt-16">${trashCard()}</div><div class="mt-16">${card('Audit log', auditTable(), { right: '<span class="xs muted">founders only · every sign-in, save, export and deletion</span>' })}</div>` : ''}`;
  },
  mount(root) {
    const k = root.querySelector('[data-datkind]');
    if (k) k.addEventListener('change', () => { ST.imp = { step: 'pick', kind: k.value, file: false, map: null, result: null }; render(); });
    root.querySelectorAll('[data-datmap]').forEach(s => s.addEventListener('change', () => { ST.imp.map[s.dataset.datmap] = s.value; render(); }));
    const u = root.querySelector('#dat-sheet-url'); if (u) u.addEventListener('keydown', e => { if (e.key === 'Enter') ACTIONS.datSheetSave(); });
    mountAudit(root);
  }
};

/* ======================================================================================
   MESSAGES (template library)
   ====================================================================================== */
const CAT_TONE = { marketing: 'amber', utility: 'blue', service: 'green' };
const POST_STAGES = ['Delivered', 'Closed'], QUOTE_STAGES = ['Quoted', 'Negotiating'];
/* Due now: active templates with a trigger day. Post-purchase (and the delivered follow-up O8) count from delivery,
   the rest from when the quote was shared. Due when base + N ≤ today and within the last 14 days, the contact
   has consent, and the template is not already logged on the deal. (The live app keys O8 on the quote; fixed here.) */
function msgDue() {
  const t0 = dayStart(now()), out = [];
  for (const t of TEMPLATES) {
    if (!t.active || t.trigger == null || t.trigger === '') continue;
    const post = t.journey === 'post' || POST_STAGES.includes(t.stage), due = [], skipped = [];
    for (const d of dealsVisible()) {
      if (d.deleted) continue;
      const base = post ? (POST_STAGES.includes(d.stage) ? d.delivered_at : null) : (QUOTE_STAGES.includes(d.stage) ? d.quote_sent_at : null);
      if (!base) continue;
      const late = Math.round((t0 - addDays(dayStart(base), +t.trigger)) / 864e5);
      if (late < 0 || late > 14) continue;
      if ((d.activities || []).some(a => a.template_key === t.key)) continue;
      (dealContact(d).consent_marketing ? due : skipped).push({ d, late });
    }
    if (due.length || skipped.length) out.push({ t, post, due: due.slice(0, 50), skipped });
  }
  return out;
}
const sentCount = k => DEALS.reduce((s, d) => s + (d.activities || []).filter(a => a.template_key === k).length, 0);
function msgVars(d) {
  const c = dealContact(d), m = money(d), k = d.calc || {}, f = n => NF.format(Math.round(n || 0)), hid = x => hides(x) ? '•••' : null;
  const l0 = (d.lines || [])[0];
  return { name: c.name.split(/\s|&/)[0], agent: userName(d.owner).split(' ')[0], interest: (d.product_interest || 'piece').toLowerCase(), slots: 'Sat 11:00 or Sun 16:00', quote_no: d.quote_no || 'MQ-…',
    piece: dealTitle(d), diamond_value: f(k.diamond_value), gold_wt: d.gold_wt || '—', purity: d.purity, gold_rate: hid('gold_rate_applied') || f(k.gold_rate_applied), gold_value: f(k.gold_value), labour: hid('labour') || f(k.labour), gst_pct: d.gst_pct, gst_amt: f(k.gst_amt), total: f(k.total),
    valid_till: d.quote_valid_till ? dt(d.quote_valid_till) : 'tomorrow evening', order_no: d.order_no || 'SO-1040', est_cost: f(d.est_cost || k.total), advance: f(m.advance), balance: f(m.balance), cad_date: fdate(addDays(now(), 5)), angles: 3,
    feedback_date: fdate(addDays(now(), 3)), delivery_date: fdate(d.promised_date || addDays(now(), 21)), gold_colour: String(d.gold_colour || 'yellow').toLowerCase(), stone_spec: (d.lines || []).map(l => `${l.pcs} ${l.shape} ${l.ct} ct ${l.quality}`).join(', ') || '—',
    est_weight: d.est_weight || d.gold_wt || '—', production_stage: String(d.production_stage || 'setting').toLowerCase(), photo_line: 'A photo from the bench is attached.', actual_weight: d.actual_weight || d.gold_wt || '—', cert_no: (l0 && l0.cert_no) || 'LG620419872',
    delivery_method: (d.delivery_method || 'in person').toLowerCase(), balance_line: m.balance > 0.5 ? `Balance due: INR ${f(m.balance)}.` : 'It is fully paid, thank you.', tracking_line: d.tracking_no ? `${d.courier} tracking ${d.tracking_no}.` : 'Our team will hand it over personally.',
    amount: f(m.paid || m.advance), mode: ((d.payments || [])[0] || {}).mode || 'UPI', reference: ((d.payments || [])[0] || {}).reference || 'UPI ref', pay_details: SETTINGS.pay_details, invoice_no: d.invoice_no || 'MQ/26-27/0418',
    review_link: SETTINGS.review_link, referral_offer: SETTINGS.referral_offer || 'a small thank-you', occasion: 'anniversary', festival: 'Diwali', detail: 'a slightly thinner band', option: 'a 1.8 mm band', reply_by: fdate(addDays(now(), 2)),
    issue: 'the setting of one side stone', new_date: fdate(addDays(now(), 6)), actual_cost: f((variance(d) || {}).actual_cost || d.est_cost || k.total) };
}
const sampleDeal = t => { const vis = dealsVisible(); return vis.find(d => d.stage === t.stage && d.quote) || vis.find(d => t.journey === 'post' ? POST_STAGES.includes(d.stage) : d.quote) || vis[0]; };
const fillTpl = (body, vars) => esc(body).replace(/\{([a-z_0-9]+)\}/gi, (m0, k) => vars[k] != null && vars[k] !== '' ? `<b>${esc(vars[k])}</b>` : `<span class="msg-var miss">{${k}}</span>`);
function tplRow(t) {
  const n = sentCount(t.key), w = can('templates.write');
  return `<tr class="${t.active ? '' : 'msg-off'}"><td class="msg-k"><span class="mono strong">${esc(t.key)}</span></td>
    <td class="msg-nm"><div class="strong small">${esc(t.name)}</div><div class="xs muted">${n ? `sent ${n}×` : 'not sent yet'}${t.active ? '' : ' · inactive'}</div></td>
    <td class="msg-st">${t.stage ? stagePill(t.stage) : '<span class="xs muted">any time</span>'}</td><td class="msg-ct">${badge(t.cat, CAT_TONE[t.cat])}</td><td class="msg-tr set-nw small ${t.trigger != null && t.trigger !== '' ? '' : 'none'}">${t.trigger != null && t.trigger !== '' ? 'day ' + t.trigger : '—'}</td>
    <td class="msg-bd"><div class="msg-body">${hlVars(t.body)}</div></td>
    <td class="msg-ac"><div class="row gap-6"><button class="btn sm ghost" data-act="msgPreview" data-key="${esc(t.key)}">${icon('eye', 'sm')}Preview</button>${w ? `<button class="btn sm" data-act="msgEdit" data-key="${esc(t.key)}">${icon('edit', 'sm')}Edit</button>` : ''}</div></td></tr>`;
}
SCREENS.messages = {
  title: 'Messages', nav: 'messages',
  render() {
    const w = can('templates.write'), due = msgDue(), nDue = due.reduce((s, x) => s + x.due.length, 0);
    const dueHtml = due.length ? due.map(({ t, post, due: list, skipped }) => `<div class="msg-due">
        <div class="row wrap gap-6"><span class="mono strong">${esc(t.key)}</span><span class="strong small">${esc(t.name)}</span><span class="xs muted">day ${t.trigger} after ${post ? 'delivery' : 'the quote was shared'}</span>${badge(t.cat, CAT_TONE[t.cat])}</div>
        ${list.length ? `<div class="row wrap gap-6 mt-8">${list.map(({ d, late }) => `<a class="msg-chip" href="#/deal/${esc(d.id)}/activity">${esc(dealContact(d).name)} · ${esc(d.order_no || dealTitle(d))}${late ? `<span class="msg-late">+${late}d</span>` : '<span class="msg-today">today</span>'}</a>`).join('')}</div>` : ''}
        ${skipped.length ? `<div class="xs muted mt-8">${icon('lock', 'sm')} Not shown: ${skipped.map(x => esc(dealContact(x.d).name)).join(', ')} (no marketing consent).</div>` : ''}</div>`).join('')
      : '<div class="empty small">Nothing due today. Follow-ups appear here on their trigger day.</div>';
    return `${pageHead('Messages', 'Every template on the customer journey: sent from a deal, logged automatically', w ? `<button class="btn primary" data-act="msgNew">${icon('plus')}Template</button>` : '')}
      ${w ? '' : `<div class="banner msg-note">${icon('lock')}<div class="small">You can read and send these from a deal. Editing needs "Edit message templates" (marketing and founders by default).</div></div>`}
      ${card(`Due now: post-purchase and quote follow-ups${nDue ? ` <span class="badge gold">${nDue}</span>` : ''}`, dueHtml, { right: '<span class="xs muted">by trigger day, consent-checked</span>' })}
      ${JOURNEYS.map(([j, label]) => { const list = TEMPLATES.filter(t => t.journey === j);
        return card(label, list.length ? stbl('<th>Key</th><th>Name</th><th>Stage</th><th>Meta cat.</th><th>Trigger</th><th>Body</th><th></th>', list.map(tplRow).join(''), 'msg-tbl') : '<div class="empty small">No templates in this journey yet.</div>', { cls: 'mt-16', flush: true, right: `<span class="xs muted">${list.length} template${list.length === 1 ? '' : 's'}</span>` }); }).join('')}
      ${card('Rules that apply to every message', `<ul class="set-ul">
        <li>${icon('chat', 'sm')}<span><b>Voice.</b> Warm, clear, specific. At most one emoji, and only where the SOP used one.</span></li>
        <li>${icon('eye', 'sm')}<span><b>Nothing hidden.</b> The whole price, dated: stones, gold at the rate, making, GST.</span></li>
        <li>${icon('alert', 'sm')}<span><b>No green claims.</b> Lab-grown is described as what it is, never as "eco" or "sustainable".</span></li>
        <li>${icon('star', 'sm')}<span><b>One brand in every message: MARQA.</b> Partner boutiques, marketplaces, the showroom and the website are internal attribution only.</span></li>
        <li>${icon('shield', 'sm')}<span><b>Meta categories.</b> Utility messages answer what the client asked or ordered; marketing messages need consent and are skipped for anyone without it.</span></li>
        <li>${icon('clock', 'sm')}<span><b>Response SLA.</b> WhatsApp / DM ${esc(SETTINGS.sla_whatsapp_hours)} h · email ${esc(SETTINGS.sla_email_hours)} h · missed calls the same day.</span></li></ul>`, { cls: 'mt-16' })}`;
  }
};
function tplEditor(t) {
  const isNew = !t; t = t || { key: '', name: '', journey: 'post', stage: '', cat: 'utility', trigger: null, body: 'Hi {name}, ', active: true, vars: '' };
  const vars = ['name', 'agent', 'piece', 'quote_no', 'order_no', 'total', 'balance', 'delivery_date', 'review_link', 'referral_offer'];
  openSheet({ title: isNew ? 'New template' : 'Edit ' + esc(t.key), sub: isNew ? 'It appears in its journey at once, and on every deal\'s Message menu.' : esc(t.name), wide: true,
    body: `<div class="fgrid">
      ${field('Key', `<input class="input mono" id="msg-f-key" value="${esc(t.key)}" placeholder="C1" ${isNew ? '' : 'readonly'}>`, isNew ? 'A–Z and 0–9 only, upper-cased. Blank = C + a number.' : 'Keys never change; history refers to them.')}
      ${field('Name', `<input class="input" id="msg-f-name" value="${esc(t.name)}" placeholder="Untitled">`)}
      ${field('Journey', `<select class="select" id="msg-f-journey">${JOURNEYS.map(([j, n]) => `<option value="${j}" ${j === t.journey ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}
      ${field('Stage', `<select class="select" id="msg-f-stage"><option value="">—</option>${DSTAGES.map(s => `<option value="${esc(s.key)}" ${s.key === t.stage ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>`)}
      ${field('Meta category', `<select class="select" id="msg-f-cat">${['utility', 'marketing', 'service'].map(c => `<option ${c === t.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>`, 'Marketing needs the contact\'s consent.')}
      ${field('Trigger <em>(days after)</em>', `<input class="input num" id="msg-f-trigger" value="${t.trigger != null ? esc(t.trigger) : ''}" inputmode="numeric" placeholder="blank = none">`, 'Post-purchase counts from delivery; the rest from when the quote was shared.')}
      ${field('Active', `<select class="select" id="msg-f-active"><option value="1" ${t.active ? 'selected' : ''}>Yes</option><option value="0" ${t.active ? '' : 'selected'}>No</option></select>`)}
      ${field('Variables <em>(documentation)</em>', `<input class="input mono" id="msg-f-vars" value="${esc(t.vars || (t.body.match(/\{[a-z_0-9]+\}/gi) || []).filter((v, i, a) => a.indexOf(v) === i).join(', '))}">`, 'Informational only.')}
      <label class="field full"><span>Body <em>(variables in {braces})</em></span><textarea class="textarea" id="msg-f-body" rows="8">${esc(t.body)}</textarea></label>
      <div class="full"><div class="row wrap gap-6"><span class="xs muted">Insert:</span>${vars.map(v => `<button class="btn sm ghost mono" data-act="msgInsVar" data-v="${v}">{${v}}</button>`).join('')}</div>
        <div class="label mt-16">Preview</div><div class="msg-wa mt-8"><div class="bub out" id="msg-f-prev">${hlVars(t.body)}</div></div></div></div>`,
    foot: `${cancelBtn}<button class="btn primary" data-act="msgSave" data-key="${isNew ? '' : esc(t.key)}">${icon('check', 'sm')}Save</button>`,
    onMount: sh => { const b = sh.querySelector('#msg-f-body'), p = sh.querySelector('#msg-f-prev'); b.addEventListener('input', () => { p.innerHTML = hlVars(b.value); }); } });
}
ACTIONS.msgNew = () => { if (!can('templates.write')) return err('Founders or Marketing edit templates'); tplEditor(null); };
ACTIONS.msgEdit = el => { if (!can('templates.write')) return err('Founders or Marketing edit templates'); tplEditor(TEMPLATES.find(t => t.key === el.dataset.key)); };
ACTIONS.msgInsVar = el => { const b = document.getElementById('msg-f-body'), p = document.getElementById('msg-f-prev'); if (!b) return;
  const s = b.selectionStart != null ? b.selectionStart : b.value.length, ins = '{' + el.dataset.v + '}';
  b.value = b.value.slice(0, s) + ins + b.value.slice(b.selectionEnd != null ? b.selectionEnd : s); if (p) p.innerHTML = hlVars(b.value); b.focus(); b.selectionStart = b.selectionEnd = s + ins.length; };
ACTIONS.msgSave = el => {
  if (!can('templates.write')) return err('Founders or Marketing edit templates');
  const isNew = !el.dataset.key, body = document.getElementById('msg-f-body') ? document.getElementById('msg-f-body').value : '';
  const key = isNew ? (val('msg-f-key').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'C' + String(Date.now()).slice(-6)) : el.dataset.key;
  if (isNew && TEMPLATES.some(t => t.key === key)) return err(`Key ${key} is already used`);
  const trig = val('msg-f-trigger'); if (trig !== '' && !(+trig >= 0 && Number.isInteger(+trig))) return err('Trigger is a whole number of days, or blank');
  if (!body.trim()) return err('The body is empty');
  const rec = { name: val('msg-f-name') || 'Untitled', journey: val('msg-f-journey'), stage: val('msg-f-stage') || null, cat: val('msg-f-cat'), trigger: trig === '' ? null : +trig, active: val('msg-f-active') === '1', body, vars: val('msg-f-vars') };
  if (isNew) TEMPLATES.push(Object.assign({ key }, rec)); else Object.assign(TEMPLATES.find(t => t.key === key), rec);
  audit('template_save', 'template', key, isNew ? 'new · ' + rec.name : rec.name);
  closeLayer(); render(); toast(isNew ? `Template ${key} added to ${JOURNEYS.find(j => j[0] === rec.journey)[1]}` : `Template ${key} saved`, 'send');
};
ACTIONS.msgPreview = el => { const t = TEMPLATES.find(x => x.key === el.dataset.key), d = sampleDeal(t), vars = msgVars(d), c = dealContact(d);
  const missing = (t.body.match(/\{([a-z_0-9]+)\}/gi) || []).map(v => v.slice(1, -1)).filter(k => vars[k] == null);
  openSheet({ title: `${esc(t.key)} · ${esc(t.name)}`, sub: `Filled from ${esc(c.name)}'s deal (${esc(d.order_no || d.id)})`,
    body: `<div class="row wrap gap-6">${t.stage ? stagePill(t.stage) : ''}${badge(t.cat, CAT_TONE[t.cat])}<span class="xs muted">${t.trigger != null ? 'day ' + t.trigger : 'no trigger day'}</span></div>
      <div class="msg-wa mt-16"><div class="bub out">${fillTpl(t.body, vars)}<div class="bt">${hm(now())} ${icon('check', 'sm')}</div></div></div>
      ${missing.length ? `<div class="xs muted mt-12">Filled when sent: ${missing.map(m => `<span class="msg-var miss">{${esc(m)}}</span>`).join(' ')}</div>` : ''}
      <div class="small ink2 mt-16">To send it, open the deal → Message → ${esc(t.key)}. WhatsApp opens with this text and the send is logged on the timeline${t.cat === 'marketing' ? ', if the contact has consent' : ''}.</div>`,
    foot: `<button class="btn" data-go="#/deal/${esc(d.id)}/activity">${icon('arrowR', 'sm')}Open the deal</button>${can('templates.write') ? `<button class="btn primary" data-act="msgEdit" data-key="${esc(t.key)}">${icon('edit', 'sm')}Edit</button>` : ''}` }); };

})();

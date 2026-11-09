/* Stock module (#/stock, #/stock/<item id> opens the item drawer) and the Demand panel (#/demand),
   as in the live MARQA Pipeline v2.7.0: one pool of loose diamonds, stones, lots and finished pieces;
   every quantity change is a signed move in the ledger, never an edit. Replaces the older SCREENS.stock.
   Everything here is prefixed stk / dem (actions, helpers, state) so no other module is touched. */

/* ---------- state ---------- */
const stkSess = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) { return null; } };
const STK = { kind: ['all', 'diamond', 'gem', 'lot', 'jewellery'].includes(stkSess('stk-kind')) ? stkSess('stk-kind') : 'all', status: 'in_stock', origin: '', location: '', vendor: '', q: '' };
const DEM = { vendor: '', mode: 'awaiting' };
const STK_HIDDEN = [];          // items tombstoned by an import undo: hidden, never deleted; their codes stay taken
const STK_ORDER_STAGES = ['Order Confirmed', 'CAD In Progress', 'CAD Sent', 'CAD Approved', 'In Production', 'QC'];
const STK_OUT = ['issue', 'memo_out', 'sale', 'write_off'];
const STK_WHERE = { issued: 'issued to a karigar', memo: 'out on memo', sold: 'sold', consumed: 'used up', written_off: 'written off' };
const STK_ORIGIN = { 'Walk-in': 'WI', Website: 'WEBS', 'Meta ad': 'META', Google: 'GOOG', Instagram: 'IG', Referral: 'REF', Exhibition: 'EXH', Repeat: 'REP', B2B: 'B2B', 'Partner boutique': 'PB', Marketplace: 'MKT', 'Corporate gifting': 'CORP', Other: 'OTH' };
let stkSeq = 0, STK_FORM = null, STK_IMP = null, STK_MV = null, DEM_PICK = null;

/* Seed memo moves carry their due date in the note ("back by 10 Nov"); the SaaS keeps it as a field. */
(function stkSeed() {
  STOCK_MOVES.forEach(m => {
    if (m.kind !== 'memo_out' || m.due) return;
    const x = /(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.exec(m.note || '');
    m.due = x ? new Date(TODAY.getFullYear(), MON.indexOf(x[2]), +x[1], 18) : addDays(m.at, 7);
  });
  STOCK_ITEMS.forEach(it => { if (typeof it.cost !== 'number') it.cost = +it.cost || 0; });
})();

/* ---------- small helpers ---------- */
const stkItem = id => STOCK_ITEMS.find(x => x.id === id || x.code === id);
const stkCt = n => (Math.round((+n || 0) * 100) / 100).toFixed(2);
const stkNum = n => String(Math.round((+n || 0) * 100) / 100);
const stkPcs = n => NF.format(+n || 0);
const stkPcsU = n => stkPcs(n) + (Math.abs(+n) === 1 ? ' pc' : ' pcs');
const stkSg = n => (parseFloat(String(n).replace(/,/g, '')) > 0 ? '+' : parseFloat(String(n).replace(/,/g, '')) < 0 ? '−' : '') + String(n).replace('-', '');
const stkTime = d => d ? `${fdate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—';
const stkDash = v => (v === '' || v == null) ? '<span class="muted">—</span>' : esc(v);
const stkId = () => 'm' + Date.now().toString(36) + (++stkSeq);
const stkOnStockRoute = () => { const p = parse(); return p.name === 'stock' && !!p.id; };
const stkRemovedCodes = () => [...TRASH.filter(e => e.entity === 'stock').map(e => e.record ? e.record.code : String(e.label || '').split(' · ')[0]), ...STK_HIDDEN.map(x => x.code)];
const stkAudit = (action, entity, entity_id, detail) => AUDIT.unshift({ at: NOW(), user: viewUser().id, action, entity, entity_id, detail });

function stkB(it) {
  const b = stockBal(it);
  b.moves = b.moves.slice().sort((x, y) => x.at - y.at);   // the seed ledger is not in date order
  b.last_move_at = b.moves.length ? b.moves[b.moves.length - 1].at : null;
  const standing = b.moves.filter(m => !m.reversed);
  const last = standing[standing.length - 1];
  if (it.kind !== 'lot') b.status = b.pcs > 0 || !last ? 'in_stock' : ({ issue: 'issued', memo_out: 'memo', sale: 'sold', write_off: 'written_off' }[last.kind] || 'consumed');
  if (it.kind === 'lot') {
    const left = b.pcs > 0 || b.ct > 0.004;
    b.status = left ? 'in_stock' : (last && last.kind === 'write_off' ? 'written_off' : 'consumed');
    const opening = standing.find(m => m.kind === 'in');
    const share = opening ? (opening.ct ? b.ct / opening.ct : (opening.pcs ? b.pcs / opening.pcs : 0)) : 0;
    b.value_cost = left ? r2((it.cost || 0) * Math.max(0, share)) : 0;
    const memo = standing.filter(m => m.kind === 'memo_out' || m.kind === 'memo_back');
    b.memo_pcs = -memo.reduce((s, m) => s + m.pcs, 0); b.memo_ct = -r2(memo.reduce((s, m) => s + m.ct, 0));
    b.memo = b.memo_pcs > 0 || b.memo_ct > 0.004 ? standing.filter(m => m.kind === 'memo_out').slice(-1)[0] : null;
  } else {
    b.value_cost = ['in_stock', 'issued', 'memo'].includes(b.status) ? (it.cost || 0) : 0;
    b.memo = b.status === 'memo' ? last : null;
  }
  b.last = last; b.standing = standing;
  b.has = b.status === 'in_stock';
  return b;
}
const stkBalTxt = (it, b) => it.kind === 'lot' ? `${stkPcs(b.pcs)} pcs · ${stkCt(b.ct)} ct` : it.kind === 'jewellery' ? `${b.pcs} pc · ${stkNum(it.gross_wt)} g` : `${b.pcs} pc · ${stkCt(b.ct)} ct`;
function stkDesc(it) {
  const j = a => a.filter(x => x !== '' && x != null).join(' · ');
  if (it.kind === 'diamond') return j([it.shape, it.carat ? stkCt(it.carat) + ' ct' : '', [it.colour, it.clarity].filter(Boolean).join(' '), it.cert_no ? `${it.cert_lab || ''} ${it.cert_no}`.trim() : 'non-cert']);
  if (it.kind === 'gem') return j([it.gem_type, it.shape, it.carat ? stkCt(it.carat) + ' ct' : '', it.colour]);
  if (it.kind === 'lot') return j([it.shape, it.size_mm ? it.size_mm + ' mm' : '', it.sieve, it.quality]) || 'melee lot';
  return j([it.item_type, [it.purity, it.gold_colour].filter(Boolean).join(' '), it.gross_wt ? stkNum(it.gross_wt) + ' g' : '', it.tag_no ? 'tag ' + it.tag_no : '']);
}
const stkKindPill = k => `<span class="badge ${{ diamond: 'out', gem: '', lot: 'gold', jewellery: 'green' }[k] || ''}">${esc(STOCK_KINDS[k] || k)}</span>`;
const stkStatusPill = s => badge(STOCK_STATUS[s][0], STOCK_STATUS[s][1]);
const stkOrigin = o => o ? `<span class="stk-org" title="Origin: ${esc(o)} — attribution, not a partition">${esc(STK_ORIGIN[o] || String(o).slice(0, 4).toUpperCase())}</span>` : '';
function stkDue(m) {
  if (!m || !m.due) return '';
  const n = daysTo(m.due);
  return n < 0 ? `<span class="badge red">memo ${-n}d overdue</span>` : `<span class="xs muted">due back ${fdate(m.due)}${n <= 2 ? ` · ${rel(m.due).toLowerCase()}` : ''}</span>`;
}
const stkDealNo = d => d ? (d.order_no || d.id) : '';
const stkDealLine = d => `${esc(stkDealNo(d))} · ${esc(dealContact(d).name)} · ${esc(dealTitle(d))} · ${esc(stg(d.stage).label)}`;

/* A picklist over Settings → Options; a value no longer on the list stays selectable, labelled "(not in list)". */
function stkPick(name, key, cur, o = {}) {
  const items = opts(key); const v = cur == null ? '' : String(cur);
  const extra = v && !items.includes(v) ? `<option value="${esc(v)}" selected>${esc(v)} (not in list)</option>` : '';
  return `<select class="select" name="${name}" ${o.id ? `id="${o.id}"` : ''} ${o.ro ? 'disabled' : ''}>${o.empty === false ? '' : `<option value="">${o.placeholder || '—'}</option>`}${extra}${items.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
}
function stkFixed(name, list, cur, o = {}) {
  const v = cur == null ? '' : String(cur);
  return `<select class="select" name="${name}" ${o.ro ? 'disabled' : ''}><option value="">—</option>${v && !list.includes(v) ? `<option selected>${esc(v)}</option>` : ''}${list.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
}

/* Buttons that cannot act right now still answer: they show why, in place. Never a dead control. */
function stkBtn(label, act, o = {}) {
  const off = o.off;
  return `<button class="btn ${o.cls || ''} ${off ? 'stk-off' : ''}" data-act="${off ? 'stkWhy' : act}" ${off ? `data-why="${esc(off)}" title="${esc(off)}" aria-disabled="true"` : ''} ${o.data || ''}>${o.icon ? icon(o.icon, 'sm') : ''}${label}</button>`;
}
function stkSay(where, msg, tone) {
  const root = where && where.closest ? (where.closest('.modal, .sheet') || document.getElementById('view')) : (layer().querySelector('.modal, .sheet') || document.getElementById('view'));
  const box = root && root.querySelector('.stk-msg');
  if (!box) { toast(msg, 'alert'); return; }
  box.innerHTML = `<div class="banner ${tone || 'red'} stk-say">${icon(tone === 'blue' ? 'check' : 'alert', 'sm')}<div class="grow">${esc(msg)}</div></div>`;
  box.scrollIntoView({ block: 'nearest' });
}
ACTIONS.stkWhy = el => stkSay(el, el.dataset.why);

/* Layers: my modals share one look (head, scrolling body, foot); on #/stock/<id> closing returns to the list. */
function stkModal({ title, sub, body, foot, wide, onMount }) {
  openModal(`<div class="stk-mh"><div class="grow"><h2>${title}</h2>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="stk-mb">${body}</div>${foot ? `<div class="stk-mf">${foot}</div>` : ''}`, 'stk-m' + (wide ? ' wide' : ''), m => { stkHookClose(); if (onMount) onMount(m); });
}
function stkHookClose() { if (!stkOnStockRoute()) return; layer().querySelectorAll('.scrim[data-act=close], .sh-h [data-act=close], .stk-mh [data-act=close]').forEach(e => { e.dataset.act = 'stkClose'; }); }
function stkToList() { if (stkOnStockRoute()) { history.replaceState(null, '', '#/stock'); lastHash = '#/stock'; } }
ACTIONS.stkClose = () => { closeLayer(); if (stkOnStockRoute()) { stkToList(); render(); } };
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') setTimeout(() => { if (!layer().innerHTML && stkOnStockRoute()) { stkToList(); render(); } }, 0); });
function stkGoItem(id, msg) {
  const h = '#/stock/' + id;
  if (location.hash !== h) { history.pushState(null, '', h); lastHash = h; }
  STK_MSG = msg || null; closeLayer(); render();
}
let STK_MSG = null;

/* ---------- the ledger: one move at a time ---------- */
function stkCan(it, b, act) {
  if (!can('stock.write')) return 'Your role cannot move stock';
  const notIn = `${it.code} is not in the safe — it is ${STK_WHERE[b.status] || 'out'}`;
  switch (act) {
    case 'issue': case 'memo_out': case 'sale': return b.has ? null : notIn;
    case 'return': return it.kind === 'lot' ? (b.status === 'written_off' ? notIn : null) : ['issued', 'memo'].includes(b.status) ? null : `${it.code} is not out with a karigar or on memo`;
    case 'memo_back': return it.kind === 'lot' ? (b.memo ? null : `${it.code} is not out on memo`) : b.status === 'memo' ? null : `${it.code} is not out on memo`;
    case 'adjust': return it.kind === 'lot' ? (b.status === 'written_off' ? notIn : null) : 'Single items move whole — only a lot\'s balance is adjusted. Reverse a move or write the item off instead.';
    case 'write_off': return !isFounder() ? 'Only founders can write stock off' : b.has ? null : notIn;
  }
  return null;
}
const STK_VERB = { in: 'added', issue: 'issued', return: 'returned', memo_out: 'out on memo', memo_back: 'back from memo', sale: 'sold', adjust: 'adjusted', write_off: 'written off', reverse: 'reversed' };
function stkMoveDo(it, kind, o) {
  const b = stkB(it); const why = stkCan(it, b, kind); if (why) return { err: why };
  let pcs, ct;
  if (it.kind !== 'lot') {
    const out = STK_OUT.includes(kind);
    pcs = out ? -1 : 1; ct = it.kind === 'jewellery' ? 0 : r2(out ? -(it.carat || 0) : (it.carat || 0));
  } else {
    pcs = Math.round(+o.pcs || 0); ct = r2(+o.ct || 0);
    if (kind === 'adjust') {
      if (!pcs && !ct) return { err: 'Enter the correction — pieces and / or carat, negative to reduce' };
      if ((pcs < 0 || ct < 0) && !isFounder()) return { err: 'Only founders can adjust stock downwards — ask them to reverse or write off' };
    } else {
      if (!pcs && !ct && ['memo_out', 'write_off'].includes(kind)) { pcs = b.pcs; ct = b.ct; }   // blank = the whole remainder
      if ((!pcs && !ct) || pcs < 0 || ct < 0) return { err: 'Enter the pieces and / or carat moved' };
      if (STK_OUT.includes(kind)) { pcs = -pcs; ct = -ct; }
    }
    if (b.pcs + pcs < 0 || r2(b.ct + ct) < 0) return { err: `That would take ${it.code} below zero — its balance is ${stkBalTxt(it, b)}` };
  }
  if ((kind === 'issue' || kind === 'sale') && !o.deal) return { err: 'Pick the order this is issued to / sold on' };
  const d = o.deal ? dealById(o.deal) : null;
  if (o.deal && !d) return { err: 'Order not found' };
  if (kind === 'issue' && !STK_ORDER_STAGES.includes(d.stage)) return { err: 'Material is issued against a confirmed order in CAD or production.' };
  if (kind === 'memo_out' && !o.due) return { err: 'Give the date it is due back — memos are chased on that date' };
  const vendor = o.vendor || (kind === 'issue' && d ? d.vendor || '' : '');
  const m = { id: stkId(), item: it.id, kind, pcs, ct, deal: d ? d.id : null, vendor, note: o.note || '', at: NOW(), by: viewUser().id };
  if (kind === 'memo_out') m.due = o.due;
  if (o.dem) m.dem = o.dem;
  STOCK_MOVES.push(m);
  if (it.kind !== 'lot') { if (kind === 'issue') it.location = 'With karigar'; if (kind === 'return' || kind === 'memo_back') it.location = 'Safe'; }
  it.updated_at = NOW(); it.updated_by = viewUser().id;
  const qty = `${stkPcsU(Math.abs(pcs))}${it.kind === 'jewellery' ? '' : ' · ' + stkCt(Math.abs(ct)) + ' ct'}`;
  const msg = `Stock ${it.code} ${STK_VERB[kind]}: ${qty}${vendor ? ' · ' + vendor : ''}${d && kind !== 'issue' ? ' · ' + stkDealNo(d) : ''}`;
  if (d && !o.dem) logAct(d, { type: 'system', subject: msg, body: o.note || '' });
  stkAudit('stock_move', 'stock', it.code, `${MOVE_LABEL[kind]} ${pcs > 0 ? '+' : ''}${pcs} pcs ${ct > 0 ? '+' : ''}${stkCt(ct)} ct${d ? ' · ' + stkDealNo(d) : ''}`);
  return { m, msg };
}
function stkRevCheck(m) {
  if (!isFounder()) return 'Only founders can reverse a stock move';
  if (m.kind === 'reverse') return 'A reversal cannot itself be reversed';
  if (m.kind === 'in') return 'The opening stock cannot be reversed — write the item off instead';
  if (m.reversed) return 'That move is already reversed';
  const it = stkItem(m.item); const b = stkB(it);
  if (b.pcs - m.pcs < 0 || r2(b.ct - m.ct) < 0) return `Reversing that would take ${it.code} below zero — its balance is ${stkBalTxt(it, b)}`;
  if (it.kind !== 'lot' && b.pcs - m.pcs > 1) return `Single items move whole — reversing that would count ${it.code} in the safe twice. Reverse the later move first.`;
  return null;
}
function stkRevDo(m, reason) {
  const why = stkRevCheck(m); if (why) return { err: why };
  const it = stkItem(m.item);
  const r = { id: stkId(), item: m.item, kind: 'reverse', pcs: -m.pcs, ct: r2(-m.ct), deal: m.deal, vendor: m.vendor, note: reason, at: NOW(), by: viewUser().id, reverses: m.id, reversed: true };
  m.reversed = true; m.reversed_by = r.id; m.reversed_note = reason;
  STOCK_MOVES.push(r);   // both rows leave the balance (they cancel); the original shows struck through
  if (it.kind !== 'lot') { const s = stkB(it).status; it.location = s === 'issued' ? 'With karigar' : s === 'in_stock' && it.location === 'With karigar' ? 'Safe' : it.location; }
  it.updated_at = NOW();
  stkAudit('stock_reverse', 'stock', it.code, `${MOVE_LABEL[m.kind]} of ${fdate(m.at)} reversed: ${reason}`);
  return { msg: `Move reversed — the ${MOVE_LABEL[m.kind]} move of ${fdate(m.at)} on ${it.code}; an offsetting row is on the ledger` };
}

/* ---------- the list ---------- */
function stkRows() {
  const q = STK.q.trim().toLowerCase();
  return STOCK_ITEMS.map(it => ({ it, b: stkB(it) })).filter(({ it, b }) =>
    (STK.kind === 'all' || it.kind === STK.kind) &&
    (STK.status === 'all' || b.status === STK.status) &&
    (!STK.origin || it.origin === STK.origin) && (!STK.location || it.location === STK.location) && (!STK.vendor || it.vendor === STK.vendor) &&
    (!q || [it.code, it.cert_no, it.tag_no, it.shape, it.gem_type, it.item_type, it.notes, it.title].some(x => x && String(x).toLowerCase().includes(q))))
    .sort((a, b) => ((b.it.updated_at || b.b.last_move_at || 0) - (a.it.updated_at || a.b.last_move_at || 0))).slice(0, 500);
}
function stkTiles() {
  const all = STOCK_ITEMS.map(it => ({ it, b: stkB(it) }));
  const inS = k => all.filter(x => x.it.kind === k && x.b.status === 'in_stock');
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const dia = inS('diamond'), gem = inS('gem'), lot = inS('lot'), jw = inS('jewellery');
  const iss = all.filter(x => x.b.status === 'issued').length, memo = all.filter(x => x.b.status === 'memo').length;
  const t = [
    ['Diamonds in safe', dia.length, stkCt(sum(dia, x => x.b.ct)) + ' ct'],
    ['Stones', gem.length, stkCt(sum(gem, x => x.b.ct)) + ' ct'],
    ['Lots', lot.length, `${stkPcs(sum(lot, x => x.b.pcs))} pcs · ${stkCt(sum(lot, x => x.b.ct))} ct`],
    ['Jewellery', jw.length, stkNum(sum(jw, x => +x.it.gross_wt || 0)) + ' g'],
    ['Issued / on memo', `${iss} / ${memo}`, 'out of the safe']
  ];
  if (can('stock.cost')) t.push(['Value at cost', inrShort(sum(all, x => x.b.value_cost || 0)), 'in-stock items', true]);
  return `<div class="stk-tiles ${t.length === 6 ? 'six' : ''}">${t.map(([k, v, d, hi]) => `<div class="card kpi ${hi ? 'stk-hi' : ''}"><div class="k">${k}</div><div class="v num">${v}</div><div class="d">${d}</div></div>`).join('')}</div>`;
}
function stkCols(kind) {
  const cost = can('stock.cost');
  const code = ({ it }) => `<div class="row stk-codecell nw">${it.kind === 'jewellery' && it.img ? `<img class="thumb stk-th" src="${img(it.img, 96)}" alt="">` : ''}<div class="grow"><div class="mono strong">${esc(it.code)}</div><div class="xs muted only-m truncate">${esc(stkDesc(it))}</div></div></div>`;
  const st = ({ b }) => `${stkStatusPill(b.status)}${b.memo ? `<div class="stk-mt4">${stkDue(b.memo)}</div>` : ''}`;
  const loc = ({ it }) => stkDash(it.location);
  const org = ({ it }) => stkOrigin(it.origin) || '<span class="muted">—</span>';
  const last = ({ b }) => b.last_move_at ? `<span title="${esc(stkTime(b.last_move_at))}">${fdate(b.last_move_at)}</span>` : '—';
  const q = ({ it }) => stkDash(it.quality);
  const C = (h, f, cls) => ({ h, f, cls: cls || '' });
  const tail = (withQ) => [withQ ? C('Quality', q, 'm-hide') : null, C('Location', loc, 'c-loc'), C('Origin', org, 'm-hide'), C('Status', st, 'c-st'), C('Last move', last, 'm-hide num'), cost ? C('Cost', ({ it }) => it.cost ? inr(it.cost) : '—', 'm-hide num') : null].filter(Boolean);
  if (kind === 'diamond') return [C('Code', code), C('Cert', ({ it }) => it.cert_no ? `${esc(it.cert_lab || '')} <span class="mono">${esc(it.cert_no)}</span>` : '<span class="muted">non-cert</span>', 'm-hide'), C('Shape', ({ it }) => stkDash(it.shape), 'm-hide'), C('Carat', ({ it }) => stkCt(it.carat), 'num c-bal'), C('Colour', ({ it }) => stkDash(it.colour), 'm-hide'), C('Clarity', ({ it }) => stkDash(it.clarity), 'm-hide'), ...tail(true)];
  if (kind === 'gem') return [C('Code', code), C('Gem', ({ it }) => stkDash(it.gem_type), 'm-hide'), C('Shape', ({ it }) => stkDash(it.shape), 'm-hide'), C('Carat', ({ it }) => stkCt(it.carat), 'num c-bal'), C('Colour', ({ it }) => stkDash(it.colour), 'm-hide'), ...tail(true)];
  if (kind === 'lot') return [C('Code', code), C('Shape · size', ({ it }) => `${stkDash(it.shape)}${it.size_mm ? ` <span class="muted">${esc(it.size_mm)} mm</span>` : ''}`, 'm-hide'), C('Pcs', ({ b }) => `${stkPcs(b.pcs)}<span class="only-m"> pcs · ${stkCt(b.ct)} ct</span>`, 'num c-bal'), C('Ct', ({ b }) => stkCt(b.ct), 'num m-hide'), C('Sieve', ({ it }) => stkDash(it.sieve), 'm-hide'), ...tail(true)];
  if (kind === 'jewellery') return [C('Code', code), C('Item', ({ it }) => stkDash(it.item_type), 'm-hide'), C('Purity', ({ it }) => `${stkDash(it.purity)}${it.gold_colour ? ` <span class="muted">${esc(it.gold_colour)}</span>` : ''}`, 'm-hide nw'), C('Gross / net g', ({ it }) => `${stkNum(it.gross_wt)}${it.net_wt ? ` <span class="muted">/ ${stkNum(it.net_wt)}</span>` : ''}<span class="only-m"> g</span>`, 'num c-bal'), C('Tag no.', ({ it }) => it.tag_no ? `<span class="mono">${esc(it.tag_no)}</span>` : '—', 'm-hide'), C('HUID', ({ it }) => it.huid ? `<span class="mono">${esc(it.huid)}</span>` : '—', 'm-hide'), ...tail(false)];
  return [C('Code', code), C('Kind', ({ it }) => stkKindPill(it.kind), 'm-hide'), C('Description', ({ it }) => `<span class="ink2">${esc(stkDesc(it))}</span>`, 'm-hide stk-desc'), C('Balance', ({ it, b }) => it.kind !== 'lot' && b.pcs <= 0 ? `<span class="muted" title="Out of the safe: ${esc(STOCK_STATUS[b.status][0])}">0 pc</span>` : stkBalTxt(it, b), 'num c-bal'), ...tail(true)];
}
function stkTable() {
  const rows = stkRows(), cols = stkCols(STK.kind);
  if (!rows.length) return `<div class="empty">${icon('search', 'lg')}<div class="strong mt-8" style="color:var(--ink)">Nothing here — no items match these filters.</div><div class="small mt-8">Try Everything in Status, or clear the search.</div><button class="btn sm mt-16" data-act="stkClear">${icon('refresh', 'sm')}Clear filters</button></div>`;
  return `<div class="tbl-wrap"><table class="tbl resp stk-list"><thead><tr>${cols.map(c => `<th class="${c.cls.replace(/c-\w+|stk-desc/g, '')}">${c.h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr data-act="stkOpen" data-id="${r.it.id}" class="${r.b.status === 'written_off' || r.b.status === 'consumed' || r.b.status === 'sold' ? 'stk-dim' : ''}">${cols.map(c => `<td class="${c.cls}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const stkFoot = n => `<div class="stk-foot xs muted">${n} item${n === 1 ? '' : 's'}. Click a row for the item and its ledger. Every quantity is a move — an opening balance, an issue, a return, a correction — never an edit.</div>`;
function stkFilters() {
  const origins = [...new Set([...opts('source_channels'), ...STOCK_ITEMS.map(x => x.origin).filter(Boolean)])];
  const vendors = [...new Set([...opts('vendors'), ...STOCK_ITEMS.map(x => x.vendor).filter(Boolean)])];
  const nX = ['origin', 'location', 'vendor'].filter(k => STK[k]).length;
  const sel = (f, all, list, labels) => `<label class="stk-f stk-xf"><span class="xs muted">${labels}</span><select class="select" data-stk-f="${f}"><option value="">${all}</option>${list.map(x => `<option ${STK[f] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
  return `<div class="stk-filters ${STK.more ? 'open' : ''}">
    <label class="stk-f stk-search"><span class="xs muted">Search</span><div class="stk-si">${icon('search', 'sm')}<input class="input" id="stkQ" placeholder="code, cert no., tag, shape…" value="${esc(STK.q)}" autocomplete="off"></div></label>
    <label class="stk-f"><span class="xs muted">Status</span><select class="select" data-stk-f="status">${[...Object.entries(STOCK_STATUS).map(([k, v]) => [k, v[0]]), ['all', 'Everything']].map(([k, n]) => `<option value="${k}" ${STK.status === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn only-m stk-morebtn" data-act="stkMore">${icon('funnel', 'sm')}${STK.more ? 'Fewer filters' : 'More filters'}${nX ? ` <span class="badge gold">${nX}</span>` : ''}</button>
    ${sel('origin', 'All sources', origins, 'Source')}${sel('location', 'All locations', opts('stock_locations'), 'Location')}${sel('vendor', 'All vendors', vendors, 'Vendor')}
  </div>`;
}
function stkKindTabs() {
  const base = STOCK_ITEMS.map(it => ({ it, b: stkB(it) })).filter(({ it, b }) => (STK.status === 'all' || b.status === STK.status) && (!STK.origin || it.origin === STK.origin) && (!STK.location || it.location === STK.location) && (!STK.vendor || it.vendor === STK.vendor));
  return `<div class="tabs stk-tabs">${[['all', 'All'], ['diamond', 'Diamonds'], ['gem', 'Gems'], ['lot', 'Lots'], ['jewellery', 'Jewellery']].map(([k, n]) =>
    `<button class="tab ${STK.kind === k ? 'on' : ''}" data-act="stkKind" data-k="${k}">${n} <span class="stk-n">${base.filter(x => k === 'all' || x.it.kind === k).length}</span></button>`).join('')}</div>`;
}
function stkHeadActions() {
  const w = can('stock.write') ? null : 'Your role cannot edit stock — founders grant “Stock: add, edit and import” in Settings → Access';
  const x = can('export.all') ? null : 'Exports need the “Export the full database” permission — ask a founder';
  return `<div class="stk-exp">${stkBtn('Excel', 'stkExport', { icon: 'download', cls: 'sm ghost', off: x, data: 'data-k="xlsx"' })}${stkBtn('Stock_Items.csv', 'stkExport', { icon: 'doc', cls: 'sm ghost', off: x, data: 'data-k="csv"' })}${stkBtn('Zoho Inventory', 'stkExport', { icon: 'layers', cls: 'sm ghost', off: x, data: 'data-k="zoho"' })}</div>
    ${stkBtn('Import CSV', 'stkImport', { icon: 'upload', off: w })}${stkBtn('Add item', 'stkAdd', { icon: 'plus', cls: 'gold', off: w })}`;
}

SCREENS.stock = {
  title: 'Stock', nav: 'stock',
  render() {
    if (!can('stock')) return pageHead('Stock', 'What the safe holds') + `<div class="card"><div class="empty">${icon('lock', 'lg')}<div class="strong mt-8" style="color:var(--ink)">Your role cannot open the stock ledger.</div><div class="small mt-8">Founders grant it in Settings → Access.</div><button class="btn sm mt-16" data-go="#/home">${icon('home', 'sm')}Back to the dashboard</button></div></div>`;
    const rows = stkRows();
    return `${pageHead('Stock', 'What the safe holds — loose diamonds, stones, lots and finished pieces', stkHeadActions())}
      ${stkTiles()}
      <div class="stk-msg"></div>
      ${stkFilters()}
      ${stkKindTabs()}
      <div class="card stk-card" id="stkTbl">${stkTable()}</div>
      <div id="stkFootN">${rows.length ? stkFoot(rows.length) : ''}</div>`;
  },
  mount(root, p) {
    const q = root.querySelector('#stkQ');
    if (q) q.addEventListener('input', () => { STK.q = q.value; const t = root.querySelector('#stkTbl'); t.innerHTML = stkTable(); const n = stkRows().length; root.querySelector('#stkFootN').innerHTML = n ? stkFoot(n) : ''; });
    root.querySelectorAll('[data-stk-f]').forEach(s => s.addEventListener('change', () => { STK[s.dataset.stkF] = s.value; stkToList(); render(); }));
    if (p.id && can('stock')) { const m = STK_MSG; STK_MSG = null; stkDrawer(p.id, m); }
  }
};
ACTIONS.stkKind = el => { STK.kind = el.dataset.k; stkSess('stk-kind', STK.kind); stkToList(); render(); };
ACTIONS.stkMore = () => { STK.more = !STK.more; render(); };
ACTIONS.stkClear = () => { Object.assign(STK, { status: 'all', origin: '', location: '', vendor: '', q: '' }); stkToList(); render(); };
ACTIONS.stkOpen = el => stkGoItem(el.dataset.id);

/* ---------- item drawer ---------- */
const STK_FL = { code: 'Code', location: 'Location', origin: 'Source / door', shape: 'Shape', carat: 'Carat', quality: 'Quality band', certified: 'Certified', cert_lab: 'Lab', cert_no: 'Certificate no.', colour: 'Colour', clarity: 'Clarity', cut: 'Cut', polish: 'Polish', symmetry: 'Symmetry', fluorescence: 'Fluorescence', measurements: 'Measurements (mm)', size_mm: 'Size (mm)', gem_type: 'Gem type', sieve: 'Sieve', item_type: 'Item type', purity: 'Purity', gold_colour: 'Colour', gross_wt: 'Gross weight (g)', net_wt: 'Net weight (g)', size: 'Size', tag_no: 'Tag no.', huid: 'HUID', stone_summary: 'Stones', vendor: 'Vendor / supplier', purchased_at: 'Purchased on', invoice_ref: 'Invoice ref.', cost: 'Landed cost', list_price: 'List price', notes: 'Notes', pcs: 'Pieces in the parcel', ct: 'Total carat' };
const STK_KF = {
  diamond: ['shape', 'carat', 'quality', 'certified', 'cert_lab', 'cert_no', 'colour', 'clarity', 'cut', 'polish', 'symmetry', 'fluorescence', 'measurements', 'size_mm'],
  gem: ['gem_type', 'shape', 'carat', 'certified', 'cert_lab', 'cert_no', 'colour', 'quality', 'cut', 'measurements', 'size_mm'],
  lot: ['shape', 'size_mm', 'sieve', 'quality', 'colour', 'clarity', 'pcs', 'ct'],
  jewellery: ['item_type', 'purity', 'gold_colour', 'gross_wt', 'net_wt', 'size', 'tag_no', 'huid', 'stone_summary']
};
const STK_REQ = { diamond: ['shape', 'carat'], gem: ['gem_type', 'carat'], lot: ['shape'], jewellery: ['item_type', 'purity', 'gross_wt'] };
function stkShow(it, k) {
  const v = it[k];
  if (k === 'certified') return it.cert_no || +v ? 'Yes' : 'No';
  if (k === 'cert_no' || k === 'tag_no' || k === 'huid') return v ? `<span class="mono">${esc(v)}</span>` : stkDash('');
  if (k === 'carat') return v ? stkCt(v) + ' ct' : stkDash('');
  if (k === 'cost' || k === 'list_price') return v ? inr(v) : stkDash('');
  if (k === 'gross_wt' || k === 'net_wt') return v ? stkNum(v) + ' g' : stkDash('');
  if (k === 'purchased_at') return v ? esc(new Date(v + 'T12:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })) : stkDash('');
  return stkDash(v);
}
function stkDealsOf(it) { return [...new Set(STOCK_MOVES.filter(m => m.item === it.id && m.deal).map(m => m.deal))].map(dealById).filter(Boolean); }
function stkStateLine(it, b) {
  const last = b.last;
  if (b.status === 'issued' && last) { const d = dealById(last.deal); return `${icon('hammer', 'sm')}<span>Issued${d ? ` to <a class="stk-a" data-go="#/deal/${d.id}">${esc(stkDealNo(d))}</a>` : ''}${last.vendor ? ' · ' + esc(last.vendor) : ''} · ${fdate(last.at)}</span>`; }
  if (b.status === 'memo' && last) return `${icon('truck', 'sm')}<span>On memo with ${esc(last.vendor || '—')} · ${stkDue(last)}</span>`;
  if (it.kind === 'lot' && b.memo) return `${icon('truck', 'sm')}<span>${stkPcs(b.memo_pcs)} pcs · ${stkCt(b.memo_ct)} ct out on memo with ${esc(b.memo.vendor || '—')} · ${stkDue(b.memo)}</span>`;
  if (b.status === 'sold' && last) { const d = dealById(last.deal); return `${icon('receipt', 'sm')}<span>Sold${d ? ` on <a class="stk-a" data-go="#/deal/${d.id}">${esc(stkDealNo(d))}</a> · ${esc(dealContact(d).name)}` : ''} · ${fdate(last.at)}</span>`; }
  if (b.status === 'written_off') return `${icon('x', 'sm')}<span>Written off ${last ? fdate(last.at) : ''} — kept on the ledger</span>`;
  if (b.status === 'consumed') return `${icon('check', 'sm')}<span>Used up — every piece has gone to orders</span>`;
  const where = { 'With karigar': 'With the karigar', Exhibition: 'At the exhibition', '': 'In the safe' }[it.location || ''] || 'In the ' + String(it.location).toLowerCase();
  return `${icon('lock', 'sm')}<span>${esc(where)}${b.last_move_at ? ' · last move ' + fdate(b.last_move_at) : ''}</span>`;
}
function stkLedger(it, b) {
  let pc = 0, ct = 0;
  const run = b.moves.map(m => { pc += m.pcs; ct = r2(ct + m.ct); return { m, pc, ct }; }).reverse();
  if (!run.length) return '<div class="empty small">No moves yet.</div>';
  const F = isFounder();
  return `<div class="tbl-wrap"><table class="tbl resp stk-ledger"><thead><tr><th>When</th><th>Move</th><th class="num">Pcs</th><th class="num">Ct</th><th class="num">Balance</th><th>Deal</th><th>Vendor</th><th>By</th><th>Note</th>${F ? '<th></th>' : ''}</tr></thead><tbody>
    ${run.map(({ m, pc, ct }) => { const d = m.deal ? dealById(m.deal) : null; const struck = m.reversed && m.kind !== 'reverse'; const why = F ? stkRevCheck(m) : '';
      return `<tr class="${struck ? 'stk-struck' : ''}">
        <td class="l-when"><span class="num">${stkTime(m.at)}</span></td>
        <td class="l-move"><span class="stk-mv ${m.kind}">${MOVE_LABEL[m.kind]}</span>${struck ? ' <span class="badge red">reversed</span>' : ''}${m.due && !m.reversed ? `<div class="xs muted">due ${fdate(m.due)}</div>` : ''}</td>
        <td class="num l-pcs">${stkSg(stkPcs(m.pcs))}<span class="only-m"> pcs</span></td><td class="num l-ct">${it.kind === 'jewellery' ? '—' : stkSg(stkCt(m.ct))}<span class="only-m">${it.kind === 'jewellery' ? '' : ' ct'}</span></td>
        <td class="num l-bal"><span class="only-m muted">bal </span>${stkPcs(pc)} · ${it.kind === 'jewellery' ? '—' : stkCt(ct)}</td>
        <td class="l-deal">${d ? `<a class="stk-a" data-go="#/deal/${d.id}">${esc(stkDealNo(d))}</a>` : '<span class="muted stk-mhi">—</span>'}</td>
        <td class="l-ven small">${m.vendor ? esc(m.vendor) : '<span class="muted stk-mhi">—</span>'}</td>
        <td class="l-by small">${esc(userName(m.by))}</td>
        <td class="l-note small ink2">${esc(m.note || '')}${m.kind === 'reverse' ? '' : m.reversed_note ? `<div class="xs muted">reversed: ${esc(m.reversed_note)}</div>` : ''}</td>
        ${F ? `<td class="l-rev">${m.kind === 'reverse' ? '<span class="xs muted">offsets a move</span>' : `<button class="btn sm ghost ${why ? 'stk-off' : ''}" data-act="${why ? 'stkWhy' : 'stkRev'}" data-m="${m.id}" ${why ? `data-why="${esc(why)}" title="${esc(why)}"` : ''}>${icon('undo', 'sm')}Reverse</button>`}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
function stkActions(it, b) {
  const w = can('stock.write') ? null : 'Your role cannot move stock';
  const A = [['Issue to order', 'stkIssue', 'issue', 'hammer', 'gold'], ['Return', 'stkReturn', 'return', 'undo'], ['Memo out', 'stkMemoOut', 'memo_out', 'truck'], ['Memo back', 'stkMemoBack', 'memo_back', 'download'], ['Mark sold', 'stkSell', 'sale', 'receipt'], ['Adjust', 'stkAdjust', 'adjust', 'scale'], ['Write off', 'stkWriteOff', 'write_off', 'x', 'danger']];
  const editWhy = can('stock.write') ? null : 'Your role cannot edit stock';
  const trashWhy = !isFounder() ? 'Only founders can move a stock item to the Trash' : ['issued', 'memo'].includes(b.status) ? `This item is out of the safe (${STOCK_STATUS[b.status][0]}). Return it first, then delete.` : null;
  return `<div class="stk-acts">${A.map(([n, act, k, ic, cls]) => stkBtn(n, act, { icon: ic, cls: 'sm ' + (cls || ''), off: w || stkCan(it, b, k), data: `data-id="${it.id}"` })).join('')}</div>
    <div class="stk-acts mt-8">${stkBtn('Edit', 'stkEdit', { icon: 'edit', cls: 'sm ghost', off: editWhy, data: `data-id="${it.id}"` })}${stkBtn('Move to Trash', 'stkTrash', { icon: 'x', cls: 'sm ghost danger', off: trashWhy, data: `data-id="${it.id}"` })}</div>
    ${w ? `<div class="xs muted mt-8">${icon('lock', 'sm')} Read-only: your role can see the ledger but not move stock. Founders grant “Stock: add, edit and import” in Settings → Access.</div>` : ''}`;
}
function stkDrawer(id, msg) {
  const it = stkItem(id);
  if (!it) { stkToList(); render(); toast('That stock item is not in the ledger — it may be in the Trash', 'alert'); return; }
  const b = stkB(it), cost = can('stock.cost'), deals = stkDealsOf(it);
  const fields = ['code', 'location', 'origin', ...STK_KF[it.kind].filter(k => k !== 'pcs' && k !== 'ct'), 'vendor', 'purchased_at', ...(cost ? ['invoice_ref', 'cost'] : []), 'list_price'];
  const touched = `<div class="card mt-16"><div class="card-h"><h3>Orders touched</h3><span class="xs muted">${deals.length || 'none'}</span></div>${deals.length ? `<div class="list">${deals.map(d => `<div class="li" data-go="#/deal/${d.id}"><div class="grow"><div class="t">${esc(stkDealNo(d))} · ${esc(dealContact(d).name)}</div><div class="s truncate">${esc(dealTitle(d))}</div></div>${stagePill(d.stage)}${icon('chevR', 'sm')}</div>`).join('')}</div>` : '<div class="card-b small muted">No order has touched this item yet. Issue it to an order, or sell it on one, and the order appears here.</div>'}</div>`;
  const body = `<div class="stk-dr">
    <div class="stk-dr-top">
      <div class="stk-dr-left"><div class="card stk-balc">
        <div class="row between wrap"><div><div class="label">Balance</div><div class="stk-big num">${stkBalTxt(it, b)}</div></div>
          <div class="stk-money">${it.list_price ? `<div><span class="xs muted">List</span><b class="num">${inr(it.list_price)}</b></div>` : ''}${cost ? `<div><span class="xs muted">Cost</span><b class="num">${it.cost ? inr(it.cost) : '—'}</b></div>${it.kind === 'lot' ? `<div><span class="xs muted">Value at cost</span><b class="num">${inr(b.value_cost)}</b></div>` : ''}` : ''}</div></div>
        <div class="stk-state small mt-12">${stkStateLine(it, b)}</div>
        <div class="hr"></div>
        ${stkActions(it, b)}
        <div class="stk-msg mt-12"></div>
      </div>
      ${touched}
      </div>
      <div class="card"><div class="card-h"><h3>${STOCK_KINDS[it.kind]} details</h3>${it.kind === 'jewellery' && it.title ? `<span class="xs muted">${esc(it.title)}</span>` : ''}</div><div class="card-b">
        ${it.img ? `<img class="stk-img" src="${img(it.img, 400)}" alt="">` : ''}
        <dl class="kv stk-kv">${fields.map(k => `<dt>${STK_FL[k]}</dt><dd>${k === 'origin' ? `${stkDash(it.origin)} ${stkOrigin(it.origin)}` : stkShow(it, k)}</dd>`).join('')}</dl>
        ${it.notes ? `<div class="stk-note small mt-12">${esc(it.notes)}</div>` : ''}
        <div class="xs muted mt-12">Added by ${esc(userName(it.created_by))}${it.import_batch ? ` · import #${esc(it.import_batch)}` : ''}${it.updated_by ? ` · last edited by ${esc(userName(it.updated_by))}` : ''}</div>
      </div></div>
    </div>
    <div class="card mt-16"><div class="card-h"><h3>Ledger</h3><span class="xs muted">${b.moves.length} move${b.moves.length === 1 ? '' : 's'} · newest first · running balance</span></div><div class="card-b flush">${stkLedger(it, b)}</div></div>
    <div class="xs muted mt-16">Quantities are never edited here — a correction is an Adjust move, a mistake is reversed by founders. Descriptive fields save from Edit. “Issue to order” is a ledger move only: the order's material-issue stamp comes from <a class="stk-a" data-go="#/demand">Demand → Issue diamonds</a>.</div>
  </div>`;
  openSheet({ title: `<span class="stk-ttl"><span class="mono">${esc(it.code)}</span>${stkKindPill(it.kind)}${stkStatusPill(b.status)}</span>`,
    sub: `${esc(stkDesc(it))} · ${esc(it.location || 'no location')} ${stkOrigin(it.origin)}`, wide: true, body,
    onMount: sh => { sh.classList.add('stk-drawer'); stkHookClose(); if (msg && msg.text) stkSay(sh.querySelector('.stk-balc'), msg.text, msg.tone || 'blue'); } });
}

/* ---------- move modal (one per action) ---------- */
const STK_MOVE = {
  issue: { title: 'Issue to order', btn: 'Issue', order: 'req', vlabel: 'Karigar / vendor it goes to', vhint: 'blank = the order\'s vendor', list: d => STK_ORDER_STAGES.includes(d.stage), ohint: '— confirmed orders in CAD or production, by order no. or client' },
  return: { title: 'Return to the safe', btn: 'Return', vlabel: 'Vendor / with whom' },
  memo_out: { title: 'Out on memo', btn: 'Memo out', order: 'opt', vlabel: 'Vendor / with whom', due: true, list: d => isOpen(d), ohint: '— open deals, by order no. or client' },
  memo_back: { title: 'Back from memo', btn: 'Memo back', order: 'opt', vlabel: 'Vendor / with whom', list: d => isOpen(d), ohint: '— open deals, by order no. or client' },
  sale: { title: 'Mark sold', btn: 'Mark sold', order: 'req', list: d => isOrder(d) && isOpen(d), ohint: '— the order it is sold on, by order no. or client' },
  adjust: { title: 'Adjust the balance', btn: 'Adjust' },
  write_off: { title: 'Write off', btn: 'Write off', danger: true }
};
function stkOrderPicker(cfg, sel) {
  const list = DEALS.filter(d => !d.deleted && cfg.list(d)).sort((a, b) => sIdx(b.stage) - sIdx(a.stage) || (b.order_date || b.enquiry || 0) - (a.order_date || a.enquiry || 0)).slice(0, 30);
  return `<div class="field full"><span class="${cfg.order === 'req' ? 'req' : ''}">Order${cfg.order === 'opt' ? ' <em>(optional)</em>' : ''}</span><small class="stk-hint">${cfg.ohint}</small>
    <input class="input" id="stkOq" placeholder="type an order no. or a name…" autocomplete="off">
    <div class="stk-olist" id="stkOl">${list.length ? list.map(d => `<label class="stk-oc" data-k="${esc([stkDealNo(d), d.id, dealContact(d).name, dealTitle(d), d.product_interest].join(' ').toLowerCase())}"><input type="radio" name="deal" value="${d.id}" data-vendor="${esc(d.vendor || '')}" ${sel === d.id ? 'checked' : ''}><span class="grow"><b class="mono">${esc(stkDealNo(d))}</b> ${esc(dealContact(d).name)}<span class="xs muted"> · ${esc(dealTitle(d))} · ${esc(stg(d.stage).label)}${d.vendor ? ' · ' + esc(d.vendor) : ''}</span></span></label>`).join('') : ''}
    <div class="xs muted stk-onone" ${list.length ? 'hidden' : ''}>${list.length ? 'No open orders match.' : 'No open orders right now.'}</div></div></div>`;
}
function stkMoveOpen(id, kind) {
  const it = stkItem(id); if (!it) return;
  const b = stkB(it), cfg = STK_MOVE[kind];
  const why = stkCan(it, b, kind); if (why) return stkSay(layer().querySelector('.stk-balc'), why);
  STK_MV = { id, kind };
  const lot = it.kind === 'lot';
  let dp = '', dc = '';
  if (lot && ['issue', 'memo_out', 'sale', 'write_off'].includes(kind)) { dp = b.pcs; dc = stkCt(b.ct); }
  if (lot && kind === 'memo_back' && b.memo) { dp = b.memo_pcs; dc = stkCt(b.memo_ct); }
  const vendors = opts('vendors');
  const lastV = b.last && b.last.vendor && ['return', 'memo_back'].includes(kind) ? b.last.vendor : '';
  const body = `<div class="stk-msg"></div>
    <div class="fgrid">
      ${lot ? `<label class="field"><span>${kind === 'adjust' ? 'Pieces <em>(± · a negative takes from the parcel — founders)</em>' : 'Pieces'}</span><input class="input num" name="pcs" type="number" step="1" value="${dp}" placeholder="0"></label>
        <label class="field"><span>Carat${kind === 'adjust' ? ' <em>(±)</em>' : ''}</span><input class="input num" name="ct" type="number" step="0.01" value="${dc}" placeholder="0.00"></label>
        ${['memo_out', 'write_off'].includes(kind) ? '<div class="xs muted full">Blank moves the whole remainder.</div>' : ''}`
      : `<div class="banner full">${icon('gem', 'sm')}<div>Single item — it moves as 1 pc${it.kind === 'jewellery' ? '' : ' · ' + stkCt(it.carat) + ' ct'}.</div></div>`}
      ${cfg.order ? stkOrderPicker(cfg, '') : ''}
      ${cfg.vlabel ? `<label class="field ${cfg.due ? '' : 'full'}"><span>${cfg.vlabel}${cfg.vhint ? ` <em>(${cfg.vhint})</em>` : ''}</span>${stkPick('vendor', 'vendors', lastV, { id: 'stkMvV', placeholder: kind === 'issue' ? '— the order\'s vendor' : '—' })}</label>` : ''}
      ${cfg.due ? `<label class="field"><span class="req">Due back</span><input class="input" type="date" name="due" value="${isoDate(addDays(TODAY, 7))}"></label>` : ''}
      <label class="field full"><span>Note</span><input class="input" name="note" placeholder="packet no., who took it, why"></label>
    </div>
    ${kind === 'issue' ? `<div class="banner blue mt-16">${icon('alert', 'sm')}<div class="small">A ledger move only. The order's “diamonds issued” stamp, which opens casting, is recorded on <a class="stk-a" data-go="#/demand">Demand → Issue diamonds</a>.</div></div>` : ''}
    ${kind === 'write_off' ? `<div class="banner red mt-16">${icon('alert', 'sm')}<div class="small">Written-off stock stays on the ledger with who and why. Founders only.</div></div>` : ''}`;
  stkModal({ title: `${cfg.title} — <span class="mono">${esc(it.code)}</span>`, sub: `${esc(stkDesc(it))} · balance ${stkBalTxt(it, b)}`, body,
    foot: `<button class="btn" data-act="stkBack" data-id="${it.id}">${icon('chevL', 'sm')}Back</button><button class="btn ${cfg.danger ? 'danger' : 'gold'}" data-act="stkMoveGo">${cfg.btn}</button>`,
    onMount: m => {
      const q = m.querySelector('#stkOq'), vs = m.querySelector('#stkMvV');
      if (q) q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); let n = 0; m.querySelectorAll('.stk-oc').forEach(l => { const ok = !t || l.dataset.k.includes(t); l.hidden = !ok; if (ok) n++; }); const none = m.querySelector('.stk-onone'); none.hidden = n > 0; none.textContent = 'No open orders match.'; });
      m.querySelectorAll('input[name=deal]').forEach(r => r.addEventListener('change', () => {
        if (!vs || kind !== 'issue') return; const v = r.dataset.vendor;
        if (v && (!vs.value || vs.dataset.auto)) { if (![...vs.options].some(o => o.value === v)) vs.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)} (not in list)</option>`); vs.value = v; vs.dataset.auto = '1'; }
      }));
      if (vs) vs.addEventListener('change', () => { delete vs.dataset.auto; });
    } });
}
ACTIONS.stkIssue = el => stkMoveOpen(el.dataset.id, 'issue');
ACTIONS.stkReturn = el => stkMoveOpen(el.dataset.id, 'return');
ACTIONS.stkMemoOut = el => stkMoveOpen(el.dataset.id, 'memo_out');
ACTIONS.stkMemoBack = el => stkMoveOpen(el.dataset.id, 'memo_back');
ACTIONS.stkSell = el => stkMoveOpen(el.dataset.id, 'sale');
ACTIONS.stkAdjust = el => stkMoveOpen(el.dataset.id, 'adjust');
ACTIONS.stkWriteOff = el => stkMoveOpen(el.dataset.id, 'write_off');
ACTIONS.stkBack = el => { const id = el.dataset.id; if (parse().name === 'stock') stkGoItem(id); else { closeLayer(); } };
ACTIONS.stkMoveGo = el => {
  const m = el.closest('.modal'); if (!STK_MV) return;
  const it = stkItem(STK_MV.id), kind = STK_MV.kind, cfg = STK_MOVE[kind];
  const val = n => { const e = m.querySelector(`[name=${n}]`); return e ? e.value.trim() : ''; };
  const deal = (m.querySelector('input[name=deal]:checked') || {}).value || '';
  if (cfg.order === 'req' && !deal) return stkSay(el, 'Pick the order first');
  const due = val('due') ? new Date(val('due') + 'T18:00') : null;
  const r = stkMoveDo(it, kind, { pcs: val('pcs'), ct: val('ct'), deal, vendor: val('vendor'), note: val('note'), due });
  if (r.err) return stkSay(el, r.err);
  toast(r.msg, 'check'); STK_MV = null;
  stkGoItem(it.id, { text: r.msg, tone: 'blue' });
};

/* reverse a move (founders) */
ACTIONS.stkRev = el => {
  const m = STOCK_MOVES.find(x => x.id === el.dataset.m); if (!m) return;
  const why = stkRevCheck(m); if (why) return stkSay(el, why);
  const it = stkItem(m.item);
  stkModal({ title: 'Reverse this move?', sub: `${MOVE_LABEL[m.kind]} · ${m.pcs > 0 ? '+' : ''}${m.pcs} pcs${it.kind === 'jewellery' ? '' : ' · ' + stkCt(m.ct) + ' ct'} · ${stkTime(m.at)} · <span class="mono">${esc(it.code)}</span>`,
    body: `<div class="stk-msg"></div><p class="small ink2">An offsetting move is written; nothing is deleted. Refused if it would take the balance below zero.</p>
      <label class="field mt-16"><span class="req">Why — goes on the ledger</span><textarea class="textarea" id="stkRevWhy" placeholder="e.g. entered against the wrong order"></textarea></label>`,
    foot: `<button class="btn" data-act="stkBack" data-id="${it.id}">Cancel</button><button class="btn gold" data-act="stkRevGo" data-m="${m.id}">${icon('undo', 'sm')}Reverse</button>`,
    onMount: md => md.querySelector('#stkRevWhy').focus() });
};
ACTIONS.stkRevGo = el => {
  const m = STOCK_MOVES.find(x => x.id === el.dataset.m); const why = (document.getElementById('stkRevWhy') || {}).value || '';
  if (why.trim().length < 3) return stkSay(el, 'Say why in a few words — it goes on the ledger');
  const r = stkRevDo(m, why.trim()); if (r.err) return stkSay(el, r.err);
  toast(r.msg, 'undo'); stkGoItem(m.item, { text: r.msg, tone: 'blue' });
};

/* move to Trash (founders) */
ACTIONS.stkTrash = el => {
  const it = stkItem(el.dataset.id); if (!it) return;
  stkModal({ title: 'Delete this stock item?', sub: `<span class="mono">${esc(it.code)}</span> · ${esc(stkDesc(it))}`,
    body: `<div class="stk-msg"></div><label class="field"><span class="req">Why? <em>(kept with the record; it goes to Data → Trash and can be restored)</em></span><textarea class="textarea" id="stkTrWhy" placeholder="e.g. typed in twice during the count"></textarea></label>`,
    foot: `<button class="btn" data-act="stkBack" data-id="${it.id}">Cancel</button><button class="btn danger" data-act="stkTrashGo" data-id="${it.id}">${icon('x', 'sm')}Delete</button>` });
};
ACTIONS.stkTrashGo = el => {
  const it = stkItem(el.dataset.id); const why = ((document.getElementById('stkTrWhy') || {}).value || '').trim();
  if (why.length < 3) return stkSay(el, 'A reason of a few words is needed');
  const b = stkB(it);
  if (!isFounder()) return stkSay(el, 'Only founders can move a stock item to the Trash');
  if (['issued', 'memo'].includes(b.status)) return stkSay(el, `This item is out of the safe (${STOCK_STATUS[b.status][0]}). Return it first, then delete.`);
  STOCK_ITEMS.splice(STOCK_ITEMS.indexOf(it), 1);
  TRASH.unshift({ entity: 'stock', label: `${it.code} · ${STOCK_KINDS[it.kind]} · ${[it.shape || it.gem_type || it.item_type, it.carat ? stkCt(it.carat) + ' ct' : ''].filter(Boolean).join(' ')}`, sub: stkDesc(it), at: NOW(), by: viewUser().id, reason: why, record: it, id: it.id });
  stkAudit('trash_delete', 'stock', it.code, why);
  closeLayer(); stkToList(); render(); toast('Moved to the Trash — restore it from Data → Trash if this was wrong', 'check');
};
/* Restore from Data → Trash (Data screen may call this): a stock code must not clash with a live item. */
function stkTrashRestore(entry) {
  const it = entry && entry.record; if (!it) return { err: 'Nothing to restore' };
  if (STOCK_ITEMS.some(x => x.code === it.code)) return { err: `Another live item now uses code ${it.code} — rename that one first.` };
  STOCK_ITEMS.push(it); TRASH.splice(TRASH.indexOf(entry), 1); stkAudit('trash_restore', 'stock', it.code, ''); return { msg: 'Restored' };
}

/* ---------- add / edit form (one form, fields per kind) ---------- */
const STK_CERT = { kind: 'diamond', certified: '1', cert_lab: 'IGI', cert_no: 'LG631104528', shape: 'Round', carat: '1.07', colour: 'F', clarity: 'VS1', quality: 'VS-FG', cut: 'Excellent', polish: 'Excellent', symmetry: 'Excellent', fluorescence: 'None', measurements: '6.58 × 6.61 × 4.05', size_mm: '6.6' };
function stkControl(k, kind, v, ro) {
  const num = (step, ph) => `<input class="input num" name="${k}" type="number" step="${step}" min="0" value="${v == null ? '' : esc(v)}" placeholder="${ph || ''}" ${ro ? 'readonly' : ''}>`;
  const txt = ph => `<input class="input" name="${k}" value="${v == null ? '' : esc(v)}" placeholder="${esc(ph || '')}" ${ro ? 'readonly' : ''}>`;
  switch (k) {
    case 'shape': return stkPick(k, 'diamond_shapes', v);
    case 'quality': return stkPick(k, 'diamond_qualities', v);
    case 'cert_lab': return stkPick(k, 'cert_labs', v);
    case 'clarity': return stkPick(k, 'diamond_clarities', v);
    case 'colour': return kind === 'gem' ? txt('royal blue') : stkPick(k, 'diamond_colours', v);
    case 'gem_type': return stkPick(k, 'gem_types', v);
    case 'item_type': return stkPick(k, 'item_types', v);
    case 'gold_colour': return stkPick(k, 'gold_colours', v);
    case 'size': return stkPick(k, 'sizes', v);
    case 'location': return stkPick(k, 'stock_locations', v);
    case 'origin': return stkPick(k, 'source_channels', v);
    case 'vendor': return stkPick(k, 'vendors', v);
    case 'purity': return stkFixed(k, PURITIES, v);
    case 'cut': case 'polish': case 'symmetry': return stkFixed(k, GRADES, v);
    case 'fluorescence': return stkFixed(k, FLUOR, v);
    case 'certified': return `<select class="select" name="certified"><option value="0" ${+v ? '' : 'selected'}>No</option><option value="1" ${+v ? 'selected' : ''}>Yes</option></select>`;
    case 'carat': return num('0.01', '0.00');
    case 'gross_wt': case 'net_wt': return num('0.01', '0.00');
    case 'pcs': return num('1', '0');
    case 'ct': return num('0.01', '0.00');
    case 'cost': case 'list_price': return `<div class="prefix"><b>₹</b>${num('1', '0')}</div>`;
    case 'purchased_at': return `<input class="input" type="date" name="purchased_at" value="${esc(v || '')}">`;
    case 'notes': return `<textarea class="textarea" name="notes" rows="2" placeholder="anything worth knowing">${esc(v || '')}</textarea>`;
    case 'measurements': return txt('6.45 × 6.48 × 3.98');
    case 'size_mm': return txt(kind === 'lot' ? '1.8' : '6.4');
    case 'sieve': return txt('+2 -6.5');
    case 'stone_summary': return txt('1 × 0.50 ct Round F VS1 + 12 melee');
    case 'cert_no': return txt('e.g. LG620419872');
    case 'tag_no': return txt('e.g. FJ-2210');
    default: return txt('');
  }
}
function stkFormBody() {
  const f = STK_FORM, kind = f.kind, it = f.it, v = f.draft, isNew = !it;
  const moved = it ? stkB(it).moves.filter(m => !(m.kind === 'in' && !m.reversed)).length > 0 : false;
  const b = it ? stkB(it) : null;
  const fld = (k, o = {}) => {
    const req = (STK_REQ[kind] || []).includes(k) || o.req;
    let label = STK_FL[k], ro = false, hint = o.hint || '';
    if (k === 'code') { label = isNew ? 'Code <em>(blank = ST-… minted)</em>' : 'Code'; if (moved) { ro = true; hint = 'The code cannot change once the item has moved'; } }
    if (k === 'carat') { label = 'Carat (fixed)'; if (moved) { ro = true; hint = 'Quantities live in the ledger — record an adjustment instead of editing the opening pieces / carat'; } }
    if ((k === 'pcs' || k === 'ct') && !isNew) label += ' <em>(opening)</em>';
    if (k === 'cost') label = 'Landed cost <em>(whole item / parcel)</em>';
    const ctl = k === 'code' ? `<input class="input mono" name="code" value="${esc(v.code || '')}" placeholder="packet / tag no." ${ro ? 'readonly' : ''}>` : stkControl(k, kind, v[k], ro);
    return `<label class="field ${o.full ? 'full' : ''} ${ro ? 'stk-ro' : ''}" data-f="${k}"><span class="${req ? 'req' : ''}">${label}</span>${ctl}${hint ? `<small class="stk-hint">${hint}</small>` : ''}</label>`;
  };
  const kindFields = STK_KF[kind].filter(k => !(kind === 'lot' && (k === 'pcs' || k === 'ct') && moved));
  return `<div id="stkForm">
    <div class="row wrap between"><div class="seg" role="tablist">${Object.entries(STOCK_KINDS).map(([k, n]) => `<button class="${kind === k ? 'on' : ''} ${!isNew && kind !== k ? 'stk-segoff' : ''}" data-act="${isNew ? 'stkFKind' : 'stkWhy'}" data-k="${k}" ${!isNew ? 'data-why="The kind of an item cannot change — write it off and add it again"' : ''}>${n}</button>`).join('')}</div>
      ${isNew ? '<span class="xs muted">Fields marked <b class="req"></b> are required.</span>' : `<span class="xs muted">${it.code} · ${STOCK_KINDS[kind]}</span>`}</div>
    ${isNew ? `<p class="small ink2 mt-12">The opening quantity becomes the first move in the item's ledger — a single stone or piece is 1 pc; a lot is its pieces and carat. Leave the code blank for an ST-… number, or type the packet / tag number (it must be unique).</p>` : ''}
    ${isNew && kind === 'diamond' ? `<div class="mt-12" id="stkCertBox">${f.read ? stkCertResult() : `<div class="drop stk-drop" data-act="stkCert">${icon('camera', 'lg')}<div class="strong mt-8">Fill from a certificate photo</div><div class="small">Photograph or drop an IGI, GIA, HRD or SGL report; the fields below fill themselves</div></div>`}</div>` : ''}
    <div class="stk-msg mt-12"></div>
    <div class="label mt-16">Where it is</div>
    <div class="stk-fg mt-8">${fld('code')}${fld('location')}${fld('origin')}</div>
    <div class="label mt-24">${STOCK_KINDS[kind]}</div>
    <div class="stk-fg mt-8">${kindFields.map(k => fld(k, { full: k === 'stone_summary' })).join('')}
      ${kind === 'lot' && moved ? `<label class="field stk-ro"><span>Balance <em>(moves change it)</em></span><input class="input num" readonly value="${stkBalTxt(it, b)}"><small class="stk-hint">Quantities live in the ledger — record an adjustment instead of editing the opening pieces / carat</small></label>` : ''}
    </div>
    ${kind === 'lot' && !moved ? '<div class="xs muted mt-8">A lot needs its pieces and / or total carat.</div>' : ''}
    ${kind !== 'jewellery' && kind !== 'lot' ? '<div class="xs muted mt-8">A certificate number sets Certified to Yes.</div>' : ''}
    <div class="label mt-24">Purchase</div>
    <div class="stk-fg mt-8">${fld('vendor')}${fld('purchased_at')}${can('stock.cost') ? fld('invoice_ref') + fld('cost') : ''}${fld('list_price')}${fld('notes', { full: true })}</div>
    ${!can('stock.cost') ? '<div class="xs muted mt-8">Cost and invoice ref. are hidden for your role.</div>' : ''}
  </div>`;
}
function stkCertResult() {
  const dup = STOCK_ITEMS.find(x => x.cert_no === STK_CERT.cert_no);
  return `<div class="card soft"><div class="card-b"><div class="row between wrap"><div class="row">${icon('sparkles', 'sm')}<span class="strong small">Read from IGI report ${STK_CERT.cert_no}</span></div>${badge('Read', 'green')}</div>
    <div class="small ink2 mt-8">Round · 1.07 ct · F VS1 · Excellent cut · 6.58 × 6.61 × 4.05 mm · fluorescence none. Check each field below before saving.</div>
    ${dup ? `<div class="banner red mt-12">${icon('alert', 'sm')}<div class="small">Certificate ${STK_CERT.cert_no} is already on item ${esc(dup.code)}.</div></div>` : `<div class="banner blue mt-12">${icon('shield', 'sm')}<div class="small">No other stone in your ledger carries this number.</div></div>`}
    <button class="btn sm ghost mt-8" data-act="stkCertAgain">${icon('camera', 'sm')}Read another photo</button></div></div>`;
}
function stkFormRead() {
  const root = document.getElementById('stkForm'); const o = {};
  if (!root) return o;
  root.querySelectorAll('[name]').forEach(e => { if (!e.readOnly && !e.disabled) o[e.name] = e.value.trim(); });
  return o;
}
function stkFormPaint() { const b = document.querySelector('.sheet .sh-b'); if (b && STK_FORM) { b.innerHTML = stkFormBody(); stkFormWire(); } }
function stkFormWire() {
  const root = document.getElementById('stkForm'); if (!root) return;
  const cn = root.querySelector('[name=cert_no]'), cf = root.querySelector('[name=certified]');
  if (cn && cf) cn.addEventListener('input', () => { if (cn.value.trim()) cf.value = '1'; });
}
function stkFormOpen(it, kind) {
  STK_FORM = { it: it || null, kind: it ? it.kind : kind, draft: it ? { ...it, pcs: '', ct: '' } : { location: 'Safe', origin: SETTINGS.default_source || 'Walk-in', purchased_at: isoDate(TODAY) }, read: false };
  if (it) { const op = stockBal(it).moves.find(m => m.kind === 'in' && !m.reversed); if (op && it.kind === 'lot') { STK_FORM.draft.pcs = op.pcs; STK_FORM.draft.ct = op.ct; } }
  openSheet({ title: it ? `Edit <span class="mono">${esc(it.code)}</span>` : 'Add to stock', sub: it ? esc(stkDesc(it)) : 'One form; the fields follow the kind of item', wide: true,
    body: stkFormBody(), foot: it ? `<button class="btn" data-act="stkBack" data-id="${it.id}">${icon('chevL', 'sm')}Back</button><button class="btn gold" data-act="stkSave">${icon('check', 'sm')}Save</button>`
      : `<button class="btn" data-act="${stkOnStockRoute() ? 'stkClose' : 'close'}">Cancel</button><button class="btn gold" data-act="stkSave">${icon('plus', 'sm')}Add item</button>`,
    onMount: sh => { sh.classList.add('stk-formsheet'); stkHookClose(); stkFormWire(); } });
}
ACTIONS.stkAdd = () => { if (!can('stock.write')) return stkSay(null, 'Your role cannot edit stock'); stkFormOpen(null, STK.kind !== 'all' ? STK.kind : 'diamond'); };
ACTIONS.stkEdit = el => { const it = stkItem(el.dataset.id); if (it) stkFormOpen(it); };
ACTIONS.stkFKind = el => { if (!STK_FORM) return; Object.assign(STK_FORM.draft, stkFormRead()); STK_FORM.kind = el.dataset.k; stkFormPaint(); };
ACTIONS.stkCert = () => {
  const box = document.getElementById('stkCertBox'); if (!box) return;
  box.innerHTML = `<div class="card"><div class="card-b"><div class="row small">${icon('sparkles', 'sm')}<span>Reading IGI report…</span></div><div class="bar mt-8"><i class="shimmer" style="width:100%"></i></div></div></div>`;
  setTimeout(() => { if (!STK_FORM || !document.getElementById('stkForm')) return; Object.assign(STK_FORM.draft, stkFormRead(), STK_CERT); STK_FORM.kind = 'diamond'; STK_FORM.read = true; stkFormPaint(); }, 900);
};
ACTIONS.stkCertAgain = () => { if (!STK_FORM) return; Object.assign(STK_FORM.draft, stkFormRead()); STK_FORM.read = false; stkFormPaint(); };

const stkPurity = p => { const s = String(p || '').toUpperCase().replace(/\s+/g, '').replace(/KT$|CT$/, 'K'); return s === '925' ? 'S925' : s === 'PT' || s === '950' ? 'PT950' : s; };
function stkPickErr(label, key, v, cur) { const items = opts(key); return v && items.length && !items.includes(v) && v !== cur ? `${label} “${v}” is not in the list — founders add options in Settings → Options.` : null; }
/* Server-side rules of stock/save, in order. Returns an error message or null. */
function stkCheck(rec, kind, it) {
  if (!STOCK_KINDS[kind]) return ['Pick the kind of item — diamond, gem, lot or jewellery', 'kind'];
  if (it && it.kind !== kind) return ['The kind of an item cannot change — write it off and add it again', 'kind'];
  if (kind === 'diamond' || kind === 'lot') if (!rec.shape) return ['Shape is required', 'shape'];
  if (kind === 'gem' && !rec.gem_type) return ['Gem type is required', 'gem_type'];
  if ((kind === 'diamond' || kind === 'gem') && !(+rec.carat > 0)) return ['Carat weight is required (more than 0)', 'carat'];
  if (kind === 'lot' && !it && !(+rec.pcs > 0) && !(+rec.ct > 0)) return ['A lot needs its pieces and / or total carat', 'pcs'];
  if (kind === 'jewellery') {
    if (!rec.item_type) return ['Item type is required', 'item_type'];
    if (!rec.purity) return ['Purity is required', 'purity'];
    if (!PURITIES.includes(rec.purity)) return [`Purity must be one of ${PURITIES.join(', ')}`, 'purity'];
    if (!(+rec.gross_wt > 0)) return ['Gross weight is required (more than 0)', 'gross_wt'];
  }
  for (const [k, key] of [['shape', 'diamond_shapes'], ['quality', 'diamond_qualities'], ['cert_lab', 'cert_labs'], ['gem_type', 'gem_types'], ['item_type', 'item_types'], ['gold_colour', 'gold_colours'], ['size', 'sizes'], ['location', 'stock_locations'], ['origin', 'source_channels'], ['vendor', 'vendors'], ...(kind === 'gem' ? [] : [['colour', 'diamond_colours'], ['clarity', 'diamond_clarities']])]) {
    const e = stkPickErr(OPTIONS[key] ? OPTIONS[key].label.replace(/ \/.*$/, '').replace(/ies$/, 'y').replace(/s$/, '') : STK_FL[k], key, rec[k], it ? it[k] : undefined); if (e) return [e, k];
  }
  const live = STOCK_ITEMS.filter(x => x !== it);
  if (rec.code) {
    if (live.some(x => x.code.toLowerCase() === rec.code.toLowerCase())) return [`Code “${rec.code}” is already used — codes are unique`, 'code'];
    if (stkRemovedCodes().some(c => c.toLowerCase() === rec.code.toLowerCase()) && !(it && it.code === rec.code)) return [`Code “${rec.code}” is already used by a removed item — codes are unique`, 'code'];
  }
  if (rec.cert_no) { const x = live.find(y => y.cert_no && y.cert_no.toLowerCase() === rec.cert_no.toLowerCase()); if (x) return [`Certificate ${rec.cert_no} is already on item ${x.code}`, 'cert_no']; }
  if (rec.tag_no) { const x = live.find(y => y.tag_no && y.tag_no.toLowerCase() === rec.tag_no.toLowerCase()); if (x) return [`Tag ${rec.tag_no} is already on item ${x.code}`, 'tag_no']; }
  return null;
}
function stkMint() {
  const pre = 'ST-' + isoDate(TODAY).replace(/-/g, '') + '-';
  const used = new Set([...STOCK_ITEMS.map(x => x.code), ...stkRemovedCodes()]);
  let n = 1; while (used.has(pre + String(n).padStart(3, '0'))) n++;
  return pre + String(n).padStart(3, '0');
}
function stkClean(v, kind) {
  const rec = {};
  const keys = ['code', 'location', 'origin', ...STK_KF[kind], 'vendor', 'purchased_at', 'invoice_ref', 'cost', 'list_price', 'notes'];
  keys.forEach(k => { if (v[k] !== undefined) rec[k] = typeof v[k] === 'string' ? v[k].trim() : v[k]; });
  ['carat', 'gross_wt', 'net_wt', 'cost', 'list_price', 'pcs', 'ct'].forEach(k => { if (rec[k] !== undefined) rec[k] = rec[k] === '' ? (k === 'list_price' ? null : 0) : +String(rec[k]).replace(/[₹,\s]/g, '') || 0; });
  if (rec.purity !== undefined) rec.purity = stkPurity(rec.purity);
  if (kind === 'diamond' || kind === 'gem') rec.certified = rec.cert_no ? 1 : +(v.certified || 0);
  return rec;
}
function stkCreate(rec, kind, o = {}) {
  const ids = STOCK_ITEMS.concat(STK_HIDDEN, TRASH.map(e => e.record).filter(Boolean)).map(x => +String(x.id).replace(/\D/g, '') || 0);
  const it = Object.assign({ id: 's' + (Math.max(0, ...ids) + 1), kind, origin: '', location: 'Safe', vendor: '', purchased_at: '', invoice_ref: '', cost: 0, list_price: null, certified: 0, notes: '', created_by: viewUser().id, created_at: NOW() }, rec);
  if (!it.code) it.code = kind === 'jewellery' && it.tag_no ? it.tag_no : stkMint();
  const pcs = kind === 'lot' ? Math.round(+rec.pcs || 0) : 1, ct = kind === 'lot' ? r2(+rec.ct || 0) : kind === 'jewellery' ? 0 : r2(+rec.carat || 0);
  delete it.pcs; delete it.ct;
  if (o.batch) it.import_batch = o.batch;
  STOCK_ITEMS.push(it);
  STOCK_MOVES.push({ id: stkId(), item: it.id, kind: 'in', pcs, ct, deal: null, vendor: it.vendor || '', note: o.note || 'Opening', at: NOW(), by: viewUser().id });
  return it;
}
ACTIONS.stkSave = el => {
  const f = STK_FORM; if (!f) return;
  if (!can('stock.write')) return stkSay(el, 'Your role cannot edit stock');
  const v = Object.assign({}, f.draft, stkFormRead()); const kind = f.kind, it = f.it;
  const rec = stkClean(v, kind);
  if (it && it.code !== rec.code && rec.code !== undefined && stkB(it).moves.length > 1) return stkSay(el, 'The code cannot change once the item has moved');
  if (it && !rec.code) rec.code = it.code;
  const err = stkCheck(rec, kind, it);
  document.querySelectorAll('#stkForm .stk-bad').forEach(x => x.classList.remove('stk-bad'));
  if (err) { const fl = document.querySelector(`#stkForm [data-f="${err[1]}"]`); if (fl) fl.classList.add('stk-bad'); return stkSay(el, err[0]); }
  if (!it) {
    if (kind !== 'lot' && kind !== 'jewellery' && !(rec.carat > 0)) return stkSay(el, 'The opening quantity must be more than 0');
    const n = stkCreate(rec, kind);
    stkAudit('stock_add', 'stock', n.code, `${STOCK_KINDS[kind]} · ${stkDesc(n)}`);
    toast('Added ' + n.code, 'check'); STK_FORM = null;
    if (STK.kind !== 'all' && STK.kind !== kind) { STK.kind = kind; stkSess('stk-kind', kind); }
    if (STK.status !== 'all' && STK.status !== 'in_stock') STK.status = 'in_stock';
    stkGoItem(n.id, { text: 'Added ' + n.code + ' — its opening balance is the first move in the ledger', tone: 'blue' });
    return;
  }
  // edit: descriptive fields only; the opening quantity follows only while nothing else has moved
  const op = stockBal(it).moves.find(m => m.kind === 'in' && !m.reversed); const onlyOpening = stkB(it).moves.length <= 1;
  if (onlyOpening && op) { if (kind === 'lot') { if (rec.pcs !== undefined || rec.ct !== undefined) { const p = Math.round(+rec.pcs || 0), c = r2(+rec.ct || 0); if (!p && !c) return stkSay(el, 'The opening quantity must be more than 0'); op.pcs = p; op.ct = c; } } else if (kind !== 'jewellery' && rec.carat) op.ct = r2(rec.carat); }
  else if (kind === 'lot' && (rec.pcs !== undefined)) { delete rec.pcs; delete rec.ct; }
  delete rec.pcs; delete rec.ct;
  Object.assign(it, rec, { updated_at: NOW(), updated_by: viewUser().id });
  stkAudit('stock_edit', 'stock', it.code, 'Descriptive fields saved');
  toast('Saved', 'check'); STK_FORM = null; stkGoItem(it.id, { text: 'Saved', tone: 'blue' });
};

/* ---------- CSV import (wide modal) ---------- */
const STK_TPL_COLS = ['code', 'kind', 'cert_lab', 'cert_no', 'shape', 'carat', 'colour', 'clarity', 'quality', 'cut', 'polish', 'symmetry', 'fluorescence', 'measurements', 'size_mm', 'gem_type', 'pcs', 'sieve', 'item_type', 'purity', 'gold_colour', 'gross_wt', 'net_wt', 'size', 'stone_summary', 'huid', 'tag_no', 'cost', 'list_price', 'vendor', 'origin', 'location', 'purchased_at', 'invoice_ref', 'notes'];
const STK_SYN = { code: ['code', 'packet no', 'packet', 'stock no', 'stock code', 'sku', 'lot no'], kind: ['kind', 'category'], cert_lab: ['cert lab', 'lab', 'certificate lab'], cert_no: ['cert no', 'certificate no', 'certificate', 'report no', 'cert'], shape: ['shape'], carat: ['carat', 'carats', 'ct', 'weight ct', 'carat weight'], colour: ['colour', 'color'], clarity: ['clarity'], quality: ['quality', 'quality band'], cut: ['cut'], polish: ['polish'], symmetry: ['symmetry'], fluorescence: ['fluorescence', 'fluor'], measurements: ['measurements', 'measurement'], size_mm: ['size mm', 'mm', 'size (mm)'], gem_type: ['gem type', 'gem'], pcs: ['pcs', 'pieces', 'qty', 'quantity'], sieve: ['sieve'], item_type: ['item type', 'item', 'type'], purity: ['purity', 'karat', 'kt'], gold_colour: ['gold colour', 'gold color', 'metal colour'], gross_wt: ['gross wt', 'gross weight', 'gross'], net_wt: ['net wt', 'net weight', 'net'], size: ['size', 'ring size'], stone_summary: ['stone summary', 'stones'], huid: ['huid'], tag_no: ['tag no', 'tag'], cost: ['cost', 'landed cost', 'cost price', 'purchase rate'], list_price: ['list price', 'price', 'mrp'], vendor: ['vendor', 'supplier'], origin: ['origin', 'source', 'door'], location: ['location'], purchased_at: ['purchased at', 'purchase date', 'purchased on'], invoice_ref: ['invoice ref', 'invoice', 'invoice no'], notes: ['notes', 'remarks'] };
const STK_SAMPLES = {
  'stock_count_nov.csv': { note: 'Mixed kinds with a kind column · 10 rows', text: `code,kind,cert_lab,cert_no,shape,carat,colour,clarity,quality,pcs,sieve,size_mm,gem_type,item_type,purity,gross_wt,tag_no,cost,list_price,vendor,origin,location
,diamond,IGI,LG640022817,Round,0.71,F,VS1,VS-FG,,,5.7,,,,,,13400,34000,"Shree Manufacturing, Mumbai",Walk-in,Safe
,diamond,IGI,LG598812230,Round,1.01,F,VS1,VS-FG,,,6.4,,,,,,21800,,"Shree Manufacturing, Mumbai",Walk-in,Safe
,diamond,IGI,LG640031190,Oval,0.90,G,VS2,VS-FG,,,7.6x5.4,,,,,,16100,39000,"Shree Manufacturing, Mumbai",Website,Safe
,diamond,,,Princess,0.40,G,VS1,VS-GH,,,4.2,,,,,,6900,,"Shree Manufacturing, Mumbai",Walk-in,Safe
CS-10,gem,GSI,GSI 90417,Oval,1.15,Pigeon blood,,,,,,Ruby,,,,,42000,98000,"Shree Manufacturing, Mumbai",Exhibition,Showcase
ML-17,lot,,,Round,11.25,,,VS-FG,1500,+1.3 -1.8,1.4,,,,,,150000,,"Shree Manufacturing, Mumbai",Walk-in,Safe
ML-14,lot,,,Round,20.00,,,VS-FG,2000,+0.8 -1.3,1.3,,,,,,240000,,"Shree Manufacturing, Mumbai",Walk-in,Safe
FJ-2209,jewellery,,,,,,,,,,,,Bracelet,18K,7.4,FJ-2209,52000,89000,,Walk-in,Showcase
FJ-2210,jewellery,,,,,,,,,,,,Ring,19K,3.1,FJ-2210,21000,36000,,Walk-in,Showcase
,diamond,IGI,LG640077001,Round,,E,VVS2,VVS-EF,,,5.2,,,,,,,,"Shree Manufacturing, Mumbai",Walk-in,Safe` },
  'melee_parcels.csv': { note: 'No kind column — kinds inferred (Pieces + Sieve = lot) · 4 rows', text: `Packet No,Shape,Sieve,Pieces,Carats,Quality,Size mm,Supplier,Cost
ML-18,Round,+2 -2.5,1200,6.00,VS-FG,1.6,"Shree Manufacturing, Mumbai",96000
ML-19,Round,+6.5 -8,600,8.40,VS-GH,2.6,"Shree Manufacturing, Mumbai",118000
ML-20,Baguette,2.5x1.5,80,3.20,VS-FG,2.5x1.5,"Shree Manufacturing, Mumbai",51000
ML-21,Pear,,,,VS-FG,,"Shree Manufacturing, Mumbai",` },
  'showcase_tags.csv': { note: 'Finished pieces by tag; purities written loosely · 4 rows', text: `Tag No,Item,Karat,Gold Colour,Gross Wt,Net Wt,Size,HUID,Stones,Price
FJ-2211,Pendant,14k,Rose,1.9,1.8,Not applicable,P4XK2M,1 Pear 0.25 ct VS-FG,26500
FJ-2207,Ring,14K,Yellow,2.95,2.8,Ring 11,9TQ4MZ,16 Round 0.64 ct VS-FG,42000
FJ-2212,Earrings / Studs,18 KT,White,3.2,3.0,Not applicable,W8N3RT,2 Round 0.80 ct VS-FG,61000
FJ-2213,Anklet,18K,Yellow,6.0,6.0,Free size,,,` }
};
const stkNorm = h => String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function stkGuess(h) { const n = stkNorm(h); for (const [k, syn] of Object.entries(STK_SYN)) if (syn.includes(n) || n === k.replace(/_/g, ' ')) return k; return ''; }
function stkCsvParse(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [',', '\t', ';'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}
function stkInfer(r) {
  if (r.item_type || r.purity || +r.gross_wt) return ['jewellery', 'item type / purity / gross wt'];
  if (r.gem_type) return ['gem', 'gem type'];
  if (r.sieve || +r.pcs > 1) return ['lot', 'pieces / sieve'];
  if (+r.carat || r.cert_no) return ['diamond', 'carat / certificate'];
  return null;
}
function stkImpRun() {
  const I = STK_IMP; if (!I || !I.rows) return;
  const seen = { code: new Set(), cert: new Set(), tag: new Set() };
  I.out = I.rows.map((cells, n) => {
    const raw = {}; I.map.forEach((k, i) => { if (k && cells[i] != null && String(cells[i]).trim() !== '') raw[k] = String(cells[i]).trim(); });
    let kind = raw.kind ? stkNorm(raw.kind).replace(/s$/, '').replace('jewelry', 'jewellery').replace('stone', 'gem') : '', how = raw.kind ? 'kind column' : '';
    if (!kind) { const g = stkInfer(raw); if (g) { kind = g[0]; how = 'inferred from ' + g[1]; } else { kind = I.kind; how = 'picked kind'; } }
    const res = { n: n + 2, raw, kind, how };
    if (!STOCK_KINDS[kind]) return Object.assign(res, { st: 'bad', why: 'Pick the kind of item — diamond, gem, lot or jewellery' });
    if (kind === 'lot' && raw.carat && !raw.ct) raw.ct = raw.carat;
    if (kind === 'jewellery' && !raw.code && raw.tag_no) raw.code = raw.tag_no;
    const rec = stkClean(raw, kind); res.rec = rec;
    const code = (rec.code || '').toLowerCase(), cert = (rec.cert_no || '').toLowerCase(), tag = (rec.tag_no || '').toLowerCase();
    if (code && (STOCK_ITEMS.some(x => x.code.toLowerCase() === code) || stkRemovedCodes().some(c => c.toLowerCase() === code))) return Object.assign(res, { st: 'dup', why: `code ${rec.code} is already in the ledger` });
    if (cert) { const x = STOCK_ITEMS.find(y => (y.cert_no || '').toLowerCase() === cert); if (x) return Object.assign(res, { st: 'dup', why: `certificate ${rec.cert_no} is already on ${x.code}` }); }
    if (tag) { const x = STOCK_ITEMS.find(y => (y.tag_no || '').toLowerCase() === tag); if (x) return Object.assign(res, { st: 'dup', why: `tag ${rec.tag_no} is already on ${x.code}` }); }
    if ((code && seen.code.has(code)) || (cert && seen.cert.has(cert)) || (tag && seen.tag.has(tag))) return Object.assign(res, { st: 'dup', why: 'repeated earlier in this file' });
    const e = stkCheck(rec, kind, null); if (e) return Object.assign(res, { st: 'bad', why: e[0] });
    if (code) seen.code.add(code); if (cert) seen.cert.add(cert); if (tag) seen.tag.add(tag);
    return Object.assign(res, { st: 'new' });
  });
}
function stkImpBody() {
  const I = STK_IMP;
  const pickKind = `<div class="seg">${Object.entries(STOCK_KINDS).map(([k, n]) => `<button class="${I.kind === k ? 'on' : ''}" data-act="stkImpKind" data-k="${k}">${n}</button>`).join('')}</div>`;
  let pv = '';
  if (I.out) {
    const c = s => I.out.filter(r => r.st === s).length, nNew = c('new'), nDup = c('dup'), nBad = c('bad');
    const fields = ['', ...STK_TPL_COLS];
    pv = `<div class="banner ${nBad ? '' : 'blue'} mt-16">${icon(nBad ? 'alert' : 'check', 'sm')}<div><b>${I.out.length} rows.</b> ${nNew} new · ${nDup} already in the ledger (skipped) · ${nBad} invalid (skipped).</div></div>
      <details class="stk-map mt-12"><summary class="small strong">Column mapping <span class="muted">(adjust if a column was guessed wrong)</span></summary>
        <div class="stk-mapg mt-8">${I.header.map((h, i) => `<label class="field"><span class="xs">${esc(h)}</span><select class="select" data-stk-map="${i}">${fields.map(k => `<option value="${k}" ${I.map[i] === k ? 'selected' : ''}>${k || '(ignore)'}</option>`).join('')}</select></label>`).join('')}</div></details>
      <div class="tbl-wrap mt-12 stk-pvw"><table class="tbl stk-static stk-pv"><thead><tr><th>Row</th><th>Code</th><th>Kind</th><th>Cert no.</th><th>Shape / type</th><th class="num">Carat</th><th class="num">Pcs</th><th>Quality</th><th>Vendor</th><th>Result</th></tr></thead><tbody>
        ${I.out.slice(0, 15).map(r => { const x = r.rec || stkClean(r.raw, STOCK_KINDS[r.kind] ? r.kind : 'diamond'); return `<tr class="stk-pv-${r.st}"><td class="num muted">${r.n}</td><td class="mono nw">${esc(x.code || (r.st === 'new' ? 'ST-… minted' : '—'))}</td><td>${STOCK_KINDS[r.kind] ? stkKindPill(r.kind) : esc(r.kind)}<div class="xs muted">${esc(r.how)}</div></td><td class="mono">${esc(x.cert_no || '—')}</td><td>${esc(x.shape || x.gem_type || x.item_type || '—')}${x.purity ? ' · ' + esc(x.purity) : ''}</td><td class="num">${x.carat ? stkCt(x.carat) : x.ct ? stkCt(x.ct) : x.gross_wt ? stkNum(x.gross_wt) + ' g' : '—'}</td><td class="num">${x.pcs ? stkPcs(x.pcs) : r.kind === 'lot' ? '—' : '1'}</td><td>${esc(x.quality || '—')}</td><td class="small">${esc(x.vendor || '—')}</td>
          <td>${r.st === 'new' ? badge('New', 'green') : r.st === 'dup' ? badge('In the ledger', 'amber') : badge('Invalid', 'red')}${r.why ? `<div class="xs muted stk-why">${esc(r.why)}</div>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      ${I.out.length > 15 ? `<div class="xs muted mt-8">First 15 of ${I.out.length} rows shown.</div>` : ''}
      <div class="row wrap mt-16">${stkBtn(`Import ${nNew} item${nNew === 1 ? '' : 's'}`, 'stkImpGo', { icon: 'upload', cls: 'gold', off: nNew ? null : 'Nothing new to import in this file' })}<span class="xs muted grow">One transaction — it all lands or nothing does. Undo afterwards on Data → Import history, or below.</span></div>`;
  }
  const recent = IMPORTS.filter(x => x.kind === 'stock').slice(0, 5);
  return `<p class="small ink2">One row per item. A <span class="mono">kind</span> column lets kinds share a file; otherwise the kind is inferred from the columns, then the kind picked here applies. Columns are recognised by name (code / packet no · kind · lab · cert no · shape · carat · colour · clarity · quality · pcs · sieve · item type · purity · gross wt · cost · vendor · origin · location …). A code, certificate or tag already in the ledger is skipped.
      <button class="stk-link" data-act="stkTpl">${icon('download', 'sm')}Download the template</button></p>
    <div id="stkTplBox"></div>
    <div class="stk-imp-grid mt-16">
      <div class="field"><span>Kind for rows without one</span>${pickKind}</div>
      <div class="field"><span>File <em>(.csv)</em></span><input class="input stk-file" type="file" accept=".csv,text/csv" id="stkFile"><small class="stk-hint">${I.file ? `Chosen: <b>${esc(I.file)}</b>` : 'Or pick one of the sample files below.'}</small></div>
    </div>
    <div class="label mt-16">Sample files</div>
    <div class="stk-samples mt-8">${Object.entries(STK_SAMPLES).map(([n, s]) => `<div class="pick ${I.file === n ? 'on' : ''}" data-act="stkImpFile" data-f="${n}">${icon('doc')}<div class="grow"><div class="strong small mono">${n}</div><div class="xs muted">${s.note}</div></div>${I.file === n ? icon('check', 'sm') : ''}</div>`).join('')}</div>
    <div class="row mt-16"><button class="btn gold" data-act="stkImpPreview">${icon('eye', 'sm')}Preview</button><button class="btn" data-act="close">Cancel</button></div>
    <div class="stk-msg mt-12"></div>
    ${pv}
    <div class="label mt-24">Recent stock imports</div>
    <div class="card mt-8">${recent.length ? `<div class="tbl-wrap"><table class="tbl stk-static"><thead><tr><th>#</th><th>When</th><th>File</th><th class="num">Created</th><th class="num">Skipped</th><th>By</th><th></th></tr></thead><tbody>${recent.map(x => `<tr><td class="mono">${esc(x.id)}</td><td class="small">${stkTime(x.at)}</td><td class="small mono">${esc(x.file)}</td><td class="num">${x.created}</td><td class="num">${x.skipped}</td><td class="small">${esc(userName(x.by))}</td><td>${x.undone ? '<span class="badge">undone</span>' : stkBtn('Undo', 'stkImpUndo', { cls: 'sm ghost danger', icon: 'undo', data: `data-id="${x.id}"` })}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card-b small muted">No stock imports yet.</div>'}</div>`;
}
function stkImpPaint() { const b = layer().querySelector('.stk-mb'); if (b && STK_IMP) { const y = b.scrollTop; b.innerHTML = stkImpBody(); stkImpWire(); b.scrollTop = y; } }
function stkImpWire() {
  const m = layer().querySelector('.modal'); if (!m) return;
  const fi = m.querySelector('#stkFile');
  if (fi) fi.addEventListener('change', () => {
    const f = fi.files && fi.files[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) return stkSay(fi, 'File over 20 MB — split it.');
    const rd = new FileReader(); rd.onload = () => { STK_IMP.file = f.name; STK_IMP.text = String(rd.result); STK_IMP.out = null; STK_IMP.rows = null; stkImpPaint(); }; rd.readAsText(f);
  });
  m.querySelectorAll('[data-stk-map]').forEach(s => s.addEventListener('change', () => { STK_IMP.map[+s.dataset.stkMap] = s.value; stkImpRun(); stkImpPaint(); const d = layer().querySelector('.stk-map'); if (d) d.open = true; }));
}
ACTIONS.stkImport = () => {
  if (!can('stock.write')) return stkSay(null, 'Your role cannot import stock');
  STK_IMP = { kind: STK.kind !== 'all' ? STK.kind : 'diamond', file: '', text: '', rows: null, out: null };
  stkModal({ title: 'Import stock from CSV', sub: 'Preview first: nothing is written until you import', wide: true, body: stkImpBody(), onMount: stkImpWire });
};
ACTIONS.stkImpKind = el => { STK_IMP.kind = el.dataset.k; if (STK_IMP.rows) stkImpRun(); stkImpPaint(); };
ACTIONS.stkImpFile = el => { STK_IMP.file = el.dataset.f; STK_IMP.text = STK_SAMPLES[el.dataset.f].text; STK_IMP.rows = null; STK_IMP.out = null; stkImpPaint(); };
ACTIONS.stkTpl = () => {
  const box = document.getElementById('stkTplBox'); if (!box) return;
  const ex = { diamond: { code: '', kind: 'diamond', cert_lab: 'IGI', cert_no: 'LG620000001', shape: 'Round', carat: '0.50', colour: 'F', clarity: 'VS1', quality: 'VS-FG', cut: 'Excellent', polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None', measurements: '5.10-5.13x3.15', size_mm: '5.1', vendor: 'Shree Manufacturing, Mumbai', cost: '9200', location: 'Safe', origin: 'Walk-in', purchased_at: '2026-11-01' },
    gem: { code: 'CS-11', kind: 'gem', cert_lab: 'GSI', cert_no: 'GSI 90001', shape: 'Oval', carat: '1.20', colour: 'royal blue', gem_type: 'Sapphire', measurements: '7.1x5.2', cost: '30000', location: 'Safe' },
    lot: { code: 'ML-22', kind: 'lot', shape: 'Round', carat: '6.00', quality: 'VS-FG', pcs: '1200', sieve: '+2 -2.5', size_mm: '1.6', cost: '96000', location: 'Safe' },
    jewellery: { code: '', kind: 'jewellery', item_type: 'Ring', purity: '18K', gold_colour: 'White', gross_wt: '3.4', net_wt: '3.2', size: 'Ring 12', stone_summary: '1 Round 0.50 ct VS-FG', huid: 'AB12CD', tag_no: 'FJ-2300', list_price: '58000', location: 'Showcase' } };
  box.innerHTML = `<div class="card soft mt-12"><div class="card-b"><div class="row between wrap"><span class="small strong mono">stock_template.csv</span><span class="xs muted">${STK_TPL_COLS.length} columns · one example row per kind</span></div>
    <div class="tbl-wrap mt-8"><table class="tbl stk-static stk-tpl"><thead><tr>${STK_TPL_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${Object.values(ex).map(r => `<tr>${STK_TPL_COLS.map(c => `<td class="xs">${esc(r[c] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></div>`;
  toast('stock_template.csv downloaded', 'download');
};
ACTIONS.stkImpPreview = el => {
  const I = STK_IMP; if (!I) return;
  if (!I.text) return stkSay(el, 'Choose a file');
  const rows = stkCsvParse(I.text);
  const hi = rows.findIndex(r => r.filter(c => stkGuess(c)).length >= 2);
  if (hi < 0) { I.out = null; return stkSay(el, 'Could not find a header row.'); }
  I.header = rows[hi]; I.map = I.header.map(stkGuess); I.rows = rows.slice(hi + 1);
  if (!I.rows.length) return stkSay(el, 'No rows under the header — nothing to import.');
  stkImpRun(); stkImpPaint();
  const pv = layer().querySelector('.stk-pvw'); if (pv) pv.scrollIntoView({ block: 'nearest' });
};
ACTIONS.stkImpGo = el => {
  const I = STK_IMP; if (!I || !I.out) return stkSay(el, 'Preview first');
  if (!can('stock.write')) return stkSay(el, 'Your role cannot import stock');
  const fresh = I.out.filter(r => r.st === 'new'); if (!fresh.length) return stkSay(el, 'Nothing new to import in this file');
  const id = 'b' + (Math.max(14, ...IMPORTS.map(x => +String(x.id).replace(/\D/g, '') || 0)) + 1);
  const made = fresh.map(r => stkCreate(Object.assign({}, r.rec), r.kind, { batch: id, note: 'Opening (import ' + I.file + ')' }));
  const nDup = I.out.filter(r => r.st === 'dup').length, nBad = I.out.filter(r => r.st === 'bad').length;
  IMPORTS.unshift({ id, kind: 'stock', file: I.file, total: I.out.length, created: made.length, updated: 0, skipped: nDup + nBad, at: NOW(), by: viewUser().id, undo: true, items: made.map(x => x.id) });
  stkAudit('import', 'import', id, `Stock CSV: ${made.length} new, ${nDup} already in the ledger, ${nBad} invalid`);
  BULK_EVENTS.unshift({ at: NOW(), who: viewUser().id, what: `Imported stock CSV (${made.length} items)` });
  STK_IMP = { kind: I.kind, file: '', text: '', rows: null, out: null };
  if (STK.status !== 'all') STK.status = 'in_stock';
  STK.kind = 'all'; stkSess('stk-kind', 'all');
  toast(`Imported: ${made.length} created · ${nDup} skipped · ${nBad} invalid`, 'upload');
  stkImpPaint(); render();
  stkSay(layer().querySelector('.stk-mb'), `Imported ${made.length} items as batch #${id}: ${made.map(x => x.code).join(', ')}. Undo it below while none of them has moved.`, 'blue');
};
/* Undo a stock import: refused once any item from it has moved. The Data screen can call this too. */
function stkUndoImport(batchId) {
  const x = IMPORTS.find(i => i.id === batchId); if (!x) return { err: 'Import not found' };
  if (x.undone) return { err: 'That import is already undone' };
  if (!x.items) return { err: 'Cannot undo: stock items from this import have moved since. Reverse those moves first, or write the items off.' };
  const items = x.items.map(id => STOCK_ITEMS.find(s => s.id === id)).filter(Boolean);
  const moved = items.filter(it => stkB(it).moves.length > 1);
  if (moved.length) return { err: `Cannot undo: stock items from this import have moved since — ${moved.map(i => i.code).join(', ')}. Reverse those moves first, or write the items off.` };
  items.forEach(it => { STOCK_ITEMS.splice(STOCK_ITEMS.indexOf(it), 1); it.deleted_by_import = x.id; STK_HIDDEN.push(it); });
  x.undone = true; x.undo = false;
  stkAudit('import_undo', 'import', x.id, `${items.length} stock items hidden`);
  return { msg: 'Undone' };
}
ACTIONS.stkImpUndo = el => {
  const r = stkUndoImport(el.dataset.id);
  if (r.err) return stkSay(el, r.err);
  toast(r.msg + ` — import #${el.dataset.id}`, 'undo'); stkImpPaint(); render();
  stkSay(layer().querySelector('.stk-mb'), `Import #${el.dataset.id} undone: its items are hidden (never deleted) and their codes stay reserved.`, 'blue');
};

/* ---------- exports (founders, or export.all; every export is audited) ---------- */
function stkExportRows(zoho) {
  const cost = can('stock.cost');
  if (zoho) return STOCK_ITEMS.map(it => ({ it, b: stkB(it) })).filter(x => ['in_stock', 'issued', 'memo'].includes(x.b.status)).map(({ it, b }) => ({
    'Item Name': stkDesc(it), SKU: it.code, Unit: it.kind === 'lot' ? 'ct' : 'pcs', Rate: it.list_price || '', ...(cost ? { 'Purchase Rate': it.cost || '' } : {}), 'Opening Stock': it.kind === 'lot' ? stkCt(b.ct) : b.pcs,
    Vendor: it.vendor || '', Kind: STOCK_KINDS[it.kind], Pipeline_Status: STOCK_STATUS[b.status][0], Location: it.location || '', Origin: it.origin || '', Cert_No: it.cert_no || '', Tag_No: it.tag_no || '' }));
  return STOCK_ITEMS.map(it => { const b = stkB(it); const r = {}; ['code', 'kind'].forEach(k => { r[k] = it[k]; }); r.status = b.status;
    ['origin', 'location', 'vendor', 'purchased_at', ...(cost ? ['invoice_ref', 'cost'] : []), 'list_price', 'certified', 'cert_lab', 'cert_no', 'shape', 'carat', 'colour', 'clarity', 'quality', 'cut', 'polish', 'symmetry', 'fluorescence', 'measurements', 'size_mm', 'gem_type', 'sieve', 'item_type', 'purity', 'gold_colour', 'gross_wt', 'net_wt', 'size', 'stone_summary', 'huid', 'tag_no', 'notes'].forEach(k => { r[k] = it[k] == null ? '' : it[k]; });
    r.pcs_bal = b.pcs; r.ct_bal = stkCt(b.ct); if (cost) r.value_cost = b.value_cost; r.last_move_at = b.last_move_at ? isoDate(b.last_move_at) : ''; r.import_batch = it.import_batch || ''; r.created_by = userName(it.created_by); return r; });
}
ACTIONS.stkExport = el => {
  const k = el.dataset.k;
  if (!can('export.all')) return stkSay(el, 'Exports need the “Export the full database” permission — ask a founder');
  const zoho = k === 'zoho', rows = stkExportRows(zoho);
  const file = k === 'xlsx' ? `MARQA_Pipeline_${isoDate(TODAY)}.xlsx` : zoho ? '13_Stock_Items.csv' : 'Stock_Items.csv';
  const sheets = k === 'xlsx' ? [['README', 1], ['Contacts', CONTACTS.length], ['Deals', DEALS.length], ['Deal_Lines', DEALS.reduce((s, d) => s + (d.lines || []).length, 0)], ['Payments', DEALS.reduce((s, d) => s + (d.payments || []).length, 0)], ['QC_Checks', DEALS.reduce((s, d) => s + (d.qc || []).length, 0)], ['Activities', DEALS.reduce((s, d) => s + (d.activities || []).length, 0)], ['Templates', TEMPLATES.length], ['Imports', IMPORTS.length], ['Stock_Items', STOCK_ITEMS.length], ['Stock_Moves', STOCK_MOVES.length]] : null;
  stkAudit(k === 'xlsx' ? 'export_xlsx' : 'export_csv', 'export', zoho ? 'zoho_stock' : k === 'xlsx' ? 'all' : 'stock_items', k === 'xlsx' ? `Full database, ${sheets.length} sheets` : `${file}, ${rows.length} rows`);
  BULK_EVENTS.unshift({ at: NOW(), who: viewUser().id, what: k === 'xlsx' ? 'Exported the full database (Excel)' : `Exported ${file} (${rows.length} rows)` });
  const cols = Object.keys(rows[0] || {});
  openSheet({ title: 'Export ready', sub: `<span class="mono">${file}</span> · logged in the audit as ${esc(viewUser().name)}`, wide: true,
    body: `${sheets ? `<div class="label">Sheets</div><div class="card mt-8"><div class="card-b"><dl class="kv">${sheets.map(([n, c]) => `<dt>${n}</dt><dd class="num">${n === 'README' ? 'what each sheet holds' : c + ' rows'}</dd>`).join('')}</dl></div></div><div class="label mt-24">Stock_Items (first rows)</div>` : `<div class="small ink2">${zoho ? 'Items still ours (in safe, issued, on memo), in Zoho Inventory\'s item-import columns: SKU is the stock code, Opening Stock is the current balance.' : 'Every descriptive field plus the pcs / ct balance, value at cost, last move, batch and who created it.'} ${rows.length} rows · ${cols.length} columns.</div>`}
      <div class="card mt-8"><div class="tbl-wrap"><table class="tbl stk-static stk-tpl"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 8).map(r => `<tr>${cols.map(c => `<td class="xs">${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      ${rows.length > 8 ? `<div class="xs muted mt-8">First 8 of ${rows.length} rows shown.</div>` : ''}
      ${!can('stock.cost') ? '<div class="xs muted mt-8">Cost columns are left out for your role.</div>' : ''}`,
    foot: `<button class="btn" data-act="close">Close</button><button class="btn primary" data-act="stkExportSave" data-f="${file}">${icon('download', 'sm')}Download again</button>`,
    onMount: () => stkHookClose() });
  toast(`${file} exported — logged in the audit`, 'download');
};
ACTIONS.stkExportSave = el => toast(`${el.dataset.f} downloaded`, 'download');

/* ======================= Demand panel ======================= */
const demSkip = d => (TYPE_SKIPS[d.type] || []).includes('CAD In Progress');
const demWt = d => +(d.est_weight || d.gold_wt || 0);
const demNeed = d => ({ pcs: (d.lines || []).reduce((s, l) => s + (+l.pcs || 0), 0), ct: r2((d.lines || []).reduce((s, l) => s + (+l.ct || 0), 0)) });
const demListed = () => DEALS.filter(d => STK_ORDER_STAGES.includes(d.stage) && !d.deleted);
const demLine = l => `${l.pcs} × ${esc(l.shape)}${l.size_mm ? ' ' + esc(l.size_mm) + ' mm' : ''} · ${stkCt(l.ct)} ct · ${esc(l.quality || '—')}${l.setting ? ' · ' + esc(l.setting) : ''}`;
function demCentre(d) { const c = (d.lines || []).filter(l => +l.pcs === 1).sort((a, b) => b.ct - a.ct)[0]; return c ? `${esc(c.shape)} ${stkCt(c.ct)} ct ${esc(c.quality || '')}${c.cert_no ? ' · cert <span class="mono">' + esc(c.cert_no) + '</span>' : ''}` : ''; }
const demCodeLink = code => { const it = STOCK_ITEMS.find(x => x.code === code); return it && can('stock') ? `<a class="stk-a mono" data-go="#/stock/${it.id}">${esc(code)}</a>` : `<span class="mono">${esc(code)}</span>`; };
function demRows() {
  let ds = demListed();
  if (DEM.vendor) ds = ds.filter(d => (d.vendor || '') === DEM.vendor);
  if (DEM.mode === 'awaiting') ds = ds.filter(d => !demSkip(d) && (!d.gold_issued_at || !d.diamonds_issued_at));
  return ds.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (a.promised_date || 9e15) - (b.promised_date || 9e15));
}
function demTiles() {
  let ds = demListed(); if (DEM.vendor) ds = ds.filter(d => (d.vendor || '') === DEM.vendor);
  const need = ds.filter(d => !demSkip(d));
  const am = need.filter(d => !d.gold_issued_at), ad = need.filter(d => !d.diamonds_issued_at);
  const byP = {}; am.forEach(d => { byP[d.purity] = r2((byP[d.purity] || 0) + demWt(d)); });
  const dn = ad.reduce((s, d) => { const n = demNeed(d); return { pcs: s.pcs + n.pcs, ct: r2(s.ct + n.ct) }; }, { pcs: 0, ct: 0 });
  const t = [['Orders awaiting metal', am.length, Object.keys(byP).length ? Object.entries(byP).map(([p, g]) => `${p} ${stkNum(g)} g`).join(' · ') : 'nothing pending'],
    ['Orders awaiting diamonds', ad.length, ad.length ? `${stkPcs(dn.pcs)} pcs · ${stkCt(dn.ct)} ct` : 'nothing pending'],
    ['Orders listed', ds.length, 'Order Confirmed → QC'], ['Urgent', ds.filter(d => d.urgent).length, 'flagged on the order sheet']];
  return `<div class="stk-tiles dem-tiles">${t.map(([k, v, s], i) => `<div class="card kpi"><div class="k">${k}</div><div class="v num">${v}</div><div class="d">${s}</div></div>`).join('')}</div>`;
}
function demIssued(d, w) {
  if (demSkip(d)) return `<span class="badge">not needed (${esc(d.type)})</span>`;
  const F = isFounder();
  const rev = `<button class="stk-link ${F ? '' : 'stk-off'}" data-act="${F ? 'demRev' : 'stkWhy'}" data-id="${d.id}" data-w="${w}" ${F ? '' : 'data-why="Only founders can reverse a material issue"'}>${icon('undo', 'sm')}reverse</button>`;
  if (w === 'metal' && d.gold_issued_at) return `<span class="badge green">✓ ${stkNum(d.gold_issued_wt)} g</span><div class="xs muted stk-mt4">${stkTime(d.gold_issued_at)} · ${esc(userName(d.gold_issued_by))}</div>${rev}`;
  if (w === 'dia' && d.diamonds_issued_at) return `<span class="badge green">✓ ${stkPcsU(d.diamonds_issued_pcs)} · ${stkCt(d.diamonds_issued_ct)} ct</span>${(d.stock_issued_codes || []).length ? `<div class="xs stk-mt4 dem-codes">${d.stock_issued_codes.map(demCodeLink).join(' ')}</div>` : ''}<div class="xs muted stk-mt4">${stkTime(d.diamonds_issued_at)} · ${esc(userName(d.diamonds_issued_by))}</div>${rev}`;
  return `<button class="btn gold sm" data-act="${w === 'metal' ? 'demMetal' : 'demDia'}" data-id="${d.id}">${icon(w === 'metal' ? 'scale' : 'gem', 'sm')}Issue ${w === 'metal' ? 'metal' : 'diamonds'}</button>`;
}
function demTable(rows) {
  if (!rows.length) return `<div class="empty">${icon('check', 'lg')}<div class="strong mt-8" style="color:var(--ink)">Nothing here — every listed order has its material, or there are no confirmed orders in CAD or production.</div>${DEM.mode === 'awaiting' ? `<button class="btn sm mt-16" data-act="demMode" data-m="all">Show all open orders</button>` : ''}</div>`;
  return `<div class="tbl-wrap"><table class="tbl resp stk-static dem-tbl"><thead><tr><th>Order</th><th>Vendor · stage</th><th>Metal</th><th>Diamond pieces</th><th>Metal issued</th><th>Diamonds issued</th></tr></thead><tbody>
    ${rows.map(d => { const n = demNeed(d); const c = demCentre(d); return `<tr class="${d.urgent ? 'dem-urgent' : ''}">
      <td class="d-o"><div class="row wrap gap-6"><a class="stk-a dem-ono" data-go="#/deal/${d.id}">${esc(d.order_no || d.id)}</a>${d.urgent ? '<span class="badge red">URGENT</span>' : ''}${typePill(d)}</div>
        ${!d.order_no ? '<div class="xs dem-amber">ERP order no. pending</div>' : ''}<div class="xs muted">${esc(dealContact(d).name)} · ${esc(dealTitle(d))}</div>${!d.pd_sheet_at && !demSkip(d) ? '<div class="xs dem-amber">order sheet not issued</div>' : ''}</td>
      <td class="d-v"><div class="small">${d.vendor ? esc(d.vendor) : '<span class="muted">—</span>'}</div><div class="xs muted">${esc(stg(d.stage).label)}${d.promised_date ? ` · due ${fdate(d.promised_date)}` : ''}</div></td>
      <td class="d-m"><div class="strong">${esc(d.purity)}${d.gold_colour && !['S925', 'PT950'].includes(d.purity) ? ' <span class="muted" style="font-weight:500">' + esc(d.gold_colour) + '</span>' : ''}</div><div class="small dem-wt">${demWt(d) ? stkNum(demWt(d)) + ' g' : '—'}</div>${d.size && d.size !== 'Not applicable' ? `<div class="xs muted">${esc(d.size)}</div>` : ''}</td>
      <td class="d-d small">${(d.lines || []).length ? (d.lines || []).map(l => `<div>${demLine(l)}</div>`).join('') + (c ? `<div class="xs muted">centre: ${c}</div>` : '') + `<div class="xs strong stk-mt4">${stkPcsU(n.pcs)} · ${stkCt(n.ct)} ct total</div>` : '<span class="muted">no stone lines</span>'}</td>
      <td class="d-mi">${demIssued(d, 'metal')}</td><td class="d-di">${demIssued(d, 'dia')}</td></tr>`; }).join('')}</tbody></table></div>`;
}
SCREENS.demand = {
  title: 'Demand', nav: 'demand',
  render() {
    if (!can('demand')) return pageHead('Demand', 'Material requirement and issue') + `<div class="card"><div class="empty">${icon('lock', 'lg')}<div class="strong mt-8" style="color:var(--ink)">Your role cannot open the demand panel.</div><div class="small mt-8">Founders grant it in Settings → Access.</div><button class="btn sm mt-16" data-go="#/home">${icon('home', 'sm')}Back to the dashboard</button></div></div>`;
    const vendors = [...new Set([...opts('vendors'), ...demListed().map(d => d.vendor).filter(Boolean)])];
    const rows = demRows();
    return `${pageHead('Demand', 'Metal and diamond pieces each confirmed order needs — and what has been issued to the karigar',
      `<select class="select dem-vsel" id="demVendor" aria-label="Vendor"><option value="">All vendors</option>${vendors.map(v => `<option ${DEM.vendor === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
       <div class="seg">${[['awaiting', 'Awaiting issue'], ['all', 'All open orders']].map(([k, n]) => `<button class="${DEM.mode === k ? 'on' : ''}" data-act="demMode" data-m="${k}">${n}</button>`).join('')}</div>`)}
      ${demTiles()}
      <div class="stk-msg"></div>
      <div class="card stk-card">${demTable(rows)}</div>
      <div class="stk-foot xs muted">Quantities come off the order sheet: metal from the estimated weight, stones from the quote's lines. Record the actual issue; a difference is fine and stays on the record. Founders can reverse an entry. Stock, Repair and Buyback orders need no issue.</div>`;
  },
  mount(root) { const v = root.querySelector('#demVendor'); if (v) v.addEventListener('change', () => { DEM.vendor = v.value; render(); }); }
};
ACTIONS.demMode = el => { DEM.mode = el.dataset.m; render(); };
const demHead = d => `<div class="dem-ohead"><div class="row wrap gap-6"><b class="mono">${esc(d.order_no || d.id)}</b>${d.urgent ? '<span class="badge red">URGENT</span>' : ''}${stagePill(d.stage)}</div><div class="small ink2 stk-mt4">${esc(dealContact(d).name)} · ${esc(dealTitle(d))} · ${d.vendor ? 'to ' + esc(d.vendor) : '<span class="dem-amber">no vendor on the order yet</span>'}</div></div>`;
function demGuard(d) {
  if (!can('demand')) return 'Your role cannot record material issue';
  if (!d || !STK_ORDER_STAGES.includes(d.stage)) return 'Material is issued against a confirmed order in CAD or production.';
  return null;
}
ACTIONS.demMetal = el => {
  const d = dealById(el.dataset.id); const g = demGuard(d); if (g) return stkSay(el, g);
  stkModal({ title: `Issue metal — ${esc(d.order_no || d.id)}`, sub: 'Recorded on the order\'s timeline with who and when. Both issues are needed before casting.',
    body: `${demHead(d)}<div class="stk-msg mt-12"></div>
      <div class="fgrid mt-16"><label class="field"><span class="req">Weight issued (g)</span><input class="input num" id="demG" type="number" step="0.01" min="0" value="${demWt(d) || ''}"><small class="stk-hint">${esc(d.purity)}${d.gold_colour && !['S925', 'PT950'].includes(d.purity) ? ' ' + esc(d.gold_colour) : ''} · estimate ${demWt(d) ? stkNum(demWt(d)) + ' g' : 'not set'}</small></label>
      <label class="field"><span>Note <em>(packet no., karigar, anything worth knowing)</em></span><input class="input" id="demN" placeholder="e.g. bar 18K-114, weighed with Ramesh"></label></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="demMetalGo" data-id="${d.id}">${icon('check', 'sm')}Record issue</button>` });
};
ACTIONS.demMetalGo = el => {
  const d = dealById(el.dataset.id); const g = demGuard(d); if (g) return stkSay(el, g);
  const gr = r2(+(document.getElementById('demG') || {}).value || 0); const note = ((document.getElementById('demN') || {}).value || '').trim();
  if (!(gr > 0)) return stkSay(el, 'Enter the weight issued (g)');
  issueMetal(d, gr, note); d.gold_issued_by = viewUser().id;
  stkAudit('material_issue', 'deal', d.id, `Metal ${stkNum(gr)} g ${d.purity}`);
  closeLayer(); render(); toast(`${d.purity} issued: ${stkNum(gr)} g to ${d.vendor || 'the karigar'}`, 'check');
};
/* Pick from stock: in-safe diamonds and lots with the order's shape and quality band; same size band ranks higher. */
const demBand = ct => { const i = SIZE_BANDS.findIndex(([, lo, hi]) => ct >= lo && ct < hi); return i; };
const demQBand = q => (QUALITY_BANDS.find(b => b.qualities.includes(q)) || {}).key || q;
function demMatches(d) {
  const lines = d.lines || [];
  const out = [];
  STOCK_ITEMS.filter(it => it.kind === 'diamond' || it.kind === 'lot').forEach(it => {
    const b = stkB(it); if (!b.has || (b.pcs <= 0 && b.ct <= 0)) return;
    const per = it.kind === 'lot' ? (b.pcs ? b.ct / b.pcs : 0) : +it.carat;
    let best = null;
    lines.forEach((l, i) => {
      if (l.shape !== it.shape) return;
      const qs = l.quality === it.quality ? 1 : demQBand(l.quality) === demQBand(it.quality) ? 1 : 0; if (!qs) return;
      const sz = demBand(+l.ct / (+l.pcs || 1)) === demBand(per) ? 1 : 0;
      const cert = l.cert_no && it.cert_no && l.cert_no === it.cert_no;
      const score = cert ? 3 : 1 + qs + sz;
      const dist = Math.abs(Math.log(((+l.ct / (+l.pcs || 1)) || 1e-4) / (per || 1e-4)));
      if (!best || score > best.score || (score === best.score && dist < best.dist)) best = { line: i, score, cert, dist };
    });
    if (best) {
      const l = lines[best.line];
      out.push({ it, b, ...best, pcs: it.kind === 'lot' ? Math.min(+l.pcs || 0, b.pcs) : 1, ct: it.kind === 'lot' ? r2(Math.min(+l.ct || 0, b.ct)) : r2(+it.carat) });
    }
  });
  return out.sort((a, b) => b.score - a.score || (b.cert ? 1 : 0) - (a.cert ? 1 : 0));
}
function demPickRows() {
  if (!DEM_PICK.rows.length) return '<div class="small muted dem-none">Nothing in the safe fits this order — record the issue by hand below.</div>';
  return `<div class="tbl-wrap dem-pickw"><table class="tbl stk-static dem-pick"><thead><tr><th></th><th>Code</th><th>Stone</th><th>Match</th><th class="num">In safe</th><th class="num">Pcs</th><th class="num">Ct</th></tr></thead><tbody>
    ${DEM_PICK.rows.map((r, i) => `<tr class="${r.on ? 'on' : ''}"><td class="p-t"><label class="check"><input type="checkbox" data-dem-tick="${i}" ${r.on ? 'checked' : ''} aria-label="Pick ${esc(r.it.code)}"></label></td>
      <td class="mono strong nw p-c">${esc(r.it.code)}</td><td class="small p-d">${esc(stkDesc(r.it))}${r.line != null ? ` <span class="badge gold">line ${r.line + 1}</span>` : ''}${r.cert ? ' <span class="badge green">cert matches</span>' : ''}</td>
      <td class="p-m"><span class="dem-score" title="${r.score != null ? r.score + ' of 3: shape, quality band, size band' : 'added by code'}">${r.score != null ? '●'.repeat(r.score) + '○'.repeat(3 - r.score) : '—'}</span></td>
      <td class="num small nw p-s">${r.it.kind === 'lot' ? `${stkPcs(r.b.pcs)} pcs · ${stkCt(r.b.ct)} ct` : stkCt(r.b.ct) + ' ct'}</td>
      <td class="num p-p">${r.it.kind === 'lot' ? `<input class="input num dem-q" data-dem-p="${i}" type="number" min="0" step="1" value="${r.pcs}">` : '1'}</td>
      <td class="num p-ct">${r.it.kind === 'lot' ? `<input class="input num dem-q" data-dem-c="${i}" type="number" min="0" step="0.01" value="${stkCt(r.ct)}">` : stkCt(r.ct)}</td></tr>`).join('')}</tbody></table></div>`;
}
function demPickSum() {
  const m = layer().querySelector('.modal'); if (!m || !DEM_PICK) return;
  const on = DEM_PICK.rows.filter(r => r.on); const need = demNeed(dealById(DEM_PICK.id));
  m.querySelector('#demP').value = on.length ? on.reduce((s, r) => s + (+r.pcs || 0), 0) : need.pcs;
  m.querySelector('#demC').value = on.length ? stkCt(on.reduce((s, r) => s + (+r.ct || 0), 0)) : stkCt(need.ct);
  const s = m.querySelector('#demPicked'); if (s) s.innerHTML = on.length ? `From stock: ${on.map(r => `<span class="mono">${esc(r.it.code)}</span>`).join(', ')}` : 'Nothing picked — the totals are the order\'s line totals.';
}
function demPickWire() {
  const m = layer().querySelector('.modal'); if (!m) return;
  m.querySelectorAll('[data-dem-tick]').forEach(c => c.addEventListener('change', () => { const r = DEM_PICK.rows[+c.dataset.demTick]; r.on = c.checked; c.closest('tr').classList.toggle('on', c.checked); demPickSum(); }));
  m.querySelectorAll('[data-dem-p]').forEach(c => c.addEventListener('input', () => { DEM_PICK.rows[+c.dataset.demP].pcs = Math.round(+c.value || 0); demPickSum(); }));
  m.querySelectorAll('[data-dem-c]').forEach(c => c.addEventListener('input', () => { DEM_PICK.rows[+c.dataset.demC].ct = r2(+c.value || 0); demPickSum(); }));
}
ACTIONS.demDia = el => {
  const d = dealById(el.dataset.id); const g = demGuard(d); if (g) return stkSay(el, g);
  const need = demNeed(d), withStock = can('stock');
  DEM_PICK = { id: d.id, rows: [] };
  stkModal({ title: `Issue diamond pieces — ${esc(d.order_no || d.id)}`, sub: 'Recorded on the order\'s timeline with who and when. Both issues are needed before casting.', wide: withStock,
    body: `${demHead(d)}
      <div class="dem-need mt-12">${(d.lines || []).length ? (d.lines || []).map((l, i) => `<div class="small"><span class="badge gold">line ${i + 1}</span> ${demLine(l)}</div>`).join('') + `<div class="xs strong stk-mt4">Needs ${stkPcs(need.pcs)} pcs · ${stkCt(need.ct)} ct</div>` : '<div class="small muted">no stone lines on the quote</div>'}</div>
      ${withStock ? `<div class="label mt-16">Pick from stock <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">— best matches first; lots take a partial quantity</span></div>
        <div id="demPickBox" class="mt-8"><div class="small muted row">${icon('search', 'sm')}Looking in the safe…</div><div class="bar mt-8"><i class="shimmer" style="width:100%"></i></div></div>
        <div class="row wrap mt-12 dem-bycode"><input class="input mono" id="demCode" placeholder="or add a stock code, e.g. ML-16" autocomplete="off"><button class="btn sm" data-act="demPickAdd">${icon('plus', 'sm')}Add by code</button></div>
        <div class="xs muted mt-8" id="demPicked">Nothing picked — the totals are the order's line totals.</div>` : ''}
      <div class="stk-msg mt-12"></div>
      <div class="stk-fg mt-16"><label class="field"><span class="req">Pieces issued</span><input class="input num" id="demP" type="number" min="0" step="1" value="${need.pcs || ''}"></label>
        <label class="field"><span class="req">Carat issued</span><input class="input num" id="demC" type="number" min="0" step="0.01" value="${need.ct ? stkCt(need.ct) : ''}"></label>
        <label class="field"><span>Note <em>(packet no., karigar, anything worth knowing)</em></span><input class="input" id="demN" placeholder="e.g. packet 7, counted with the karigar"></label></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="demDiaGo" data-id="${d.id}">${icon('check', 'sm')}Record issue</button>`,
    onMount: () => { if (!withStock) return; setTimeout(() => { const box = document.getElementById('demPickBox'); if (!box || !DEM_PICK || DEM_PICK.id !== d.id) return; DEM_PICK.rows = demMatches(d).map(r => ({ ...r, on: false })); box.innerHTML = demPickRows(); demPickWire(); }, 350); } });
};
ACTIONS.demPickAdd = el => {
  const inp = document.getElementById('demCode'); const code = (inp && inp.value || '').trim(); if (!DEM_PICK) return;
  if (!code) return stkSay(el, 'Type a stock code to add, e.g. ML-16');
  const it = STOCK_ITEMS.find(x => x.code.toLowerCase() === code.toLowerCase());
  if (!it) return stkSay(el, `No stock item with code ${code}`);
  if (it.kind === 'jewellery') return stkSay(el, `${it.code} is a finished piece — only stones and lots are issued to a karigar`);
  const b = stkB(it);
  if (!b.has) return stkSay(el, `${it.code} is not in the safe — it is ${STK_WHERE[b.status] || 'out'}`);
  const ex = DEM_PICK.rows.find(r => r.it === it);
  if (ex) ex.on = true; else DEM_PICK.rows.push({ it, b, line: null, score: null, on: true, pcs: it.kind === 'lot' ? 0 : 1, ct: it.kind === 'lot' ? 0 : r2(+it.carat) });
  const box = document.getElementById('demPickBox'); if (box) { box.innerHTML = demPickRows(); demPickWire(); }
  demPickSum(); inp.value = '';
  stkSay(el, `${it.code} added${it.kind === 'lot' ? ' — enter the pieces and carat taken from the parcel' : ''}.`, 'blue');
};
ACTIONS.demDiaGo = el => {
  const d = dealById(el.dataset.id); const g = demGuard(d); if (g) return stkSay(el, g);
  const pcs = Math.round(+(document.getElementById('demP') || {}).value || 0), ct = r2(+(document.getElementById('demC') || {}).value || 0);
  const note = ((document.getElementById('demN') || {}).value || '').trim();
  const picks = DEM_PICK && DEM_PICK.id === d.id ? DEM_PICK.rows.filter(r => r.on) : [];
  if (!(pcs > 0) || !(ct > 0)) return stkSay(el, 'Enter the pieces and carat issued, or pick them from stock');
  for (const r of picks) {
    if (r.it.kind === 'jewellery') return stkSay(el, `${r.it.code} is a finished piece — only stones and lots are issued to a karigar`);
    const b = stkB(r.it);
    if (!b.has) return stkSay(el, `${r.it.code} is not in the safe — it is ${STK_WHERE[b.status] || 'out'}`);
    if (r.it.kind === 'lot') {
      if (!(r.pcs > 0) && !(r.ct > 0)) return stkSay(el, `${r.it.code}: enter the pieces and / or carat moved`);
      if (b.pcs - r.pcs < 0 || r2(b.ct - r.ct) < 0) return stkSay(el, `That would take ${r.it.code} below zero — its balance is ${stkBalTxt(r.it, b)}`);
    }
    if (!can('stock.write')) return stkSay(el, 'Your role cannot move stock — record the issue by hand, without picking from stock');
  }
  const codes = [];
  for (const r of picks) { const res = stkMoveDo(r.it, 'issue', { pcs: r.pcs, ct: r.ct, deal: d.id, vendor: d.vendor || '', note: note || 'Demand → Issue diamonds', dem: d.id }); if (res.err) return stkSay(el, res.err); codes.push(r.it.code); }
  issueDiamonds(d, pcs, ct, codes, note); d.diamonds_issued_by = viewUser().id;
  stkAudit('material_issue', 'deal', d.id, `Diamonds ${pcs} pcs · ${stkCt(ct)} ct${codes.length ? ' · ' + codes.join(', ') : ''}`);
  DEM_PICK = null; closeLayer(); render();
  toast(`Diamonds issued: ${stkPcsU(pcs)} · ${stkCt(ct)} ct to ${d.vendor || 'the karigar'}${codes.length ? ' — from stock: ' + codes.join(', ') : ''}`, 'check');
};
ACTIONS.demRev = el => {
  const d = dealById(el.dataset.id), w = el.dataset.w;
  if (!isFounder()) return stkSay(el, 'Only founders can reverse a material issue');
  stkModal({ title: 'Reverse this issue?', sub: `${w === 'metal' ? 'Metal' : 'Diamonds'} · ${esc(d.order_no || d.id)} · ${esc(dealContact(d).name)}`,
    body: `<div class="stk-msg"></div><p class="small ink2">The entry is cleared and the reversal is logged; nothing is deleted from the timeline.${w === 'dia' && (d.stock_issued_codes || []).length ? ` The stones picked from stock go back to the safe: ${d.stock_issued_codes.map(c => `<span class="mono">${esc(c)}</span>`).join(', ')}.` : ''}</p>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="demRevGo" data-id="${d.id}" data-w="${w}">${icon('undo', 'sm')}Reverse</button>` });
};
ACTIONS.demRevGo = el => {
  const d = dealById(el.dataset.id), w = el.dataset.w;
  if (!isFounder()) return stkSay(el, 'Only founders can reverse a material issue');
  if (w === 'metal') {
    const g = d.gold_issued_wt; d.gold_issued_at = null; d.gold_issued_wt = 0; d.gold_issued_by = null;
    logAct(d, { type: 'system', subject: `Metal issue reversed (${stkNum(g)} g ${d.purity})`, body: '' });
    stkAudit('material_issue_reverse', 'deal', d.id, `Metal ${stkNum(g)} g`);
    closeLayer(); render(); toast('Metal issue reversed', 'undo'); return;
  }
  const codes = d.stock_issued_codes || [];
  const ids = codes.map(c => (STOCK_ITEMS.find(x => x.code === c) || {}).id).filter(Boolean);
  const mv = STOCK_MOVES.filter(m => m.deal === d.id && m.kind === 'issue' && !m.reversed && (m.dem === d.id || ids.includes(m.item)));
  for (const m of mv) { const why = stkRevCheck(m); if (why) return stkSay(el, why); }
  mv.forEach(m => stkRevDo(m, 'Demand issue reversed on ' + (d.order_no || d.id)));
  const was = `${d.diamonds_issued_pcs} pcs · ${stkCt(d.diamonds_issued_ct)} ct`;
  d.diamonds_issued_at = null; d.diamonds_issued_pcs = 0; d.diamonds_issued_ct = 0; d.stock_issued_codes = []; d.diamonds_issued_by = null;
  logAct(d, { type: 'system', subject: `Diamond issue reversed (${was})${codes.length ? ' — back in the safe: ' + codes.join(', ') : ''}`, body: '' });
  stkAudit('material_issue_reverse', 'deal', d.id, `Diamonds ${was}`);
  closeLayer(); render(); toast(`Diamond issue reversed${codes.length ? ' — back in the safe: ' + codes.join(', ') : ''}`, 'undo');
};

/* Counter billing, schemes, reports, settings */

/* ---------- counter billing ----------
   Sells finished jewellery that is in the safe (STOCK_ITEMS, stockBal status in_stock), priced at today's rate with the
   quote maths (computeLive). Completing a sale writes a STOCK_MOVES 'sale' row and an INVOICES entry. */
const BILL = { cart: ['s14'], cust: 'c4', cash: 50000, card: 0, oldGold: true, og: { wt: 4.2, purity: '18K' }, scheme: null };
const billJewels = () => STOCK_ITEMS.filter(x => x.kind === 'jewellery');
const billItem = id => STOCK_ITEMS.find(x => x.id === id);
/* "1 Round 1.00 ct + 48 melee 1.05 ct" → stone lines priced from the diamond sheet */
function billLines(summary) {
  const out = []; const re = /(\d+)\s+([A-Za-z-]+)\s+([\d.]+)\s*ct(?:\s+([A-Z]{2,3}-[A-Z]{2,3}))?/g; let m;
  while ((m = re.exec(summary || ''))) { const shape = /melee/i.test(m[2]) ? 'Melee' : m[2][0].toUpperCase() + m[2].slice(1).toLowerCase(); const pcs = +m[1], ct = +m[3], quality = m[4] || 'VS-FG'; out.push({ shape, pcs, ct, quality, rate: sheetRate(shape, quality, pcs, ct) || 0 }); }
  return out;
}
const billPrice = it => computeLive({ purity: it.purity, gold_rate_24k: baseRateFor(it.purity), gold_wt: it.net_wt, making_rate: sheetMaking(it.purity, it.item_type), lines: billLines(it.stone_summary), extra_stones: 0, discount_pct: 0, gst_pct: SETTINGS.default_gst, usd_rate: SETTINGS.default_usd, usd_spread: SETTINGS.default_usd_spread });
const billWhy = it => { const b = stockBal(it), mv = b.moves.slice(-1)[0]; return b.status === 'in_stock' ? `In the ${it.location.toLowerCase()}` : `${STOCK_STATUS[b.status][0]}${mv ? ' ' + fdate(mv.at) + (mv.vendor ? ' · ' + mv.vendor : '') : ''}`; };
const billNextNo = () => 'INV/26-27/' + String(Math.max(...INVOICES.map(v => +v.no.split('/').pop())) + 1).padStart(4, '0');
function billTotals() {
  const items = BILL.cart.map(billItem).filter(Boolean).map(it => ({ it, p: billPrice(it) }));
  const taxable = items.reduce((s, x) => s + x.p.selling, 0), gst = items.reduce((s, x) => s + x.p.gst_amt, 0), total = taxable + gst;
  const og = BILL.oldGold ? Math.round(BILL.og.wt * SETTINGS.gold_rate_24k * (GOLD[BILL.og.purity] || GOLD['18K'])[1]) : 0;
  const sch = BILL.scheme ? Math.min(BILL.scheme.amount, Math.max(0, total - og)) : 0;
  const due = Math.max(0, total - og - sch), upi = Math.max(due - BILL.cash - BILL.card, 0);
  return { items, taxable, gst, total, og, sch, due, upi, over: BILL.cash + BILL.card > due + 0.5 };
}
const billCustName = () => BILL.cust ? contactById(BILL.cust).name : 'Walk-in client';
SCREENS.billing = {
  title: 'Billing', nav: 'billing',
  render() {
    const T = billTotals(), avail = billJewels().filter(x => stockBal(x).status === 'in_stock' && !BILL.cart.includes(x.id)), no = billNextNo();
    const c = BILL.cust && contactById(BILL.cust), cashBlock = BILL.cash >= 200000;
    return `${pageHead('Counter billing', 'Tagged pieces from the safe, priced at today\'s rate · old gold exchange · split payment', `<button class="btn" data-act="billList">${icon('receipt')}Invoices</button><button class="btn primary" data-act="billNew">${icon('plus')}New invoice</button>`)}
      <div class="grid g-side"><div class="stack">
        ${card('Client', `<div class="fgrid"><label class="field"><span>Bill to</span><select class="select" id="billCust"><option value="">Walk-in client</option>${CONTACTS.map(x => `<option value="${x.id}" ${x.id === BILL.cust ? 'selected' : ''}>${esc(x.name)} · ${esc(x.city)}</option>`).join('')}</select></label>
          <div class="field"><span>On record</span><div class="small ink2" style="padding-top:8px">${c ? `${esc(maskPhone(c.phone))}${(c.tags || []).length ? ' · ' + c.tags.join(', ') : ''} · <a class="link" href="#/customers/${c.id}">profile</a>` : 'Name and phone are asked for invoices over ₹2 lakh'}</div></div></div>`)}
        ${card('Items', `<div class="composer" style="padding:4px 10px;align-items:center">${icon('qr', 'sm')}<input id="billQ" style="border:0;outline:0;flex:1;min-width:0;height:34px;background:transparent" placeholder="Scan a tag or type a tag number (FJ-…)" autocomplete="off"></div>
          <div id="billHits"></div>
          ${avail.length ? `<div class="row wrap mt-8" style="gap:6px"><span class="xs muted">In the safe:</span>${avail.map(x => `<button class="chip" data-act="billAdd" data-id="${x.id}" style="height:28px;font-size:12px">${icon('plus', 'sm')}${x.code}</button>`).join('')}</div>` : ''}
          <div class="list mt-12 sx-cart">${T.items.map(({ it, p }) => `<div class="li"><img class="thumb lg" src="${img(it.img, 200)}" alt=""><div class="grow" style="min-width:0"><div class="t">${esc(it.title)}</div><div class="s">Tag ${it.code} · HUID ${it.huid} · ${it.purity} ${it.gold_colour.toLowerCase()} · ${it.net_wt} g · ${esc(it.stone_summary)}</div>
            <div class="xs muted mt-8">Metal ${inr(p.gold_value)} · Diamonds ${inr(p.diamond_value)} · Making ${inr(p.labour)}${it.list_price ? ` · tag ${inr(it.list_price)}` : ''}</div></div><div class="tr"><div class="strong num">${inr(p.selling)}</div><button class="btn sm ghost mt-8" data-act="billRm" data-id="${it.id}">${icon('x', 'sm')}Remove</button></div></div>`).join('') || '<div class="empty small">Scan a tag, or pick a piece from the safe above.</div>'}</div>`)}
        ${card('Old gold exchange', `<label class="row between"><span>Client is exchanging old gold</span><span class="switch"><input type="checkbox" ${BILL.oldGold ? 'checked' : ''} id="billOg"><span></span></span></label>
          ${BILL.oldGold ? `<div class="fgrid mt-16"><label class="field"><span>Net weight after melting loss (g)</span><input class="input num" data-og="wt" value="${BILL.og.wt}"></label><label class="field"><span>Purity by touchstone / XRF</span><select class="select" data-og="purity">${['24K', '22K', '18K', '14K', '9K'].map(p => `<option ${p === BILL.og.purity ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
          <label class="field"><span>Rate applied (buyback ${Math.round(GOLD[BILL.og.purity][1] * 1000) / 10}%)</span><input class="input num" value="${inr(SETTINGS.gold_rate_24k * GOLD[BILL.og.purity][1])} / g" readonly></label><label class="field"><span>Credit</span><input class="input num strong" value="${inr(T.og)}" readonly></label></div>
          <div class="small muted mt-12">${icon('file', 'sm')} Purchase voucher URD/26-27/0112 is created with the invoice.</div>` : ''}`)}
        ${BILL.scheme ? card('Gold Saver redemption', `<div class="row between"><div><div class="strong">${esc(BILL.scheme.name)}</div><div class="small muted">11 instalments + the 12th from MARQA</div></div><span class="strong num" style="color:var(--green)">− ${inr(T.sch)}</span></div><button class="btn sm ghost mt-8" data-act="billNoScheme">${icon('x', 'sm')}Don't use it on this bill</button>`) : ''}
        ${card('Payment', `<div class="fgrid"><label class="field"><span>Cash</span><div class="prefix"><b>₹</b><input class="input num ${cashBlock ? 'warn' : ''}" data-bill="cash" value="${BILL.cash}"></div></label>
          <label class="field"><span>Card</span><div class="prefix"><b>₹</b><input class="input num" data-bill="card" value="${BILL.card}"></div></label>
          <label class="field full"><span>UPI · remaining</span><div class="prefix"><b>₹</b><input class="input num" value="${NF.format(Math.round(T.upi))}" readonly></div></label></div>
          ${cashBlock ? `<div class="banner red mt-12">${icon('alert')}<div>Cash of ₹2 lakh or more from one person in a day is not allowed under the Income-tax Act (s. 269ST). Move the excess to UPI or card; the sale cannot complete until then.</div></div>` : T.over ? `<div class="banner mt-12">${icon('alert')}<div>Cash and card come to more than the amount due. Return ${inr(BILL.cash + BILL.card - T.due)} or lower the figures.</div></div>` : `<div class="small muted mt-12">${icon('shield', 'sm')} Cash is checked against the ₹2 lakh limit and the PMLA monitor.</div>`}`)}
      </div>
      <div><div class="card" style="position:sticky;top:76px"><div class="card-h"><h3>Tax invoice</h3>${badge('e-invoice ready', 'blue')}</div><div class="card-b">
        <div class="small muted">${no} · ${fdate(TODAY)} 2026 · GSTIN ${TENANT.gstin}</div><div class="strong mt-8">${esc(billCustName())}${T.total >= 200000 ? ' · PAN needed' : ''}</div>
        <dl class="kv mt-16"><dt>Taxable value</dt><dd class="num">${inr(T.taxable)}</dd><dt>CGST 1.5%</dt><dd class="num">${inr(T.gst / 2)}</dd><dt>SGST 1.5%</dt><dd class="num">${inr(T.gst / 2)}</dd><dt>Invoice total</dt><dd class="num strong">${inr(T.total)}</dd>
          ${T.og ? `<dt style="color:var(--green)">Old gold credit</dt><dd class="num" style="color:var(--green)">− ${inr(T.og)}</dd>` : ''}${T.sch ? `<dt style="color:var(--green)">Gold Saver</dt><dd class="num" style="color:var(--green)">− ${inr(T.sch)}</dd>` : ''}<dt class="tot">To pay</dt><dd class="tot num">${inr(T.due)}</dd></dl>
        <div class="small muted mt-12">HSN 7113 · ${T.items.length ? 'HUID ' + T.items.map(x => x.it.huid).join(', ') + ' printed on the invoice' : 'no pieces yet'}</div>
        <button class="btn primary block mt-16" data-act="billDone">${icon('check')}Complete sale</button><button class="btn block mt-8" data-act="billPreview">${icon('printer')}Preview and print</button></div></div></div></div>
      ${card('Recent invoices', `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Invoice</th><th>Client</th><th>Item</th><th>HUID</th><th>Paid by</th><th class="num">Total</th></tr></thead><tbody>${INVOICES.map(v => `<tr data-act="billInvoice" data-no="${v.no}"><td class="strong">${v.no}<div class="xs muted">${v.date} · ${v.kind === 'Counter' ? 'counter sale' : 'order'}</div></td><td>${esc(v.cust ? contactById(v.cust).name : 'Walk-in client')}</td><td class="m-hide">${esc(v.item)}</td><td class="m-hide num">${esc(v.huid)}</td><td class="m-hide">${esc(v.mode)}</td><td class="num strong">${inr(v.total)}</td></tr>`).join('')}</tbody></table></div>`, { cls: 'mt-16', flush: true })}`;
  },
  mount(root) {
    root.querySelectorAll('[data-bill]').forEach(i => i.addEventListener('change', () => { BILL[i.dataset.bill] = +i.value.replace(/\D/g, '') || 0; render(); }));
    root.querySelectorAll('[data-og]').forEach(i => i.addEventListener('change', () => { BILL.og[i.dataset.og] = i.dataset.og === 'wt' ? Math.max(0, parseFloat(i.value) || 0) : i.value; render(); }));
    const og = root.querySelector('#billOg'); if (og) og.addEventListener('change', () => { BILL.oldGold = og.checked; render(); });
    const cu = root.querySelector('#billCust'); if (cu) cu.addEventListener('change', () => { BILL.cust = cu.value || null; render(); });
    const q = root.querySelector('#billQ'), hits = root.querySelector('#billHits');
    if (q) {
      const paint = () => {
        const s = q.value.trim().toLowerCase(); if (!s) { hits.innerHTML = ''; return; }
        const found = billJewels().filter(x => (x.code + ' ' + x.title + ' ' + x.huid).toLowerCase().includes(s)).slice(0, 5);
        hits.innerHTML = found.length ? `<div class="sx-hits list">${found.map(x => { const ok = stockBal(x).status === 'in_stock' && !BILL.cart.includes(x.id); return `<div class="li ${ok ? '' : 'sx-off'}" ${ok ? `data-act="billAdd" data-id="${x.id}"` : ''}><img class="thumb" src="${img(x.img, 120)}" alt=""><div class="grow" style="min-width:0"><div class="t">${x.code} · ${esc(x.title)}</div><div class="s">${BILL.cart.includes(x.id) ? 'Already on this bill' : esc(billWhy(x))}</div></div>${ok ? `<span class="small strong num">${inr(billPrice(x).total)}</span>` : badge(STOCK_STATUS[stockBal(x).status][0], STOCK_STATUS[stockBal(x).status][1])}</div>`; }).join('')}</div>` : `<div class="small muted mt-8">No tagged piece matches “${esc(q.value)}”.</div>`;
      };
      q.addEventListener('input', paint);
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = hits.querySelector('[data-act=billAdd]'); if (f) ACTIONS.billAdd(f); else toast('Nothing in the safe matches that tag', 'alert'); } });
    }
  }
};
ACTIONS.billAdd = el => { const it = billItem(el.dataset.id); if (stockBal(it).status !== 'in_stock') return toast(`${it.code} is ${STOCK_STATUS[stockBal(it).status][0].toLowerCase()}, it cannot be billed`, 'alert'); if (!BILL.cart.includes(it.id)) BILL.cart.push(it.id); render(); toast(`${it.code} added · ${inr(billPrice(it).total)} at today's rate`, 'tag'); };
ACTIONS.billRm = el => { BILL.cart = BILL.cart.filter(x => x !== el.dataset.id); render(); toast(`${billItem(el.dataset.id).code} taken off the bill`, 'x'); };
ACTIONS.billOld = el => { BILL.oldGold = el.checked; render(); };
ACTIONS.billNoScheme = () => { BILL.scheme = null; render(); toast('Gold Saver credit kept for another visit', 'undo'); };
ACTIONS.billNew = () => { Object.assign(BILL, { cart: [], cust: null, cash: 0, card: 0, oldGold: false, scheme: null }); render(); toast(`New invoice ${billNextNo()} started`, 'plus'); const q = document.getElementById('billQ'); if (q) q.focus(); };
ACTIONS.billDone = () => {
  const T = billTotals();
  if (!T.items.length) return toast('Add a piece to the bill first', 'alert');
  if (BILL.cash >= 200000) return toast('Blocked: cash of ₹2 lakh or more from one person. Move the excess to UPI or card', 'alert');
  if (T.over) return toast('Cash and card are more than the amount due. Fix the payment first', 'alert');
  if (T.total >= 200000 && !BILL.cust) return toast('Over ₹2 lakh: pick the client so the invoice carries their name and PAN', 'alert');
  const no = billNextNo(), now = sx_now(), who = billCustName();
  T.items.forEach(({ it }) => STOCK_MOVES.push({ id: 'm' + (STOCK_MOVES.length + 1), item: it.id, kind: 'sale', pcs: -1, ct: 0, deal: null, vendor: '', note: `Counter sale ${no} to ${who}`, at: now, by: viewUser().id }));
  const mode = [BILL.cash && 'Cash', BILL.card && 'Card', T.upi > 0.5 && 'UPI', T.og && 'old gold', T.sch && 'Gold Saver'].filter(Boolean).join(' + ') || 'UPI';
  INVOICES.unshift({ no, kind: 'Counter', cust: BILL.cust, item: T.items.map(x => x.it.title).join(', '), huid: T.items.map(x => x.it.huid).join(', '), lines: T.items.map(({ it, p }) => ({ code: it.code, title: it.title, huid: it.huid, wt: it.net_wt, purity: it.purity, taxable: p.selling })),
    taxable: Math.round(T.taxable), gst: Math.round(T.gst), total: Math.round(T.total), og: T.og, ogWt: BILL.oldGold ? BILL.og.wt : 0, ogPurity: BILL.og.purity, sch: T.sch, pay: { cash: BILL.cash, card: BILL.card, upi: Math.round(T.upi) }, mode, at: now, date: fdate(TODAY) });
  if (BILL.scheme) { const m = SCHEME.list.find(x => x.contact === BILL.scheme.contact); if (m) m.status = 'Redeemed'; }
  AUDIT.unshift({ at: now, user: viewUser().id, action: 'counter_sale', entity: 'invoice', entity_id: no, detail: `${T.items.map(x => x.it.code).join(', ')} · ${inr(T.total)} · ${who}` });
  Object.assign(BILL, { cart: [], cash: 0, card: 0, oldGold: false, scheme: null });
  render(); billShow(INVOICES[0]); toast(`${no} issued · IRN generated · ${T.items.map(x => x.it.code).join(', ')} marked sold`, 'receipt');
};
function billDoc(v, draft) {
  const c = v.cust && contactById(v.cust), d = v.deal && dealById(v.deal);
  const rows = v.lines || [{ code: d && (d.order_no || d.tag_no) || '', title: v.item, huid: v.huid, wt: d ? (d.actual_weight || d.gold_wt) : '', purity: d ? d.purity : '', taxable: v.taxable }];
  return `<div class="sx-doc"><div class="row between top wrap" style="gap:12px"><div>${BRAND.wordmark('')}<div class="xs muted mt-8">${esc(TENANT.legal)} · C-57 Central Market, Lajpat Nagar II, New Delhi 110024<br>GSTIN ${TENANT.gstin}</div></div>
      <div style="text-align:right"><div class="strong">${draft ? 'Draft invoice' : 'Tax invoice'}</div><div class="small num">${esc(v.no)}</div><div class="xs muted">${v.date || fdate(TODAY)} 2026</div></div></div>
    <div class="mt-16 small"><span class="muted">Billed to</span> <b>${esc(c ? c.name : 'Walk-in client')}</b>${c ? ` · ${esc(maskPhone(c.phone))} · ${esc(c.city)}` : ''}</div>
    <table><thead><tr><th>Item</th><th>HSN</th><th class="r">Net wt</th><th class="r">Value</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${esc(r.title)}</b><div class="xs muted">${esc(r.code)}${r.huid ? ' · HUID ' + esc(r.huid) : ''}${r.purity ? ' · ' + r.purity : ''}</div></td><td>7113</td><td class="r num">${r.wt ? (+r.wt).toFixed(2) + ' g' : '—'}</td><td class="r num">${inr(r.taxable)}</td></tr>`).join('')}</tbody></table>
    <dl class="kv mt-12"><dt>Taxable value</dt><dd class="num">${inr(v.taxable)}</dd><dt>CGST 1.5%</dt><dd class="num">${inr(v.gst / 2)}</dd><dt>SGST 1.5%</dt><dd class="num">${inr(v.gst / 2)}</dd><dt class="tot">Invoice total</dt><dd class="tot num">${inr(v.total)}</dd>
      ${v.og ? `<dt>Old gold ${v.ogWt} g ${v.ogPurity} (URD voucher)</dt><dd class="num">− ${inr(v.og)}</dd>` : ''}${v.sch ? `<dt>Gold Saver redemption</dt><dd class="num">− ${inr(v.sch)}</dd>` : ''}
      ${v.pay ? `<dt>Paid</dt><dd class="num">${[v.pay.cash && 'Cash ' + inr(v.pay.cash), v.pay.card && 'Card ' + inr(v.pay.card), v.pay.upi && 'UPI ' + inr(v.pay.upi)].filter(Boolean).join(' · ') || '—'}</dd>` : `<dt>Paid by</dt><dd>${esc(v.mode)}</dd>`}</dl>
    <div class="xs muted mt-12">Lab-grown diamonds, certified. Hallmarked under BIS (HUID on each piece). ${d ? 'Order ' + esc(d.order_no || d.id) + '.' : ''}</div></div>`;
}
function billShow(v, draft) {
  const d = v.deal && dealById(v.deal);
  openModal(`<div class="sx-modal-b">${billDoc(v, draft)}
    <div class="row wrap mt-16" style="justify-content:flex-end;gap:8px">${d ? `<button class="btn" data-go="#/deal/${d.id}/billing">Open deal</button>` : ''}<button class="btn" data-act="close">Close</button>${draft ? '' : `<button class="btn wa" data-act="billWa" data-no="${esc(v.no)}">${icon('wa')}WhatsApp</button>`}<button class="btn primary" data-act="billPrint" data-no="${esc(v.no)}">${icon('printer')}Print</button></div></div>`, 'wide');
}
ACTIONS.billInvoice = el => billShow(INVOICES.find(v => v.no === el.dataset.no));
ACTIONS.billPreview = () => { const T = billTotals(); if (!T.items.length) return toast('Add a piece to the bill first', 'alert'); billShow({ no: billNextNo(), cust: BILL.cust, lines: T.items.map(({ it, p }) => ({ code: it.code, title: it.title, huid: it.huid, wt: it.net_wt, purity: it.purity, taxable: p.selling })), taxable: T.taxable, gst: T.gst, total: T.total, og: T.og, ogWt: BILL.og.wt, ogPurity: BILL.og.purity, sch: T.sch, pay: { cash: BILL.cash, card: BILL.card, upi: Math.round(T.upi) }, date: fdate(TODAY) }, true); };
ACTIONS.billPrint = el => { closeLayer(); toast(`${el.dataset.no} sent to the counter printer`, 'printer'); };
ACTIONS.billWa = el => {
  const v = INVOICES.find(x => x.no === el.dataset.no), c = v.cust && contactById(v.cust);
  if (!c) { closeLayer(); return toast('A walk-in client has no WhatsApp on record. Print it instead', 'alert'); }
  const t = sx_contactThread(c.id); if (t) { t.msgs.push({ from: 'out', doc: v.no.replace(/\//g, '-') + '.pdf', t: `Your GST invoice ${v.no} for ${inr(v.total)}. Keep it with the certificate.`, at: sx_hm(sx_now()) }); t.time = sx_hm(sx_now()); }
  closeLayer(); toast(`${v.no} sent to ${c.name} on WhatsApp`, 'wa');
};
ACTIONS.billList = () => {
  const month = INVOICES.filter(v => v.at && v.at.getMonth() === TODAY.getMonth());
  openSheet({ title: 'Invoices', sub: `FY 2026-27 · ${INVOICES.length} shown · this month ${inr(month.reduce((s, v) => s + v.total, 0))}`,
    body: `<div class="card"><div class="list">${INVOICES.map(v => `<div class="li" data-act="billInvoice" data-no="${v.no}">${sx_iconTile(v.kind === 'Counter' ? 'receipt' : 'board', v.kind === 'Counter' ? 'gold' : 'blue')}<div class="grow" style="min-width:0"><div class="t">${v.no} · ${esc(v.cust ? contactById(v.cust).name : 'Walk-in client')}</div><div class="s truncate">${v.date} · ${esc(v.item)} · ${esc(v.mode)}</div></div><span class="num strong">${inr(v.total)}</span></div>`).join('')}</div></div>
      <div class="small muted mt-12">${icon('shield', 'sm')} Order invoices are raised in Zoho Books and their numbers recorded on the deal (Billing tab); counter sales are issued here.</div>`,
    foot: '<button class="btn" data-act="close">Close</button>' });
};

/* ---------- schemes ---------- */
const SCH_INST = [2000, 3000, 5000, 10000];
const schMember = id => SCHEME.list.find(m => m.contact === id);
SCREENS.schemes = {
  title: 'Schemes', nav: 'schemes',
  render() {
    const L = SCHEME.list, missed = L.filter(m => m.status === 'Missed').length, held = L.reduce((s, m) => s + m.paid * m.inst, 0);
    return `${pageHead('Gold savings schemes', SCHEME.name + ' · 11 instalments, the 12th on us', `<button class="btn" data-act="schReport">${icon('download')}Liability report</button><button class="btn primary" data-act="schEnrol">${icon('plus')}Enrol client</button>`)}
      <div class="grid g4 kpis">${[['Members', SCHEME.members, 'whole book'], ['Collected monthly', inrShort(SCHEME.monthly), 'UPI AutoPay mostly'], ['Maturing this month', SCHEME.maturing, 'ready to redeem'], ['Missed instalments', missed, missed ? '<span class="down">needs a reminder</span>' : 'none']].map(([k, v, d]) => `<div class="card kpi"><div class="k">${k}</div><div class="v num" style="font-size:22px">${v}</div><div class="d">${d}</div></div>`).join('')}</div>
      <div class="banner blue mt-16">${icon('shield')}<div>Each enrolment is redeemed within 365 days, so instalments are advances and not deposits. The app blocks a 13th instalment.</div></div>
      ${card('Members due, overdue or ready to redeem', `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Member</th><th class="num">Instalment</th><th>Progress</th><th>Next due</th><th>Status</th><th></th></tr></thead><tbody>
        ${L.map(m => `<tr data-go="#/customers/${m.contact}"><td class="strong">${esc(m.name)}<div class="xs muted">since ${m.since} · ${inr(m.paid * m.inst)} paid</div></td><td class="num">${inr(m.inst)}</td><td style="min-width:140px"><div class="row"><div class="bar grow ${m.status === 'Missed' ? 'red' : 'green'}"><i style="width:${m.paid / 11 * 100}%"></i></div><span class="xs muted num">${m.paid}/11</span></div></td>
          <td class="m-hide">${m.status === 'Redeemed' || m.paid >= 11 ? '—' : fdate(m.due)}</td><td>${badge(m.status, m.status === 'Missed' ? 'red' : m.status === 'On track' ? 'green' : m.status === 'Reminded' ? 'amber' : m.status === 'Redeemed' ? 'out' : 'gold')}</td>
          <td>${m.status === 'Redeemed' ? '' : m.paid >= 11 ? `<button class="btn sm primary" data-act="schRedeem" data-c="${m.contact}">${icon('gift', 'sm')}Redeem</button>` : m.status === 'Missed' ? `<button class="btn sm" data-act="schRemind" data-c="${m.contact}">${icon('wa', 'sm')}Remind</button>` : `<button class="btn sm" data-act="schemeLink" data-c="${m.contact}">${icon('link', 'sm')}Pay link</button>`}</td></tr>`).join('')}</tbody></table></div>`, { cls: 'mt-16', flush: true, right: `<span class="small muted num">${inr(held)} held</span>` })}`;
  }
};
ACTIONS.schemeLink = el => { const m = schMember(el.dataset.c); toast(`UPI AutoPay link for ${inr(m.inst)} sent to ${m.name} on WhatsApp`, 'link'); };
ACTIONS.schRemind = el => { const m = schMember(el.dataset.c); m.status = 'Reminded'; render(); toast(`Reminder sent to ${m.name}: ${inr(m.inst)} was due ${fdate(m.due)}`, 'wa'); };
ACTIONS.schRedeem = el => {
  const m = schMember(el.dataset.c), amt = m.inst * 12;
  openModal(`<div class="sx-modal-b"><div class="row">${sx_iconTile('gift', 'green')}<h2 style="font-size:18px">Redeem ${esc(m.name)}'s Gold Saver</h2></div>
    <dl class="kv mt-16"><dt>11 instalments paid</dt><dd class="num">${inr(m.inst * 11)}</dd><dt>12th instalment from MARQA</dt><dd class="num">${inr(m.inst)}</dd><dt class="tot">To spend</dt><dd class="tot num">${inr(amt)}</dd></dl>
    <div class="small muted mt-12">Redeemed against a piece on a counter bill. Any amount left over stays as credit on the next visit within the 365 days.</div>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Not now</button><button class="btn primary" data-act="schUse" data-c="${m.contact}">Use on a counter bill</button></div></div>`);
};
ACTIONS.schUse = el => { const m = schMember(el.dataset.c); Object.assign(BILL, { cust: m.contact, scheme: { contact: m.contact, name: m.name, amount: m.inst * 12 } }); closeLayer(); go('#/billing'); toast(`${m.name}'s ${inr(m.inst * 12)} is on the bill; add the piece`, 'gift'); };
ACTIONS.schReport = () => {
  const L = SCHEME.list.filter(m => m.status !== 'Redeemed'), held = L.reduce((s, m) => s + m.paid * m.inst, 0), bonus = L.reduce((s, m) => s + m.inst, 0);
  openSheet({ title: 'Scheme liability', sub: `${SCHEME.name} · as of ${fdate(TODAY)} 2026`, wide: true,
    body: `<div class="grid g3" style="gap:8px">${[['Advances held', inr(held)], ['12th instalments owed', inr(bonus)], ['Total liability', inr(held + bonus)]].map(([a, b]) => `<div class="pill-rate"><span class="xs muted">${a}</span><span class="v num">${b}</span></div>`).join('')}</div>
      <div class="card mt-16"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th class="num">Paid</th><th class="num">Held</th><th class="num">12th</th><th>Redeem by</th></tr></thead><tbody>
        ${L.map(m => `<tr data-go="#/customers/${m.contact}"><td class="strong">${esc(m.name)}</td><td class="num">${m.paid}/11</td><td class="num">${inr(m.paid * m.inst)}</td><td class="num">${inr(m.inst)}</td><td>${fdate(addDays(m.due, (11 - m.paid) * 30 + 30))}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="small muted mt-12">Advances are not deposits: every enrolment is redeemed within 365 days. Whole book: ${SCHEME.members} members, ${inrShort(SCHEME.monthly)} collected a month.</div>`,
    foot: `<button class="btn" data-act="close">Close</button><button class="btn primary" data-act="schCsv">${icon('download')}Download CSV</button>` });
};
ACTIONS.schCsv = () => { closeLayer(); toast(`scheme_liability_${fdate(TODAY).replace(' ', '')}.csv downloaded · ${SCHEME.list.length} members`, 'download'); };
ACTIONS.schEnrol = () => {
  const free = CONTACTS.filter(c => !schMember(c.id));
  openSheet({ title: 'Enrol in Gold Saver', sub: '11 monthly instalments; MARQA adds the 12th',
    body: `<div class="fgrid"><label class="field full"><span>Client</span><select class="select" id="schC">${free.map(c => `<option value="${c.id}">${esc(c.name)} · ${esc(maskPhone(c.phone))}</option>`).join('')}</select></label></div>
      <div class="label mt-16">Monthly instalment</div><div class="chips mt-8">${SCH_INST.map((v, i) => `<label class="chip ${i === 2 ? 'on' : ''}"><input type="radio" name="schI" value="${v}" ${i === 2 ? 'checked' : ''} style="display:none">${inr(v)}</label>`).join('')}</div>
      <div class="fgrid mt-16"><label class="field"><span>Collect by</span><select class="select" id="schM"><option>UPI AutoPay</option><option>Card standing instruction</option><option>Cash at the counter</option></select></label><label class="field"><span>First instalment</span><select class="select"><option>Today, at the counter</option><option>On the 5th of each month</option></select></label></div>
      <div class="card soft mt-16"><div class="card-b small" id="schSum"></div></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="schSave">Enrol</button>`,
    onMount(sh) { const f = () => { const v = +(sh.querySelector('input[name=schI]:checked') || { value: 5000 }).value; sh.querySelectorAll('.chips .chip').forEach(ch => ch.classList.toggle('on', ch.contains(sh.querySelector('input[name=schI]:checked')))); sh.querySelector('#schSum').innerHTML = `${inr(v)} × 11 = <b>${inr(v * 11)}</b>, plus ${inr(v)} from MARQA: <b>${inr(v * 12)}</b> to spend by ${fdate(addDays(TODAY, 365))} 2027.`; }; f(); sh.querySelectorAll('input[name=schI]').forEach(r => r.addEventListener('change', f)); } });
};
ACTIONS.schSave = () => {
  const c = contactById(document.getElementById('schC').value), v = +(document.querySelector('input[name=schI]:checked') || { value: 5000 }).value, how = document.getElementById('schM').value;
  if (!c) return toast('Every contact is already a member', 'alert');
  SCHEME.list.push({ contact: c.id, name: c.name, inst: v, paid: 1, due: addDays(TODAY, 30), status: 'On track', since: 'Nov 2026' }); SCHEME.members++; SCHEME.monthly += v;
  closeLayer(); render(); toast(`${c.name} enrolled · ${inr(v)} a month by ${how} · first instalment received`, 'coins');
};

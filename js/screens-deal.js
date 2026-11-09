/* The deal record: one page from enquiry to delivery, as in the live app (v2.7.0).
   Header + banners, the stage ladder, the SOP panel (the current stage's checks), and five tabs:
   Overview · Quote · Order & QC · Billing · Activity. Every stage move goes through moveCheck(). */

const DP = { tab: {}, qd: null, qdFor: null, qc: {}, sop: (() => { try { return localStorage.getItem('mq-sop') !== '0'; } catch (_) { return true; } })() };
const DTABS = [['overview', 'Overview'], ['quote', 'Quote'], ['order', 'Order & QC'], ['billing', 'Billing'], ['activity', 'Activity']];
const defaultTab = d => ({ quote: 'quote', order: 'order' }[stg(d.stage).group] || 'overview');
const canEditLead = d => can('deals.write') || (can('deals.write.lead') && stg(d.stage).group === 'lead') || (can('deals.write.order') && (isOrder(d) || d.stage === 'Closed'));
const canEditOrder = () => can('deals.write') || can('deals.write.order');
const quoteLocked = d => !!d.order_date || !can('deals.write');
const curDeal = () => dealById(parse().id);
const metalName = p => (GOLD[p] || GOLD['14K'])[2] === 'silver' ? 'Silver' : (GOLD[p] || GOLD['14K'])[2] === 'platinum' ? 'Platinum' : 'Gold';
const metalDesc = d => d.purity === 'S925' ? 'Sterling silver 925' : d.purity === 'PT950' ? 'Platinum 950' : `${d.purity} ${d.gold_colour || ''} gold`;
const viaName = v => ({ pdf: 'PDF', whatsapp: 'WhatsApp', in_store: 'in store', legacy: 'before v2.3' }[v] || v);
const denied = (msg) => toast(msg, 'lock');

SCREENS.deal = {
  title: 'Deal', nav: 'pipeline',
  render(p) {
    const d = dealById(p.id);
    if (!d || d.deleted) return `<div class="empty">${icon('alert')}<div class="mt-8">This deal is not here${d && d.deleted ? ' — it is in the Trash' : ''}.</div><button class="btn mt-16" data-go="#/pipeline">Back to the pipeline</button></div>`;
    if (VIEW.role === 'ops' && !isOrder(d) && d.stage !== 'Cancelled') return `<div class="empty">${icon('lock')}<div class="mt-8">Ops works on orders. This deal is still at “${stg(d.stage).label}”.</div><button class="btn mt-16" data-go="#/orders">Open orders</button></div>`;
    if (DP.qdFor !== d.id) { DP.qd = null; DP.qdFor = d.id; }
    let tab = p.sub && DTABS.some(t => t[0] === p.sub) ? p.sub : DP.tab[d.id] || defaultTab(d);
    if (tab === 'quote' && VIEW.role === 'ops' && stg(d.stage).group === 'lead') tab = 'overview';
    DP.tab[d.id] = tab;
    const body = { overview: tabOverview, quote: tabQuote, order: tabOrder, billing: tabBilling, activity: tabActivity }[tab](d);
    return `${dealHeader(d)}${dealBanners(d)}${dealLadder(d)}${sopPanel(d)}
      <div class="tabs">${DTABS.filter(([k]) => !(k === 'quote' && VIEW.role === 'ops' && stg(d.stage).group === 'lead')).map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="dealTab" data-t="${k}">${n}${k === 'activity' ? ` <span class="muted">${d.activities.length}</span>` : ''}</button>`).join('')}</div>${body}`;
  },
  mount(root, p) { const d = dealById(p.id); if (!d) return; const t = DP.tab[d.id];
    const lad = root.querySelector('.dlad'), now = lad && lad.querySelector('.now, .lostnow'); if (now && lad.scrollWidth > lad.clientWidth) lad.scrollLeft = now.offsetLeft - lad.clientWidth / 2 + now.offsetWidth / 2; if (t === 'quote') mountQuoteTab(root, d); if (t === 'order') mountOrderTab(root, d); if (t === 'overview') mountOverview(root, d); }
};
ACTIONS.dealTab = el => { const d = curDeal(); DP.tab[d.id] = el.dataset.t; history.replaceState(null, '', `#/deal/${d.id}/${el.dataset.t}`); lastHash = location.hash; render(); };

/* ---------- header, banners, ladder ---------- */
function dealHeader(d) {
  const c = dealContact(d);
  return `<div class="dhead"><div style="min-width:0">
      <h1>${esc(c.name)} ${stagePill(d.stage)} ${intlPill(d)} ${typePill(d)}</h1>
      <div class="dsub"><span class="mono">${d.id}</span>${d.quote_no ? `<span class="mono">${d.quote_no}${d.quote_version > 1 ? ' v' + d.quote_version : ''}</span>` : ''}${d.order_no ? `<span class="mono"><b>${d.order_no}</b></span>` : ''}
        <a href="#/customers/${c.id}">${esc(maskPhone(c.phone) || 'no phone')}</a><span>${esc(c.city)}</span><span>owner <b>${esc(userName(d.owner))}</b></span></div></div>
    <div class="actions">
      <button class="btn" data-act="dealMsg">${icon('wa')}Message</button>
      ${d.calc.total > 0 ? `<button class="btn" data-act="quotePdf">${icon('doc')}Quote PDF</button>` : ''}
      ${(isOrder(d) || d.stage === 'Closed') && canEditOrder() ? `<button class="btn" data-act="pdSheet" title="Karigar order sheet for the manufacturing unit">${icon('printer')}Order sheet</button>` : ''}
      ${can('deals.write') ? `<button class="btn" data-act="dealDup">${icon('copy')}Duplicate</button>` : ''}
      ${isFounder() ? `<button class="btn danger" data-act="dealDel" title="Founders only — goes to the Trash, restorable">Delete…</button>` : ''}
      <button class="btn gold" data-act="dealMove">Move stage ${icon('chevR', 'sm')}</button></div></div>`;
}
function dealBanners(d) {
  const b = [];
  if (d.intl) b.push(`<div class="banner amber">${icon('globe')}<div class="small"><b>International.</b> Export compliance applies — founders sign off before invoicing.</div></div>`);
  if (['Quoted', 'Negotiating'].includes(d.stage) && d.quote_no) {
    if (!quoteValid(d)) b.push(`<div class="banner amber">${icon('clock')}<div class="small grow">The rate on this quote is more than 2 days old (quoted ${fdate(d.quote_date)}). Re-price at today's rate before it is shared again or becomes an order.</div>${can('deals.write') ? `<button class="btn sm" data-act="qReprice">Re-price</button>` : ''}</div>`);
    else if (d.quote_valid_till && TODAY > d.quote_valid_till) b.push(`<div class="banner amber">${icon('clock')}<div class="small">The 24 hours the client was told lapsed ${fdt(d.quote_valid_till)}. The rate can still be honoured until ${fdate(quoteGraceEnd(d))} — re-share the quote or re-price.</div></div>`);
  }
  const v = variance(d);
  if (v && v.status === 'Over — needs client approval' && !d.client_approved_variance) b.push(`<div class="banner red">${icon('alert')}<div class="small"><b>★ Over the estimate by ${v.pct.toFixed(1)}%</b> — the client has not approved. Send O10 and record approval before delivery.</div></div>`);
  return b.length ? `<div class="dbanners">${b.join('')}</div>` : '';
}
function dealLadder(d) {
  const cur = sIdx(d.stage), lost = stg(d.stage).group === 'lost';
  const diedAt = lost ? sIdx((d.hist || []).filter(h => stg(h[0]).group !== 'lost').slice(-1).map(h => h[0])[0] || (d.order_date ? 'Order Confirmed' : d.quote_no ? 'Quoted' : 'Contacted')) : cur;
  return `<div class="dlad">${DSTAGES.filter(s => s.group !== 'lost').map(s => {
    const skip = typeSkips(d).includes(s.key), cls = skip ? 'skip' : lost ? (s.i <= diedAt ? 'done' : '') : s.i < cur ? 'done' : s.i === cur ? 'now' : '';
    return `<button class="${cls}" data-act="dealMoveTo" data-to="${esc(s.key)}" title="${esc(s.help)}">${esc(s.label)}</button>`; }).join('')}${lost ? `<button class="lostnow" data-act="dealMove" title="${esc(stg(d.stage).help)}">${esc(stg(d.stage).label)}</button>` : ''}</div>`;
}

/* ---------- SOP panel: the current stage's checks ---------- */
function chkRow(d, it, stage) {
  const proven = it.rule && it.auto, ticked = !it.system && it.tick && !proven;
  const cls = ['chk', it.system ? 'sys' : '', proven ? 'proven' : '', ticked ? 'ticked' : '', it.system || proven ? 'locked' : 'click'].join(' ');
  const tip = it.system ? (proven ? 'Proven from the record' : `Ticked by the system once the data is on the record — ${it.hint}`) : '';
  return `<div class="${cls}" data-act="dealTick" data-k="${it.key}" data-s="${esc(stage)}" title="${esc(tip)}"><span class="bx">${proven || ticked ? icon('check') : ''}</span>
    <span class="lb">${esc(it.label)}${it.req ? ' <b class="rq">*</b>' : ''}${it.rule && !proven ? `<span class="hint">→ ${esc(it.hint)}</span>` : ''}</span>
    <span class="who">${ticked ? `${esc(userName(it.tick.by))} · ${fdate(it.tick.at)}` : proven ? 'from the record' : ''}</span></div>`;
}
function sopPanel(d) {
  const s = stg(d.stage); if (s.group === 'lost') return '';
  const items = checklistFor(d, d.stage), req = items.filter(i => i.req), done = req.filter(i => i.done).length;
  const nxt = nextStages(d)[0][1][0], up = nxt ? checklistFor(d, nxt.key).filter(i => i.req) : [];
  return `<section class="sop ${DP.sop ? '' : 'closed'}"><div class="sh" data-act="sopToggle"><span class="ref">SOP ${s.sop} · ${esc(s.label)}</span>
    <span class="prog ${req.length && done === req.length ? 'ok' : ''}">${req.length ? `${done} of ${req.length} required done` : 'nothing required here'}</span><span class="tog">${DP.sop ? 'hide' : 'show'}</span></div>
    <div class="sb"><div>${items.length ? items.map(i => chkRow(d, i, d.stage)).join('') : '<div class="small muted">No checklist for this stage.</div>'}</div>
      <div>${nxt ? `<div class="up"><div class="strong ink2" style="margin-bottom:4px">Coming up — ${esc(nxt.label)}</div>${up.length ? up.map(i => `<div class="u">○ ${esc(i.label)}${i.hint ? ` · <span class="xs">${esc(i.hint)}</span>` : ''}</div>`).join('') : '<div class="u">Nothing required.</div>'}</div>` : ''}</div>
      <div class="foot">* required before the deal can leave this stage. Dashed boxes are ticked by the system from the record — the arrow says where the data goes; a pale green tick was proven from data, not ticked by a person.</div></div></section>`;
}
ACTIONS.sopToggle = () => { DP.sop = !DP.sop; try { localStorage.setItem('mq-sop', DP.sop ? '1' : '0'); } catch (_) {} render(); };
ACTIONS.dealTick = el => {
  const d = curDeal(), stage = el.dataset.s, it = checklistFor(d, stage).find(i => i.key === el.dataset.k);
  if (it.system) return toast(it.auto ? `“${it.label}” is proven from the record.` : `“${it.label}” is ticked by the system once the data is on the record — ${it.hint}.`, 'shield');
  if (it.rule && it.auto) return toast('Proven from the record — it cannot be unticked.', 'check');
  if (!(can('deals.write') || can('deals.write.lead') || can('deals.write.order'))) return denied('Your role cannot tick the checklist');
  d.checks[stage] = d.checks[stage] || {};
  if (d.checks[stage][it.key]) { delete d.checks[stage][it.key]; toast('Unticked: ' + it.label, 'undo'); }
  else { d.checks[stage][it.key] = { by: viewUser().id, at: NOW() }; toast('Ticked: ' + it.label, 'check'); }
  render();
};

/* ---------- moving between stages ---------- */
ACTIONS.dealMove = () => {
  const d = curDeal(), cur = stg(d.stage), open = checklistFor(d, d.stage).filter(i => i.req && !i.done);
  const fwd = []; if (cur.group !== 'lost') { let i = cur.i + 1; while (i <= 14 && fwd.length < 3) { const s = DSTAGES[i]; if (!typeSkips(d).includes(s.key)) { fwd.push(s); if (checklistFor(d, s.key).some(x => x.req && !x.rule && !x.done)) break; } i++; } }
  const back = []; for (let i = (cur.group === 'lost' ? 14 : cur.i - 1); i >= 0 && back.length < 2; i--) if (!typeSkips(d).includes(DSTAGES[i].key)) back.push(DSTAGES[i]);
  const lostOpts = cur.group === 'lost' ? [] : DSTAGES.filter(s => s.group === 'lost' && (s.key !== 'Cancelled' || isOrder(d)));
  openModal(`<div class="card-b" style="padding:20px"><h3>Move ${d.id} from “${esc(cur.label)}”</h3>
    ${cur.group === 'lost' ? '' : open.length ? `<div class="banner amber mt-12"><div class="small"><b>Still open on this stage:</b><ul style="margin:6px 0 0 16px;padding:0">${open.map(i => `<li>${esc(i.label)}</li>`).join('')}</ul></div></div>` : `<div class="banner mt-12" style="background:var(--green-bg);border-color:#CFE5D7">${icon('check')}<div class="small">This stage's checklist is complete.</div></div>`}
    ${fwd.length ? `<div class="label mt-16">Forward</div><div class="stack-s mt-8">${fwd.map((s, i) => `<button class="btn ${i ? '' : 'gold'} block" data-act="dealMoveTo" data-to="${esc(s.key)}" style="justify-content:flex-start">→ ${esc(s.label)}</button>`).join('')}</div>` : ''}
    ${back.length ? `<div class="label mt-16">Back</div><div class="row wrap mt-8">${back.map(s => `<button class="btn sm" data-act="dealMoveTo" data-to="${esc(s.key)}">‹ back to ${esc(s.label)}</button>`).join('')}</div>` : ''}
    ${lostOpts.length ? `<div class="label mt-16">Did not proceed</div><div class="row wrap mt-8">${lostOpts.map(s => `<button class="btn sm danger" data-act="dealMoveTo" data-to="${esc(s.key)}">${esc(s.label)}</button>`).join('')}</div>` : ''}
    ${isFounder() && fwd.length ? `<div class="banner mt-16">${icon('key')}<div class="small grow">Founder override: skip the checklist for a reason. It is logged.</div><button class="btn sm" data-act="dealOverride" data-to="${esc(fwd[0].key)}">Override…</button></div>` : ''}
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button></div></div>`);
};
ACTIONS.dealMoveTo = el => {
  const d = curDeal(), to = el.dataset.to, t = stg(to), cur = stg(d.stage);
  if (to === d.stage) return toast('Already at “' + t.label + '”', 'shield');
  const mc = moveCheck(d, to);
  if (mc.role) { closeLayer(); return denied(mc.role); }
  if (t.group === 'lost') return openModal(`<div class="card-b" style="padding:20px"><h3>Why?</h3><p class="small muted mt-8">${to === 'Expired' ? 'Optional — without one it is logged as “No response after follow-ups”.' : 'Give a reason — it is how we learn where deals die.'}</p>
    ${fF('Reason', fPick('reason', 'lost_reasons', '', { blank: '— pick —', id: 'lostR' }))}${fF('Note', fIn('note', '', { ph: 'optional, e.g. which brand they chose', id: 'lostN' }))}
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="dealLostGo" data-to="${esc(to)}">Mark ${esc(t.label)}</button></div></div>`);
  if (t.i < cur.i || cur.group === 'lost') return openModal(`<div class="card-b" style="padding:20px"><h3>Moving back</h3><p class="small muted mt-8">What happened? It goes on the timeline.</p>${fTa('why', '', { rows: 3 }).replace('<textarea', '<textarea id="backWhy"')}
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="dealBackGo" data-to="${esc(to)}">Move back</button></div></div>`);
  if (!mc.ok) {
    const stale = mc.gates.find(g => g.startsWith('The quote has expired'));
    return openModal(`<div class="card-b" style="padding:20px"><h3>Not yet: “${esc(cur.label)}” → “${esc(t.label)}”</h3>
      ${mc.items.length ? `<div class="small mt-12"><b>Before leaving “${esc(stg(mc.items[0].stage).label)}”</b></div><div class="mt-8">${mc.items.map(i => `<div class="chk ${i.system ? 'sys' : ''}"><span class="bx"></span><span class="lb">${esc(i.label)}${i.hint ? `<span class="hint">→ ${esc(i.hint)}</span>` : ''}</span><span class="who">${esc(stg(i.stage).sop)}</span></div>`).join('')}</div>` : ''}
      ${mc.gates.map(g => `<div class="banner red mt-12">${icon('alert')}<div class="small">${esc(g)}</div></div>`).join('')}
      <div class="row wrap mt-16" style="justify-content:flex-end">${stale && can('deals.write') ? `<button class="btn" data-act="qReprice">Re-price at today's rate</button>` : ''}${isFounder() ? `<button class="btn" data-act="dealOverride" data-to="${esc(to)}">${icon('key')}Founder override…</button>` : ''}<button class="btn primary" data-act="close">Got it</button></div></div>`);
  }
  doMove(d, to);
};
function doMove(d, to, reason, override) {
  moveStage(d, to, reason, override); closeLayer(); delete DP.tab[d.id];
  history.replaceState(null, '', '#/deal/' + d.id); lastHash = location.hash; render(); window.scrollTo(0, 0);
  toast(`Now at “${stg(to).label}”`, 'check');
}
ACTIONS.dealLostGo = el => { const d = curDeal(), to = el.dataset.to, r = document.getElementById('lostR').value, n = document.getElementById('lostN').value;
  if (!r && to !== 'Expired') return toast('Give a reason — it is how we learn where deals die.', 'alert');
  doMove(d, to, (r || 'No response after follow-ups') + (n ? ' — ' + n : '')); if (to === 'Lost') toast('Marked Lost. L6 “Door stays open” is ready under Message.', 'check'); };
ACTIONS.dealBackGo = el => doMove(curDeal(), el.dataset.to, document.getElementById('backWhy').value);
ACTIONS.dealOverride = el => openModal(`<div class="card-b" style="padding:20px"><h3>Founder override</h3><p class="small muted mt-8">Why are you skipping the checklist? It is logged as “[founder override]”.</p>${fTa('why', '', { rows: 3 }).replace('<textarea', '<textarea id="ovWhy"')}
  <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="dealOverrideGo" data-to="${esc(el.dataset.to)}">Override</button></div></div>`);
ACTIONS.dealOverrideGo = el => { const w = document.getElementById('ovWhy').value.trim(); if (!w) return toast('Say why — the override is logged.', 'alert'); doMove(curDeal(), el.dataset.to, w, true); };

/* ---------- duplicate and delete ---------- */
ACTIONS.dealDup = () => {
  const s = curDeal();
  const d = mkDeal({ contact: s.contact, type: s.type, stage: 'Qualified', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: s.product_interest, occasion: s.occasion, budget: s.budget, timeline: s.timeline,
    item: s.item, item_label: s.item_label, item_type: s.item_type, size: s.size, purity: s.purity, gold_colour: s.gold_colour, gold_wt: s.gold_wt, making_rate: s.making_rate, extra_stones: s.extra_stones, gst_pct: s.gst_pct, usd_rate: s.usd_rate, usd_spread: s.usd_spread,
    gold_rate_24k: baseRateFor(s.purity), lines: s.lines.map(l => ({ ...l, cert_no: '' })), img: s.img, next_action_at: at(1, '11:00'), next_action: 'Share the second option' });
  d.calc = computeLive(d); d.activities.unshift({ type: 'system', dir: 'out', subject: `Cloned from ${s.id} — Repeat / second option`, body: '', at: NOW(), by: viewUser().id });
  toast('Duplicated as ' + d.id, 'copy'); go('#/deal/' + d.id + '/quote');
};
ACTIONS.dealDel = () => openModal(`<div class="card-b" style="padding:20px"><h3>Delete this deal?</h3><p class="small muted mt-8">Why? It is kept with the record; it goes to Data → Trash and can be restored.</p>${fTa('why', '', { rows: 2 }).replace('<textarea', '<textarea id="delWhy"')}
  <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="dealDelGo">Delete</button></div></div>`);
ACTIONS.dealDelGo = () => {
  const d = curDeal(), why = document.getElementById('delWhy').value.trim();
  if (why.length < 3) return toast('A reason of a few words is needed', 'alert');
  if ((d.stock_issued_codes || []).length && !['Delivered', 'Closed'].includes(d.stage)) return toast('Stones from the safe are issued to this order — return them (Stock) first, then delete.', 'alert');
  d.deleted = true; TRASH.unshift({ entity: 'deal', label: `${d.id} · ${dealContact(d).name}`, sub: dealTitle(d) + ' · ' + stg(d.stage).label, at: NOW(), by: viewUser().id, reason: why, deal: d.id });
  AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'trash_delete', entity: 'deal', entity_id: d.id, detail: why });
  closeLayer(); go('#/pipeline'); toast('Moved to the Trash — restore it from Data → Trash if this was wrong', 'check');
};

/* =================================================================== OVERVIEW */
function tabOverview(d) {
  const c = dealContact(d), ed = canEditLead(d), dis = !ed, m = money(d), st = contactStats(c);
  const last = d.activities.find(a => a.type !== 'system');
  const others = DEALS.filter(x => x.contact === d.contact && x !== d && !x.deleted);
  const sug = aiNextStep(d);
  return `<div class="dbody"><div class="stack">
    ${card('Enquiry', `<div class="fgrid" id="ovForm">
      ${fF('Enquiry date', fIn('enquiry_date', isoDate(d.enquiry), { type: 'date', dis }))}
      ${hides('source_channel') ? '' : fF('Source', fPick('source_channel', 'source_channels', d.source_channel, { noBlank: true, dis }))}
      ${hides('source_code') ? '' : fF('Source code', fPick('source_code', 'source_codes', d.source_code, { dis }))}
      ${fF('Looking for', fPick('product_interest', 'product_interests', d.product_interest, { dis }))}
      ${fF('Occasion', fPick('occasion', 'occasions', d.occasion, { dis }))}
      ${fF('Timeline', fPick('timeline', 'timelines', d.timeline, { dis }))}
      ${hides('budget') ? '' : fF('Budget ₹', fIn('budget', d.budget ? NF.format(d.budget) : '', { inputmode: 'decimal', dis }))}
      ${fRo('International', d.intl ? `<span class="badge red">Yes</span>&nbsp;export compliance applies` : 'No', {})}
      ${fF('Deal type', fSel('type', DEAL_TYPES, d.type, { dis }))}
      ${fF('Owner', fSel('owner', USERS.filter(u => u.active).map(u => [u.id, u.name]), d.owner, { dis }))}
      ${fF('Next action', fIn('next_action', d.next_action, { ph: 'e.g. send oval options', dis }))}
      ${fF('Next action on', fIn('next_action_at', dtLocal(d.next_action_at), { type: 'datetime-local', dis }))}
      ${hides('competitor') ? '' : fF('Competitor / other quotes seen', fPick('competitor', 'competitors', d.competitor, { dis }), { span: 'span2' })}
      ${fF('Notes', fTa('notes', d.notes, { rows: 3, dis }), { span: 'span3' })}</div>`,
      { right: ed ? `<button class="btn sm gold" data-act="ovSave">Save</button>` : `<span class="xs muted">${icon('lock', 'sm')} read-only for ${ROLES[VIEW.role]}</span>` })}
    ${sug ? `<section class="card" style="background:var(--ink);color:#EDE9E2;border-color:var(--ink)"><div class="card-b"><div class="row" style="color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${icon('sparkles', 'sm')} Suggested next step</div>
      <div class="mt-8" style="font-size:14px;line-height:1.55">${sug.text}</div><div class="row wrap mt-12">${sug.btns}</div></div></section>` : ''}
  </div><div class="stack">
    ${card('At a glance', `<dl class="kv glance">
      <dt>Quote total</dt><dd>${d.calc.total ? inr(d.calc.total) : '—'}</dd>
      ${d.order_no || d.order_date ? `<dt>Estimate (locked)</dt><dd>${d.est_cost ? inr(d.est_cost) : '—'}</dd><dt>Actual (QC)</dt><dd>${variance(d) ? inr(variance(d).actual_cost) : '—'}</dd><dt>Paid</dt><dd>${inr(m.paid)}</dd><dt>Balance</dt><dd class="big" style="color:${m.balance > 0.5 ? 'var(--red)' : 'var(--green)'}">${inr(m.balance)}</dd><dt>Promised</dt><dd>${d.promised_date ? fdate(d.promised_date) : '—'}</dd>` : ''}
      ${d.quote_no ? `<dt>Quote shared</dt><dd>${quoteShared(d) ? `v${d.quote_shared_version} · ${viaName(d.quote_shared_via)} · ${fdt(d.quote_sent_at)}` : '<span class="badge amber">not yet</span>'}</dd><dt>Holds till</dt><dd>${d.quote_valid_till ? fdt(d.quote_valid_till) : '—'} ${d.quote_valid_till && TODAY > d.quote_valid_till ? '<span class="badge amber">lapsed</span>' : ''} ${!quoteValid(d) && !d.order_date ? '<span class="badge red">re-price</span>' : ''}</dd>` : ''}
      <dt>Stage since</dt><dd>${agoTxt(d.stage_changed_at)} ago</dd><dt>Last touch</dt><dd>${last ? agoTxt(last.at) + ' ago' : '—'}</dd></dl>`)}
    ${card('Quick log', `<div class="qlog">${[['call', 'Called', 'phone'], ['whatsapp', 'WhatsApp sent', 'wa'], ['whatsapp_in', 'They replied', 'chat'], ['visit', 'Visited', 'pin'], ['note', 'Note', 'edit']].map(([t, n, ic]) => `<button class="btn sm" data-act="dealLog" data-t="${t}">${icon(ic, 'sm')}${n}</button>`).join('')}</div><div class="xs muted mt-8">Every logged interaction resets the next follow-up to ${SETTINGS.followup_default_days} day(s) out unless you pick a date.</div>`)}
    ${card('Client', `<div class="row">${av(c.name, c.color || '#8C6D3F')}<div class="grow" style="min-width:0"><div class="strong">${esc(c.name)}</div><div class="xs muted">${esc(maskPhone(c.phone))} · ${esc(c.city)}${c.country !== 'India' ? ' · ' + esc(c.country) : ''}</div><div class="row wrap mt-8" style="gap:4px">${c.tags.map(t => `<span class="badge gold">${esc(t)}</span>`).join('')}${c.met_in_person ? '<span class="badge out">Met</span>' : ''}<span class="badge out">${esc(c.lifecycle)}</span></div></div><button class="btn sm" data-go="#/customers/${c.id}">Open</button></div>
      ${can('reports') && st.orders_n ? `<div class="xs muted mt-12">${st.orders_n} order${st.orders_n > 1 ? 's' : ''} · lifetime ${inr(st.orders_value)}${st.segments.length ? ' · ' + st.segments.join(', ') : ''}</div>` : ''}`)}
    ${others.length ? card('Other deals for this client', `<div class="list">${others.map(x => `<div class="li" data-go="#/deal/${x.id}"><div class="grow" style="min-width:0"><div class="t truncate">${esc(x.order_no || x.id)} · ${esc(dealTitle(x))}</div></div>${stagePill(x.stage)}</div>`).join('')}</div>`, { flush: true }) : ''}
  </div></div>`;
}
function mountOverview() {}
function aiNextStep(d) {
  const c = dealContact(d), first = c.name.split(' ')[0];
  const msg = (k, label) => `<button class="btn sm gold" data-act="msgSend" data-k="${k}">${icon('wa', 'sm')}${label}</button>`;
  if (d.stage === 'New') return { text: `${first} is waiting for a first reply${slaBadge(d) ? ' and is past the reply SLA' : ''}. Send L1 now; ask for the piece, the occasion and a rough budget.`, btns: msg('L1', 'Draft L1 reply') + `<button class="btn sm" data-act="dealLog" data-t="call" style="color:#EDE9E2;border-color:#3A3835;background:transparent">${icon('phone', 'sm')}Log a call</button>` };
  if (d.stage === 'Contacted') return { text: `Invite ${first} to see stones side by side: a showroom visit or a 15-minute video consult usually lifts conversion.`, btns: msg('L2', 'Draft visit invite') };
  if (d.stage === 'Qualified') return { text: d.calc.total ? `The quote is built at ${inr(d.calc.total)}. Share it (PDF, WhatsApp L3 or in store) to start the 24 hours.` : `Budget ${d.budget ? inr(d.budget) : 'known'} and the brief are in. Build the quote next; the rate sheet fills the stone rates.`, btns: `<button class="btn sm gold" data-go="#/deal/${d.id}/quote">${icon('file', 'sm')}Open the quote</button>` };
  if (d.stage === 'Quoted') return { text: quoteValid(d) ? `Quote ${d.quote_no} is with ${first}. A day-3 follow-up (L4) is the usual next touch.` : `The rate on ${d.quote_no} is stale. Re-price at today's ${inr(SETTINGS.gold_rate_24k)}/g, then re-share.`, btns: quoteValid(d) ? msg('L4', 'Draft follow-up') : `<button class="btn sm gold" data-act="qReprice">Re-price now</button>` };
  if (d.stage === 'Negotiating') { const o = moveCheck(d, 'Order Confirmed'); return { text: o.ok ? `Everything is in for the order. Move it to Order Confirmed.` : `To confirm the order: ${o.items.map(i => i.label.split(':')[0].replace(/^★ /, '')).concat(o.gates).slice(0, 3).join('; ')}.`, btns: money(d).paid > 0 ? `<button class="btn sm gold" data-act="dealMove">Move stage</button>` : `<button class="btn sm gold" data-act="payNew">${icon('coins', 'sm')}Record the advance</button>` }; }
  return null;
}
ACTIONS.ovSave = () => {
  const d = curDeal(), v = fVals(document.getElementById('ovForm'));
  ['source_channel', 'source_code', 'product_interest', 'occasion', 'timeline', 'type', 'owner', 'next_action', 'notes', 'competitor'].forEach(k => { if (k in v) d[k] = v[k]; });
  if ('budget' in v) d.budget = parseMoney(v.budget);
  if (v.enquiry_date) d.enquiry = new Date(v.enquiry_date + 'T11:00:00');
  if (v.next_action_at) d.next_action_at = new Date(v.next_action_at);
  AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'deal_save', entity: 'deal', entity_id: d.id, detail: 'Overview' });
  render(); toast('Saved', 'check');
};

/* ---------- logging interactions (Quick log and the Activity tab) ---------- */
const LOG_TYPES = { call: ['call', 'out', 'Called', 'What was said?'], call_in: ['call', 'in', 'Call received', 'What was said?'], whatsapp: ['whatsapp', 'out', 'WhatsApp sent', 'What did you send?'], whatsapp_in: ['whatsapp', 'in', 'They replied', 'What did they say?'],
  email: ['email', 'out', 'Email', 'Details'], visit: ['visit', 'in', 'Visited', 'What happened in the visit?'], video: ['meeting', 'out', 'Video consult', 'Details'], note: ['note', 'out', 'Note', 'Add a note'] };
ACTIONS.dealLog = el => {
  const [, , label, ask] = LOG_TYPES[el.dataset.t];
  openModal(`<div class="card-b" style="padding:20px"><h3>${label}</h3><div class="field mt-12"><span>${ask}</span><textarea class="textarea" id="logBody" rows="3"></textarea></div>
    ${el.dataset.t === 'note' ? '' : `<div class="field mt-12"><span>Next follow-up <em>pre-filled ${SETTINGS.followup_default_days} day(s) out; change it if the client asked for time</em></span><input class="input" type="date" id="logNext" value="${isoDate(addDays(TODAY, SETTINGS.followup_default_days))}"></div>`}
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="dealLogGo" data-t="${el.dataset.t}">Log</button></div></div>`, '', m => m.querySelector('#logBody').focus());
};
ACTIONS.dealLogGo = el => {
  const d = curDeal(), [type, dir, label] = LOG_TYPES[el.dataset.t], body = document.getElementById('logBody').value, nx = document.getElementById('logNext');
  logAct(d, { type, dir, subject: label, body });
  if (nx) { d.next_action_at = new Date((nx.value || isoDate(addDays(TODAY, 1))) + 'T11:00:00'); d.next_action = 'Follow up'; }
  if (type === 'visit') { dealContact(d).met_in_person = 1; d.met_in_person = 1; }
  closeLayer(); render(); toast(`Logged: ${label}${nx ? ' · follow up ' + fdate(d.next_action_at) : ''}`, 'check');
};

/* =================================================================== QUOTE */
const QFIELDS = ['item', 'item_label', 'item_type', 'size', 'tag_no', 'size_client', 'gold_wt', 'purity', 'gold_colour', 'gold_rate_24k', 'making_rate', 'extra_stones', 'discount_pct', 'gst_pct', 'usd_rate', 'usd_spread'];
const PRICED = ['gold_wt', 'purity', 'gold_rate_24k', 'making_rate', 'extra_stones', 'discount_pct', 'gst_pct'];
function qDraft(d) { if (!DP.qd) { DP.qd = Object.fromEntries(QFIELDS.map(k => [k, d[k]])); DP.qd.lines = d.lines.map(l => ({ ...l })); if (!DP.qd.lines.length && !quoteLocked(d)) DP.qd.lines.push({ shape: 'Round', pcs: 1, ct: 0, quality: 'VS-FG', rate: 0, autoRate: true, size_mm: '', setting: '' }); DP.qd.makingAuto = !d.quote_no; } return DP.qd; }
const qCalc = (d, q) => computeLive({ ...d, ...q, lines: q.lines });
function totalsHtml(d, q) {
  const c = qCalc(d, q), mn = metalName(q.purity);
  const r = (l, v, cls) => `<div class="row between ${cls || ''}"><span>${l}</span><span class="num">${v}</span></div>`;
  return `${r('Diamonds', inr(c.diamond_value))}${r(`${mn} — ${q.gold_wt || 0} g @ ${q.purity}${hides('gold_rate_applied') ? '' : ` (${inr(c.gold_rate_applied)}/g)`}`, inr(c.gold_value))}${r(`Making — ${q.gold_wt || 0} g`, hides('labour') ? '—' : inr(c.labour))}
    ${+q.extra_stones ? r('Extra stones', inr(+q.extra_stones)) : ''}${r('Selling price', inr(c.selling), 'rule strong')}
    ${c.discount_amt ? r(`Discount (${q.discount_pct}% on diamonds)`, '− ' + inr(c.discount_amt), 'disc') : ''}${r(`GST (${q.gst_pct}%)`, inr(c.gst_amt))}
    <div class="row between rule" style="align-items:baseline"><span class="strong">Total payable</span><span class="grand num">${inr(c.total)}</span></div>${r('Approx. USD', '$' + NF.format(c.usd_total), 'muted')}
    ${isFounder() ? `<div class="bb row between"><span>${mn} buyback value (internal)</span><span class="num">${inr(c.buyback_value)}</span></div>` : ''}`;
}
function lineRow(d, l, i, lock) {
  const so = (key, cur, blank) => fPick('', key, cur, { noBlank: !blank, dis: lock }).replace('data-f=""', `data-li="${i}" data-lf="${key === 'diamond_shapes' ? 'shape' : key === 'diamond_qualities' ? 'quality' : 'setting'}"`);
  const inp = (f, v, ph, cls) => `<input class="input ${cls || ''}" data-li="${i}" data-lf="${f}" value="${esc(v ?? '')}" ${ph ? `placeholder="${ph}"` : ''} inputmode="decimal"${lock ? ' readonly' : ''}>`;
  const band = (QUALITY_BANDS.find(b => b.qualities.includes(l.quality)) || {}).label || '', per = l.ct && l.pcs ? l.ct / l.pcs : 0, sb = (SIZE_BANDS.find(([, lo, hi]) => per >= lo && per < hi) || [''])[0];
  return `<tr><td data-l="Shape">${so('diamond_shapes', l.shape)}</td><td data-l="Pcs">${inp('pcs', l.pcs)}</td><td data-l="Carat (total)">${inp('ct', l.ct)}</td><td data-l="Size mm">${inp('size_mm', l.size_mm, 'mm')}</td>
    <td data-l="Quality">${so('diamond_qualities', l.quality)}</td><td data-l="Setting">${so('stone_settings', l.setting, true)}</td>
    <td data-l="Rate / ct">${hides('gold_rate_24k') ? '<div class="ro">—</div>' : `<input class="input ${l.autoRate ? 'auto' : ''}" data-li="${i}" data-lf="rate" value="${l.rate || ''}" title="${l.autoRate ? `Rate sheet · ${esc(band)} · ${esc(sb)}` : 'Typed rate'}" inputmode="decimal"${lock ? ' readonly' : ''}>`}</td>
    <td class="x">${lock ? '' : `<button class="icon-btn" data-act="qLineDel" data-i="${i}" aria-label="Remove line">${icon('x', 'sm')}</button>`}</td></tr>`;
}
function sizeWidget(d, val, dis) {
  const isB = /bangle/i.test(d.item_type || '') || /^Bangle/.test(d.size || '') || /^(IN|INCH)/i.test(val || '');
  const p = parseClientSize(val);
  return `<div class="szw"><div class="label" style="text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--ink-2)">Client's size — their standard; the Indian size fills itself</div>
    <div class="row mt-8" style="gap:6px">${fSel('', isB ? [['IN', 'India (2-2 … 2-12)'], ['MM', 'Inner diameter (mm)'], ['INCH', 'Inner diameter (inches)']] : [['US', 'US / Canada'], ['UK', 'UK / Australia'], ['EU', 'EU / ISO (circ. mm)'], ['JP', 'Japan'], ['MM', 'Inner diameter (mm)']], p ? p.std : isB ? 'IN' : 'US', { dis, id: 'szStd' }).replace('data-f=""', '')}
      <input class="input" id="szVal" value="${esc(p ? p.val : '')}" placeholder="${isB ? 'e.g. 2-4 · 57 · 2.25' : 'e.g. 7 · M½ · 54'}"${dis ? ' readonly' : ''} style="max-width:140px"></div><div class="res" id="szRes"></div></div>`;
}
function sizeVerdict(d, val, size) {
  if (!val) return `<span style="color:var(--amber)">Not recorded yet — an international order needs the client's own size cross-checked.</span>`;
  const sc = sizeCheck({ ...d, intl: true, size, size_client: val }); const p = parseClientSize(val);
  if (!p) return `<span style="color:var(--red)">Give the standard with the size (US 7, UK M, EU 54).</span>`;
  const isB = /^Bangle/.test(size || '') || ['IN', 'INCH'].includes(p.std);
  if (!sc.conv) return `<span style="color:var(--red)">Could not read that ${isB ? 'bangle' : 'ring'} size.</span>`;
  const cv = sc.conv;
  const line = isB ? `${esc(val)} = ${cv.dia} mm inner ⌀ (${cv.inch}″) = <b>Bangle ${cv.size}</b>` : `${esc(val)} = ${cv.dia} mm ⌀ · ${cv.circ} mm around = <b>Ring ${cv.indian}</b> · US ${cv.us} · UK ${cv.uk} · EU ${cv.eu} · JP ${cv.jp}`;
  const between = cv.between ? ` <span style="color:var(--amber)">— between two Indian sizes, confirm with the client</span>` : '';
  const verdict = !size || ['Not applicable', 'Free size'].includes(size) ? ` <span style="color:var(--amber)">— pick the Indian size (or Not applicable)</span>` : sc.ok ? ` <span style="color:var(--green)">✓ matches the record</span>` : ` <span style="color:var(--red)">≠ record ${esc(size)}</span>`;
  return line + between + verdict;
}
function tabQuote(d) {
  const lock = quoteLocked(d), q = qDraft(d), dis = lock, mk = hides('making_rate');
  const ph = d.photos.find(p => p.kind === 'quote');
  return `${lock && d.order_date ? `<div class="banner blue" style="margin-bottom:14px">${icon('lock')}<div class="small">Priced fields are locked — this quote became an order. The estimate is the promise; the actual is recorded at QC.</div></div>` : lock ? `<div class="banner" style="margin-bottom:14px">${icon('lock')}<div class="small">Only roles that edit the whole deal can change the quote. You can still share it.</div></div>` : ''}
  <div class="dbody"><div class="stack" id="qForm">
    ${card('Item', `<div class="fgrid">
      ${fF('Description (internal)', fIn('item', q.item, { dis }), { span: 'span2' })}${fF('Label on the quote', fIn('item_label', q.item_label, { ph: '3ct Solitaire Ladies Ring', dis }), { span: 'span2' })}
      ${fF('Type', fPick('item_type', 'item_types', q.item_type || 'Ring', { noBlank: true, dis }))}${fF('Size', fPick('size', 'sizes', q.size, { dis, id: 'qSize' }))}
      ${fF('Tag no. (ERP)', fIn('tag_no', q.tag_no, { ph: 'e.g. FJ-2207' }))}
      <div class="field"><span>Photo ${ph ? '<em>(replaces)</em>' : ''}</span><button class="btn" data-act="dealPhoto" data-kind="quote"${can('upload') ? '' : ' disabled'}>${icon('camera')}${ph ? 'Replace photo' : 'Attach photo'}</button></div>
      ${d.intl ? `<div class="span3">${sizeWidget(d, q.size_client, dis)}</div>` : ''}</div>
      ${ph ? `<div class="thumbs mt-12"><div class="th"><img src="${img(ph.img, 200)}" alt=""><div class="cap">Quote photo — printed on the PDF</div></div></div>` : ''}`, { right: ph ? `<button class="btn ghost sm" data-act="photoView" data-src="${esc(ph.img)}">open photo ↗</button>` : '' })}
    ${card('Diamonds', `<table class="qlines"><thead><tr><th style="width:17%">Shape</th><th style="width:8%">Pcs</th><th style="width:12%">Carat (total)</th><th style="width:9%">Size mm</th><th style="width:16%">Quality</th><th style="width:15%">Setting</th><th style="width:15%">Rate / ct</th><th></th></tr></thead><tbody id="qLines">${q.lines.map((l, i) => lineRow(d, l, i, lock)).join('')}</tbody></table>
      ${lock ? '' : `<button class="btn sm mt-12" data-act="qLineAdd">${icon('plus', 'sm')}Add stone line</button>`}<div class="xs muted mt-8">Carat is the total for the line, matching the ERP sheet; the sheet rate is looked up per stone (carat ÷ pieces).</div>`,
      { right: can('deals.write') ? '<span class="xs muted">rate / ct fills from the rate sheet — type over it to override</span>' : '' })}
    ${card('Metal, labour & extras', `<div class="fgrid f3">
      ${fF('Net weight (g)', fIn('gold_wt', q.gold_wt, { inputmode: 'decimal', dis }))}
      ${fF('Purity', fSel('purity', PURITIES, q.purity, { dis }))}
      ${fF('Colour', fPick('gold_colour', 'gold_colours', q.gold_colour || 'Yellow', { noBlank: true, dis: dis || ['S925', 'PT950'].includes(q.purity) }))}
      ${fF(baseRateLabel(q.purity), hides('gold_rate_24k') ? '<div class="ro">—</div>' : fIn('gold_rate_24k', q.gold_rate_24k, { inputmode: 'decimal', dis }))}
      ${fF(`Making (₹/g)${q.makingAuto ? ' <em>— from the labour matrix</em>' : ''}`, mk ? '<div class="ro">—</div>' : fIn('making_rate', q.making_rate, { inputmode: 'decimal', dis, cls: q.makingAuto ? 'auto' : '' }))}
      ${fF('Extra stones (₹)', hides('extra_stones') ? '<div class="ro">—</div>' : fIn('extra_stones', q.extra_stones || '', { inputmode: 'decimal', dis }))}
      ${fF('Discount % <em>on the diamond value only</em>', hides('discount_pct') ? '<div class="ro">—</div>' : fIn('discount_pct', q.discount_pct || '', { inputmode: 'decimal', dis }))}
      ${fF('GST %', fIn('gst_pct', q.gst_pct, { inputmode: 'decimal', dis }))}
      ${fF('USD rate', fIn('usd_rate', q.usd_rate, { inputmode: 'decimal' }))}${fF('USD spread', fIn('usd_spread', q.usd_spread, { inputmode: 'decimal' }))}</div>`,
      { right: `<span class="xs muted">24K ₹${NF.format(SETTINGS.gold_rate_24k)}/g · 999 silver ₹${NF.format(SETTINGS.silver_rate_999)}/g · 950 platinum ₹${NF.format(SETTINGS.platinum_rate_950)}/g · ${fdate(new Date(SETTINGS.gold_rate_date))}</span>` })}
  </div><div class="stack stickyc">
    ${card('Totals · live', `<div class="tots" id="qTots">${totalsHtml(d, q)}</div>
      <div class="qbtns">${lock ? '' : `<button class="btn gold full" data-act="qSave">${icon('check')}Save quote</button>`}<button class="btn" data-act="quotePdf">${icon('doc')}PDF</button><button class="btn wa" data-act="msgSend" data-k="L3">${icon('wa')}WhatsApp L3</button>
        <button class="btn" data-act="qInStore" title="The quote was shown to the client in the showroom — say how">${icon('store')}Shared in store…</button>${!lock && d.quote_no ? `<button class="btn" data-act="qReprice" title="New version at today's 24K rate">${icon('refresh')}Re-price</button>` : ''}</div>
      <div class="qnote">${d.quote_no ? `Quote ${d.quote_no} v${d.quote_version} · ${fdate(d.quote_date)} · ${quoteShared(d) ? `shared ${fdt(d.quote_sent_at)} · holds till ${fdt(d.quote_valid_till)}` : 'this version has not reached the client yet — PDF, WhatsApp L3 or Shared in store tick the checklist and start the 24 hours'}` : 'No quote number yet — it is issued on first save with a non-zero total.'}</div>`)}
    ${d.quote_no ? card('Versions · every price the client saw', d.versions.length ? `<div>${d.versions.map(v => `<div class="vrow" data-act="qVersion" data-v="${v.v}"><b class="mono">v${v.v}</b><span class="grow muted small">${fdt(v.at)} · ${esc(userName(v.by))}</span><span class="num strong">${inr(v.total)}</span></div>`).join('')}</div><div class="xs muted mt-8">Click a version to see its breakdown or print that PDF. Versions are kept forever.</div>` : '<div class="small muted">No versions recorded yet — the next save or re-price records one.</div>') : ''}
  </div></div>`;
}
function mountQuoteTab(root, d) {
  const q = qDraft(d), form = root.querySelector('#qForm'), tots = root.querySelector('#qTots');
  const repaint = () => { tots.innerHTML = totalsHtml(d, q); DP.dirty = true; };
  form.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.li != null) {
      const l = q.lines[+t.dataset.li], f = t.dataset.lf;
      if (f === 'rate') { l.rate = parseFloat(t.value) || 0; l.autoRate = t.value === ''; if (l.autoRate) { l.rate = sheetRate(l.shape, l.quality, l.pcs, l.ct) || 0; t.value = l.rate || ''; } t.classList.toggle('auto', l.autoRate); }
      else { l[f] = ['pcs', 'ct'].includes(f) ? (parseFloat(t.value) || 0) : t.value; if (['shape', 'pcs', 'ct', 'quality'].includes(f) && l.autoRate) { l.rate = sheetRate(l.shape, l.quality, l.pcs, l.ct) || 0; const ri = form.querySelector(`[data-li="${t.dataset.li}"][data-lf="rate"]`); if (ri) ri.value = l.rate || ''; } }
      return repaint();
    }
    const f = t.dataset.f; if (!f) return;
    q[f] = ['gold_wt', 'gold_rate_24k', 'making_rate', 'extra_stones', 'discount_pct', 'gst_pct', 'usd_rate', 'usd_spread'].includes(f) ? (parseFloat(t.value) || 0) : t.value;
    if (f === 'making_rate') { q.makingAuto = false; t.classList.remove('auto'); }
    if (f === 'purity' || f === 'item_type') {
      if (f === 'purity' && (GOLD[q.purity] || [])[2] !== (GOLD[d.purity] || [])[2] || f === 'purity' && !d.quote_no) { q.gold_rate_24k = baseRateFor(q.purity); }
      if (q.makingAuto) q.making_rate = sheetMaking(q.purity, q.item_type);
      if (['S925', 'PT950'].includes(q.purity)) q.gold_colour = 'White';
      const keep = DP.qd; render(); DP.qd = keep; return;
    }
    repaint();
  });
  form.addEventListener('change', e => { if (e.target.dataset.li != null || e.target.tagName === 'SELECT') form.dispatchEvent(new Event('input', { bubbles: true })); });
  const std = root.querySelector('#szStd'), val = root.querySelector('#szVal'), res = root.querySelector('#szRes'), size = root.querySelector('#qSize');
  if (val) {
    const upd = () => { q.size_client = val.value.trim() ? `${std.value} ${val.value.trim()}` : ''; const sc = sizeCheck({ ...d, intl: true, size: q.size, size_client: q.size_client });
      if (sc.conv) { const want = sc.conv.size ? 'Bangle ' + sc.conv.size : 'Ring ' + sc.conv.indian; if (opts('sizes').includes(want) && size && !size.disabled) { size.value = want; q.size = want; } }
      res.innerHTML = sizeVerdict(d, q.size_client, q.size); };
    val.addEventListener('input', upd); std.addEventListener('change', upd); if (size) size.addEventListener('change', () => { q.size = size.value; upd(); }); upd();
  }
}
ACTIONS.qLineAdd = () => { const q = DP.qd; q.lines.push({ shape: 'Round', pcs: 1, ct: 0, quality: 'VS-FG', rate: 0, autoRate: true, size_mm: '', setting: '' }); const keep = DP.qd; render(); DP.qd = keep; };
ACTIONS.qLineDel = el => { DP.qd.lines.splice(+el.dataset.i, 1); const keep = DP.qd; render(); DP.qd = keep; };
function qSave(d, silent) {
  const q = DP.qd; if (!q) return;
  const before = JSON.stringify([PRICED.map(k => d[k]), d.lines.map(l => [l.ct, l.rate])]);
  QFIELDS.forEach(k => { d[k] = q[k]; }); d.lines = q.lines.filter(l => (+l.ct || 0) > 0 || (+l.rate || 0) > 0).map(l => ({ ...l }));
  d.calc = computeLive(d);
  const changed = before !== JSON.stringify([PRICED.map(k => d[k]), d.lines.map(l => [l.ct, l.rate])]);
  if (!d.quote_no && d.calc.total > 0) {
    const n = String(DEALS.filter(x => x.quote_no && x.quote_no.includes(isoDate(TODAY).replace(/-/g, ''))).length + 2).padStart(3, '0');
    d.quote_no = 'MQ-' + isoDate(TODAY).replace(/-/g, '') + '-' + n; d.quote_date = NOW(); d.quote_version = 1;
    const eve = NOW(); eve.setHours(18, 0, 0, 0); d.quote_valid_till = new Date(eve.getTime() + 864e5);
    d.versions.unshift({ v: 1, at: NOW(), total: d.calc.total, rate: d.gold_rate_24k, by: viewUser().id });
    logAct(d, { type: 'quote', subject: `Quote ${d.quote_no} v1 saved · ${inr(d.calc.total)}` });
    if (!d.photos.some(p => p.kind === 'quote') && d.img) d.photos.push({ kind: 'quote', img: d.img, at: NOW(), by: viewUser().id, note: 'Reference' });
  } else if (d.quote_no && changed) {
    d.versions.unshift({ v: d.quote_version, at: NOW(), total: d.calc.total, rate: d.gold_rate_24k, by: viewUser().id });
    if (quoteShared(d)) { d.quote_shared_version = null; }
    logAct(d, { type: 'quote', subject: `Quote ${d.quote_no} v${d.quote_version} changed · ${inr(d.calc.total)}` });
  }
  DP.qd = null; DP.dirty = false;
  if (!silent) { render(); toast(d.quote_no ? 'Saved' + (changed && d.quote_sent_at ? ' — the price changed, so share it again' : '') : 'Saved — the quote number is issued once the total is above zero', 'check'); }
}
ACTIONS.qSave = () => qSave(curDeal());
ACTIONS.qReprice = () => {
  const d = curDeal(); if (!d.quote_no) return toast('Save the quotation first', 'alert');
  if (d.order_date) return toast('The quote became an order — its price is locked.', 'lock');
  if (!can('deals.write')) return denied('Your role cannot re-price quotes');
  if (DP.qd) qSave(d, true);
  repriceQuote(d); DP.qd = null; closeLayer(); render(); toast(`Re-priced as v${d.quote_version} at ${inr(d.gold_rate_24k)}/g`, 'refresh');
};
ACTIONS.qInStore = () => {
  const d = curDeal(); if (DP.qd && !quoteLocked(d)) qSave(d, true);
  if (!d.quote_no) return toast('Save the quotation first — it has no number yet.', 'alert');
  if (!quoteValid(d) && !d.order_date) return staleQuote();
  openModal(`<div class="card-b" style="padding:20px"><h3>Shared in store</h3><div class="field mt-12"><span>How was it shown — screen, printout, who was there?</span><textarea class="textarea" id="isNote" rows="3"></textarea></div>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="qInStoreGo">Log</button></div></div>`);
};
ACTIONS.qInStoreGo = () => { const n = document.getElementById('isNote').value.trim(); if (!n) return toast('Say how it was shown in store — screen, printout, who was there.', 'alert'); const d = curDeal(); shareQuote(d, 'in_store', n); closeLayer(); render(); toast('Shared — the 24 hours start now', 'check'); };
const staleQuote = () => openModal(`<div class="card-b" style="padding:20px"><h3>Quote rate is stale</h3><p class="small ink2 mt-8">The rate on this quote is more than 2 days old. Re-price at today's rate and issue a new version first?</p><div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Not now</button><button class="btn gold" data-act="qReprice">Re-price</button></div></div>`);
ACTIONS.qVersion = el => {
  const d = curDeal(), v = d.versions.find(x => x.v === +el.dataset.v);
  openModal(`<div class="card-b" style="padding:20px"><div class="row between"><h3>${d.quote_no} v${v.v}</h3><span class="badge out">${fdate(v.at)}</span></div>
    <p class="small muted mt-8">Recorded ${fdt(v.at)} by ${esc(userName(v.by))} · ${esc(d.item_label || d.item)} · ${d.gold_wt} g ${d.purity} · ${d.lines.map(l => `${l.ct} ct ${l.shape} ${l.quality}`).join(', ')}</p>
    <dl class="kv mt-12"><dt>Metal rate</dt><dd>${hides('gold_rate_24k') ? '—' : inr(v.rate) + '/g'}</dd><dt>Total payable</dt><dd class="tot">${inr(v.total)}</dd></dl>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button><button class="btn" data-act="quotePdf" data-v="${v.v}">${icon('doc')}PDF of v${v.v}</button></div></div>`);
};
ACTIONS.dealPhoto = el => {
  const d = curDeal(), kind = el.dataset.kind;
  if (!can('upload')) return denied('Your role cannot attach photos');
  const pick = { quote: d.img || IMG.rings[2].src, order: IMG.rings[0].src, karigar: d.img || IMG.rings[1].src, qc: d.img || IMG.rings[3].src }[kind];
  d.photos = d.photos.filter(p => !(p.kind === kind && kind !== 'qc'));
  d.photos.push({ kind, img: pick, at: NOW(), by: viewUser().id, note: { quote: 'Quote photo', order: 'Signed order form', karigar: 'Order sheet as issued', qc: 'QC photo' }[kind], doc: kind === 'order' || kind === 'karigar' });
  if (kind === 'karigar') d.karigar_sheet_photo = true;
  logAct(d, { type: 'system', subject: { quote: 'Quote photo attached', order: 'Order form attached', karigar: 'Karigar order sheet attached', qc: 'QC photo attached' }[kind] });
  const keep = DP.qd; render(); DP.qd = keep;
  toast({ quote: 'Photo attached — it shows below and prints on the PDF', order: 'Order form attached', karigar: 'Karigar order sheet attached', qc: 'QC photo uploaded' }[kind], 'camera');
};
ACTIONS.photoView = el => openModal(`<div class="card-b" style="padding:14px"><img src="${img(el.dataset.src, 900)}" alt="" style="width:100%;border-radius:10px"><div class="row mt-12" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button></div></div>`, 'wide');

/* Production: karigars, their jobs and metal */

/* ---------- production (karigars) ----------
   A karigar is a vendor from the Vendors picklist (KARIGARS[].vendor). Their jobs are the DEALS in order stages with
   that vendor; metal out = gold_issued_wt, metal back = QC piece weight + scrap (METAL_RETURNS, or a Receive here);
   stones = STOCK_MOVES rows carrying the vendor. */
const kgOf = v => KARIGARS.find(k => k.vendor === v);
const kgJobs = k => DEALS.filter(d => d.vendor === k.vendor && isOrder(d) && !d.deleted);
const kgInHand = d => sIdx(d.stage) <= sIdx('In Production');
const kgBack = d => d.metal_returned_wt != null ? [d.metal_returned_wt, d.metal_scrap_wt || 0, d.metal_returned_at] : METAL_RETURNS[d.id] ? [...METAL_RETURNS[d.id], (d.qc || [])[0] ? d.qc[0].at : d.ready_at] : null;
const kgFine = (g, purity) => g * (GOLD[purity] || GOLD['18K'])[1];
const kgHeldDays = d => d.gold_issued_at ? Math.max(0, Math.round((dayStart(TODAY) - dayStart(d.gold_issued_at)) / 864e5)) : 0;
function kgStats(k) {
  const jobs = kgJobs(k), hand = jobs.filter(kgInHand);
  const holding = jobs.filter(d => d.gold_issued_wt && !kgBack(d));
  const backs = jobs.filter(d => d.gold_issued_wt && kgBack(d));
  const issued = jobs.reduce((s, d) => s + (d.gold_issued_wt || 0), 0);
  const ret = backs.reduce((s, d) => s + kgBack(d)[0] + kgBack(d)[1], 0);
  const loss = backs.reduce((s, d) => s + Math.max(0, d.gold_issued_wt - kgBack(d)[0] - kgBack(d)[1]), 0);
  const issuedBack = backs.reduce((s, d) => s + d.gold_issued_wt, 0);
  const held = holding.reduce((s, d) => s + d.gold_issued_wt, 0), heldFine = holding.reduce((s, d) => s + kgFine(d.gold_issued_wt, d.purity), 0);
  const stones = hand.reduce((a, d) => { const back = STOCK_MOVES.filter(m => m.deal === d.id && m.kind === 'return'); return [a[0] + (d.diamonds_issued_pcs || 0) - back.reduce((s, m) => s + m.pcs, 0), a[1] + (d.diamonds_issued_ct || 0) - back.reduce((s, m) => s + m.ct, 0)]; }, [0, 0]);
  const late = hand.filter(d => lateBadge(d) === 'late'), overHold = holding.filter(d => k.hold_days && kgHeldDays(d) > k.hold_days);
  return { jobs, hand, holding, backs, issued, ret, loss, lossPct: issuedBack ? loss / issuedBack * 100 : 0, held, heldFine, stones, late, overHold };
}
const kgAlerts = () => KARIGARS.flatMap(k => { const s = kgStats(k); return [...s.late.map(d => ({ k, d, t: `${d.order_no} ${sx_lc1(dealTitle(d))} is ${-daysTo(d.promised_date)} day${-daysTo(d.promised_date) === 1 ? '' : 's'} past its promised date${d.gold_issued_wt ? `, with ${d.gold_issued_wt} g ${d.purity} issued ${kgHeldDays(d)} days ago` : ''}.` })), ...s.overHold.filter(d => !s.late.includes(d)).map(d => ({ k, d, t: `holding ${d.gold_issued_wt} g ${d.purity} for ${kgHeldDays(d)} days on ${d.order_no}, over the ${k.hold_days}-day limit.` }))]; });
const kgDue = d => { const lb = lateBadge(d); return d.promised_date ? (lb === 'late' ? badge(`${-daysTo(d.promised_date)}d late`, 'red', true) : lb === 'soon' ? badge(`Due ${fdate(d.promised_date)}`, 'amber', true) : badge(`Due ${fdate(d.promised_date)}`, 'out')) : ''; };
const KG_LOG = {};
SCREENS.production = {
  title: 'Karigars', nav: 'production',
  render(p) {
    if (p.id) return karigarDetail(p.id);
    const all = KARIGARS.map(k => [k, kgStats(k)]), alerts = kgAlerts();
    const held = all.reduce((s, [, x]) => s + x.heldFine, 0), loss = all.reduce((s, [, x]) => s + x.loss, 0), back = all.reduce((s, [, x]) => s + x.backs.reduce((a, d) => a + d.gold_issued_wt, 0), 0);
    const hand = all.reduce((s, [, x]) => s + x.hand.length, 0), late = all.reduce((s, [, x]) => s + x.late.length, 0);
    return `${pageHead('Karigars and production', 'Metal and stones out with each vendor, what came back and what was lost · from the deals and the stock ledger',
      `<button class="btn" data-act="kgMove" data-dir="receive">${icon('download')}Receive back</button><button class="btn primary" data-act="kgMove" data-dir="issue">${icon('upload')}Issue metal</button>`)}
      <div class="grid g4 kpis">${[['Metal with karigars', grams(held) + ' fine', `${all.filter(([, x]) => x.holding.length).length} karigars holding`], ['Loss on returned jobs', back ? (loss / back * 100).toFixed(2) + '%' : '—', `${grams(loss)} of ${grams(back)} · target under 2%`], ['Jobs in hand', String(hand), late ? `<span class="down">${late} late</span>` : 'none late'], ['On time, 90 days', Math.round(KARIGARS.reduce((s, k) => s + k.ontime, 0) / KARIGARS.length) + '%', 'average across vendors']]
        .map(([k, v, d]) => `<div class="card kpi"><div class="k">${k}</div><div class="v num" style="font-size:22px">${v}</div><div class="d">${d}</div></div>`).join('')}</div>
      ${alerts.map(a => `<div class="banner red mt-16">${icon('alert')}<div class="grow"><b>${esc(a.k.name)}</b>: ${esc(a.t)}</div><a class="btn sm" href="#/production/${a.k.id}">Review</a></div>`).join('')}
      <div class="grid g3 mt-16">${all.map(([k, x]) => `<div class="card" data-go="#/production/${k.id}" style="cursor:pointer"><div class="card-b">
        <div class="row">${av(k.name, k.color)}<div class="grow" style="min-width:0"><div class="strong truncate">${esc(k.name)}</div><div class="small muted truncate">${esc(k.skill)} · ${esc(k.city)}</div></div>${x.late.length ? badge(x.late.length + ' late', 'red', true) : ''}</div>
        <div class="grid g3 mt-16" style="gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))">${[['Jobs', x.hand.length], ['On time', k.ontime + '%'], ['Holding', x.held ? grams(x.held) : '—']].map(([a, b]) => `<div class="pill-rate" style="padding:8px 10px"><span class="xs muted">${a}</span><span class="strong num">${b}</span></div>`).join('')}</div>
        <div class="row between small mt-12"><span class="muted">Loss on returned jobs</span><span class="num ${x.lossPct > 2 ? 'down' : ''}">${x.backs.length ? x.lossPct.toFixed(2) + '%' : '—'}</span></div>
        <div class="bar ${k.ontime < 80 ? 'red' : 'green'} mt-8"><i style="width:${k.ontime}%"></i></div></div></div>`).join('')}</div>`;
  }
};
function karigarDetail(id) {
  const k = karigar(id) || KARIGARS[0], x = kgStats(k), log = KG_LOG[k.id];
  const ledger = [
    ...x.jobs.filter(d => d.gold_issued_at).map(d => ({ at: d.gold_issued_at, t: `Issued ${d.purity} gold`, g: '+' + d.gold_issued_wt.toFixed(2), d })),
    ...x.backs.map(d => { const [pc, sc, a] = kgBack(d); return { at: a || d.ready_at || TODAY, t: `Back: piece ${pc.toFixed(2)} g + scrap ${sc.toFixed(2)} g · loss ${Math.max(0, d.gold_issued_wt - pc - sc).toFixed(2)} g`, g: '−' + (pc + sc).toFixed(2), d }; }),
    ...STOCK_MOVES.filter(m => m.vendor === k.vendor && ['issue', 'return'].includes(m.kind) && m.deal).map(m => { const it = STOCK_ITEMS.find(s => s.id === m.item); return { at: m.at, t: `${m.kind === 'issue' ? 'Stones issued' : 'Stones back'}: ${it.code} · ${Math.abs(m.pcs)} pcs ${Math.abs(m.ct).toFixed(2)} ct`, g: '', d: dealById(m.deal) }; })
  ].sort((a, b) => b.at - a.at);
  return `<div class="row small muted" style="margin-bottom:10px"><a href="#/production">${icon('chevL', 'sm')} Karigars</a></div>
    ${pageHead(esc(k.name), `${esc(k.skill)} · ${esc(k.city)} · vendor “${esc(k.vendor)}”${log ? ` · messaged ${log}` : ''}`, `<button class="btn wa" data-act="kgMsg" data-k="${k.id}">${icon('wa')}Message</button><button class="btn" data-act="kgAssign" data-k="${k.id}">${icon('plus')}Assign a job</button><button class="btn primary" data-act="kgMove" data-dir="issue" data-k="${k.id}">${icon('upload')}Issue</button>`)}
    <div class="grid g4 kpis">${[['Metal issued', grams(x.issued), `${x.jobs.filter(d => d.gold_issued_wt).length} jobs`], ['Returned', grams(x.ret), 'pieces + scrap'], ['Loss', grams(x.loss), x.backs.length ? x.lossPct.toFixed(2) + '% of returned' : 'nothing back yet'], ['Holding now', grams(x.held), x.held ? grams(x.heldFine) + ' fine' + (x.stones[0] ? ` · ${x.stones[0]} stones ${x.stones[1].toFixed(2)} ct` : '') : 'nothing out']].map(([a, b, c]) => `<div class="card kpi"><div class="k">${a}</div><div class="v num" style="font-size:21px">${b}</div><div class="d">${c}</div></div>`).join('')}</div>
    ${kgAlerts().filter(a => a.k === k).map(a => `<div class="banner red mt-16">${icon('alert')}<div class="grow">${esc(a.t[0].toUpperCase() + a.t.slice(1))}</div><button class="btn sm" data-go="#/deal/${a.d.id}/order">Open ${esc(a.d.order_no)}</button></div>`).join('')}
    <div class="grid g2 mt-16">
      ${card('Jobs in hand', x.hand.length ? `<div class="list">${x.hand.map(d => `<div class="li" data-go="#/deal/${d.id}/order"><img class="thumb" src="${img(d.img, 120)}" alt=""><div class="grow" style="min-width:0"><div class="t truncate">${esc(dealTitle(d))}</div><div class="s">${esc(d.order_no || d.id)} · ${esc(dealContact(d).name)}${d.production_stage && d.stage === 'In Production' ? ' · ' + esc(d.production_stage) : ''}</div><div class="row mt-8" style="gap:6px">${stagePill(d.stage)}${d.gold_issued_wt && !kgBack(d) ? `<span class="xs muted num">${d.gold_issued_wt} g ${d.purity} out · ${kgHeldDays(d)}d</span>` : '<span class="xs muted">no metal out</span>'}</div></div><div class="tr">${kgDue(d)}</div></div>`).join('')}</div>`
        : `<div class="empty">No jobs in hand</div><div class="card-b" style="padding-top:0"><button class="btn block" data-act="kgAssign" data-k="${k.id}">${icon('plus')}Assign karigar to a job</button></div>`, { flush: true, right: `<span class="small muted">${x.backs.length} back</span>` })}
      ${card('Metal and stone ledger', ledger.length ? `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Date</th><th>Move</th><th class="num">Gold g</th><th>Order</th></tr></thead><tbody>
        ${ledger.map(r => `<tr data-go="#/deal/${r.d.id}/order"><td class="muted m-hide" style="white-space:nowrap">${fdate(r.at)}</td><td>${esc(r.t)}<div class="xs muted only-m">${fdate(r.at)} · ${esc(r.d.order_no || r.d.id)}</div></td><td class="num">${r.g}</td><td class="mono m-hide" style="white-space:nowrap">${esc(r.d.order_no || r.d.id)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing issued yet</div>', { flush: true })}
    </div>`;
}
/* issue metal to a job, or receive the piece and scrap back */
const kgPickable = (k, dir) => DEALS.filter(d => isOrder(d) && (!k || d.vendor === k.vendor) && (dir === 'issue' ? kgInHand(d) && d.vendor && !['Stock', 'Buyback'].includes(d.type) : d.gold_issued_wt && !kgBack(d)));
ACTIONS.kgMove = el => {
  const dir = el.dataset.dir, k0 = karigar(el.dataset.k);
  const opts = k => kgPickable(k, dir).map(d => `<option value="${d.id}">${esc(d.order_no || d.id)} · ${esc(dealTitle(d))}${dir === 'issue' && d.gold_issued_wt ? ' (top-up)' : ''}</option>`).join('');
  const first = KARIGARS.find(k => kgPickable(k, dir).length) || KARIGARS[0], k = k0 || first;
  openSheet({ title: dir === 'issue' ? 'Issue metal to karigar' : 'Receive back from karigar', sub: 'Signed by the karigar with an OTP · recorded on the deal',
    body: `<div class="fgrid"><label class="field full"><span>Karigar</span><select class="select" id="kgK">${KARIGARS.map(x => `<option value="${x.id}" ${x === k ? 'selected' : ''}>${esc(x.name)} · ${kgPickable(x, dir).length} job${kgPickable(x, dir).length === 1 ? '' : 's'}</option>`).join('')}</select></label>
      <label class="field full"><span>Job</span><select class="select" id="kgD">${opts(k) || '<option value="">No job to ' + (dir === 'issue' ? 'issue to' : 'receive from') + '</option>'}</select></label>
      ${dir === 'issue' ? `<label class="field"><span>Gross weight issued (g)</span><input class="input num" id="kgG" inputmode="decimal"></label><label class="field"><span>Fine gold</span><input class="input num" id="kgF" readonly></label>`
        : `<label class="field"><span>Finished piece (g)</span><input class="input num" id="kgP" inputmode="decimal"></label><label class="field"><span>Scrap and dust returned (g)</span><input class="input num" id="kgS" value="0.30" inputmode="decimal"></label><label class="field full"><span>Loss</span><input class="input num" id="kgL" readonly></label>`}</div>
      <div class="card soft mt-16"><div class="card-b small" id="kgInfo"></div></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="kgMoveSave" data-dir="${dir}">Send OTP and record</button>`,
    onMount(sh) {
      const $ = s => sh.querySelector(s);
      const sync = () => {
        const d = dealById($('#kgD').value); if (!d) { $('#kgInfo').innerHTML = 'Nothing to record for this karigar.'; return; }
        if (dir === 'issue') { const g = parseFloat($('#kgG').value) || 0; $('#kgF').value = (kgFine(g, d.purity)).toFixed(3) + ' g (' + d.purity + ')'; $('#kgInfo').innerHTML = `${icon('scale', 'sm')} ${esc(dealTitle(d))}: estimate ${d.est_weight || d.gold_wt} g ${d.purity} ${d.gold_colour ? d.gold_colour.toLowerCase() : ''}; casting allowance about 8%.${d.gold_issued_wt ? ` Already out: ${d.gold_issued_wt} g.` : ''}`; }
        else { const pc = parseFloat($('#kgP').value) || 0, sc = parseFloat($('#kgS').value) || 0, l = d.gold_issued_wt - pc - sc; $('#kgL').value = `${l.toFixed(2)} g · ${(l / d.gold_issued_wt * 100).toFixed(2)}%`; $('#kgL').style.color = l / d.gold_issued_wt > 0.02 ? 'var(--red)' : ''; $('#kgInfo').innerHTML = `${icon('scale', 'sm')} Issued ${d.gold_issued_wt} g ${d.purity} on ${fdate(d.gold_issued_at)}. Loss over 2% needs a note on the deal.`; }
      };
      const fill = () => { const d = dealById($('#kgD').value); if (d) { if (dir === 'issue') $('#kgG').value = (Math.round((d.est_weight || d.gold_wt || 3) * 1.08 * 100) / 100).toFixed(2); else $('#kgP').value = (d.gold_issued_wt - (parseFloat($('#kgS').value) || 0) - d.gold_issued_wt * 0.012).toFixed(2); } sync(); };
      $('#kgK').addEventListener('change', () => { $('#kgD').innerHTML = opts(karigar($('#kgK').value)) || '<option value="">No job here</option>'; fill(); });
      $('#kgD').addEventListener('change', fill); sh.addEventListener('input', sync); fill();
    } });
};
ACTIONS.metalMove = ACTIONS.kgMove;
ACTIONS.kgMoveSave = el => {
  const dir = el.dataset.dir, d = dealById(document.getElementById('kgD').value), k = karigar(document.getElementById('kgK').value), otp = 1000 + Math.floor(Math.random() * 9000);
  if (!d) return toast('Pick a job first', 'alert');
  if (dir === 'issue') {
    const g = parseFloat(document.getElementById('kgG').value); if (!(g > 0)) return toast('Enter the weight issued', 'alert');
    const total = Math.round(((d.gold_issued_wt || 0) + g) * 100) / 100;
    issueMetal(d, total, d.gold_issued_wt ? `Top-up of ${g} g` : 'Issued from the Karigars screen'); sx_restamp(d, ['gold_issued_at']);
    closeLayer(); render(); toast(`${g} g ${d.purity} issued to ${k.name} for ${d.order_no || d.id} · OTP ${otp} signed`, 'upload');
  } else {
    const pc = parseFloat(document.getElementById('kgP').value), sc = parseFloat(document.getElementById('kgS').value) || 0;
    if (!(pc > 0)) return toast('Enter the finished piece weight', 'alert');
    const l = Math.round((d.gold_issued_wt - pc - sc) * 100) / 100;
    Object.assign(d, { metal_returned_wt: pc, metal_scrap_wt: sc, metal_returned_at: sx_now() });
    logAct(d, { type: 'system', subject: `Metal back from ${k.name}: piece ${pc} g + scrap ${sc} g · loss ${l} g (${(l / d.gold_issued_wt * 100).toFixed(2)}%)`, body: '', at: sx_now() });
    closeLayer(); render(); toast(`Received ${d.order_no || d.id} from ${k.name} · loss ${l} g · OTP ${otp} signed`, 'download');
  }
};
ACTIONS.metalDone = () => { closeLayer(); toast('Recorded · karigar signed with OTP'); };
ACTIONS.kgMsg = el => {
  const k = karigar(el.dataset.k), x = kgStats(k);
  const text = `${sx_first(k.name)} ji, namaste. Update please:\n${x.hand.map(d => `• ${d.order_no} ${sx_lc1(dealTitle(d))}: ${stg(d.stage).label.toLowerCase()}${d.production_stage && d.stage === 'In Production' ? ' (' + d.production_stage.toLowerCase() + ')' : ''}, due ${fdate(d.promised_date)}${lateBadge(d) === 'late' ? ' (late, need a new date today)' : ''}`).join('\n') || '• No open jobs right now. Can you take a new one this week?'}\nPhotos on WhatsApp when you can. Thank you.`;
  openSheet({ title: 'Message ' + esc(k.name), sub: `WhatsApp · ${esc(VIEW.role === 'marketing' ? maskPhone(k.phone) : k.phone)}`,
    body: `<label class="field"><span>Message</span><textarea class="textarea" id="kgTxt" style="min-height:180px">${esc(text)}</textarea></label><div class="small muted mt-12">${icon('chat', 'sm')} Karigars are not clients: this message is not logged on any deal timeline, only here.</div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn wa" data-act="kgMsgSend" data-k="${k.id}">${icon('send')}Send</button>` });
};
ACTIONS.kgMsgSend = el => { const k = karigar(el.dataset.k); if (!document.getElementById('kgTxt').value.trim()) return toast('Type a message first', 'edit'); KG_LOG[k.id] = 'today ' + sx_hm(sx_now()); closeLayer(); render(); toast(`Sent to ${k.name} on WhatsApp`, 'wa'); };
ACTIONS.kgAssign = el => {
  const k = karigar(el.dataset.k), open = DEALS.filter(d => isOrder(d) && kgInHand(d) && !d.vendor && !['Stock', 'Buyback'].includes(d.type));
  openSheet({ title: 'Assign a job to ' + esc(k.name), sub: 'Confirmed orders that have no vendor yet. An order cannot leave Order Confirmed without one.',
    body: open.length ? `<div class="card"><div class="list">${open.map(d => `<div class="li" style="cursor:default"><img class="thumb" src="${img(d.img, 120)}" alt=""><div class="grow" style="min-width:0"><div class="t">${esc(dealTitle(d))}</div><div class="s">${esc(d.order_no || d.id)} · ${esc(dealContact(d).name)} · due ${fdate(d.promised_date)}</div><div class="mt-8">${stagePill(d.stage)}</div></div><button class="btn sm primary" data-act="kgAssignDo" data-d="${d.id}" data-k="${k.id}">Assign</button></div>`).join('')}</div></div>`
      : `<div class="empty">Every confirmed order already has a vendor.</div>`,
    foot: '<button class="btn" data-act="close">Close</button>' });
};
ACTIONS.kgAssignDo = el => {
  const d = dealById(el.dataset.d), k = karigar(el.dataset.k);
  d.vendor = k.vendor; logAct(d, { type: 'system', subject: `Vendor assigned: ${k.vendor}`, body: '', at: sx_now() });
  AUDIT.unshift({ at: sx_now(), user: viewUser().id, action: 'deal_update', entity: 'deal', entity_id: d.id, detail: 'vendor → ' + k.vendor });
  closeLayer(); render(); toast(`${d.order_no || d.id} assigned to ${k.name} · the order sheet can print once nothing is missing`, 'hammer');
};

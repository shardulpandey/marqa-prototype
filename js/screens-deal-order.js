/* The deal record, continued: Order & QC, Billing, Activity, the message panel, and the printed outputs
   (quotation PDF, karigar order sheet). */

/* =================================================================== ORDER & QC */
function tabOrder(d) {
  const m = money(d), ed = canEditOrder(), dis = !ed;
  if (!d.order_date && stg(d.stage).group !== 'order') return `<div class="dbody"><div class="stack">${card('Not an order yet', `<p class="small ink2" style="line-height:1.6;margin:0 0 12px">This becomes an order when the client says yes <b>and the advance is recorded</b> — then move it to <b>Order Confirmed</b>. That step locks the estimate (${d.calc.total ? inr(d.calc.total) : 'the quote total'}) and starts the six-stage production SOP; the ERP order number is typed in on this tab once it exists.</p>
      <div class="banner ${m.paid > 0 ? '' : 'amber'}" style="margin-bottom:14px">${icon('coins')}<div class="small">${m.paid > 0 ? `Advance on record: <b>${inr(m.advance || m.paid)}</b>.` : '<b>No advance recorded yet.</b>'}</div></div>
      <div class="fgrid" id="preForm">
        ${fF('Payment terms <em>needed before confirming</em>', fPick('payment_terms', 'payment_terms', d.payment_terms, { dis }))}
        ${fF('Vendor / manufacturer', fPick('vendor', 'vendors', d.vendor, { blank: '— pick —', dis }))}
        ${fF('Promised date <b class="req"></b> <em>— 7 days or more</em>', fIn('promised_date', isoDate(d.promised_date), { type: 'date', dis, min: isoDate(TODAY) }))}
        ${isFounder() ? fF('Promise write-off reason (founders) <em>— only for a promise under 7 days</em>', fIn('promise_override_reason', d.promise_override_reason, {})) : ''}
        ${fF('Design spec / vision', fTa('design_spec', d.design_spec, { rows: 3, dis }), { span: 'span3' })}</div>
      <div class="row mt-16">${ed || can('deals.write') ? `<button class="btn" data-act="preSave">Save</button>` : ''}${can('payments.write') && !(m.paid > 0) ? `<button class="btn gold" data-act="payNew" data-kind="Advance">${icon('coins')}Record the advance</button>` : ''}</div>`)}</div>
    <div class="stack">${card('What confirms an order', `<ul class="small ink2" style="padding-left:18px;margin:0;line-height:1.8">${checklistFor(d, 'Negotiating').filter(i => i.req).map(i => `<li style="color:${i.done ? 'var(--green)' : 'inherit'}">${i.done ? '✓' : '○'} ${esc(i.label.replace(/^★ /, ''))}</li>`).join('')}</ul>`)}</div></div>`;
  const pm = pdMissing(d), v = variance(d), mil = [['CAD sent', d.cad_sent_at], ['CAD approved', d.cad_approved_at], ['production', d.production_started_at], ['QC passed', d.qc_passed_at], ['ready', d.ready_at], ['dispatched', d.dispatched_at], ['delivered', d.delivered_at]];
  const qcOpen = ['In Production', 'QC', 'Ready'].includes(d.stage) && can('qc.write');
  const tplHere = TEMPLATES.filter(t => t.stage === d.stage || (d.stage === 'In Production' && ['O4', 'O5'].includes(t.key)) || (d.stage === 'QC' && ['O9', 'O10'].includes(t.key)));
  const byKind = k => d.photos.filter(p => p.kind === k);
  return `<div class="dbody"><div class="stack">
    ${card(`Order ${esc(d.order_no || '')}`, `<div class="fgrid f3" id="ordForm">
      ${fF(`ERP order no.${d.order_no ? '' : ' <em style="color:var(--amber)">— required to move on</em>'}`, fIn('order_no', d.order_no, { ph: 'from the ERP', dis }))}
      ${fRo('Order date', d.order_date ? fdate(d.order_date) : '—')}
      ${fF('Promised date <b class="req"></b>', fIn('promised_date', isoDate(d.promised_date), { type: 'date', dis }))}
      ${fRo('Estimate (locked)', d.est_cost ? inr(d.est_cost) : '—')}
      ${fF('Est. weight g', fIn('est_weight', d.est_weight, { inputmode: 'decimal', dis }))}
      ${fF('Vendor / manufacturer', fPick('vendor', 'vendors', d.vendor, { blank: '— pick —', dis }))}
      ${fF('Payment terms', fPick('payment_terms', 'payment_terms', d.payment_terms, { dis }))}
      ${fF('Special requests', fIn('special_requests', d.special_requests, { dis }), { span: 'span2' })}
      ${fF('Design spec / vision <em>(what we are making)</em>', fTa('design_spec', d.design_spec, { rows: 2, dis }), { span: 'span3' })}
      <label class="field"><span>Premium materials flagged</span><span class="row" style="height:38px"><span class="switch"><input type="checkbox" data-f="premium_materials"${d.premium_materials ? ' checked' : ''}${dis ? ' disabled' : ''}><span></span></span></span></label>
      ${fF('Production sub-stage', fSel('production_stage', PROD_SUBSTAGES, d.production_stage, { blank: '—', dis }))}
      ${fRo('CAD revisions', d.cad_revisions || 0)}
      ${fF('Client approved variance', fSel('client_approved_variance', [['', 'No'], ['1', 'Yes']], d.client_approved_variance ? '1' : '', { dis }))}
      ${fF('Delivery method', fPick('delivery_method', 'delivery_methods', d.delivery_method, { dis }))}
      ${fF('Courier', fPick('courier', 'couriers', d.courier, { dis }))}
      ${fF('Tracking no.', fIn('tracking_no', d.tracking_no, { dis }))}
      ${fF('HUID', fIn('huid', d.huid, { dis }))}
      ${fF('Certificate no(s).', fIn('cert_nos', d.cert_nos, { dis }))}
      ${isFounder() ? fF('Close-override reason (founders)', fIn('close_override_reason', d.close_override_reason, { ph: 'only if closing with a balance' })) + fF('Promise write-off reason (founders)', fIn('promise_override_reason', d.promise_override_reason, { ph: 'only for a promise under 7 days' })) : ''}
      <div class="field"><span>Order form <em>photo of the signed form</em></span><button class="btn" data-act="dealPhoto" data-kind="order"${can('upload') && ed ? '' : ' disabled'}>${icon('camera')}${byKind('order').length ? 'Replace' : 'Attach'}</button></div>
      <div class="field"><span>Karigar order sheet <em>photo as issued</em></span><button class="btn" data-act="dealPhoto" data-kind="karigar"${can('upload') && ed ? '' : ' disabled'}>${icon('camera')}${byKind('karigar').length ? 'Replace' : 'Attach'}</button></div></div>
      <div class="xs muted mt-16" style="line-height:1.7">${mil.map(([n, t]) => `${n} <b class="ink2">${t ? fdt(t) : '—'}</b>`).join(' · ')}</div>
      <div class="banner mt-12 ${d.gold_issued_at && d.diamonds_issued_at ? '' : 'amber'}">${icon('scale')}<div class="small grow">${d.gold_issued_at ? `${d.purity} ${d.gold_issued_wt} g issued ${fdt(d.gold_issued_at)}` : 'metal not issued yet'} · ${d.diamonds_issued_at ? `diamonds ${d.diamonds_issued_pcs} pcs / ${d.diamonds_issued_ct} ct issued ${fdt(d.diamonds_issued_at)}${(d.stock_issued_codes || []).length ? ` · from stock: ${d.stock_issued_codes.map(c => can('stock') ? `<a href="#/stock/${(STOCK_ITEMS.find(s => s.code === c) || {}).id || ''}">${c}</a>` : c).join(', ')}` : ''}` : 'diamonds not issued yet'}. Both are needed before casting.</div>${typeof kgOf === 'function' && kgOf(d.vendor) ? `<button class="btn sm" data-go="#/production/${kgOf(d.vendor).id}">${icon('hammer', 'sm')}Karigar</button>` : ''}${can('demand') ? `<button class="btn sm" data-go="#/demand">Demand panel</button>` : ''}</div>`,
      { right: ed ? `<button class="btn sm gold" data-act="ordSave">Save</button>` : `<span class="xs muted">${icon('lock', 'sm')} read-only</span>` })}
    ${card('Karigar order sheet', `${pm.length ? `<div class="banner amber">${icon('alert')}<div class="small"><b>Before it can be printed, the sheet still needs:</b> ${pm.map(esc).join(' · ')}</div></div>` : `<div class="banner" style="background:var(--green-bg);border-color:#CFE5D7">${icon('check')}<div class="small">Everything the manufacturing unit needs is on the record.${d.pd_sheet_at ? ` Last issued ${fdt(d.pd_sheet_at)}.` : ''} Attach a photo of the sheet once it has gone out (above).</div></div>`}
      <div class="fgrid f3 mt-12" id="pdForm">
        ${fF('Urgent production', fSel('urgent', [['', 'No'], ['1', 'Yes']], d.urgent ? '1' : '', { dis }))}
        ${fF('Centre stone', fIn('centre_stone', d.centre_stone, { ph: 'e.g. 1.02 ct round VS-FG', dis }))}
        ${fF('Plating / rhodium', fPick('plating', 'platings', d.plating, { dis }))}
        ${fF('Finish / texture', fPick('finish', 'finishes', d.finish, { dis }))}
        ${fF(`Ring size${can('deals.write') ? '' : ' <em>(on the quote)</em>'}`, fPick('size', 'sizes', d.size, { dis: !can('deals.write') }))}
        ${fF('Chain length', fIn('chain_length', d.chain_length, { ph: 'e.g. 18 in', dis }))}
        ${fF('Chain weight', fIn('chain_weight', d.chain_weight, { ph: 'g', dis }))}
        ${fF('Earring post length', fIn('post_length', d.post_length, { ph: 'mm', dis }))}
        ${fF('Earring post type', fPick('post_type', 'post_types', d.post_type, { dis }))}
        <div class="field span3"><span>Special techniques</span><div class="chips">${opts('techniques').map(t => `<button class="chip ${(d.techniques || []).includes(t) ? 'on' : ''}" data-act="pdTech" data-t="${esc(t)}"${dis ? ' disabled' : ''}>${esc(t)}</button>`).join('')}</div></div>
        ${fF('Other technique details', fIn('technique_details', d.technique_details, { dis }), { span: 'span3' })}
        ${d.intl ? `<div class="span3">${sizeWidget(d, d.size_client, !can('deals.write'))}</div>` : ''}</div>
      <div class="label mt-16">Stone specs <span style="text-transform:none;letter-spacing:0;font-weight:400">— size in mm, setting and certificate per line; the priced columns stay as quoted</span></div>
      ${d.lines.length ? `<div class="tbl-wrap mt-8"><table class="tbl"><thead><tr><th>Shape</th><th class="num">Pcs</th><th class="num">Ct</th><th>Quality</th><th>Size mm</th><th>Setting</th><th>Cert / other</th></tr></thead><tbody id="specRows">${d.lines.map((l, i) => `<tr style="cursor:default"><td>${esc(l.shape)}</td><td class="num">${l.pcs}</td><td class="num">${(+l.ct).toFixed(2)}</td><td>${esc(l.quality)}</td>
        <td><input class="input" style="height:32px;width:90px" data-si="${i}" data-sf="size_mm" value="${esc(l.size_mm || '')}"${dis ? ' readonly' : ''}></td><td>${fPick('', 'stone_settings', l.setting, { dis }).replace('data-f=""', `data-si="${i}" data-sf="setting" style="height:32px;min-width:130px"`)}</td><td><input class="input" style="height:32px;width:130px" data-si="${i}" data-sf="cert_no" value="${esc(l.cert_no || '')}"${dis ? ' readonly' : ''}></td></tr>`).join('')}</tbody></table></div>` : '<div class="small muted mt-8">No stone lines on the quote.</div>'}`,
      { right: ed ? `<div class="row"><button class="btn sm" data-act="pdSave">Save</button><button class="btn sm gold" data-act="pdSheet">${icon('printer', 'sm')}Order sheet PDF</button></div>` : '' })}
    ${qcOpen ? qcCard(d) : ''}
  </div><div class="stack">
    ${card(`Photos · ${d.photos.length} on this order`, d.photos.length ? [['quote', 'Quote photo'], ['order', 'Signed order form'], ['karigar', 'Karigar order sheet (as issued)'], ['qc', 'QC photos']].filter(([k]) => byKind(k).length).map(([k, n]) => `<div class="label mt-8">${n}</div><div class="thumbs mt-8">${byKind(k).map(p => `<div class="th">${p.doc ? `<div class="doc" data-act="photoView" data-src="${esc(p.img)}" style="cursor:pointer">${icon('doc')}</div>` : `<img src="${img(p.img, 200)}" alt="" data-act="photoView" data-src="${esc(p.img)}" style="cursor:pointer">`}<div class="cap">${fdt(p.at)} · ${esc(userName(p.by))}</div></div>`).join('')}</div>`).join('') : '<div class="small muted">No photos yet — the quote photo, the signed order form, the karigar sheet and QC photos all land here.</div>')}
    ${card('Estimate vs actual ★', `<dl class="kv"><dt>Estimate (at confirmation)</dt><dd>${d.est_cost ? inr(d.est_cost) : '—'}</dd><dt>Actual (at QC)</dt><dd>${v ? inr(v.actual_cost) : '—'}</dd>
      <dt>Variance</dt><dd style="color:${v ? (Math.abs(v.pct) > v.tol ? 'var(--red)' : 'var(--green)') : 'inherit'}">${v ? (v.pct > 0 ? '+' : '') + v.pct.toFixed(1) + '%' : '—'}</dd><dt>Weight est → actual</dt><dd>${v ? `${v.est_weight} g → ${v.actual_weight} g` : '—'}</dd>
      <dt>Budget status</dt><dd class="tot" style="color:${v && v.status.startsWith('Over') ? 'var(--red)' : 'inherit'}">${v ? v.status : 'pending QC'}</dd></dl><div class="xs muted mt-8">±${SETTINGS.weight_tolerance_pct}% tolerance. Over the estimate → the client approves before delivery (template O10), never after.</div>`)}
    ${card('QC history', d.qc.length ? d.qc.slice().reverse().map(q => `<div style="padding:8px 0;border-bottom:1px solid var(--line-2)"><div class="row between"><b>Attempt ${q.attempt} · <span style="color:${q.status === 'Pass' ? 'var(--green)' : 'var(--red)'}">${q.status}</span></b><span class="xs muted">${fdt(q.at)} · ${esc(userName(q.by))}</span></div><div class="xs muted">${q.actual_weight} g${q.actual_cost ? ' · ' + inr(q.actual_cost) : ''}</div>${q.notes ? `<div class="small mt-8">${esc(q.notes)}</div>` : ''}</div>`).join('') : '<div class="small muted">No QC recorded yet.</div>')}
    ${card('Stage messages', tplHere.length ? `<div class="row wrap">${tplHere.map(t => `<button class="btn sm gold" data-act="msgSend" data-k="${t.key}">${t.key} ${esc(t.name)}</button>`).join('')}</div>` : '<div class="small muted">—</div>')}
  </div></div>`;
}
function mountOrderTab(root, d) {
  const std = root.querySelector('#szStd'), val = root.querySelector('#szVal'), res = root.querySelector('#szRes');
  if (val) { const upd = () => { const sc = val.value.trim() ? `${std.value} ${val.value.trim()}` : ''; DP.szPending = sc; res.innerHTML = sizeVerdict(d, sc, (root.querySelector('#pdForm [data-f="size"]') || {}).value || d.size); }; val.addEventListener('input', upd); std.addEventListener('change', upd); upd(); }
  root.querySelectorAll('.qci input').forEach(cb => cb.addEventListener('change', () => { const s = DP.qc[d.id] = DP.qc[d.id] || {}; s[cb.dataset.q] = cb.checked; const n = Object.values(s).filter(Boolean).length; const c = root.querySelector('#qcCount'); if (c) c.textContent = n + ' of 33 ticked'; }));
}
function savePromise(d, val) {
  if (!val) { if (d.order_date && d.promised_date) { toast('An order keeps its promised date — move it, do not clear it.', 'alert'); return false; } d.promised_date = null; return true; }
  const nd = new Date(val + 'T18:00:00');
  if (dayStart(nd) < dayStart(TODAY)) { toast('The promised date cannot be in the past.', 'alert'); return false; }
  if (!d.order_date && (nd - dayStart(TODAY)) / 864e5 < PROMISE_MIN_DAYS) {
    if (!isFounder()) { toast('A promise under 7 days needs a founder\'s write-off — ask a founder to set the date with a reason.', 'alert'); return false; }
    const r = (document.querySelector('[data-f="promise_override_reason"]') || {}).value; if (!r) { toast('A promise under 7 days needs a write-off reason.', 'alert'); return false; } d.promise_override_reason = r;
  }
  if (d.order_date && d.promised_date && isoDate(d.promised_date) !== val) {
    const why = prompt(`Moving the promised date\n${fdate(d.promised_date)} → ${fdate(nd)} — why? It goes on the timeline.`);
    if (!why) { toast('The order is confirmed — say why the promised date moves.', 'alert'); return false; }
    logAct(d, { type: 'system', subject: `Promised date moved ${fdate(d.promised_date)} → ${fdate(nd)}`, body: why });
  }
  d.promised_date = nd; return true;
}
ACTIONS.preSave = () => { const d = curDeal(), v = fVals(document.getElementById('preForm')); if (!savePromise(d, v.promised_date)) return; ['payment_terms', 'vendor', 'design_spec'].forEach(k => d[k] = v[k]); render(); toast('Saved', 'check'); };
ACTIONS.ordSave = () => {
  const d = curDeal(), v = fVals(document.getElementById('ordForm'));
  if (d.order_no && !v.order_no && sIdx(d.stage) > 5) return toast('The order number cannot be cleared once the order has moved on.', 'alert');
  const dupe = v.order_no && DEALS.find(x => x !== d && x.order_no === v.order_no && !x.deleted); if (dupe) return toast(`Order number ${v.order_no} is already on another order.`, 'alert');
  if (!savePromise(d, v.promised_date)) return;
  ['order_no', 'vendor', 'payment_terms', 'special_requests', 'design_spec', 'production_stage', 'delivery_method', 'courier', 'tracking_no', 'huid', 'cert_nos', 'close_override_reason', 'promise_override_reason'].forEach(k => { if (k in v) d[k] = v[k]; });
  d.est_weight = parseFloat(v.est_weight) || d.est_weight; d.premium_materials = v.premium_materials ? 1 : 0; d.client_approved_variance = v.client_approved_variance === '1';
  AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'deal_save', entity: 'deal', entity_id: d.id, detail: 'Order' }); render(); toast('Saved', 'check');
};
ACTIONS.pdTech = el => { const d = curDeal(); d.techniques = d.techniques || []; const t = el.dataset.t; d.techniques = d.techniques.includes(t) ? d.techniques.filter(x => x !== t) : [...d.techniques, t]; el.classList.toggle('on'); };
ACTIONS.pdSave = () => {
  const d = curDeal(), v = fVals(document.getElementById('pdForm'));
  ['centre_stone', 'plating', 'finish', 'chain_length', 'chain_weight', 'post_length', 'post_type', 'technique_details'].forEach(k => d[k] = v[k]); d.urgent = v.urgent === '1';
  if (can('deals.write') && v.size) d.size = v.size; if (DP.szPending !== undefined && can('deals.write')) d.size_client = DP.szPending;
  document.querySelectorAll('#specRows [data-si]').forEach(e => { d.lines[+e.dataset.si][e.dataset.sf] = e.value; });
  render(); toast('Order sheet details and stone specs saved', 'check');
};

/* ---------- QC (seven sections, 33 items; PASS needs all) ---------- */
function qcCard(d) {
  const s = DP.qc[d.id] || {}, n = Object.values(s).filter(Boolean).length, att = d.qc.length + 1;
  return card(`Quality check — attempt ${att}`, `<div class="row between" style="margin-bottom:10px"><span class="xs muted" id="qcCount">${n} of 33 ticked</span><button class="btn sm" data-act="qcAll">${icon('check', 'sm')}Tick everything</button></div>
    ${QC_SECTIONS.map(([sec, items], si) => `<div class="qcsec"><h4>${si + 1} · ${esc(sec)}</h4>${items.map((it, ii) => `<label class="qci"><input type="checkbox" data-q="${si}-${ii}"${s[si + '-' + ii] ? ' checked' : ''}><span>${esc(it)}</span></label>`).join('')}</div>`).join('')}
    <div class="fgrid mt-12" id="qcForm">${fF('Actual weight (g) <b class="req"></b>', fIn('actual_weight', '', { inputmode: 'decimal' }))}${fF('Actual cost ₹ <em>blank = derive</em>', fIn('actual_cost', '', { inputmode: 'decimal' }))}
      ${fF('HUID', fIn('huid', d.huid))}${fF('Certificate no(s).', fIn('cert_nos', d.cert_nos))}${fF('Notes / issues', fTa('notes', '', { rows: 2 }), { span: 'span3' })}
      <div class="field"><span>Photos</span><button class="btn" data-act="dealPhoto" data-kind="qc">${icon('camera')}Add QC photo</button></div>
      <label class="row small" style="gap:8px;align-self:end"><input type="checkbox" data-f="approved" style="accent-color:var(--gold)">Client has approved the cost variance (if over estimate)</label></div>
    <div class="xs muted mt-12">PASS needs every box. Rework / Reject need a written note; photos are mandatory on both.</div>
    <div class="row wrap mt-12"><button class="btn" style="background:var(--green);color:#fff;border-color:var(--green)" data-act="qcRec" data-s="Pass">✓ PASS</button><button class="btn" data-act="qcRec" data-s="Rework">⚠ Rework</button><button class="btn danger" data-act="qcRec" data-s="Reject">✕ Reject</button></div>`, { right: '<span class="xs muted">the QC SOP, digitised</span>' });
}
ACTIONS.qcAll = () => { const d = curDeal(), s = DP.qc[d.id] = {}; QC_SECTIONS.forEach(([, items], si) => items.forEach((_, ii) => { s[si + '-' + ii] = true; })); render(); };
ACTIONS.qcRec = (el, ev, force) => {
  const d = curDeal(), st = el.dataset.s, v = fVals(document.getElementById('qcForm')), s = DP.qc[d.id] || {};
  const missing = []; QC_SECTIONS.forEach(([, items], si) => items.forEach((it, ii) => { if (!s[si + '-' + ii]) missing.push(it); }));
  const w = parseFloat(v.actual_weight);
  if (st === 'Pass' && missing.length) return toast('PASS needs every item ticked. Missing: ' + missing.slice(0, 3).join(' · ') + (missing.length > 3 ? ' …' : ''), 'alert');
  if (!(w > 0)) return toast('Record the actual weight.', 'alert');
  if (st !== 'Pass' && !v.notes.trim()) return toast('Rework / Reject needs a written note of the issue.', 'alert');
  const hasPhoto = d.photos.some(p => p.kind === 'qc' && p.at > (d.qc.slice(-1)[0] || { at: 0 }).at);
  if (st !== 'Pass' && !hasPhoto && !force) return openModal(`<div class="card-b" style="padding:20px"><h3>No photos</h3><p class="small ink2 mt-8">The QC SOP asks for photos on Rework / Reject. Continue without?</p><div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="qcRecForce" data-s="${st}">Continue</button></div></div>`);
  if (v.approved) d.client_approved_variance = true;
  const att = d.qc.length + 1; d.qc.push({ attempt: att, status: st, notes: v.notes, actual_weight: w, actual_cost: parseFloat(v.actual_cost) || 0, at: NOW(), by: viewUser().id });
  d.qc_status = st; d.qc_attempts = att; d.huid = v.huid; d.cert_nos = v.cert_nos;
  const va = variance(d);
  logAct(d, { type: 'qc', dir: 'in', subject: `QC attempt ${att}: ${st.toUpperCase()}`, body: (v.notes || '') + (va && Math.abs(va.wpct) > va.tol ? `\n⚠ weight ${va.wpct > 0 ? '+' : ''}${va.wpct}% vs estimate` : '') });
  if (st === 'Pass') { d.qc_passed_at = NOW(); d.actual_weight = w; if (d.stage === 'In Production') { d.stage = 'QC'; d.stage_changed_at = NOW(); logAct(d, { type: 'stage', subject: 'In production → Quality check', body: 'QC passed' }); } }
  else { d.stage = 'In Production'; d.production_stage = st === 'Rework' ? 'Final finish' : 'Casting'; d.stage_changed_at = NOW(); logAct(d, { type: 'stage', subject: `Quality check → In production (${st})`, body: v.notes }); }
  if (st === 'Reject' || att >= 3) logAct(d, { type: 'task', subject: `FOUNDERS: review ${st === 'Reject' ? 'rejected piece' : 'QC attempt ' + att}`, body: 'Per QC SOP — report to management, decide rework vs remake, tell the client (template O9).', due_at: at(1, '11:00') });
  DP.qc[d.id] = {}; closeLayer(); render();
  toast(`QC ${st}${va ? ` · cost ${va.pct > 0 ? '+' : ''}${va.pct.toFixed(1)}% · ${va.status}` : ''}`, st === 'Pass' ? 'check' : 'alert');
};
ACTIONS.qcRecForce = el => { closeLayer(); ACTIONS.qcRec(el, null, true); };

/* =================================================================== BILLING */
function tabBilling(d) {
  const m = money(d), basisLbl = d.actual_cost || (variance(d) && d.qc_status === 'Pass') ? 'actual' : d.est_cost ? 'estimate' : 'quote';
  const pays = d.payments.slice().sort((a, b) => b.paid_at - a.paid_at);
  return `<div class="dbody"><div class="stack">
    ${card('Payments', pays.length ? `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Date</th><th>Kind</th><th class="m-hide">Mode</th><th class="m-hide">Reference</th><th class="num">Amount</th><th class="m-hide">By</th><th></th></tr></thead><tbody>
      ${pays.map(p => `<tr style="cursor:default${p.void ? ';opacity:.45;text-decoration:line-through' : ''}"><td>${fdate(p.paid_at)}</td><td>${p.kind}</td><td class="m-hide">${esc(p.mode)}</td><td class="m-hide xs">${esc(p.reference || '')}${p.note ? ' · ' + esc(p.note) : ''}</td>
        <td class="num strong" style="${p.kind === 'Refund' ? 'color:var(--red)' : ''}">${p.kind === 'Refund' ? '− ' : ''}${inr(p.amount)}${p.edited_at ? `<div class="xs muted">edited ${fdate(p.edited_at)}</div>` : ''}</td><td class="m-hide xs">${esc(userName(p.by))}</td>
        <td class="num">${!p.void && can('payments.edit') && (p.kind !== 'Refund' || isFounder()) ? `<button class="btn ghost sm" data-act="payEdit" data-id="${p.id}" title="Correct this payment">✎</button>` : ''}${!p.void && isFounder() ? `<button class="btn ghost sm danger" data-act="payVoid" data-id="${p.id}" title="Void this payment (founders) — goes to the Trash, the balance is recomputed">void</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="small muted">No payments recorded.</div>',
      { right: can('payments.write') ? `<button class="btn sm gold" data-act="payNew">${icon('plus', 'sm')}Record payment</button>` : '' })}
    ${card('Invoice', `<div class="fgrid f3" id="invForm">${fF('GST invoice no. <em>from Zoho Books</em>', fIn('invoice_no', d.invoice_no, { dis: !canEditOrder() }))}${fF('Invoice date', fIn('invoice_date', isoDate(d.invoice_date), { type: 'date', dis: !canEditOrder() }))}${fF('Invoicing entity', fPick('invoice_entity', 'invoice_entities', d.invoice_entity || SETTINGS.company, { noBlank: true, dis: !canEditOrder() }))}</div>
      <div class="xs muted mt-12">This system does not raise tax invoices. Zoho Books does, on the company GSTIN. Record the number here so Delivered → Closed can prove it exists.</div>`, { right: canEditOrder() ? `<button class="btn sm" data-act="invSave">Save</button>` : '' })}
  </div><div class="stack">
    ${card('Money', `<dl class="kv"><dt>Basis <span class="badge out">${basisLbl}</span></dt><dd>${inr(m.basis)}</dd><dt>Advance</dt><dd>${inr(m.advance)}</dd><dt>Paid total</dt><dd>${inr(m.paid)}</dd>
      <dt class="strong">Balance</dt><dd class="tot" style="color:${m.balance > 0.5 ? 'var(--red)' : 'var(--green)'}">${inr(m.balance)}</dd><dt>Status</dt><dd><span class="badge ${{ Paid: 'green', Advance: 'gold', Partial: 'amber', Refunded: 'red' }[m.status] || ''}">${m.status}</span></dd><dt>Terms</dt><dd class="small">${esc(d.payment_terms || '—')}</dd></dl>`)}
    ${card('Billing messages', `<div class="row wrap">${['B1', 'B2', 'B3'].map(k => { const t = TEMPLATES.find(x => x.key === k); return `<button class="btn sm" data-act="msgSend" data-k="${k}">${k} ${esc(t.name)}</button>`; }).join('')}</div>`)}
    ${card('Payment link', `<div class="small ink2">Send a UPI / card link for the balance. It records itself here when paid.</div><button class="btn block mt-12" data-act="payLink2"${m.balance > 0.5 ? '' : ' disabled'}>${icon('link')}Send link for ${inr(m.balance)}</button>`)}
  </div></div>`;
}
function payModal(d, p) {
  const m = money(d), kinds = ['Advance', 'Milestone', 'Balance', ...(isFounder() ? ['Refund'] : [])];
  openModal(`<div class="card-b" style="padding:20px"><h3>${p ? 'Correct payment' : 'Record payment'}</h3>${p ? '<p class="xs muted mt-8">The change is logged with the old and new values; nothing is deleted.</p>' : ''}
    <div class="fgrid mt-12" id="payForm">${fF('Kind', fSel('kind', kinds, p ? p.kind : m.paid > 0 ? 'Balance' : 'Advance'))}${fF('Amount ₹', fIn('amount', p ? p.amount : Math.round(m.balance) || '', { inputmode: 'decimal' }))}
      ${fF('Mode', fPick('mode', 'payment_modes', p ? p.mode : 'UPI', { noBlank: true }))}${fF('Reference', fIn('reference', p ? p.reference : '', { ph: 'UPI ref / last 4 / cheque no.' }))}
      ${fF('Date', fIn('paid_at', isoDate(p ? p.paid_at : TODAY), { type: 'date' }))}${fF('Note', fIn('note', p ? p.note : ''))}</div>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="payGo" data-id="${p ? p.id : ''}">${p ? 'Save correction' : 'Record'}</button></div></div>`);
}
ACTIONS.payNew = () => { if (!can('payments.write')) return denied('Your role cannot record payments'); payModal(curDeal()); };
ACTIONS.payEdit = el => payModal(curDeal(), curDeal().payments.find(p => p.id === el.dataset.id));
ACTIONS.payGo = el => {
  const d = curDeal(), v = fVals(document.getElementById('payForm')), amt = parseMoney(v.amount);
  if (!(amt > 0)) return toast('Amount must be positive', 'alert');
  if (v.kind === 'Refund' && !isFounder()) return toast('Refunds are recorded by founders only', 'alert');
  const mode = opts('payment_modes').includes(v.mode) ? v.mode : 'Other';
  if (el.dataset.id) { const p = d.payments.find(x => x.id === el.dataset.id), old = `${p.kind} ${inr(p.amount)} ${p.mode}`; Object.assign(p, { kind: v.kind, amount: amt, mode, reference: v.reference, note: v.note, paid_at: new Date(v.paid_at + 'T13:00:00'), edited_at: NOW(), edited_by: viewUser().id });
    logAct(d, { type: 'payment', subject: `Payment edited: ${old} → ${v.kind} ${inr(amt)} ${mode}` }); AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'payment_edit', entity: 'deal', entity_id: d.id, detail: old + ' → ' + inr(amt) }); }
  else { recordPayment(d, { kind: v.kind, amount: amt, mode, reference: v.reference, note: v.note, paid_at: new Date(v.paid_at + 'T13:00:00') }); AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'payment', entity: 'deal', entity_id: d.id, detail: `${v.kind} ${inr(amt)}` }); }
  closeLayer(); render(); toast(`${el.dataset.id ? 'Corrected' : 'Recorded'} · balance ${inr(money(d).balance)}`, 'coins');
};
ACTIONS.payVoid = el => openModal(`<div class="card-b" style="padding:20px"><h3>Void this payment?</h3><p class="small muted mt-8">Why? It goes to Data → Trash and the balance is recomputed.</p><textarea class="textarea" id="voidWhy" rows="2"></textarea><div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="payVoidGo" data-id="${el.dataset.id}">Void</button></div></div>`);
ACTIONS.payVoidGo = el => { const d = curDeal(), why = document.getElementById('voidWhy').value.trim(); if (why.length < 3) return toast('A reason of a few words is needed', 'alert'); const p = d.payments.find(x => x.id === el.dataset.id); p.void = true;
  TRASH.unshift({ entity: 'payment', label: `${inr(p.amount)} ${p.mode} on ${d.order_no || d.id}`, sub: `${p.kind} · ${p.reference || ''}`, at: NOW(), by: viewUser().id, reason: why, deal: d.id, payment: p.id }); logAct(d, { type: 'payment', subject: 'Payment voided', body: why }); closeLayer(); render(); toast('Voided · balance ' + inr(money(d).balance), 'check'); };
ACTIONS.invSave = () => { const d = curDeal(), v = fVals(document.getElementById('invForm')); d.invoice_no = v.invoice_no; d.invoice_date = v.invoice_date ? new Date(v.invoice_date + 'T16:00:00') : null; d.invoice_entity = v.invoice_entity; render(); toast('Invoice details saved', 'check'); };
ACTIONS.payLink2 = () => { const d = curDeal(), m = money(d); openModal(`<div class="card-b" style="padding:20px"><h3>Payment link</h3><p class="small muted mt-8">Razorpay · UPI, cards and net banking · expires in 72 hours</p><div class="input mt-12 mono" style="display:flex;align-items:center">rzp.io/l/mq-${(d.order_no || d.id).toLowerCase()}</div><dl class="kv mt-12"><dt>Amount</dt><dd>${inr(m.balance)}</dd><dt>To</dt><dd>${esc(dealContact(d).name)}</dd></dl>
  <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn wa" data-act="payLinkSend">${icon('wa')}Send on WhatsApp</button></div></div>`); };
ACTIONS.payLinkSend = () => { const d = curDeal(); logAct(d, { type: 'whatsapp', subject: 'Payment link sent', body: `rzp.io/l/mq-${(d.order_no || d.id).toLowerCase()} for ${inr(money(d).balance)}` }); closeLayer(); render(); toast('Payment link sent and logged', 'check'); };

/* =================================================================== ACTIVITY */
function tabActivity(d) {
  const manual = ['note', 'call', 'whatsapp', 'email', 'meeting', 'visit', 'task', 'template'];
  return `<div class="dbody"><div class="stack">${card('Timeline', d.activities.length ? `<div class="tl2">${d.activities.map((a, i) => {
    const dot = a.type === 'stage' ? 'stage' : a.type === 'qc' ? 'qc' : a.type === 'payment' ? 'payment' : a.dir === 'out' ? 'out' : a.dir === 'in' ? 'in' : '';
    return `<div class="ent"><span class="dt ${dot}"></span><div><div class="hd"><b>${esc(a.subject || a.type)}</b>${a.template_key ? `<span class="badge gold">${a.template_key}</span>` : ''}<span class="when">${fdt(a.at)} · ${esc(userName(a.by))}</span></div>${a.body ? `<div class="bd">${esc(a.body)}</div>` : ''}
      ${a.type === 'task' && !a.done_at ? `<div class="xs mt-8" style="color:var(--amber)">task due ${fdate(a.due_at)} <button class="btn ghost sm" data-act="taskDone" data-i="${i}">mark done</button></div>` : ''}
      ${isFounder() && manual.includes(a.type) ? `<button class="del" data-act="actDel" data-i="${i}">delete entry</button>` : ''}</div></div>`; }).join('')}</div>` : '<div class="small muted">Nothing yet.</div>', { right: '<span class="xs muted">if it is not here, it did not happen</span>' })}</div>
    <div class="stack">${card('Add', `<div class="qlog">${[['call', 'Call made', 'phone'], ['call_in', 'Call received', 'phone'], ['whatsapp', 'WhatsApp sent', 'wa'], ['whatsapp_in', 'WhatsApp received', 'chat'], ['email', 'Email', 'mail'], ['visit', 'Visit', 'pin'], ['video', 'Video consult', 'camera'], ['note', 'Note', 'edit']].map(([t, n, ic]) => `<button class="btn sm" data-act="dealLog" data-t="${t}">${icon(ic, 'sm')}${n}</button>`).join('')}</div>`)}
      ${card('Send a message', `<div class="small ink2">Templates for this stage, rendered from the record and logged here.</div><button class="btn gold block mt-12" data-act="dealMsg">${icon('wa')}Message ${esc(dealContact(d).name.split(' ')[0])}</button>`)}</div></div>`;
}
ACTIONS.taskDone = el => { const d = curDeal(), a = d.activities[+el.dataset.i]; a.done_at = NOW(); render(); toast('Task done', 'check'); };
ACTIONS.actDel = el => { const d = curDeal(), a = d.activities[+el.dataset.i]; openModal(`<div class="card-b" style="padding:20px"><h3>Delete this entry?</h3><p class="small muted mt-8">“${esc(a.subject)}” goes to Data → Trash and can be restored. Why?</p><textarea class="textarea" id="adWhy" rows="2"></textarea><div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="actDelGo" data-i="${el.dataset.i}">Delete</button></div></div>`); };
ACTIONS.actDelGo = el => { const d = curDeal(), why = document.getElementById('adWhy').value.trim(); if (why.length < 3) return toast('A reason of a few words is needed', 'alert'); const [a] = d.activities.splice(+el.dataset.i, 1); TRASH.unshift({ entity: 'activity', label: `${a.subject} on ${d.id}`, sub: a.body || '', at: NOW(), by: viewUser().id, reason: why, deal: d.id, record: a }); closeLayer(); render(); toast('Entry moved to the Trash', 'check'); };

/* =================================================================== MESSAGES */
function tplVars(d) {
  const c = dealContact(d), m = money(d), q = d.calc, v = variance(d);
  return { name: c.name.split(' ')[0], agent: userName(d.owner).split(' ')[0], interest: (d.product_interest || 'piece').toLowerCase(), slots: 'Sat 12:00, Sat 16:00 or Sun 13:00', quote_no: d.quote_no, piece: dealTitle(d),
    diamond_value: NF.format(Math.round(q.diamond_value)), gold_wt: d.gold_wt, purity: d.purity, gold_rate: NF.format(Math.round(q.gold_rate_applied)), gold_value: NF.format(Math.round(q.gold_value)), labour: NF.format(Math.round(q.labour)), gst_pct: d.gst_pct, gst_amt: NF.format(Math.round(q.gst_amt)), total: NF.format(Math.round(q.total)),
    valid_till: d.quote_valid_till ? fdt(d.quote_valid_till) : null, order_no: d.order_no, est_cost: d.est_cost ? NF.format(Math.round(d.est_cost)) : null, advance: m.advance ? NF.format(m.advance) : null, balance: NF.format(Math.round(m.balance)),
    cad_date: d.order_date ? fdate(addDays(d.order_date, 5)) : null, angles: 3, feedback_date: fdate(addDays(TODAY, 2)), delivery_date: d.promised_date ? fdate(d.promised_date) : null, gold_colour: (d.gold_colour || '').toLowerCase(),
    stone_spec: d.lines.map(l => `${l.pcs} ${l.shape} ${l.ct} ct ${l.quality}`).join(', '), est_weight: d.est_weight || d.gold_wt, production_stage: (d.production_stage || 'setting').toLowerCase(), photo_line: 'Photo attached.',
    actual_weight: v ? v.actual_weight : null, actual_cost: v ? NF.format(Math.round(v.actual_cost)) : null, cert_no: d.cert_nos || null, delivery_method: (d.delivery_method || '').toLowerCase() || null,
    balance_line: m.balance > 0.5 ? `Balance due: INR ${NF.format(Math.round(m.balance))}.` : 'Fully paid, thank you.', tracking_line: d.tracking_no ? `${d.courier} tracking ${d.tracking_no}.` : 'Our team will hand it over in person.',
    amount: d.payments.length ? NF.format(d.payments.slice(-1)[0].amount) : null, mode: d.payments.length ? d.payments.slice(-1)[0].mode : null, reference: d.payments.length ? d.payments.slice(-1)[0].reference : null,
    invoice_no: d.invoice_no || null, pay_details: SETTINGS.pay_details, review_link: SETTINGS.review_link, referral_offer: SETTINGS.referral_offer };
}
const renderTpl = (t, d) => { const v = tplVars(d); return t.body.replace(/\{(\w+)\}/g, (_, k) => v[k] != null && v[k] !== '' ? v[k] : `[${k.replace(/_/g, ' ')}]`); };
ACTIONS.dealMsg = () => {
  const d = curDeal(), c = dealContact(d), g = stg(d.stage).group, jr = { lead: 'lead', quote: 'quote', order: 'order', closed: 'post', lost: 'lead' }[g];
  const here = TEMPLATES.filter(t => t.active && t.stage === d.stage), jn = TEMPLATES.filter(t => t.active && t.journey === jr && !here.includes(t)), rest = TEMPLATES.filter(t => t.active && !here.includes(t) && !jn.includes(t));
  const b = (t, cls) => `<button class="btn sm ${cls}" data-act="msgSend" data-k="${t.key}">${t.key} · ${esc(t.name)}</button>`;
  openSheet({ title: 'Message ' + c.name, sub: 'Rendered from this record, opened in WhatsApp, and logged here. Edit before sending if the situation needs it.',
    body: `<div class="label">For this stage</div><div class="row wrap mt-8">${here.map(t => b(t, 'gold')).join('') || '<span class="small muted">No template for this stage.</span>'}</div>
      <div class="label mt-24">All ${jr}</div><div class="row wrap mt-8">${jn.map(t => b(t, '')).join('')}</div>
      <details class="more-d mt-16"><summary>${icon('chevD', 'sm')} Everything else</summary><div class="row wrap mt-8">${rest.map(t => b(t, '')).join('')}</div></details>` });
};
ACTIONS.msgSend = el => {
  const d = curDeal(), t = TEMPLATES.find(x => x.key === el.dataset.k), c = dealContact(d);
  if (t.key === 'L3') { if (DP.qd && !quoteLocked(d)) qSave(d, true); if (!d.quote_no) return toast('Save the quotation first — it has no number yet.', 'alert'); if (!quoteValid(d) && !d.order_date) return staleQuote(); }
  openModal(`<div class="card-b" style="padding:20px"><div class="row between"><h3>${t.key} · ${esc(t.name)}</h3><span class="badge ${t.cat === 'marketing' ? 'amber' : 'out'}">${t.cat}</span></div>
    <textarea class="textarea mt-12" id="msgText" rows="9">${esc(renderTpl(t, d))}</textarea>
    <div class="xs muted mt-8">To ${esc(maskPhone(c.phone) || 'no phone on file')}. Square-bracketed bits are placeholders — fill them before sending.</div>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn" data-act="msgCopy">${icon('copy')}Copy</button><button class="btn gold" data-act="msgGo" data-k="${t.key}">${icon('wa')}Open WhatsApp & log</button></div></div>`);
};
ACTIONS.msgCopy = () => { const t = document.getElementById('msgText'); try { navigator.clipboard.writeText(t.value); } catch (_) {} toast('Copied', 'copy'); };
ACTIONS.msgGo = el => {
  const d = curDeal(), k = el.dataset.k, t = TEMPLATES.find(x => x.key === k), body = document.getElementById('msgText').value;
  if (k === 'L3' && d.quote_no && !d.order_date) { shareQuote(d, 'whatsapp'); d.activities[0].body = body; toast('Shared — the 24 hours start now', 'check'); }
  else { logAct(d, { type: 'template', template_key: k, subject: `${k} · ${t.name} sent on WhatsApp`, body }); toast('Opened WhatsApp and logged', 'wa'); }
  closeLayer(); render();
};

/* =================================================================== PRINTED OUTPUTS */
ACTIONS.quotePdf = el => {
  const d = curDeal(), ver = el && el.dataset.v ? +el.dataset.v : d.quote_version;
  if (DP.qd && !quoteLocked(d)) qSave(d, true);
  if (!d.quote_no) return toast('Save the quotation first — it has no number yet.', 'alert');
  if (ver === d.quote_version && !d.order_date && !quoteValid(d)) return staleQuote();
  const c = dealContact(d), q = d.calc, m = money(d), vrow = d.versions.find(v => v.v === ver), total = ver === d.quote_version ? q.total : vrow.total;
  const r = (l, v, cls) => `<div class="row between ${cls || ''}"><span>${l}</span><span>${v}</span></div>`;
  openModal(`<div class="card-b" style="padding:16px"><div class="row between" style="margin-bottom:10px"><h3>${d.quote_no}${ver > 1 ? ' v' + ver : ''} · ${esc(c.name)}.pdf</h3><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="a4wrap"><div class="a4">
      <div class="ah"><div><div class="mk"><span class="q">${BRAND.q('')}</span>${BRAND.wordmark('')}</div><div class="tag">LAB-GROWN DIAMOND JEWELLERY</div></div>
        <div class="ttl"><b>QUOTATION</b><div>No: ${d.quote_no}${ver > 1 ? ' v' + ver : ''}</div><div>Date: ${fdate(d.quote_date)} · valid 24 hours</div><div>marqa.in</div></div></div><div class="gr"></div>
      ${d.img ? `<img class="ph" src="${img(d.img, 240)}" alt="">` : ''}
      <div>For <b>${esc(c.name)}</b></div><div style="margin-top:4px">Item <b>${esc(d.item_label || d.item)}</b></div>
      <div style="color:#6E6E6E;margin-top:4px">Size ${esc(d.size || '—')}${d.size_client ? ` (${esc(d.size_client)})` : ''} · ${esc(d.item_type)} · ${metalDesc(d)}</div>
      <table style="clear:both;margin-top:18px"><thead><tr><th>Component</th><th>Shape</th><th class="r">Pcs</th><th class="r">Carat</th><th>Quality</th><th class="r">Rate</th><th class="r">Value (INR)</th></tr></thead><tbody>
        ${q.lines.filter(l => l.value).map(l => `<tr><td>Diamonds</td><td>${esc(l.shape)} ${l.size_mm ? esc(l.size_mm) + ' mm' : ''}</td><td class="r">${l.pcs}</td><td class="r">${(+l.ct).toFixed(2)}</td><td>${esc(l.quality)}</td><td class="r">${NF.format(l.rate)}</td><td class="r">${NF.format(Math.round(l.value))}</td></tr>`).join('')}
        <tr><td>${metalName(d.purity)} - ${d.gold_wt} g @ ${d.purity}</td><td></td><td></td><td></td><td></td><td class="r">${NF.format(Math.round(q.gold_rate_applied))}/g</td><td class="r">${NF.format(Math.round(q.gold_value))}</td></tr>
        <tr><td>Making / labour - ${d.gold_wt} g</td><td></td><td></td><td></td><td></td><td class="r">${NF.format(d.making_rate)}/g</td><td class="r">${NF.format(Math.round(q.labour))}</td></tr>
        ${+d.extra_stones ? `<tr><td>Extra stones</td><td colspan="5"></td><td class="r">${NF.format(d.extra_stones)}</td></tr>` : ''}</tbody></table>
      <div class="tt">${r('Selling price', 'INR ' + NF.format(Math.round(q.selling)))}${q.discount_amt ? r(`Discount (${d.discount_pct}% on diamonds)`, '- INR ' + NF.format(Math.round(q.discount_amt))) : ''}${r(`GST (${d.gst_pct}%)`, 'INR ' + NF.format(Math.round(q.gst_amt)))}
        ${r('Total payable', 'INR ' + NF.format(Math.round(total)), 'gt')}${r('Approx. USD', '$' + NF.format(q.usd_total))}${m.paid > 0 ? r('Received', 'INR ' + NF.format(m.paid)) + r('<b>Balance</b>', '<b>INR ' + NF.format(Math.round(m.balance)) + '</b>') : ''}</div>
      ${d.order_no ? `<div style="margin-top:16px;font-size:9px;color:#6E6E6E">ORDER &nbsp; ${d.order_no} · ${stg(d.stage).label} · expected ${d.promised_date ? fdate(d.promised_date) : '—'}</div>` : ''}
      <div class="ft">${esc(SETTINGS.quote_terms)}<div class="row between" style="margin-top:6px"><span>MARQA - marqa.in · ${esc(SETTINGS.company)}</span><span>Prepared by ${esc(userName(d.owner))}</span></div></div>
    </div></div>
    <div class="row mt-12" style="justify-content:flex-end"><span class="xs muted grow">${d.order_date ? 'The order is on record; printing ticks nothing.' : ver !== d.quote_version ? `A re-print of v${ver}; the current quote is v${d.quote_version}.` : quoteShared(d) ? 'This version has already reached the client.' : 'Downloading this version is the evidence that the client has the breakdown.'}</span>
      <button class="btn" data-act="close">Close</button><button class="btn gold" data-act="quotePdfGo" data-v="${ver}">${icon('download')}Download PDF</button></div></div>`, 'wide');
};
ACTIONS.quotePdfGo = el => {
  const d = curDeal(), ver = +el.dataset.v;
  if (d.order_date) { logAct(d, { type: 'quote', subject: 'Quote PDF printed' }); toast('PDF printed — the order is on record', 'doc'); }
  else if (ver !== d.quote_version) { logAct(d, { type: 'quote', subject: `PDF of v${ver} re-printed` }); toast(`Re-printed v${ver} — the current quote is v${d.quote_version}`, 'doc'); }
  else { shareQuote(d, 'pdf'); toast('Downloaded — shared, the 24 hours start now', 'check'); }
  closeLayer(); render();
};
ACTIONS.pdSheet = () => {
  const d = curDeal(), miss = pdMissing(d);
  if (!canEditOrder()) return denied('Your role cannot issue the order sheet');
  if (miss.length) return openModal(`<div class="card-b" style="padding:20px"><h3>Order sheet — not ready to print</h3><p class="small ink2 mt-8">The manufacturing unit needs every field on the sheet. Still missing:</p><ul class="small" style="margin:8px 0 0 18px;line-height:1.7">${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul><div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button><button class="btn gold" data-act="pdFill">Fill them in</button></div></div>`);
  const c = dealContact(d), tct = d.lines.reduce((s, l) => s + (+l.ct || 0), 0), tpcs = d.lines.reduce((s, l) => s + (+l.pcs || 0), 0), sc = sizeCheck(d);
  const kv = rows => `<table class="kvt"><tbody>${rows.map(([a, b, c2, d2]) => `<tr><td>${a}</td><td>${b ?? '—'}</td><td>${c2}</td><td>${d2 ?? '—'}</td></tr>`).join('')}</tbody></table>`;
  const split = qy => { const p = String(qy || '').split('-'); return [p.find(x => /FL|IF|VVS|VS|SI|I\d?/.test(x)) || qy, p.find(x => !/FL|IF|VVS|VS|SI/.test(x)) || '']; };
  openModal(`<div class="card-b" style="padding:16px"><div class="row between" style="margin-bottom:10px"><h3>OrderSheet_${d.order_no}_${esc(c.name.split(' ')[0])}.pdf</h3><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="a4wrap"><div class="a4">
      <div class="ah"><div class="mk"><span class="q">${BRAND.q('')}</span>${BRAND.wordmark('')}</div><div class="ttl"><b>KARIGAR ORDER SHEET</b><div>Design PD sheet · ${d.order_no} · ${esc(d.vendor || '')} · issued ${fdate(TODAY)}${d.urgent ? ' · <b style="color:#A32C2C">URGENT</b>' : ''}</div></div></div><div class="gr"></div>
      <div style="display:grid;grid-template-columns:1fr 168px;gap:12px"><div><div class="band" style="margin-top:0">PRODUCT DETAILS</div>${kv([['Product order ID', d.order_no, 'Metal (kt / colour)', metalDesc(d)], ['Product category', d.item_type, 'Approx. metal wt required', (d.est_weight || d.gold_wt) + ' g'], ['Order date', fdate(d.order_date), 'Total diamond wt', tct.toFixed(2) + ' ct'], ['Dispatch date', fdate(d.promised_date), 'Centre stone', d.centre_stone || (d.lines[0] ? `${d.lines[0].ct} ct ${d.lines[0].shape} ${d.lines[0].quality}` : '—')], ['Urgent production', d.urgent ? 'YES' : 'No', 'Plating / rhodium', d.plating], ['Piece', esc(d.item_label || d.item), 'Finish / texture', d.finish]])}</div>
        <div><div class="band" style="margin-top:0">PRODUCT IMAGE</div>${d.img ? `<img src="${img(d.img, 320)}" alt="" style="width:100%;height:150px;object-fit:cover;border:1px solid #EEE">` : ''}</div></div>
      <div class="band">PRODUCT DIMENSIONS</div>${kv([['Ring size', `${esc(d.size || '—')}${d.size_client ? ` · client ${esc(d.size_client)}${sc.conv ? ` · ${sc.conv.circ || sc.conv.dia} mm` : ''}` : ''}`, 'Other product requirements', esc([d.design_spec, d.special_requests].filter(Boolean).join(' · '))], ['Chain length', d.chain_length, 'Earring post length', d.post_length], ['Chain weight', d.chain_weight, 'Earring post type', d.post_type]])}
      <div class="band">SPECIAL TECHNIQUES</div>${kv([['Techniques', (d.techniques || []).join(', ') || '—', 'Other details', d.technique_details || '—']])}
      <div class="band">DIAMOND / COLOUR STONE DETAILS</div><table><thead><tr><th>Shape</th><th>Size (mm)</th><th class="r">No. of stones</th><th class="r">Total wt (ct)</th><th>Clarity</th><th>Colour</th><th>Setting</th><th>Cert / other</th></tr></thead><tbody>${d.lines.map(l => { const [cl, co] = split(l.quality); return `<tr><td>${esc(l.shape)}</td><td>${esc(l.size_mm)}</td><td class="r">${l.pcs}</td><td class="r">${(+l.ct).toFixed(2)}</td><td>${esc(cl)}</td><td>${esc(co)}</td><td>${esc(l.setting)}</td><td>${esc(l.cert_no || '')}</td></tr>`; }).join('')}<tr style="background:#F2F2F2"><td><b>Total</b></td><td></td><td class="r"><b>${tpcs}</b></td><td class="r"><b>${tct.toFixed(2)}</b></td><td colspan="4"></td></tr></tbody></table>
      <div class="band">POST PRODUCTION REQUIREMENTS — VENDOR</div>${kv([['SGL / IGI certificate (jewellery)', '', 'Final gross wt', ''], ['IGI certificate (diamond)', esc(d.cert_nos || ''), 'Final net wt', d.actual_weight ? d.actual_weight + ' g' : ''], ['HUID', esc(d.huid || ''), 'HUID code', ''], ['Final dispatch date', '', 'Vendor acknowledgement (sign)', '']])}
      <div class="ft"><div class="row between"><span>Issued to ${esc(d.vendor || '')} · prepared by ${esc(viewUser().name)} · ${fdate(TODAY)}</span><span>MARQA · marqa.in · internal document · no prices</span></div></div>
    </div></div>
    <div class="row mt-12" style="justify-content:flex-end"><span class="xs muted grow">Issuing stamps “order sheet issued”, which proves the Order Confirmed item and clears it on Demand.</span><button class="btn" data-act="close">Close</button><button class="btn gold" data-act="pdIssue">${icon('send')}Issue to ${esc((d.vendor || 'vendor').split(' (')[0])}</button></div></div>`, 'wide');
};
ACTIONS.pdFill = () => { const d = curDeal(); closeLayer(); DP.tab[d.id] = 'order'; history.replaceState(null, '', `#/deal/${d.id}/order`); lastHash = location.hash; render(); setTimeout(() => { const el = document.getElementById('pdForm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); };
ACTIONS.pdIssue = () => { const d = curDeal(); d.pd_sheet_at = NOW(); logAct(d, { type: 'system', subject: 'Order sheet issued', body: `Karigar order sheet PDF generated for ${d.vendor} · ${d.order_no}` }); AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'pd_sheet', entity: 'deal', entity_id: d.id, detail: d.vendor }); closeLayer(); render(); toast('Order sheet issued to ' + d.vendor, 'check'); };

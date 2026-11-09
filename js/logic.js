/* The live app's behaviour, as functions the screens call: quote maths, money, stage checks and gates,
   the karigar-sheet gaps, the size double-check, roles and masking, and the actions that change a deal. */

/* ---------- who is looking (Settings → "View as" switches it) ---------- */
const VIEW = (() => { let r = 'founders'; try { r = sessionStorage.getItem('mq-role') || r; } catch (_) {} return { role: ROLES[r] ? r : 'founders' }; })();
const ROLE_PERMS = JSON.parse(JSON.stringify(PERMS));   // the Access matrix edits this copy
const viewUser = () => USERS.find(u => u.role === VIEW.role && u.active) || USERS[0];
const isFounder = () => VIEW.role === 'founders';
const can = perm => isFounder() || (ROLE_PERMS[VIEW.role] || []).includes(perm);
const hides = field => (ROLE_HIDDEN[VIEW.role] || []).includes(field);
const maskPhone = p => VIEW.role === 'marketing' && p ? '••••••' + String(p).replace(/\D/g, '').slice(-4) : p;
const maskEmail = e => VIEW.role === 'marketing' && e ? e[0] + '•••@' + e.split('@')[1] : e;
function setRole(r) { VIEW.role = r; try { sessionStorage.setItem('mq-role', r); } catch (_) {} }

/* ---------- small helpers ---------- */
const stg = key => DSTAGES.find(s => s.key === key) || { key, label: key, group: 'lead', i: -1, help: '' };
const sIdx = key => stg(key).i;
const isOrder = d => sIdx(d.stage) >= 5 && sIdx(d.stage) <= 14;
const isOpen = d => OPEN_STAGES.includes(d.stage);
const dealById = id => DEALS.find(d => d.id === id || d.legacy === id || d.order_no === id);
const dealContact = d => contactById(d.contact) || { name: '—', phone: '', city: '', country: 'India', tags: [] };
const dealTitle = d => d.item_label || d.product_interest || 'Enquiry';
const r2 = n => Math.round(n * 100) / 100;
const addDays = (date, n) => { const x = new Date(date); x.setDate(x.getDate() + n); return x; };
const dayStart = date => { const x = new Date(date); x.setHours(0, 0, 0, 0); return x; };
const isoDate = date => date ? new Date(date.getTime() - date.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : '';
const typeSkips = d => TYPE_SKIPS[d.type] || [];

/* ---------- rate sheets ---------- */
function sheetRate(shape, quality, pcs, ct) {
  const band = QUALITY_BANDS.find(b => b.qualities.includes(quality)); if (!band || !(ct > 0)) return null;
  const row = DIAMOND_RATE_MATRIX[band.key][shape === 'Melee' ? 'Round' : shape]; if (!row) return null;
  const per = ct / Math.max(1, +pcs || 1);
  const col = SIZE_BANDS.findIndex(([, lo, hi]) => per >= lo && per < hi);
  return col < 0 ? null : row[col];
}
const sheetMaking = (purity, itemType) => (LABOUR_MATRIX[itemType] && LABOUR_MATRIX[itemType][purity]) || LABOUR_MATRIX['*'][purity] || 0;
const baseRateFor = purity => { const b = (GOLD[purity] || GOLD['14K'])[2]; return b === 'silver' ? SETTINGS.silver_rate_999 : b === 'platinum' ? SETTINGS.platinum_rate_950 : SETTINGS.gold_rate_24k; };
const baseRateLabel = purity => { const b = (GOLD[purity] || GOLD['14K'])[2]; return b === 'silver' ? '999 silver rate (₹/g)' : b === 'platinum' ? '950 platinum rate (₹/g)' : '24K rate (₹/g)'; };

/* ---------- the quote (a port of the owner's Excel; keep it exactly like this) ---------- */
function computeLive(d) {
  const g = GOLD[d.purity] || GOLD['14K'];
  const base = +d.gold_rate_24k || 0, wt = +d.gold_wt || 0;
  const gold_rate_applied = r2(base * g[0]);
  const gold_value = r2(wt * gold_rate_applied);
  const lines = (d.lines || []).map(l => ({ ...l, value: r2((+l.ct || 0) * (+l.rate || 0)) }));
  const diamond_value = r2(lines.reduce((s, l) => s + l.value, 0));
  const labour = r2(wt * (+d.making_rate || 0));
  const selling = r2(gold_value + diamond_value + labour + (+d.extra_stones || 0));
  const discount_amt = r2(diamond_value * (+d.discount_pct || 0) / 100);
  const gst_amt = r2((selling - discount_amt) * (+d.gst_pct || 0) / 100);
  const total = r2(selling - discount_amt + gst_amt);
  const div = (+d.usd_rate || 0) - (+d.usd_spread || 0);
  return { gold_rate_applied, gold_value, lines, diamond_value, labour, selling, discount_amt, gst_amt, total, usd_total: div > 0 ? Math.round(total / div) : 0, buyback_value: r2(wt * base * g[1]) };
}

/* ---------- money after the quote ---------- */
function money(d) {
  const live = (d.payments || []).filter(p => !p.void);
  const paid = live.reduce((s, p) => s + (p.kind === 'Refund' ? -p.amount : p.amount), 0);
  const adv = live.filter(p => p.kind === 'Advance').sort((a, b) => a.paid_at - b.paid_at)[0];
  const basis = d.actual_cost || d.est_cost || (d.calc ? d.calc.total : 0);
  const balance = Math.max(0, r2(basis - paid));
  let status = 'Unbilled';
  if (live.some(p => p.kind === 'Refund') && paid <= 0) status = 'Refunded';
  else if (paid <= 0) status = 'Unbilled';
  else if (balance <= 0.5) status = 'Paid';
  else if (paid < 0.6 * basis) status = 'Advance';
  else status = 'Partial';
  return { paid, advance: adv ? adv.amount : 0, basis, balance, status };
}
/* QC variance: actual cost derived from the locked quote when blank (gold part scales by weight) */
function variance(d) {
  const qc = (d.qc || []).filter(q => q.actual_weight).slice(-1)[0];
  if (!qc || !d.est_cost) return null;
  const c = d.calc, estW = d.est_weight || d.gold_wt || 0;
  const goldPart = (c.gold_value + c.labour) * (estW ? qc.actual_weight / estW : 1);
  const derived = r2((goldPart + c.diamond_value + (+d.extra_stones || 0) - c.discount_amt) * (1 + (+d.gst_pct || 0) / 100));
  const actual = qc.actual_cost || derived;
  const pct = r2((actual - d.est_cost) / d.est_cost * 100);
  const wpct = estW ? r2((qc.actual_weight - estW) / estW * 100) : 0;
  const tol = SETTINGS.weight_tolerance_pct;
  const status = Math.abs(pct) <= tol ? 'Within estimate' : d.client_approved_variance ? 'Slightly over — approved' : pct < 0 ? 'Under estimate' : 'Over — needs client approval';
  return { actual_weight: qc.actual_weight, est_weight: estW, actual_cost: actual, pct, wpct, status, tol };
}

/* ---------- quote validity and sharing ---------- */
const quoteShared = d => !!d.quote_no && d.quote_shared_version === d.quote_version;
const quoteValid = d => !!d.quote_date && (dayStart(TODAY) <= addDays(dayStart(d.quote_date), QUOTE_REPRICE_GRACE_DAYS) || (d.quote_valid_till && TODAY <= d.quote_valid_till));
const quoteGraceEnd = d => d.quote_date ? addDays(dayStart(d.quote_date), QUOTE_REPRICE_GRACE_DAYS) : null;

/* ---------- ring and bangle sizes (international double-check) ---------- */
function parseClientSize(s) {
  const m = String(s || '').trim().toUpperCase().match(/^(US|UK|EU|JP|MM|IN|INCH)\s*([A-Z]?)\s*(½|1\/2|\.5)?\s*([\d.\-\s]*)$/);
  if (!m) return null;
  const std = m[1]; let val = m[2] ? m[2] + (m[3] ? '½' : '') : (m[4] || '').trim();
  return { std, val };
}
function ringCirc(std, val) {
  if (std === 'US') { const s = parseFloat(val); return s >= 1 && s <= 16 ? 36.5 + 2.55 * s : null; }
  if (std === 'UK') { const i = UK_LETTERS.indexOf(val[0]); if (i < 0) return null; return val.includes('½') && i < 25 ? (UK_MM[i] + UK_MM[i + 1]) / 2 : UK_MM[i]; }
  if (std === 'EU') { const e = parseFloat(val); return e >= 40 && e <= 76 ? e : null; }
  if (std === 'JP') { const j = parseFloat(val); return j >= 1 && j <= 30 ? 40 + j : null; }
  if (std === 'MM') { const dmm = parseFloat(val); return dmm >= 12 && dmm <= 24 ? Math.PI * dmm : null; }
  if (std === 'IN') { const n = parseFloat(val); return n >= 1 && n <= 30 ? Math.PI * (12.5 + 0.4 * n) : null; }
  return null;
}
function ringFromCirc(c) {
  const n = (c / Math.PI - 12.5) / 0.4, us = (c - 36.5) / 2.55;
  let uk = 0; UK_MM.forEach((v, i) => { if (Math.abs(v - c) < Math.abs(UK_MM[uk] - c)) uk = i; });
  const ukHalf = uk < 25 && Math.abs((UK_MM[uk] + UK_MM[uk + 1]) / 2 - c) < Math.abs(UK_MM[uk] - c);
  return { indian: Math.round(n), between: Math.abs(n - Math.round(n)) > 0.35, us: Math.round(us * 2) / 2, uk: UK_LETTERS[uk] + (ukHalf ? '½' : ''), eu: Math.round(c), jp: Math.round(c - 40), dia: r2(c / Math.PI), circ: r2(c) };
}
const bangleDia = (std, val) => std === 'IN' ? (() => { const p = String(val).split(/[-.\s]/); const x = +(p[1] || 0); return (2 + x / 16) * 25.4; })() : std === 'MM' ? parseFloat(val) : std === 'INCH' ? parseFloat(val) * 25.4 : null;
function bangleFromDia(dmm) { const s = (dmm / 25.4 - 2) * 16; const even = Math.round(s / 2) * 2; return { size: '2.' + even, sixteenths: even, between: Math.abs(s - even) > 0.7, dia: r2(dmm), inch: r2(dmm / 25.4) }; }
function sizeCheck(d) {
  if (!d.intl || d.type === 'Buyback' || !d.size || ['Not applicable', 'Free size'].includes(d.size)) return { applies: false, ok: true };
  if (!d.size) return { applies: true, ok: false, msg: 'the Indian size is not on the record — pick it, or Not applicable if the piece has none' };
  if (!d.size_client) return { applies: true, ok: false, msg: 'the client\'s own size is not recorded' };
  const p = parseClientSize(d.size_client); if (!p) return { applies: true, ok: false, msg: 'the client\'s size needs its standard (US 7, UK M, EU 54, JP 14, MM 17.3)' };
  if (d.size.startsWith('Ring')) {
    const c = ringCirc(p.std, p.val); if (!c) return { applies: true, ok: false, msg: 'the client\'s ring size could not be read' };
    const conv = ringFromCirc(c), want = +d.size.replace('Ring ', ''), n = (c / Math.PI - 12.5) / 0.4;
    return Math.abs(n - want) <= 0.65 ? { applies: true, ok: true, conv } : { applies: true, ok: false, conv, msg: `the record says ${d.size} but ${d.size_client} is Ring ${conv.indian}` };
  }
  const dm = bangleDia(p.std, p.val); if (!dm) return { applies: true, ok: false, msg: 'the client\'s bangle size could not be read' };
  const conv = bangleFromDia(dm), want = +String(d.size.replace('Bangle 2.', '')), s = (dm / 25.4 - 2) * 16;
  return Math.abs(s - want) <= 1.3 ? { applies: true, ok: true, conv } : { applies: true, ok: false, conv, msg: `the record says ${d.size} but ${d.size_client} is Bangle ${conv.size}` };
}

/* ---------- karigar order sheet: what is still missing ---------- */
function pdMissing(d) {
  const m = [];
  if (!d.order_no) m.push('Order number');
  if (!d.vendor) m.push('Vendor / manufacturer');
  if (!d.item_type) m.push('Product category');
  if (!(d.item_label || d.item || d.design_spec)) m.push('What we are making');
  if (!d.purity) m.push('Metal purity');
  if (!['S925', 'PT950'].includes(d.purity) && !d.gold_colour) m.push('Metal colour');
  if (!((d.est_weight || d.gold_wt) > 0)) m.push('Approx. metal weight');
  if (!d.promised_date) m.push('Dispatch (promised) date');
  if (!d.img) m.push('Product image');
  if (!(d.lines || []).length) m.push('At least one stone line');
  (d.lines || []).forEach((l, i) => { const miss = [['shape', 'shape'], ['pcs', 'number of stones'], ['ct', 'total carat'], ['size_mm', 'size in mm'], ['quality', 'quality'], ['setting', 'setting']].filter(([k]) => !l[k]).map(([, n]) => n); if (miss.length) m.push(`Stone line ${i + 1}: ${miss.join(', ')}`); });
  return m;
}

/* ---------- stage checks ---------- */
const OUT_TYPES = ['call', 'whatsapp', 'email', 'template', 'meeting', 'quote'];
function templateSent(d, key) { return (d.activities || []).some(a => a.template_key === key); }
function ruleOk(d, rule) {
  const r = rule.replace('auto:', '');
  if (r.startsWith('template:')) return templateSent(d, r.split(':')[1]);
  const skipCad = typeSkips(d).includes('CAD In Progress');
  switch (r) {
    case 'activity_out': return (d.activities || []).some(a => a.dir === 'out' && OUT_TYPES.includes(a.type));
    case 'source': return !!d.source_channel;
    case 'interest': return !!d.product_interest;
    case 'budget': return (d.budget || 0) > 0 || (d.calc && d.calc.total > 0);
    case 'timeline': return !!d.timeline || !!d.promised_date;
    case 'activity_meeting': return (d.activities || []).some(a => ['meeting', 'visit', 'call'].includes(a.type));
    case 'quote_shared': return quoteShared(d);
    case 'next_action': return !!d.next_action_at && d.next_action_at > TODAY;
    case 'rate_valid': return quoteValid(d);
    case 'promise_date': return !!d.promised_date && dayStart(d.promised_date) >= dayStart(TODAY);
    case 'payment_terms': return !!d.payment_terms;
    case 'advance': return money(d).paid > 0;
    case 'design_spec': return !!(d.design_spec || d.item_label);
    case 'size_checked': return sizeCheck(d).ok;
    case 'est_cost': return (d.est_cost || 0) > 0;
    case 'order_no': return !!d.order_no;
    case 'vendor': return !!d.vendor || ['Stock', 'Buyback'].includes(d.type);
    case 'pd_sheet': return skipCad || ['Stock', 'Buyback'].includes(d.type) || !pdMissing(d).length;
    case 'pd_issued': return skipCad || ['Stock', 'Buyback'].includes(d.type) || !!d.pd_sheet_at;
    case 'karigar_sheet': return !!d.karigar_sheet_photo;
    case 'premium': return !!d.premium_materials;
    case 'special_requests': return !!d.special_requests;
    case 'gold_issued': return !!d.gold_issued_at || skipCad;
    case 'diamonds_issued': return !!d.diamonds_issued_at || skipCad;
    case 'qc_pass': return d.qc_status === 'Pass';
    case 'variance': { const v = variance(d); return !!v; }
    case 'variance_ok': { const v = variance(d); return !!v && (v.status === 'Within estimate' || v.status === 'Slightly over — approved' || !!d.client_approved_variance); }
    case 'delivery': return !!d.delivery_method && !!d.promised_date;
    case 'balance_ok': return money(d).balance <= 0.5 || /delivery/i.test(d.payment_terms || '');
    case 'tracking': return d.delivery_method !== 'Courier' || !!d.tracking_no;
    case 'invoice': return !!d.invoice_no;
    case 'balance_zero': return money(d).balance <= 0.5 || !!d.close_override_reason;
  }
  return false;
}
function checklistFor(d, stage) {
  return (CHECKLISTS[stage] || []).map(([key, label, req, rule, hint, either]) => {
    const tick = d.checks && d.checks[stage] && d.checks[stage][key];
    const system = !!rule && !either;
    const auto = rule ? ruleOk(d, rule) : false;
    const done = system ? auto : (auto || !!tick);
    return { key, label, req: !!req, rule, hint, either: !!either, system, done, tick: !system && tick ? tick : null, auto };
  });
}
/* Forward moves need every required item from the current stage up to (not including) the target, plus the data gates. */
function moveCheck(d, target) {
  const from = sIdx(d.stage), to = sIdx(target), tGroup = stg(target).group;
  const out = { ok: true, items: [], gates: [], role: null };
  // role gate
  const can2 = can('deals.stage.order') || (can('deals.stage.lead') && tGroup === 'lead') || (can('deals.stage.quote') && ['quote', 'lost'].includes(tGroup)) || (can('deals.stage.order_s1') && target === 'Order Confirmed') || (can('deals.stage.lead') && tGroup === 'lost' && ['lead', 'quote'].includes(stg(d.stage).group));
  if (!can2) { out.ok = false; out.role = `Your role cannot move a deal to ${stg(target).label}`; return out; }
  if (to <= from || tGroup === 'lost') return out;   // backward and lost moves skip the checks
  for (let i = from; i < to; i++) {
    const s = DSTAGES[i].key; if (typeSkips(d).includes(s)) continue;
    checklistFor(d, s).filter(x => x.req && !x.done).forEach(x => out.items.push({ stage: s, ...x }));
  }
  const crosses = k => from < sIdx(k) && to >= sIdx(k);
  const m = money(d);
  if (crosses('Quoted') && !(d.calc && d.calc.total > 0)) out.gates.push('Build the quotation first — total is zero.');
  if (crosses('Order Confirmed')) {
    if (!quoteValid(d)) out.gates.push('The quote has expired. Re-price at today\'s metal rate (Quote → Re-price), then confirm the order.');
    if (!dealContact(d).phone) out.gates.push('An order needs a phone number on the contact.');
    if (!(d.calc && d.calc.total > 0)) out.gates.push('An order needs a priced quotation behind it.');
    if (!d.payment_terms) out.gates.push('Set the payment terms before confirming the order.');
    if (!(m.paid > 0)) out.gates.push('No advance recorded — the advance is what confirms an order. Record it in Billing first.');
    if (!d.promised_date || dayStart(d.promised_date) < dayStart(TODAY)) out.gates.push('Fix the promised delivery date on the Order & QC tab before confirming the order.');
  }
  if (from <= sIdx('Order Confirmed') && to > sIdx('Order Confirmed') && !d.order_no) out.gates.push('Enter the ERP order number on the Order tab before the order moves on.');
  if (crosses('CAD Approved') && !typeSkips(d).includes('CAD Sent') && !d.cad_sent_at) out.gates.push('CAD has not been sent yet — move to “CAD Sent” first.');
  if (crosses('In Production') && !typeSkips(d).includes('CAD In Progress') && !(d.gold_issued_at && d.diamonds_issued_at)) out.gates.push('Casting cannot start until the metal and the diamond pieces are issued to the karigar — record both on the Demand panel.');
  if (crosses('Ready') && d.qc_status !== 'Pass' && !typeSkips(d).includes('QC')) out.gates.push('QC has not passed. Record a QC check with status PASS first.');
  const v = variance(d);
  if (to >= sIdx('Ready') && v && v.status === 'Over — needs client approval' && !d.client_approved_variance) out.gates.push('★ The piece is over the estimate and the client has not approved the variance. Send template O10 and record the approval first.');
  if (crosses('Closed') && m.balance > 0.5 && !d.close_override_reason) out.gates.push(`Balance of ${inr(m.balance)} is outstanding. Record the payment, or (founders) add a close-override reason.`);
  out.ok = !out.items.length && !out.gates.length;
  return out;
}
/* The stage menu offers the next reachable stage, plus the lost exits */
function nextStages(d) {
  const i = sIdx(d.stage), out = [];
  if (stg(d.stage).group === 'lost') return [['back', DSTAGES.filter(s => s.group === 'lead')]];
  let n = i + 1; while (n <= 14 && typeSkips(d).includes(DSTAGES[n].key)) n++;
  const fwd = n <= 14 ? [DSTAGES[n]] : [];
  const back = i > 0 ? [DSTAGES[i - 1]] : [];
  const lost = DSTAGES.filter(s => s.group === 'lost' && (isOrder(d) ? s.key === 'Cancelled' : s.key !== 'Cancelled'));
  return [['fwd', fwd], ['back', back], ['lost', d.stage === 'Closed' ? [] : lost]];
}

/* ---------- list badges ---------- */
function slaBadge(d) {
  if (d.stage === 'New' && (TODAY - d.stage_changed_at) / 36e5 > SETTINGS.sla_whatsapp_hours) return ['red', 'no reply ' + Math.floor((TODAY - d.stage_changed_at) / 36e5) + 'h'];
  if (d.next_action_at && d.next_action_at < TODAY && isOpen(d) && d.stage !== 'Closed') return ['red', 'follow-up overdue'];
  if (['Quoted', 'Negotiating'].includes(d.stage) && d.quote_date && !quoteValid(d)) return ['amber', 'quote expired: re-price'];
  return null;
}
const lateBadge = d => isOrder(d) && !['Delivered', 'Closed'].includes(d.stage) && d.promised_date ? (dayStart(d.promised_date) < dayStart(TODAY) ? 'late' : (d.promised_date - TODAY) / 864e5 <= 3 ? 'soon' : null) : null;
const dealsVisible = () => VIEW.role === 'ops' ? DEALS.filter(d => isOrder(d) || d.stage === 'Cancelled') : DEALS;

/* ---------- timeline and actions ---------- */
function logAct(d, a) { d.activities.unshift(Object.assign({ at: NOW(), by: viewUser().id, dir: 'out' }, a)); }
function moveStage(d, target, reason, override) {
  const from = d.stage, now = NOW();
  d.stage = target; d.stage_changed_at = now;
  if (target === 'Order Confirmed' && !d.order_date) { d.order_date = now; d.est_cost = d.calc.total; d.est_weight = d.est_weight || d.gold_wt; d.quote_accepted_at = now; const c = dealContact(d); c.lifecycle = 'Cust'; if (DEALS.some(x => x !== d && x.contact === d.contact && WON_STAGES.includes(x.stage)) && !c.tags.includes('REPEAT')) c.tags.push('REPEAT'); }
  if (target === 'CAD Sent') { if (d.cad_sent_at) d.cad_revisions = (d.cad_revisions || 0) + 1; d.cad_sent_at = now; }
  if (target === 'CAD Approved') d.cad_approved_at = now;
  if (target === 'In Production') { d.production_started_at = d.production_started_at || now; d.production_stage = d.production_stage || 'Casting'; }
  if (target === 'Ready') d.ready_at = now;
  if (target === 'Dispatched') d.dispatched_at = now;
  if (target === 'Delivered') d.delivered_at = now;
  if (target === 'Closed') d.closed_at = now;
  if (stg(target).group === 'lost') { d.lost_reason = reason || 'No response after follow-ups'; d.lost_at = now; }
  if (stg(from).group === 'lost' && stg(target).group === 'lead') { d.lost_reason = ''; d.lost_at = null; }
  logAct(d, { type: 'stage', dir: 'out', subject: (override ? '[founder override] ' : '') + `${stg(from).label} → ${stg(target).label}`, body: reason || '' });
  if (sIdx(target) > sIdx(from) && stg(target).group !== 'lost' && target !== 'Closed' && !(d.next_action_at > TODAY)) { d.next_action_at = at(SETTINGS.followup_default_days, '11:00'); d.next_action = 'Follow up after ' + stg(target).label; }
  AUDIT.unshift({ at: now, user: viewUser().id, action: 'stage', entity: 'deal', entity_id: d.id, detail: `${from} → ${target}` });
}
function shareQuote(d, via, note) {
  d.quote_shared_version = d.quote_version; d.quote_shared_via = via; d.quote_sent_at = NOW(); d.quote_valid_till = new Date(NOW().getTime() + QUOTE_VALID_HOURS * 36e5);
  const how = { pdf: 'PDF downloaded', whatsapp: 'WhatsApp L3 sent', in_store: 'shown in store' }[via];
  logAct(d, { type: 'quote', subject: `Quote ${d.quote_no} v${d.quote_version} shared — ${how}`, body: note || '', template_key: via === 'whatsapp' ? 'L3' : undefined });
  if (!(d.next_action_at > TODAY)) { d.next_action_at = at(SETTINGS.followup_default_days, '11:00'); d.next_action = 'Follow up on the quote'; }
}
function repriceQuote(d) {
  d.gold_rate_24k = baseRateFor(d.purity); d.quote_date = NOW(); d.quote_version += 1; d.quote_shared_version = null; d.quote_valid_till = null;
  d.calc = computeLive(d); d.versions.unshift({ v: d.quote_version, at: NOW(), total: d.calc.total, rate: d.gold_rate_24k, by: viewUser().id });
  logAct(d, { type: 'quote', subject: `Quote re-priced v${d.quote_version} at 24K ${inr(d.gold_rate_24k)}/g → total ${inr(d.calc.total)}` });
}
function recordPayment(d, p) {
  d.payments.push(Object.assign({ id: 'p' + NOW().getTime(), by: viewUser().id, paid_at: NOW() }, p));
  logAct(d, { type: 'payment', dir: p.kind === 'Refund' ? 'out' : 'in', subject: `${p.kind} ${inr(p.amount)} · ${p.mode}`, body: p.reference || '' });
}
function issueMetal(d, grams, note) { d.gold_issued_at = NOW(); d.gold_issued_wt = grams; d.issue_note = note || ''; logAct(d, { type: 'system', subject: `Metal issued: ${grams} g ${d.purity} to ${d.vendor || 'karigar'}`, body: note || '' }); }
function issueDiamonds(d, pcs, ct, codes, note) {
  d.diamonds_issued_at = NOW(); d.diamonds_issued_pcs = pcs; d.diamonds_issued_ct = ct; d.stock_issued_codes = codes || [];
  logAct(d, { type: 'system', subject: `Diamonds issued: ${pcs} pcs · ${ct} ct${codes && codes.length ? ' (' + codes.join(', ') + ')' : ''}`, body: note || '' });
}

/* ---------- stock balances ---------- */
function stockBal(it) {
  const mv = STOCK_MOVES.filter(m => m.item === it.id && !m.reversed).sort((x, y) => x.at - y.at);
  const pcs = mv.reduce((s, m) => s + m.pcs, 0), ct = r2(mv.reduce((s, m) => s + m.ct, 0));
  const last = mv.slice(-1)[0];
  let status = 'in_stock';
  if (it.kind !== 'lot') {
    if (pcs <= 0) status = !last ? 'in_stock' : last.kind === 'issue' ? 'issued' : last.kind === 'memo_out' ? 'memo' : last.kind === 'sale' ? 'sold' : last.kind === 'write_off' ? 'written_off' : 'consumed';
  } else if (pcs <= 0) status = last && last.kind === 'write_off' ? 'written_off' : 'consumed';
  const opening = mv.find(m => m.kind === 'in');
  const share = it.kind === 'lot' && opening ? (opening.ct ? ct / opening.ct : pcs / opening.pcs) : 1;
  const value_cost = ['in_stock', 'issued', 'memo'].includes(status) ? r2(it.cost * (it.kind === 'lot' ? share : 1)) : 0;
  return { pcs, ct, status, last_move_at: last ? last.at : null, value_cost, moves: STOCK_MOVES.filter(m => m.item === it.id).sort((x, y) => x.at - y.at) };
}

/* ---------- client profiles (Reports, contact card) ---------- */
function contactStats(c) {
  const ds = DEALS.filter(d => d.contact === c.id && !d.deleted);
  const orders = ds.filter(d => WON_STAGES.includes(d.stage));
  const val = d => d.actual_cost || d.est_cost || (d.calc ? d.calc.total : 0);
  const orders_value = orders.reduce((s, d) => s + val(d), 0);
  const first_enq = ds.map(d => d.enquiry).sort((a, b) => a - b)[0];
  const first_ord = orders.map(d => d.order_date).filter(Boolean).sort((a, b) => a - b)[0];
  const touches = ds.reduce((s, d) => s + d.activities.filter(a => ['call', 'whatsapp', 'email', 'meeting', 'visit', 'template', 'quote'].includes(a.type)).length, 0);
  const variance_n = orders.filter(d => { const v = variance(d); return v && (v.status === 'Over — needs client approval' || d.client_approved_variance); }).length;
  const st = {
    deals_n: ds.length, orders_n: orders.length, orders_value, max_order: Math.max(0, ...orders.map(val)), aov: orders.length ? orders_value / orders.length : 0,
    first_enquiry_at: first_enq, first_order_at: first_ord, days_to_order: first_enq && first_ord ? Math.round((first_ord - first_enq) / 864e5) : null,
    late_n: orders.filter(d => d.delivered_at && d.promised_date && d.delivered_at > addDays(d.promised_date, 1)).length,
    delivered_n: orders.filter(d => ['Delivered', 'Closed'].includes(d.stage)).length, requotes_n: ds.reduce((s, d) => s + Math.max(0, (d.quote_version || 1) - 1), 0),
    cad_revisions: ds.reduce((s, d) => s + (d.cad_revisions || 0), 0), variance_n, touches_n: touches, purchased: ds.some(d => !!d.order_date), last_touch: ds.flatMap(d => d.activities.map(a => a.at)).sort((a, b) => b - a)[0]
  };
  st.segments = [];
  if (st.orders_n >= 2) st.segments.push('Repeat purchasers');
  if (st.max_order >= SETTINGS.high_value_threshold) st.segments.push('High ticket');
  if (st.orders_n && st.days_to_order != null && st.days_to_order <= SETTINGS.profile_quick_days && !st.late_n) st.segments.push('Quick turnaround');
  if (st.orders_n && st.requotes_n <= 1 && st.cad_revisions <= 1 && !st.variance_n && st.touches_n <= SETTINGS.profile_hassle_touches) st.segments.push('Hassle-free');
  return st;
}

/* ---------- build the derived fields once ---------- */
(function prepare() {
  const tplName = k => (TEMPLATES.find(t => t.key === k) || {}).name || k;
  for (const d of DEALS) {
    const c = dealContact(d);
    d.intl = c.country && c.country !== 'India';
    d.activities = []; d.payments = []; d.checks = {}; d.photos = []; d.versions = [];
    d.enquiry_date = d.enquiry; d.met_in_person = d.met || 0;
    const hist = d.hist || [[d.stage, 0, '11:00']];
    const histAt = hist.map(([s, dd, hm]) => [s, at(dd, hm)]);
    d.stage_changed_at = histAt[histAt.length - 1][1];
    // quote
    const q = d.quote;
    d.purity = q ? q.purity : '14K'; d.gold_colour = q ? q.colour : 'Yellow'; d.gold_wt = q ? q.wt : 0;
    d.gold_rate_24k = q ? q.rate24 : baseRateFor('14K'); d.making_rate = q ? (q.making || sheetMaking(q.purity, q.item_type)) : sheetMaking('14K', 'Ring');
    d.item = q ? q.item : ''; d.item_label = q ? q.label : ''; d.item_type = q ? q.item_type : (d.product_interest === 'Pendant' ? 'Pendant' : 'Ring');
    d.size = q ? q.size : (d.size || ''); d.extra_stones = 0; d.discount_pct = 0; d.gst_pct = SETTINGS.default_gst; d.usd_rate = SETTINGS.default_usd; d.usd_spread = SETTINGS.default_usd_spread;
    d.lines = q ? q.lines.map(l => { const auto = sheetRate(l.shape, l.quality, l.pcs, l.ct); return { ...l, rate: l.rate || auto || 0, autoRate: !l.rate && !!auto }; }) : [];
    d.calc = computeLive(d);
    if (q) {
      d.quote_no = q.no; d.quote_date = at(q.date, '10:00'); d.quote_version = q.version;
      for (let v = 1; v <= q.version; v++) d.versions.unshift({ v, at: at(q.date - (q.version - v), '10:00'), total: r2(d.calc.total * (1 + (q.version - v) * 0.031)), rate: d.gold_rate_24k + (q.version - v) * 520, by: d.owner });
      if (q.shared) { const [via, sd, shm] = q.shared; d.quote_shared_version = q.version; d.quote_shared_via = via; d.quote_sent_at = at(sd, shm); d.quote_valid_till = new Date(d.quote_sent_at.getTime() + QUOTE_VALID_HOURS * 36e5); }
      d.photos.push({ kind: 'quote', img: d.img, at: d.quote_date, by: d.owner, note: 'Reference / render' });
    }
    // order
    d.payment_terms = d.terms || ''; d.promised_date = d.promised != null ? at(d.promised, '18:00') : null;
    if (d.ordered != null) { d.order_date = at(d.ordered, '12:00'); d.est_cost = d.calc.total; d.est_weight = d.gold_wt; d.quote_accepted_at = d.order_date; d.photos.push({ kind: 'order', img: IMG.rings[0].src, at: d.order_date, by: d.owner, note: 'Signed order form', doc: true }); }
    if (d.pd_issued != null) d.pd_sheet_at = at(d.pd_issued, '12:00');
    if (d.karigar_photo) { d.karigar_sheet_photo = true; d.photos.push({ kind: 'karigar', img: d.img, at: d.pd_sheet_at, by: 'u3', note: 'Order sheet as issued', doc: true }); }
    d.premium_materials = d.premium || 0; d.special_requests = d.special_requests || ''; d.urgent = d.urgent || 0;
    d.plating = d.plating || (d.gold_colour === 'White' ? 'Rhodium' : 'None'); d.finish = d.finish || 'High polish'; d.techniques = d.techniques || [];
    if (d.gold_issued) { d.gold_issued_wt = d.gold_issued[0]; d.gold_issued_at = at(d.gold_issued[1], '11:00'); d.gold_issued_by = 'u3'; }
    if (d.diamonds_issued) { const [pcs, ct, dd, codes] = d.diamonds_issued; d.diamonds_issued_pcs = pcs; d.diamonds_issued_ct = ct; d.diamonds_issued_at = at(dd, '11:00'); d.stock_issued_codes = codes; d.diamonds_issued_by = 'u3'; }
    if (d.invoice) { d.invoice_no = d.invoice[0]; d.invoice_date = at(d.invoice[1], '16:00'); d.invoice_entity = SETTINGS.company; }
    if (d.lost_at != null && typeof d.lost_at === 'number') d.lost_at = at(d.lost_at, '15:00');
    // stage timestamps from the path
    for (const [s, t] of histAt) {
      if (s === 'CAD Sent') d.cad_sent_at = t; if (s === 'CAD Approved') d.cad_approved_at = t; if (s === 'In Production' && !d.production_started_at) d.production_started_at = t;
      if (s === 'Ready') d.ready_at = t; if (s === 'Dispatched') d.dispatched_at = t; if (s === 'Delivered') d.delivered_at = t; if (s === 'Closed') d.closed_at = t;
    }
    d.cad_revisions = d.cad_revisions || 0;
    // QC
    d.qc = (d.qc || []).map(x => ({ ...x }));
    const lastQc = d.qc.slice(-1)[0];
    if (lastQc) { d.qc_status = lastQc.status; d.qc_attempts = d.qc.length; if (lastQc.status === 'Pass') { d.qc_passed_at = lastQc.at; d.actual_weight = lastQc.actual_weight; } d.photos.push({ kind: 'qc', img: d.img, at: lastQc.at, by: lastQc.by, note: 'QC attempt ' + lastQc.attempt }); }
    // timeline: capture, stage moves, templates, payments, QC, notes
    const first = histAt[0];
    d.activities.push({ type: d.met ? 'visit' : 'system', dir: 'in', subject: d.met ? 'Met in person — ' + d.source_channel : 'Lead captured', body: d.notes || '', at: d.enquiry || first[1], by: d.owner });
    histAt.slice(1).forEach(([s, t], i) => d.activities.push({ type: 'stage', dir: 'out', subject: `${stg(histAt[i][0]).label} → ${stg(s).label}`, body: s === 'Lost' || s === 'Expired' || s === 'Cancelled' ? d.lost_reason : '', at: t, by: ['In Production', 'QC', 'Ready', 'Dispatched'].includes(s) ? 'u3' : d.owner }));
    (d.tpl || []).forEach(([k, dd, hm, who]) => d.activities.push({ type: 'template', dir: 'out', template_key: k, subject: `${k} · ${tplName(k)} sent on WhatsApp`, body: '', at: at(dd, hm), by: who === 'AI assistant' ? 'ai' : (['O4', 'O6', 'O7'].includes(k) ? 'u3' : d.owner) }));
    if (q && q.shared) d.activities.push({ type: 'quote', dir: 'out', subject: `Quote ${q.no} v${q.version} shared — ${{ pdf: 'PDF downloaded', whatsapp: 'WhatsApp L3 sent', in_store: 'shown in store' }[q.shared[0]]}`, body: '', at: d.quote_sent_at, by: d.owner });
    let paidSoFar = 0;
    (d.pays || []).forEach(([kind, amt, mode, reference, dd], i) => { const basis = d.est_cost || d.calc.total; const amount = amt === 'rest' ? r2(basis - paidSoFar) : amt === 1 ? r2(basis) : amt < 1 ? Math.round(basis * amt / 100) * 100 : amt; paidSoFar += kind === 'Refund' ? -amount : amount; const p = { id: d.id + '-p' + i, kind, amount, mode, reference, paid_at: at(dd, '13:00'), by: kind === 'Refund' ? 'u1' : d.owner }; d.payments.push(p); d.activities.push({ type: 'payment', dir: kind === 'Refund' ? 'out' : 'in', subject: `${kind} ${inr(amount)} · ${mode}`, body: reference, at: p.paid_at, by: p.by }); });
    d.qc.forEach(x => d.activities.push({ type: 'qc', dir: 'in', subject: `QC attempt ${x.attempt}: ${x.status.toUpperCase()}`, body: x.notes, at: x.at, by: x.by }));
    if (d.gold_issued_at) d.activities.push({ type: 'system', dir: 'out', subject: `Metal issued: ${d.gold_issued_wt} g ${d.purity} to ${d.vendor}`, body: '', at: d.gold_issued_at, by: 'u3' });
    if (d.diamonds_issued_at) d.activities.push({ type: 'system', dir: 'out', subject: `Diamonds issued: ${d.diamonds_issued_pcs} pcs · ${d.diamonds_issued_ct} ct${d.stock_issued_codes.length ? ' (' + d.stock_issued_codes.join(', ') + ')' : ''}`, body: '', at: d.diamonds_issued_at, by: 'u3' });
    if (d.pd_sheet_at) d.activities.push({ type: 'system', dir: 'out', subject: 'Order sheet issued to ' + (d.vendor || 'the vendor'), body: '', at: d.pd_sheet_at, by: 'u3' });
    (d.acts || []).forEach(([type, dir, subject, body, dd, hm]) => d.activities.push({ type, dir, subject, body, at: at(dd, hm), by: d.owner }));
    d.activities.sort((a, b) => b.at - a.at);
    // manual ticks: recorded by the owner an hour after the stage began
    for (const [s, keys] of Object.entries(d.ticks || {})) { const t = (histAt.find(h => h[0] === s) || [s, d.stage_changed_at])[1]; d.checks[s] = {}; keys.forEach(k => { d.checks[s][k] = { by: d.owner, at: new Date(t.getTime() + 36e5) }; }); }
    // passed stages: their manual required items were ticked when they were left
    for (const [s] of histAt.slice(0, -1)) { if (s === d.stage) continue; (CHECKLISTS[s] || []).filter(r => r[2] && !r[3]).forEach(r => { d.checks[s] = d.checks[s] || {}; d.checks[s][r[0]] = d.checks[s][r[0]] || { by: d.owner, at: histAt.find(h => h[0] === s)[1] }; }); }
  }
})();

/* Older screens still read these names */
const CUSTOMERS = CONTACTS;
CONTACTS.forEach(c => { const st = contactStats(c); Object.assign(c, { spend: st.orders_value, orders: st.orders_n, since: c.created_at.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), anniv: c.anniversary ? new Date(c.anniversary).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—', source: c.source_channel, consent: !!c.consent_marketing }); });

/* ---------- small shared pieces of UI for the live-app screens ---------- */
const stagePill = key => { const s = stg(key); return `<span class="spill ${s.group}" title="${esc(s.help)}">${esc(s.label)}</span>`; };
const typePill = d => d.type && d.type !== 'Sale' ? `<span class="badge out xs">${esc(d.type)}</span>` : '';
const intlPill = d => d.intl ? `<span class="badge red" title="International: export compliance applies, founders sign off before invoicing">INTL</span>` : '';
const slaHtml = d => { const b = slaBadge(d); return b ? `<span class="badge ${b[0]}">${b[1]}</span>` : ''; };
const moneyShown = () => isFounder();   // business-wide money reaches founders only
const userName = id => id === 'ai' ? 'AI assistant' : userById(id).name;

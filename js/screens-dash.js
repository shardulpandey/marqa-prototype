/* Dashboard (#/home), Reports (#/reports) and Contacts (#/customers, #/customers/<id>), live-app round.
   Spec: screens-1 §2 (dashboard), §5 (contacts), §6 (reports); model §1.3, §2, §6.3, §9.3.
   Helpers are prefixed dash_ (dashboard and shared), rep_ (reports) and con_ (contacts).
   The 28 demo deals cover about six weeks. The monthly charts and the "in period" figures blend them with an
   archived history generated below (seeded, identical on every load): closed and lost deals from before the
   pipeline, whose booked totals match REPORT.revenue for Jun–Nov. Open work (pipeline, Today, aging) is live only. */

/* ======================= shared helpers ======================= */
const dash_val = d => d.actual_cost || d.est_cost || (d.calc ? d.calc.total : 0);   // order value: actual → estimate → quote
const dash_sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const dash_pl = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
const dash_d = d => d ? `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== TODAY.getFullYear() ? ' ' + String(d.getFullYear()).slice(2) : ''}` : '—';
const dash_t = d => { let h = d.getHours(); const m = d.getMinutes(), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
const dash_dt = d => d ? dash_d(d) + ', ' + dash_t(d) : '—';
const dash_short = n => (n < 0 ? '−' : '') + inrShort(Math.abs(n));
const con_ago = d => { if (!d) return '—'; const m = (TODAY - d) / 6e4; if (m < 1) return 'just now'; return m < 60 ? Math.round(m) + 'm ago' : m < 2880 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const dash_audit = (action, entity, entity_id, detail) => AUDIT.unshift({ at: NOW(), user: viewUser().id, action, entity, entity_id, detail });
const dash_money = () => isFounder();   // business-wide money reaches founders only (model §6.3)
function dash_download(name, text, type) {
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  } catch (_) {}
}
const dash_csv = rows => rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
const dash_go = h => { if (location.hash === h) { closeLayer(); render(); } else go(h); };

/* Periods. The range drives the "in period" figures; monthly charts always show the last 12 calendar months. */
function dash_range(k) {
  const t0 = dayStart(TODAY), end = new Date(t0.getTime() + 864e5 - 1);
  let from, label;
  if (k === '30d') { from = addDays(t0, -30); label = 'last 30 days'; }
  else if (k === '90d') { from = addDays(t0, -90); label = 'last 90 days'; }
  else if (k === 'fy') { from = new Date(TODAY.getMonth() >= 3 ? TODAY.getFullYear() : TODAY.getFullYear() - 1, 3, 1); label = 'this FY, since ' + dash_d(from); }
  else if (k === '365') { from = addDays(t0, -365); label = 'last 12 months'; }
  else if (k === 'all') { from = new Date(2000, 0, 1); label = 'all time'; }
  else { from = new Date(TODAY.getFullYear(), TODAY.getMonth() - 11, 1); label = '12 months, since ' + dash_d(from); }
  // Anything recorded in this session (real clock) still counts as "today".
  const to = new Date(Math.max(end.getTime(), Date.now() + 864e5));
  return { k, from, to, label, months: Math.max(1, Math.round((end - from) / (30.44 * 864e5))) };
}

/* ======================= archived history (seeded) ======================= */
const DASH_HIST = (() => {
  let s = 20261104;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = w => { const tot = dash_sum(Object.values(w)); let r = rnd() * tot; for (const [k, v] of Object.entries(w)) { r -= v; if (r < 0) return k; } return Object.keys(w)[0]; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const addH = (d, h) => new Date(d.getTime() + h * 36e5), dd = (d, n) => new Date(d.getTime() + n * 864e5);
  const limit = new Date(TODAY.getTime() - 2 * 36e5);
  const M0 = new Date(TODAY.getFullYear(), TODAY.getMonth() - 11, 1);
  const months = Array.from({ length: 12 }, (_, i) => new Date(M0.getFullYear(), M0.getMonth() + i, 1));
  const mIdx = d => (d.getFullYear() - M0.getFullYear()) * 12 + d.getMonth() - M0.getMonth();
  // Booked per month (archive + live). Jun–Nov are REPORT.revenue; the earlier months follow the season.
  const BOOKED = [2340000, 1980000, 2620000, 1710000, 1890000, 1630000, ...REPORT.revenue].slice(0, 12);
  const PRE = new Date(M0.getFullYear(), M0.getMonth() - 1, 1);   // orders from the month before the window, so December has deliveries
  const ENQ = [150, 128, 171, 118, 134, 121, 139, 152, 147, 165, 186, 14];
  const liveBooked = Array(12).fill(0), liveEnq = Array(12).fill(0);
  DEALS.forEach(d => {
    if (d.order_date && WON_STAGES.includes(d.stage)) { const i = mIdx(d.order_date); if (i >= 0 && i < 12) liveBooked[i] += dash_val(d); }
    const j = mIdx(d.enquiry); if (j >= 0 && j < 12) liveEnq[j]++;
  });
  const SRC_WON = { 'Walk-in': 22, Instagram: 18, Referral: 14, Website: 10, Repeat: 10, 'Meta ad': 7, Google: 6, Exhibition: 6, B2B: 2, 'Partner boutique': 2, Marketplace: 1, 'Corporate gifting': 1, Other: 1 };
  const SRC_STOCK = { 'Walk-in': 50, Repeat: 20, Exhibition: 15, Referral: 10, Instagram: 5 };
  const SRC_LOST = { Instagram: 26, 'Meta ad': 16, Website: 14, 'Walk-in': 12, Google: 11, Referral: 5, Exhibition: 5, Repeat: 3, B2B: 2, 'Partner boutique': 2, Marketplace: 2, 'Corporate gifting': 1, Other: 1 };
  const R_BEFORE = { 'No response': 28, 'Not ready yet': 18, Price: 14, 'Design not available': 9, 'Bought elsewhere': 8, Timeline: 6, 'Natural diamond preferred': 3, Other: 2 };
  const R_AFTER = { Price: 34, 'Bought elsewhere': 20, 'No response': 16, Timeline: 10, 'Not ready yet': 8, 'Natural diamond preferred': 7, Other: 5 };
  const VENDORS = { 'Ramesh Soni (casting)': [30, .78], 'Imran Qureshi (setting)': [28, .94], 'Sunil Verma (polish)': [16, .9], 'Bablu Das (hand fabrication)': [12, .85], 'CAD Studio Jaipur': [14, .96] };
  const VW = Object.fromEntries(Object.entries(VENDORS).map(([k, v]) => [k, v[0]]));
  const MET_P = { 'Walk-in': 1, Exhibition: 1, Repeat: .6, Referral: .5 };
  const metFor = src => rnd() < (MET_P[src] || .22) ? 1 : 0;
  const rows = []; let n = 0;
  const inMonth = (m0, hours) => { const m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 1), end = m1 < limit ? m1 : limit; const x = new Date(m0.getTime() + rnd() * (end - m0)); if (hours) { x.setHours(ri(11, 19), ri(0, 59), 0, 0); if (x > limit) x.setDate(x.getDate() - 1); } return x; };

  [PRE, ...months].forEach((m0, i0) => {
    const i = i0 - 1, want = i < 0 ? 2150000 : BOOKED[i] - liveBooked[i];
    if (want > 20000) {
      const k = Math.max(1, Math.round(want / 108000));
      const w = Array.from({ length: k }, () => Math.exp(gauss() * 0.5)), sw = dash_sum(w);
      let left = want;
      w.forEach((x, j) => {
        const value = j === k - 1 ? left : Math.round(want * x / sw / 100) * 100; left -= value;
        const od = inMonth(m0, true);
        const room = (limit - od) / 864e5 - 1;
        let type = pick({ Sale: 55, Bespoke: 30, Stock: 12, Repair: 3 });
        let p1 = type === 'Bespoke' ? ri(7, 15) : type === 'Sale' ? ri(5, 11) : 0, p2 = type === 'Stock' ? 0 : type === 'Repair' ? ri(3, 7) : ri(8, 18), p3 = type === 'Stock' ? 0 : ri(1, 5);
        if (p1 + p2 + p3 > room) {
          if (room < 6) { type = 'Stock'; p1 = p2 = p3 = 0; }
          else { const f = room / (p1 + p2 + p3); p1 = Math.floor(p1 * f); p2 = Math.floor(p2 * f); p3 = Math.max(0, Math.floor(room) - p1 - p2); }
        }
        const cad = p1 ? dd(od, p1) : null, qcAt = type === 'Stock' ? null : dd(od, p1 + p2);
        let del = type === 'Stock' ? addH(od, 2) : dd(od, p1 + p2 + p3); if (del > limit) del = limit;
        const src = type === 'Stock' ? pick(SRC_STOCK) : pick(SRC_WON);
        const enq = type === 'Stock' ? addH(od, -ri(0, 40)) : dd(od, -ri(2, 21));
        const vendor = type === 'Stock' ? '' : pick(VW), onTime = !vendor || rnd() < VENDORS[vendor][1];
        const promised = vendor ? (onTime ? dd(del, ri(0, 6)) : dd(del, -ri(1, 6))) : del;
        const qc = qcAt ? (rnd() < 0.88 ? ['Pass'] : ['Rework', 'Pass']) : [];
        const adv = type === 'Stock' ? 1 : +pick({ 0.3: 60, 0.5: 25, 1: 15 });
        const a1 = Math.round(value * adv / 100) * 100, pays = [{ at: od, amt: a1 }];
        if (adv < 1) pays.push({ at: addH(del, 1), amt: value - a1 });
        rows.push({ live: 0, id: 'H' + (++n), src, met: metFor(src), type, enquiry: enq, stage: 'Closed', contacted: true, qualified: true, quoted: true, budget: true,
          won: true, order_date: od, value, delivered_at: del, lost: false, cad_approved_at: cad, qc_pass_at: qcAt, qc, vendor, promised_date: promised, pays });
      });
    }
    // about one cancelled order a month before the season peak (refund less the CAD cost)
    if (i >= 0 && i <= 9 && rnd() < 0.8) {
      const od = inMonth(m0, true), value = Math.round(110000 * Math.exp(gauss() * 0.4) / 100) * 100, adv = Math.round(value * 0.3 / 100) * 100, la = dd(od, ri(6, 18));
      const src = pick(SRC_WON);
      rows.push({ live: 0, id: 'H' + (++n), src, met: metFor(src), type: 'Sale', enquiry: dd(od, -ri(3, 15)), stage: 'Cancelled', contacted: true, qualified: true, quoted: true, budget: true,
        won: false, order_date: od, value, lost: true, lost_at: la, lost_reason: pick({ Timeline: 40, Price: 25, 'Not ready yet': 20, Other: 15 }), lost_kind: 'After order',
        pays: [{ at: od, amt: adv }, { at: dd(la, 1), amt: -Math.round(adv * 0.6 / 100) * 100 }], qc: [] });
    }
  });
  const enqHist = Array(12).fill(0); rows.forEach(r => { const j = mIdx(r.enquiry); if (j >= 0 && j < 12) enqHist[j]++; });
  months.forEach((m0, i) => {
    const k = Math.max(0, ENQ[i] - liveEnq[i] - enqHist[i]);
    for (let j = 0; j < k; j++) {
      const e = inMonth(m0, false), quoted = rnd() < 0.42, contacted = quoted || rnd() < 0.84, budget = quoted || rnd() < 0.55, reachedQ = quoted || (contacted && rnd() < 0.45);
      const stage = quoted && rnd() < 0.42 ? 'Expired' : 'Lost';
      let la = dd(e, quoted ? ri(3, 16) : ri(1, 9)); if (la > limit) la = new Date(e.getTime() + (limit - e) * rnd());
      const src = pick(SRC_LOST);
      rows.push({ live: 0, id: 'H' + (++n), src, met: metFor(src), type: 'Sale', enquiry: e, stage, contacted, qualified: reachedQ && (quoted || budget), quoted, budget,
        won: false, order_date: null, value: quoted ? Math.round(95000 * Math.exp(gauss() * 0.5) / 100) * 100 : 0, lost: true, lost_at: la,
        lost_reason: stage === 'Expired' ? 'No response' : quoted ? pick(R_AFTER) : contacted ? pick(R_BEFORE) : 'No response', lost_kind: quoted ? 'After quote' : 'Before quote', pays: [], qc: [] });
    }
  });
  return { rows, months, mIdx };
})();

/* One shape for live deals and archived rows, so every figure is computed the same way. */
function dash_liveRow(d) {
  const lostG = stg(d.stage).group === 'lost';
  return { live: 1, d, id: d.id, src: d.source_channel, met: d.met_in_person ? 1 : 0, type: d.type, enquiry: d.enquiry, stage: d.stage,
    contacted: d.stage !== 'New', quoted: !!d.quote_no, budget: (d.budget || 0) > 0, qualified: lostG ? (!!d.quote_no || (d.budget || 0) > 0) : sIdx(d.stage) >= 2,
    won: WON_STAGES.includes(d.stage), order_date: d.order_date || null, value: dash_val(d), delivered_at: d.delivered_at || null,
    lost: lostG, lost_at: d.lost_at || null, lost_reason: d.lost_reason || 'Other', lost_kind: !d.quote_no ? 'Before quote' : d.order_date ? 'After order' : 'After quote',
    pays: (d.payments || []).filter(p => !p.void).map(p => ({ at: p.paid_at, amt: p.kind === 'Refund' ? -p.amount : p.amount, d })),
    cad_approved_at: d.cad_approved_at || null, qc_pass_at: d.qc_passed_at || null, qc: (d.qc || []).map(q => q.status), vendor: d.vendor || '', promised_date: d.promised_date || null };
}
const dash_rows = vis => vis.map(dash_liveRow).concat(VIEW.role === 'ops' ? DASH_HIST.rows.filter(r => r.order_date) : DASH_HIST.rows);
const dash_srcOrder = () => { const l = opts('source_channels'); return (a, b) => { const x = l.indexOf(a), y = l.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); }; };

/* ======================= the figures ======================= */
function dash_calc(k) {
  const R = dash_range(k), inR = d => !!d && d >= R.from && d <= R.to;
  const vis = dealsVisible(), rows = dash_rows(vis);
  const C = { R, vis, rows, inR };
  C.booked = rows.filter(r => r.won && inR(r.order_date)); C.bookedV = dash_sum(C.booked, r => r.value);
  C.delivered = rows.filter(r => r.won && inR(r.delivered_at)); C.deliveredV = dash_sum(C.delivered, r => r.value);
  C.pays = rows.flatMap(r => r.pays.filter(p => inR(p.at))); C.collectedV = dash_sum(C.pays, p => p.amt);
  C.pace = Math.round(C.collectedV / R.months / SETTINGS.target_monthly_revenue * 100);
  C.balance = vis.filter(d => WON_STAGES.includes(d.stage) && money(d).balance > 0.5); C.balanceV = dash_sum(C.balance, d => money(d).balance);
  C.enq = rows.filter(r => inR(r.enquiry));
  const won = C.enq.filter(r => r.won).length, lost = C.enq.filter(r => r.lost).length;
  C.conv = won + lost ? Math.round(won / (won + lost) * 1000) / 10 : 0;
  C.leads = vis.filter(d => ['New', 'Contacted', 'Qualified'].includes(d.stage));
  C.sla = vis.filter(d => d.stage === 'New' && (TODAY - d.stage_changed_at) / 36e5 > SETTINGS.sla_whatsapp_hours);
  C.quotes = vis.filter(d => ['Quoted', 'Negotiating'].includes(d.stage)); C.quotesV = dash_sum(C.quotes, d => d.calc ? d.calc.total : 0);
  const in24 = new Date(Math.max(TODAY.getTime(), Date.now()) + 864e5);
  C.expiring = C.quotes.filter(d => d.quote_valid_till && d.quote_valid_till > TODAY && d.quote_valid_till <= in24);
  C.prod = vis.filter(d => sIdx(d.stage) >= 5 && sIdx(d.stage) <= 12); C.prodV = dash_sum(C.prod, dash_val);
  C.late = vis.filter(d => lateBadge(d) === 'late');
  C.followups = vis.filter(d => isOpen(d) && d.next_action_at && d.next_action_at < TODAY);
  const qcRows = rows.filter(r => r.qc && r.qc.length);
  C.qcN = qcRows.length; C.qcFirst = qcRows.filter(r => r.qc[0] === 'Pass').length; C.qcRate = C.qcN ? Math.round(C.qcFirst / C.qcN * 100) : null;
  const vars = vis.filter(d => ['Delivered', 'Closed'].includes(d.stage)).map(variance).filter(Boolean);
  C.varAvg = vars.length ? dash_sum(vars, v => v.pct) / vars.length : null; C.varN = vars.length; C.varBreach = vars.filter(v => Math.abs(v.pct) > v.tol).length;
  const inSafe = STOCK_ITEMS.map(it => ({ it, b: stockBal(it) })).filter(x => x.b.status === 'in_stock');
  C.safe = inSafe.filter(x => ['diamond', 'gem', 'lot'].includes(x.it.kind));
  C.safeCt = dash_sum(inSafe.filter(x => ['diamond', 'lot'].includes(x.it.kind)), x => x.b.ct);
  C.safePcs = inSafe.filter(x => x.it.kind === 'jewellery').length;
  C.stockV = dash_sum(inSafe, x => x.b.value_cost);
  C.customers = CONTACTS.filter(c => c.lifecycle === 'Cust').length;
  // monthly series: the last 12 calendar months, whatever the range
  const { months, mIdx } = DASH_HIST, z = () => Array(12).fill(0), put = (arr, d, v) => { if (!d) return; const i = mIdx(d); if (i >= 0 && i < 12) arr[i] += v; };
  C.months = months; C.mBooked = z(); C.mDel = z(); C.mCol = z(); C.mEnq = z(); C.mLost = z();
  rows.forEach(r => { if (r.won) { put(C.mBooked, r.order_date, r.value); put(C.mDel, r.delivered_at, r.value); } r.pays.forEach(p => put(C.mCol, p.at, p.amt)); put(C.mEnq, r.enquiry, 1); if (r.lost) put(C.mLost, r.lost_at, 1); });
  // funnel among deals enquired in the range
  const E = C.enq;
  C.funnel = [['Enquiries', E.length], ['Contacted', E.filter(r => r.contacted).length], ['Qualified', E.filter(r => r.qualified).length], ['Quoted', E.filter(r => r.quoted).length],
    ['Won', E.filter(r => r.won).length], ['Delivered', E.filter(r => ['Delivered', 'Closed'].includes(r.stage)).length]];
  // by source
  const bySrc = {}; E.forEach(r => { const s = r.src || 'Other'; const x = bySrc[s] = bySrc[s] || { s, enq: 0, won: 0, value: 0 }; x.enq++; if (r.won) { x.won++; x.value += r.value; } });
  C.sources = Object.values(bySrc).sort((a, b) => dash_srcOrder()(a.s, b.s));
  // spillage: lost / expired / cancelled with lost_at in range
  C.lost = rows.filter(r => r.lost && inR(r.lost_at));
  const byR = {}; C.lost.forEach(r => { const x = byR[r.lost_reason] = byR[r.lost_reason] || { r: r.lost_reason, n: 0, v: 0 }; x.n++; x.v += r.value || 0; });
  C.reasons = Object.values(byR).sort((a, b) => b.n - a.n);
  C.died = ['Before quote', 'After quote', 'After order'].map(k2 => [k2, C.lost.filter(r => r.lost_kind === k2).length]);
  // cycle times over orders delivered in the range
  const dl = rows.filter(r => r.won && inR(r.delivered_at)), avg = a => a.length ? Math.round(dash_sum(a) / a.length * 10) / 10 : null, dd = (a, b) => (b - a) / 864e5;
  C.cycleN = dl.length;
  const prom = dl.filter(r => r.promised_date); C.onTime = { n: prom.length, ok: prom.filter(r => r.delivered_at <= addDays(r.promised_date, 1)).length };
  C.cycle = [['Enquiry → order', avg(dl.filter(r => r.order_date && r.enquiry).map(r => dd(r.enquiry, r.order_date)))],
    ['Order → CAD approved', avg(dl.filter(r => r.cad_approved_at).map(r => dd(r.order_date, r.cad_approved_at)))],
    ['CAD → QC pass', avg(dl.filter(r => r.cad_approved_at && r.qc_pass_at).map(r => dd(r.cad_approved_at, r.qc_pass_at)))],
    ['Order → delivered', avg(dl.map(r => dd(r.order_date, r.delivered_at)))]];
  return C;
}

/* ======================= small charts (HTML, so text stays legible on a phone) ======================= */
function dash_nice(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function dash_cols(labels, titles, series, o) {
  o = o || {};
  const max = dash_nice(Math.max(1, o.target || 0, ...series.flatMap(s => s.vals))), ticks = o.h > 180 ? [0, .25, .5, .75, 1] : [0, .5, 1];
  const fmt = v => o.money ? (v ? inrShort(v).replace('₹', '') : '0') : String(Math.round(v));
  return `<div class="dash-ch" style="--h:${o.h || 180}px">
    <div class="dash-ch-y">${ticks.map(f => `<span style="bottom:${f * 100}%">${fmt(max * f)}</span>`).join('')}</div>
    <div class="dash-ch-p">${ticks.map(f => `<i class="dash-ch-g" style="bottom:${f * 100}%"></i>`).join('')}${o.target ? `<i class="dash-ch-t" style="bottom:${o.target / max * 100}%"><em>${esc(o.targetLabel || 'Target')}</em></i>` : ''}
      ${labels.map((l, i) => `<div class="dash-ch-c" title="${esc(titles[i] + ' · ' + series.map(s => s.name + ' ' + (o.money ? inr(s.vals[i]) : s.vals[i])).join(' · '))}">${series.map(s => `<i style="height:${Math.max(0, s.vals[i]) / max * 100}%;background:${s.color}"></i>`).join('')}</div>`).join('')}</div>
    <div></div><div class="dash-ch-x">${labels.map(l => `<span>${l}</span>`).join('')}</div></div>
    <div class="dash-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${s.name}${o.lastLabel ? ` <b class="num">${o.money ? inrShort(s.vals[s.vals.length - 1]) : s.vals[s.vals.length - 1]}</b>` : ''}</span>`).join('')}${o.lastLabel ? `<span class="muted">${esc(titles[titles.length - 1])}</span>` : ''}</div>`;
}
const dash_mLabels = () => DASH_HIST.months.map(m => MON[m.getMonth()]);
const dash_mSpan = () => { const m = DASH_HIST.months, y = d => String(d.getFullYear()).slice(2); return `${MON[m[0].getMonth()]} ${y(m[0])} – ${MON[m[11].getMonth()]} ${y(m[11])}`; };
const dash_mTitles = () => DASH_HIST.months.map(m => MON[m.getMonth()] + ' ' + m.getFullYear());
function dash_hbars(rows, o) {
  o = o || {}; const max = Math.max(1, ...rows.map(r => r.v));
  return `<div class="dash-hb">${rows.map((r, i) => `<div class="dash-hr" ${r.title ? `title="${esc(r.title)}"` : ''}><span class="truncate">${esc(r.l)}</span><div class="bar ${o.ink && i === rows.length - 1 ? 'ink' : ''}"><i style="width:${r.v / max * 100}%${r.c ? ';background:' + r.c : ''}"></i></div><span class="num strong">${r.v}</span>${o.pct ? `<span class="num xs muted">${r.p}</span>` : ''}</div>`).join('')}</div>`;
}
const DASH_TONES = ['#1A1A1A', '#B08D57', '#8C6D3F', '#D9CBB2', '#4A4642', '#C9A979', '#8A847B', '#E8DCC6', '#6E5530', '#B9B2A8', '#3B3833', '#A68A5B', '#D6CFC3'];

/* ======================= dashboard ======================= */
let DASH_RANGE = '12m';
const DASH_RANGES = [['30d', '30d'], ['90d', '90d'], ['fy', 'This FY'], ['12m', '12 months']];
const DASH_ROLE_NOTE = {
  founders: 'Everything, including business-wide money, the funnel and the stock at cost.',
  sales: 'No business-wide money. Today shows new enquiries, follow-ups and expiring quotes.',
  ops: 'Order stages only. Money tiles, the funnel and the lead lists are not sent to ops.',
  marketing: 'No money. Phones and emails are masked; no Today list.'
};
const DASH_TILE_ORDER = {
  founders: ['booked', 'delivered', 'collected', 'balance', 'enquiries', 'quotes', 'prod', 'qc', 'safe', 'stockcost'],
  sales: ['enquiries', 'leads', 'quotes', 'followups', 'prod', 'customers'],
  ops: ['prod', 'qc', 'late', 'followups', 'safe'],
  marketing: ['enquiries', 'leads', 'quotes', 'customers']
};

function dash_tiles(C) {
  const F = dash_money(), T = {
    booked: { l: 'Orders booked', ic: 'board', v: dash_short(C.bookedV), d: `${dash_pl(C.booked.length, 'order')} · AOV ${C.booked.length ? inrShort(C.bookedV / C.booked.length) : '—'}`, hi: true, k: 'booked', t: 'Σ order value (actual, else estimate, else quote) of orders whose order date is in the period' },
    delivered: { l: 'Delivered value', ic: 'truck', v: dash_short(C.deliveredV), d: 'in period', k: 'delivered', t: 'Σ order value of orders delivered in the period' },
    collected: { l: 'Cash collected', ic: 'coins', v: dash_short(C.collectedV), d: `${C.pace}% of ${inrShort(SETTINGS.target_monthly_revenue)}/mo target pace`, k: 'collected', t: 'Payments in the period, refunds netted. Pace = cash collected ÷ months in the period ÷ the monthly target (Settings → Rules)' },
    balance: { l: 'Balance outstanding', ic: 'receipt', v: dash_short(C.balanceV), d: 'on live orders', k: 'balance', t: 'Σ balance on orders from Order confirmed to Closed' },
    enquiries: { l: 'Enquiries', ic: 'funnel', v: String(C.enq.length), d: `${C.conv}% → order`, k: 'enquiries', t: 'Enquiries in the period. Conversion = won ÷ (won + lost) among them' },
    leads: { l: 'Open leads', ic: 'plus', v: String(C.leads.length), d: C.sla.length ? `<span class="down">${C.sla.length} past the reply SLA</span>` : 'none past the reply SLA', k: 'leads', t: `New, Contacted and Qualified. SLA: a New enquiry older than ${SETTINGS.sla_whatsapp_hours} h` },
    quotes: { l: 'Open quotes', ic: 'file', v: String(C.quotes.length), d: F ? `${inrShort(C.quotesV)} quoted · ${C.expiring.length} expiring` : C.expiring.length ? `<span class="down">${C.expiring.length} expiring within 24 h</span>` : 'none expiring', k: 'quotes', t: 'Quoted and Negotiating. Expiring = the client\'s 24 h validity ends within the next 24 hours' },
    prod: { l: 'In production', ic: 'hammer', v: String(C.prod.length), d: F ? inrShort(C.prodV) + ' order value' : C.late.length ? `<span class="down">${C.late.length} past promised date</span>` : 'all on schedule', k: 'prod', t: 'Order confirmed → Dispatched' },
    qc: { l: 'QC first-pass', ic: 'shield', v: C.qcRate == null ? '—' : C.qcRate + '%', d: C.varAvg != null ? `avg variance ${C.varAvg > 0 ? '+' : ''}${C.varAvg.toFixed(1)}%${C.varBreach ? ` · ${C.varBreach} over ±${SETTINGS.weight_tolerance_pct}%` : ''}` : `${C.qcFirst} of ${C.qcN} first attempts`, k: 'qc', t: 'First QC attempts that passed ÷ all first attempts, all time (the live app counted every attempt). Variance: estimate vs actual on delivered orders' },
    late: { l: 'Late orders', ic: 'alert', v: String(C.late.length), d: 'past promised date', k: 'late', t: 'Order stage, not delivered, promised date before today' },
    followups: { l: 'Overdue follow-ups', ic: 'clock', v: String(C.followups.length), d: 'next action already due', k: 'followups', t: 'Open deals whose next action is in the past' },
    customers: { l: 'Customers', ic: 'users', v: String(C.customers), d: dash_pl(CONTACTS.length, 'contact'), go: '#/customers?life=Cust', t: 'Contacts with lifecycle Customer' },
    safe: { l: 'In the safe', ic: 'gem', v: String(C.safe.length), d: `${C.safeCt.toFixed(2)} ct loose · ${dash_pl(C.safePcs, 'piece')}`, go: '#/stock', t: 'Diamonds, gems and lots in the safe; carats are the ledger balance; pieces = jewellery in stock' },
    stockcost: { l: 'Stock at cost', ic: 'scale', v: dash_short(C.stockV), d: 'in-stock items', go: '#/stock', t: 'Σ value at cost of items in stock (founders only)' }
  };
  const keys = DASH_TILE_ORDER[VIEW.role] || DASH_TILE_ORDER.sales;
  return `<div class="dash-tiles" data-n="${keys.length}">${keys.map(k => { const x = T[k]; return `<div class="card kpi dash-tile ${x.hi ? 'hi' : ''}" ${x.go ? `data-go="${x.go}"` : `data-act="dashList" data-k="${x.k}"`} title="${esc(x.t)}">
    <div class="k">${icon(x.ic, 'sm')}<span class="truncate">${x.l}</span></div><div class="v num">${x.v}</div><div class="d">${x.d}</div></div>`; }).join('')}</div>`;
}

function dash_attention(C) {
  const parts = [[C.sla, 'sla', n => `${dash_pl(n, 'new enquiry', 'new enquiries')} past the reply SLA`], [C.followups, 'followups', n => `${dash_pl(n, 'overdue follow-up')}`],
    [C.expiring, 'expiring', n => `${dash_pl(n, 'quote')} expiring within 24 h`], [C.late, 'late', n => `${dash_pl(n, 'order')} past promised date`]].filter(([a]) => a.length);
  if (!parts.length) return '';
  return `<div class="banner dash-attn mt-16">${icon('alert')}<b>Needs attention</b><span class="dash-attn-l">${parts.map(([a, k, f]) => `<button data-act="dashList" data-k="${k}">${f(a.length)}</button>`).join('<span class="sep">·</span>')}</span></div>`;
}

function dash_brief(C) {
  const name = d => `<a class="dash-bl" href="#/deal/${d.id}">${esc(dealContact(d).name)}</a>`;
  const fresh = DEALS.filter(d => d.stage === 'New').sort((a, b) => b.enquiry - a.enquiry);
  const p = [];
  if (fresh.length) {
    const nw = fresh[0], br = C.sla.filter(d => d !== nw);
    p.push(`${dash_pl(fresh.length, 'new enquiry', 'new enquiries')} waiting. ${name(nw)} asked about ${esc((nw.product_interest || 'a piece').toLowerCase())} on ${esc(nw.source_channel)} at ${dash_t(nw.enquiry)}${nw.budget ? `, budget around ${inrShort(nw.budget)}` : ''}.${br.length ? ` ${br.map(name).join(' and ')} ${br.length > 1 ? 'are' : 'is'} past the ${SETTINGS.sla_whatsapp_hours} h reply window.` : ''}`);
  }
  if (C.late.length) { const d = C.late[0], n = -daysTo(d.promised_date); p.push(`${esc(d.order_no || d.id)}, ${name(d)}'s ${esc(dealTitle(d).split(',')[0].toLowerCase())}, is ${dash_pl(n, 'day')} past its promised date at ${esc(d.vendor || 'the karigar')}. Re-promise before you call.`); }
  else p.push('Every open order is on schedule.');
  if (C.expiring.length) p.push(`${dash_pl(C.expiring.length, 'quote')} lapse in the next 24 hours: ${C.expiring.map(d => `${name(d)} (${inrShort(d.calc.total)}, ${dash_t(d.quote_valid_till)})`).join(' and ')}. Re-price or collect the advance.`);
  const dates = CONTACTS.flatMap(c => [['anniversary', c.anniversary], ['birthday', c.birthday]].filter(([, v]) => v).map(([k, v]) => { const x = new Date(v), nx = new Date(TODAY.getFullYear(), x.getMonth(), x.getDate()); if (nx < dayStart(TODAY)) nx.setFullYear(nx.getFullYear() + 1); return { c, k, nx, n: daysTo(nx) }; })).filter(x => x.n <= 14).sort((a, b) => a.n - b.n);
  if (dates.length) p.push(`${dash_pl(dates.length, 'date')} in the next 14 days: ${dates.map(x => `<a class="dash-bl" href="#/customers/${x.c.id}">${esc(x.c.name)}</a> (${x.k}, ${dash_d(x.nx)}${x.c.spend ? ', ' + inrShort(x.c.spend) + ' lifetime' : ''})`).join(' and ')}.`);
  return `<section class="card dark dash-brief"><div class="card-b">
    <div class="row"><span class="eyebrow" style="color:var(--gold)">${icon('sparkles', 'sm')} Morning briefing</span><span class="small" style="margin-left:auto;color:#8F887E">from your records, ${dash_t(TODAY)}</span></div>
    <div class="stack-s mt-12 dash-brief-t">${p.map(x => `<p>${x}</p>`).join('')}</div>
    <div class="row wrap mt-16"><button class="btn sm gold" data-act="openAssistant">${icon('sparkles', 'sm')}Ask about this</button><button class="btn sm ghost" style="color:#E7E1D8" data-go="#/inbox/t1">${icon('chat', 'sm')}Open chat</button></div>
  </div></section>`;
}

function dash_rates() {
  const g = SETTINGS.gold_rate_24k, f = p => GOLD[p][0];
  const tiles = [['24K gold', g], ['22K', g * f('22K')], ['18K', g * f('18K')], ['14K', g * f('14K')], ['Silver 999', SETTINGS.silver_rate_999], ['Platinum 950', SETTINGS.platinum_rate_950]];
  return card('Today\'s rates', `<div class="grid g2 dash-rates">${tiles.map(([k, v]) => `<div class="pill-rate"><span class="xs muted">${k} / g</span><span class="v num">${inr(v)}</span></div>`).join('')}</div>${sparkline(RATES.history)}
    <div class="row small muted">${icon('refresh', 'sm')}<span>Gold set ${dash_d(new Date(SETTINGS.gold_rate_date + 'T11:00:00'))} · quotes re-price from this rate</span></div>`,
    { right: `<a class="link" href="#/settings/rates">${can('settings.rates') ? 'Update' : 'View'} ${icon('chevR', 'sm')}</a>` });
}

function dash_stages(C) {
  const F = dash_money(), open = C.vis.filter(d => isOpen(d));
  const stages = DSTAGES.filter(s => s.i <= 13 && (VIEW.role !== 'ops' || s.i >= 5));
  const row = s => { const ds = open.filter(d => d.stage === s.key); return { s, ds, v: dash_sum(ds, dash_val), oldest: ds.length ? Math.min(...ds.map(d => d.stage_changed_at)) : null }; };
  const all = stages.map(row), used = all.filter(x => x.ds.length);
  const href = s => '#/pipeline/' + encodeURIComponent(s.key);
  const ladder = `<div class="dash-ladder">${all.map(x => `<button class="dash-stg ${x.s.group === 'order' ? 'ord' : ''} ${x.ds.length ? '' : 'zero'}" data-go="${href(x.s)}" title="${esc(x.s.label + ': ' + (F ? inr(x.v) + ' · ' : '') + dash_pl(x.ds.length, 'deal'))}">${esc(x.s.label)} <b>${x.ds.length}</b></button>`).join('')}</div>`;
  const tbl = used.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stage</th><th class="num">Deals</th>${F ? '<th class="num">Value</th>' : ''}<th class="num">Oldest</th></tr></thead><tbody>
    ${used.map(x => `<tr data-go="${href(x.s)}"><td>${stagePill(x.s.key)}</td><td class="num strong">${x.ds.length}</td>${F ? `<td class="num">${x.v ? inrShort(x.v) : '—'}</td>` : ''}<td class="num muted">${con_ago(new Date(x.oldest))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No open deals.</div>';
  return card('Pipeline by stage', ladder + tbl, { right: `<span class="small muted">${dash_pl(open.length, 'open deal')}</span>`, flush: false, cls: 'dash-stagecard' });
}

function dash_today(C) {
  const role = VIEW.role, lists = [];
  const eod = new Date(dayStart(TODAY).getTime() + 864e5 - 1);
  const li = (d, t, s, right) => `<div class="li" data-go="#/deal/${d.id}">${av(dealContact(d).name, dealContact(d).color, 'sm')}<div class="grow"><div class="t truncate">${t}</div><div class="s truncate">${s}</div></div>${right ? `<div class="tr small">${right}</div>` : ''}</div>`;
  if (['founders', 'sales'].includes(role)) {
    lists.push(['New enquiries — reply now', C.vis.filter(d => d.stage === 'New').sort((a, b) => a.enquiry - b.enquiry).map(d => li(d, esc(dealContact(d).name), `${esc(d.source_channel || '—')} · ${con_ago(d.enquiry)}`, slaHtml(d)))]);
    lists.push(['Follow-ups due', C.vis.filter(d => isOpen(d) && d.next_action_at && d.next_action_at <= eod).sort((a, b) => a.next_action_at - b.next_action_at).map(d => li(d, `${esc(dealContact(d).name)} <span class="muted" style="font-weight:400">· ${esc(d.next_action || 'follow up')}</span>`, `${stg(d.stage).label} · ${dash_dt(d.next_action_at)}`, d.next_action_at < TODAY ? badge('overdue', 'red') : badge('today', 'amber')))]);
    lists.push(['Quotes expiring', C.expiring.map(d => li(d, `${esc(dealContact(d).name)} <span class="muted mono" style="font-weight:400">${esc(d.quote_no)}</span>`, `valid till ${dash_dt(d.quote_valid_till)}`, `<b class="num">${inr(d.calc.total)}</b>`))]);
  }
  if (['founders', 'ops'].includes(role)) {
    lists.push(['QC queue', C.vis.filter(d => d.stage === 'QC').map(d => li(d, `${esc(dealContact(d).name)} <span class="muted" style="font-weight:400">· ${esc(dealTitle(d))}</span>`, `promised ${dash_d(d.promised_date)}${d.qc_status ? ' · last QC ' + d.qc_status : ''}`, lateBadge(d) === 'late' ? badge('late', 'red') : ''))]);
    lists.push(['Ready to deliver', C.vis.filter(d => d.stage === 'Ready').map(d => { const m = money(d); return li(d, `${esc(dealContact(d).name)} <span class="muted" style="font-weight:400">· ${esc(dealTitle(d))}</span>`, `${esc(d.delivery_method || 'delivery not set')} · promised ${dash_d(d.promised_date)}`, m.balance > 0.5 ? `<span class="num">balance ${inr(m.balance)}</span>` : badge('paid', 'green')); })]);
  }
  if (!lists.length) return '';
  const body = lists.filter(([, r]) => r.length).map(([t, r]) => `<div class="dash-tsub"><div class="dash-th"><b>${t}</b><span class="badge">${r.length}</span></div><div class="list">${r.slice(0, 6).join('')}</div>${r.length > 6 ? `<div class="xs dash-more"><a class="link" href="#/pipeline">+${r.length - 6} more in the pipeline ${icon('arrowR', 'sm')}</a></div>` : ''}</div>`).join('');
  return card('Today', body || '<div class="empty">Nothing due. Go sell something.</div>', { flush: true, right: `<a class="link" href="#/pipeline">open pipeline ${icon('arrowR', 'sm')}</a>` });
}

function dash_aging(C) {
  const rows = C.vis.filter(d => WON_STAGES.includes(d.stage) && !['Delivered', 'Closed'].includes(d.stage)).sort((a, b) => (a.promised_date || 8e15) - (b.promised_date || 8e15)).slice(0, 30);
  const body = rows.length ? `<div class="tbl-wrap"><table class="tbl resp dash-aging"><thead><tr><th>Order</th><th>Client</th><th>Stage</th><th>Promised</th><th class="num">Balance</th></tr></thead><tbody>
    ${rows.map(d => { const late = lateBadge(d), n = d.promised_date ? -daysTo(d.promised_date) : 0, m = money(d); return `<tr data-go="#/deal/${d.id}"><td><span class="strong mono">${esc(d.order_no || d.id)}</span></td><td class="truncate">${esc(dealContact(d).name)}</td>
      <td class="m-hide">${stagePill(d.stage)}${d.production_stage && d.stage === 'In Production' ? ` <span class="xs muted">· ${esc(d.production_stage)}</span>` : ''}</td>
      <td>${!d.promised_date ? '<span class="muted">not set</span>' : late === 'late' ? badge(n + 'd late', 'red') : late === 'soon' ? badge(dash_d(d.promised_date), 'amber') : `<span class="num">${dash_d(d.promised_date)}</span>`}</td>
      <td class="num m-hide">${m.balance > 0.5 ? inr(m.balance) : '<span class="muted">paid</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No open orders.</div>';
  return card('Orders vs promised date', body, { flush: true, right: `<span class="small muted">${dash_pl(rows.length, 'open order')}</span>` });
}

function dash_cycle(C) {
  const ot = C.onTime, extra = `<div class="dash-cyc2"><div><div class="xs muted">Delivered on time</div><div class="strong num">${ot.n ? Math.round(ot.ok / ot.n * 100) + '%' : '—'} <span class="muted small" style="font-weight:400">${ot.ok} of ${ot.n}</span></div><div class="bar ${ot.n && ot.ok / ot.n < .85 ? 'red' : 'green'} mt-8"><i style="width:${ot.n ? ot.ok / ot.n * 100 : 0}%"></i></div></div>
      <div><div class="xs muted">Estimate vs actual</div><div class="strong num">${C.varAvg == null ? '—' : (C.varAvg > 0 ? '+' : '') + C.varAvg.toFixed(1) + '%'} <span class="muted small" style="font-weight:400">avg over ${dash_pl(C.varN, 'delivered order')}</span></div><div class="xs ${C.varBreach ? 'down' : 'muted'} mt-8">${C.varBreach ? dash_pl(C.varBreach, 'order') + ' beyond' : 'none beyond'} the ±${SETTINGS.weight_tolerance_pct}% tolerance</div></div></div>`;
  const body = C.cycleN ? `<div class="dash-cyc">${C.cycle.map(([l, v]) => `<div><div class="xs muted">${l}</div><div class="dash-cv num">${v == null ? '—' : v.toFixed(1)}<small>${v == null ? '' : ' days'}</small></div></div>`).join('')}</div>
    <div class="xs muted mt-12">Averages over ${dash_pl(C.cycleN, 'order')} delivered in the period (${esc(C.R.label)}).</div>${extra}` : '<div class="empty">No delivered orders in the period yet.</div>' + extra;
  return card('Cycle times', body, { right: '<span class="small muted">days</span>' });
}

function dash_sourcesCard(C) {
  const F = dash_money();
  if (!C.sources.length) return card('By source', '<div class="empty">No enquiries in the period.</div>');
  return card('By source', `<div class="tbl-wrap"><table class="tbl dash-static"><thead><tr><th>Source</th><th class="num">Enq</th><th class="num">Won</th><th class="num">Conv</th>${F ? '<th class="num">Value</th>' : ''}</tr></thead><tbody>
    ${C.sources.map((x, i) => `<tr><td><span class="dash-dot" style="background:${DASH_TONES[opts('source_channels').indexOf(x.s) % DASH_TONES.length] || '#8A847B'}"></span>${esc(x.s)}</td><td class="num">${x.enq}</td><td class="num">${x.won}</td><td class="num">${x.enq ? Math.round(x.won / x.enq * 100) : 0}%</td>${F ? `<td class="num">${x.value ? inrShort(x.value) : '—'}</td>` : ''}</tr>`).join('')}
  </tbody></table></div>`, { flush: true, right: '<span class="small muted">how they found us</span>' });
}

function dash_spillCard(C) {
  const F = dash_money(), tot = C.lost.length || 1;
  const cols = { 'Before quote': '#D9CBB2', 'After quote': 'var(--gold)', 'After order': 'var(--ink)' };
  const body = C.lost.length ? dash_hbars(C.reasons.map(r => ({ l: r.r, v: r.n, title: `${r.r}: ${dash_pl(r.n, 'deal')}${F && r.v ? ' · ' + inr(r.v) + ' quoted' : ''}`, c: 'var(--red)' })))
    + `<div class="label mt-16">When the deal died</div><div class="dash-stack mt-8">${C.died.filter(([, n]) => n).map(([k, n]) => `<i style="flex:${n};background:${cols[k]}" title="${k}: ${n} (${Math.round(n / tot * 100)}%)"></i>`).join('')}</div>
    <div class="dash-legend">${C.died.map(([k, n]) => `<span><i style="background:${cols[k]}"></i>${k} <b class="num">${Math.round(n / tot * 100)}%</b></span>`).join('')}</div>` : '<div class="empty">Nothing lost in the period.</div>';
  return card('Spillage — why we lose', body, { right: `<span class="small muted">${C.lost.length} lost</span>` });
}

function dash_funnelCard(C) {
  const f0 = C.funnel[0][1] || 1;
  return card('Funnel', dash_hbars(C.funnel.map(([l, v]) => ({ l, v, p: Math.round(v / f0 * 100) + '%' })), { pct: true, ink: true })
    + `<div class="xs muted mt-12">Deals enquired in the period (${esc(C.R.label)}). Contacted = past New · Qualified leaves out lost deals that never had a quote or budget · Won = reached an order stage.</div>`, { right: '<span class="small muted">enquiries in period</span>' });
}
function dash_throughCard(C) {
  const t = SETTINGS.target_monthly_revenue, tot = [['Booked', dash_sum(C.mBooked)], ['Delivered', dash_sum(C.mDel)], ['Collected', dash_sum(C.mCol)], ['Target', t * 12]];
  return card('Revenue throughput — monthly', dash_cols(dash_mLabels(), dash_mTitles(), [{ name: 'Booked', color: 'var(--ink)', vals: C.mBooked }, { name: 'Delivered', color: 'var(--gold)', vals: C.mDel }, { name: 'Collected', color: '#D9CBB2', vals: C.mCol }], { h: 320, money: true, lastLabel: true, target: t, targetLabel: 'Target ' + inrShort(t) + '/mo' })
    + `<div class="dash-tot">${tot.map(([k, v]) => `<div><div class="xs muted">${k}, 12 months</div><div class="strong num">${inrShort(v)}</div></div>`).join('')}</div>`
    + '<div class="xs muted mt-8">Includes orders archived before the pipeline was set up. Calendar months, whatever the period above.</div>', { right: `<span class="small muted">${dash_mSpan()}</span>` });
}
function dash_enqLostCard(C, h) {
  return card('Enquiries vs lost — monthly', dash_cols(dash_mLabels(), dash_mTitles(), [{ name: 'Enquiries', color: 'var(--gold)', vals: C.mEnq }, { name: 'Lost', color: 'var(--red)', vals: C.mLost }], { h: h || 150, lastLabel: true }), { right: `<span class="small muted">${dash_mSpan()}</span>` });
}

SCREENS.home = {
  title: 'Dashboard', nav: 'home',
  render() {
    const role = VIEW.role, F = isFounder(), C = dash_calc(DASH_RANGE), me = viewUser();
    const hr = TODAY.getHours(), hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const seg = `<div class="seg">${DASH_RANGES.map(([k, l]) => `<button class="${DASH_RANGE === k ? 'on' : ''}" data-act="dashRange" data-r="${k}">${l}</button>`).join('')}</div>`;
    const acts = seg + (can('deals.write') ? `<button class="btn" data-go="#/quotes/new">${icon('file')}New quote</button>` : '') + (can('deals.write') || can('deals.write.lead') ? `<button class="btn primary" data-go="#/leads">${icon('plus')}New enquiry</button>` : '');
    const head = `<div class="ph"><div><div class="eyebrow">${TODAY.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · ${hello}, ${esc(me.name.split(' ')[0])}</div><h1 class="mt-8">Dashboard</h1>
      <div class="sub">Leads · quotes · orders · cash — one view <span class="muted">· ${esc(C.R.label)}</span></div></div><div class="actions">${acts}</div></div>`;
    const banner = `<div class="dash-role">${av(me.name, me.color === '#1A1A1A' ? '#8C6D3F' : me.color, 'sm')}<div class="grow"><b>Viewing as ${ROLES[role]}</b> <span class="muted">· ${esc(me.name)} · ${DASH_ROLE_NOTE[role]}</span></div><button class="btn sm" data-act="viewAs">${icon('users', 'sm')}Switch role</button></div>`;
    const out = [head, banner, dash_tiles(C), dash_attention(C)];
    if (F) out.push(`<div class="grid g-main mt-16">${dash_brief(C)}${dash_rates()}</div>`);
    // Row A: months and funnel
    if (F) out.push(`<div class="grid dash-rowA mt-16">${dash_throughCard(C)}<div class="stack">${dash_funnelCard(C)}${dash_enqLostCard(C)}</div></div>`);
    else if (['sales', 'marketing'].includes(role)) out.push(`<div class="grid dash-rowA mt-16">${dash_enqLostCard(C, 210)}${dash_funnelCard(C)}</div>`);
    // Row B: by source · spillage · cycle (ops)
    const b = [];
    if (role !== 'ops') b.push(dash_sourcesCard(C));
    if (['founders', 'marketing'].includes(role)) b.push(dash_spillCard(C));
    if (role === 'sales') b.push(dash_rates());
    if (role === 'ops') b.push(dash_cycle(C), dash_rates());
    if (b.length) out.push(`<div class="grid ${b.length === 1 ? 'dash-g1' : 'g' + b.length} dash-row mt-16">${b.join('')}</div>`);
    // Row C: pipeline by stage · today
    const today = dash_today(C);
    out.push(`<div class="grid ${today ? 'g2' : 'dash-g1'} dash-row mt-16">${dash_stages(C)}${today}</div>`);
    // Row D: aging · cycle (founders)
    if (['founders', 'ops'].includes(role)) out.push(`<div class="grid ${F ? 'dash-rowD' : 'dash-g1'} dash-row mt-16">${dash_aging(C)}${F ? dash_cycle(C) : ''}</div>`);
    return out.join('');
  }
};
ACTIONS.dashRange = el => { DASH_RANGE = el.dataset.r; render(); };

/* Every tile and alert drills into the deals behind it. */
ACTIONS.dashList = el => {
  const C = dash_calc(DASH_RANGE), k = el.dataset.k, F = dash_money();
  const arch = (rows, f) => { const h = rows.filter(r => !r.live); return h.length ? `<div class="banner mt-16">${icon('layers', 'sm')}<span>Plus ${dash_pl(h.length, 'archived record')}${F && f ? ' worth ' + inrShort(dash_sum(h, f)) : ''} from before the pipeline (closed, not listed here).</span></div>` : ''; };
  const L = {
    booked: ['Orders booked', C.R.label, C.booked.filter(r => r.live).map(r => r.d), d => F ? inr(dash_val(d)) : '', arch(C.booked, r => r.value)],
    delivered: ['Delivered', C.R.label, C.delivered.filter(r => r.live).map(r => r.d), d => F ? inr(dash_val(d)) : '', arch(C.delivered, r => r.value)],
    collected: ['Cash collected', C.R.label, [...new Set(C.pays.filter(p => p.d).map(p => p.d))], d => inr(dash_sum((d.payments || []).filter(p => !p.void && C.inR(p.paid_at)), p => p.kind === 'Refund' ? -p.amount : p.amount)), arch(C.pays.filter(p => !p.d).map(p => ({ live: 0, value: p.amt })), r => r.value)],
    balance: ['Balance outstanding', 'on live orders', C.balance, d => inr(money(d).balance), ''],
    enquiries: ['Enquiries', C.R.label, C.enq.filter(r => r.live).map(r => r.d), d => stg(d.stage).label, arch(C.enq)],
    leads: ['Open leads', 'New, Contacted, Qualified', C.leads, d => slaHtml(d) || con_ago(d.enquiry), ''],
    sla: ['Past the reply SLA', `New enquiries older than ${SETTINGS.sla_whatsapp_hours} h`, C.sla, d => slaHtml(d), ''],
    quotes: ['Open quotes', 'Quoted and Negotiating', C.quotes, d => (F || VIEW.role === 'sales' ? inr(d.calc.total) + ' · ' : '') + (quoteValid(d) ? 'rate valid' : 'expired: re-price'), ''],
    expiring: ['Quotes expiring', 'the client\'s 24 h validity ends in the next 24 hours', C.expiring, d => 'till ' + dash_dt(d.quote_valid_till), ''],
    prod: ['In production', 'Order confirmed → Dispatched', C.prod, d => d.promised_date ? (lateBadge(d) === 'late' ? badge(-daysTo(d.promised_date) + 'd late', 'red') : 'due ' + dash_d(d.promised_date)) : '', ''],
    late: ['Late orders', 'past the promised date', C.late, d => badge(-daysTo(d.promised_date) + 'd late', 'red'), ''],
    followups: ['Overdue follow-ups', 'next action already due', C.followups, d => esc(d.next_action || '') + ' · ' + dash_dt(d.next_action_at), ''],
    qc: ['QC first-pass', `${C.qcFirst} of ${C.qcN} first attempts passed, all time`, C.vis.filter(d => (d.qc || []).length), d => d.qc.map(q => q.status).join(' → '), arch(C.rows.filter(r => r.qc && r.qc.length))]
  }[k];
  if (!L) return;
  const [title, sub, deals, right, foot] = L;
  openSheet({ title, sub: esc(sub), body: (deals.length ? `<div class="card"><div class="list">${deals.map(d => `<div class="li" data-go="#/deal/${d.id}">${av(dealContact(d).name, dealContact(d).color, 'sm')}<div class="grow"><div class="t truncate">${esc(dealContact(d).name)} <span class="muted" style="font-weight:400">· ${esc(dealTitle(d))}</span></div><div class="s">${stagePill(d.stage)} <span class="mono">${esc(d.order_no || d.quote_no || d.id)}</span></div></div><div class="tr small">${right(d)}</div></div>`).join('')}</div></div>` : '<div class="empty">Nothing here right now.</div>') + foot });
};

/* ======================= reports ======================= */
let REP_RANGE = 'all';
const REP_RANGES = [['all', 'All time'], ['fy', 'This FY'], ['365', '12 months'], ['90d', '90d']];
const REP_SEGS = ['Repeat purchasers', 'High ticket', 'Quick turnaround', 'Hassle-free'];
const rep_segs = st => st.segments.filter(s => s !== 'High ticket' || can('reports'));
function rep_why(seg, st) {
  if (seg === 'Repeat purchasers') return dash_pl(st.orders_n, 'order');
  if (seg === 'High ticket') return 'largest order ' + inr(st.max_order);
  if (seg === 'Quick turnaround') return `${dash_pl(st.days_to_order, 'day')} enquiry → order · ${st.late_n ? st.late_n + ' delivered late' : 'nothing late'}`;
  if (seg === 'Hassle-free') return `${dash_pl(st.requotes_n, 're-quote')} · ${dash_pl(st.cad_revisions, 'CAD revision')} · ${dash_pl(st.touches_n, 'touch', 'touches')}`;
  return '';
}
function rep_people(R) {
  const all = R.k === 'all';
  return CONTACTS.map(c => ({ c, st: contactStats(c) })).map(x => ({ ...x, inPeriod: all || DEALS.some(d => d.contact === x.c.id && WON_STAGES.includes(d.stage) && d.order_date && d.order_date >= R.from && d.order_date <= R.to) }));
}

SCREENS.reports = {
  title: 'Reports', nav: 'reports',
  render() {
    const head = (acts) => pageHead('Reports', 'Who walks in and who buys · the clients worth studying', acts);
    if (!can('reports')) return head('') + `<div class="banner dash-attn">${icon('lock')}<span class="grow">Your role cannot open reports. Founders grant it in Settings → Access.</span><button class="btn sm" data-act="viewAs">${icon('users', 'sm')}Switch role</button></div>`;
    const R = dash_range(REP_RANGE), all = REP_RANGE === 'all';
    const seg = `<div class="seg">${REP_RANGES.map(([k, l]) => `<button class="${REP_RANGE === k ? 'on' : ''}" data-act="repRange" data-r="${k}">${l}</button>`).join('')}</div>`;
    const acts = seg + (can('export.all') ? `<button class="btn sm" data-act="repCsv">${icon('download', 'sm')}Profiles CSV</button>` : '');
    // walk-in × purchase matrix: contacts whose first enquiry falls in the period
    const people = CONTACTS.map(c => ({ c, st: contactStats(c) }));
    const pop = people.filter(x => all || (x.st.first_enquiry_at && x.st.first_enquiry_at >= R.from && x.st.first_enquiry_at <= R.to));
    const cell = (met, bought) => {
      const xs = pop.filter(x => !!x.c.met_in_person === !!met && x.st.purchased === !!bought), orders = dash_sum(xs, x => x.st.orders_n), val = dash_sum(xs, x => x.st.orders_value);
      const cap = (met ? 'Met' : 'Remote') + ' · ' + (bought ? 'bought' : 'not yet'), cls = met && bought ? 'hi' : !met && !bought ? 'dim' : '';
      const href = `#/customers?met=${met}&bought=${bought}${all ? '' : `&from=${isoDate(R.from)}&to=${isoDate(dayStart(TODAY))}`}`;
      return `<button class="rep-cell ${cls}" data-go="${href}" title="Open these contacts"><span class="rep-cap">${cap}</span><span class="rep-n num">${xs.length}</span><span class="small">${xs.length === 1 ? 'client' : 'clients'}</span><span class="xs rep-sub">${dash_pl(orders, 'order')} · AOV ${orders ? inrShort(val / orders) : '—'}</span></button>`;
    };
    const matrix = card('Walk-in × purchase', `<div class="rep-mx">
        <span></span><span class="rep-ch">Purchased</span><span class="rep-ch">Not purchased</span>
        <span class="rep-rh">Met in person</span>${cell(1, 1)}${cell(1, 0)}
        <span class="rep-rh">Never met</span>${cell(0, 1)}${cell(0, 0)}</div>
      <div class="xs muted mt-12">Purchased = at least one confirmed order. AOV = order value (actual, else the locked estimate, else the quote) ÷ orders. Met in person = ticked by hand, a Walk-in or Exhibition source, or a logged visit.</div>`,
      { right: `<span class="small muted">${all ? 'every contact' : `contacts who first enquired ${dash_d(R.from)} – ${dash_d(TODAY)}`} · ${pop.length} in all · click a box for the list</span>` });
    // profiles
    const ppl = rep_people(R).filter(x => x.inPeriod);
    const ptable = (xs, why) => xs.length ? `<div class="tbl-wrap"><table class="tbl resp rep-tbl"><thead><tr><th>Client</th><th class="num">Orders</th><th class="num">Value</th><th class="num">AOV</th><th>Why</th></tr></thead><tbody>
      ${xs.map(x => { const segs = rep_segs(x.st); return `<tr data-go="#/customers/${x.c.id}"><td><div><span class="strong">${esc(x.c.name)}</span> ${x.c.met_in_person ? '<span class="con-tag">Met</span>' : ''}${segs.length > 1 ? `<span class="badge green" title="${esc(segs.join(', '))}">${segs.length} profiles</span>` : ''}</div><div class="xs muted">${esc(x.c.source_channel || '—')}<span class="only-m"> · ${dash_pl(x.st.orders_n, 'order')} · ${inrShort(x.st.orders_value)} · AOV ${x.st.orders_n ? inrShort(x.st.aov) : '—'}</span></div></td>
        <td class="num m-hide">${x.st.orders_n}</td><td class="num m-hide">${inrShort(x.st.orders_value)}</td><td class="num m-hide">${x.st.orders_n ? inrShort(x.st.aov) : '—'}</td><td class="small ink2 rep-why">${esc(why(x))}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Nobody yet.</div>';
    const profiles = REP_SEGS.map(sg => { const xs = ppl.filter(x => rep_segs(x.st).includes(sg)).sort((a, b) => b.st.orders_value - a.st.orders_value); return card(sg, ptable(xs, x => rep_why(sg, x.st)), { flush: true, right: `<span class="badge ${xs.length ? 'green' : ''}">${xs.length}</span>` }); });
    const multi = ppl.filter(x => rep_segs(x.st).length >= 2).sort((a, b) => rep_segs(b.st).length - rep_segs(a.st).length);
    const study = card('In two or more profiles', ptable(multi, x => rep_segs(x.st).join(' · ')) + `<div class="xs muted rep-foot">Repeat purchasers: 2+ confirmed orders. High ticket: a single order of ${inrShort(SETTINGS.high_value_threshold)} or more. Quick turnaround: first order within ${SETTINGS.profile_quick_days} days of the first enquiry. Hassle-free: an order with no re-quote, no CAD revision and ${SETTINGS.profile_hassle_touches} touches or fewer. Thresholds live in Settings → Rules.${all ? '' : ' With a period set, purchasers are those with an order in the period; their figures are lifetime.'}</div>`,
      { flush: true, right: `<span class="small muted">${multi.length} — the clients to study</span>` });
    // SaaS extras, recomputed from the records (archive included)
    const C = dash_calc(REP_RANGE === 'all' ? 'all' : REP_RANGE);
    const kpis = [['Orders booked', inrShort(C.bookedV), dash_pl(C.booked.length, 'order')], ['Average order', C.booked.length ? inrShort(C.bookedV / C.booked.length) : '—', 'order value ÷ orders'],
      ['Enquiry → order', C.conv + '%', `won ÷ (won + lost), ${dash_pl(C.enq.length, 'enquiry', 'enquiries')}`], ['Walk-in conversion', (() => { const m = pop.filter(x => x.c.met_in_person); return m.length ? Math.round(m.filter(x => x.st.purchased).length / m.length * 100) + '%' : '—'; })(), 'met in person who bought']];
    const vend = {}; C.rows.filter(r => r.won && r.vendor && (C.inR(r.order_date) || C.inR(r.delivered_at))).forEach(r => { const v = vend[r.vendor] = vend[r.vendor] || { v: r.vendor, n: 0, ok: 0, lateOpen: 0 }; v.n++; const live = r.live ? r.d : null;
      const late = live ? (lateBadge(live) === 'late' || (live.delivered_at && live.promised_date && live.delivered_at > addDays(live.promised_date, 1))) : r.delivered_at > addDays(r.promised_date, 1); if (!late) v.ok++; if (live && lateBadge(live) === 'late') v.lateOpen++; });
    const vrows = Object.values(vend).sort((a, b) => b.ok / b.n - a.ok / a.n);
    const ages = [['Under 30 days', 0, 30], ['30–90 days', 30, 90], ['90–180 days', 90, 180], ['Over 180 days', 180, 1e5]];
    const stock = STOCK_ITEMS.map(it => ({ it, b: stockBal(it), age: (TODAY - new Date(it.purchased_at)) / 864e5 })).filter(x => x.b.status === 'in_stock');
    const showCost = can('stock.cost');
    const extras = `<div class="grid g4 kpis mt-16">${kpis.map(([k, v, d]) => `<div class="card kpi"><div class="k">${k}</div><div class="v num">${v}</div><div class="d">${d}</div></div>`).join('')}</div>
      <div class="grid g2 mt-16">
        ${card('Revenue by month', dash_cols(dash_mLabels(), dash_mTitles(), [{ name: 'Booked', color: 'var(--ink)', vals: C.mBooked }, { name: 'Collected', color: '#D9CBB2', vals: C.mCol }], { h: 210, money: true, lastLabel: true }) + '<div class="xs muted mt-8">Last 12 months, whatever the period. Includes orders archived before the pipeline.</div>')}
        ${card('Where orders come from', `<div class="tbl-wrap"><table class="tbl dash-static"><thead><tr><th>Source</th><th class="num">Enquiries</th><th class="num">Orders</th><th class="num">Conv.</th><th class="num">Revenue</th></tr></thead><tbody>${C.sources.filter(x => x.enq).sort((a, b) => b.value - a.value).map(x => `<tr><td class="strong">${esc(x.s)}</td><td class="num">${x.enq}</td><td class="num">${x.won}</td><td class="num">${Math.round(x.won / x.enq * 100)}%</td><td class="num">${x.value ? inrShort(x.value) : '—'}</td></tr>`).join('')}</tbody></table></div>`, { flush: true, right: `<span class="small muted">${esc(C.R.label)}</span>` })}
      </div>
      <div class="grid g2 mt-16">
        ${card('Karigar on-time rate', vrows.length ? `<div class="stack-s">${vrows.map(v => { const p = Math.round(v.ok / v.n * 100); return `<div><div class="row between small"><span class="truncate">${esc(v.v)}</span><span class="num"><b>${p}%</b> <span class="muted">of ${v.n}${v.lateOpen ? ` · ${v.lateOpen} late now` : ''}</span></span></div><div class="bar ${p < 85 ? 'red' : 'ink'} mt-8"><i style="width:${p}%"></i></div></div>`; }).join('')}</div><div class="xs muted mt-12">On time = delivered by the promised date (one day's grace); open orders count as late once the date passes.</div>` : '<div class="empty">No vendor orders in the period.</div>', { right: `<span class="small muted">${esc(C.R.label)}</span>` })}
        ${card('Stock age', `<div class="stack-s">${ages.map(([l, a, b]) => { const xs = stock.filter(x => x.age >= a && x.age < b), v = dash_sum(xs, x => x.b.value_cost), tv = dash_sum(stock, x => x.b.value_cost) || 1; return `<div><div class="row between small"><span>${l}</span><span class="num"><b>${dash_pl(xs.length, 'item')}</b>${showCost ? ` <span class="muted">· ${inrShort(v)} at cost</span>` : ''}</span></div><div class="bar mt-8"><i style="width:${(showCost ? v / tv : xs.length / (stock.length || 1)) * 100}%"></i></div></div>`; }).join('')}</div>
          <div class="xs muted mt-12">Items in the safe, by days since purchase.${showCost ? '' : ' Value at cost needs the stock.cost permission.'}</div>`, { right: `<a class="link" href="#/stock">Stock ${icon('chevR', 'sm')}</a>` })}
      </div>`;
    return head(acts) + `<div class="small muted rep-period">${icon('calendar', 'sm')} Period: <b class="ink2">${esc(R.label)}</b></div>` + matrix
      + `<div class="grid g2 mt-16">${profiles.join('')}</div><div class="mt-16">${study}</div>` + extras;
  }
};
ACTIONS.repRange = el => { REP_RANGE = el.dataset.r; render(); };
ACTIONS.repCsv = () => {
  if (!(can('reports') && can('export.all'))) return toast('Profiles CSV needs reports and export.all', 'lock');
  const R = dash_range(REP_RANGE), xs = rep_people(R).filter(x => x.inPeriod);
  const rows = [['contact_id', 'name', 'source', 'source_code', 'met_in_person', 'orders', 'value', 'aov', 'days_enquiry_to_order', 'delivered_late', 're_quotes', 'cad_revisions', 'touches', 'profiles']]
    .concat(xs.map(({ c, st }) => [c.id, c.name, c.source_channel || '', c.source_code || '', c.met_in_person ? 1 : 0, st.orders_n, Math.round(st.orders_value), Math.round(st.aov), st.days_to_order == null ? '' : st.days_to_order, st.late_n, st.requotes_n, st.cad_revisions, st.touches_n, rep_segs(st).join('; ')]));
  dash_download(`marqa-profiles-${REP_RANGE}-${isoDate(TODAY)}.csv`, dash_csv(rows));
  dash_audit('export_report', 'export', 'profiles', `${xs.length} rows · ${R.label}`);
  BULK_EVENTS.unshift({ at: NOW(), who: viewUser().id, what: `Exported client profiles (${xs.length} rows, ${R.label})` });
  toast(`Profiles CSV: ${xs.length} rows · logged in the audit`, 'download');
};

/* ======================= contacts ======================= */
const CON_LIFE = { Inq: ['Enquiry', 'lead'], Cust: ['Customer', 'order'], Dormant: ['Dormant', 'closed'], Lost: ['Lost', 'lost'] };
const con_life = l => { const x = CON_LIFE[l] || CON_LIFE.Inq; return `<span class="spill ${x[1]}">${x[0]}</span>`; };
const con_canWrite = () => can('contacts.write');
const con_canMerge = () => ['founders', 'sales'].includes(VIEW.role);
const con_deals = c => dealsVisible().filter(d => d.contact === c.id);
const con_lastTouch = c => DEALS.filter(d => d.contact === c.id).flatMap(d => d.activities.map(a => a.at)).sort((a, b) => b - a)[0] || c.created_at;
const con_digits = p => String(p || '').replace(/\D/g, '').slice(-10);
const con_tpl = (t, c) => t.replace(/\{(\w+)\}/g, (_, k) => k === 'tags' ? (c.tags || []).join(' ') : k === 'met_in_person' ? (c.met_in_person ? 'Yes' : 'No') : (c[k] == null ? '' : String(c[k]))).replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
const con_gname = c => con_tpl(SETTINGS.google_first_template + ' ' + SETTINGS.google_last_template, c);
function con_e164(raw) {
  const s = String(raw || '').trim(); if (!s) return '';
  let dg = s.replace(/\D/g, ''); const intl = s.startsWith('+') || s.startsWith('00'); if (s.startsWith('00')) dg = dg.slice(2);
  if (!intl) { if (dg.length === 10 && /^[6-9]/.test(dg)) return '+91' + dg; if (dg.length === 12 && dg.startsWith('91')) return '+' + dg; if (dg.length === 11 && dg.startsWith('0')) return '+91' + dg.slice(1); return null; }
  return dg.length >= 8 && dg.length <= 15 ? '+' + dg : null;
}
const con_pretty = e => !e ? '' : e.startsWith('+91') && e.length === 13 ? `+91 ${e.slice(3, 8)} ${e.slice(8)}` : e.replace(/^\+(\d{1,3})(\d+)$/, '+$1 $2');
const con_hasMoney = c => DEALS.some(d => d.contact === c.id && (d.order_date || (d.payments || []).some(p => !p.void)));
const con_qs = () => { const q = location.hash.split('?')[1] || ''; const o = {}; new URLSearchParams(q).forEach((v, k) => { o[k] = v; }); return o; };
const con_setQs = F => { const p = new URLSearchParams(); ['q', 'life', 'source', 'met', 'bought', 'from', 'to'].forEach(k => { if (F[k] != null && F[k] !== '') p.set(k, F[k]); }); const s = p.toString(); try { history.replaceState(null, '', '#/customers' + (s ? '?' + s : '')); } catch (_) {} };
let CON_PAGE = 1;
const CON_PER = 60;

function con_filter(F) {
  const q = (F.q || '').trim().toLowerCase(), qd = q.replace(/\D/g, ''), mk = VIEW.role === 'marketing', ops = VIEW.role === 'ops';
  const from = F.from ? new Date(F.from + 'T00:00:00') : null, to = F.to ? new Date(F.to + 'T23:59:59') : null;
  return CONTACTS.filter(c => {
    if (q) {
      const hay = [c.name, c.city, c.state, c.country, c.instagram, ops ? '' : c.source_code, mk ? '' : c.email].join(' ').toLowerCase();
      const ph = !mk && qd.length >= 3 && [c.phone, c.phone_alt].some(p => String(p || '').replace(/\D/g, '').includes(qd));
      if (!hay.includes(q) && !ph) return false;
    }
    if (F.life && c.lifecycle !== F.life) return false;
    if (F.source && c.source_channel !== F.source) return false;
    if (F.met === '1' && !c.met_in_person) return false;
    if (F.met === '0' && c.met_in_person) return false;
    if (F.bought || from) {
      const st = contactStats(c);
      if (F.bought === '1' && !st.purchased) return false;
      if (F.bought === '0' && st.purchased) return false;
      if (from && (!st.first_enquiry_at || st.first_enquiry_at < from || (to && st.first_enquiry_at > to))) return false;
    }
    return true;
  }).sort((a, b) => (con_lastTouch(b) || 0) - (con_lastTouch(a) || 0));
}

function con_listInner(F) {
  const list = con_filter(F), pages = Math.max(1, Math.ceil(list.length / CON_PER));
  if (CON_PAGE > pages) CON_PAGE = pages;
  const page = list.slice((CON_PAGE - 1) * CON_PER, CON_PAGE * CON_PER), mk = VIEW.role === 'marketing', ops = VIEW.role === 'ops', rep = can('reports');
  const tiles = [['Matching contacts', list.length, dash_pl(CONTACTS.length, 'contact') + ' in all'], ['Customers on this page', page.filter(c => c.lifecycle === 'Cust').length, 'lifecycle Customer'],
    ['Met in person', list.filter(c => c.met_in_person).length, 'of the matching contacts'], ['Name format', `<span class="mono con-fmt">${esc(SETTINGS.google_first_template + ' ' + SETTINGS.google_last_template)}</span>`, 'Google Contacts display name']];
  const rows = page.map(c => {
    const st = contactStats(c), n = con_deals(c).length, abroad = c.country && c.country !== 'India';
    return `<tr data-go="#/customers/${c.id}">
      <td><div class="row">${av(c.name, c.color || '#8A847B', 'sm')}<div class="grow"><div class="strong truncate">${esc(c.name)}</div><div class="xs muted truncate">${esc(maskEmail(c.email) || '')}</div>
        <div class="xs muted only-m truncate">${esc(maskPhone(c.phone) || '—')} · ${esc(c.city || '—')}${(c.tags || []).length ? ' · ' + esc(c.tags.join(', ')) : ''}</div></div></div></td>
      <td class="m-hide num dash-nowrap">${esc(maskPhone(c.phone) || '—')}</td>
      <td class="m-hide">${esc(c.city || '—')}${abroad ? `<div class="xs con-abroad">${esc(c.country)}</div>` : ''}</td>
      <td class="m-hide">${ops ? '' : c.source_channel ? `<span class="con-tag">${esc(c.source_channel)}</span>` : ''}${c.met_in_person ? '<span class="con-tag">Met</span>' : ''}${ops || !c.source_code ? '' : `<div class="xs muted mono">${esc(c.source_code)}</div>`}</td>
      <td class="m-hide">${(c.tags || []).map(t => `<span class="con-tag ${t === 'NRI' ? 'nri' : ''}">${esc(t)}</span>`).join('') || '<span class="muted">—</span>'}</td>
      <td>${con_life(c.lifecycle)}</td>
      <td class="num m-hide">${n}</td>
      ${rep ? `<td class="num m-hide">${st.orders_value ? inrShort(st.orders_value) : '—'}</td>` : ''}
      <td class="m-hide muted dash-nowrap">${con_ago(con_lastTouch(c))}</td></tr>`;
  }).join('');
  return `<div class="grid g4 kpis mt-16 con-tiles">${tiles.map(([k, v, d]) => `<div class="card kpi"><div class="k">${k}</div><div class="v num">${v}</div><div class="d">${d}</div></div>`).join('')}</div>
    <div class="card mt-16">${page.length ? `<div class="tbl-wrap"><table class="tbl resp con-tbl"><thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Source</th><th>Tags</th><th>Status</th><th class="num">Deals</th>${rep ? '<th class="num" title="Σ order value of confirmed orders (same figure as Reports)">Lifetime</th>' : ''}<th>Last touch</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty">No contacts match.${Object.keys(F).length ? ' <button class="btn sm mt-8" data-act="conClear">Clear filters</button>' : ''}</div>`}
      <div class="con-pager"><span class="small muted">Page ${CON_PAGE} of ${pages} · ${list.length} total · ${CON_PER} per page</span><span class="grow"></span>
        <button class="btn sm ${CON_PAGE <= 1 ? 'con-dis' : ''}" data-act="conPage" data-dir="-1">${icon('chevL', 'sm')}Prev</button><button class="btn sm ${CON_PAGE >= pages ? 'con-dis' : ''}" data-act="conPage" data-dir="1">Next${icon('chevR', 'sm')}</button></div></div>
    ${mk ? `<div class="xs muted mt-8">${icon('lock', 'sm')} Marketing view: phones show the last four digits and emails are masked.</div>` : ''}`;
}

function con_listPage() {
  const F = con_qs(), ops = VIEW.role === 'ops';
  const sel = (k, first, items) => `<select class="select" data-f="${k}" aria-label="${first}">${[['', first], ...items].map(([v, l]) => `<option value="${esc(v)}" ${String(F[k] || '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const acts = (con_canMerge() ? `<button class="btn" data-act="conDupes">${icon('copy')}Duplicates</button>` : '')
    + (can('export.google') ? `<button class="btn" data-act="conGoogle">${icon('download')}Google Contacts CSV</button>` : `<span class="small muted con-note" title="Founders grant export.google in Settings → Access">${icon('lock', 'sm')}Google CSV: founders only</span>`)
    + (con_canWrite() ? `<button class="btn primary" data-act="conNew">${icon('plus')}Contact</button>` : '');
  const fromChip = F.from ? `<button class="badge gold con-chipx" data-act="conClearFrom" title="Remove the period">${icon('calendar', 'sm')}First enquiry ${dash_d(new Date(F.from + 'T00:00:00'))} – ${F.to ? dash_d(new Date(F.to + 'T00:00:00')) : 'today'} ${icon('x', 'sm')}</button>` : '';
  const filtered = ['q', 'life', 'source', 'met', 'bought', 'from'].some(k => F[k]);
  return pageHead('Contacts', `${dash_pl(CONTACTS.length, 'person', 'people')} · ${CONTACTS.filter(c => c.lifecycle === 'Cust').length} customers · search, filter, merge`, acts)
    + `<div class="card con-bar"><label class="con-search">${icon('search', 'sm')}<input class="input" id="conQ" placeholder="name, phone, code, city, email…" value="${esc(F.q || '')}" autocomplete="off"></label>
      ${sel('life', 'All statuses', [['Inq', 'Enquiries (Inq)'], ['Cust', 'Customers (Cust)'], ['Dormant', 'Dormant'], ['Lost', 'Lost']])}
      ${ops ? '' : sel('source', 'All sources', opts('source_channels').map(s => [s, s]))}
      ${sel('met', 'Met or not', [['1', 'Met in person'], ['0', 'Never met']])}
      ${sel('bought', 'Bought or not', [['1', 'Purchased'], ['0', 'Not purchased']])}
    </div>${fromChip || filtered ? `<div class="row wrap mt-8">${fromChip}${filtered ? `<button class="btn sm ghost" data-act="conClear">${icon('x', 'sm')}Clear filters</button>` : ''}<span class="xs muted">Purchased = at least one confirmed order</span></div>` : ''}
    <div id="conList">${con_listInner(F)}</div>`;
}

/* ---------- contact card ---------- */
const CON_ACT_IC = { stage: 'layers', whatsapp: 'wa', template: 'send', call: 'phone', email: 'mail', visit: 'pin', meeting: 'users', payment: 'coins', qc: 'shield', quote: 'file', system: 'settings', note: 'edit' };
let CON_TL_ALL = false;
function con_card(c) {
  const st = contactStats(c), mk = VIEW.role === 'marketing', ops = VIEW.role === 'ops', rep = can('reports'), F = isFounder();
  const deals = con_deals(c).sort((a, b) => b.enquiry - a.enquiry), abroad = c.country && c.country !== 'India';
  const segs = rep_segs(st), showMoney = !mk;
  const kv = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  const facts = `<dl class="kv con-kv">
      ${kv('Phone', esc(maskPhone(c.phone)) + (c.phone_alt ? ` <span class="muted">· ${esc(maskPhone(c.phone_alt))}</span>` : ''))}
      ${kv('Email', esc(maskEmail(c.email)))}
      ${kv('City', esc([c.city, c.state].filter(Boolean).join(', ')))}
      ${kv('Instagram', esc(c.instagram))}
      ${ops ? '' : kv('Source', c.source_channel ? `<span class="con-tag">${esc(c.source_channel)}</span>` : '')}
      ${ops ? '' : kv('Source code', c.source_code ? `<span class="mono">${esc(c.source_code)}</span>` : '')}
      ${kv('Country', esc(c.country || 'India') + (abroad ? ' ' + `<span class="badge red" title="International — export compliance applies">INTL</span>` : ''))}
      ${kv('Met in person', c.met_in_person ? 'Yes' : 'No')}
      ${kv('Tags', (c.tags || []).map(t => `<span class="con-tag ${t === 'NRI' ? 'nri' : ''}">${esc(t)}</span>`).join(''))}
      ${kv('Birthday', c.birthday ? dash_d(new Date(c.birthday)) : '')}
      ${kv('Anniversary', c.anniversary ? dash_d(new Date(c.anniversary)) : '')}
      ${kv('Marketing consent', c.consent_marketing ? 'Yes' : '<span class="down">No</span>')}
    </dl>
    <div class="xs muted mt-12">Google Contacts name: <span class="mono ink2">${esc(con_gname(c))}</span></div>`;
  // profile block
  let profile;
  if (!st.orders_n) profile = `<div class="small muted">No confirmed order yet · ${dash_pl(st.deals_n, 'enquiry', 'enquiries')} · ${dash_pl(st.touches_n, 'touch', 'touches')}${st.first_enquiry_at ? ' · first enquiry ' + dash_d(st.first_enquiry_at) : ''}</div>`;
  else {
    const stats = [['Orders', st.orders_n], rep ? ['Value', inrShort(st.orders_value)] : null, rep ? ['AOV', inrShort(st.aov)] : null, ['Enquiry → order', st.days_to_order == null ? '—' : dash_pl(st.days_to_order, 'day')],
      ['Delivered', st.delivered_n + (st.late_n ? ` <span class="down">(${st.late_n} late)</span>` : '')], ['Re-quotes', st.requotes_n], ['CAD revisions', st.cad_revisions], ['Touches', st.touches_n]].filter(Boolean);
    profile = `<div class="stack-s">${segs.length ? segs.map(s => `<div class="con-seg"><span class="badge green">${esc(s)}</span><span class="small muted">${esc(rep_why(s, st))}</span></div>`).join('') : '<div class="small muted">no profile yet</div>'}</div>
      <div class="con-stats mt-16">${stats.map(([k, v]) => `<div><div class="xs muted">${k}</div><div class="strong num">${v}</div></div>`).join('')}</div>
      ${rep ? '' : '<div class="xs muted mt-8">Order values, AOV and High ticket need the reports permission.</div>'}`;
  }
  // deals
  const dealList = deals.length ? `<div class="list">${deals.map(d => `<div class="li" data-go="#/deal/${d.id}">${d.img ? `<img class="thumb" src="${img(d.img, 120)}" alt="" loading="eager">` : `<span class="thumb con-nothumb">${icon('gem', 'sm')}</span>`}<div class="grow"><div class="t truncate">${esc(dealTitle(d))}</div>
      <div class="s"><span class="mono">${esc(d.order_no || d.quote_no || d.id)}</span> · ${dash_d(d.enquiry)}${typePill(d) ? ' ' + typePill(d) : ''}</div></div><div class="tr">${stagePill(d.stage)}${showMoney && d.calc && d.calc.total ? `<div class="small strong num mt-8">${inr(d.calc.total)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">None yet.</div>';
  // merged timeline
  const acts = deals.flatMap(d => d.activities.map(a => ({ a, d }))).sort((x, y) => y.a.at - x.a.at), shown = CON_TL_ALL ? acts : acts.slice(0, 10);
  const tl = acts.length ? `<div class="tl">${shown.map(({ a, d }) => `<div class="tli con-tli" data-go="#/deal/${d.id}/activity"><span class="ic">${icon(CON_ACT_IC[a.type] || 'edit')}</span><div class="grow" style="min-width:0">
      <div class="row between top"><span class="tt strong">${esc(a.subject || a.type)}</span><span class="tm dash-nowrap">${dash_dt(a.at)}</span></div>
      ${a.body ? `<div class="small ink2 con-body">${esc(String(a.body).slice(0, 160))}${String(a.body).length > 160 ? '…' : ''}</div>` : ''}
      <div class="tm">${esc(userName(a.by))} · <span class="mono">${esc(d.order_no || d.quote_no || d.id)}</span></div></div></div>`).join('')}</div>
      ${acts.length > 10 ? `<button class="btn sm ghost mt-8" data-act="conTlAll">${CON_TL_ALL ? 'Show the latest 10' : `Show all ${acts.length}`}</button>` : ''}` : '<div class="empty">—</div>';
  // DPDP
  const dpdp = `<div class="row between"><div><div class="strong small">Marketing consent</div><div class="xs muted">Gates post-purchase and campaign messages</div></div>
      <label class="switch" title="${con_canWrite() ? 'Change consent' : 'Needs contacts.write'}"><input type="checkbox" data-act="conConsent" data-id="${c.id}" ${c.consent_marketing ? 'checked' : ''} ${con_canWrite() ? '' : 'disabled'}><span></span></label></div>
    <div class="row wrap mt-16"><button class="btn sm" data-act="conExport" data-id="${c.id}">${icon('download', 'sm')}Export data</button>${F ? `<button class="btn sm danger" data-act="conErase" data-id="${c.id}">${icon('x', 'sm')}Erase on request</button>` : ''}</div>
    <div class="xs muted mt-8">${F ? 'Erasure keeps invoices and payments for the period the law requires.' : 'Erasure requests go to a founder.'}</div>`;
  const record = `<dl class="kv con-kv"><dt>Contact ID</dt><dd class="mono">#${esc(c.id)}</dd><dt>Created</dt><dd>${dash_d(c.created_at)}${c.created_by ? ' · ' + esc(userName(c.created_by)) : ''}</dd>
    ${c.updated_at ? `<dt>Updated</dt><dd>${dash_dt(c.updated_at)}</dd>` : ''}<dt>Google sync</dt><dd>${c.google_synced_at ? dash_dt(c.google_synced_at) : '<span class="muted">never</span>'}</dd>
    ${c.import_batch ? `<dt>Import batch</dt><dd class="mono">${esc(c.import_batch)}</dd>` : ''}</dl>`;
  const btns = `<button class="btn wa" data-act="conWa" data-id="${c.id}">${icon('wa')}WhatsApp</button><button class="btn" data-act="conCall" data-id="${c.id}">${icon('phone')}Call</button>
    ${con_canWrite() ? `<button class="btn" data-act="conEdit" data-id="${c.id}">${icon('edit')}Edit</button>` : ''}
    ${can('deals.write') || can('deals.write.lead') ? `<button class="btn gold" data-act="conEnquiry" data-id="${c.id}">${icon('plus')}New enquiry</button>` : ''}
    ${con_canMerge() ? `<button class="btn" data-act="conMerge" data-id="${c.id}">${icon('layers')}Merge into…</button>` : ''}
    ${F ? `<button class="btn danger" data-act="conDelete" data-id="${c.id}" title="Founders only — goes to the Trash with their open enquiries; restorable">${icon('x')}Delete…</button>` : ''}`;
  return `<div class="card con-head"><div class="card-b row wrap gap-16">${av(c.name, c.color || '#8A847B', 'lg')}<div class="grow"><div class="row wrap gap-6"><h1 class="con-name">${esc(c.name)}</h1>${con_life(c.lifecycle)}${abroad ? '<span class="badge red" title="International — export compliance applies">INTL</span>' : ''}</div>
      <div class="small muted num mt-8">${esc(maskPhone(c.phone) || 'no phone')} · ${esc(c.city || '—')} · client since ${c.created_at.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} · <span class="mono">#${esc(c.id)}</span></div>
      ${(c.tags || []).length || c.met_in_person ? `<div class="row wrap gap-6 mt-8">${(c.tags || []).map(t => `<span class="con-tag ${t === 'NRI' ? 'nri' : ''}">${esc(t)}</span>`).join('')}${c.met_in_person ? '<span class="con-tag">Met</span>' : ''}</div>` : ''}</div>
      <div class="actions row wrap con-btns">${btns}</div></div></div>
    ${abroad ? `<div class="banner red mt-16">${icon('globe')}<span>International (${esc(c.country)}). Export compliance applies — founders sign off before invoicing.</span></div>` : ''}
    <div class="grid g-main mt-16"><div class="stack">
      ${card('Profile', profile, { right: segs.length ? `<span class="badge green">${dash_pl(segs.length, 'profile')}</span>` : '' })}
      ${card('Deals', dealList, { flush: true, right: `<span class="small muted">${dash_pl(deals.length, 'deal')}</span>` })}
      ${card('Activity', tl, { right: `<span class="small muted">across ${dash_pl(deals.length, 'deal')}</span>` })}
    </div><div class="stack">
      ${card('Details', facts)}
      ${c.notes ? card('Notes', `<div class="small ink2 con-notes">${esc(c.notes)}</div>`) : ''}
      ${card('Privacy (DPDP)', dpdp, { right: icon('shield', 'sm') })}
      ${card('Record', record)}
    </div></div>`;
}

SCREENS.customers = {
  title: 'Contacts', nav: 'customers',
  render(p) {
    if (p.id) { const c = contactById(p.id); return c ? con_card(c) : `<div class="empty">That contact is not here any more (merged or in the Trash). <a class="link strong" href="#/customers">All contacts</a></div>`; }
    return con_listPage();
  },
  mount(root, p) {
    if (p.id) return;
    const q = root.querySelector('#conQ');
    if (q) q.addEventListener('input', () => { const F = con_qs(); F.q = q.value; CON_PAGE = 1; con_setQs(F); const box = root.querySelector('#conList'); if (box) box.innerHTML = con_listInner(F); });
    root.querySelectorAll('.con-bar select[data-f]').forEach(s => s.addEventListener('change', () => { const F = con_qs(); F[s.dataset.f] = s.value; CON_PAGE = 1; con_setQs(F); render(); }));
  }
};
ACTIONS.conClear = () => { CON_PAGE = 1; con_setQs({}); render(); };
ACTIONS.conClearFrom = () => { const F = con_qs(); delete F.from; delete F.to; con_setQs(F); render(); };
ACTIONS.conPage = el => {
  const F = con_qs(), pages = Math.max(1, Math.ceil(con_filter(F).length / CON_PER)), n = CON_PAGE + +el.dataset.dir;
  if (n < 1 || n > pages) return toast(pages === 1 ? `Everything fits on one page (${CON_PER} per page)` : n < 1 ? 'Already on the first page' : 'Already on the last page', 'layers');
  CON_PAGE = n; render();
};
ACTIONS.conTlAll = () => { CON_TL_ALL = !CON_TL_ALL; render(); };

/* WhatsApp and call: open the thread when there is one, else show the number */
ACTIONS.conWa = el => {
  const c = contactById(el.dataset.id), t = THREADS.find(x => x.cust === c.id);
  if (t) return go('#/inbox/' + t.id);
  openSheet({ title: 'WhatsApp ' + esc(c.name), sub: 'No conversation yet on the shop\'s WhatsApp Business number',
    body: `<div class="card"><div class="card-b"><div class="label">Number</div><div class="con-big num mt-8">${esc(maskPhone(c.phone) || 'no phone on record')}</div>
      ${c.consent_marketing ? '' : `<div class="banner mt-12">${icon('alert', 'sm')}<span>No marketing consent: send service messages only (quotes, order updates).</span></div>`}
      <div class="small muted mt-12">The chat opens from the shop number, so the conversation stays in the shared inbox.</div></div></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn wa" data-act="conWaStart" data-id="${c.id}" ${c.phone ? '' : 'disabled'}>${icon('wa')}Start chat</button>` });
};
ACTIONS.conWaStart = el => { const c = contactById(el.dataset.id); closeLayer(); toast(`Chat started with ${c.name} on the shop's WhatsApp`, 'wa'); };
ACTIONS.conCall = el => {
  const c = contactById(el.dataset.id), mk = VIEW.role === 'marketing', last = con_deals(c).sort((a, b) => b.enquiry - a.enquiry)[0];
  openSheet({ title: 'Call ' + esc(c.name), sub: c.phone_alt ? 'Primary and alternate numbers' : 'Primary number',
    body: `<div class="card"><div class="card-b"><div class="label">Phone</div><div class="con-big num mt-8">${esc(maskPhone(c.phone) || 'no phone on record')}</div>
      ${c.phone_alt ? `<div class="label mt-12">Alt phone</div><div class="strong num mt-8">${esc(maskPhone(c.phone_alt))}</div>` : ''}
      ${mk ? `<div class="small muted mt-12">${icon('lock', 'sm')} The full number is hidden for marketing; the call goes through the shop line.</div>` : ''}</div></div>
      ${last ? `<div class="small muted mt-12">Log the call on ${esc(last.order_no || last.quote_no || last.id)} (${esc(dealTitle(last))}) so the timeline and the touch count stay right.</div>` : ''}`,
    foot: `${last ? `<button class="btn" data-act="conLogCall" data-id="${c.id}">${icon('edit', 'sm')}Log a call</button>` : ''}${mk || !c.phone ? `<button class="btn primary" data-act="conDial" data-id="${c.id}">${icon('phone')}Call via shop line</button>` : `<a class="btn primary" href="tel:${esc(con_e164(c.phone) || '')}">${icon('phone')}Call now</a>`}` });
};
ACTIONS.conDial = el => { const c = contactById(el.dataset.id); toast(`Calling ${c.name}…`, 'phone'); };
ACTIONS.conLogCall = el => {
  const c = contactById(el.dataset.id), d = con_deals(c).sort((a, b) => b.enquiry - a.enquiry)[0]; if (!d) return;
  logAct(d, { type: 'call', dir: 'out', subject: 'Called ' + c.name, body: 'Logged from the contact card' });
  closeLayer(); toast('Call logged on ' + (d.order_no || d.quote_no || d.id), 'phone'); render();
};
ACTIONS.conEnquiry = el => {
  const c = contactById(el.dataset.id), abroad = c.country && c.country !== 'India';
  window.CON_LEAD_PREFILL = { contact: c.id, name: c.name, phone: c.phone, city: c.city, source_channel: 'Repeat', source_code: opts('source_codes').includes('REPEAT') ? 'REPEAT' : '', abroad, country: abroad ? c.country : '' };
  toast(`New enquiry for ${c.name}: source Repeat${abroad ? ' · ' + c.country : ''}`, 'plus');
  go('#/leads');
};

/* consent, export, erase, delete */
ACTIONS.conConsent = el => {
  const c = contactById(el.dataset.id); if (!con_canWrite()) { el.checked = !!c.consent_marketing; return toast('Your role cannot change consent', 'lock'); }
  c.consent_marketing = el.checked ? 1 : 0; c.updated_at = NOW();
  dash_audit('contact_save', 'contact', c.id, 'Marketing consent ' + (el.checked ? 'given' : 'withdrawn'));
  toast(el.checked ? 'Marketing consent recorded' : 'Consent withdrawn: no marketing or post-purchase messages', 'shield');
  setTimeout(render, 250);
};
const con_long = v => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
function con_summary(c) {
  const st = contactStats(c), deals = DEALS.filter(d => d.contact === c.id), pays = deals.flatMap(d => (d.payments || []).filter(p => !p.void).map(p => ({ p, d })));
  const sec = (t, body) => `<div class="con-doc-s"><div class="label">${t}</div>${body}</div>`;
  const kv = rows => `<dl class="kv con-kv">${rows.filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  return { st, deals, pays, html: `<div class="con-doc"><div class="row between"><span class="con-doc-wm">${BRAND.wordmark('wm')}</span><span class="xs muted">Generated ${dash_dt(TODAY)} · contact #${esc(c.id)}</span></div>
    <h2 class="mt-16">Personal data held about ${esc(c.name)}</h2><div class="small muted mt-8">Prepared on request under the Digital Personal Data Protection Act, 2023.</div>
    ${sec('Identity and contact', kv([['Name', c.name], ['Phone', c.phone], ['Alt phone', c.phone_alt], ['Email', c.email], ['Instagram', c.instagram], ['City', [c.city, c.state].filter(Boolean).join(', ')], ['Country', c.country || 'India'], ['Birthday', con_long(c.birthday)], ['Anniversary', con_long(c.anniversary)]]))}
    ${sec('How we know them', kv([['Source', c.source_channel], ['Source code', c.source_code], ['Met in person', c.met_in_person ? 'Yes' : 'No'], ['Tags', (c.tags || []).join(', ')], ['First enquiry', st.first_enquiry_at ? dash_d(st.first_enquiry_at) : ''], ['Status', (CON_LIFE[c.lifecycle] || CON_LIFE.Inq)[0]]]))}
    ${sec('Consent', kv([['Marketing messages', c.consent_marketing ? 'Consented' : 'Not consented'], ['Google Contacts', c.google_synced_at ? 'Synced ' + dash_dt(c.google_synced_at) : 'Not synced']]))}
    ${sec(`Enquiries and orders (${deals.length})`, deals.length ? `<table class="tbl dash-static con-doc-t"><tbody>${deals.map(d => `<tr><td class="mono">${esc(d.order_no || d.quote_no || d.id)}</td><td>${esc(dealTitle(d))}</td><td>${esc(stg(d.stage).label)}</td><td class="num">${d.calc && d.calc.total ? inr(d.calc.total) : '—'}</td></tr>`).join('')}</tbody></table>` : '<div class="small muted">None.</div>')}
    ${sec(`Payments (${pays.length})`, pays.length ? `<table class="tbl dash-static con-doc-t"><tbody>${pays.map(({ p, d }) => `<tr><td>${dash_d(p.paid_at)}</td><td>${esc(p.kind)} · ${esc(p.mode)}</td><td class="mono">${esc(d.order_no || d.id)}</td><td class="num">${p.kind === 'Refund' ? '−' : ''}${inr(p.amount)}</td></tr>`).join('')}</tbody></table>` : '<div class="small muted">None.</div>')}
    ${sec('Messages and notes', `<div class="small">${dash_pl(deals.reduce((s, d) => s + d.activities.filter(a => ['whatsapp', 'template', 'email', 'call'].includes(a.type)).length, 0), 'message or call', 'messages and calls')} on record. ${c.notes ? 'Notes: ' + esc(c.notes) : ''}</div>`)}
  </div>` };
}
ACTIONS.conExport = el => {
  const c = contactById(el.dataset.id);
  if (!(isFounder() || con_canWrite())) return toast('Ask a founder or sales to export a person\'s data', 'lock');
  const s = con_summary(c);
  openSheet({ title: 'Export data', sub: 'Everything MARQA holds about ' + esc(c.name), wide: true, body: s.html,
    foot: `<button class="btn" data-act="close">Close</button><button class="btn primary" data-act="conExportDl" data-id="${c.id}">${icon('download')}Download .csv</button>` });
};
ACTIONS.conExportDl = el => {
  const c = contactById(el.dataset.id), s = con_summary(c);
  const rows = [['section', 'field', 'value'], ...['name', 'phone', 'phone_alt', 'email', 'instagram', 'city', 'state', 'country', 'birthday', 'anniversary', 'source_channel', 'source_code', 'lifecycle', 'met_in_person', 'consent_marketing', 'notes'].map(k => ['contact', k, Array.isArray(c[k]) ? c[k].join('; ') : c[k]]),
    ['contact', 'tags', (c.tags || []).join('; ')], ...s.deals.map(d => ['deal', d.order_no || d.quote_no || d.id, `${dealTitle(d)} · ${stg(d.stage).label} · ${d.calc ? Math.round(d.calc.total) : ''}`]),
    ...s.pays.map(({ p, d }) => ['payment', d.order_no || d.id, `${isoDate(p.paid_at)} ${p.kind} ${p.mode} ${p.amount}`])];
  dash_download(`marqa-data-${c.id}-${isoDate(TODAY)}.csv`, dash_csv(rows));
  dash_audit('export_csv', 'contact', c.id, 'DPDP data export');
  toast('Data export downloaded · logged in the audit', 'download');
};
function con_guard(c, verb) {
  const st = contactStats(c), deals = DEALS.filter(d => d.contact === c.id), paid = dash_sum(deals.flatMap(d => (d.payments || []).filter(p => !p.void)), p => p.kind === 'Refund' ? -p.amount : p.amount);
  const orders = deals.filter(d => d.order_date).length;
  openModal(`<div class="card-b con-modal"><h2>Can't ${verb} ${esc(c.name)}</h2>
    <p class="small ink2 mt-8">${esc(c.name)} has ${dash_pl(orders, 'order')}${paid ? ` and ${inr(paid)} in payments` : ''} on record. Money is never silently lost: orders, invoices and payments stay for the period the law requires.</p>
    <p class="small muted mt-8">You can withdraw marketing consent and remove the optional details (birthday, anniversary, Instagram, alt phone, notes) instead. ${st.orders_n ? 'The order history stays.' : ''}</p>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="conAnon" data-id="${c.id}">Withdraw consent and strip optional details</button></div></div>`);
}
ACTIONS.conAnon = el => {
  const c = contactById(el.dataset.id); Object.assign(c, { consent_marketing: 0, birthday: null, anniversary: null, instagram: '', phone_alt: '', notes: '', updated_at: NOW() });
  dash_audit('contact_save', 'contact', c.id, 'DPDP: consent withdrawn, optional details removed'); closeLayer(); toast('Consent withdrawn and optional details removed', 'shield'); render();
};
function con_toTrash(c, reason) {
  const open = DEALS.filter(d => d.contact === c.id && !d.order_date);
  open.forEach(d => { DEALS.splice(DEALS.indexOf(d), 1); TRASH.unshift({ entity: 'deal', label: `${d.id} · ${dealTitle(d)}`, sub: `${c.name} · ${stg(d.stage).label}`, at: NOW(), by: viewUser().id, reason: 'With the contact: ' + reason, deal: d.id, record: d }); });
  CONTACTS.splice(CONTACTS.indexOf(c), 1); c.deleted_at = NOW(); c.deleted_by = viewUser().id; c.delete_reason = reason;
  TRASH.unshift({ entity: 'contact', label: c.name, sub: `${c.phone || 'no phone'} · ${dash_pl(open.length, 'open enquiry', 'open enquiries')} with it`, at: NOW(), by: viewUser().id, reason, contact: c });
  dash_audit('trash_delete', 'contact', c.id, reason);
  return open.length;
}
ACTIONS.conErase = el => {
  const c = contactById(el.dataset.id); if (!isFounder()) return toast('Founders only', 'lock');
  if (con_hasMoney(c)) return con_guard(c, 'erase');
  openModal(`<div class="card-b con-modal"><h2>Erase ${esc(c.name)}?</h2><p class="small ink2 mt-8">An erasure request removes the contact and their open enquiries (${dash_pl(DEALS.filter(d => d.contact === c.id).length, 'deal')}). It goes to the Trash for the purge and is logged.</p>
    <label class="field mt-16"><span>Type ERASE to confirm</span><input class="input" id="conEraseIn" autocomplete="off" placeholder="ERASE"></label>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="conEraseDo" data-id="${c.id}">Erase</button></div></div>`, '', m => m.querySelector('#conEraseIn').focus());
};
ACTIONS.conEraseDo = el => {
  const c = contactById(el.dataset.id), v = (document.getElementById('conEraseIn') || {}).value || '';
  if (v.trim() !== 'ERASE') { toast('Type ERASE to confirm — this cannot be undone.', 'alert'); const i = document.getElementById('conEraseIn'); if (i) i.classList.add('warn'); return; }
  const n = con_toTrash(c, 'Erasure on request (DPDP)'); closeLayer(); toast(`${c.name} erased${n ? ' with ' + dash_pl(n, 'open enquiry', 'open enquiries') : ''} · in the Trash for the purge`, 'shield'); go('#/customers');
};
ACTIONS.conDelete = el => {
  const c = contactById(el.dataset.id); if (!isFounder()) return toast('Founders only', 'lock');
  if (con_hasMoney(c)) return con_guard(c, 'delete');
  openModal(`<div class="card-b con-modal"><h2>Move ${esc(c.name)} to the Trash?</h2><p class="small ink2 mt-8">Their open enquiries go with them. Founders can restore both from Data → Trash.</p>
    <label class="field mt-16"><span>Reason (at least 3 characters)</span><textarea class="textarea" id="conDelWhy" rows="2"></textarea></label>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="conDeleteDo" data-id="${c.id}">Move to Trash</button></div></div>`, '', m => m.querySelector('#conDelWhy').focus());
};
ACTIONS.conDeleteDo = el => {
  const c = contactById(el.dataset.id), why = ((document.getElementById('conDelWhy') || {}).value || '').trim();
  if (why.length < 3) { toast('Give a reason of at least 3 characters', 'alert'); const i = document.getElementById('conDelWhy'); if (i) i.classList.add('warn'); return; }
  const n = con_toTrash(c, why); closeLayer(); toast(`${c.name} moved to the Trash${n ? ' with ' + dash_pl(n, 'open enquiry', 'open enquiries') : ''}`, 'check'); go('#/customers');
};

/* ---------- contact form (new / edit) ---------- */
let CON_PENDING = null;
function con_formHtml(c, v) {
  const isNew = !c, ops = VIEW.role === 'ops';
  v = v || (c ? { ...c, tags: [...(c.tags || [])], country: c.country === 'India' ? '' : c.country } : { name: '', phone: '', phone_alt: '', email: '', instagram: '', city: '', state: '', source_channel: '', source_code: '', met_in_person: 0, country: '', lifecycle: 'Inq', tags: [], birthday: '', anniversary: '', consent_marketing: 1, notes: '' });
  const sel = (id, list, val, o) => { o = o || {}; const key = y => Array.isArray(y) ? y[0] : y, items = [...list]; if (val && !list.some(y => String(key(y)) === String(val))) items.push(val); return `<select class="select" id="${id}" ${o.dis ? 'disabled' : ''}>${o.noBlank ? '' : '<option value="">—</option>'}${items.map(x => { const [k, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(k)}" ${String(val) === String(k) ? 'selected' : ''}>${esc(l)}${!list.some(y => String(key(y)) === String(k)) ? ' (not in list)' : ''}</option>`; }).join('')}</select>`; };
  const abroad = !!v.country;
  return `<div id="cfErr"></div><div class="fgrid">
    <label class="field"><span class="req">Name</span><input class="input" id="cf-name" value="${esc(v.name)}" autocomplete="off"></label>
    <label class="field"><span>Phone</span><input class="input num" id="cf-phone" value="${esc(v.phone)}" inputmode="tel" placeholder="98110 24567 or +44…"></label>
    <label class="field"><span>Alt phone</span><input class="input num" id="cf-phone_alt" value="${esc(v.phone_alt)}" inputmode="tel"></label>
    <label class="field"><span>Email</span><input class="input" id="cf-email" value="${esc(v.email)}" type="email"></label>
    <label class="field"><span>Instagram</span><input class="input" id="cf-instagram" value="${esc(v.instagram)}" placeholder="@handle"></label>
    <label class="field"><span>City</span>${sel('cf-city', opts('cities'), v.city)}</label>
    <label class="field"><span>State <em>free text</em></span><input class="input" id="cf-state" value="${esc(v.state || '')}"></label>
    <label class="field"><span>Country <em>blank = India</em></span>${sel('cf-country', opts('countries'), v.country)}</label>
    <div class="full con-intl ${abroad ? '' : 'hide'}" id="cf-intl"><div class="banner red">${icon('globe', 'sm')}<span>International: export compliance applies. The NRI tag is added and every open enquiry of this contact becomes international.</span></div></div>
    <label class="field"><span>Source</span>${sel('cf-source', opts('source_channels'), v.source_channel, { dis: ops })}</label>
    <label class="field"><span class="${isNew && !ops ? 'req' : ''}">Source code</span>${sel('cf-code', opts('source_codes'), v.source_code, { dis: ops })}</label>
    <label class="field"><span>Met in person <em>walk-in / exhibition set it</em></span>${sel('cf-met', [['1', 'Yes'], ['0', 'No']], v.met_in_person ? '1' : '0', { noBlank: true })}</label>
    <label class="field"><span>Status</span>${sel('cf-life', [['Inq', 'Enquiry (Inq)'], ['Cust', 'Customer (Cust)'], ['Dormant', 'Dormant'], ['Lost', 'Lost']], v.lifecycle || 'Inq', { noBlank: true, dis: ops })}</label>
    <label class="field"><span>Birthday</span><input class="input" type="date" id="cf-birthday" value="${esc(v.birthday || '')}"></label>
    <label class="field"><span>Anniversary</span><input class="input" type="date" id="cf-anniversary" value="${esc(v.anniversary || '')}"></label>
    <label class="field"><span>Marketing consent</span>${sel('cf-consent', [['1', 'Yes'], ['0', 'No']], v.consent_marketing ? '1' : '0', { noBlank: true })}</label>
    <div class="field full"><span>Tags <em>tick all that apply</em></span><div class="chips" id="cf-tags">${opts('tags').concat((v.tags || []).filter(t => !opts('tags').includes(t))).map(t => { const sys = ['NRI', 'REPEAT'].includes(t); return `<button type="button" class="chip ${v.tags.includes(t) ? 'on' : ''} ${sys ? 'con-sys' : ''}" data-act="${sys || ops ? 'conTagSys' : 'conTag'}" data-t="${esc(t)}" title="${sys ? 'Set by the system' : ''}">${sys ? icon('lock', 'sm') : ''}${esc(t)}</button>`; }).join('')}</div>
      <div class="xs muted">NRI follows the country; REPEAT is set at the second confirmed order.${ops ? ' Ops cannot change source, code, tags or status.' : ''}</div></div>
    <label class="field full"><span>Notes</span><textarea class="textarea" id="cf-notes" rows="2">${esc(v.notes || '')}</textarea></label>
  </div>`;
}
function con_openForm(c, v) {
  openSheet({ title: c ? 'Edit contact' : 'New contact', sub: c ? esc(c.name) + ' · #' + esc(c.id) : 'A person: client or enquirer', wide: true, body: con_formHtml(c, v),
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="conSave" data-id="${c ? c.id : ''}">${icon('check')}Save</button>`,
    onMount: sh => {
      const $ = id => sh.querySelector('#' + id);
      $('cf-source').addEventListener('change', e => { const s = e.target.value, code = SOURCE_CODE_FOR[s]; if (code && opts('source_codes').includes(code)) $('cf-code').value = code; if (IN_PERSON_SOURCES.includes(s)) $('cf-met').value = '1'; });
      $('cf-country').addEventListener('change', e => { const ab = !!e.target.value; $('cf-intl').classList.toggle('hide', !ab); const chip = sh.querySelector('#cf-tags [data-t="NRI"]'); if (chip) chip.classList.toggle('on', ab); });
      $('cf-name').focus();
    } });
}
ACTIONS.conNew = () => { if (!con_canWrite()) return toast('Your role cannot add contacts', 'lock'); con_openForm(null); };
ACTIONS.conEdit = el => con_openForm(contactById(el.dataset.id));
ACTIONS.conTag = el => el.classList.toggle('on');
ACTIONS.conTagSys = el => toast(VIEW.role === 'ops' ? 'Ops cannot change tags' : el.dataset.t === 'NRI' ? 'NRI follows the country: pick a country abroad to set it' : 'REPEAT is set by the system at the second confirmed order', 'lock');
function con_readForm() {
  const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  return { name: g('cf-name'), phone: g('cf-phone'), phone_alt: g('cf-phone_alt'), email: g('cf-email'), instagram: g('cf-instagram'), city: g('cf-city'), state: g('cf-state'), country: g('cf-country'),
    source_channel: g('cf-source'), source_code: g('cf-code').toUpperCase(), met_in_person: +g('cf-met'), lifecycle: g('cf-life'), birthday: g('cf-birthday'), anniversary: g('cf-anniversary'), consent_marketing: +g('cf-consent'), notes: g('cf-notes'),
    tags: [...document.querySelectorAll('#cf-tags .chip.on')].map(x => x.dataset.t) };
}
ACTIONS.conSave = el => {
  const id = el.dataset.id, c = id ? contactById(id) : null, v = con_readForm(), ops = VIEW.role === 'ops';
  const err = m => { const box = document.getElementById('cfErr'); if (box) box.innerHTML = `<div class="banner red" style="margin-bottom:14px">${icon('alert', 'sm')}<span>${esc(m)}</span></div>`; const sb = document.querySelector('.sheet .sh-b'); if (sb) sb.scrollTop = 0; toast(m, 'alert'); };
  if (v.name.length < 2) return err('Name needs at least 2 characters.');
  const e = con_e164(v.phone); if (e === null) return err('That phone number does not look valid. Indian mobiles are 10 digits; add the country code for anything else.');
  const ea = con_e164(v.phone_alt); if (ea === null) return err('The alt phone does not look valid. Indian mobiles are 10 digits; add the country code for anything else.');
  if (!c && !ops && opts('source_codes').length && !v.source_code) return err('Source code is required for a new contact — pick one from the list.');
  if (!v.source_channel && v.source_code) v.source_channel = Object.keys(SOURCE_CODE_FOR).find(k => SOURCE_CODE_FOR[k] === v.source_code) || '';
  if (IN_PERSON_SOURCES.includes(v.source_channel)) v.met_in_person = 1;
  const tidy = (raw, x) => !x ? '' : x.startsWith('+91') && x.length === 13 ? con_pretty(x) : raw.replace(/^00/, '+').replace(/\s+/g, ' ').trim().replace(/^(?!\+)/, '+');
  v.phone = tidy(v.phone, e); v.phone_alt = tidy(v.phone_alt, ea);
  const dup = e && CONTACTS.find(x => x !== c && con_digits(x.phone) === con_digits(e) && con_digits(e).length >= 8);
  if (dup && !el.dataset.force) {
    CON_PENDING = { id, v, dup: dup.id };
    return openModal(`<div class="card-b con-modal"><h2>Same phone exists</h2><p class="small ink2 mt-8"><b>${esc(dup.name)}</b> already has this number. ${c ? 'Save anyway? Both records will share it; merge them from Duplicates.' : 'Save anyway and attach to that record?'}</p>
      ${c ? '' : '<p class="xs muted mt-8">Attach fills the blanks on that record and adds the tags; it never overwrites what is there.</p>'}
      <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="conPendBack">Back to the form</button><button class="btn gold" data-act="conPendOk">${c ? 'Save anyway' : 'Attach'}</button></div></div>`);
  }
  con_commit(c, v);
};
ACTIONS.conPendBack = () => { const P = CON_PENDING; if (!P) return closeLayer(); con_openForm(P.id ? contactById(P.id) : null, { ...P.v, country: P.v.country }); };
ACTIONS.conPendOk = () => {
  const P = CON_PENDING; if (!P) return closeLayer(); CON_PENDING = null;
  if (P.id) return con_commit(contactById(P.id), P.v);
  const keep = contactById(P.dup); con_fill(keep, P.v);
  dash_audit('contact_save', 'contact', keep.id, 'Attached a new entry with the same phone'); closeLayer(); toast(`Attached to ${keep.name}`, 'check'); dash_go('#/customers/' + keep.id);
};
function con_fill(keep, v) {
  ['phone_alt', 'email', 'instagram', 'city', 'state', 'source_channel', 'source_code', 'birthday', 'anniversary'].forEach(k => { if (!keep[k] && v[k]) keep[k] = v[k]; });
  keep.tags = [...new Set([...(keep.tags || []), ...(v.tags || [])])]; if (v.met_in_person) keep.met_in_person = 1;
  if (v.notes) keep.notes = (keep.notes ? keep.notes + '\n' : '') + v.notes; keep.updated_at = NOW();
}
function con_commit(c, v) {
  const ops = VIEW.role === 'ops', isNew = !c;
  if (isNew) { const n = Math.max(0, ...CONTACTS.map(x => +String(x.id).replace(/\D/g, '') || 0), ...TRASH.filter(t => t.contact).map(t => +String(t.contact.id).replace(/\D/g, '') || 0)) + 1; c = { id: 'c' + n, created_at: NOW(), created_by: viewUser().id, color: ['#8C6D3F', '#3A6597', '#5E4FA2', '#2E7A57', '#B0433A', '#A86F14'][n % 6], tags: [] }; }
  const keep = ops && !isNew ? { source_channel: c.source_channel, source_code: c.source_code, tags: c.tags, lifecycle: c.lifecycle } : null;
  Object.assign(c, { name: v.name, phone: v.phone, phone_raw: v.phone, phone_alt: v.phone_alt, email: v.email, instagram: v.instagram, city: v.city, state: v.state, country: v.country || 'India',
    source_channel: v.source_channel, source_code: v.source_code, met_in_person: v.met_in_person, lifecycle: v.lifecycle || 'Inq', birthday: v.birthday || null, anniversary: v.anniversary || null,
    consent_marketing: v.consent_marketing, notes: v.notes, tags: v.tags.filter(t => !['NRI'].includes(t)), updated_at: NOW() }, keep || {});
  const abroad = c.country !== 'India';
  if (!keep) c.tags = abroad ? [...new Set([...c.tags, 'NRI'])] : c.tags.filter(t => t !== 'NRI');
  else if (abroad && !c.tags.includes('NRI')) c.tags = [...c.tags, 'NRI'];
  DEALS.filter(d => d.contact === c.id && isOpen(d)).forEach(d => { d.intl = abroad; });
  if (isNew) { c.spend = 0; c.orders = 0; c.source = c.source_channel; c.consent = !!c.consent_marketing; c.since = c.created_at.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); c.anniv = '—'; CONTACTS.unshift(c); }
  dash_audit('contact_save', 'contact', c.id, isNew ? 'New contact' : 'Edited');
  closeLayer(); toast('Saved', 'check'); CON_PENDING = null; dash_go('#/customers/' + c.id);
}

/* ---------- merge (pick by name, never by id) ---------- */
let CON_MERGE = { drop: null, keep: null, q: '' };
function con_mergeBody() {
  const M = CON_MERGE, drop = contactById(M.drop), keep = M.keep ? contactById(M.keep) : null;
  const q = (M.q || '').toLowerCase().trim();
  const cands = CONTACTS.filter(x => x.id !== M.drop && x.id !== M.keep && (!q || x.name.toLowerCase().includes(q) || (x.city || '').toLowerCase().includes(q))).slice(0, 8);
  const pickList = `<div class="label">${keep ? 'Change the other contact' : 'Find the contact to keep'}</div><label class="con-search mt-8">${icon('search', 'sm')}<input class="input" id="conMergeQ" placeholder="Search by name or city" value="${esc(M.q || '')}" autocomplete="off"></label>
    <div class="card mt-8"><div class="list" id="conMergeRes">${cands.map(x => `<div class="li" data-act="conMergePick" data-id="${x.id}">${av(x.name, x.color || '#8A847B', 'sm')}<div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${esc(maskPhone(x.phone) || 'no phone')} · ${esc(x.city || '—')} · ${dash_pl(DEALS.filter(d => d.contact === x.id).length, 'deal')}</div></div>${con_life(x.lifecycle)}</div>`).join('') || '<div class="empty small">No match.</div>'}</div></div>`;
  if (!keep) return `<div class="small ink2">Merge <b>${esc(drop.name)}</b> into another contact. Deals, payments and history move to the kept contact. Nothing is deleted.</div><div class="mt-16">${pickList}</div>`;
  const deals = DEALS.filter(d => d.contact === drop.id), pays = deals.flatMap(d => (d.payments || []).filter(p => !p.void)), acts = dash_sum(deals, d => d.activities.length);
  const fields = [['phone', 'Phone'], ['phone_alt', 'Alt phone'], ['email', 'Email'], ['instagram', 'Instagram'], ['city', 'City'], ['state', 'State'], ['source_channel', 'Source'], ['source_code', 'Source code'], ['birthday', 'Birthday'], ['anniversary', 'Anniversary']];
  const fill = fields.filter(([k]) => !keep[k] && drop[k]);
  const tags = [...new Set([...(keep.tags || []), ...(drop.tags || [])])];
  const side = (x, role) => `<div class="con-mside"><div class="label">${role}</div><div class="row mt-8">${av(x.name, x.color || '#8A847B', 'sm')}<div class="grow"><div class="strong">${esc(x.name)}</div><div class="xs muted">#${esc(x.id)} · ${esc(maskPhone(x.phone) || 'no phone')} · ${esc(x.city || '—')}</div></div></div><div class="mt-8">${con_life(x.lifecycle)}</div></div>`;
  return `<div class="con-mpair">${side(keep, 'Kept')}<div class="con-marrow">${icon('arrowR')}</div>${side(drop, 'Merged in, then closed')}</div>
    <button class="btn sm ghost mt-8" data-act="conMergeSwap">${icon('refresh', 'sm')}Keep ${esc(drop.name)} instead</button>
    <div class="card mt-16"><div class="card-b"><div class="label">What moves to ${esc(keep.name)}</div><ul class="con-moves">
      <li>${dash_pl(deals.length, 'deal')}${deals.length ? ': ' + deals.map(d => `<span class="mono">${esc(d.order_no || d.quote_no || d.id)}</span>`).join(', ') : ''}</li>
      <li>${dash_pl(pays.length, 'payment')}${pays.length && !['marketing'].includes(VIEW.role) ? ' (' + inr(dash_sum(pays, p => p.kind === 'Refund' ? -p.amount : p.amount)) + ')' : ''}</li>
      <li>${dash_pl(acts, 'timeline entry', 'timeline entries')}</li>
      <li>Blanks filled: ${fill.length ? fill.map(([, l]) => l).join(', ') : 'none (the kept record already has them)'}</li>
      <li>Tags after the merge: ${tags.length ? tags.map(t => `<span class="con-tag">${esc(t)}</span>`).join('') : 'none'}</li>
      <li>Notes get <span class="mono">[merged from #${esc(drop.id)} ${esc(drop.name)}]</span></li></ul>
      <div class="xs muted mt-8">${esc(drop.name)} is closed (merged, not deleted). Logged in the audit.</div></div></div>
    <div class="mt-16">${pickList}</div>`;
}
function con_openMerge() {
  openSheet({ title: 'Merge contacts', sub: 'Choose by name; contact IDs are shown for reference', wide: true, body: `<div id="conMergeBox">${con_mergeBody()}</div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn gold" data-act="conMergeDo" ${CON_MERGE.keep ? '' : 'disabled'}>${icon('layers')}Merge</button>`,
    onMount: sh => con_mergeWire(sh) });
}
function con_mergeWire(sh) {
  const i = sh.querySelector('#conMergeQ');
  if (i) i.addEventListener('input', () => { CON_MERGE.q = i.value; const box = sh.querySelector('#conMergeBox'); box.innerHTML = con_mergeBody(); con_mergeWire(sh); const j = sh.querySelector('#conMergeQ'); j.focus(); j.setSelectionRange(j.value.length, j.value.length); });
  const b = sh.querySelector('[data-act="conMergeDo"]'); if (b) b.disabled = !CON_MERGE.keep;
}
const con_mergeRepaint = () => { const sh = document.querySelector('#layer .sheet'), box = sh && sh.querySelector('#conMergeBox'); if (!box) return con_openMerge(); box.innerHTML = con_mergeBody(); con_mergeWire(sh); };
ACTIONS.conMerge = el => { if (!con_canMerge()) return toast('Founders and sales merge contacts', 'lock'); CON_MERGE = { drop: el.dataset.id, keep: el.dataset.keep || null, q: '' }; con_openMerge(); };
ACTIONS.conMergePick = el => { CON_MERGE.keep = el.dataset.id; CON_MERGE.q = ''; con_mergeRepaint(); };
ACTIONS.conMergeSwap = () => { const M = CON_MERGE; [M.drop, M.keep] = [M.keep, M.drop]; con_mergeRepaint(); };
ACTIONS.conMergeDo = () => {
  const M = CON_MERGE, keep = contactById(M.keep), drop = contactById(M.drop); if (!keep || !drop) return toast('Pick the contact to keep first', 'alert');
  const deals = DEALS.filter(d => d.contact === drop.id), abroad = (keep.country || 'India') !== 'India';
  deals.forEach(d => { d.contact = keep.id; if (isOpen(d)) d.intl = abroad; logAct(d, { type: 'system', dir: 'out', subject: `Contact merged: ${drop.name} (#${drop.id}) into ${keep.name} (#${keep.id})`, body: '' }); });
  ['phone', 'phone_alt', 'email', 'instagram', 'city', 'state', 'source_channel', 'source_code', 'birthday', 'anniversary'].forEach(k => { if (!keep[k] && drop[k]) keep[k] = drop[k]; });
  keep.tags = [...new Set([...(keep.tags || []), ...(drop.tags || [])])]; if (drop.met_in_person) keep.met_in_person = 1; if (drop.lifecycle === 'Cust') keep.lifecycle = 'Cust';
  keep.notes = (keep.notes ? keep.notes + '\n' : '') + `[merged from #${drop.id} ${drop.name}]`; keep.updated_at = NOW();
  drop.merged_into = keep.id; drop.deleted_at = NOW(); CONTACTS.splice(CONTACTS.indexOf(drop), 1);
  dash_audit('contact_merge', 'contact', keep.id, `#${drop.id} ${drop.name} → #${keep.id} ${keep.name}`);
  closeLayer(); toast('Merged', 'layers'); dash_go('#/customers/' + keep.id);
};

/* ---------- duplicates (same phone, similar names) ---------- */
let CON_NOT_DUP = [];
function con_dupes() {
  const toks = n => n.toLowerCase().replace(/&/g, ' ').split(/[^a-z]+/).filter(w => w.length >= 3 && w !== 'and');
  const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
  const out = [];
  for (let i = 0; i < CONTACTS.length; i++) for (let j = i + 1; j < CONTACTS.length; j++) {
    const a = CONTACTS[i], b = CONTACTS[j], key = [a.id, b.id].sort().join('|'); if (CON_NOT_DUP.includes(key)) continue;
    const pa = con_digits(a.phone), pb = con_digits(b.phone);
    if (pa && pa.length >= 8 && pa === pb) { out.push({ a, b, key, why: 'Same phone number' }); continue; }
    if (lev(a.name.toLowerCase(), b.name.toLowerCase()) <= 2) { out.push({ a, b, key, why: 'Nearly the same name' }); continue; }
    const ta = toks(a.name), tb = toks(b.name), shared = ta.filter(t => tb.includes(t) && t.length >= 4);
    if (shared.length && ta[ta.length - 1] === tb[tb.length - 1]) out.push({ a, b, key, why: `Similar names: both “${shared[0][0].toUpperCase() + shared[0].slice(1)}”` });
  }
  return out;
}
ACTIONS.conDupes = () => {
  if (!con_canMerge()) return toast('Founders and sales use the duplicate finder', 'lock');
  const ds = con_dupes();
  openSheet({ title: 'Possible duplicates', sub: 'Same phone, or names close enough to be one person', wide: true,
    body: (ds.length ? `<div class="stack-s">${ds.map(x => `<div class="card"><div class="card-b"><div class="row between wrap"><span class="badge amber">${esc(x.why)}</span><span class="xs muted">#${esc(x.a.id)} · #${esc(x.b.id)}</span></div>
      <div class="con-mpair mt-12">${[x.a, x.b].map(c => `<div class="con-mside con-dlink" data-go="#/customers/${c.id}"><div class="row">${av(c.name, c.color || '#8A847B', 'sm')}<div class="grow"><div class="strong">${esc(c.name)}</div><div class="xs muted">${esc(maskPhone(c.phone) || 'no phone')} · ${esc(c.city || '—')} · ${dash_pl(DEALS.filter(d => d.contact === c.id).length, 'deal')}</div></div></div></div>`).join('<div class="con-marrow">&</div>')}</div>
      <div class="row wrap mt-12"><button class="btn sm gold" data-act="conMerge" data-id="${x.b.id}" data-keep="${x.a.id}">${icon('layers', 'sm')}Merge…</button><button class="btn sm" data-act="conNotDup" data-key="${x.key}">Not a duplicate</button></div></div></div>`).join('')}</div>` : '<div class="empty">No possible duplicates. Same-phone saves are caught when a contact is saved.</div>')
      + `<div class="xs muted mt-16">${dash_pl(TRASH.filter(t => t.entity === 'contact').length, 'contact')} already in the Trash, including merged duplicates.</div>` });
};
ACTIONS.conNotDup = el => { CON_NOT_DUP.push(el.dataset.key); toast('Marked as different people', 'check'); ACTIONS.conDupes(); };

/* ---------- Google Contacts CSV (export.google, audited) ---------- */
ACTIONS.conGoogle = () => {
  if (!can('export.google')) return toast('Founders grant export.google in Settings → Access', 'lock');
  const custom = SETTINGS.google_custom_fields.split('\n').map(l => l.split('=').map(s => s.trim())).filter(x => x.length === 2);
  const head = ['Name', 'Given Name', 'Family Name', 'Phone 1 - Type', 'Phone 1 - Value', 'Phone 2 - Type', 'Phone 2 - Value', 'E-mail 1 - Value', 'Address 1 - City', 'Address 1 - Region', 'Address 1 - Country', 'Birthday', 'Event 1 - Type', 'Event 1 - Value', 'Website 1 - Type', 'Website 1 - Value', 'Notes', 'Labels', 'Met In Person',
    ...custom.flatMap((_, i) => [`Custom Field ${i + 1} - Label`, `Custom Field ${i + 1} - Value`])];
  const now = NOW();
  const rows = CONTACTS.map(c => {
    const first = con_tpl(SETTINGS.google_first_template, c), last = con_tpl(SETTINGS.google_last_template, c);
    const labels = ['MARQA', 'MARQA ' + c.lifecycle, c.source_channel ? 'MARQA · ' + c.source_channel : '', c.met_in_person ? 'MARQA · Met in person' : '', ...(c.tags || []).map(t => 'MARQA · ' + t)].filter(Boolean).join(' ::: ');
    c.google_synced_at = now;
    return [first + ' ' + last, first, last, 'Mobile', c.phone || '', c.phone_alt ? 'Other' : '', c.phone_alt || '', c.email || '', c.city || '', c.state || '', c.country || 'India', c.birthday || '', c.anniversary ? 'Anniversary' : '', c.anniversary || '',
      c.instagram ? 'Instagram' : '', c.instagram ? 'https://instagram.com/' + c.instagram.replace(/^@/, '') : '', c.notes || '', labels, c.met_in_person ? 'Yes' : 'No', ...custom.flatMap(([l, t]) => [l, con_tpl(t, c)])];
  });
  dash_download(`marqa-google-contacts-${isoDate(TODAY)}.csv`, dash_csv([head, ...rows]));
  dash_audit('export_google', 'export', 'contacts', `${rows.length} rows`);
  BULK_EVENTS.unshift({ at: now, who: viewUser().id, what: `Exported the Google Contacts CSV (${rows.length} rows)` });
  openSheet({ title: 'Google Contacts CSV', sub: `${rows.length} contacts · downloaded · logged in the audit (export_google)`, wide: true,
    body: `<div class="banner blue">${icon('check', 'sm')}<span>Import it at contacts.google.com → Import. Display names follow the naming template in Settings → Rules; every contact is stamped as synced.</span></div>
      <div class="card mt-16"><div class="tbl-wrap"><table class="tbl dash-static"><thead><tr><th>Name</th><th>Phone</th><th>Labels</th></tr></thead><tbody>${rows.slice(0, 8).map(r => `<tr><td class="strong">${esc(r[0])}</td><td class="num dash-nowrap">${esc(maskPhone(r[4]))}</td><td class="xs muted">${esc(r[17])}</td></tr>`).join('')}</tbody></table></div></div>
      ${rows.length > 8 ? `<div class="xs muted mt-8">+${rows.length - 8} more rows in the file.</div>` : ''}`,
    foot: `<button class="btn" data-act="close">Done</button><button class="btn primary" data-act="conGoogle">${icon('download')}Download again</button>` });
};

/* Leads (capture), Pipeline, Orders and Quotes: the live app's lists around the one deal record.
   The deal page itself is in screens-deal.js. */

/* ---------- form bits shared by these screens and the deal page ---------- */
const fOpt = (v, cur, label) => `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(label ?? v)}</option>`;
// A picker over a Settings → Options list; a value that has left the list stays, marked "(not in list)"
function fPick(name, key, cur, o = {}) {
  const items = opts(key), off = cur && !items.includes(cur);
  return `<select class="select" data-f="${name}"${o.dis ? ' disabled' : ''}${o.id ? ` id="${o.id}"` : ''}>${o.noBlank ? '' : fOpt('', cur, o.blank || '—')}${items.map(v => fOpt(v, cur)).join('')}${off ? fOpt(cur, cur, cur + ' (not in list)') : ''}</select>`;
}
const fSel = (name, list, cur, o = {}) => `<select class="select" data-f="${name}"${o.dis ? ' disabled' : ''}${o.id ? ` id="${o.id}"` : ''}>${o.blank != null ? fOpt('', cur, o.blank) : ''}${list.map(v => Array.isArray(v) ? fOpt(v[0], cur, v[1]) : fOpt(v, cur)).join('')}</select>`;
const fIn = (name, val, o = {}) => `<input class="input${o.cls ? ' ' + o.cls : ''}" data-f="${name}" type="${o.type || 'text'}" value="${esc(val ?? '')}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.dis ? ' readonly' : ''}${o.id ? ` id="${o.id}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.min ? ` min="${o.min}"` : ''}>`;
const fTa = (name, val, o = {}) => `<textarea class="textarea" data-f="${name}" rows="${o.rows || 3}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.dis ? ' readonly' : ''}>${esc(val ?? '')}</textarea>`;
const fF = (label, inner, o = {}) => `<label class="field${o.span ? ' ' + o.span : ''}"${o.hide ? ' hidden' : ''}><span>${label}${o.help ? ` <em>${o.help}</em>` : ''}</span>${inner}</label>`;
const fRo = (label, val, o = {}) => `<div class="field${o.span ? ' ' + o.span : ''}"><span>${label}</span><div class="ro">${val}</div></div>`;
const fVals = root => { const v = {}; root.querySelectorAll('[data-f]').forEach(e => { v[e.dataset.f] = e.type === 'checkbox' ? e.checked : e.value; }); return v; };
const parseMoney = s => { const t = String(s || '').toLowerCase().replace(/[₹,\s]/g, ''); const n = parseFloat(t); if (!isFinite(n)) return 0; return /cr/.test(t) ? n * 1e7 : /(l|lakh|lac)/.test(t) ? n * 1e5 : /k$/.test(t) ? n * 1e3 : n; };
const dtLocal = d => d ? isoDate(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '';
const fdt = d => d ? `${fdate(d)}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : '—';
const agoTxt = d => { if (!d) return '—'; const h = (TODAY - d) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + 'm' : h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd'; };

/* A new deal object, initialised the way logic.js prepares the seeded ones */
function mkDeal(f) {
  const n = String(DEALS.filter(d => d.id.startsWith('D-' + isoDate(TODAY).replace(/-/g, ''))).length + 4).padStart(3, '0');
  const d = Object.assign({ id: 'D-' + isoDate(TODAY).replace(/-/g, '') + '-' + n, type: 'Sale', stage: 'New', owner: viewUser().id, budget: 0, img: null,
    activities: [], payments: [], checks: {}, photos: [], versions: [], qc: [], lines: [], purity: '14K', gold_colour: 'Yellow', gold_wt: 0, gold_rate_24k: baseRateFor('14K'),
    making_rate: sheetMaking('14K', 'Ring'), item_type: 'Ring', size: '', extra_stones: 0, discount_pct: 0, gst_pct: SETTINGS.default_gst, usd_rate: SETTINGS.default_usd, usd_spread: SETTINGS.default_usd_spread,
    techniques: [], enquiry: NOW(), stage_changed_at: NOW(), cad_revisions: 0 }, f);
  d.enquiry_date = d.enquiry; d.intl = dealContact(d).country !== 'India'; d.calc = computeLive(d);
  DEALS.unshift(d); return d;
}

/* ---------- the shared deal table (Leads list, Pipeline list) ---------- */
function dealTable(list) {
  if (!list.length) return `<div class="empty">Nothing here.</div>`;
  return `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Who</th>${hides('source_channel') ? '' : '<th>Source</th>'}<th>Wants</th>${hides('budget') ? '' : '<th class="num">Budget</th>'}<th>Stage</th><th>Next</th><th class="m-hide">Owner</th></tr></thead><tbody>
    ${list.map(d => { const c = dealContact(d); return `<tr data-go="#/deal/${d.id}">
      <td><div class="row" style="gap:6px;flex-wrap:wrap"><b>${esc(c.name)}</b>${intlPill(d)}${typePill(d)}</div><div class="xs muted">${esc(maskPhone(c.phone) || 'no phone')} · ${esc(c.city)} · ${fdate(d.enquiry)}</div></td>
      ${hides('source_channel') ? '' : `<td class="m-hide"><span class="badge gold">${esc(d.source_channel)}</span><div class="xs muted mt-8 mono">${esc(d.source_code || '')}</div></td>`}
      <td class="m-hide">${esc(d.product_interest || '—')}<div class="xs muted">${esc(d.occasion || '')}</div></td>
      ${hides('budget') ? '' : `<td class="num m-hide">${d.budget ? inr(d.budget) : d.calc.total ? inr(d.calc.total) : '—'}</td>`}
      <td><div class="row wrap" style="gap:4px">${stagePill(d.stage)}${slaHtml(d)}</div>${d.lost_reason ? `<div class="xs muted">${esc(d.lost_reason)}</div>` : ''}</td>
      <td class="num">${d.next_action_at ? fdate(d.next_action_at) : '—'}<div class="xs muted truncate" style="max-width:180px">${esc(d.next_action || '')}</div></td>
      <td class="m-hide">${esc(userName(d.owner))}</td></tr>`; }).join('')}</tbody></table></div>`;
}
const dealSearch = (d, q) => !q || [dealContact(d).name, d.id, d.quote_no, d.order_no, d.item_label, dealContact(d).phone.replace(/\D/g, ''), d.tag_no, d.legacy, d.source_code].join(' ').toLowerCase().includes(q.toLowerCase().replace(/^\+/, ''));
const liveDeals = () => dealsVisible().filter(d => !d.deleted);

/* =================================================================== LEADS */
const LEADS = { seg: 'open', q: '', abroad: false, more: false };
SCREENS.leads = {
  title: 'Leads', nav: 'leads',
  render() {
    const groups = { open: ['New', 'Contacted', 'Qualified'], quoted: ['Quoted', 'Negotiating'], lost: ['Lost', 'Expired', 'Cancelled'] };
    const list = liveDeals().filter(d => groups[LEADS.seg].includes(d.stage) && dealSearch(d, LEADS.q)).sort((a, b) => b.stage_changed_at - a.stage_changed_at);
    const canCap = can('deals.write') || can('deals.write.lead');
    const me = viewUser(), src = me.home_source && opts('source_channels').includes(me.home_source) ? me.home_source : SETTINGS.default_source;
    const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, liveDeals().filter(d => v.includes(d.stage)).length]));
    return `${pageHead('Leads', 'Walk-ins, Meta, Google, referrals: capture in under 30 seconds', `<div class="seg">${[['open', 'Open leads'], ['quoted', 'Quoted'], ['lost', 'Lost / expired']].map(([k, n]) => `<button class="${LEADS.seg === k ? 'on' : ''}" data-act="leadSeg" data-k="${k}">${n} <span class="muted">${counts[k]}</span></button>`).join('')}</div>`)}
    <div class="grid g-main" style="align-items:start">
      <div class="stack">
        ${card('New enquiry', canCap ? `<form id="leadForm" class="stack-s" autocomplete="off">
          <button type="button" class="btn block" data-act="voiceEnq" style="border-style:dashed">${icon('mic')}Record a voice note and let AI fill this in</button>
          <div class="fgrid">
            ${fF('Name <b class="req"></b>', fIn('name', '', { ph: 'As they introduce themselves', id: 'lfName' }))}
            ${fF('Phone', fIn('phone', '', { ph: '10 digits or +country', inputmode: 'tel', id: 'lfPhone' }))}
            ${fF('City', fPick('city', 'cities', 'Delhi', { noBlank: true }))}
            ${fF('Source <b class="req"></b>', fPick('source_channel', 'source_channels', src, { noBlank: true, id: 'lfSrc' }))}
            ${fF('Source code <b class="req"></b>', fPick('source_code', 'source_codes', SOURCE_CODE_FOR[src] || '', { blank: '— pick —', id: 'lfCode' }))}
            ${fF('Client is abroad', fSel('abroad', [['0', 'No — India'], ['1', 'Yes']], LEADS.abroad ? '1' : '0', { id: 'lfAbroad' }))}
            ${fF('Country <em>international: export compliance applies</em>', fPick('country', 'countries', '', { blank: '— pick —' }), { span: 'span3', hide: !LEADS.abroad })}
          </div>
          <label class="row top small" style="gap:8px;cursor:pointer"><input type="checkbox" data-f="met" id="lfMet"${IN_PERSON_SOURCES.includes(src) ? ' checked' : ''} style="margin-top:3px;accent-color:var(--gold)"><span><b>Met in person</b> <span class="muted">— walk-in and exhibition tick it themselves; tick it for a meeting anywhere else. It is logged as a visit and the enquiry starts at “Contacted”.</span></span></label>
          <div class="fgrid">
            ${fF('Looking for', fPick('product_interest', 'product_interests', ''))}
            ${fF('Budget ₹', fIn('budget', '', { ph: 'approx. e.g. 1.5 L or 80k', inputmode: 'decimal' }))}
            ${fF('Notes <em>what they said, what they liked</em>', fTa('notes', '', { rows: 2 }), { span: 'span3' })}
          </div>
          <details class="more-d"${LEADS.more ? ' open' : ''}><summary>${icon('chevD', 'sm')} More — occasion, timeline, deal type, follow-up date, email, Instagram</summary>
            <div class="fgrid mt-8">
              ${fF('Occasion', fPick('occasion', 'occasions', ''))}
              ${fF('Timeline', fPick('timeline', 'timelines', ''))}
              ${fF('Deal type <em>Stock, Repair and Buyback skip the CAD steps</em>', fSel('type', DEAL_TYPES, 'Sale'))}
              ${fF('Follow up on', fIn('follow', isoDate(addDays(TODAY, SETTINGS.followup_default_days)), { type: 'date' }))}
              ${fF('Email', fIn('email', '', { inputmode: 'email' }))}
              ${fF('Instagram', fIn('instagram', '', { ph: '@handle' }))}
            </div></details>
          <div id="lfDup"></div>
          <div class="row wrap"><button type="button" class="btn gold" data-act="saveLead">${icon('check')}Save enquiry</button><span class="xs muted grow" style="min-width:200px">Anyone met in person starts at “Contacted”; everything else at “New” with the reply-SLA clock running.</span></div>
        </form>` : `<div class="banner">${icon('lock')}<div class="small"><b>Your role cannot create leads.</b> Ops works on orders; leads are captured by sales and marketing.</div></div>`, { right: `<span class="xs muted">${navigator.onLine === false ? 'offline · saved on this device' : '0 waiting to sync'}</span>` })}
        ${card(`${{ open: 'Open leads', quoted: 'Quoted', lost: 'Lost / expired' }[LEADS.seg]} <span class="muted">${list.length}</span>`, dealTable(list), { flush: true, right: `<input class="input" id="leadQ" placeholder="search…" value="${esc(LEADS.q)}" style="height:32px;width:180px">` })}
      </div>
      <div class="stack">
        ${card('Reply SLA', `<div class="small ink2" style="line-height:1.6">WhatsApp / DM within <b>${SETTINGS.sla_whatsapp_hours} hours</b> in business hours · email within <b>${SETTINGS.sla_email_hours} hours</b> · missed calls returned the same day. A lead sitting at “New” past the SLA shows in red on this list and on the dashboard.</div>`)}
        ${card('What a good capture looks like', `<ul class="small ink2" style="padding-left:18px;line-height:1.7;margin:0"><li>A name and a number.</li><li>The real source: ask, don't guess.</li><li>A budget range, even rough.</li><li>One line of what they liked: it becomes the follow-up message.</li></ul>`)}
        ${card('Codes we use', `<div class="codes">${opts('source_codes').map(esc).join(' · ')}</div><div class="xs muted mt-12" style="line-height:1.6">Every enquiry carries one. It lands in the Google Contacts name and a custom field. Source = how they found us or which door: showroom is Walk-in, the site is Website, each partner door is its own line. Every sale is a MARQA sale; the source gets the credit.</div>`)}
      </div>
    </div>`;
  },
  mount(root) {
    const q = root.querySelector('#leadQ'); if (q) q.addEventListener('input', () => { LEADS.q = q.value; const pos = q.selectionStart; render(); const n = document.getElementById('leadQ'); n.focus(); n.setSelectionRange(pos, pos); });
    const f = root.querySelector('#leadForm'); if (!f) return;
    // "+ New enquiry" on a contact card hands over who it is for
    const pre = window.CON_LEAD_PREFILL; if (pre) { window.CON_LEAD_PREFILL = null; Object.entries(pre).forEach(([k, v]) => { const e = f.querySelector(`[data-f="${k === 'source' ? 'source_channel' : k === 'code' ? 'source_code' : k}"]`); if (e && v != null) { if (e.type === 'checkbox') e.checked = !!v; else e.value = k === 'abroad' ? (v ? '1' : '0') : v; } });
      if (pre.abroad) { LEADS.abroad = true; f.querySelector('[data-f="country"]').closest('.field').hidden = false; } setTimeout(() => f.querySelector('#lfPhone').dispatchEvent(new Event('input')), 0); toast('Filled in for ' + (pre.name || 'the contact'), 'user'); }
    const src = f.querySelector('#lfSrc'), code = f.querySelector('#lfCode'), met = f.querySelector('#lfMet'), ab = f.querySelector('#lfAbroad');
    src.addEventListener('change', () => { code.value = SOURCE_CODE_FOR[src.value] || ''; met.checked = IN_PERSON_SOURCES.includes(src.value); });
    ab.addEventListener('change', () => { LEADS.abroad = ab.value === '1'; f.querySelector('[data-f="country"]').closest('.field').hidden = !LEADS.abroad; });
    f.querySelector('details').addEventListener('toggle', e => { LEADS.more = e.target.open; });
    const ph = f.querySelector('#lfPhone'), dup = f.querySelector('#lfDup');
    ph.addEventListener('input', () => {
      const digits = ph.value.replace(/\D/g, '').slice(-10), c = digits.length >= 10 && CONTACTS.find(x => x.phone.replace(/\D/g, '').endsWith(digits));
      const open = c && DEALS.find(d => d.contact === c.id && isOpen(d) && !d.deleted);
      dup.innerHTML = c ? `<div class="banner ${open ? 'amber' : ''}">${icon('user')}<div class="small grow"><b>${esc(c.name)}</b> already has this number${open ? ` and an open enquiry <b>${open.id}</b> at “${stg(open.stage).label}”` : ''}. The enquiry will be filed under their contact.</div>${open ? `<button type="button" class="btn sm" data-go="#/deal/${open.id}">Open it</button>` : ''}</div>` : '';
      if (c && !f.querySelector('#lfName').value) f.querySelector('#lfName').value = c.name;
    });
  }
};
ACTIONS.leadSeg = el => { LEADS.seg = el.dataset.k; render(); };
ACTIONS.voiceEnq = el => {
  el.innerHTML = `${icon('mic')}Listening… “Aarav, walked in with his fiancée, wants a 1 carat oval in rose gold, around one and a half lakh, wedding in February”`; el.disabled = true;
  setTimeout(() => {
    const f = document.getElementById('leadForm'); if (!f) return;
    const set = (k, v) => { const e = f.querySelector(`[data-f="${k}"]`); if (e) e.value = v; };
    set('name', 'Aarav Malik'); set('phone', '98111 40027'); set('source_channel', 'Walk-in'); set('source_code', 'WALKIN'); set('product_interest', 'Engagement ring'); set('budget', '1.5 L'); set('notes', 'Walked in with his fiancée. 1 ct oval, rose gold. Wedding in February.'); f.querySelector('#lfMet').checked = true;
    set('occasion', 'Engagement'); set('timeline', '1–3 months');
    el.innerHTML = `${icon('check')}Filled from the voice note. Check it, then save.`; el.disabled = false; toast('AI filled 8 fields from the voice note', 'sparkles');
  }, 1300);
};
ACTIONS.saveLead = async (el, ev, force) => {
  const f = document.getElementById('leadForm'), v = fVals(f);
  const err = m => toast(m, 'alert');
  if ((v.name || '').trim().length < 2) return err('Name is required (at least 2 characters).');
  const digits = (v.phone || '').replace(/\D/g, '');
  if (!digits && !v.email && !v.instagram) return err('Need at least a phone, an Instagram handle or an email — otherwise nobody can follow up.');
  if (opts('source_codes').length && !v.source_code) return err('Source code is required — pick one from the list. Founders add codes in Settings → Options.');
  if (v.abroad === '1' && !v.country) return err('Pick the country — or set “Client is abroad” back to No.');
  const phone = digits.length === 10 ? '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5) : digits ? '+' + digits : '';
  let c = digits.length >= 10 && CONTACTS.find(x => x.phone.replace(/\D/g, '').endsWith(digits.slice(-10)));
  const open = c && DEALS.find(d => d.contact === c.id && isOpen(d) && !d.deleted);
  if (open && !force) return openModal(`<div class="card-b" style="padding:20px"><h3>Already an open enquiry</h3><p class="small ink2 mt-8">${esc(c.name)} already has <b>${open.id}</b> at “${stg(open.stage).label}”. Open that one? (Or save a second, separate enquiry.)</p>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="saveLeadForce">Save a second one</button><button class="btn gold" data-go="#/deal/${open.id}">Open existing</button></div></div>`);
  const existing = !!c;
  if (!c) { c = Object.assign(C('c' + (CONTACTS.length + 1 + Math.floor(Math.random() * 900)), v.name.trim(), phone, v.city, { email: v.email, instagram: v.instagram, source_channel: v.source_channel, source_code: (v.source_code || '').toUpperCase(), created_at: NOW(), color: '#8C6D3F' }), {}); CONTACTS.push(c); }
  if (v.abroad === '1') { c.country = v.country; if (!c.tags.includes('NRI')) c.tags.push('NRI'); }
  if (v.met) c.met_in_person = 1;
  const follow = v.follow ? new Date(v.follow + 'T11:00:00') : at(SETTINGS.followup_default_days, '11:00');
  const d = mkDeal({ contact: c.id, type: v.type || 'Sale', stage: v.met ? 'Contacted' : 'New', source_channel: v.source_channel, source_code: (v.source_code || '').toUpperCase(), product_interest: v.product_interest, occasion: v.occasion, timeline: v.timeline,
    budget: parseMoney(v.budget), notes: v.notes, next_action_at: follow, next_action: 'First follow-up', met: v.met ? 1 : 0, met_in_person: v.met ? 1 : 0 });
  d.activities.unshift(v.met ? { type: 'visit', dir: 'in', subject: 'Met in person — ' + v.source_channel, body: v.notes || '', at: NOW(), by: viewUser().id } : { type: 'system', dir: 'in', subject: 'Lead captured', body: v.notes || '', at: NOW(), by: viewUser().id });
  AUDIT.unshift({ at: NOW(), user: viewUser().id, action: 'lead_create', entity: 'deal', entity_id: d.id, detail: v.source_channel + ' · ' + (v.source_code || '') });
  closeLayer(); LEADS.abroad = false; render();
  toast(`Saved ${d.id}${existing ? ' — existing contact' : ''}${d.intl ? ' · ⚠ international — see the note on the deal' : ''}`, 'check');
};
ACTIONS.saveLeadForce = () => { closeLayer(); ACTIONS.saveLead(null, null, true); };

/* ================================================================= PIPELINE */
const PIPE = { q: '', src: '', type: '', stage: '', view: 'board' };
const boardCard = d => {
  const c = dealContact(d), g = stg(d.stage).group, lb = lateBadge(d), m = money(d);
  const left1 = g === 'lead' ? esc(d.source_channel || '') : g === 'quote' ? esc(d.quote_no || 'no quote yet') : esc(d.order_no || d.quote_no || d.id);
  const right1 = d.calc.total ? inrShort(d.calc.total) : d.budget && !hides('budget') ? '≤' + inrShort(d.budget) : '';
  const left2 = isOrder(d) ? (d.production_stage && d.stage === 'In Production' ? esc(d.production_stage) : d.qc_status ? 'QC ' + d.qc_status : esc(d.vendor || '')) + (m.balance > 0.5 ? ' · bal ' + inrShort(m.balance) : '') : '';
  const right2 = isOrder(d) && d.promised_date ? (lb === 'late' ? `<span style="color:var(--red);font-weight:600">late ${fdate(d.promised_date)}</span>` : fdate(d.promised_date)) : agoTxt(d.stage_changed_at) + ' ago';
  return `<div class="kcard dl ${lb || ''}" data-go="#/deal/${d.id}">
    <div class="row between" style="gap:6px"><b class="truncate" style="font-size:13.5px">${esc(c.name)}</b><span class="row" style="gap:4px">${intlPill(d)}${typePill(d)}</span></div>
    <div class="lbl">${esc(dealTitle(d))}</div>
    <div class="m"><span>${left1}</span><b>${right1}</b></div>
    <div class="m"><span>${left2}</span><span>${right2}</span></div>
    ${slaHtml(d) ? `<div class="mt-8">${slaHtml(d)}</div>` : ''}</div>`;
};
SCREENS.pipeline = {
  title: 'Pipeline', nav: 'pipeline',
  render(p) {
    if (p.id && DSTAGES.some(s => s.key === p.id)) PIPE.stage = p.id;
    let list = liveDeals().filter(d => dealSearch(d, PIPE.q) && (!PIPE.src || d.source_channel === PIPE.src) && (!PIPE.type || d.type === PIPE.type));
    list = PIPE.stage ? list.filter(d => d.stage === PIPE.stage) : list.filter(d => isOpen(d));
    const ops = VIEW.role === 'ops';
    let cols = DSTAGES.filter(s => s.group !== 'lost' && (!ops || s.i >= 5));
    if (PIPE.stage) cols = cols.filter(s => s.key === PIPE.stage);
    const lostList = list.filter(d => stg(d.stage).group === 'lost');
    const val = ds => ds.reduce((s, d) => s + (d.calc.total || 0), 0);
    return `${pageHead('Pipeline', `${list.length} ${PIPE.stage ? 'at ' + stg(PIPE.stage).label : 'open'} · one ladder from enquiry to delivery`, `<div class="seg"><button class="${PIPE.view === 'board' ? 'on' : ''}" data-act="pipeView" data-v="board">Board</button><button class="${PIPE.view === 'list' ? 'on' : ''}" data-act="pipeView" data-v="list">List</button></div><button class="btn primary" data-go="#/leads">${icon('plus')}New enquiry</button>`)}
    <div class="pfilters">
      <input class="input search" id="pipeQ" placeholder="search name, number, tag…" value="${esc(PIPE.q)}">
      ${hides('source_channel') ? '' : `<select class="select" id="pipeSrc">${fOpt('', PIPE.src, 'All sources')}${opts('source_channels').map(v => fOpt(v, PIPE.src)).join('')}</select>`}
      <select class="select" id="pipeType" title="Deal type">${fOpt('', PIPE.type, 'All types')}${DEAL_TYPES.map(v => fOpt(v, PIPE.type)).join('')}</select>
      <select class="select" id="pipeStage">${fOpt('', PIPE.stage, 'All open stages')}${DSTAGES.filter(s => !ops || s.i >= 5).map(s => fOpt(s.key, PIPE.stage, s.label)).join('')}</select>
      ${PIPE.q || PIPE.src || PIPE.type || PIPE.stage ? `<button class="btn ghost sm" data-act="pipeClear">${icon('x', 'sm')}Clear</button>` : ''}
    </div>
    ${PIPE.view === 'list' ? card('', dealTable(list), { flush: true }) : `<div class="board">
      ${cols.map(s => { const ds = list.filter(d => d.stage === s.key); return `<div class="bcol pc"><div class="bh" title="${esc(s.help)}"><span class="spill ${s.group}" style="height:20px">${esc(s.label)}</span><span class="tot">${ds.length}${ds.length && moneyShown() ? ' · ' + inrShort(val(ds)) : ''}</span></div><div class="cards">${ds.map(boardCard).join('') || '<div class="empty-col">—</div>'}</div></div>`; }).join('')}
      ${lostList.length ? `<div class="bcol pc lostc"><div class="bh"><span class="spill lost" style="height:20px">Lost / expired</span><span class="tot">${lostList.length}</span></div><div class="cards">${lostList.slice(0, 20).map(boardCard).join('')}</div></div>` : ''}
    </div>`}`;
  },
  mount(root) {
    const q = root.querySelector('#pipeQ'); q.addEventListener('input', () => { PIPE.q = q.value; const pos = q.selectionStart; render(); const n = document.getElementById('pipeQ'); n.focus(); n.setSelectionRange(pos, pos); });
    [['#pipeSrc', 'src'], ['#pipeType', 'type'], ['#pipeStage', 'stage']].forEach(([sel, k]) => { const e = root.querySelector(sel); if (e) e.addEventListener('change', () => { PIPE[k] = e.value; if (k === 'stage' && location.hash !== '#/pipeline') { history.replaceState(null, '', '#/pipeline'); lastHash = '#/pipeline'; } render(); }); });
  }
};
ACTIONS.pipeView = el => { PIPE.view = el.dataset.v; render(); };
ACTIONS.pipeClear = () => { Object.assign(PIPE, { q: '', src: '', type: '', stage: '' }); if (location.hash !== '#/pipeline') go('#/pipeline'); else render(); };

/* =================================================================== ORDERS
   The production view of the same pipeline: order stages only, with what ops needs on the card. */
const ORDV = { f: 'all', view: 'board' };
const ORD_STAGES = ['Order Confirmed', 'CAD In Progress', 'CAD Sent', 'CAD Approved', 'In Production', 'QC', 'Ready', 'Dispatched', 'Delivered'];
SCREENS.orders = {
  title: 'Orders', nav: 'orders',
  render() {
    const all = liveDeals().filter(d => ORD_STAGES.includes(d.stage));
    const F = { all: ['All', () => true], late: ['Late', d => lateBadge(d) === 'late'], week: ['Due this week', d => d.promised_date && daysTo(d.promised_date) >= 0 && daysTo(d.promised_date) <= 7], intl: ['International', d => d.intl], hv: ['High value', d => (d.est_cost || 0) >= SETTINGS.high_value_threshold], urgent: ['Urgent', d => d.urgent], mat: ['Awaiting material', d => ['Order Confirmed', 'CAD In Progress', 'CAD Sent', 'CAD Approved'].includes(d.stage) && !typeSkips(d).includes('CAD In Progress') && !(d.gold_issued_at && d.diamonds_issued_at)] };
    const list = all.filter(F[ORDV.f][1]);
    const late = all.filter(d => lateBadge(d) === 'late').length;
    const ocard = d => { const c = dealContact(d), m = money(d), lb = lateBadge(d); return `<div class="kcard dl ${lb || ''}" data-go="#/deal/${d.id}">
      <div class="row" style="gap:10px"><img src="${img(d.img, 120)}" alt="" style="width:44px;height:44px;border-radius:9px;object-fit:cover;background:var(--surface-2)"><div class="grow" style="min-width:0"><div class="xs muted strong">${esc(d.order_no || d.id)} ${d.urgent ? '<span class="badge red" style="height:18px">URGENT</span>' : ''}</div><div class="strong truncate" style="font-size:13px">${esc(dealTitle(d))}</div><div class="xs muted truncate">${esc(c.name)}</div></div></div>
      <div class="row wrap mt-8" style="gap:5px"><span class="badge out">${esc(d.purity)} ${esc(d.gold_colour || '')}</span>${d.stage === 'In Production' && d.production_stage ? `<span class="badge blue">${esc(d.production_stage)}</span>` : ''}${d.qc_status && ['QC', 'Ready'].includes(d.stage) ? `<span class="badge ${d.qc_status === 'Pass' ? 'green' : 'amber'}">QC ${d.qc_status}</span>` : ''}${intlPill(d)}</div>
      <div class="m"><span class="truncate">${esc(d.vendor || 'vendor not assigned')}</span><span>${d.promised_date ? (lb === 'late' ? `<b style="color:var(--red)">${-daysTo(d.promised_date)}d late</b>` : 'due ' + fdate(d.promised_date)) : '—'}</span></div>
      ${m.balance > 0.5 && !hides('labour') ? `<div class="m"><span>balance</span><b>${inr(m.balance)}</b></div>` : ''}</div>`; };
    return `${pageHead('Orders', `${all.length} in production · ${late} late · each stage clears only on evidence`, `<div class="seg"><button class="${ORDV.view === 'board' ? 'on' : ''}" data-act="ordView2" data-v="board">Board</button><button class="${ORDV.view === 'list' ? 'on' : ''}" data-act="ordView2" data-v="list">List</button></div>${can('demand') ? `<button class="btn" data-go="#/demand">${icon('scale')}Demand panel</button>` : ''}`)}
    <div class="chips mb-16" style="margin-bottom:14px">${Object.entries(F).map(([k, [n, fn]]) => `<button class="chip ${ORDV.f === k ? 'on' : ''}" data-act="ordF" data-k="${k}">${n} <span class="n">${all.filter(fn).length}</span></button>`).join('')}</div>
    ${ORDV.view === 'list' ? card('', list.length ? `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Order</th><th>Client</th><th>Stage</th><th class="m-hide">Vendor</th><th>Promised</th><th class="num">Balance</th></tr></thead><tbody>${list.map(d => `<tr data-go="#/deal/${d.id}"><td><b>${esc(d.order_no || d.id)}</b><div class="xs muted">${esc(dealTitle(d))}</div></td><td>${esc(dealContact(d).name)}</td><td>${stagePill(d.stage)}${d.stage === 'In Production' && d.production_stage ? `<div class="xs muted">${esc(d.production_stage)}</div>` : ''}</td><td class="m-hide">${esc(d.vendor || '—')}</td><td>${d.promised_date ? (lateBadge(d) === 'late' ? `<span class="badge red">${-daysTo(d.promised_date)}d late</span>` : fdate(d.promised_date)) : '—'}</td><td class="num">${inr(money(d).balance)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No orders match.</div>', { flush: true })
      : `<div class="board">${ORD_STAGES.map(s => { const ds = list.filter(d => d.stage === s); return `<div class="bcol pc"><div class="bh" title="${esc(stg(s).help)}"><span class="spill order" style="height:20px">${esc(stg(s).label)}</span><span class="tot">${ds.length}</span></div><div class="cards">${ds.map(ocard).join('') || '<div class="empty-col">—</div>'}</div></div>`; }).join('')}</div>`}`;
  }
};
ACTIONS.ordF = el => { ORDV.f = el.dataset.k; render(); };
ACTIONS.ordView2 = el => { ORDV.view = el.dataset.v; render(); };

/* =================================================================== QUOTES
   Every priced quote across the pipeline, with where it stands. */
const QLIST = { f: 'all' };
const quoteState = d => !d.quote_no ? ['', 'no quote'] : d.order_date ? ['green', 'became an order'] : !quoteShared(d) ? ['amber', 'not shared yet'] : !quoteValid(d) ? ['red', 'stale: re-price'] : d.quote_valid_till && TODAY > d.quote_valid_till ? ['amber', '24 h lapsed'] : ['blue', 'live'];
SCREENS.quotes = {
  title: 'Quotes', nav: 'quotes',
  render() {
    const all = liveDeals().filter(d => d.quote_no).sort((a, b) => b.quote_date - a.quote_date);
    const F = { all: 'All', live: 'Live', lapsed: '24 h lapsed', stale: 'Stale: re-price', unshared: 'Not shared yet', order: 'Became orders' };
    const key = d => { const s = quoteState(d)[1]; return s === 'live' ? 'live' : s === '24 h lapsed' ? 'lapsed' : s.startsWith('stale') ? 'stale' : s === 'not shared yet' ? 'unshared' : 'order'; };
    const list = QLIST.f === 'all' ? all : all.filter(d => key(d) === QLIST.f);
    return `${pageHead('Quotes', 'Every price a client has seen. A quote holds 24 hours from sharing; the rate can become an order for 2 days, then re-price.', `<button class="btn primary" data-act="newQuotePick">${icon('plus')}New quote</button>`)}
    <div class="chips" style="margin-bottom:14px">${Object.entries(F).map(([k, n]) => `<button class="chip ${QLIST.f === k ? 'on' : ''}" data-act="qlistF" data-k="${k}">${n} <span class="n">${k === 'all' ? all.length : all.filter(d => key(d) === k).length}</span></button>`).join('')}</div>
    ${card('', list.length ? `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Quote</th><th>Client</th><th class="m-hide">Piece</th><th class="num">Total</th><th class="m-hide">Shared</th><th>Holds till</th><th>Status</th></tr></thead><tbody>
      ${list.map(d => { const st = quoteState(d); return `<tr data-go="#/deal/${d.id}/quote"><td><b class="mono">${esc(d.quote_no)}</b>${d.quote_version > 1 ? ` <span class="badge out">v${d.quote_version}</span>` : ''}<div class="xs muted">${fdate(d.quote_date)}</div></td><td>${esc(dealContact(d).name)}<div class="xs muted">${stagePill(d.stage)}</div></td><td class="m-hide truncate" style="max-width:240px">${esc(dealTitle(d))}</td><td class="num strong">${inr(d.calc.total)}</td>
        <td class="m-hide">${d.quote_sent_at ? `${{ pdf: 'PDF', whatsapp: 'WhatsApp L3', in_store: 'In store' }[d.quote_shared_via] || ''}<div class="xs muted">${fdt(d.quote_sent_at)}</div>` : '<span class="muted">—</span>'}</td><td>${d.quote_valid_till ? fdt(d.quote_valid_till) : '—'}</td><td><span class="badge ${st[0]}">${st[1]}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No quotes here.</div>', { flush: true })}`;
  }
};
ACTIONS.qlistF = el => { QLIST.f = el.dataset.k; render(); };
ACTIONS.newQuotePick = () => {
  const cands = liveDeals().filter(d => ['New', 'Contacted', 'Qualified', 'Quoted', 'Negotiating'].includes(d.stage)).sort((a, b) => (a.quote_no ? 1 : 0) - (b.quote_no ? 1 : 0));
  openSheet({ title: 'New quote', sub: 'A quote lives on the client\'s enquiry, so pick it (or capture the enquiry first)',
    body: `<div class="card"><div class="list">${cands.map(d => `<div class="li" data-go="#/deal/${d.id}/quote">${av(dealContact(d).name, dealContact(d).color || '#8C6D3F', 'sm')}<div class="grow" style="min-width:0"><div class="t">${esc(dealContact(d).name)}</div><div class="s truncate">${esc(d.product_interest || '')} · ${stg(d.stage).label}${d.quote_no ? ' · has ' + d.quote_no : ' · no quote yet'}</div></div>${icon('chevR', 'sm')}</div>`).join('')}</div></div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-go="#/leads">${icon('plus')}Capture a new enquiry</button>` });
};

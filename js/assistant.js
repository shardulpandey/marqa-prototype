/* Ask MARQA: the owner's assistant. Answers come from the live records (DEALS, CONTACTS, STOCK_ITEMS, STOCK_MOVES,
   SETTINGS) through simple intent matching; in the product this is an LLM with read access to the shop's records.
   Every row links to the record it came from: deals open on #/deal/<id>. */

const AI_SUGG = ['What needs my attention today?', 'Which orders are late?', 'Price a 1 ct round solitaire in 18K', 'Which follow-ups are due?', 'Draft a follow-up for Harsh Agarwal', 'Which karigar is holding metal?', 'Who has an anniversary this month?', 'How did Instagram do?'];
let AI_LOG = [];
const AI_DRAFTS = {};

function aiPanel() {
  let el = document.getElementById('assist');
  if (!el) { el = document.createElement('div'); el.id = 'assist'; document.body.appendChild(el); }
  return el;
}
ACTIONS.openAssistant = () => {
  const el = aiPanel();
  el.innerHTML = `<section class="assistant" role="dialog" aria-label="Ask MARQA">
    <div class="ah"><span class="orb">${icon('sparkles')}</span><div class="grow"><div class="strong">Ask MARQA</div><div class="xs muted">Reads your deals, contacts, stock and rates</div></div>
      <button class="icon-btn" data-act="aiReset" title="New chat" aria-label="New chat">${icon('edit', 'sm')}</button><button class="icon-btn" data-act="closeAssistant" aria-label="Close">${icon('x')}</button></div>
    <div class="ab" id="aiBody"></div>
    <div class="af"><div class="composer"><textarea id="aiIn" placeholder="Ask in English or Hindi…" rows="1"></textarea><button class="mic" data-act="aiVoice" title="Speak" aria-label="Speak">${icon('mic', 'sm')}</button><button class="send" data-act="aiSend" aria-label="Ask">${icon('send', 'sm')}</button></div>
      <div class="xs muted mt-8" style="text-align:center">Answers cite your records. Check figures before sending them to clients.</div></div></section>`;
  const inp = el.querySelector('#aiIn');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ACTIONS.aiSend(); } });
  aiPaint(); inp.focus();
};
ACTIONS.closeAssistant = () => { aiPanel().innerHTML = ''; };
ACTIONS.aiReset = () => { const had = AI_LOG.length; AI_LOG = []; aiPaint(); if (!had) toast('Already a fresh chat', 'edit'); };
ACTIONS.aiAsk = el => aiAsk(el.dataset.q || el.textContent);
ACTIONS.aiSend = () => { const i = document.getElementById('aiIn'); if (i && i.value.trim()) { aiAsk(i.value.trim()); i.value = ''; } else { if (i) i.focus(); toast('Type a question, or tap a suggestion', 'sparkles'); } };
ACTIONS.aiVoice = el => {
  el.style.color = 'var(--red)'; el.title = 'Listening…';
  setTimeout(() => { el.style.color = ''; el.title = 'Speak'; aiAsk('Aaj kitne orders late hain?'); }, 1200);
};

function aiPaint(typing) {
  const b = document.getElementById('aiBody'); if (!b) return;
  b.innerHTML = (AI_LOG.length ? '' : `<div class="msg ai">Good ${TODAY.getHours() < 12 ? 'morning' : 'afternoon'}, ${esc(sx_first(viewUser().name))}. I can find deals, price pieces, draft messages and pull numbers from your records. What would you like to know?</div>
      <div class="sugg">${AI_SUGG.map(s => `<button data-act="aiAsk">${s}</button>`).join('')}</div>`)
    + AI_LOG.map(m => `<div class="msg ${m.who}">${m.html}</div>`).join('')
    + (typing ? '<div class="msg ai" style="padding:0"><span class="typing"><i></i><i></i><i></i></span></div>' : '');
  b.scrollTop = b.scrollHeight;
}
function aiAsk(q) {
  AI_LOG.push({ who: 'me', html: esc(q) });
  aiPaint(true);
  setTimeout(() => { let html; try { html = aiAnswer(q); } catch (e) { html = 'I could not read that from the records just now.'; } AI_LOG.push({ who: 'ai', html }); aiPaint(); }, 650);
}
const rr = (go, left, right) => `<div class="rr" data-go="${go}">${left}<span style="margin-left:auto;flex:none" class="small strong">${right}</span></div>`;
const aiThumb = d => d.img ? `<img class="thumb" style="width:32px;height:32px" src="${img(d.img, 80)}" alt="">` : '';
const aiDealRow = (d, sub, right, tab) => rr(`#/deal/${d.id}${tab ? '/' + tab : ''}`, `${aiThumb(d)}<div style="min-width:0"><div class="strong truncate">${esc(d.order_no || d.id)} · ${esc(dealTitle(d))}</div><div class="xs muted truncate">${esc(dealContact(d).name)} · ${sub}</div></div>`, right);
const aiLate = d => { const n = -daysTo(d.promised_date); return n > 0 ? badge(`${n}d late`, 'red', true) : badge(n === 0 ? 'Due today' : n === -1 ? 'Due tomorrow' : `Due ${fdate(d.promised_date)}`, 'amber', true); };
const aiEndOfDay = () => { const x = new Date(TODAY); x.setHours(23, 59, 59, 0); return x; };
const aiFollowUps = () => dealsVisible().filter(d => isOpen(d) && d.next_action_at && d.next_action_at <= aiEndOfDay() && !d.deleted).sort((a, b) => a.next_action_at - b.next_action_at);
const aiVendor = d => d.vendor ? (kgOf(d.vendor) || { name: d.vendor }).name : 'no vendor';

/* price a piece from words: "1 ct round solitaire in 18K", "2 ct oval studs in platinum" */
function aiPrice(s) {
  const ct = parseFloat((s.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat)/) || [])[1]) || 1;
  const shape = (opts('diamond_shapes').find(x => s.includes(x.toLowerCase())) || 'Round');
  const purity = /platinum|pt950|pt 950/.test(s) ? 'PT950' : /silver|925/.test(s) ? 'S925' : ((s.match(/\b(9|10|14|18|22)\s*k\b/) || [])[1] ? s.match(/\b(9|10|14|18|22)\s*k\b/)[1] + 'K' : '18K');
  const kind = /stud|earring/.test(s) ? 'Earrings / Studs' : /pendant/.test(s) ? 'Pendant' : /necklace/.test(s) ? 'Necklace' : /bracelet|tennis/.test(s) ? 'Bracelet' : 'Ring';
  const wt = { 'Earrings / Studs': 2.4, Pendant: 1.8, Necklace: 4.2, Bracelet: 9.8, Ring: 3.2 }[kind];
  const quality = /vvs|ef\b|d colour|e colour/.test(s) ? 'VVS-EF' : /gh|si\b/.test(s) ? 'VS-GH' : 'VS-FG';
  const pcs = kind === 'Earrings / Studs' ? 2 : 1;
  const q = { purity, gold_rate_24k: baseRateFor(purity), gold_wt: wt, making_rate: sheetMaking(purity, kind), extra_stones: 0, discount_pct: 0, gst_pct: SETTINGS.default_gst, usd_rate: SETTINGS.default_usd, usd_spread: SETTINGS.default_usd_spread,
    lines: [{ shape, pcs, ct, quality, rate: sheetRate(shape, quality, pcs, ct) || 0 }] };
  return { q, r: computeLive(q), ct, shape, purity, kind, wt, quality, pcs };
}

function aiAnswer(q) {
  const s = q.toLowerCase();
  const hinglish = /kitne|kitna|hain|hai\b|kya|aaj|batao|[ऀ-ॿ]/.test(s);
  const named = CONTACTS.find(c => c.name.toLowerCase().split(/[\s&]+/).filter(w => w.length > 3).some(w => s.includes(w)));

  if (/late|deri|der se|delay/.test(s)) {
    const vis = dealsVisible().filter(isOrder), late = vis.filter(d => lateBadge(d) === 'late'), soon = vis.filter(d => lateBadge(d) === 'soon');
    const lead = late[0];
    return `${hinglish ? `Aaj ${late.length} order late hai aur ${soon.length} agle 3 din mein due hain.` : `${late.length} order${late.length === 1 ? ' is' : 's are'} past the promised date and ${soon.length} ${soon.length === 1 ? 'is' : 'are'} due in the next three days.`}
      <div class="rich">${[...late, ...soon].map(d => aiDealRow(d, `${stg(d.stage).label}${d.production_stage && d.stage === 'In Production' ? ' · ' + d.production_stage : ''} · ${aiVendor(d)}`, aiLate(d), 'order')).join('') || '<div class="rr">Nothing late.</div>'}</div>
      ${lead ? `<div class="mt-8 small">${hinglish ? `${lead.order_no} ke liye ${aiVendor(lead)} se nayi date le lijiye, phir ${esc(sx_first(dealContact(lead).name))} ko update karein (template O9).` : `${lead.order_no} needs a new date from ${aiVendor(lead)} before you update ${esc(dealContact(lead).name)} (template O9).`}</div>` : ''}`;
  }
  if (/attention|today|priorit|aaj|morning|briefing/.test(s)) {
    const vis = dealsVisible(), late = vis.filter(d => lateBadge(d) === 'late'), soon = vis.filter(d => lateBadge(d) === 'soon');
    const fu = aiFollowUps(), noReply = vis.filter(d => (slaBadge(d) || [])[1] && /no reply/.test(slaBadge(d)[1])), reprice = vis.filter(d => (slaBadge(d) || [])[0] === 'amber');
    const rows = [...late.map(d => aiDealRow(d, `late at ${aiVendor(d)}`, aiLate(d), 'order')), ...noReply.map(d => aiDealRow(d, `new lead, ${slaBadge(d)[1]}`, badge('Reply', 'red'), 'activity')),
      ...fu.filter(d => !late.includes(d)).slice(0, 4).map(d => aiDealRow(d, esc(d.next_action || 'Follow up'), d.next_action_at < TODAY ? badge('Overdue', 'red') : badge(sx_hm(d.next_action_at), 'gold'), 'activity')), ...reprice.map(d => aiDealRow(d, 'quote past its rate window', badge('Re-price', 'amber'), 'quote')), ...soon.map(d => aiDealRow(d, `${stg(d.stage).label}`, aiLate(d), 'order'))];
    return `Today: <b>${late.length} late order${late.length === 1 ? '' : 's'}</b>, ${fu.length} follow-up${fu.length === 1 ? '' : 's'} due, ${noReply.length} lead${noReply.length === 1 ? '' : 's'} waiting for a first reply and ${reprice.length} quote${reprice.length === 1 ? '' : 's'} to re-price.
      <div class="rich">${[...new Set(rows)].slice(0, 9).join('')}</div>`;
  }
  if (/price|kitna|cost|how much|solitaire|\bct\b|carat/.test(s) && !/stock|safe|have/.test(s)) {
    const P = aiPrice(s), r = P.r, l = r.lines[0];
    const want = P.kind === 'Earrings / Studs' ? ['Solitaire studs'] : P.kind === 'Pendant' ? ['Pendant'] : P.kind === 'Ring' ? ['Engagement ring', 'Bespoke'] : [P.kind];
    const lead = dealsVisible().filter(d => isOpen(d) && ['lead', 'quote'].includes(stg(d.stage).group) && want.includes(d.product_interest)).sort((a, b) => (!!a.quote_no - !!b.quote_no) || (sIdx(b.stage) - sIdx(a.stage)))[0];
    const per = P.ct / P.pcs, fit = STOCK_ITEMS.filter(x => x.kind === 'diamond' && x.shape === P.shape && Math.abs(x.carat - per) <= 0.1 && stockBal(x).status === 'in_stock');
    return `A ${P.ct} ct ${P.shape.toLowerCase()} lab-grown ${P.kind === 'Earrings / Studs' ? 'pair of studs' : P.kind === 'Ring' && /solitaire/.test(s) ? 'solitaire ring' : P.kind.toLowerCase()} (${P.quality}) in ${P.purity}, about ${P.wt} g, comes to <b>${inr(r.total)}</b> including GST${r.usd_total ? ` (about US$${NF.format(r.usd_total)})` : ''}.
      <div class="rich" style="padding:10px"><dl class="kv"><dt>Metal ${P.wt} g at ${inr(r.gold_rate_applied)}/g</dt><dd class="num">${inr(r.gold_value)}</dd><dt>Diamond${P.pcs > 1 ? 's' : ''} ${P.pcs} × ${per.toFixed(2)} ct at ${inr(l.rate)}/ct</dt><dd class="num">${inr(r.diamond_value)}</dd><dt>Making at ${inr(P.q.making_rate)}/g</dt><dd class="num">${inr(r.labour)}</dd><dt>GST ${SETTINGS.default_gst}%</dt><dd class="num">${inr(r.gst_amt)}</dd><dt class="tot">Total</dt><dd class="tot num">${inr(r.total)}</dd></dl></div>
      <div class="xs muted mt-8">24K at ${inr(SETTINGS.gold_rate_24k)}/g on ${SETTINGS.gold_rate_date}; diamond rate from the sheet; making from the labour sheet.</div>
      ${lead ? `<div class="row wrap mt-8" style="gap:6px"><button class="btn sm" data-go="#/deal/${lead.id}/quote">Open in quote builder</button><span class="xs muted">${esc(dealContact(lead).name)} · ${lead.id} · ${esc(stg(lead.stage).label)}</span></div>` : ''}
      ${fit.length && can('stock') ? `<div class="xs muted mt-8">In the safe and a fit: ${fit.map(x => `<a class="link strong" href="#/stock/${x.id}">${x.code}</a> (${x.carat.toFixed(2)} ct ${x.colour} ${x.clarity})`).join(', ')}.</div>` : ''}`;
  }
  if (named && /draft|follow|message|write|remind|likh/.test(s)) {
    const ds = dealsVisible().filter(d => d.contact === named.id && isOpen(d)).sort((a, b) => (isOrder(a) - isOrder(b)) || (b.enquiry - a.enquiry)), d = ds[0];
    if (!d) return `${esc(named.name)} has no open deal${VIEW.role === 'ops' ? ' you can see' : ''}. <div class="row mt-8"><button class="btn sm" data-go="#/customers/${named.id}">Open contact</button></div>`;
    const g = stg(d.stage).group, key = g === 'lead' ? 'L2' : g === 'quote' ? (quoteValid(d) ? 'L5' : 'L4') : money(d).balance > 0.5 && d.stage === 'Ready' ? 'B2' : 'O4', tp = TEMPLATES.find(x => x.key === key);
    const text = sx_fill(tp.body, d), t = THREADS.find(x => x.id === d.thread) || sx_contactThread(named.id), id = 'dr' + Object.keys(AI_DRAFTS).length;
    AI_DRAFTS[id] = { d: d.id, t: t && t.id, key, text };
    const ctx = [d.occasion && named.anniversary && /anniversary/i.test(d.occasion) ? `anniversary on ${new Date(named.anniversary).getDate()} ${MON[new Date(named.anniversary).getMonth()]}` : '', d.quote_no ? `quote ${d.quote_no} v${d.quote_version} for ${inr(d.calc.total)}${d.quote_sent_at ? ', shared ' + rel(d.quote_sent_at).toLowerCase() : ''}` : '', d.next_action ? `next action: ${d.next_action.toLowerCase()}` : ''].filter(Boolean).join('; ');
    return `Here's a follow-up for ${esc(named.name)} on ${esc(dealTitle(d))} (${d.id}, ${esc(stg(d.stage).label)}${ctx ? '; ' + esc(ctx) : ''}). It uses template ${key}.
      <div class="rich" style="padding:10px;background:#E3F5E1;white-space:pre-line">${esc(text)}</div>
      ${g === 'quote' && !quoteValid(d) ? `<div class="small mt-8">${icon('alert', 'sm')} The quote is past its 2-day rate window: re-price it before you promise the number.</div>` : ''}
      <div class="row wrap mt-8" style="gap:6px"><button class="btn sm wa" data-act="aiSendDraft" data-id="${id}">${icon('send', 'sm')}Send on WhatsApp</button><button class="btn sm ghost" data-act="aiWarm" data-id="${id}">Make it warmer</button>${g === 'quote' && !quoteValid(d) ? `<button class="btn sm" data-go="#/deal/${d.id}/quote">Re-price</button>` : ''}</div>`;
  }
  if (/follow|due|call back|next action/.test(s)) {
    const fu = aiFollowUps();
    return `${fu.length} follow-up${fu.length === 1 ? ' is' : 's are'} due by the end of today, ${fu.filter(d => d.next_action_at < TODAY).length} already overdue.
      <div class="rich">${fu.map(d => aiDealRow(d, esc(d.next_action || 'Follow up') + ' · ' + esc(userName(d.owner)), d.next_action_at < TODAY ? badge('Overdue', 'red') : badge(sx_hm(d.next_action_at), 'gold'), 'activity')).join('') || '<div class="rr">Nothing due.</div>'}</div>`;
  }
  if (/anniversar|birthday|janamdin|salgirah/.test(s)) {
    const mo = TODAY.getMonth(), hit = (iso) => iso && new Date(iso).getMonth() === mo;
    const list = CONTACTS.filter(c => hit(c.anniversary) || hit(c.birthday));
    return `${list.length} client${list.length === 1 ? ' has' : 's have'} an anniversary or birthday in ${MON[mo]}:<div class="rich">${list.map(c => { const iso = hit(c.anniversary) ? c.anniversary : c.birthday, st = contactStats(c); return rr('#/customers/' + c.id, av(c.name, c.color, 'sm') + `<div style="min-width:0"><div class="strong">${esc(c.name)}</div><div class="xs muted">${hit(c.anniversary) ? 'Anniversary' : 'Birthday'} ${new Date(iso).getDate()} ${MON[mo]}${moneyShown() && st.orders_value ? ' · lifetime ' + inrShort(st.orders_value) : ''}${c.consent_marketing ? '' : ' · no marketing consent'}</div></div>`, (c.tags || [])[0] || ''); }).join('')}</div>
      <div class="small mt-8">The anniversary automation (template P6) greets them 7 days ahead.</div><div class="row mt-8"><button class="btn sm" data-go="#/campaigns">Open campaigns</button></div>`;
  }
  if (/karigar|metal|loss|holding|vendor|casting/.test(s)) {
    const all = KARIGARS.map(k => [k, kgStats(k)]).filter(([, x]) => x.held > 0).sort((a, b) => b[1].heldFine - a[1].heldFine);
    const tot = all.reduce((t, [, x]) => t + x.heldFine, 0);
    return `Karigars hold <b>${grams(tot)}</b> of fine gold across ${all.reduce((t, [, x]) => t + x.holding.length, 0)} jobs.
      <div class="rich">${all.map(([k, x]) => rr('#/production/' + k.id, av(k.name, k.color, 'sm') + `<div style="min-width:0"><div class="strong">${esc(k.name)}</div><div class="xs muted">${x.holding.map(d => `${d.gold_issued_wt} g ${d.purity} · ${d.order_no} · ${kgHeldDays(d)}d`).join(' · ')}</div></div>`, x.late.length ? badge(x.late.length + ' late', 'red', true) : grams(x.held))).join('') || '<div class="rr">No metal out.</div>'}</div>
      ${kgAlerts().length ? `<div class="small mt-8">${esc(kgAlerts()[0].k.name)}: ${esc(kgAlerts()[0].t)}</div>` : ''}<div class="row mt-8"><button class="btn sm" data-go="#/production">Open karigars</button></div>`;
  }
  if (/stock|diamond|stone|safe|carat|gem/.test(s)) {
    if (!can('stock')) return 'Your role cannot see the stock ledger. Ask Ops or a founder.';
    const items = STOCK_ITEMS.filter(x => ['diamond', 'gem'].includes(x.kind)).map(x => [x, stockBal(x)]);
    const inSafe = items.filter(([, b]) => b.status === 'in_stock');
    return `${inSafe.length} loose stones are in the safe; ${items.length - inSafe.length} are issued, on memo or sold.<div class="rich">${items.map(([x, b]) => rr('#/stock/' + x.id, `<div style="min-width:0"><div class="strong">${x.carat.toFixed(2)} ct ${esc(x.shape)}${x.colour ? ' · ' + esc(x.colour) : ''}${x.clarity ? ' ' + esc(x.clarity) : ''}</div><div class="xs muted truncate">${x.cert_lab ? esc(x.cert_lab) + ' ' : ''}${esc(x.code)} · ${esc(x.location)}${b.moves.slice(-1)[0] && b.moves.slice(-1)[0].deal ? ' · ' + esc((dealById(b.moves.slice(-1)[0].deal) || {}).order_no || '') : ''}</div></div>`, badge(STOCK_STATUS[b.status][0], STOCK_STATUS[b.status][1]))).join('')}</div>`;
  }
  if (/gold|rate|sona|silver|platinum|chandi/.test(s)) {
    const g = k => inr(SETTINGS.gold_rate_24k * GOLD[k][0]);
    return `24K gold is <b>${inr(SETTINGS.gold_rate_24k)}</b>/g today (${SETTINGS.gold_rate_date}). Quoted per gram: 22K ${g('22K')}, 18K ${g('18K')}, 14K ${g('14K')}, 9K ${g('9K')}. Silver 999 ${inr(SETTINGS.silver_rate_999)}/g, platinum 950 ${inr(SETTINGS.platinum_rate_950)}/g. Quotes hold 24 hours at this rate; an order can still be confirmed at it for 2 days from the quote date.
      ${can('settings.rates') ? '<div class="row mt-8"><button class="btn sm" data-go="#/settings/rates">Set today\'s rates</button></div>' : ''}`;
  }
  if (/instagram|source|perform|channel|\bmeta\b|google|walk-in|referral/.test(s)) {
    const src = {}; dealsVisible().forEach(d => { const k = d.source_channel || 'Other'; const x = src[k] = src[k] || { n: 0, o: 0, v: 0 }; x.n++; if (WON_STAGES.includes(d.stage)) { x.o++; x.v += d.est_cost || d.calc.total; } });
    const rows = Object.entries(src).sort((a, b) => b[1].v - a[1].v || b[1].n - a[1].n), want = rows.find(([k]) => s.includes(k.toLowerCase())) || rows.find(([k]) => k === 'Instagram');
    return `${want ? `${want[0]} brought <b>${want[1].n} enquir${want[1].n === 1 ? 'y' : 'ies'}</b> and <b>${want[1].o} order${want[1].o === 1 ? '' : 's'}</b> on the records${moneyShown() && want[1].v ? `, ${inrShort(want[1].v)} in order value` : ''}.` : ''} By source:
      <div class="rich">${rows.map(([k, x]) => rr('#/reports', `<div><div class="strong">${esc(k)}</div><div class="xs muted">${x.n} enquiries · ${x.o} orders · ${x.n ? Math.round(x.o / x.n * 100) : 0}%</div></div>`, moneyShown() ? inrShort(x.v) : '')).join('')}</div>
      <div class="row mt-8"><button class="btn sm" data-go="#/reports">Open reports</button></div>`;
  }
  return `I can help with deals, clients, stock, rates and messages. Try one of these:<div class="sugg mt-8">${AI_SUGG.slice(0, 4).map(x => `<button data-act="aiAsk">${x}</button>`).join('')}</div>`;
}
ACTIONS.aiWarm = el => {
  const dr = AI_DRAFTS[el.dataset.id], d = dealById(dr.d), n = sx_first(dealContact(d).name);
  const rest = dr.text.replace(/^Hi [^,]+,\s*/, '');
  dr.text = `Hi ${n}, hope you're keeping well! ${rest[0].toUpperCase() + rest.slice(1)}\n\nNo rush at all; I'd just love for this one to be perfect for you. — ${sx_first(viewUser().name)}`;
  AI_LOG.push({ who: 'ai', html: `Warmer version:<div class="rich" style="padding:10px;background:#E3F5E1;white-space:pre-line">${esc(dr.text)}</div><div class="row mt-8"><button class="btn sm wa" data-act="aiSendDraft" data-id="${el.dataset.id}">${icon('send', 'sm')}Send this one</button></div>` });
  aiPaint();
};
ACTIONS.aiSendDraft = el => {
  const dr = AI_DRAFTS[el.dataset.id], d = dealById(dr.d), t = THREADS.find(x => x.id === dr.t), tp = TEMPLATES.find(x => x.key === dr.key);
  if (dr.sent) return toast('Already sent', 'check');
  dr.sent = true;
  const nav = h => { if (location.hash === h) render(); else go(h); };
  if (t) { inbPush(t, { from: 'out', t: dr.text }, d, { type: 'template', dir: 'out', template_key: dr.key, subject: `${dr.key} · ${tp.name} sent on WhatsApp`, body: dr.text }); nav('#/inbox/' + t.id); }
  else { logAct(d, { type: 'template', dir: 'out', template_key: dr.key, subject: `${dr.key} · ${tp.name} sent on WhatsApp`, body: dr.text, at: sx_now() }); nav('#/deal/' + d.id + '/activity'); }
  toast(`Sent to ${dealContact(d).name} · logged on ${d.id}`, 'send');
};

/* WhatsApp inbox, campaigns, Shopify app, AI studio, client portal.
   Every thread, request and portal page reads the live records: CONTACTS, DEALS (d.thread links a deal to a
   THREADS id), STOCK_ITEMS. Actions write back to the deal timeline (logAct) so the deal page shows them. */

/* ---------- inbox ---------- */
let INBOX_FILTER = 'All';
const INB = { ai: true };
const inbThread = id => THREADS.find(t => t.id === id);
const inbDeal = t => sx_threadDeals(t)[0];
const inbFit = box => { box.style.height = 'auto'; box.style.height = Math.min(120, Math.max(34, box.scrollHeight)) + 'px'; };
const INB_FILTERS = { All: () => true, Unread: t => t.unread > 0, 'AI handled': t => t.ai || t.msgs.some(m => m.ai), Orders: t => sx_threadDeals(t).some(isOrder) };
SCREENS.inbox = {
  title: 'Inbox', nav: 'inbox',
  render(p) {
    const cur = inbThread(p.id);
    const list = THREADS.filter(INB_FILTERS[INBOX_FILTER]);
    return `<div class="ph hide-m" style="margin-bottom:14px"><div><h1>Inbox</h1><div class="sub">WhatsApp Business · ${TENANT.whatsapp} · AI assistant ${INB.ai ? 'on' : 'off'} for new chats</div></div>
        <div class="actions"><button class="btn" data-act="inbTpl" data-t="${cur ? cur.id : ''}">${icon('megaphone')}Templates</button><label class="btn"><span class="switch"><input type="checkbox" id="inbAi" ${INB.ai ? 'checked' : ''}><span></span></span>AI assistant</label></div></div>
      <div class="inbox ${cur ? 'in-thread' : ''}">
        <div class="threads"><div style="padding:12px;border-bottom:1px solid var(--line-2)"><div class="composer" style="padding:4px 10px;align-items:center">${icon('search', 'sm')}<input id="inbQ" style="border:0;outline:0;flex:1;min-width:0;height:30px;background:transparent" placeholder="Search chats"></div>
          <div class="chips mt-8">${Object.keys(INB_FILTERS).map(f => `<button class="chip ${INBOX_FILTER === f ? 'on' : ''}" data-act="inbFilter" data-f="${f}">${f}</button>`).join('')}</div></div>
          ${list.map(t => { const c = cust(t.cust), last = t.msgs[t.msgs.length - 1] || { t: '' }, d = inbDeal(t); return `<div class="th ${cur && cur.id === t.id ? 'on' : ''}" data-go="#/inbox/${t.id}" data-k="${esc((c.name + ' ' + t.msgs.map(m => m.t).join(' ')).toLowerCase())}">${av(c.name, c.color)}
            <div class="grow" style="min-width:0"><div class="row between"><span class="strong truncate">${esc(c.name)}</span><span class="xs muted">${t.time}</span></div>
            <div class="row between"><span class="pv truncate">${last.from === 'out' ? (last.ai ? '✦ ' : 'You: ') : ''}${esc(last.img && !last.t ? 'Photo' : last.t)}</span>${t.unread ? `<span class="un">${t.unread}</span>` : ''}</div>
            ${d ? `<div class="row mt-8" style="gap:6px">${stagePill(d.stage)}<span class="xs muted truncate">${esc(dealTitle(d))}</span></div>` : ''}</div></div>`; }).join('') || '<div class="empty small">No chats match</div>'}
          <div class="empty small hide" id="inbNone">No chats match</div>
        </div>
        <div class="conv">${cur ? inbConv(cur) : '<div class="empty" style="margin:auto">Pick a conversation</div>'}</div>
        <aside class="ctx">${cur ? inbCtx(cur) : ''}</aside>
      </div>`;
  },
  mount(root, p) {
    const b = root.querySelector('.cb'); if (b) { b.scrollTop = b.scrollHeight; b.querySelectorAll('img').forEach(i => i.addEventListener('load', () => { b.scrollTop = b.scrollHeight; })); }
    const t = inbThread(p.id); if (t) t.unread = 0;
    const q = root.querySelector('#inbQ');
    if (q) q.addEventListener('input', () => { const s = q.value.trim().toLowerCase(); let n = 0; root.querySelectorAll('.th').forEach(x => { const hit = !s || x.dataset.k.includes(s); x.style.display = hit ? '' : 'none'; n += hit; }); root.querySelector('#inbNone').classList.toggle('hide', n > 0); });
    const box = root.querySelector('#msgBox'); if (box) box.addEventListener('input', () => { inbFit(box); if (!box.value) box.dataset.tpl = ''; });
    const ai = root.querySelector('#inbAi');
    if (ai) ai.addEventListener('change', () => { INB.ai = ai.checked; toast(INB.ai ? 'AI assistant on: it drafts the first reply to new chats' : 'AI assistant off: new chats wait for the team', 'sparkles'); render(); });
  }
};
ACTIONS.inbFilter = el => { INBOX_FILTER = el.dataset.f; render(); };
ACTIONS.inboxFilter = ACTIONS.inbFilter;
const inbBubble = m => `<div class="bub ${m.from} ${m.ai ? 'ai' : ''}">${m.img ? `<img src="${img(m.img, 400)}" alt="">` : ''}${m.doc ? `<div class="row" style="gap:8px">${icon('doc')}<b>${esc(m.doc)}</b></div>` : ''}${esc(m.t || '')}<div class="bt">${m.ai ? '<span style="color:var(--gold-dk)">✦ AI</span>' : ''}${m.at}${m.from === 'out' ? ' ✓✓' : ''}</div></div>`;
/* Suggested replies: from the deal's stage, using the live templates where one fits */
function inbSuggestions(t) {
  const d = inbDeal(t), tpl = k => { const x = TEMPLATES.find(z => z.key === k); return { label: `${k} · ${x.name}`, text: sx_fill(x.body, d), key: k }; };
  if (!d) return [{ label: 'Thank them', text: `Thank you! I'm ${sx_first(viewUser().name)} from MARQA. How can I help?` }];
  const g = stg(d.stage).group, c = dealContact(d);
  if (g === 'lead') return [
    d.stage === 'New' ? tpl('L1') : tpl('L2'),
    { label: 'Offer a video call', text: `Hi ${sx_first(c.name)}, would a 10-minute video call today or tomorrow help? We can show you ${d.product_interest === 'Bespoke' ? 'band styles' : 'stones of different shapes'} side by side, live.` },
    d.intl ? { label: 'Export and delivery', text: `Hi ${sx_first(c.name)}, we ship insured to ${c.country}. The piece goes with its certificate and a commercial invoice; duties are paid on arrival. Making takes about three weeks after you approve the design.` }
      : { label: 'Ask the size and budget', text: `Hi ${sx_first(c.name)}, to suggest the right options: do you know the ring size, and is there a budget range you'd like me to stay within?` }];
  if (g === 'quote') return [tpl('L3'), tpl(quoteValid(d) ? 'L5' : 'L4'), { label: 'Offer to adjust', text: `Hi ${sx_first(c.name)}, happy to adjust the quote: a slightly smaller centre stone or 14K instead of 18K would bring the total down. Shall I send both options?` }];
  if (g === 'order') {
    const s = d.stage;
    return [s === 'In Production' ? tpl('O4') : s === 'CAD Sent' ? tpl('O2') : s === 'Ready' ? tpl('O6') : s === 'Dispatched' ? tpl('O7') : tpl('O1'),
      money(d).balance > 0.5 ? tpl('B2') : tpl('B3'),
      { label: 'Share an update', text: `Hi ${sx_first(c.name)}, a quick update on your ${sx_lc1(dealTitle(d))}: it is at ${stg(d.stage).label.toLowerCase()}${d.production_stage ? ' (' + d.production_stage.toLowerCase() + ')' : ''} and on track for ${d.promised_date ? fdate(d.promised_date) : 'the date we agreed'}.` }];
  }
  return [tpl('P1'), tpl('P2')];
}
function inbConv(t) {
  const c = cust(t.cust), d = inbDeal(t), sugg = inbSuggestions(t);
  return `<div class="ch"><button class="icon-btn only-m" data-go="#/inbox" aria-label="Back">${icon('chevL')}</button>${av(c.name, c.color)}<div class="grow" style="min-width:0"><div class="strong truncate">${esc(c.name)}</div><div class="xs muted num truncate">${esc(maskPhone(c.phone))} · ${esc(c.city)}</div></div>
      <button class="btn sm hide-m" data-go="#/customers/${c.id}">Profile</button><button class="icon-btn" data-act="inbCall" data-t="${t.id}" aria-label="Call">${icon('phone')}</button></div>
    ${d ? `<div class="sx-dealbar">${stagePill(d.stage)}<span class="grow truncate">${esc(dealTitle(d))}${d.quote_no ? ' · ' + inr(d.calc.total) : ''}</span><button class="btn sm" data-go="#/deal/${d.id}">Open deal</button></div>` : ''}
    <div class="cb">${t.msgs.map(inbBubble).join('')}</div>
    <div class="cf"><div class="ai-sugg"><div class="h">${icon('sparkles', 'sm')} Suggested replies${d ? ` · ${esc(stg(d.stage).label)}` : ''}</div><div class="sugg mt-8">${sugg.map((s, i) => `<button data-act="inbSugg" data-t="${t.id}" data-i="${i}">${esc(s.label)}</button>`).join('')}</div></div>
      <div class="composer"><button class="mic" data-act="inbTpl" data-t="${t.id}" title="Templates" aria-label="Templates">${icon('file', 'sm')}</button><textarea id="msgBox" placeholder="Type a message"></textarea><button class="mic" data-act="inbAttach" data-t="${t.id}" title="Attach a photo or the quote" aria-label="Attach">${icon('image', 'sm')}</button><button class="send" data-act="inbSend" data-t="${t.id}" aria-label="Send">${icon('send', 'sm')}</button></div></div>`;
}
function inbSummary(t, d) {
  if (!d) return 'No deal on record for this chat yet.';
  const bits = [d.product_interest && `${d.product_interest}${d.occasion ? ' for ' + d.occasion.toLowerCase() : ''}`, !hides('budget') && d.budget && `budget about ${inrShort(d.budget)}`, d.timeline && d.timeline.toLowerCase(), d.size_client && `size ${d.size_client}`].filter(Boolean).join(' · ');
  return `${esc(bits)}.${d.notes ? ' ' + esc(d.notes) : ''}`;
}
function inbCtx(t) {
  const c = cust(t.cust), ds = sx_threadDeals(t), d = ds[0];
  const dealCard = x => { const lb = lateBadge(x), sl = slaBadge(x); return `<div class="sx-deal" data-go="#/deal/${x.id}">
      <div class="row wrap" style="gap:6px">${stagePill(x.stage)}${typePill(x)}${lb === 'late' ? badge('late', 'red', true) : lb === 'soon' ? badge('due soon', 'amber', true) : ''}${sl ? badge(sl[1], sl[0]) : ''}</div>
      <div class="strong small mt-8">${esc(dealTitle(x))}</div>
      <div class="xs muted mt-8 num">${x.order_no ? esc(x.order_no) + ' · ' : ''}${x.quote_no ? `${esc(x.quote_no)} v${x.quote_version} · ${inr(x.calc.total)}` : 'No quote yet'}</div>
      ${x.next_action ? `<div class="xs mt-8 ${x.next_action_at && x.next_action_at < TODAY ? '' : 'ink2'}" style="${x.next_action_at && x.next_action_at < TODAY ? 'color:var(--red)' : ''}">${icon('clock', 'sm')} ${esc(x.next_action)} · ${rel(x.next_action_at)} ${sx_hm(x.next_action_at)}</div>` : ''}
      <div class="row between mt-8"><span class="xs muted">${x.id}</span><span class="xs strong" style="color:var(--gold-dk)">Open deal ${icon('chevR', 'sm')}</span></div></div>`; };
  const open = ds.find(x => !isOrder(x) && isOpen(x)) || d;
  return `<div class="row">${av(c.name, c.color, 'lg')}<div style="min-width:0"><div class="strong">${esc(c.name)}</div><div class="chips mt-8">${(c.tags || []).map(x => badge(x, 'gold')).join('') || badge('New client', 'out')}</div></div></div>
    <div class="card mt-16"><div class="card-b small"><div class="eyebrow">${icon('sparkles', 'sm')} Chat summary</div><p class="mt-8 ink2">${inbSummary(t, d)}</p></div></div>
    <div class="label mt-16">${ds.length > 1 ? ds.length + ' deals' : 'Deal'}</div><div class="mt-8">${ds.map(dealCard).join('') || '<div class="empty small">No deal yet</div>'}</div>
    <div class="stack-s mt-16">${open ? `<button class="btn block primary" data-go="#/deal/${open.id}/quote">${icon('file')}${open.quote_no ? 'Open the quote' : 'Send a quote'}</button>` : `<button class="btn block primary" data-go="#/leads">${icon('plus')}Create enquiry</button>`}
      <button class="btn block" data-act="inbVisit" data-t="${t.id}">${icon('calendar')}Book a visit</button>
      <button class="btn block" data-go="#/customers/${c.id}">${icon('user')}Contact profile</button></div>`;
}
ACTIONS.inbSugg = el => {
  const t = inbThread(el.dataset.t), s = inbSuggestions(t)[+el.dataset.i], box = document.getElementById('msgBox');
  box.value = s.text; box.dataset.tpl = s.key || ''; inbFit(box); box.focus();
  el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
  el.style.borderColor = 'var(--gold)';
};
ACTIONS.useSugg = ACTIONS.inbSugg;
function inbPush(t, msg, d, act) {
  const now = sx_now(); msg.at = msg.at || sx_hm(now); t.msgs.push(msg); t.time = msg.at;
  if (d && act) logAct(d, Object.assign({ at: now }, act));
}
ACTIONS.inbSend = el => {
  const t = inbThread(el.dataset.t), box = document.getElementById('msgBox'), d = inbDeal(t);
  const text = box.value.trim(), key = box.dataset.tpl || '';
  if (!text) { box.focus(); return toast('Type a message, or pick a suggested reply first', 'edit'); }
  const tp = key && TEMPLATES.find(x => x.key === key);
  inbPush(t, { from: 'out', t: text }, d, tp ? { type: 'template', dir: 'out', template_key: key, subject: `${key} · ${tp.name} sent on WhatsApp`, body: text } : { type: 'whatsapp', dir: 'out', subject: 'WhatsApp sent', body: text });
  if (tp && key === 'L3' && d && d.quote_no && !quoteShared(d)) { shareQuote(d, 'whatsapp', 'Sent from the inbox'); sx_restamp(d, ['quote_sent_at']); d.quote_valid_till = new Date(d.quote_sent_at.getTime() + QUOTE_VALID_HOURS * 36e5); }
  render(); toast(`Sent to ${sx_first(cust(t.cust).name)}${d ? ' · logged on ' + d.id : ''}`, 'send');
  if (t.id === 't1' && !t.replied) { t.replied = true; setTimeout(() => { inbPush(t, { from: 'in', t: 'Thank you! 😍 Can I come on Saturday to see some stones in person?' }, d, { type: 'whatsapp', dir: 'in', subject: 'They replied', body: 'Can I come on Saturday to see some stones in person?' }); t.unread = location.hash === '#/inbox/t1' ? 0 : 1; if (location.hash.startsWith('#/inbox')) render(); toast('Aditya replied', 'chat'); }, 2200); }
};
ACTIONS.sendMsg = ACTIONS.inbSend;

/* templates: the live L/O/B/P set, filled from this chat's deal */
ACTIONS.inbTpl = el => {
  const t = inbThread(el.dataset.t), d = t && inbDeal(t), g = d ? stg(d.stage).group : null;
  const rows = TEMPLATES.filter(x => x.active).map(x => ({ x, fit: d && (x.stage === d.stage || (g === 'quote' && x.journey === 'quote') || (g === 'order' && ['order', 'billing'].includes(x.journey) && x.stage === d.stage)) }));
  const body = JOURNEYS.map(([j, label]) => { const js = rows.filter(r => r.x.journey === j); return js.length ? `<div class="label ${j === 'lead' ? '' : 'mt-24'}">${label}</div><div class="mt-8">${js.map(({ x, fit }) => `<div class="sx-tpl ${fit ? 'tint' : ''}"><div class="row between"><div class="row" style="gap:8px;min-width:0"><b class="mono">${x.key}</b><span class="strong small truncate">${esc(x.name)}</span></div>${fit ? badge('Fits this stage', 'gold') : ''}</div>
      <div class="b">${esc(t ? sx_fill(x.body, d) : x.body)}</div>
      <div class="row between mt-8"><span class="xs muted">${x.stage ? 'Stage: ' + esc(stg(x.stage).label) : 'Any time'} · ${x.cat}${x.trigger ? ' · day ' + x.trigger : ''}</span><button class="btn sm" data-act="inbTplUse" data-k="${x.key}" data-t="${t ? t.id : ''}">${t ? 'Use' : 'Preview'}</button></div></div>`).join('')}</div>` : ''; }).join('');
  openSheet({ title: 'Message templates', sub: t ? `Filled for ${esc(cust(t.cust).name)}${d ? ' · ' + d.id : ''}. Blanks show as [placeholders].` : 'The WhatsApp journey: lead, quote, order, billing, after-sales. Open a chat to fill one in.', body, wide: true,
    foot: `<button class="btn" data-act="close">Close</button>${can('templates.write') ? '<button class="btn" data-go="#/messages">Edit templates</button>' : ''}` });
};
ACTIONS.inbTplUse = el => {
  const x = TEMPLATES.find(z => z.key === el.dataset.k), t = inbThread(el.dataset.t);
  if (!t) { const b = el.closest('.sx-tpl').querySelector('.b'); b.style.maxHeight = 'none'; el.remove(); return toast(`${x.key} shown in full. Open a chat to send it`, 'eye'); }
  closeLayer();
  const box = document.getElementById('msgBox'); box.value = sx_fill(x.body, inbDeal(t)); box.dataset.tpl = x.key; inbFit(box); box.focus();
  toast(`${x.key} filled in. Check the [placeholders], then send`, 'file');
};

/* call: dial, then log the outcome on the deal */
ACTIONS.inbCall = el => {
  const t = inbThread(el.dataset.t), c = cust(t.cust), d = inbDeal(t), masked = VIEW.role === 'marketing';
  openModal(`<div class="sx-modal-b"><div class="row">${av(c.name, c.color)}<div class="grow"><div class="strong">Call ${esc(c.name)}</div><div class="small muted num">${esc(maskPhone(c.phone))}${d ? ' · ' + d.id : ''}</div></div></div>
    ${masked ? `<div class="banner mt-16">${icon('lock')}<div>Phone numbers are hidden for Marketing. Ask Sales to call.</div></div>` : `<a class="btn primary block lg mt-16" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${icon('phone')}Call from your phone</a>`}
    <div class="label mt-16">After the call</div>
    <div class="chips mt-8">${['Reached', 'No answer', 'Call back later'].map((o, i) => `<label class="chip ${i === 0 ? 'on' : ''}"><input type="radio" name="callOut" value="${o}" ${i === 0 ? 'checked' : ''} style="display:none">${o}</label>`).join('')}</div>
    <label class="field mt-12"><span>Note for the deal</span><textarea class="textarea" id="callNote" placeholder="What did they say?"></textarea></label>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="inbCallLog" data-t="${t.id}" ${d ? '' : 'disabled'}>Log the call${d ? '' : ' (no deal)'}</button></div></div>`, '', m => {
    m.querySelectorAll('input[name=callOut]').forEach(r => r.addEventListener('change', () => m.querySelectorAll('.chips .chip').forEach(ch => ch.classList.toggle('on', ch.contains(m.querySelector('input[name=callOut]:checked'))))));
  });
};
ACTIONS.inbCallLog = el => {
  const t = inbThread(el.dataset.t), d = inbDeal(t), out = (document.querySelector('input[name=callOut]:checked') || {}).value || 'Reached', note = document.getElementById('callNote').value.trim();
  logAct(d, { type: 'call', dir: 'out', subject: 'Called: ' + out.toLowerCase(), body: note, at: sx_now() });
  if (out === 'Call back later') { d.next_action_at = at(1, '11:00'); d.next_action = 'Call back ' + sx_first(dealContact(d).name); }
  closeLayer(); render(); toast(`Call logged on ${d.id}${out === 'Call back later' ? ' · follow-up set for tomorrow 11:00' : ''}`, 'phone');
};

/* attach: deal photos, the quote PDF, similar finished pieces */
ACTIONS.inbAttach = el => {
  const t = inbThread(el.dataset.t), d = inbDeal(t), c = cust(t.cust);
  const own = d ? [...new Set([d.img, ...d.photos.filter(ph => !ph.doc).map(ph => ph.img)].filter(Boolean))] : [];
  const seen = new Set(own), fam = t => /^(Ring|Engagement ring)$/.test(t || '') ? 'ring' : t, similar = DEALS.filter(x => d && x.id !== d.id && isOrder(x) && fam(x.item_type) === fam(d.item_type) && x.img && !seen.has(x.img) && seen.add(x.img)).slice(0, 6);
  const kind = d ? (d.item_type || '') + ' ' + (d.product_interest || '') : '';
  const cat = (IMG[/earring|stud/i.test(kind) ? 'earrings' : /pendant/i.test(kind) ? 'pendants' : /necklace|bridal/i.test(kind) ? 'necklaces' : /bracelet|bangle/i.test(kind) ? 'bracelets' : 'rings'] || IMG.rings).filter(x => !seen.has(x.src)).slice(0, 6);
  const pick = (src, cap) => `<img src="${img(src, 300)}" alt="${esc(cap)}" data-act="inbAttachPick" data-t="${t.id}" data-src="${esc(src)}" data-cap="${esc(cap)}">`;
  openSheet({ title: 'Send to ' + esc(c.name), sub: d ? `From ${d.id} and pieces like it` : 'Photos and documents',
    body: `${d && d.quote_no && d.calc.total ? `<div class="label">Quotation</div><div class="card mt-8"><div class="li" data-act="inbAttachPick" data-t="${t.id}" data-doc="1">${sx_iconTile('doc')}<div class="grow"><div class="t">${esc(d.quote_no)} v${d.quote_version}.pdf</div><div class="s">${esc(dealTitle(d))} · ${inr(d.calc.total)} · ${quoteValid(d) ? 'rate still valid' : 'rate expired: re-price first'}</div></div>${icon('send', 'sm')}</div></div>` : ''}
      ${own.length ? `<div class="label mt-16">This deal</div><div class="sx-gal mt-8">${own.map(s => pick(s, 'Reference for ' + dealTitle(d))).join('')}</div>` : ''}
      ${similar.length ? `<div class="label mt-16">Pieces we have made like it</div><div class="sx-gal mt-8">${similar.map(x => pick(x.img, `${dealTitle(x)} (${x.order_no || x.quote_no || x.id})`)).join('')}</div>` : ''}
      ${cat.length ? `<div class="label mt-16">Catalogue</div><div class="sx-gal mt-8">${cat.map((x, i) => pick(x.src, 'MARQA catalogue ' + (i + 1))).join('')}</div>` : ''}`,
    foot: '<button class="btn" data-act="close">Cancel</button>' });
};
ACTIONS.inbAttachPick = el => {
  const t = inbThread(el.dataset.t), d = inbDeal(t);
  if (el.dataset.doc) {
    if (!quoteValid(d)) { closeLayer(); return toast(`${d.quote_no} is past its rate window. Re-price it on the deal first`, 'alert'); }
    inbPush(t, { from: 'out', doc: `${d.quote_no} v${d.quote_version}.pdf`, t: `Your quotation for ${sx_lc1(dealTitle(d))}: ${inr(d.calc.total)} including GST.` }, d, null);
    shareQuote(d, 'whatsapp', 'PDF sent from the inbox'); sx_restamp(d, ['quote_sent_at']); d.quote_valid_till = new Date(d.quote_sent_at.getTime() + QUOTE_VALID_HOURS * 36e5);
    closeLayer(); render(); return toast(`${d.quote_no} sent · quote marked shared on ${d.id}`, 'doc');
  }
  inbPush(t, { from: 'out', img: el.dataset.src, t: el.dataset.cap }, d, d ? { type: 'whatsapp', dir: 'out', subject: 'Photo sent on WhatsApp', body: el.dataset.cap } : null);
  closeLayer(); render(); toast('Photo sent' + (d ? ' · logged on ' + d.id : ''), 'image');
};

/* book a showroom visit or video consult */
ACTIONS.inbVisit = el => {
  const t = inbThread(el.dataset.t), c = cust(t.cust), d = inbDeal(t);
  const days = [1, 2, 3, 4].map(n => addDays(TODAY, n)), DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const radio = (name, vals, labels) => `<div class="chips mt-8">${vals.map((v, i) => `<label class="chip ${i === 0 ? 'on' : ''}"><input type="radio" name="${name}" value="${esc(v)}" ${i === 0 ? 'checked' : ''} style="display:none">${labels ? labels[i] : v}</label>`).join('')}</div>`;
  openSheet({ title: 'Book a visit', sub: `${esc(c.name)}${d ? ' · ' + d.id : ''}`,
    body: `<div class="label">Where</div>${radio('vWhere', ['Lajpat Nagar showroom', 'Video consult'])}
      <div class="label mt-16">Day</div>${radio('vDay', days.map(x => x.toISOString()), days.map(x => `${DN[x.getDay()]} ${fdate(x)}`))}
      <div class="label mt-16">Time</div>${radio('vTime', ['11:00', '12:30', '15:00', '17:30'])}
      <label class="field mt-16"><span>With</span><select class="select" id="vWho">${USERS.filter(u => u.active && ['founders', 'sales'].includes(u.role)).map(u => `<option ${d && u.id === d.owner ? 'selected' : ''}>${u.name}</option>`).join('')}</select></label>
      <label class="field mt-12"><span>Have ready</span><input class="input" id="vNote" value="${esc(d ? (d.product_interest === 'Engagement ring' ? '1.5 ct ovals and rounds, rose and white gold samples' : 'Samples for ' + (d.product_interest || 'the piece').toLowerCase()) : '')}"></label>
      <div class="small muted mt-12">${icon('chat', 'sm')} ${esc(sx_first(c.name))} gets a WhatsApp confirmation; the visit lands on the deal timeline and becomes its next action.</div>`,
    foot: `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="inbVisitSave" data-t="${t.id}">Book and confirm</button>`,
    onMount(sh) { sh.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => sh.querySelectorAll(`input[name=${r.name}]`).forEach(x => x.closest('.chip').classList.toggle('on', x.checked)))); } });
};
ACTIONS.inbVisitSave = el => {
  const t = inbThread(el.dataset.t), d = inbDeal(t), v = n => (document.querySelector(`input[name=${n}]:checked`) || {}).value;
  const where = v('vWhere'), when = new Date(v('vDay')), [h, mi] = v('vTime').split(':'); when.setHours(+h, +mi, 0, 0);
  const who = document.getElementById('vWho').value, note = document.getElementById('vNote').value.trim(), DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const line = `${DN[when.getDay()]} ${fdate(when)} at ${v('vTime')}`;
  inbPush(t, { from: 'out', t: where === 'Video consult' ? `Booked: a video consult on ${line}. ${sx_first(who)} will call you on WhatsApp video.` : `Booked: ${line} at our Lajpat Nagar showroom (C-57 Central Market). ${sx_first(who)} will have everything ready for you.` }, d,
    { type: 'meeting', dir: 'out', subject: `${where === 'Video consult' ? 'Video consult' : 'Showroom visit'} booked: ${line}`, body: `With ${who}.${note ? ' Have ready: ' + note : ''}` });
  if (d) { d.next_action_at = when; d.next_action = (where === 'Video consult' ? 'Video consult with ' : 'Showroom visit: ') + sx_first(dealContact(d).name); if (d.stage === 'Contacted') { d.checks.Contacted = d.checks.Contacted || {}; d.checks.Contacted.consult_offered = { by: viewUser().id, at: sx_now() }; } }
  closeLayer(); render(); toast(`Booked for ${line} · confirmation sent${d ? ' · next action set on ' + d.id : ''}`, 'calendar');
};

/* ---------- campaigns ---------- */
const cmpUpcoming = (iso, days) => { if (!iso) return false; const x = new Date(iso); const nx = new Date(TODAY.getFullYear(), x.getMonth(), x.getDate()); if (nx < dayStart(TODAY)) nx.setFullYear(nx.getFullYear() + 1); return (nx - dayStart(TODAY)) / 864e5 <= days; };
const CMP_AUD = [
  ['Bridal and wedding enquiries', c => DEALS.some(d => d.contact === c.id && (d.occasion === 'Wedding' || d.product_interest === 'Bridal set'))],
  ['Clients with an order over ₹1 lakh', c => contactStats(c).max_order >= 100000],
  ['Anniversary or birthday in the next 30 days', c => cmpUpcoming(c.anniversary, 30) || cmpUpcoming(c.birthday, 30)],
  ['Everyone in the contact book', () => true]
];
const cmpAudience = i => { const all = CONTACTS.filter(CMP_AUD[i][1]); return { all, ok: all.filter(c => c.consent_marketing), out: all.filter(c => !c.consent_marketing) }; };
SCREENS.campaigns = {
  title: 'Campaigns', nav: 'campaigns',
  render() {
    return `${pageHead('Campaigns', 'Broadcasts and automations on WhatsApp · only clients who opted in', `<button class="btn primary" data-act="newCampaign">${icon('plus')}New campaign</button>`)}
      <div class="grid g4 kpis">${[['Messages this month', '3,412', 'of 5,000 in plan'], ['Read rate', '81%', 'WhatsApp average is about 70%'], ['Replies', '263', '<span class="up">+22%</span>'], ['Orders from campaigns', '31 · ' + inrShort(2776000), 'October']].map(([k, v, d]) => `<div class="card kpi"><div class="k">${k}</div><div class="v num" style="font-size:22px">${v}</div><div class="d">${d}</div></div>`).join('')}</div>
      <div class="stack mt-16">${CAMPAIGNS.map(c => `<div class="card" data-act="cmpOpen" data-id="${c.id}" style="cursor:pointer"><div class="card-b row wrap gap-16">
        <span class="badge ${c.type === 'Automation' ? 'violet' : 'gold'} sx-tile" style="width:40px;height:40px">${icon(c.type === 'Automation' ? 'zap' : 'megaphone')}</span>
        <div class="grow" style="min-width:200px"><div class="strong">${esc(c.name)}</div><div class="small muted">${c.type} · ${esc(c.audience)} · ${esc(c.date)}</div></div>
        ${c.sent ? `<div class="row wrap gap-24 small">${[['Sent', NF.format(c.sent)], ['Read', Math.round(c.read / c.sent * 100) + '%'], ['Replies', c.replies], ['Orders', c.orders], ['Revenue', inrShort(c.revenue)]].map(([a, b]) => `<div><div class="xs muted">${a}</div><div class="strong num">${b}</div></div>`).join('')}</div>` : c.recipients ? `<div class="small"><div class="xs muted">Recipients</div><div class="strong num">${c.recipients}</div></div>` : ''}
        ${badge(c.status, c.status === 'Running' ? 'green' : c.status === 'Scheduled' ? 'blue' : c.status === 'Paused' ? 'amber' : c.status === 'Draft' ? 'out' : '')}</div></div>`).join('')}</div>`;
  }
};
ACTIONS.cmpOpen = el => {
  const c = CAMPAIGNS.find(x => x.id === el.dataset.id), tp = c.tpl && TEMPLATES.find(x => x.key === c.tpl);
  const acts = c.status === 'Running' ? `<button class="btn" data-act="cmpState" data-id="${c.id}" data-s="Paused">${icon('lock')}Pause</button>`
    : c.status === 'Paused' ? `<button class="btn" data-act="cmpState" data-id="${c.id}" data-s="Running">${icon('play')}Resume</button>`
    : c.status === 'Scheduled' || c.status === 'Draft' ? `<button class="btn" data-act="cmpState" data-id="${c.id}" data-s="Draft">${icon('undo')}${c.status === 'Draft' ? 'Keep as draft' : 'Unschedule'}</button><button class="btn primary" data-act="cmpState" data-id="${c.id}" data-s="Sending">${icon('send')}Send now</button>` : '';
  openSheet({ title: esc(c.name), sub: `${c.type} · ${esc(c.audience)}`,
    body: `${c.sent ? `<div class="grid g3" style="gap:8px">${[['Sent', NF.format(c.sent)], ['Read', Math.round(c.read / c.sent * 100) + '%'], ['Replied', Math.round(c.replies / c.sent * 100) + '%'], ['Orders', c.orders], ['Revenue', inrShort(c.revenue)], ['Per order', c.orders ? inrShort(c.revenue / c.orders) : '—']].map(([a, b]) => `<div class="pill-rate"><span class="xs muted">${a}</span><span class="v num">${b}</span></div>`).join('')}</div>`
      : `<div class="banner blue">${icon('calendar')}<div>${c.status === 'Draft' ? 'Draft, not scheduled.' : 'Goes out ' + esc(c.date) + '.'} ${c.recipients ? c.recipients + ' recipients who opted in.' : ''}</div></div>`}
      <div class="label mt-16">Message</div><div class="card mt-8"><div class="card-b small ink2" style="white-space:pre-line">${esc(c.msg || (tp ? tp.body : 'Namaste {name}, our wedding edit is here: solitaires, bands and bridal sets in lab-grown diamonds, made to order. Book a private viewing at Lajpat Nagar this weekend.'))}</div></div>
      ${tp ? `<div class="xs muted mt-8">Template ${tp.key} · ${esc(tp.name)} · ${tp.cat}</div>` : ''}
      <div class="small muted mt-16">${icon('shield', 'sm')} Clients without marketing consent are never sent campaigns; service messages (quotes, order updates) are not affected.</div>`,
    foot: `<button class="btn" data-act="cmpDup" data-id="${c.id}">${icon('copy')}Duplicate</button>${acts}` });
};
ACTIONS.cmpState = el => { const c = CAMPAIGNS.find(x => x.id === el.dataset.id), s = el.dataset.s; c.status = s === 'Sending' ? 'Completed' : s; if (s === 'Sending') { c.sent = c.recipients || 84; c.read = 0; c.replies = 0; c.orders = 0; c.revenue = 0; c.date = 'Sent ' + fdate(TODAY); } closeLayer(); render(); toast({ Paused: `${c.name} paused`, Running: `${c.name} running again`, Draft: `${c.name} moved to drafts`, Sending: `${c.name} sent to ${c.sent} clients` }[s], 'megaphone'); };
ACTIONS.cmpDup = el => { const c = CAMPAIGNS.find(x => x.id === el.dataset.id); const n = Object.assign({}, c, { id: 'cp' + (CAMPAIGNS.length + 1), name: c.name + ' (copy)', status: 'Draft', sent: 0, read: 0, replies: 0, orders: 0, revenue: 0, date: 'Not scheduled' }); CAMPAIGNS.unshift(n); closeLayer(); render(); toast(`${n.name} saved as a draft`, 'copy'); };
ACTIONS.newCampaign = () => openSheet({ title: 'New campaign', sub: 'WhatsApp broadcast · opted-in clients only', wide: true,
  body: `<div class="grid g2"><div class="stack">
      <label class="field"><span>Name</span><input class="input" id="cmpName" value="Wedding season lookbook"></label>
      <div class="field"><span>Audience, from your contacts</span><div class="stack-s">${CMP_AUD.map(([a], i) => { const x = cmpAudience(i); return `<label class="pick ${i === 0 ? 'on' : ''}" style="padding:10px 12px"><input type="radio" name="aud" value="${i}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--gold)"><span class="grow" style="min-width:0">${a}<span class="xs muted" style="display:block">${x.ok.slice(0, 3).map(c => esc(c.name)).join(', ')}${x.ok.length > 3 ? ' +' + (x.ok.length - 3) : ''}${x.out.length ? ` · ${x.out.length} without consent left out` : ''}</span></span><span class="small muted num">${x.ok.length}</span></label>`; }).join('')}</div></div>
      <label class="field"><span>Start from a template</span><select class="select" id="cmpTpl"><option value="">Write my own</option>${TEMPLATES.filter(x => x.cat === 'marketing').map(x => `<option value="${x.key}">${x.key} · ${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Message</span><textarea class="textarea" id="cmpMsg" style="min-height:130px">Namaste {name}, our wedding edit is here: solitaires, bands and bridal sets in lab-grown diamonds, made to order in 14 days. Book a private viewing at Lajpat Nagar this weekend.</textarea></label>
      <button class="btn" data-act="cmpAi">${icon('sparkles')}Rewrite with AI · Hinglish</button>
      <div class="fgrid"><label class="field"><span>Send on</span><input class="input" id="cmpDate" type="date" value="2026-11-10"></label><label class="field"><span>Time</span><input class="input" id="cmpTime" type="time" value="11:00"></label></div>
    </div><div><div class="label" style="margin-bottom:8px">Preview</div><div style="background:#ECE5DA;border-radius:14px;padding:16px"><div class="bub in" style="max-width:100%"><img src="${img(IMG.necklaces[2].src, 400)}" alt=""><span id="cmpPrev"></span><div class="bt">11:00</div></div></div>
      <div class="card soft mt-16"><div class="card-b small"><dl class="kv"><dt>Recipients</dt><dd class="num" id="cmpN">0</dd><dt>Meta charge</dt><dd class="num" id="cmpCost">₹0</dd><dt>From plan allowance</dt><dd>Included</dd></dl></div></div></div></div>`,
  foot: '<button class="btn" data-act="cmpSave" data-s="Draft">Save draft</button><button class="btn primary" data-act="cmpSave" data-s="Scheduled">Schedule</button>',
  onMount(sh) {
    const msg = sh.querySelector('#cmpMsg');
    const f = () => { const i = +(sh.querySelector('input[name=aud]:checked') || { value: 0 }).value, x = cmpAudience(i); sh.querySelector('#cmpPrev').textContent = sx_fill(msg.value, null, { name: sx_first((x.ok[0] || { name: 'Tara' }).name) }); sh.querySelector('#cmpN').textContent = x.ok.length; sh.querySelector('#cmpCost').textContent = inr(x.ok.length * 0.86); sh.querySelectorAll('.pick').forEach(p => p.classList.toggle('on', p.contains(sh.querySelector('input[name=aud]:checked')))); };
    f(); msg.addEventListener('input', f); sh.querySelectorAll('input[name=aud]').forEach(r => r.addEventListener('change', f));
    sh.querySelector('#cmpTpl').addEventListener('change', e => { const tp = TEMPLATES.find(x => x.key === e.target.value); if (tp) { msg.value = tp.body; f(); } });
  }
});
ACTIONS.cmpAi = () => { const m = document.getElementById('cmpMsg'); m.value = 'Namaste {name} ji! Shaadi ka season aa gaya hai ✨ Our new wedding edit has solitaires, bands and bridal sets in lab-grown diamonds, made to order in 14 days. Is weekend Lajpat Nagar aakar private viewing book karein?'; m.dispatchEvent(new Event('input')); toast('Rewritten in Hinglish', 'sparkles'); };
ACTIONS.cmpSave = el => {
  const s = el.dataset.s, i = +(document.querySelector('input[name=aud]:checked') || { value: 0 }).value, x = cmpAudience(i);
  const dt = document.getElementById('cmpDate').value, tm = document.getElementById('cmpTime').value, d = dt ? new Date(dt + 'T00:00') : TODAY;
  const c = { id: 'cp' + (CAMPAIGNS.length + 1), name: document.getElementById('cmpName').value.trim() || 'Untitled campaign', type: 'Broadcast', audience: CMP_AUD[i][0], recipients: x.ok.length, sent: 0, read: 0, replies: 0, orders: 0, revenue: 0, status: s, date: s === 'Draft' ? 'Not scheduled' : `${fdate(d)}, ${tm}`, msg: document.getElementById('cmpMsg').value };
  CAMPAIGNS.unshift(c); closeLayer(); render(); toast(s === 'Draft' ? `${c.name} saved as a draft` : `Scheduled for ${c.date} · ${c.recipients} recipients`, 'megaphone');
};
ACTIONS.cmpSchedule = () => ACTIONS.cmpSave({ dataset: { s: 'Scheduled' } });

/* ---------- Shopify app ---------- */
let STORE_TAB = 'popup';
const POP = { label: 'Design your piece', accent: '#1A1A1A', fields: { metal: true, size: true, budget: true, photo: true, date: false }, open: true, metal: 0, published: null };
const STORE_SYNC = { last: '11:00', runs: [['refresh', 'Prices updated at 24K ₹' + NF.format(SETTINGS.gold_rate_24k), 'Today 11:00', null]] };
/* Estimate a request from the rate sheet: the same maths as the quote (computeLive) */
function stoEstimate(w) {
  const q = { purity: w.purity, gold_rate_24k: baseRateFor(w.purity), gold_wt: w.wt, making_rate: sheetMaking(w.purity, w.item_type), extra_stones: w.extra || 0, discount_pct: 0, gst_pct: SETTINGS.default_gst, usd_rate: SETTINGS.default_usd, usd_spread: SETTINGS.default_usd_spread,
    lines: w.lines.map(([shape, pcs, ct, quality]) => ({ shape, pcs, ct, quality, rate: sheetRate(shape, quality, pcs, ct) || 0 })) };
  return computeLive(q);
}
const stoWho = w => w.cust ? contactById(w.cust).name : w.name;
const stoTone = s => ({ New: 'gold', Converted: 'green', Replied: 'violet', Test: 'out', 'Sent to Leads': 'blue' }[s] || '');
const stoMetal = w => `${w.purity}${w.colour ? ' ' + w.colour : ''}`;
function stoAct(w, sm) {
  const d = w.deal && dealById(w.deal);
  if (d) return isOrder(d) || !isOpen(d) ? `<button class="btn ${sm ? 'sm' : ''}" data-go="#/deal/${d.id}">Open deal</button>` : `<button class="btn ${sm ? 'sm' : ''} primary" data-go="#/deal/${d.id}/quote">Quote</button>`;
  if (w.status === 'Test') return `<button class="btn ${sm ? 'sm' : ''}" data-act="stoDrop" data-id="${w.id}">Delete test</button>`;
  return `<button class="btn ${sm ? 'sm' : ''} primary" data-act="stoLead" data-id="${w.id}">Create enquiry</button>`;
}
SCREENS.store = {
  title: 'Online store', nav: 'store',
  render() {
    const tabs = { popup: 'Custom-order popup', requests: 'Requests', sync: 'Price and stock sync' };
    const nNew = ONLINE_REQS.filter(w => w.status === 'New').length;
    let body = '';
    if (STORE_TAB === 'popup') body = `<div class="grid g-side"><div class="stack">
        ${card('Button', `<div class="fgrid"><label class="field full"><span>Button text</span><input class="input" data-pop="label" value="${esc(POP.label)}"></label>
          <div class="field full"><span>Colour</span><div class="row">${['#1A1A1A', '#B08D57', '#3A6597', '#2E7A57', '#8C3B4A'].map(c => `<button class="av" data-act="popColor" data-c="${c}" aria-label="Colour ${c}" style="background:${c};border:${POP.accent === c ? '3px solid #fff;box-shadow:0 0 0 2px ' + c : '0'}"></button>`).join('')}</div></div></div>`)}
        ${card('What the shopper fills in', `<div class="stack-s">${[['metal', 'Metal and purity'], ['size', 'Ring size, with international sizes'], ['budget', 'Budget'], ['photo', 'Reference photo'], ['date', 'Date needed']].map(([k, t]) => `<label class="row between"><span>${t}</span><span class="switch"><input type="checkbox" data-popf="${k}" ${POP.fields[k] ? 'checked' : ''}><span></span></span></label>`).join('')}
          <div class="small muted">Name and WhatsApp number are always asked. A request becomes a lead (source Website · WEB) with an estimate from your rate sheet.</div></div>`)}
        ${card('Show it on', `<div class="chips">${['All products', 'Rings', 'Pendants', 'Earrings', 'Bridal'].map((c, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-act="sxChip">${c}</button>`).join('')}</div>
          <div class="row between mt-16"><span class="small muted">${POP.published ? 'Live on marqa.in since ' + POP.published : 'Changes are saved here until you publish'}</span><button class="btn primary sm" data-act="stoPublish">${icon('upload', 'sm')}Publish to marqa.in</button></div>`)}
      </div><div><div style="position:sticky;top:76px"><div class="label" style="text-align:center;margin-bottom:10px">Live preview · ${TENANT.site} · tap it</div><div class="phone"><div class="scr store-mock sx-pv" id="popPrev"></div></div></div></div></div>`;
    if (STORE_TAB === 'requests') body = `<div class="card"><div class="list">${ONLINE_REQS.map(w => { const e = stoEstimate(w); return `<div class="li" data-act="stoReq" data-id="${w.id}"><img class="thumb lg" src="${img(w.img, 200)}" alt=""><div class="grow" style="min-width:0"><div class="t">${esc(w.what)}</div><div class="s">${w.id} · ${esc(stoWho(w))} · ${stoMetal(w)} · budget ${inr(w.budget)} · ${w.when}</div>
        <div class="small mt-8">${icon('sparkles', 'sm')} Estimate from your rate sheet <b class="num">${inr(e.total)}</b> <span class="xs ${e.total > w.budget * 1.1 ? '' : 'muted'}" style="${e.total > w.budget * 1.1 ? 'color:var(--amber)' : ''}">${e.total > w.budget * 1.1 ? 'over budget' : 'within budget'}</span>${w.deal ? ` · ${stagePill(dealById(w.deal).stage)}` : ''}</div></div><div class="tr stack-s">${badge(w.status, stoTone(w.status))}${stoAct(w, true)}</div></div>`; }).join('')}</div></div>`;
    if (STORE_TAB === 'sync') {
      const jw = STOCK_ITEMS.filter(x => x.kind === 'jewellery'), listed = jw.filter(x => stockBal(x).status === 'in_stock'), gone = jw.filter(x => ['sold', 'memo'].includes(stockBal(x).status));
      const recent = [...STORE_SYNC.runs, ...STOCK_MOVES.filter(m => m.kind === 'sale' || (m.kind === 'memo_out' && jw.some(x => x.id === m.item))).slice(-3).reverse().map(m => { const it = STOCK_ITEMS.find(x => x.id === m.item); return ['tag', `${it.code} ${m.kind === 'sale' ? 'sold' : 'out on memo'}, hidden on ${TENANT.site}`, fdate(m.at), '#/stock/' + it.id]; }), ['store', 'Request W-309 became deal D-20261009-003', '10 Oct', '#/deal/D-20261009-003']];
      body = `<div class="grid g2">${card('Gold-rate pricing', `<div class="row"><span class="badge green" style="height:30px">${icon('check', 'sm')} Synced</span><span class="small muted">Today ${STORE_SYNC.last} IST</span></div>
        <dl class="kv mt-16"><dt>Products</dt><dd class="num">391</dd><dt>Variants repriced</dt><dd class="num">32,268</dd><dt>24K rate used</dt><dd class="num">${inr(SETTINGS.gold_rate_24k)}</dd><dt>18K / 14K per gram</dt><dd class="num">${inr(SETTINGS.gold_rate_24k * GOLD['18K'][0])} / ${inr(SETTINGS.gold_rate_24k * GOLD['14K'][0])}</dd><dt>Safety stop</dt><dd>Pauses if a rate moves over 8% in a day</dd></dl>
        <button class="btn block mt-16" data-act="stoSync" id="stoSyncBtn">${icon('refresh')}Run now</button>`)}
        ${card('Stock sync', `<dl class="kv"><dt>Finished pieces listed</dt><dd class="num">${listed.length}</dd><dt>Sold or on memo, hidden online</dt><dd class="num">${gone.length}</dd><dt>Made-to-order items</dt><dd>Always available</dd></dl>
        <div class="hr"></div><div class="label">Recent</div><div class="tl mt-8">${recent.map(([ic, t, tm, go]) => `<div class="tli" ${go ? `data-go="${go}" style="cursor:pointer"` : ''}><span class="ic">${icon(ic)}</span><div><div class="tt">${esc(t)}</div><div class="tm">${tm}</div></div></div>`).join('')}</div>`)}</div>`;
    }
    return `${pageHead('Online store', `MARQA Pipeline app for Shopify · installed on ${TENANT.site}`, '<span class="badge green">' + icon('check', 'sm') + ' Connected</span>')}
      <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="tab ${STORE_TAB === k ? 'on' : ''}" data-act="storeTab" data-t="${k}">${v}${k === 'requests' && nNew ? ` <span class="badge gold">${nNew}</span>` : ''}</button>`).join('')}</div>${body}`;
  },
  mount(root) {
    if (STORE_TAB !== 'popup') return;
    const paint = () => {
      const f = POP.fields, metals = ['18K Rose', '18K Yellow', 'Platinum'];
      root.querySelector('#popPrev').innerHTML = `<div class="sb"></div><div class="shdr">${BRAND.wordmark('')}</div>
        <img src="${img(IMG.rings[3].src, 500)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover">
        <div style="padding:12px 14px"><div style="font-size:13px;font-weight:600">Diamond Ring RR-049</div><div style="font-size:12px;color:#777;margin-top:2px">From ₹48,600</div>
        <button data-act="stoPvOpen" style="margin-top:10px;width:100%;height:36px;border:0;background:${POP.accent};color:#fff;font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase">${esc(POP.label)}</button></div>
        ${POP.open ? `<div class="popup"><div class="row between"><b style="font-size:14px">${esc(POP.label)}</b><button class="icon-btn" data-act="stoPvOpen" aria-label="Close preview popup" style="width:28px;height:28px">${icon('x', 'sm')}</button></div>
          <div class="stack-s mt-12" style="font-size:12px">
            ${f.metal ? `<div><div class="xs muted">Metal</div><div class="chips mt-8">${metals.map((m, i) => `<span class="chip ${i === POP.metal ? 'on' : ''}" data-act="stoPvMetal" data-i="${i}" style="height:26px;font-size:11px">${m}</span>`).join('')}</div></div>` : ''}
            ${f.size ? '<div class="row" style="gap:6px"><div class="input" style="height:32px;font-size:12px;display:flex;align-items:center">Size US 6.5</div><div class="input" style="height:32px;font-size:12px;display:flex;align-items:center;color:#888">= Ring 11</div></div>' : ''}
            ${f.budget ? '<div class="input" style="height:32px;font-size:12px;display:flex;align-items:center">Budget ₹60,000–80,000</div>' : ''}
            ${f.photo ? `<div class="drop" style="padding:10px;font-size:11px;cursor:default">${icon('camera', 'sm')} Add a reference photo</div>` : ''}
            ${f.date ? '<div class="input" style="height:32px;font-size:12px;display:flex;align-items:center">Needed by 14 Feb</div>' : ''}
            <div class="input" style="height:32px;font-size:12px;display:flex;align-items:center">WhatsApp +91</div>
            <button data-act="stoPvSend" style="height:36px;border:0;border-radius:8px;background:${POP.accent};color:#fff;font-weight:600">Send request</button></div></div>` : ''}`;
    };
    SCREENS.store.paint = paint;
    paint();
    root.addEventListener('input', ev => { if (ev.target.dataset.pop) { POP.label = ev.target.value; paint(); } if (ev.target.dataset.popf) { POP.fields[ev.target.dataset.popf] = ev.target.checked; paint(); } });
    root.addEventListener('change', ev => { if (ev.target.dataset.popf) { POP.fields[ev.target.dataset.popf] = ev.target.checked; paint(); } });
  }
};
ACTIONS.storeTab = el => { STORE_TAB = el.dataset.t; render(); };
ACTIONS.popColor = el => { const same = POP.accent === el.dataset.c; POP.accent = el.dataset.c; render(); if (same) toast('That colour is already on the button', 'check'); };
ACTIONS.stoPvOpen = () => { POP.open = !POP.open; SCREENS.store.paint(); };
ACTIONS.stoPvMetal = el => { if (POP.metal === +el.dataset.i) return toast(el.textContent + ' is already picked in the preview', 'check'); POP.metal = +el.dataset.i; SCREENS.store.paint(); };
ACTIONS.stoPvSend = () => {
  const n = 'W-' + (311 + ONLINE_REQS.filter(w => w.status === 'Test').length + 1);
  ONLINE_REQS.unshift({ id: n, name: 'Test from the preview', city: 'Delhi', what: 'Test request from the popup preview', item_type: 'Ring', purity: ['18K', '18K', 'PT950'][POP.metal], colour: ['Rose', 'Yellow', ''][POP.metal], wt: 3.2, lines: [['Round', 1, 0.70, 'VS-FG']], extra: 0, size: 'US 6.5', budget: 70000, needed: '', note: 'Sent from the preview on this screen.', when: 'Just now', status: 'Test', img: IMG.rings[3].src });
  render(); toast(`Test request ${n} arrived in Requests`, 'store');
};
ACTIONS.stoPublish = () => { POP.published = 'today ' + sx_hm(sx_now()); render(); toast(`"${POP.label}" popup published to ${TENANT.site}`, 'upload'); };
ACTIONS.stoDrop = el => { const i = ONLINE_REQS.findIndex(w => w.id === el.dataset.id); const [w] = ONLINE_REQS.splice(i, 1); closeLayer(); render(); toast(`${w.id} deleted`, 'x'); };
ACTIONS.stoLead = el => {
  const w = ONLINE_REQS.find(x => x.id === el.dataset.id);
  w.status = 'Sent to Leads';
  const note = `${w.name}, ${w.phone || ''}, ${w.city || ''}: ${w.what}, ${stoMetal(w)}, budget ${inr(w.budget)} (Shopify ${w.id})`;
  try { navigator.clipboard && navigator.clipboard.writeText(note).catch(() => {}); } catch (_) {}
  window.CON_LEAD_PREFILL = { name: w.name, phone: w.phone || '', city: opts('cities').includes(w.city) ? w.city : 'Other', source_channel: 'Website', source_code: 'WEB', product_interest: opts('product_interests').find(x => w.what.toLowerCase().includes(x.toLowerCase().split(' ')[0])) || 'Bespoke', budget: w.budget ? String(w.budget) : '', notes: note };
  closeLayer(); go('#/leads');
};
ACTIONS.stoReq = el => {
  const w = ONLINE_REQS.find(x => x.id === el.dataset.id), e = stoEstimate(w), d = w.deal && dealById(w.deal), c = w.cust && contactById(w.cust), t = c && sx_contactThread(c.id);
  openSheet({ title: `${w.id} · ${esc(w.what)}`, sub: `${esc(stoWho(w))} · ${w.when} · from ${TENANT.site}`,
    body: `<div class="row top gap-16 wrap"><img class="thumb lg" src="${img(w.img, 300)}" alt="" style="width:120px;height:120px"><div class="grow" style="min-width:180px"><dl class="kv"><dt>Status</dt><dd>${badge(w.status, stoTone(w.status))}</dd><dt>Metal</dt><dd>${stoMetal(w)}</dd><dt>Size</dt><dd>${esc(w.size)}</dd><dt>Budget</dt><dd class="num">${inr(w.budget)}</dd><dt>Needed</dt><dd>${esc(w.needed || '—')}</dd><dt>WhatsApp</dt><dd class="num">${esc(maskPhone(c ? c.phone : w.phone))}</dd></dl></div></div>
      <div class="card soft mt-16"><div class="card-b small">${esc(w.note)}</div></div>
      <div class="label mt-16">Estimate from the rate sheet</div>
      <div class="card mt-8"><div class="card-b"><dl class="kv"><dt>Metal ${w.wt} g ${w.purity} at ${inr(e.gold_rate_applied)}/g</dt><dd class="num">${inr(e.gold_value)}</dd>
        ${e.lines.map(l => `<dt>${l.pcs} ${l.shape} ${(+l.ct).toFixed(2)} ct ${l.quality} at ${inr(l.rate)}/ct</dt><dd class="num">${inr(l.value)}</dd>`).join('')}
        ${w.extra ? `<dt>Coloured stones</dt><dd class="num">${inr(w.extra)}</dd>` : ''}<dt>Making ${w.wt} g at ${inr(sheetMaking(w.purity, w.item_type))}/g</dt><dd class="num">${inr(e.labour)}</dd><dt>GST ${SETTINGS.default_gst}%</dt><dd class="num">${inr(e.gst_amt)}</dd><dt class="tot">Estimate</dt><dd class="tot num">${inr(e.total)}</dd></dl>
        <div class="xs muted mt-8">${e.total > w.budget * 1.1 ? `${inr(e.total - w.budget)} over the budget: suggest a smaller centre stone or a lower karat.` : 'Within the client\'s budget.'} Rates as of ${SETTINGS.gold_rate_date}.</div></div></div>
      ${d ? `<div class="label mt-16">Deal</div><div class="sx-deal mt-8" data-go="#/deal/${d.id}"><div class="row" style="gap:6px">${stagePill(d.stage)}<span class="xs muted">${d.id}</span></div><div class="strong small mt-8">${esc(dealTitle(d))}</div>${d.next_action ? `<div class="xs muted mt-8">${icon('clock', 'sm')} ${esc(d.next_action)} · ${rel(d.next_action_at)}</div>` : ''}</div>` : ''}`,
    foot: `${t ? `<button class="btn wa" data-go="#/inbox/${t.id}">${icon('wa')}Chat</button>` : w.status === 'New' ? `<button class="btn" data-act="stoReplied" data-id="${w.id}">${icon('check')}Mark replied</button>` : ''}${stoAct(w)}` });
};
ACTIONS.stoReplied = el => { const w = ONLINE_REQS.find(x => x.id === el.dataset.id); w.status = 'Replied'; closeLayer(); render(); toast(`${w.id} marked replied`); };
ACTIONS.stoSync = el => {
  el.disabled = true; el.innerHTML = icon('refresh') + 'Repricing 32,268 variants…';
  setTimeout(() => { STORE_SYNC.last = sx_hm(sx_now()); STORE_SYNC.runs.unshift(['refresh', `Prices updated at 24K ${inr(SETTINGS.gold_rate_24k)}`, 'Today ' + STORE_SYNC.last, null]); if (location.hash.startsWith('#/store')) render(); toast(`391 products repriced at 24K ${inr(SETTINGS.gold_rate_24k)}/g`, 'refresh'); }, 900);
};

/* ---------- AI studio ---------- */
let STUDIO_TAB = 'photo';
const STU = { item: 's14', tone: 'Quiet luxury', credits: 760, picked: null, gen: false, published: null };
const stuItems = () => STOCK_ITEMS.filter(x => x.kind === 'jewellery');
const stuItem = () => STOCK_ITEMS.find(x => x.id === STU.item) || stuItems()[0];
const STU_REF = { thread: 't1', purity: '18K', lines: [['Oval', 1, 1.5, 'VVS-EF'], ['Round', 22, 0.28, 'VS-FG']], wt: [3.2, 3.6] };
SCREENS.studio = {
  title: 'AI Studio', nav: 'studio',
  render() {
    const tabs = { photo: 'Photo studio', listing: 'Listing writer', estimate: 'Estimate from a photo' }, it = stuItem();
    const itemPick = `<label class="field"><span>Product</span><select class="select" id="stuItem">${stuItems().map(x => `<option value="${x.id}" ${x.id === it.id ? 'selected' : ''}>${esc(x.title)} · ${x.code}</option>`).join('')}</select></label>`;
    let body = '';
    if (STUDIO_TAB === 'photo') body = `<div class="grid g2">
      ${card('Before and after', `<div class="compare" id="cmp"><img src="${img(it.img, 700)}" alt="" style="filter:saturate(.75) brightness(.92) contrast(.9);transform:scale(1.18) rotate(-4deg)"><img class="after" src="${img(it.img, 700)}" alt="">
        <span class="tag" style="left:10px">Phone photo</span><span class="tag" style="right:10px">AI studio</span><div class="handle"></div><input type="range" min="0" max="100" value="50" aria-label="Compare"></div>
        <div class="small muted mt-12">Drag to compare. Background cleaned, reflections balanced, metal colour kept true to ${it.purity} ${it.gold_colour.toLowerCase()}.</div>`)}
      <div class="stack">${card('Style', `${itemPick}<div class="chips mt-16">${['Clean white', 'Velvet tray', 'On hand', 'Festive', 'Marble'].map((s, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-act="sxChip">${s}</button>`).join('')}</div>
        <div class="fgrid mt-16"><label class="field"><span>Size</span><select class="select"><option>Square for Shopify</option><option>4:5 for Instagram</option><option>9:16 for reels</option></select></label><label class="field"><span>Images</span><select class="select"><option>4</option><option>8</option></select></label></div>
        <button class="btn gold block mt-16" data-act="genPhotos">${icon('sparkles')}Generate · 4 credits</button>`)}
        ${card('Results', `<div class="grid g4" id="genOut" style="gap:8px">${STU.gen ? stuResults(it) : [0, 1, 2, 3].map(() => '<div class="thumb xl" style="background:#F1EDE6"></div>').join('')}</div>
          ${STU.gen ? `<div class="row between mt-12"><span class="small muted">${STU.picked != null ? 'Image ' + (STU.picked + 1) + ' selected' : 'Tap an image to pick it'}</span><button class="btn sm primary" data-act="stuUse">${icon('store', 'sm')}Use on ${it.code}</button></div>` : ''}`)}
        <div class="row small muted">${icon('zap', 'sm')} ${STU.credits} of 2,000 credits left this month</div></div></div>`;
    if (STUDIO_TAB === 'listing') body = `<div class="grid g2">
      ${card('Product', `${itemPick}<div class="row mt-16"><img class="thumb lg" src="${img(it.img, 200)}" alt=""><div style="min-width:0"><div class="strong">${esc(it.title)}</div><div class="small muted">${it.purity} ${it.gold_colour.toLowerCase()} · ${it.net_wt} g · ${esc(it.stone_summary)} · lab-grown · HUID ${it.huid}</div></div></div>
        <div class="field mt-16"><span>Tone</span><div class="seg">${['Quiet luxury', 'Bridal', 'Everyday'].map(x => `<button class="${STU.tone === x ? 'on' : ''}" data-act="stuTone" data-t="${x}">${x}</button>`).join('')}</div></div>
        <div class="field mt-16"><span>Languages</span><div class="chips"><button class="chip on" data-act="sxChip">English</button><button class="chip on" data-act="sxChip">हिन्दी</button></div></div>
        <button class="btn gold block mt-16" data-act="genListing">${icon('sparkles')}Write listing · 1 credit</button>`)}
      ${card('Listing', `<div class="stack-s"><label class="field"><span>Title</span><input class="input" id="lsTitle" placeholder="Write the listing first"></label><label class="field"><span>Description</span><textarea class="textarea" id="lsDesc" style="min-height:120px"></textarea></label>
        <label class="field"><span>हिन्दी विवरण</span><textarea class="textarea" id="lsHi" style="min-height:70px"></textarea></label><label class="field"><span>SEO description</span><input class="input" id="lsSeo"></label>
        ${STU.published ? `<div class="banner blue">${icon('check')}<div>Draft product created on ${TENANT.site}: <b>${esc(STU.published)}</b></div></div>` : ''}
        <button class="btn primary" data-act="stuPublish">${icon('store')}Publish to Shopify as a draft</button></div>`, { right: badge('Price at today\'s rate', 'out') })}</div>`;
    if (STUDIO_TAB === 'estimate') {
      const t = inbThread(STU_REF.thread), ref = t.msgs.find(m => m.img), d = inbDeal(t), c = cust(t.cust);
      const est = w => stoEstimate({ purity: STU_REF.purity, wt: w, item_type: 'Engagement ring', lines: STU_REF.lines, extra: 0 });
      const lo = est(STU_REF.wt[0]), hi = est(STU_REF.wt[1]);
      const similar = DEALS.filter(x => x.quote_no && x.id !== d.id && /oval|halo|solitaire/i.test(x.item) && ['Ring', 'Engagement ring'].includes(x.item_type)).slice(0, 3);
      body = `<div class="grid g2">
      ${card('Client\'s reference', `<img src="${img(ref.img, 600)}" alt="" style="border-radius:12px;width:100%;aspect-ratio:1;object-fit:cover"><div class="small muted mt-12">From ${esc(c.name)} on WhatsApp, ${ref.at} today · <a class="link" href="#/inbox/${t.id}">open chat</a></div>`)}
      ${card('Estimate', `<div class="banner">${icon('sparkles')}<div>Oval centre stone with a hidden halo and a pavé shank. Priced from your rate sheet at today's 24K ${inr(SETTINGS.gold_rate_24k)}/g.</div></div>
        <dl class="kv mt-16"><dt>Centre stone</dt><dd>Oval 1.50 ct VVS-EF at ${inr(lo.lines[0].rate)}/ct</dd><dt>Side stones</dt><dd>22 rounds, 0.28 ct at ${inr(lo.lines[1].rate)}/ct</dd><dt>Metal</dt><dd>${STU_REF.purity}, ${STU_REF.wt[0]}–${STU_REF.wt[1]} g${d && d.size_client ? '' : ' at size 13'}</dd><dt>Making</dt><dd>${inr(sheetMaking(STU_REF.purity, 'Engagement ring'))} / g</dd><dt class="tot">Price range</dt><dd class="tot num">${inr(lo.total)}–${inr(hi.total)}</dd></dl>
        ${d && d.budget && !hides('budget') ? `<div class="xs muted mt-8">Client's budget on ${d.id}: ${inr(d.budget)}.</div>` : ''}
        <div class="label mt-16">Similar pieces you have quoted</div><div class="list mt-8">${similar.map(x => `<div class="li" data-go="#/deal/${x.id}" style="padding:10px 0"><img class="thumb" src="${img(x.img, 120)}" alt=""><div class="grow" style="min-width:0"><div class="t truncate">${esc(dealTitle(x))}</div><div class="s">${x.order_no || x.quote_no} · ${inr(x.calc.total)}</div></div>${stagePill(x.stage)}</div>`).join('')}</div>
        <div class="stack-s mt-16"><button class="btn primary block" data-go="#/deal/${d.id}/quote">Turn into a quote on ${d.id}</button><button class="btn block wa" data-act="stuSendEst">${icon('wa')}Send the range to ${esc(sx_first(c.name))}</button></div>`)}</div>`;
    }
    return `${pageHead('AI Studio', 'Product photos, listings and quick estimates for your team', `<span class="badge gold">${icon('zap', 'sm')} ${STU.credits} credits left</span>`)}
      <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="tab ${STUDIO_TAB === k ? 'on' : ''}" data-act="studioTab" data-t="${k}">${v}</button>`).join('')}</div>${body}`;
  },
  mount(root) {
    const r = root.querySelector('#cmp input[type=range]');
    if (r) r.addEventListener('input', () => { root.querySelector('#cmp .after').style.clipPath = `inset(0 0 0 ${r.value}%)`; root.querySelector('#cmp .handle').style.left = r.value + '%'; });
    const s = root.querySelector('#stuItem');
    if (s) s.addEventListener('change', () => { STU.item = s.value; STU.gen = false; STU.picked = null; render(); });
  }
};
const stuResults = it => { const bg = ['#FFFFFF', '#2B1F2E', '#F3E9E1', '#EDEAE4'], pool = [it.img, ...IMG[{ Ring: 'rings', Necklace: 'necklaces', Pendant: 'pendants' }[it.item_type] || 'earrings'].map(x => x.src).filter(x => x !== it.img)];
  return [0, 1, 2, 3].map(i => `<img class="thumb xl" data-act="stuPick" data-i="${i}" src="${img(pool[i % pool.length], 300)}" alt="Result ${i + 1}" style="cursor:pointer;background:${bg[i]};padding:${i === 1 ? '14px' : 0};${STU.picked === i ? 'outline:3px solid var(--gold);outline-offset:2px' : ''}">`).join(''); };
ACTIONS.studioTab = el => { STUDIO_TAB = el.dataset.t; render(); };
ACTIONS.genPhotos = () => {
  const out = document.getElementById('genOut');
  out.innerHTML = [0, 1, 2, 3].map(() => '<div class="thumb xl shimmer"></div>').join('');
  setTimeout(() => { STU.gen = true; STU.picked = null; STU.credits -= 4; if (location.hash.startsWith('#/studio')) render(); toast('4 images ready · 4 credits used', 'sparkles'); }, 1400);
};
ACTIONS.stuPick = el => { STU.picked = +el.dataset.i; render(); };
ACTIONS.stuUse = () => { const it = stuItem(); if (STU.picked == null) return toast('Tap an image to pick it first', 'image'); toast(`Image ${STU.picked + 1} set as the main photo of ${it.code} on ${TENANT.site}`, 'store'); };
ACTIONS.stuTone = el => { STU.tone = el.dataset.t; render(); };
ACTIONS.genListing = () => {
  const it = stuItem(), metal = `${it.purity} ${it.gold_colour.toLowerCase()} gold`;
  const lead = { 'Quiet luxury': 'Made quietly well', Bridal: 'For the day, and every anniversary after', Everyday: 'Easy to wear, every day' }[STU.tone];
  const title = `${it.title.replace(/ [A-Z]{2}-\d+$/, '')} in ${metal}, lab-grown diamonds`;
  sx_type(document.getElementById('lsDesc'), `${lead}: ${it.stone_summary.replace(/VS-FG/g, 'FG VS')} lab-grown diamonds set in ${it.net_wt} g of ${metal}. Hallmarked (HUID ${it.huid}), IGI-certified stones, finished by hand in our Delhi atelier. Priced at today's gold rate, so the number you see is the number you pay.`);
  document.getElementById('lsTitle').value = title;
  setTimeout(() => { const hi = document.getElementById('lsHi'), seo = document.getElementById('lsSeo'); if (hi) hi.value = `${it.purity} सोने में लैब-ग्रोन हीरे, हाथ से तैयार। हॉलमार्क (HUID ${it.huid}), दिल्ली में बना।`; if (seo) seo.value = `${title}. ${it.net_wt} g ${metal}, HUID hallmarked, made in Delhi by MARQA.`; }, 700);
  STU.credits -= 1; toast(`Listing written in ${STU.tone.toLowerCase()} tone · 1 credit used`, 'sparkles');
};
ACTIONS.stuPublish = () => { const t = document.getElementById('lsTitle'); if (!t || !t.value.trim()) return toast('Write the listing first, then publish', 'edit'); STU.published = t.value.trim(); render(); toast(`Draft product created on ${TENANT.site}`, 'store'); };
ACTIONS.stuSendEst = () => {
  const t = inbThread(STU_REF.thread), d = inbDeal(t), est = w => stoEstimate({ purity: STU_REF.purity, wt: w, item_type: 'Engagement ring', lines: STU_REF.lines, extra: 0 }).total;
  inbPush(t, { from: 'out', t: `Hi ${sx_first(cust(t.cust).name)}, from your photo: a 1.5 ct oval with a hidden halo in ${STU_REF.purity} comes to about ${inr(est(STU_REF.wt[0]))}–${inr(est(STU_REF.wt[1]))} including GST, depending on the final weight. Shall I send a proper quotation?` }, d, { type: 'whatsapp', dir: 'out', subject: 'Estimate range sent on WhatsApp', body: `${inr(est(STU_REF.wt[0]))}–${inr(est(STU_REF.wt[1]))}` });
  toast(`Range sent to ${cust(t.cust).name} · logged on ${d.id}`, 'send');
};

/* ---------- client portal (what the client sees) ---------- */
/* Client-friendly steps from the 18 live stages; type skips (Stock, Repair) drop the design steps */
function porSteps(d) {
  const skip = typeSkips(d), courier = d.delivery_method === 'Courier';
  const qcAt = (d.qc || [])[0] && d.qc[0].at, made = d.production_stage ? { Casting: 'The metal is being cast.', Setting: 'Our setter is placing your diamonds now.', Polishing: 'It is being polished by hand.', Hallmarking: 'It is at the hallmarking centre for its BIS mark.', 'Final finish': 'The final finish is going on.' }[d.production_stage] : 'Your piece is being made.';
  return [
    { from: 'Order Confirmed', n: 'Order placed', at: d.order_date, now: 'We have your order and the advance.' },
    { from: 'CAD In Progress', n: 'Design', at: d.cad_sent_at || d.production_started_at, now: d.stage === 'CAD Sent' ? `The renders are on WhatsApp. A reply by ${fdate(addDays(d.cad_sent_at || TODAY, 2))} keeps us on time.` : 'Our designers are drawing it from your brief.' },
    { from: 'CAD Approved', n: 'Design approved', at: d.cad_approved_at, now: 'Approved. Metal and stones are being issued to the workshop.' },
    { from: 'In Production', n: 'Being made', at: d.production_started_at, now: made },
    { from: 'QC', n: 'Final checks', at: qcAt, now: d.qc_status === 'Rework' ? 'We weren\'t fully happy at our quality check, so it has gone back for a finer finish.' : 'Weighed, hallmarked and checked under a loupe.' },
    { from: 'Ready', n: 'Ready for you', at: d.ready_at, now: 'Packed with its certificate and care card.' },
    { from: 'Dispatched', n: courier ? 'On its way' : 'Out for delivery', at: d.dispatched_at, now: courier && d.tracking_no ? `${d.courier} tracking ${d.tracking_no}.` : 'On its way to you.' },
    { from: 'Delivered', n: 'Delivered', at: d.delivered_at, now: 'With you. Enjoy it!' }
  ].filter(s => !skip.includes(s.from) && !(s.from === 'CAD Approved' && skip.includes('CAD Approved')));
}
const porCerts = d => { const out = (d.lines || []).filter(l => l.cert_no).map(l => l.cert_no); String(d.cert_nos || '').replace(/^[A-Z]{2,4}\s+/, '').split(/,\s*/).filter(Boolean).forEach(x => { x = x.replace(/^[A-Z]{3}\s+/, ''); if (!out.includes(x)) out.push(x); }); return out; };
const porDeal = id => dealById(id || '') || DEALS.find(x => x.quote_no === id) || dealById('D-20261019-001');
SCREENS.portal = {
  title: 'Your order', chrome: false,
  render(p) {
    const d = porDeal(p.id), c = dealContact(d), m = money(d), first = sx_first(c.name);
    const steps = porSteps(d), si = sIdx(d.stage), lost = stg(d.stage).group === 'lost', done = ['Delivered', 'Closed'].includes(d.stage);
    let cur = -1; steps.forEach((s, i) => { if (sIdx(s.from) <= si) cur = i; });
    const late = lateBadge(d) === 'late', certs = porCerts(d), photos = [...new Set([d.img, ...d.photos.filter(ph => !ph.doc).map(ph => ph.img)].filter(Boolean))];
    const head = lost ? `This order was ${d.stage.toLowerCase()}` : !isOrder(d) ? (d.quote_no ? `here is your quotation for ${esc(sx_lc1(dealTitle(d)))}` : `we are preparing your quotation for ${esc(sx_lc1(dealTitle(d)))}`) : done ? `your ${esc(sx_lc1(dealTitle(d)))} is with you` : `your ${esc(sx_lc1(dealTitle(d)))} ${({ "Order placed": "is booked in", Design: "is being designed", "Design approved": "has its design approved", "Being made": "is being made", "Final checks": "is in its final checks", "Ready for you": "is ready for you", "On its way": "is on its way", "Out for delivery": "is out for delivery", Delivered: "is with you" })[(steps[cur] || steps[0]).n]}`;
    return `<div style="background:#EFEBE4;min-height:100vh"><div class="portal">
      <div class="phd">${BRAND.wordmark('')}<a class="xs muted" href="#/deal/${d.id}">${icon('chevL', 'sm')} Back to app</a></div>
      <div style="padding:22px 20px">
        <div class="eyebrow">${d.order_no ? 'Order ' + esc(d.order_no) : 'Quotation ' + esc(d.quote_no || d.id)}</div><h1 class="mt-8" style="font-size:22px">${lost ? head : `Hello ${esc(first)}, ${head}.`}</h1>
        <p class="muted mt-8 small">${lost ? (d.lost_reason ? 'Reason: ' + esc(d.lost_reason.toLowerCase()) + '. ' : '') + 'Any refund due is shown below.' : !isOrder(d) ? (d.quote_valid_till ? `The price holds at today's gold rate until ${fdate(d.quote_valid_till)} ${sx_hm(d.quote_valid_till)}.` : 'We\'ll send your quotation on WhatsApp.') : done ? `Delivered on ${fdate(d.delivered_at)}. Thank you for choosing MARQA.` : late ? `We promised it for ${fdate(d.promised_date)} and we are running a little behind. We'll confirm the new date with you on WhatsApp today.` : `Expected by ${fdate(d.promised_date)}. We'll message you on WhatsApp at each step.`}</p>
        <img src="${img(d.img, 700)}" alt="" style="border-radius:16px;margin-top:18px;width:100%;aspect-ratio:1;object-fit:cover">
        ${isOrder(d) ? `<div class="mt-24 ladder">${steps.map((s, i) => { const st = i < cur || (done && i <= cur) ? 'done' : i === cur ? 'now' : ''; return `<div class="step ${st}" style="padding-bottom:14px"><span class="dot">${st === 'done' ? icon('check', 'sm') : i + 1}</span><div><div class="st">${s.n}</div>${st === 'now' ? `<div class="ss">${esc(s.now)}</div>` : st === 'done' && s.at ? `<div class="ss">${fdate(s.at)}</div>` : ''}</div></div>`; }).join('')}</div>` : ''}
        <div class="card mt-16"><div class="card-b"><div class="row between"><span class="strong">Payment</span>${m.balance > 0.5 ? badge(isOrder(d) ? 'Balance due at delivery' : 'Advance confirms the order', 'amber') : m.paid > 0 ? badge('Paid', 'green') : ''}</div>
          <dl class="kv mt-12"><dt>${isOrder(d) ? 'Order value' : 'Quotation total'}</dt><dd class="num">${inr(m.basis)}</dd><dt>Paid</dt><dd class="num">${inr(m.paid)}</dd>${d.payments.filter(x => !x.void).map(x => `<dt class="xs">${x.kind} · ${esc(x.mode)} · ${fdate(x.paid_at)}</dt><dd class="xs num">${x.kind === 'Refund' ? '− ' : ''}${inr(x.amount)}</dd>`).join('')}<dt class="tot">Balance</dt><dd class="tot num">${inr(m.balance)}</dd></dl>
          ${m.balance > 0.5 && isOrder(d) && !lost ? `<button class="btn primary block mt-16 lg" data-act="porPay" data-d="${d.id}">Pay ${inr(m.balance)}</button>` : ''}${d.invoice_no ? `<div class="xs muted mt-12">GST invoice ${esc(d.invoice_no)}${d.huid ? ' · HUID ' + esc(d.huid) : ''}</div>` : ''}</div></div>
        <div class="card mt-16"><div class="card-b"><div class="strong">Your diamond${(d.lines || []).length > 1 || certs.length > 1 ? 's' : ''}</div><div class="small muted mt-8">${(d.lines || []).map(l => `${l.pcs} × ${l.shape.toLowerCase()} · ${(+l.ct).toFixed(2)} ct ${l.quality}`).join('<br>') || 'Details follow with your quotation.'}</div>
          ${certs.length ? certs.map(cn => `<button class="btn block mt-12" data-act="porCert" data-d="${d.id}" data-c="${esc(cn)}">${icon('download')}Certificate ${esc(cn)} (PDF)</button>`).join('') : `<div class="xs muted mt-12">${icon('shield', 'sm')} Certificates are attached after the final quality check.</div>`}</div></div>
        ${photos.length ? `<div class="card mt-16"><div class="card-b"><div class="strong">Photos</div><div class="sx-gal mt-12">${photos.map(src => `<img src="${img(src, 300)}" alt="Photo of your piece" data-act="porPhoto" data-src="${esc(src)}">`).join('')}</div></div></div>` : ''}
        ${isOrder(d) && !typeSkips(d).includes('CAD In Progress') ? `<div class="card mt-16"><div class="card-b"><div class="strong">Design</div><div class="row mt-12"><div class="thumb lg" style="display:grid;place-items:center">${icon('cube')}</div><div class="small muted">${d.cad_approved_at ? `CAD${d.cad_revisions ? ' v' + (d.cad_revisions + 1) : ''} approved on ${fdate(d.cad_approved_at)}` : d.cad_sent_at ? `CAD${d.cad_revisions ? ' v' + (d.cad_revisions + 1) : ''} sent on ${fdate(d.cad_sent_at)}, waiting for your reply` : 'Being drawn now'}<br>${esc([d.size && d.size !== 'Not applicable' ? d.size : '', d.purity, d.gold_colour ? d.gold_colour.toLowerCase() : ''].filter(Boolean).join(' · '))}</div></div></div></div>` : ''}
        <button class="btn wa block lg mt-16" data-act="porChat" data-d="${d.id}">${icon('wa')}Chat with MARQA</button>
        <p class="xs muted mt-24" style="text-align:center">MARQA · C-57 Central Market, Lajpat Nagar II, New Delhi</p>
      </div></div></div>`;
  }
};
ACTIONS.porPay = el => {
  const d = dealById(el.dataset.d), bal = money(d).balance;
  openModal(`<div class="sx-modal-b"><div class="row between"><b>Pay ${inr(bal)}</b><span class="xs muted">Secured by Razorpay</span></div>
    <div class="stack-s mt-16">${[['UPI', 'GPay, PhonePe, Paytm'], ['Card', 'Visa, Mastercard, RuPay, Amex'], ['Bank transfer', 'Net banking, all major banks']].map(([a, b], i) => `<label class="pick ${i === 0 ? 'on' : ''}" style="padding:12px"><input type="radio" name="pm" value="${a}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--gold)"><div><div class="strong small">${a}</div><div class="xs muted">${b}</div></div></label>`).join('')}</div>
    <button class="btn primary block lg mt-16" data-act="porPaid" data-d="${d.id}">Pay now</button></div>`, '', m => m.querySelectorAll('input[name=pm]').forEach(r => r.addEventListener('change', () => m.querySelectorAll('.pick').forEach(p => p.classList.toggle('on', p.contains(m.querySelector('input[name=pm]:checked')))))));
};
ACTIONS.portalPay = ACTIONS.porPay;
ACTIONS.porPaid = el => {
  const d = dealById(el.dataset.d), bal = money(d).balance, mode = (document.querySelector('input[name=pm]:checked') || {}).value || 'UPI';
  recordPayment(d, { kind: 'Balance', amount: bal, mode, reference: 'Razorpay pay_' + Math.random().toString(36).slice(2, 10) + ' (client portal)', paid_at: sx_now() }); sx_restamp(d);
  closeLayer(); render(); toast(`${inr(bal)} paid by ${mode} · receipt on WhatsApp · recorded on ${d.order_no || d.id}`);
};
ACTIONS.portalPaid = ACTIONS.porPaid;
ACTIONS.porCert = el => {
  const d = dealById(el.dataset.d), cn = el.dataset.c, s = STOCK_ITEMS.find(x => x.cert_no === cn || x.code === cn), line = (d.lines || []).find(l => l.cert_no === cn) || (d.lines || [])[0] || {};
  const lab = s ? s.cert_lab : (String(d.cert_nos || '').match(/^[A-Z]{2,4}/) || ['IGI'])[0];
  const rows = s ? [['Shape', s.shape], ['Carat', s.carat.toFixed(2) + ' ct'], ['Colour', s.colour], ['Clarity', s.clarity], ['Cut', s.cut], ['Polish', s.polish], ['Symmetry', s.symmetry], ['Fluorescence', s.fluorescence], ['Measurements', s.measurements + ' mm'], ['Origin', 'Laboratory-grown']]
    : [['Shape', line.shape || '—'], ['Carat', line.ct ? (+line.ct / Math.max(1, line.pcs || 1)).toFixed(2) + ' ct each' : '—'], ['Quality', line.quality || '—'], ['Origin', 'Laboratory-grown']];
  openModal(`<div class="sx-modal-b"><div class="row between"><div><div class="eyebrow">${esc(lab)} report</div><h2 style="font-size:18px" class="mt-8">${esc(cn)}</h2></div>${sx_iconTile('shield', 'green')}</div>
    <div class="sx-doc mt-16"><dl class="kv">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl><div class="xs muted mt-12">Inscribed on the girdle: ${esc(lab)} ${esc(cn)}. Check it on the lab's website with this number.</div></div>
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button><button class="btn primary" data-act="porCertDl" data-c="${esc(lab + ' ' + cn)}">${icon('download')}Download PDF</button></div></div>`);
};
ACTIONS.porCertDl = el => { closeLayer(); toast(`${el.dataset.c}.pdf saved to your phone`, 'download'); };
ACTIONS.porPhoto = el => openModal(`<div class="sx-modal-b"><img src="${img(el.dataset.src, 900)}" alt="" style="width:100%;border-radius:12px;aspect-ratio:1;object-fit:cover"><div class="row mt-12" style="justify-content:flex-end"><button class="btn" data-act="close">Close</button></div></div>`);
ACTIONS.porChat = el => {
  const d = dealById(el.dataset.d), c = dealContact(d), t = THREADS.find(x => x.id === d.thread) || sx_contactThread(c.id);
  openModal(`<div class="sx-modal-b"><div class="row">${sx_iconTile('wa', 'green')}<div class="grow"><div class="strong">MARQA on WhatsApp</div><div class="xs muted">${TENANT.whatsapp} · replies within 2–4 hours</div></div></div>
    <div class="mt-16" style="background:#F4F0E8;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px">${t ? t.msgs.slice(-3).map(m => inbBubble({ ...m, from: m.from === 'in' ? 'out' : 'in', ai: false })).join('') : '<div class="small muted">Start the conversation about ' + esc(d.order_no || d.id) + '.</div>'}</div>
    <div class="composer mt-12"><textarea id="porMsg" placeholder="Message MARQA about ${esc(d.order_no || 'your order')}">Hi! Any update on ${esc(d.order_no || 'my order')}?</textarea><button class="send" data-act="porChatSend" data-d="${d.id}" aria-label="Send">${icon('send', 'sm')}</button></div></div>`);
};
ACTIONS.porChatSend = el => {
  const d = dealById(el.dataset.d), c = dealContact(d), box = document.getElementById('porMsg'), text = box.value.trim();
  if (!text) return toast('Type a message first', 'edit');
  let t = THREADS.find(x => x.id === d.thread) || sx_contactThread(c.id);
  if (!t) { t = { id: 't' + (THREADS.length + 1), cust: c.id, unread: 0, time: '', msgs: [] }; THREADS.unshift(t); d.thread = d.thread || t.id; }
  inbPush(t, { from: 'in', t: text }, d, { type: 'whatsapp', dir: 'in', subject: 'They wrote from the client portal', body: text }); t.unread++;
  closeLayer(); toast('Sent. The MARQA team sees it in their WhatsApp inbox', 'wa');
};

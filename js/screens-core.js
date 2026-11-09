/* Home, sign-in, onboarding, plans, notifications.
   The sx_ helpers below are shared by the SaaS screens (inbox, store, studio, portal, billing, schemes, karigars, assistant). */

/* ---------- sx_: shared helpers for the SaaS screens ---------- */
/* The prototype's clock: TODAY (4 Nov, 10:30) plus the time since the page loaded, so new messages and
   records sit after the seeded ones instead of at the real time of day. */
const SX_T0 = Date.now();
const sx_now = () => typeof NOW === 'function' ? NOW() : new Date(TODAY.getTime() + (Date.now() - SX_T0));
/* logic.js stamps with the real clock; pull the newest timeline entry (and a few fields) back onto the prototype clock */
function sx_restamp(d, fields) { const n = sx_now(); if (d.activities[0] && d.activities[0].at > n) d.activities[0].at = n; (fields || []).forEach(f => { if (d[f] instanceof Date) d[f] = n; }); }
const sx_hm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const sx_first = name => String(name || '').split(/\s+/)[0];
const sx_lc1 = s => s ? s[0].toLowerCase() + s.slice(1) : '';
const sx_iconTile = (ic, tone) => `<span class="badge ${tone || 'gold'} sx-tile">${icon(ic, 'sm')}</span>`;
/* Deals behind a WhatsApp thread (d.thread), open ones first, newest enquiry first */
const sx_threadDeals = t => dealsVisible().filter(d => d.thread === t.id && !d.deleted).sort((a, b) => (isOpen(b) - isOpen(a)) || (b.enquiry - a.enquiry));
const sx_contactThread = cid => THREADS.find(t => t.cust === cid);
/* Fill a message template from a deal. Values the record does not have stay as [placeholders], like the live app. */
function sx_fill(body, d, extra) {
  const c = d ? dealContact(d) : {}, k = d && d.calc ? d.calc : {}, m = d ? money(d) : {}, n = v => NF.format(Math.round(v || 0));
  const lines = d ? (d.lines || []).map(l => `${l.pcs} ${l.shape} ${(+l.ct).toFixed(2)} ct`).join(' + ') : '';
  const v = Object.assign({
    name: sx_first(c.name), agent: sx_first(viewUser().name), interest: d && d.product_interest ? d.product_interest.toLowerCase() : '',
    slots: 'Saturday 12:00 or Sunday 16:00', quote_no: d && d.quote_no, piece: d ? sx_lc1(d.item_label || (d.product_interest || '').toLowerCase()) : '',
    diamond_value: k.total && n(k.diamond_value), gold_wt: d && d.gold_wt, purity: d && d.purity, gold_rate: k.total && n(k.gold_rate_applied), gold_value: k.total && n(k.gold_value),
    labour: k.total && n(k.labour), gst_pct: d && d.gst_pct, gst_amt: k.total && n(k.gst_amt), total: k.total && n(k.total),
    valid_till: d && d.quote_valid_till ? fdate(d.quote_valid_till) + ' ' + sx_hm(d.quote_valid_till) : '', order_no: d && d.order_no, est_cost: d && d.est_cost && n(d.est_cost),
    advance: m.advance && n(m.advance), balance: m.basis && n(m.balance), cad_date: d && d.order_date ? fdate(addDays(d.order_date, 5)) : '',
    delivery_date: d && d.promised_date ? fdate(d.promised_date) : '', feedback_date: fdate(addDays(TODAY, 2)), angles: '3', gold_colour: d && d.gold_colour && d.gold_colour.toLowerCase(),
    stone_spec: lines, est_weight: d && (d.est_weight || d.gold_wt), production_stage: d && d.production_stage ? d.production_stage.toLowerCase() : '', photo_line: '',
    actual_weight: d && d.actual_weight, cert_no: d && d.cert_nos, delivery_method: d && d.delivery_method && d.delivery_method.toLowerCase(),
    balance_line: m.balance > 0.5 ? `Balance due: INR ${n(m.balance)}.` : 'Nothing is due.', tracking_line: d && d.tracking_no ? `${d.courier} tracking ${d.tracking_no}.` : '',
    invoice_no: d && d.invoice_no, pay_details: SETTINGS.pay_details, review_link: SETTINGS.review_link, referral_offer: SETTINGS.referral_offer,
    festival: 'the festive season', occasion: d && d.occasion && d.occasion.toLowerCase()
  }, extra || {});
  return body.replace(/\{(\w+)\}/g, (_, key) => (v[key] != null && v[key] !== '' && v[key] !== 0) ? v[key] : `[${key.replace(/_/g, ' ')}]`);
}
function sx_type(el, text, i = 0) { if (!el) return; const k = 'value' in el ? 'value' : 'textContent'; el[k] = text.slice(0, i); if (i < text.length) setTimeout(() => sx_type(el, text, i + 4), 12); }
/* SaaS-screen styles live in css/saas.css */

/* ---------- notifications ---------- */
ACTIONS.notifs = () => {
  const unread = NOTIFS.filter(n => !n.read).length;
  openSheet({
    title: 'Notifications', sub: unread ? `${unread} new` : 'All caught up',
    body: `<div class="card ${unread ? '' : 'sx-read'}"><div class="list">${NOTIFS.map(n => `<div class="li" data-go="${n.go}">${sx_iconTile(n.icon, n.tone)}
      <div class="grow"><div class="t" style="font-weight:${n.read ? 500 : 600}">${esc(n.t)}</div><div class="s">${esc(n.s)}</div></div><span class="xs muted">${n.at}</span></div>`).join('')}</div></div>
      <div class="label mt-24">Send me</div>
      <div class="card mt-8"><div class="card-b stack-s">${['Late karigar jobs', 'New enquiries from the website and Shopify', 'Payments received', 'AI replies that need review', 'Daily summary at 9:00'].map((t, i) =>
        `<label class="row between"><span>${t}</span><span class="switch"><input type="checkbox" ${i !== 2 ? 'checked' : ''}><span></span></span></label>`).join('')}</div></div>`,
    foot: unread ? '<button class="btn" data-act="sxNotifRead">Mark all read</button>' : '<button class="btn" data-act="close">Close</button>'
  });
};
ACTIONS.sxNotifRead = () => { const n = NOTIFS.filter(x => !x.read).length; NOTIFS.forEach(x => { x.read = true; }); ACTIONS.notifs(); toast(`${n} notification${n === 1 ? '' : 's'} marked read`); };

/* ---------- sign in ---------- */
const SX_AUTH = { phone: '98765 43210', cc: '+91', email: 'riya@example.com', resends: 0 };
SCREENS.login = {
  title: 'Sign in', chrome: false,
  render() {
    return `<div class="auth">
      <div class="art">${BRAND.wordmark('wm')}${BRAND.q('q')}
        <div><div class="eyebrow" style="color:var(--gold)">Pipeline</div><h2 class="mt-12">Enquiries, quotes, orders, karigars and stones in one record.</h2>
        <p>Used on the showroom floor, at the karigar's bench and on the owner's phone.</p></div>
        <div class="small" style="color:#7C766E">© 2026 MARQA · Made in New Delhi</div></div>
      <div class="pane"><div class="box">
        <div class="only-m" style="margin-bottom:28px">${BRAND.wordmark('wm')}</div>
        <h1 style="font-size:26px" id="authH">Sign in</h1><p class="muted mt-8" id="authSub">We'll send a one-time code to your phone.</p>
        <div id="authPhone" class="stack mt-24">
          <label class="field"><span>Mobile number</span><div class="row" style="gap:8px"><select class="select" id="authCc" style="width:96px"><option>+91</option><option>+971</option><option>+44</option></select><input class="input num" id="authNum" value="${SX_AUTH.phone}" inputmode="tel"></div></label>
          <button class="btn primary lg block" data-act="authSend">Send code</button>
          <div class="row" style="gap:12px"><span class="hr grow" style="margin:0"></span><span class="xs muted">or</span><span class="hr grow" style="margin:0"></span></div>
          <button class="btn lg block" data-act="authEmail">${icon('mail')}Continue with email</button>
        </div>
        <div id="authMail" class="stack mt-24 hide">
          <label class="field"><span>Work email</span><input class="input" id="authEm" type="email" value="${SX_AUTH.email}" autocomplete="email"></label>
          <button class="btn primary lg block" data-act="authLink">Email me a sign-in link</button>
          <button class="btn ghost block small" data-act="authUsePhone">${icon('phone', 'sm')}Use my phone instead</button>
        </div>
        <div id="authSent" class="stack mt-24 hide">
          <div class="banner">${icon('mail')}<div>We sent a sign-in link to <b id="authEmShow">${SX_AUTH.email}</b>. It works once, for 15 minutes, on this device.</div></div>
          <button class="btn primary lg block" data-go="#/home">Open the link (demo)</button>
          <button class="btn ghost block small" data-act="authUsePhone">Use my phone instead</button>
        </div>
        <div id="authOtp" class="stack mt-24 hide">
          <div class="small muted" id="authTo">Code sent to +91 ${SX_AUTH.phone}</div>
          <div class="otp">${[4, 8, 2, 6, '', ''].map(v => `<input maxlength="1" inputmode="numeric" value="${v}" aria-label="Digit">`).join('')}</div>
          <div class="small hide" id="authErr" style="color:var(--red)">Enter all six digits of the code.</div>
          <button class="btn primary lg block" data-act="authVerify">Verify and continue</button>
          <div class="row between"><button class="btn ghost small" data-act="authUsePhone">Change number</button><button class="btn ghost small" data-act="authResend" id="authRs">Resend code</button></div>
        </div>
        <p class="small muted mt-24">New to MARQA Pipeline? <a href="#/signup" class="strong" style="color:var(--gold-dk)">Start a 21-day trial</a></p>
        <p class="xs muted mt-12">Design prototype · every client, order and figure in it is made-up demo data. Any number signs you in.</p>
      </div></div></div>`;
  },
  mount(root) {
    const boxes = [...root.querySelectorAll('.otp input')];
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); root.querySelector('#authErr').classList.add('hide'); });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); if (e.key === 'Enter') ACTIONS.authVerify(); });
    });
  }
};
const sxAuthShow = (id, h, sub) => { ['authPhone', 'authMail', 'authSent', 'authOtp'].forEach(x => document.getElementById(x).classList.toggle('hide', x !== id)); document.getElementById('authH').textContent = h; document.getElementById('authSub').textContent = sub; };
ACTIONS.authSend = () => {
  const num = document.getElementById('authNum').value.trim(), cc = document.getElementById('authCc').value;
  if (num.replace(/\D/g, '').length < 8) return toast('Enter a mobile number first', 'alert');
  SX_AUTH.phone = num; SX_AUTH.cc = cc; document.getElementById('authTo').textContent = `Code sent to ${cc} ${num}`;
  sxAuthShow('authOtp', 'Enter the code', 'Six digits, valid for 10 minutes.');
  const nx = [...document.querySelectorAll('.otp input')].find(x => !x.value); if (nx) nx.focus();
};
ACTIONS.authEmail = () => sxAuthShow('authMail', 'Sign in with email', 'We\'ll email you a one-time sign-in link. No password to remember.');
ACTIONS.authUsePhone = () => sxAuthShow('authPhone', 'Sign in', 'We\'ll send a one-time code to your phone.');
ACTIONS.authLink = () => {
  const em = document.getElementById('authEm').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.\w+$/.test(em)) return toast('That email address does not look right', 'alert');
  SX_AUTH.email = em; document.getElementById('authEmShow').textContent = em; sxAuthShow('authSent', 'Check your inbox', 'The link signs you in on this device.');
};
ACTIONS.authVerify = () => {
  const code = [...document.querySelectorAll('.otp input')].map(x => x.value).join('');
  if (code.length < 6) { document.getElementById('authErr').classList.remove('hide'); const nx = [...document.querySelectorAll('.otp input')].find(x => !x.value); if (nx) nx.focus(); return; }
  go('#/home'); toast('Signed in as ' + viewUser().name, 'shield');
};
ACTIONS.authResend = el => { SX_AUTH.resends++; el.textContent = 'Code resent · wait 0:30'; el.disabled = true; toast(`New code sent to ${SX_AUTH.cc} ${SX_AUTH.phone}`, 'phone'); };

/* ---------- onboarding (new jeweller) ---------- */
const WIZ = { step: 0, template: 'bespoke', sheet: false, team: [['Meera Joshi', 'Sales', '+91 98100 22341'], ['Ravi Kumar', 'Operations', '+91 98101 55210'], ['', 'Sales', '']], conn: {} };
const WIZ_STEPS = ['Your business', 'How you work', 'Rates', 'Your team', 'Connect'];
/* Which of the 18 live stages each starting template uses (lost exits are always there) */
const WIZ_FLOWS = {
  bespoke: DSTAGES.filter(s => s.i <= 14).map(s => s.key),
  labgrown: DSTAGES.filter(s => s.i <= 14).map(s => s.key),
  manufacturer: DSTAGES.filter(s => s.i >= 5 && s.i <= 14).map(s => s.key),
  retail: DSTAGES.filter(s => s.i <= 14 && !TYPE_SKIPS.Stock.includes(s.key)).map(s => s.key)
};
const WIZ_CONN = [['wa', 'WhatsApp Business', 'Inbox, AI replies, quotes and campaigns', 'Connect', 'Connected'], ['store', 'Shopify', 'Custom-order popup, gold-rate pricing, stock sync', 'Install app', 'Installed'], ['card', 'Razorpay', 'Advance payment links and subscriptions', 'Connect', 'Connected'], ['receipt', 'Tally', 'Send invoices to your accountant', 'Connect', 'Connected'], ['download', 'Import existing data', 'Customers, leads and stock from Excel or Google', 'Import', 'Queued']];
SCREENS.signup = {
  title: 'Set up', chrome: false,
  render() {
    const s = WIZ.step, flow = WIZ_FLOWS[WIZ.template];
    const nChecks = flow.reduce((n, k) => n + (CHECKLISTS[k] || []).length, 0);
    const bodies = [
      () => `<div class="fgrid">
        <label class="field full"><span>Business name</span><input class="input" value="Aurelia Fine Jewels"></label>
        <label class="field"><span>City</span><input class="input" value="Jaipur"></label>
        <label class="field"><span>GSTIN <em>(optional now)</em></span><input class="input" placeholder="08ABCDE1234F1Z5"></label>
        <div class="field full"><span>What do you mostly sell?</span><div class="chips">${['Lab-grown diamonds', 'Natural diamonds', 'Gold jewellery', 'Bridal', 'Silver', 'Coloured stones'].map((c, i) => `<button class="chip ${i < 2 || i === 3 ? 'on' : ''}" data-act="sxChip">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Showrooms</span><input class="input num" value="1"></label>
        <label class="field"><span>Do you sell online?</span><select class="select"><option>Shopify store</option><option>Instagram only</option><option>WooCommerce</option><option>Not yet</option></select></label>
      </div>`,
      () => `<p class="muted">Pick the closest template. Every stage and checklist can be edited later in Settings.</p>
       <div class="stack-s mt-16">${WORKFLOW_TEMPLATES.map(t => `<div class="pick ${WIZ.template === t.id ? 'on' : ''}" data-act="pickTemplate" data-id="${t.id}">
         <span class="av sm" style="background:${WIZ.template === t.id ? 'var(--gold)' : '#D8D2C8'}">${icon('layers', 'sm')}</span><div><div class="strong">${t.name}</div><div class="small muted">${t.note}</div></div></div>`).join('')}</div>
       <div class="card soft mt-16"><div class="card-b small"><div class="row between wrap"><b>${flow.length} stages · ${nChecks} stage checks</b><span class="xs muted">plus Lost, Expired and Cancelled</span></div>
         <div class="sx-stages mt-12">${flow.map(stagePill).join('')}</div></div></div>`,
      () => `<div class="banner">${icon('sparkles')}<div>We filled today's rates from the live feed. Your making charges and the diamond sheet are yours to set.</div></div>
       <div class="fgrid mt-16">
        <label class="field"><span>24K gold per gram</span><div class="prefix"><b>₹</b><input class="input num" value="${NF.format(SETTINGS.gold_rate_24k)}"></div></label>
        <label class="field"><span>Platinum 950 per gram</span><div class="prefix"><b>₹</b><input class="input num" value="${NF.format(SETTINGS.platinum_rate_950)}"></div></label>
        <label class="field"><span>Making per gram, 18K</span><div class="prefix"><b>₹</b><input class="input num" value="${NF.format(LABOUR_MATRIX['*']['18K'])}"></div></label>
        <label class="field"><span>Making per gram, silver</span><div class="prefix"><b>₹</b><input class="input num" value="${NF.format(LABOUR_MATRIX['*'].S925)}"></div></label>
        <div class="field full"><span>Diamond rate sheet</span>${WIZ.sheet
          ? `<div class="banner blue">${icon('check')}<div class="grow"><b>aurelia_rate_sheet.xlsx</b> read: ${QUALITY_BANDS.length} quality bands × ${Object.keys(SHAPE_ADJ).length} shapes × ${SIZE_BANDS.length} size bands. 1.00 ct round FG VS = ${inr(sheetRate('Round', 'VS-FG', 1, 1))}/ct.</div><button class="btn sm" data-act="wizSheet">Replace</button></div>`
          : `<div class="drop" data-act="wizSheet">${icon('upload')}<div class="mt-8 strong">Upload your Excel rate sheet</div><div class="small">or start from the lab-grown template</div></div>`}</div>
       </div>`,
      () => `<div class="stack-s">${WIZ.team.map(([n, r, p], i) => `
        <div class="sx-team"><input class="input" placeholder="Name" value="${esc(n)}" data-wt="${i}" data-f="0"><input class="input num" placeholder="Mobile" value="${esc(p)}" data-wt="${i}" data-f="2"><select class="select" data-wt="${i}" data-f="1">${['Sales', 'Operations', 'Marketing', 'Karigar (view only)'].map(o => `<option ${o === r ? 'selected' : ''}>${o}</option>`).join('')}</select><button class="icon-btn" data-act="wizRm" data-i="${i}" aria-label="Remove">${icon('x', 'sm')}</button></div>`).join('')}
        <button class="btn ghost" style="align-self:flex-start" data-act="wizAdd">${icon('plus')}Add person</button></div>
        <div class="card soft mt-16"><div class="card-b small">Each person signs in with their own phone. Founders decide who can see costs, export data or delete. ${WIZ.team.filter(t => t[0]).length} ${WIZ.team.filter(t => t[0]).length === 1 ? 'person' : 'people'} will get an invite on WhatsApp.</div></div>`,
      () => `<div class="stack-s">${WIZ_CONN.map(([ic, n, d, c, done], i) => { const on = WIZ.conn[i]; return `<div class="card"><div class="card-b row"><span class="badge ${on ? 'green' : 'gold'} sx-tile" style="width:38px;height:38px">${icon(on ? 'check' : ic)}</span><div class="grow" style="min-width:0"><div class="strong">${n}</div><div class="small muted">${on ? done + (i === 4 ? ': we\'ll open the importer after setup' : ' · ' + fdate(TODAY)) : d}</div></div><button class="btn sm ${on ? 'ghost' : ''}" data-act="wizConnect" data-i="${i}">${on ? 'Undo' : c}</button></div></div>`; }).join('')}</div>`
    ];
    return `<div style="min-height:100vh;background:var(--bg)"><div class="wizard">
      <div class="row between">${BRAND.wordmark('wm')}<span class="small muted">Step ${s + 1} of ${WIZ_STEPS.length}</span></div>
      <div class="wsteps">${WIZ_STEPS.map((_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
      <div class="eyebrow">${WIZ_STEPS[s]}</div>
      <h1 class="mt-8" style="font-size:26px">${['Tell us about your business', 'Choose how orders move', 'Set your rates', 'Invite your team', 'Connect your tools'][s]}</h1>
      <div class="card mt-24"><div class="card-b" style="padding:22px">${bodies[s]()}</div></div>
      <div class="row between mt-24">
        <button class="btn" data-act="wizBack">${icon('chevL')}${s === 0 ? 'Sign in instead' : 'Back'}</button>
        ${s < WIZ_STEPS.length - 1 ? `<button class="btn primary lg" data-act="wizNext">Continue ${icon('chevR')}</button>` : `<button class="btn gold lg" data-go="#/plans">Finish and choose a plan</button>`}
      </div></div></div>`;
  },
  mount(root) { root.querySelectorAll('[data-wt]').forEach(i => i.addEventListener('change', () => { WIZ.team[+i.dataset.wt][+i.dataset.f] = i.value; })); }
};
ACTIONS.wizNext = () => { WIZ.step = Math.min(WIZ.step + 1, WIZ_STEPS.length - 1); render(); scrollTo(0, 0); };
ACTIONS.wizBack = () => { if (WIZ.step === 0) return go('#/login'); WIZ.step -= 1; render(); };
ACTIONS.pickTemplate = el => { WIZ.template = el.dataset.id; render(); };
ACTIONS.wizSheet = () => { WIZ.sheet = true; render(); toast('Rate sheet read: ' + SIZE_BANDS.length + ' size bands per shape', 'upload'); };
ACTIONS.wizAdd = () => { WIZ.team.push(['', 'Sales', '']); render(); const ins = document.querySelectorAll('[data-wt][data-f="0"]'); if (ins.length) ins[ins.length - 1].focus(); };
ACTIONS.wizRm = el => { const [n] = WIZ.team.splice(+el.dataset.i, 1)[0]; render(); toast(n ? `${n} removed from the invite list` : 'Empty row removed', 'x'); };
ACTIONS.wizConnect = el => { const i = +el.dataset.i, c = WIZ_CONN[i]; WIZ.conn[i] = !WIZ.conn[i]; render(); toast(WIZ.conn[i] ? `${c[1]}: ${c[4].toLowerCase()}` : `${c[1]}: left for later`, WIZ.conn[i] ? 'check' : 'undo'); };
ACTIONS.toggleChip = el => el.classList.toggle('on');
ACTIONS.sxChip = el => el.classList.toggle('on');

/* ---------- plans ---------- */
let PLAN_PERIOD = 'monthly';
const PLAN_ADDONS = [['Virtual try-on', 6999, false], ['Extra showroom', 2499, false], ['WhatsApp messages over the allowance', 0, true, 'At Meta rates + 10%'], ['Setup and data migration', 9999, false, 'One-time, from ₹9,999']];
const PLAN_STATE = { pending: null, pay: 'upi' };
const SX_PLANS = [
  { n: 'Studio', m: 2999, who: 'One studio, up to 5 people', f: ['Enquiries, quotes and order stages', 'Karigar sheets and metal issue', 'Stone and memo ledger', 'WhatsApp click-to-chat', 'Customer profiles and reports'] },
  { n: 'Growth', m: 5999, who: 'One showroom, up to 15 people', f: ['Everything in Studio', 'WhatsApp inbox and campaigns', 'Shopify custom-order popup', 'Gold-rate price sync', 'Customer portal and gold savings schemes'] },
  { n: 'Brand', m: 9999, who: 'Showroom and online, up to 30 people', f: ['Everything in Growth', 'AI WhatsApp assistant', 'AI photo studio and listings', 'Owner\'s AI assistant', 'Several stores, priority support', '2,000 AI credits and 5,000 messages a month'] }
];
const sxPlanBy = n => SX_PLANS.find(p => p.n === n);
const sxPlanPrice = m => PLAN_PERIOD === 'annual' ? Math.round(m * 10 / 12) : m;
SCREENS.plans = {
  title: 'Plans', nav: 'settings',
  render() {
    const cur = TENANT.plan, next = PLAN_STATE.pending, base = sxPlanBy(next || cur);
    const addOns = PLAN_ADDONS.filter(a => a[2] && a[1]).reduce((s, a) => s + a[1], 0);
    const sub = sxPlanPrice(base.m) + addOns, gst = Math.round(sub * .18);
    return `${pageHead('Plans', 'Prices per shop per month, before GST. Annual billing gives two months free.',
      `<div class="seg"><button class="${PLAN_PERIOD === 'monthly' ? 'on' : ''}" data-act="period" data-p="monthly">Monthly</button><button class="${PLAN_PERIOD === 'annual' ? 'on' : ''}" data-act="period" data-p="annual">Annual</button></div>`)}
      ${next ? `<div class="banner blue" style="margin-bottom:16px">${icon('calendar')}<div class="grow">You move from <b>${cur}</b> to <b>${next}</b> on 1 Dec. ${cur} stays on until then.</div><button class="btn sm" data-act="planUndo">Keep ${cur}</button></div>` : ''}
      <div class="grid g3">${SX_PLANS.map(p => { const isCur = p.n === cur, isNext = p.n === next; return `<div class="plan ${isCur ? 'cur' : ''}">
        <div class="row between"><h3 style="font-size:16px">${p.n}</h3>${isCur ? badge('Current plan', 'gold') : isNext ? badge('From 1 Dec', 'blue') : ''}</div>
        <div><span class="pp num">${inr(sxPlanPrice(p.m))}</span><span class="muted small"> / month</span></div>
        <div class="small muted">${p.who}</div><div class="hr" style="margin:4px 0"></div>
        <ul>${p.f.map(x => `<li>${icon('check')}${x}</li>`).join('')}</ul>
        ${isCur ? `<button class="btn block mt-8" data-act="planManage">${icon('card')}Manage billing</button>` : isNext ? `<button class="btn block mt-8" data-act="planUndo">Cancel the switch</button>` : `<button class="btn primary block mt-8" data-act="planSwitch" data-p="${p.n}">Switch to ${p.n}</button>`}</div>`; }).join('')}</div>
      <div class="grid g2 mt-16">
        ${card('Add-ons', `<div class="list">${PLAN_ADDONS.map(([a, price, on, note], i) => `<div class="li" style="cursor:default"><div class="grow" style="min-width:0"><div class="t">${a}</div><div class="s">${note || inr(price) + ' / month'}</div></div>${price ? `<button class="btn sm ${on ? '' : 'primary'}" data-act="planAddon" data-i="${i}">${on ? 'Remove' : 'Add'}</button>` : badge('Always on', 'green')}</div>`).join('')}</div>`, { flush: true })}
        ${card('Next bill', `<dl class="kv"><dt>${base.n} plan${PLAN_PERIOD === 'annual' ? ' (annual, per month)' : ''}</dt><dd class="num">${inr(sxPlanPrice(base.m))}</dd>${PLAN_ADDONS.filter(a => a[2] && a[1]).map(a => `<dt>${a[0]}</dt><dd class="num">${inr(a[1])}</dd>`).join('')}<dt>AI credits used</dt><dd class="num">1,240 of 2,000</dd><dt>WhatsApp messages</dt><dd class="num">3,412 of 5,000</dd><dt>GST 18%</dt><dd class="num">${inr(gst)}</dd><dt class="tot">Next debit on 1 Dec</dt><dd class="tot num">${inr(sub + gst)}</dd></dl>
          <div class="small muted mt-12">${icon('shield', 'sm')} ${PLAN_STATE.pay === 'upi' ? `UPI AutoPay, ${sub + gst <= 15000 ? 'under' : 'over'} the ₹15,000 limit, so it ${sub + gst <= 15000 ? 'renews without a fresh approval' : 'needs a one-tap approval each month'}.` : 'Card ending 4417, charged on the 1st.'}</div>`)}
      </div>`;
  }
};
ACTIONS.period = el => { PLAN_PERIOD = el.dataset.p; render(); };
ACTIONS.planSwitch = el => {
  const to = sxPlanBy(el.dataset.p), from = sxPlanBy(TENANT.plan), up = to.m > from.m;
  const lose = from.f.filter(f => !to.f.includes(f) && !f.startsWith('Everything')), gain = to.f.filter(f => !from.f.includes(f) && !f.startsWith('Everything'));
  openModal(`<div class="sx-modal-b"><div class="row">${sx_iconTile(up ? 'arrowUR' : 'alert', up ? 'green' : 'amber')}<h2 style="font-size:18px">Switch to ${to.n}?</h2></div>
    <dl class="kv mt-16"><dt>Now</dt><dd class="num">${from.n} · ${inr(sxPlanPrice(from.m))} / month</dd><dt>From 1 Dec</dt><dd class="num strong">${to.n} · ${inr(sxPlanPrice(to.m))} / month</dd></dl>
    ${up ? `<div class="label mt-16">You gain</div><ul class="small mt-8" style="padding-left:18px">${(gain.length ? gain : to.f).map(f => `<li>${f}</li>`).join('')}</ul>`
      : `<div class="label mt-16">You lose on 1 Dec</div><ul class="small mt-8" style="padding-left:18px">${lose.map(f => `<li>${f}</li>`).join('')}${to.n === 'Studio' ? '<li>WhatsApp inbox and campaigns</li><li>Shopify custom-order popup</li>' : ''}</ul><div class="small muted mt-8">Records made with those features stay readable; nothing is deleted.</div>`}
    <div class="row mt-16" style="justify-content:flex-end"><button class="btn" data-act="close">Not now</button><button class="btn primary" data-act="planConfirm" data-p="${to.n}">Switch on 1 Dec</button></div></div>`);
};
ACTIONS.planConfirm = el => { PLAN_STATE.pending = el.dataset.p; closeLayer(); render(); toast(`Plan changes to ${el.dataset.p} on 1 Dec`, 'calendar'); };
ACTIONS.planUndo = () => { const p = PLAN_STATE.pending; PLAN_STATE.pending = null; render(); toast(`Staying on ${TENANT.plan}${p ? '; the switch to ' + p + ' is cancelled' : ''}`, 'undo'); };
ACTIONS.planAddon = el => { const a = PLAN_ADDONS[+el.dataset.i]; a[2] = !a[2]; render(); toast(`${a[0]} ${a[2] ? 'added from the next bill' : 'removed from the next bill'}`); };
const PLAN_INVOICES = [['MQP/26-27/0811', '01 Nov', 11799], ['MQP/26-27/0702', '01 Oct', 11799], ['MQP/26-27/0598', '01 Sep', 11799], ['MQP/26-27/0477', '01 Aug', 7079]];
ACTIONS.planManage = () => openSheet({
  title: 'Billing', sub: `${TENANT.plan} plan · ${TENANT.legal}`,
  body: `<div class="label">Payment method</div>
    <div class="card mt-8"><div class="card-b row">${sx_iconTile(PLAN_STATE.pay === 'upi' ? 'zap' : 'card')}<div class="grow" style="min-width:0"><div class="strong">${PLAN_STATE.pay === 'upi' ? 'UPI AutoPay · marqa@hdfcbank' : 'Visa ending 4417'}</div><div class="small muted">${PLAN_STATE.pay === 'upi' ? 'Mandate up to ₹15,000 a month' : 'Expires 08/29'}</div></div><button class="btn sm" data-act="planPay">Use ${PLAN_STATE.pay === 'upi' ? 'a card' : 'UPI AutoPay'}</button></div></div>
    <div class="label mt-24">Billing details on the invoice</div>
    <div class="card mt-8"><div class="card-b fgrid"><label class="field full"><span>Legal name</span><input class="input" value="${esc(TENANT.legal)}"></label><label class="field"><span>GSTIN</span><input class="input num" value="${TENANT.gstin}"></label><label class="field"><span>Billing email</span><input class="input" value="accounts@example.com"></label>
      <div class="field full"><button class="btn sm" data-act="planDetails" style="align-self:flex-start">${icon('check', 'sm')}Save details</button></div></div></div>
    <div class="label mt-24">Invoices</div>
    <div class="card mt-8"><div class="list">${PLAN_INVOICES.map(([no, d, amt]) => `<div class="li" data-act="planInv" data-no="${no}"><div class="grow"><div class="t">${no}</div><div class="s">${d} · ${amt < 10000 ? 'Growth' : 'Brand'} plan + GST</div></div><span class="num strong">${inr(amt)}</span>${icon('download', 'sm')}</div>`).join('')}</div></div>`,
  foot: '<button class="btn" data-act="close">Done</button>'
});
ACTIONS.planPay = () => { PLAN_STATE.pay = PLAN_STATE.pay === 'upi' ? 'card' : 'upi'; ACTIONS.planManage(); toast(PLAN_STATE.pay === 'upi' ? 'UPI AutoPay set for the next bill' : 'Card ending 4417 set for the next bill', 'card'); };
ACTIONS.planDetails = () => toast('Billing details saved; the 1 Dec invoice uses them');
ACTIONS.planInv = el => toast(`${el.dataset.no}.pdf downloaded`, 'download');

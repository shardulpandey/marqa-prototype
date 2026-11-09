/* Demo data for the prototype. People, phone numbers and certificate numbers are
   fictional; rates are the live figures from early November 2026. */

const TODAY = new Date('2026-11-04T10:30:00+05:30');
const day = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; };

const TENANT = {
  name: 'MARQA', legal: 'MARQA Fine Lab-Grown Jewellery', plan: 'Brand', stores: ['Lajpat Nagar showroom', 'Online store'],
  city: 'New Delhi', gstin: '07ABCDE1234F1Z5', whatsapp: '+91 92 5625 5625', site: 'marqa.in'
};
const ME = { name: 'Riya Kapoor', role: 'Founder', initials: 'RK' };

const RATES = {
  // The live rate lives in SETTINGS (model.js); this getter keeps older readers in step with it.
  get gold24() { return typeof SETTINGS !== 'undefined' ? SETTINGS.gold_rate_24k : 14354; }, silver: 227.96, platinum: 3180, usd: 95.25, updated: '11:00 IST',
  history: [15689, 15702, 15640, 15598, 15655, 14354, 14354],
  purity: { '9K': 0.40, '14K': 0.61, '18K': 0.76, '22K': 0.92, 'PT950': 1, '925 Silver': 1 },
  making: 1400, silverMaking: 900, gst: 3, offerPct: 30, offerMin: 25000,
  diamond: [
    { band: 'Melee (under 0.10 ct)', rate: 12000 },
    { band: '0.10–0.29 ct', rate: 15500 },
    { band: '0.30–0.49 ct', rate: 18000 },
    { band: '0.50–0.99 ct', rate: 22000 },
    { band: '1.00–1.99 ct', rate: 28000 },
    { band: '2.00 ct and above', rate: 34000 }
  ],
  shapeFactor: { Round: 1, Oval: 1.05, Pear: 1.05, Marquise: 1.08, Emerald: 1.04, Princess: 1, Cushion: 1.03, Radiant: 1.03 }
};

const TEAM = [
  { id: 'u1', name: 'Riya Kapoor', role: 'Founder', initials: 'RK', color: '#1A1A1A' },
  { id: 'u2', name: 'Kabir Sethi', role: 'Sales', initials: 'KS', color: '#8C6D3F' },
  { id: 'u3', name: 'Neha Bansal', role: 'Operations', initials: 'NB', color: '#3A6597' },
  { id: 'u4', name: 'Arjun Mehra', role: 'Marketing', initials: 'AM', color: '#2E7A57' },
  { id: 'u5', name: 'Simran Gill', role: 'Sales', initials: 'SG', color: '#5E4FA2' }
];

const SOURCES = ['Walk-in', 'Instagram', 'Website', 'Shopify popup', 'WhatsApp', 'Referral', 'Wedding fair'];

/* Contacts now live in records.js (CONTACTS); CUSTOMERS is an alias set in logic.js. */

/* Karigars = the vendors picklist (OPTIONS.vendors), one card each. Jobs, metal and stones are read from
   DEALS (vendor, gold_issued_wt, QC weight) and STOCK_MOVES (vendor); only the profile lives here.
   ontime = their 90-day on-time rate; phone numbers are made up. */
const KARIGARS = [
  { id: 'k1', vendor: 'Ramesh Soni (casting)', name: 'Ramesh Soni', skill: 'Casting & finishing', city: 'Karol Bagh', phone: '+91 98110 40021', ontime: 92, hold_days: 10, color: '#8C6D3F' },
  { id: 'k2', vendor: 'Imran Qureshi (setting)', name: 'Imran Qureshi', skill: 'Diamond setting', city: 'Chandni Chowk', phone: '+91 98990 12455', ontime: 86, hold_days: 10, color: '#3A6597' },
  { id: 'k3', vendor: 'Sunil Verma (polish)', name: 'Sunil Verma', skill: 'Polishing & repairs', city: 'Karol Bagh', phone: '+91 99580 77310', ontime: 97, hold_days: 7, color: '#2E7A57' },
  { id: 'k4', vendor: 'Bablu Das (hand fabrication)', name: 'Bablu Das', skill: 'Hand fabrication', city: 'Kolkata (remote)', phone: '+91 98300 55102', ontime: 74, hold_days: 10, color: '#B0433A' },
  { id: 'k5', vendor: 'CAD Studio Jaipur', name: 'CAD Studio Jaipur', skill: 'CAD & 3D print', city: 'Jaipur', phone: '+91 94140 22987', ontime: 95, hold_days: 0, color: '#5E4FA2' },
  { id: 'k6', vendor: 'Shree Manufacturing, Mumbai', name: 'Shree Manufacturing', skill: 'Outsourced manufacturing', city: 'Mumbai', phone: '+91 98200 61144', ontime: 90, hold_days: 14, color: '#7D6238' }
];
/* Metal back from the bench at QC: [piece weight g, scrap + dust returned g]. Loss = issued − piece − scrap. */
const METAL_RETURNS = {
  'D-20261017-002': [2.66, 0.18], 'D-20261009-003': [5.0, 0.42], 'D-20261006-001': [2.92, 0.14],
  'D-20261003-002': [2.84, 0.10], 'D-20260924-001': [3.58, 0.28]
};

const THREADS = [
  { id: 't1', cust: 'c7', unread: 2, time: '10:24', ai: true, msgs: [
    { from: 'in', t: 'Hi! Saw your oval solitaire reel. Do you make something similar around 1.5 ct?', at: '10:18' },
    { from: 'out', ai: true, t: 'Hello Aditya, yes, we make every piece to order. A 1.5 ct oval lab-grown diamond in 18K starts at about ₹1.18 lakh including GST. Would you like a quick video call or a visit to our Lajpat Nagar showroom?', at: '10:19' },
    { from: 'in', t: 'Rose gold, hidden halo. Size 13 I think. Can you share options?', at: '10:23' },
    { from: 'in', img: IMG.rings[2].src, t: 'Something like this', at: '10:24' }
  ] },
  { id: 't2', cust: 'c10', unread: 1, time: '09:51', msgs: [
    { from: 'in', t: 'Salaam! Can you ship the eternity band to Dubai? Size US 6.5', at: '09:40' },
    { from: 'out', t: 'Yes, we ship insured to the UAE. US 6.5 is Indian size 11. Shall I send a quote in dollars?', at: '09:46' },
    { from: 'in', t: 'Yes please, and how long will it take?', at: '09:51' }
  ] },
  { id: 't3', cust: 'c9', unread: 0, time: 'Yesterday', msgs: [
    { from: 'out', t: 'Namaste Tara ji, the bridal set quote is ready. Sharing the PDF and CAD previews here.', at: 'Mon 18:02' },
    { from: 'in', t: 'नमस्ते, धन्यवाद। Necklace bahut sundar hai. Can we make the earrings a little smaller?', at: 'Mon 21:14' }
  ] },
  { id: 't4', cust: 'c1', unread: 0, time: 'Yesterday', msgs: [
    { from: 'out', t: 'Your solitaire is now with our setter. Photos by Friday.', at: 'Mon 12:10' },
    { from: 'in', t: 'Lovely, thank you! Also send me some pendant options to match.', at: 'Mon 12:30' }
  ] },
  { id: 't5', cust: 'c8', unread: 0, time: '09:13', ai: true, msgs: [
    { from: 'in', t: 'Submitted a custom request on your website for a name pendant.', at: '09:12' },
    { from: 'out', ai: true, t: 'Thank you Ishita! We have your request. A pear diamond name pendant in 14K is usually ₹38–48k. A designer will WhatsApp you a sketch within a day.', at: '09:13' }
  ] },
  { id: 't6', cust: 'c11', unread: 0, time: 'Sun', msgs: [
    { from: 'in', t: 'Is the tennis bracelet possible before 11 Nov?', at: 'Sun 11:00' },
    { from: 'out', t: 'Yes if we confirm by Wednesday. Quote attached.', at: 'Sun 11:20' }
  ] }
];

/* Custom-order requests from the Shopify popup. A request that became an enquiry carries its deal;
   the estimate is priced from the rate sheet (computeLive) when the screen renders. */
const ONLINE_REQS = [
  { id: 'W-311', cust: 'c8', deal: 'D-20261104-002', what: 'Name pendant with a pear diamond', item_type: 'Pendant', purity: '14K', colour: 'Rose', wt: 1.8, lines: [['Pear', 1, 0.30, 'VS-FG']], extra: 0,
    size: 'Not applicable', budget: 45000, needed: 'Before 20 Nov', note: 'Name "Ishita" in script; the pear sits as the dot of the i. Reference photo attached.', when: 'Today 09:12', status: 'New', img: IMG.pendants[1].src },
  { id: 'W-310', name: 'Mehak S.', phone: '+91 99877 40210', city: 'Gurugram', what: 'Ring like RR-049, in platinum', item_type: 'Ring', purity: 'PT950', colour: '', wt: 4.6, lines: [['Round', 1, 1.00, 'VS-FG'], ['Round', 18, 0.36, 'VS-FG']], extra: 0,
    size: 'US 6', budget: 90000, needed: 'December', note: 'Likes RR-049 but wants platinum and a slightly lower setting.', when: 'Yesterday', status: 'New', img: IMG.rings[3].src },
  { id: 'W-309', cust: 'c4', deal: 'D-20261009-003', what: 'Stackable bands, set of three', item_type: 'Ring', purity: '9K', colour: 'Yellow', wt: 5.1, lines: [['Round', 60, 0.60, 'VS-GH']], extra: 0,
    size: 'Ring 11', budget: 30000, needed: 'No date', note: 'Wants 9K to keep it under ₹30k; one band each in yellow, white and rose.', when: '10 Oct', status: 'Converted', img: IMG.rings[4].src },
  { id: 'W-308', name: 'Zoya K.', phone: '+91 98201 33745', city: 'Mumbai', what: 'Earrings ER-044 with emeralds instead of rubies', item_type: 'Earrings / Studs', purity: '18K', colour: 'Yellow', wt: 3.4, lines: [['Round', 24, 0.48, 'VS-FG']], extra: 18000,
    size: 'Not applicable', budget: 70000, needed: 'Before 15 Dec', note: 'Two emerald drops, about 0.6 ct each, in place of the rubies.', when: 'Sun', status: 'Replied', img: IMG.earrings[4].src }
];

const CAMPAIGNS = [
  { id: 'cp1', name: 'Diwali: 30% off diamond value', type: 'Broadcast', audience: 'All opted-in clients', sent: 1840, read: 1412, replies: 214, orders: 19, revenue: 1820000, status: 'Completed', date: '18 Oct', tpl: 'P7' },
  { id: 'cp2', name: 'Wedding season lookbook', type: 'Broadcast', audience: 'Bridal enquiries, last 12 months', sent: 0, read: 0, replies: 0, orders: 0, revenue: 0, status: 'Scheduled', date: '10 Nov, 11:00' },
  { id: 'cp3', name: 'Anniversary greetings', type: 'Automation', audience: 'Clients with an anniversary in 7 days', sent: 46, read: 41, replies: 12, orders: 3, revenue: 214000, status: 'Running', date: 'Always on', tpl: 'P6' },
  { id: 'cp4', name: 'Follow up quotes after 48 hours', type: 'Automation', audience: 'Quoted, no reply in 48 h', sent: 128, read: 109, replies: 37, orders: 9, revenue: 742000, status: 'Running', date: 'Always on', tpl: 'L4' }
];

/* Gold savings scheme: members are contacts. paid = instalments paid of 11; the 12th is the brand's. */
const SCHEME = {
  name: 'MARQA Gold Saver (11 + 1)', members: 64, monthly: 640000, maturing: 7,
  list: [
    { contact: 'c4', name: 'Kavya Reddy', inst: 5000, paid: 8, due: day(3), status: 'On track', since: 'Mar 2026' },
    { contact: 'c11', name: 'Harsh Agarwal', inst: 10000, paid: 11, due: day(26), status: 'Ready to redeem', since: 'Dec 2025' },
    { contact: 'c6', name: 'Sneha Joshi', inst: 3000, paid: 4, due: day(-6), status: 'Missed', since: 'Jun 2026' },
    { contact: 'c12', name: 'Diya Menon', inst: 5000, paid: 2, due: day(9), status: 'On track', since: 'Sep 2026' }
  ]
};

/* Invoices. The seeded ones belong to delivered deals and read their figures from the deal;
   counter sales (Billing) add plain rows with the same fields. */
const INV_FROM_DEAL = (no, dealId) => ({
  no, deal: dealId, kind: 'Order',
  get d() { return DEALS.find(x => x.id === this.deal); },
  get cust() { return this.d.contact; }, get item() { return this.d.item_label || this.d.item; }, get huid() { return this.d.huid || ''; },
  get total() { return Math.round(this.d.est_cost || this.d.calc.total); }, get taxable() { return Math.round(this.total / (1 + (this.d.gst_pct || 3) / 100)); }, get gst() { return this.total - this.taxable; },
  get mode() { return [...new Set(this.d.payments.filter(p => p.kind !== 'Refund').map(p => p.mode))].join(' + '); },
  get at() { return this.d.invoice_date; }, get date() { return this.d.invoice_date ? fdate(this.d.invoice_date) : ''; }
});
const INVOICES = [INV_FROM_DEAL('INV/26-27/0418', 'D-20261003-002'), INV_FROM_DEAL('INV/26-27/0417', 'D-20261027-005'), INV_FROM_DEAL('INV/26-27/0416', 'D-20260924-001')];

/* Bell notifications; each opens the record it is about. */
const NOTIFS = [
  { icon: 'alert', t: 'SO-1039 tennis bracelet is a day past its promised date', s: 'Ramesh Soni · casting · Vikram Chawla', go: '#/deal/D-20261008-002/order', tone: 'red', at: '9:05' },
  { icon: 'sparkles', t: 'AI replied to Aditya Khanna on WhatsApp', s: 'Review the reply, then send the quote', go: '#/inbox/t1', tone: 'gold', at: '10:19' },
  { icon: 'store', t: 'New custom request from your Shopify store', s: 'Ishita Verma · name pendant · ₹45k · W-311', go: '#/deal/D-20261104-002', tone: 'blue', at: '9:12' },
  { icon: 'scale', t: 'Ramesh Soni holds 26.7 g of 18K across 2 jobs', s: 'Metal balance · one job is late', go: '#/production/k1', tone: 'amber', at: 'Yesterday' },
  { icon: 'coins', t: 'Advance due today from Vikram Chawla', s: 'Solitaire studs · confirm the order after it lands', go: '#/deal/D-20261102-001/billing', tone: 'green', at: 'Yesterday' }
];

const REPORT = {
  months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  revenue: [1840000, 2210000, 1960000, 2780000, 4120000, 960000],
  funnel: [ ['Enquiries', 186], ['Contacted', 152], ['Quoted', 98], ['Advance paid', 41], ['Delivered', 33] ],
  sources: [ ['Instagram', 58, 14, 1620000], ['Walk-in', 41, 12, 1380000], ['Referral', 22, 8, 1910000], ['Website', 31, 4, 410000], ['Shopify popup', 19, 3, 205000], ['Wedding fair', 15, 2, 560000] ]
};

const WORKFLOW_TEMPLATES = [
  { id: 'bespoke', name: 'Bespoke and bridal', note: 'CAD, client approval, casting, setting, QC. The MARQA default.' },
  { id: 'labgrown', name: 'Lab-grown diamond brand', note: 'Adds certificate checks and stone reservation before casting.' },
  { id: 'manufacturer', name: 'Karigar-led manufacturer', note: 'Job sheets and metal balances per karigar, simpler client steps.' },
  { id: 'retail', name: 'Retail showroom', note: 'Stock sales first, with custom orders as a side flow.' }
];

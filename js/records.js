/* The records behind the live-app screens: people, contacts, deals (one record from enquiry to delivery),
   stock and its ledger, audit, trash, imports. Every name, number and certificate here is made up.
   logic.js fills the derived fields (quote maths, balance, checklists, timeline) when it loads. */

// The prototype lives on 4 Nov 2026; anything done in it happens "now" on that day, moving with the real clock.
const BOOT = Date.now(), NOW = () => new Date(TODAY.getTime() + (Date.now() - BOOT));
const at = (d, hm) => { const x = day(d); const [h, m] = (hm || '11:00').split(':'); x.setHours(+h, +m, 0, 0); return x; };

/* ---------- people (four roles) ---------- */
const USERS = [
  { id: 'u1', username: 'riya', name: 'Riya Kapoor', role: 'founders', home_source: 'Walk-in', active: 1, last_login: at(0, '09:02'), initials: 'RK', color: '#1A1A1A' },
  { id: 'u6', username: 'aman', name: 'Aman Kapoor', role: 'founders', home_source: 'Walk-in', active: 1, last_login: at(-1, '18:40'), initials: 'AK', color: '#7D6238' },
  { id: 'u2', username: 'kabir', name: 'Kabir Sethi', role: 'sales', home_source: 'Walk-in', active: 1, last_login: at(0, '10:01'), initials: 'KS', color: '#8C6D3F', note: 'Showroom iPad' },
  { id: 'u5', username: 'simran', name: 'Simran Gill', role: 'sales', home_source: 'Instagram', active: 1, last_login: at(0, '09:40'), initials: 'SG', color: '#5E4FA2' },
  { id: 'u3', username: 'neha', name: 'Neha Bansal', role: 'ops', home_source: '', active: 1, last_login: at(0, '08:55'), initials: 'NB', color: '#3A6597' },
  { id: 'u4', username: 'arjun', name: 'Arjun Mehra', role: 'marketing', home_source: 'Meta ad', active: 1, last_login: at(-2, '17:15'), initials: 'AM', color: '#2E7A57' },
  { id: 'u7', username: 'tanya', name: 'Tanya Arora', role: 'sales', home_source: 'Exhibition', active: 0, last_login: at(-41, '12:00'), initials: 'TA', color: '#8A847B', note: 'Left in September' }
];
const userById = id => USERS.find(u => u.id === id) || { name: '—', initials: '—', color: '#8A847B', role: '' };

/* ---------- contacts ---------- */
const C = (id, name, phone, city, extra) => Object.assign({ id, name, phone, city, state: '', country: 'India', email: '', instagram: '', phone_alt: '', tags: [], lifecycle: 'Inq', met_in_person: 0, birthday: null, anniversary: null, consent_marketing: 1, notes: '', created_at: at(-30) }, extra);
const CONTACTS = [
  C('c1', 'Ananya Iyer', '+91 98110 24567', 'Delhi', { email: 'ananya.iyer@example.com', instagram: '@ananya.iyer', source_channel: 'Instagram', source_code: 'IG DM', tags: ['REPEAT', 'VIP'], lifecycle: 'Cust', met_in_person: 1, anniversary: '2019-11-18', birthday: '1992-03-09', created_at: at(-240), color: '#8C6D3F' }),
  C('c2', 'Rohan & Meera Malhotra', '+91 99580 31122', 'Gurugram', { email: 'meera.malhotra@example.com', source_channel: 'Exhibition', source_code: 'BRIDAL_FAIR_OCT26', lifecycle: 'Cust', met_in_person: 1, created_at: at(-28), color: '#3A6597' }),
  C('c3', 'Priya Nair', '+44 7700 900412', 'London', { country: 'United Kingdom', email: 'priya.nair@example.com', source_channel: 'Website', source_code: 'WEB', tags: ['NRI'], lifecycle: 'Cust', anniversary: '2015-01-02', created_at: at(-52), color: '#5E4FA2' }),
  C('c4', 'Kavya Reddy', '+91 97170 88214', 'Noida', { email: 'kavya.r@example.com', source_channel: 'Website', source_code: 'WEB', tags: ['REPEAT'], lifecycle: 'Cust', met_in_person: 1, created_at: at(-150), color: '#2E7A57' }),
  C('c5', 'Vikram Chawla', '+91 98731 50098', 'Delhi', { email: 'vikram@example.com', source_channel: 'Referral', source_code: 'REF', tags: ['REPEAT', 'VIP', 'BNI'], lifecycle: 'Cust', met_in_person: 1, anniversary: '2004-12-25', created_at: at(-300), color: '#B0433A' }),
  C('c6', 'Sneha Joshi', '+91 88265 70031', 'Faridabad', { source_channel: 'Walk-in', source_code: 'WALKIN', lifecycle: 'Cust', met_in_person: 1, consent_marketing: 0, created_at: at(-90), color: '#A86F14' }),
  C('c7', 'Aditya Khanna', '+91 99990 12873', 'Delhi', { instagram: '@adityak', source_channel: 'Instagram', source_code: 'IG DM', created_at: at(0, '10:18'), color: '#1A1A1A' }),
  C('c8', 'Ishita Verma', '+91 95600 44120', 'Ghaziabad', { email: 'ishita.v@example.com', source_channel: 'Website', source_code: 'WEB', created_at: at(0, '09:12'), color: '#3A6597' }),
  C('c9', 'Neeraj & Tara Bhatia', '+91 98100 77651', 'Delhi', { source_channel: 'Referral', source_code: 'REF', met_in_person: 1, notes: 'Referred by Vikram Chawla.', created_at: at(-6), color: '#8C6D3F' }),
  C('c10', 'Fatima Sheikh', '+971 50 123 4567', 'Dubai', { country: 'United Arab Emirates', instagram: '@fatima.sk', source_channel: 'Meta ad', source_code: 'AD_SOLI_NOV26', tags: ['NRI'], created_at: at(-2, '09:40'), color: '#2E7A57' }),
  C('c11', 'Harsh Agarwal', '+91 99106 33218', 'Delhi', { email: 'harsh.agarwal@example.com', source_channel: 'Walk-in', source_code: 'WALKIN', tags: ['REPEAT'], lifecycle: 'Cust', met_in_person: 1, anniversary: '2016-11-11', created_at: at(-270), color: '#5E4FA2' }),
  C('c12', 'Diya Menon', '+91 90044 21987', 'Bengaluru', { email: 'diya.menon@example.com', source_channel: 'Website', source_code: 'WEB', lifecycle: 'Cust', created_at: at(-60), color: '#B0433A' }),
  C('c13', 'Mohit Arora', '+91 98185 44302', 'Gurugram', { source_channel: 'Google', source_code: 'GMB CALL', created_at: at(-1, '16:40'), color: '#3A6597' }),
  C('c14', 'Karan Malhotra', '+91 98995 10077', 'Delhi', { source_channel: 'Walk-in', source_code: 'WALKIN', met_in_person: 1, created_at: at(-4, '17:30'), color: '#8C6D3F' }),
  C('c15', 'Rhea Singh', '+91 99711 80443', 'Noida', { email: 'rhea.singh@example.com', source_channel: 'Instagram', source_code: 'IG DM', lifecycle: 'Lost', created_at: at(-20), color: '#A86F14' }),
  C('c16', 'Pooja Sharma', '+91 98912 66105', 'Delhi', { source_channel: 'Google', source_code: 'GMB MSG', lifecycle: 'Inq', created_at: at(-31), color: '#5E4FA2' })
];
const contactById = id => CONTACTS.find(c => c.id === id);

/* ---------- deals ----------
   One record from enquiry to delivery. hist = stage path [stage, day, time]; pays = [kind, amount, mode, ref, day];
   tpl = template keys sent [key, day]; ticks = manual checklist ticks by stage; acts = extra timeline entries. */
const L = (shape, pcs, ct, quality, rate, size_mm, setting, cert_no) => ({ shape, pcs, ct, quality: quality || 'VS-FG', rate: rate || null, size_mm: size_mm || '', setting: setting || '', cert_no: cert_no || '' });
const DEALS = [
  /* ---- lead stages ---- */
  { id: 'D-20261104-003', legacy: 'E-2291', contact: 'c7', type: 'Sale', stage: 'New', owner: 'u2', source_channel: 'Instagram', source_code: 'IG DM', product_interest: 'Engagement ring', occasion: 'Engagement', budget: 150000, timeline: 'This month',
    enquiry: at(0, '10:18'), next_action_at: at(0, '13:00'), next_action: 'Share three oval options with prices', img: IMG.rings[2].src, thread: 't1',
    notes: 'Saw the oval solitaire reel. Wants rose gold, hidden halo, around 1.5 ct. Thinks he is size 13.',
    hist: [['New', 0, '10:18']], tpl: [['L1', 0, '10:19', 'AI assistant']] },
  { id: 'D-20261104-002', legacy: 'E-2290', contact: 'c8', type: 'Sale', stage: 'New', owner: 'u5', source_channel: 'Website', source_code: 'WEB', product_interest: 'Pendant', occasion: 'Gift', budget: 45000, timeline: 'This month',
    enquiry: at(0, '09:12'), next_action_at: at(0, '11:00'), next_action: 'First follow-up', img: IMG.pendants[1].src, thread: 't5',
    notes: 'Custom request from the website popup: name pendant with a small pear diamond, 14K rose. Reference photo attached.', hist: [['New', 0, '09:12']] },
  { id: 'D-20261103-006', contact: 'c13', type: 'Sale', stage: 'New', owner: 'u2', source_channel: 'Google', source_code: 'GMB CALL', product_interest: 'Solitaire studs', occasion: 'Self-purchase', budget: 80000, timeline: 'Just exploring',
    enquiry: at(-1, '16:40'), next_action_at: at(-1, '17:40'), next_action: 'Call back: missed call from Google listing', img: IMG.earrings[0].src, hist: [['New', -1, '16:40']] },
  { id: 'D-20261102-004', legacy: 'E-2286', contact: 'c10', type: 'Bespoke', stage: 'Contacted', owner: 'u2', source_channel: 'Meta ad', source_code: 'AD_SOLI_NOV26', product_interest: 'Bespoke', occasion: 'Anniversary', budget: 171000, timeline: 'This month',
    enquiry: at(-2, '09:40'), next_action_at: at(0, '15:00'), next_action: 'Send the USD quote for the eternity band', img: IMG.rings[1].src, thread: 't2', size_client: 'US 6.5',
    notes: 'Eternity band for their 10th anniversary, ships to Dubai. Asked about export paperwork.',
    hist: [['New', -2, '09:40'], ['Contacted', -2, '09:46']], tpl: [['L1', -2, '09:46']] },
  { id: 'D-20261103-002', legacy: 'E-2276', contact: 'c1', type: 'Sale', stage: 'Contacted', owner: 'u1', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Pendant', occasion: 'Self-purchase', budget: 90000, timeline: '1–3 months',
    enquiry: at(-1, '12:30'), next_action_at: at(1, '11:00'), next_action: 'Send pendant options that match her solitaire', img: IMG.pendants[0].src, thread: 't4',
    hist: [['New', -1, '12:30'], ['Contacted', -1, '12:40']], tpl: [['L2', -1, '12:40']], ticks: { Contacted: ['consult_offered'] } },
  { id: 'D-20261031-003', contact: 'c14', type: 'Sale', stage: 'Qualified', owner: 'u5', source_channel: 'Walk-in', source_code: 'WALKIN', product_interest: 'Engagement ring', occasion: 'Engagement', budget: 200000, timeline: '1–3 months',
    enquiry: at(-4, '17:30'), next_action_at: at(1, '12:00'), next_action: 'Build the quote: 1.5 ct round, platinum', img: IMG.rings[3].src, met: 1,
    notes: 'Walked in with his sister. Liked the 1.5 ct round in platinum; ring size from a borrowed ring, Indian 14.',
    hist: [['Contacted', -4, '17:30'], ['Qualified', -3, '11:10']], acts: [['visit', 'in', 'Met in person: Walk-in', 'Showroom visit, 40 minutes.', -4, '17:30']] },

  /* ---- quote stages ---- */
  { id: 'D-20261101-005', legacy: 'E-2288', contact: 'c9', type: 'Bespoke', stage: 'Quoted', owner: 'u1', source_channel: 'Referral', source_code: 'REF', product_interest: 'Bridal set', occasion: 'Wedding', budget: 650000, timeline: '1–3 months',
    enquiry: at(-5, '15:00'), next_action_at: at(1, '11:00'), next_action: 'Follow up on the quote: smaller earrings?', img: IMG.necklaces[1].src, thread: 't3', met: 1,
    quote: { no: 'MQ-20261102-004', date: -2, version: 1, shared: ['whatsapp', -2, '18:02'], item: 'Bridal set: necklace, drop earrings, two bands', label: 'Bridal set in 18K yellow gold', item_type: 'Bridal set', size: 'Not applicable', purity: '18K', colour: 'Yellow', wt: 38.5, rate24: 15650,
      lines: [L('Round', 64, 6.10, 'VS-FG', null, '2.9', 'Prong'), L('Pear', 2, 1.20, 'VVS-EF', null, '7x5', 'Halo'), L('Round', 120, 1.80, 'VS-FG', null, '1.3', 'Micro pavé')] },
    hist: [['New', -5, '15:00'], ['Contacted', -5, '15:20'], ['Qualified', -4, '12:00'], ['Quoted', -2, '18:02']], tpl: [['L1', -5, '15:20'], ['L3', -2, '18:02']], ticks: { Contacted: ['consult_offered'] },
    acts: [['visit', 'in', 'Visited the showroom with family', 'Saw graduated rounds; prefers yellow gold. Wedding on 14 Feb 2027.', -4, '12:00'], ['whatsapp', 'in', 'They replied', 'Necklace bahut sundar hai. Can we make the earrings a little smaller?', -2, '21:14']] },
  { id: 'D-20261101-002', legacy: 'E-2281', contact: 'c11', type: 'Sale', stage: 'Quoted', owner: 'u2', source_channel: 'Walk-in', source_code: 'WALKIN', product_interest: 'Bracelet', occasion: 'Anniversary', budget: 180000, timeline: 'This week',
    enquiry: at(-5, '18:00'), next_action_at: at(0, '12:00'), next_action: 'Re-price at today\'s rate and re-share', img: IMG.bracelets[1].src, thread: 't6', met: 1,
    quote: { no: 'MQ-20261101-001', date: -3, version: 1, shared: ['whatsapp', -3, '11:20'], item: 'Tennis bracelet, 4-prong, 42 rounds', label: 'Tennis bracelet in 18K white gold', item_type: 'Bracelet', size: 'Free size', purity: '18K', colour: 'White', wt: 9.8, rate24: 15650,
      lines: [L('Round', 42, 4.20, 'VS-FG', null, '3.0', 'Prong')] },
    hist: [['Contacted', -5, '18:00'], ['Qualified', -5, '18:30'], ['Quoted', -3, '11:20']], tpl: [['L3', -3, '11:20']], ticks: { Contacted: ['consult_offered'] },
    acts: [['visit', 'in', 'Met in person: Walk-in', 'Anniversary on 11 Nov; wants it before then.', -5, '18:00']] },
  { id: 'D-20261030-002', legacy: 'E-2284', contact: 'c6', type: 'Sale', stage: 'Negotiating', owner: 'u5', source_channel: 'Walk-in', source_code: 'WALKIN', product_interest: 'Solitaire studs', occasion: 'Self-purchase', budget: 60000, timeline: 'This month',
    enquiry: at(-6, '13:00'), next_action_at: at(0, '16:00'), next_action: 'Call: 14K or 18K white?', img: IMG.earrings[0].src, met: 1, competitor: 'Online lab-grown brand',
    quote: { no: 'MQ-20261030-002', date: -1, version: 2, shared: ['pdf', -1, '17:05'], item: 'Solitaire studs, 2 × 0.50 ct round', label: '1 ct total solitaire studs, 14K white', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '14K', colour: 'White', wt: 2.4, rate24: 14354,
      lines: [L('Round', 2, 1.00, 'VS-FG', null, '5.1', 'Prong')] },
    hist: [['Contacted', -6, '13:00'], ['Qualified', -6, '13:30'], ['Quoted', -5, '17:00'], ['Negotiating', -2, '12:00']], tpl: [['L3', -5, '17:00'], ['L4', -2, '11:00']], ticks: { Contacted: ['consult_offered'], Negotiating: ['objection_noted'] },
    acts: [['call', 'in', 'They replied', 'Comparing with an online brand; asked whether 18K is worth the difference.', -2, '12:00'], ['quote', 'out', 'Quote re-priced v2 at 24K ₹14,354/g', '', -1, '17:00']] },
  { id: 'D-20261102-001', contact: 'c5', type: 'Sale', stage: 'Negotiating', owner: 'u1', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Solitaire studs', occasion: 'Birthday', budget: 120000, timeline: 'This month',
    enquiry: at(-2, '11:00'), next_action_at: at(0, '17:00'), next_action: 'Collect the advance; then confirm the order', img: IMG.earrings[1].src, met: 1,
    quote: { no: 'MQ-20261103-001', date: -1, version: 1, shared: ['in_store', -1, '16:30'], item: 'Solitaire studs, 2 × 1.00 ct round, 4-prong', label: '2 ct total solitaire studs, 18K white', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '18K', colour: 'White', wt: 3.2, rate24: 14354,
      lines: [L('Round', 2, 2.00, 'VVS-EF', null, '6.4', 'Prong')] },
    promised: 21, terms: '50% advance, balance on delivery', design_spec: 'Classic 4-prong basket, screw backs.',
    hist: [['Contacted', -2, '11:00'], ['Qualified', -2, '11:20'], ['Quoted', -1, '16:30'], ['Negotiating', -1, '16:45']], ticks: { Contacted: ['consult_offered'], Negotiating: ['objection_noted', 'client_accepted'] },
    acts: [['visit', 'in', 'Visited', 'Wife\'s birthday on 28 Nov. Agreed the price in the showroom; advance by bank transfer tomorrow.', -1, '16:30']] },

  /* ---- order stages ---- */
  { id: 'D-20261024-001', legacy: 'MQ-1036', contact: 'c5', type: 'Bespoke', stage: 'Order Confirmed', owner: 'u1', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Engagement ring', occasion: 'Anniversary', budget: 140000,
    enquiry: at(-11, '12:00'), next_action_at: at(0, '14:00'), next_action: 'Assign the vendor and issue the order sheet', img: IMG.rings[3].src, met: 1,
    quote: { no: 'MQ-20261101-003', date: -3, version: 2, shared: ['in_store', -3, '15:00'], item: 'Emerald-cut three-stone ring with tapered baguettes', label: 'Three-stone emerald cut, platinum', item_type: 'Ring', size: 'Ring 14', purity: 'PT950', colour: '', wt: 6.2, rate24: 3180,
      lines: [L('Emerald', 1, 2.40, 'VVS-EF', null, '9.1x6.6', 'Prong', 'LG601127764'), L('Baguette', 2, 0.42, 'VS-FG', null, '', '')] },
    order_no: 'SO-1036', ordered: -2, promised: 26, terms: '30% advance, balance on delivery', design_spec: 'Platinum three-stone; emerald centre, tapered baguettes either side, low cathedral setting.', special_requests: 'Engrave "V & S · 20 yrs" inside the band.', premium: 1,
    hist: [['Contacted', -11, '12:00'], ['Qualified', -10, '12:00'], ['Quoted', -3, '15:00'], ['Negotiating', -3, '15:30'], ['Order Confirmed', -2, '11:00']], pays: [['Advance', 0.3, 'Bank transfer', 'NEFT HDFCN26305512', -2]], tpl: [['B1', -2, '11:20']] },
  { id: 'D-20261019-003', legacy: 'MQ-1032', contact: 'c11', type: 'Sale', stage: 'CAD In Progress', owner: 'u2', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Pendant', occasion: 'Gift', budget: 40000,
    enquiry: at(-16, '16:00'), next_action_at: at(1, '11:00'), next_action: 'Tell the client when the CAD lands', img: IMG.pendants[2].src,
    quote: { no: 'MQ-20261027-002', date: -8, version: 1, shared: ['whatsapp', -8, '12:00'], item: 'Initial "A" pendant, pavé, 16 in chain', label: 'Initial pendant, pavé, 14K rose', item_type: 'Pendant', size: 'Not applicable', purity: '14K', colour: 'Rose', wt: 2.2, rate24: 15600,
      lines: [L('Round', 32, 0.32, 'VS-FG', null, '1.2', 'Pavé')] },
    order_no: 'SO-1032', ordered: -6, promised: 16, terms: '30% advance, balance on delivery', vendor: 'CAD Studio Jaipur', design_spec: 'Serif "A", 14 mm tall, pavé on the front face only.', pd_issued: -5, chain_length: '16 in',
    hist: [['Quoted', -8, '12:00'], ['Negotiating', -7, '10:00'], ['Order Confirmed', -6, '12:00'], ['CAD In Progress', -5, '11:00']], pays: [['Advance', 0.3, 'UPI', 'UPI 330918227714', -6]], tpl: [['L3', -8, '12:00'], ['O1', -6, '12:10']],
    ticks: { 'CAD In Progress': ['design_briefed'] } },
  { id: 'D-20261012-001', legacy: 'MQ-1041', contact: 'c2', type: 'Bespoke', stage: 'CAD Sent', owner: 'u1', source_channel: 'Exhibition', source_code: 'BRIDAL_FAIR_OCT26', product_interest: 'Necklace', occasion: 'Wedding', budget: 400000,
    enquiry: at(-23, '14:00'), next_action_at: at(1, '18:00'), next_action: 'Feedback on CAD v2 due', img: IMG.necklaces[1].src, met: 1,
    quote: { no: 'MQ-20261020-001', date: -15, version: 2, shared: ['in_store', -15, '17:00'], item: 'Bridal necklace, graduated rounds, 16 in', label: 'Graduated diamond necklace, 18K yellow', item_type: 'Necklace', size: 'Not applicable', purity: '18K', colour: 'Yellow', wt: 21.8, rate24: 15800,
      lines: [L('Round', 61, 6.10, 'VS-FG', null, '2.8–4.1', 'Prong')] },
    order_no: 'SO-1041', ordered: -14, promised: 38, terms: '30% advance, balance on delivery', vendor: 'CAD Studio Jaipur', design_spec: 'Graduated rounds 2.8 to 4.1 mm, box clasp with safety, 16 in.', pd_issued: -13, cad_revisions: 1, chain_length: '16 in',
    hist: [['Quoted', -15, '17:00'], ['Negotiating', -15, '17:30'], ['Order Confirmed', -14, '12:00'], ['CAD In Progress', -13, '11:00'], ['CAD Sent', -9, '17:00'], ['CAD Sent', -3, '18:00']], pays: [['Advance', 0.3, 'Bank transfer', 'IMPS 430812', -14]], tpl: [['O1', -14, '12:30'], ['O2', -9, '17:00'], ['O2', -3, '18:00']],
    ticks: { 'CAD In Progress': ['design_briefed', 'cad_eta_told'], 'CAD Sent': ['feedback_deadline'] }, acts: [['whatsapp', 'in', 'They replied', 'Can the centre stones go a little bigger? Otherwise perfect.', -8, '20:00']] },
  { id: 'D-20261016-002', legacy: 'MQ-1037', contact: 'c11', type: 'Sale', stage: 'CAD Approved', owner: 'u2', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Solitaire studs', occasion: 'Anniversary', budget: 95000,
    enquiry: at(-19, '12:00'), next_action_at: at(0, '17:00'), next_action: 'Issue metal and stones; start casting', img: IMG.earrings[1].src,
    quote: { no: 'MQ-20261018-003', date: -17, version: 1, shared: ['pdf', -17, '13:00'], item: 'Halo studs, 0.50 ct centres', label: 'Halo studs in 18K white', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '18K', colour: 'White', wt: 3.9, rate24: 15800,
      lines: [L('Round', 2, 1.00, 'VS-FG', null, '5.1', 'Prong'), L('Round', 36, 0.10, 'VS-FG', null, '1.0', 'Micro pavé')] },
    order_no: 'SO-1037', ordered: -16, promised: 12, terms: '30% advance, balance on delivery', vendor: 'Ramesh Soni (casting)', design_spec: 'Round halo, 0.50 ct centres, screw backs.', pd_issued: -15, post_type: 'Screw back (Bombay)',
    hist: [['Quoted', -17, '13:00'], ['Negotiating', -16, '10:00'], ['Order Confirmed', -16, '15:00'], ['CAD In Progress', -15, '11:00'], ['CAD Sent', -11, '18:00'], ['CAD Approved', -1, '12:00']], pays: [['Advance', 0.3, 'Card', 'POS 7781', -16]], tpl: [['O1', -16, '15:10'], ['O2', -11, '18:00'], ['O3', -1, '12:20']],
    ticks: { 'CAD Approved': ['final_cad_filed', 'production_briefed'] } },
  { id: 'D-20261019-001', legacy: 'MQ-1042', contact: 'c1', type: 'Bespoke', stage: 'In Production', production_stage: 'Setting', owner: 'u1', source_channel: 'Instagram', source_code: 'IG DM', product_interest: 'Engagement ring', occasion: 'Self-purchase', budget: 130000,
    enquiry: at(-16, '19:00'), next_action_at: at(1, '12:00'), next_action: 'Send setting photos (O4)', img: IMG.rings[0].src, thread: 't4',
    quote: { no: 'MQ-20261020-002', date: -15, version: 2, shared: ['whatsapp', -15, '13:00'], item: 'Oval solitaire, hidden halo, cathedral shank', label: '1.52 ct oval solitaire with hidden halo, 18K rose', item_type: 'Engagement ring', size: 'Ring 12', purity: '18K', colour: 'Rose', wt: 3.4, rate24: 15800,
      lines: [L('Oval', 1, 1.52, 'VVS-EF', 26400, '8.6x6.1', 'Prong', 'LG620419872'), L('Round', 22, 0.28, 'VS-FG', null, '1.3', 'Pavé')] },
    order_no: 'SO-1042', ordered: -13, promised: 5, terms: '30% advance, balance on delivery', vendor: 'Imran Qureshi (setting)', design_spec: 'Oval 1.52 ct on four claws, hidden halo of 22 rounds, cathedral shank.', pd_issued: -12, karigar_photo: 1, gold_issued: [4.10, -2], diamonds_issued: [23, 1.80, -1, ['LG620419872', 'ML-14']],
    hist: [['Quoted', -15, '13:00'], ['Negotiating', -14, '11:00'], ['Order Confirmed', -13, '12:00'], ['CAD In Progress', -12, '10:00'], ['CAD Sent', -9, '18:00'], ['CAD Approved', -4, '12:00'], ['In Production', -2, '11:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 330412889012', -13]], tpl: [['O1', -13, '12:10'], ['O2', -9, '18:00'], ['O3', -4, '12:30']] },
  { id: 'D-20261008-002', legacy: 'MQ-1039', contact: 'c5', type: 'Sale', stage: 'In Production', production_stage: 'Casting', owner: 'u1', source_channel: 'Referral', source_code: 'REF', product_interest: 'Bracelet', occasion: 'Gift', budget: 320000,
    enquiry: at(-27, '12:00'), next_action_at: at(-1, '11:00'), next_action: 'Re-promise: casting late at Ramesh Soni', img: IMG.bracelets[0].src, urgent: 1,
    quote: { no: 'MQ-20261010-001', date: -25, version: 1, shared: ['in_store', -25, '16:00'], item: 'Tennis bracelet, 4-prong, 48 rounds, 6.75 in', label: 'Tennis bracelet, 7.20 ct, 18K white', item_type: 'Bracelet', size: 'Free size', purity: '18K', colour: 'White', wt: 11.2, rate24: 15900,
      lines: [L('Round', 48, 7.20, 'VS-FG', null, '3.4', 'Prong')] },
    order_no: 'SO-1039', ordered: -24, promised: -1, terms: '30% advance, balance on delivery', vendor: 'Ramesh Soni (casting)', design_spec: '48 × 0.15 ct rounds, 4-prong links, box clasp with two safeties, 6.75 in.', pd_issued: -23, karigar_photo: 1, gold_issued: [11.6, -6], diamonds_issued: [48, 7.20, -6, ['ML-15']],
    hist: [['Quoted', -25, '16:00'], ['Negotiating', -25, '16:30'], ['Order Confirmed', -24, '12:00'], ['CAD In Progress', -23, '11:00'], ['CAD Sent', -19, '18:00'], ['CAD Approved', -9, '12:00'], ['In Production', -6, '11:00']],
    pays: [['Advance', 0.3, 'Bank transfer', 'RTGS 9917', -24]], tpl: [['O1', -24, '12:10'], ['O2', -19, '18:00'], ['O3', -9, '12:30'], ['O4', -3, '12:00']] },
  { id: 'D-20261014-004', legacy: 'MQ-1034', contact: 'c12', type: 'Sale', stage: 'In Production', production_stage: 'Polishing', owner: 'u5', source_channel: 'Website', source_code: 'WEB', product_interest: 'Engagement ring', occasion: 'Engagement', budget: 75000,
    enquiry: at(-21, '20:00'), next_action_at: at(2, '11:00'), next_action: 'Polish done check with Bablu Das', img: IMG.rings[1].src,
    quote: { no: 'MQ-20261016-002', date: -19, version: 1, shared: ['pdf', -19, '12:00'], item: 'Marquise cluster ring', label: 'Marquise cluster ring, 14K yellow', item_type: 'Ring', size: 'Ring 10', purity: '14K', colour: 'Yellow', wt: 3.1, rate24: 15800,
      lines: [L('Marquise', 7, 0.84, 'VS-FG', null, '4x2', 'Prong')] },
    order_no: 'SO-1034', ordered: -18, promised: 9, terms: '30% advance, balance on delivery', vendor: 'Bablu Das (hand fabrication)', design_spec: 'Seven marquises in a flower cluster, split shank.', pd_issued: -17, gold_issued: [3.4, -8], diamonds_issued: [7, 0.84, -8, []],
    hist: [['Quoted', -19, '12:00'], ['Negotiating', -18, '10:00'], ['Order Confirmed', -18, '12:00'], ['CAD In Progress', -17, '11:00'], ['CAD Sent', -14, '18:00'], ['CAD Approved', -10, '12:00'], ['In Production', -8, '11:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 330109934417', -18]], tpl: [['O1', -18, '12:10'], ['O2', -14, '18:00'], ['O3', -10, '12:30']] },
  { id: 'D-20261013-001', legacy: 'MQ-1033', contact: 'c1', type: 'Bespoke', stage: 'In Production', production_stage: 'Casting', owner: 'u1', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Bangles', occasion: 'Festive', budget: 200000,
    enquiry: at(-22, '12:00'), next_action_at: at(3, '11:00'), next_action: 'Casting back from Ramesh Soni', img: IMG.bracelets[2].src,
    quote: { no: 'MQ-20261015-001', date: -20, version: 1, shared: ['whatsapp', -20, '13:00'], item: 'Pavé bangle, 2.30 ct', label: 'Pavé diamond bangle, 18K yellow', item_type: 'Bangles', size: 'Bangle 2.6', purity: '18K', colour: 'Yellow', wt: 14.6, rate24: 15800,
      lines: [L('Round', 92, 2.30, 'VS-FG', null, '1.8', 'Pavé')] },
    order_no: 'SO-1033', ordered: -19, promised: 14, terms: '30% advance, balance on delivery', vendor: 'Ramesh Soni (casting)', design_spec: 'Half-eternity pavé bangle, hinged, 2.6 Indian size.', pd_issued: -18, gold_issued: [15.1, -1], diamonds_issued: [92, 2.30, -1, ['ML-14']],
    hist: [['Quoted', -20, '13:00'], ['Negotiating', -19, '10:00'], ['Order Confirmed', -19, '12:00'], ['CAD In Progress', -18, '11:00'], ['CAD Sent', -12, '18:00'], ['CAD Approved', -3, '12:00'], ['In Production', -1, '11:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 330201145521', -19]], tpl: [['O1', -19, '12:10'], ['O2', -12, '18:00'], ['O3', -3, '12:30']] },
  { id: 'D-20261102-007', contact: 'c6', type: 'Repair', stage: 'In Production', production_stage: 'Final finish', owner: 'u3', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Repair / resize', occasion: 'Other', budget: 2500,
    enquiry: at(-2, '15:00'), next_action_at: at(1, '15:00'), next_action: 'Ready for pickup tomorrow', img: IMG.rings[4].src, met: 1,
    quote: { no: 'MQ-20261102-006', date: -2, version: 1, shared: ['in_store', -2, '15:10'], item: 'Resize ring from 10 to 12, re-polish', label: 'Resize and polish', item_type: 'Ring', size: 'Ring 12', purity: '14K', colour: 'Yellow', wt: 0.3, rate24: 15650, making: 3000, lines: [] },
    order_no: 'SO-1045', ordered: -2, promised: 8, terms: '100% advance', vendor: 'Sunil Verma (polish)', design_spec: 'Resize to Indian 12, re-polish, rhodium none.',
    hist: [['Contacted', -2, '15:00'], ['Qualified', -2, '15:02'], ['Quoted', -2, '15:10'], ['Negotiating', -2, '15:12'], ['Order Confirmed', -2, '15:15'], ['In Production', -1, '11:00']],
    pays: [['Advance', 1, 'UPI', 'UPI 330211', -2]], tpl: [['O1', -2, '15:20']] },
  { id: 'D-20261017-002', legacy: 'MQ-1040', contact: 'c3', type: 'Sale', stage: 'QC', owner: 'u5', source_channel: 'Website', source_code: 'WEB', product_interest: 'Pendant', occasion: 'Anniversary', budget: 70000,
    enquiry: at(-18, '22:00'), next_action_at: at(0, '16:00'), next_action: 'Second QC after re-polish', img: IMG.pendants[0].src,
    quote: { no: 'MQ-20261018-001', date: -17, version: 1, shared: ['pdf', -17, '15:00'], item: 'Pear pendant on 18 in chain', label: '0.92 ct pear pendant, 14K white', item_type: 'Pendant', size: 'Not applicable', purity: '14K', colour: 'White', wt: 2.6, rate24: 15800,
      lines: [L('Pear', 1, 0.92, 'VS-FG', null, '8x5.4', 'Bezel')] },
    order_no: 'SO-1040', ordered: -16, promised: 2, terms: '100% advance', vendor: 'Imran Qureshi (setting)', design_spec: 'Bezel-set pear on a 18 in cable chain; ships insured to London.', pd_issued: -15, gold_issued: [2.9, -10], diamonds_issued: [1, 0.92, -10, ['LG612093345']], chain_length: '18 in', chain_weight: '1.4 g', delivery_method: 'Courier', courier: 'BVC Logistics',
    hist: [['Quoted', -17, '15:00'], ['Negotiating', -16, '10:00'], ['Order Confirmed', -16, '12:00'], ['CAD In Progress', -15, '11:00'], ['CAD Sent', -13, '18:00'], ['CAD Approved', -11, '12:00'], ['In Production', -10, '11:00'], ['QC', -2, '15:00']],
    pays: [['Advance', 1, 'Card', 'Stripe pi_3Q9', -16]], tpl: [['O1', -16, '12:10'], ['O2', -13, '18:00'], ['O3', -11, '12:30']],
    qc: [{ attempt: 1, status: 'Rework', notes: 'Polish marks on the bezel back; re-polish before shipping.', actual_weight: 2.66, at: at(-2, '15:00'), by: 'u3' }] },
  { id: 'D-20261009-003', legacy: 'MQ-1038', contact: 'c4', type: 'Sale', stage: 'Ready', owner: 'u5', source_channel: 'Website', source_code: 'WEB', product_interest: 'Pendant', occasion: 'Self-purchase', budget: 30000,
    enquiry: at(-26, '13:00'), next_action_at: at(0, '18:00'), next_action: 'Send pre-delivery message (O6)', img: IMG.rings[4].src,
    quote: { no: 'MQ-20261010-004', date: -25, version: 1, shared: ['whatsapp', -25, '13:00'], item: 'Stackable bands, set of three', label: 'Three stackable bands, 9K', item_type: 'Ring', size: 'Ring 11', purity: '9K', colour: 'Yellow', wt: 5.1, rate24: 15900,
      lines: [L('Round', 60, 0.60, 'VS-GH', null, '1.1', 'Channel')] },
    order_no: 'SO-1038', ordered: -24, promised: 1, terms: '30% advance, balance on delivery', vendor: 'Sunil Verma (polish)', design_spec: 'Three 2 mm bands: yellow, white and rose plating.', pd_issued: -23, gold_issued: [5.5, -18], diamonds_issued: [60, 0.6, -18, ['ML-15']], delivery_method: 'In person', huid: '7XK2PQ',
    hist: [['Quoted', -25, '13:00'], ['Negotiating', -24, '10:00'], ['Order Confirmed', -24, '12:00'], ['CAD In Progress', -23, '11:00'], ['CAD Sent', -21, '18:00'], ['CAD Approved', -19, '12:00'], ['In Production', -18, '11:00'], ['QC', -2, '11:00'], ['Ready', -1, '12:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 329811', -24]], tpl: [['O1', -24, '12:10'], ['O2', -21, '18:00'], ['O3', -19, '12:30']],
    qc: [{ attempt: 1, status: 'Pass', notes: '', actual_weight: 5.0, at: at(-1, '11:30'), by: 'u3' }] },
  { id: 'D-20261006-001', legacy: 'MQ-1031', contact: 'c4', type: 'Sale', stage: 'Dispatched', owner: 'u5', source_channel: 'Repeat', source_code: 'REPEAT', product_interest: 'Necklace', occasion: 'Birthday', budget: 70000,
    enquiry: at(-29, '13:00'), next_action_at: at(1, '11:00'), next_action: 'Confirm delivery', img: IMG.necklaces[3].src,
    quote: { no: 'MQ-20261007-001', date: -28, version: 1, shared: ['whatsapp', -28, '13:00'], item: 'Solitaire necklace, 0.70 ct round', label: '0.70 ct solitaire necklace, 14K white', item_type: 'Necklace', size: 'Not applicable', purity: '14K', colour: 'White', wt: 2.9, rate24: 15900,
      lines: [L('Round', 1, 0.70, 'VVS-EF', null, '5.7', 'Prong')] },
    order_no: 'SO-1031', ordered: -27, promised: 1, terms: '30% advance, balance on delivery', vendor: 'Imran Qureshi (setting)', design_spec: 'Four-prong solitaire on an 18 in box chain.', pd_issued: -26, gold_issued: [3.1, -20], diamonds_issued: [1, 0.7, -20, []], delivery_method: 'Courier', courier: 'Blue Dart', tracking_no: '7845 1123 9081', huid: 'HW3R8T', cert_nos: 'IGI LG598120044',
    hist: [['Quoted', -28, '13:00'], ['Negotiating', -27, '10:00'], ['Order Confirmed', -27, '12:00'], ['CAD In Progress', -26, '11:00'], ['CAD Sent', -24, '18:00'], ['CAD Approved', -22, '12:00'], ['In Production', -20, '11:00'], ['QC', -5, '11:00'], ['Ready', -4, '12:00'], ['Dispatched', -1, '16:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 329602', -27], ['Balance', 'rest', 'UPI', 'UPI 330318', -2]], tpl: [['O1', -27, '12:10'], ['O2', -24, '18:00'], ['O3', -22, '12:30'], ['O6', -4, '12:30'], ['B3', -2, '13:00'], ['O7', -1, '16:10']],
    ticks: { Ready: ['packaging'] }, qc: [{ attempt: 1, status: 'Pass', notes: '', actual_weight: 2.92, at: at(-4, '11:00'), by: 'u3' }] },
  { id: 'D-20261003-002', legacy: 'MQ-1035', contact: 'c6', type: 'Sale', stage: 'Delivered', owner: 'u5', source_channel: 'Walk-in', source_code: 'WALKIN', product_interest: 'Solitaire studs', occasion: 'Festive', budget: 40000,
    enquiry: at(-32, '13:00'), next_action_at: at(0, '12:00'), next_action: 'Send O8 follow-up, then close', img: IMG.earrings[2].src, met: 1,
    quote: { no: 'MQ-20261004-001', date: -31, version: 1, shared: ['in_store', -31, '14:00'], item: 'Bezel drop earrings', label: 'Bezel drop earrings, 14K yellow', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '14K', colour: 'Yellow', wt: 2.8, rate24: 15950,
      lines: [L('Round', 2, 0.70, 'VS-FG', null, '4.6', 'Bezel')] },
    order_no: 'SO-1035', ordered: -30, promised: -5, terms: '50% advance, balance on delivery', vendor: 'Sunil Verma (polish)', design_spec: 'Bezel-set rounds on short drops, push backs.', pd_issued: -29, gold_issued: [3.0, -22], diamonds_issued: [2, 0.7, -22, []], delivery_method: 'In person', huid: 'R2X8NA', cert_nos: 'IGI LG591003377, LG591003378', invoice: ['INV/26-27/0418', -4],
    hist: [['Quoted', -31, '14:00'], ['Negotiating', -31, '14:30'], ['Order Confirmed', -30, '12:00'], ['CAD In Progress', -29, '11:00'], ['CAD Sent', -27, '18:00'], ['CAD Approved', -25, '12:00'], ['In Production', -22, '11:00'], ['QC', -8, '11:00'], ['Ready', -7, '12:00'], ['Dispatched', -4, '11:00'], ['Delivered', -4, '16:00']],
    pays: [['Advance', 0.5, 'Cash', 'Receipt 0912', -30], ['Balance', 'rest', 'UPI', 'UPI 330133', -4]], tpl: [['O1', -30, '12:10'], ['O2', -27, '18:00'], ['O3', -25, '12:30'], ['O6', -7, '12:30'], ['O7', -4, '11:00'], ['B3', -4, '16:30']],
    ticks: { Ready: ['packaging'], Delivered: ['received'] }, qc: [{ attempt: 1, status: 'Pass', notes: '', actual_weight: 2.84, at: at(-7, '11:00'), by: 'u3' }] },

  /* ---- closed and lost ---- */
  { id: 'D-20260924-001', legacy: 'MQ-0998', contact: 'c5', type: 'Sale', stage: 'Closed', owner: 'u1', source_channel: 'Referral', source_code: 'REF', product_interest: 'Solitaire studs', occasion: 'Anniversary', budget: 140000,
    enquiry: at(-41, '12:00'), img: IMG.earrings[3].src, met: 1,
    quote: { no: 'MQ-20260925-002', date: -40, version: 1, shared: ['in_store', -40, '15:00'], item: 'Solitaire studs, 2 × 1.25 ct oval', label: '2.5 ct oval solitaire studs, 18K white', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '18K', colour: 'White', wt: 3.6, rate24: 15600,
      lines: [L('Oval', 2, 2.50, 'VVS-EF', null, '8.1x5.8', 'Prong')] },
    order_no: 'SO-0998', ordered: -39, promised: -9, terms: '50% advance, balance on delivery', vendor: 'Imran Qureshi (setting)', design_spec: 'Four-claw ovals, screw backs.', pd_issued: -38, gold_issued: [3.9, -30], diamonds_issued: [2, 2.5, -30, []], delivery_method: 'In person', huid: 'P4M7QX', cert_nos: 'IGI LG587112934, LG587112935', invoice: ['INV/26-27/0416', -8],
    hist: [['Quoted', -40, '15:00'], ['Negotiating', -40, '15:30'], ['Order Confirmed', -39, '12:00'], ['CAD In Progress', -38, '11:00'], ['CAD Sent', -36, '18:00'], ['CAD Approved', -33, '12:00'], ['In Production', -30, '11:00'], ['QC', -11, '11:00'], ['Ready', -10, '12:00'], ['Dispatched', -8, '11:00'], ['Delivered', -8, '17:00'], ['Closed', -6, '12:00']],
    pays: [['Advance', 0.5, 'Bank transfer', 'NEFT 8812', -39], ['Balance', 'rest', 'Bank transfer', 'NEFT 9930', -8]], tpl: [['O1', -39, '12:10'], ['O3', -33, '12:30'], ['O6', -10, '12:30'], ['O7', -8, '11:00'], ['O8', -6, '11:30']],
    ticks: { Closed: ['photo_consent', 'satisfaction'] }, qc: [{ attempt: 1, status: 'Pass', notes: '', actual_weight: 3.58, at: at(-10, '11:00'), by: 'u3' }] },
  { id: 'D-20261027-005', contact: 'c4', type: 'Stock', stage: 'Closed', owner: 'u2', source_channel: 'Walk-in', source_code: 'WALKIN', product_interest: 'Engagement ring', occasion: 'Gift', budget: 42000,
    enquiry: at(-8, '17:00'), img: IMG.rings[4].src, met: 1, tag_no: 'FJ-2207',
    quote: { no: 'MQ-20261027-006', date: -8, version: 1, shared: ['in_store', -8, '17:20'], item: 'Diamond Ring RR-047 from the showcase', label: 'Diamond Ring RR-047, 14K', item_type: 'Ring', size: 'Ring 11', purity: '14K', colour: 'Yellow', wt: 2.8, rate24: 15600, making: 1400,
      lines: [L('Round', 16, 0.64, 'VS-FG', null, '', '')] },
    order_no: 'SO-1044', ordered: -8, promised: -6, terms: '100% advance', design_spec: 'Showcase piece FJ-2207, as is.', delivery_method: 'In person', huid: '9TQ4MZ', invoice: ['INV/26-27/0417', -6],
    hist: [['Contacted', -8, '17:00'], ['Qualified', -8, '17:05'], ['Quoted', -8, '17:20'], ['Negotiating', -8, '17:25'], ['Order Confirmed', -8, '17:40'], ['Ready', -7, '12:00'], ['Dispatched', -6, '11:00'], ['Delivered', -6, '12:00'], ['Closed', -6, '12:30']],
    pays: [['Advance', 1, 'Card', 'POS 7740 + old gold', -8]], tpl: [['O1', -8, '17:45'], ['O6', -7, '12:10'], ['O8', -4, '11:00']], ticks: { Closed: ['satisfaction'] },
    qc: [{ attempt: 1, status: 'Pass', notes: 'Showcase piece, checked before handover.', actual_weight: 2.8, at: at(-7, '11:00'), by: 'u3' }] },
  { id: 'D-20261019-007', legacy: 'E-2277', contact: 'c12', type: 'Sale', stage: 'Lost', owner: 'u2', source_channel: 'Website', source_code: 'WEB', product_interest: 'Solitaire studs', occasion: 'Festive', budget: 70000, lost_reason: 'Price', lost_at: -9, competitor: 'Online lab-grown brand',
    enquiry: at(-16, '21:00'), img: IMG.earrings[4].src,
    quote: { no: 'MQ-20261021-002', date: -14, version: 1, shared: ['pdf', -14, '12:00'], item: 'Emerald-cut drop earrings', label: 'Emerald-cut drops, 18K white', item_type: 'Earrings / Studs', size: 'Not applicable', purity: '18K', colour: 'White', wt: 3.4, rate24: 15800,
      lines: [L('Emerald', 2, 1.40, 'VS-FG', null, '6x4', 'Bezel')] },
    hist: [['New', -16, '21:00'], ['Contacted', -15, '10:00'], ['Qualified', -15, '12:00'], ['Quoted', -14, '12:00'], ['Lost', -9, '15:00']], tpl: [['L1', -15, '10:00'], ['L3', -14, '12:00'], ['L4', -11, '11:00'], ['L6', -9, '15:10']] },
  { id: 'D-20261015-004', contact: 'c15', type: 'Sale', stage: 'Expired', owner: 'u5', source_channel: 'Instagram', source_code: 'IG DM', product_interest: 'Pendant', occasion: 'Birthday', budget: 55000, lost_reason: 'No response after follow-ups', lost_at: -7,
    enquiry: at(-20, '19:00'), img: IMG.pendants[3].src,
    quote: { no: 'MQ-20261017-005', date: -18, version: 1, shared: ['whatsapp', -18, '13:00'], item: 'Solitaire pendant, 0.50 ct round', label: '0.50 ct solitaire pendant, 14K yellow', item_type: 'Pendant', size: 'Not applicable', purity: '14K', colour: 'Yellow', wt: 1.9, rate24: 15800,
      lines: [L('Round', 1, 0.50, 'VS-FG', null, '5.1', 'Prong')] },
    hist: [['New', -20, '19:00'], ['Contacted', -20, '19:30'], ['Qualified', -19, '12:00'], ['Quoted', -18, '13:00'], ['Expired', -7, '12:00']], tpl: [['L1', -20, '19:30'], ['L3', -18, '13:00'], ['L5', -17, '11:00'], ['L4', -15, '11:00']] },
  { id: 'D-20261004-002', contact: 'c16', type: 'Sale', stage: 'Cancelled', owner: 'u2', source_channel: 'Google', source_code: 'GMB MSG', product_interest: 'Engagement ring', occasion: 'Engagement', budget: 110000, lost_reason: 'Timeline', lost_at: -15,
    enquiry: at(-31, '11:00'), img: IMG.rings[2].src,
    quote: { no: 'MQ-20261006-001', date: -29, version: 1, shared: ['pdf', -29, '12:00'], item: 'Round solitaire, six claws', label: '1 ct round solitaire, 18K white', item_type: 'Engagement ring', size: 'Ring 13', purity: '18K', colour: 'White', wt: 3.0, rate24: 15900,
      lines: [L('Round', 1, 1.00, 'VVS-EF', null, '6.4', 'Prong')] },
    order_no: 'SO-1019', ordered: -28, promised: -10, terms: '30% advance, balance on delivery', vendor: 'Imran Qureshi (setting)', design_spec: 'Six-claw round on a knife-edge band.', pd_issued: -27,
    hist: [['New', -31, '11:00'], ['Contacted', -31, '11:30'], ['Qualified', -30, '12:00'], ['Quoted', -29, '12:00'], ['Negotiating', -29, '15:00'], ['Order Confirmed', -28, '12:00'], ['CAD In Progress', -27, '11:00'], ['CAD Sent', -24, '18:00'], ['Cancelled', -15, '12:00']],
    pays: [['Advance', 0.3, 'UPI', 'UPI 328802', -28], ['Refund', 0.2, 'UPI', 'UPI REF 329911', -14]], tpl: [['L1', -31, '11:30'], ['L3', -29, '12:00'], ['O1', -28, '12:10'], ['O2', -24, '18:00']],
    acts: [['call', 'in', 'Called', 'Engagement moved to next year; cancelled after CAD. Refund agreed less the CAD cost.', -15, '11:30']] }
];

/* ---------- stock: items and the ledger (every quantity change is a move) ---------- */
const SI = (id, code, kind, extra) => Object.assign({ id, code, kind, origin: 'Walk-in', location: 'Safe', vendor: '', purchased_at: '2026-09-15', invoice_ref: '', cost: 0, list_price: null, certified: 0, notes: '', created_by: 'u3' }, extra);
const STOCK_ITEMS = [
  SI('s1', 'LG620419872', 'diamond', { certified: 1, cert_lab: 'IGI', cert_no: 'LG620419872', shape: 'Oval', carat: 1.52, colour: 'E', clarity: 'VVS2', quality: 'VVS-EF', cut: 'Excellent', polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None', measurements: '8.61-8.64x6.10', size_mm: '8.6x6.1', vendor: 'Shree Manufacturing, Mumbai', invoice_ref: 'SM/26/0912', cost: 26400, location: 'With karigar', purchased_at: '2026-10-02' }),
  SI('s2', 'LG598812230', 'diamond', { certified: 1, cert_lab: 'IGI', cert_no: 'LG598812230', shape: 'Round', carat: 1.01, colour: 'F', clarity: 'VS1', quality: 'VS-FG', cut: 'Excellent', polish: 'Excellent', symmetry: 'Excellent', fluorescence: 'None', measurements: '6.45-6.48x3.98', size_mm: '6.4', vendor: 'Shree Manufacturing, Mumbai', invoice_ref: 'SM/26/0912', cost: 21800, list_price: 52000, purchased_at: '2026-10-02' }),
  SI('s3', 'LG601127764', 'diamond', { certified: 1, cert_lab: 'IGI', cert_no: 'LG601127764', shape: 'Emerald', carat: 2.40, colour: 'F', clarity: 'VS1', quality: 'VVS-EF', cut: 'Excellent', polish: 'Very Good', symmetry: 'Very Good', fluorescence: 'Faint', measurements: '9.10-6.62x4.31', size_mm: '9.1x6.6', vendor: 'Shree Manufacturing, Mumbai', invoice_ref: 'SM/26/1003', cost: 58200, notes: 'Kept aside for SO-1036 (Vikram Chawla).', purchased_at: '2026-10-20' }),
  SI('s4', 'LG612093345', 'diamond', { certified: 1, cert_lab: 'IGI', cert_no: 'LG612093345', shape: 'Pear', carat: 0.92, colour: 'G', clarity: 'VS2', quality: 'VS-FG', cut: 'Very Good', polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None', measurements: '8.02x5.41x3.30', size_mm: '8x5.4', vendor: 'Shah Gems', cost: 14900, location: 'With karigar', purchased_at: '2026-09-28' }),
  SI('s5', 'LG587731019', 'diamond', { certified: 1, cert_lab: 'GIA', cert_no: '2487731019', shape: 'Cushion', carat: 1.20, colour: 'E', clarity: 'VS1', quality: 'VS-EF', cut: 'Excellent', polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None', measurements: '6.21-6.02x4.11', size_mm: '6.2', vendor: 'Shah Gems', cost: 31500, list_price: 72000, location: 'Bank locker', purchased_at: '2026-08-21' }),
  SI('s6', 'ST-20261020-004', 'diamond', { shape: 'Round', carat: 0.50, colour: 'F', clarity: 'VS1', quality: 'VS-FG', size_mm: '5.1', vendor: 'Shah Gems', cost: 9200, notes: 'Uncertified, own grading.', purchased_at: '2026-10-20' }),
  SI('s7', 'ML-14', 'lot', { shape: 'Round', quality: 'VS-FG', sieve: '+0.8 -1.3', size_mm: '1.3', vendor: 'Shree Manufacturing, Mumbai', invoice_ref: 'SM/26/0855', cost: 240000, purchased_at: '2026-09-01' }),
  SI('s8', 'ML-15', 'lot', { shape: 'Round', quality: 'VS-GH', sieve: '+1.3 -1.8', size_mm: '1.6', vendor: 'Shree Manufacturing, Mumbai', invoice_ref: 'SM/26/0855', cost: 180000, purchased_at: '2026-09-01' }),
  SI('s9', 'ML-16', 'lot', { shape: 'Baguette', quality: 'VS-FG', sieve: '2x1 mm', size_mm: '2x1', vendor: 'Shah Gems', cost: 43200, purchased_at: '2026-10-11' }),
  SI('s10', 'CS-08', 'gem', { certified: 1, cert_lab: 'GSI', cert_no: 'GSI 88201', gem_type: 'Sapphire', shape: 'Oval', carat: 2.10, colour: 'Royal blue', measurements: '8.2x6.4x4.1', vendor: 'Jaipur Gem House', cost: 38000, list_price: 95000, purchased_at: '2026-07-14' }),
  SI('s11', 'CS-09', 'gem', { gem_type: 'Emerald', shape: 'Emerald', carat: 1.40, colour: 'Vivid green', measurements: '7.0x5.1', vendor: 'Jaipur Gem House', cost: 26000, location: 'Exhibition', purchased_at: '2026-07-14' }),
  SI('s12', 'FJ-2207', 'jewellery', { tag_no: 'FJ-2207', item_type: 'Ring', purity: '14K', gold_colour: 'Yellow', gross_wt: 2.95, net_wt: 2.8, size: 'Ring 11', stone_summary: '16 Round 0.64 ct VS-FG', huid: '9TQ4MZ', cost: 29800, list_price: 42000, location: 'Showcase', img: IMG.rings[4].src, title: 'Diamond Ring RR-047', purchased_at: '2026-08-30' }),
  SI('s13', 'FJ-2206', 'jewellery', { tag_no: 'FJ-2206', item_type: 'Earrings / Studs', purity: '18K', gold_colour: 'White', gross_wt: 4.1, net_wt: 3.8, size: 'Not applicable', stone_summary: '2 Round 1.12 ct VS-FG', huid: 'R7C2LK', cost: 41000, list_price: 76000, location: 'Exhibition', img: IMG.earrings[2].src, title: 'Diamond Earrings ER-046', purchased_at: '2026-08-30' }),
  SI('s14', 'FJ-2205', 'jewellery', { tag_no: 'FJ-2205', item_type: 'Necklace', purity: '18K', gold_colour: 'Yellow', gross_wt: 9.6, net_wt: 9.1, size: 'Not applicable', stone_summary: '1 Round 1.00 ct + 48 melee 1.05 ct', huid: 'L9P4QA', cost: 88000, list_price: 148000, location: 'Showcase', img: IMG.necklaces[3].src, title: 'Diamond Necklace NK-047', purchased_at: '2026-09-10' }),
  SI('s15', 'FJ-2208', 'jewellery', { tag_no: 'FJ-2208', item_type: 'Pendant', purity: '14K', gold_colour: 'Rose', gross_wt: 1.8, net_wt: 1.7, size: 'Not applicable', stone_summary: '1 Pear 0.30 ct VS-FG', huid: 'K2M8RW', cost: 14600, list_price: 28500, location: 'Showcase', img: IMG.pendants[1].src, title: 'Pear Pendant PD-031', purchased_at: '2026-10-05' })
];
/* [item, kind, pcs, ct, deal, vendor/karigar, note, day] — signed: negative leaves the safe */
const STOCK_MOVES_RAW = [
  ['s1', 'in', 1, 1.52, null, 'Shree Manufacturing, Mumbai', 'Opening', -33], ['s1', 'issue', -1, -1.52, 'D-20261019-001', 'Imran Qureshi (setting)', 'Centre stone', -1],
  ['s2', 'in', 1, 1.01, null, 'Shree Manufacturing, Mumbai', 'Opening', -33],
  ['s3', 'in', 1, 2.40, null, 'Shree Manufacturing, Mumbai', 'Opening', -15],
  ['s4', 'in', 1, 0.92, null, 'Shah Gems', 'Opening', -37], ['s4', 'issue', -1, -0.92, 'D-20261017-002', 'Imran Qureshi (setting)', 'Pear for SO-1040', -10],
  ['s5', 'in', 1, 1.20, null, 'Shah Gems', 'Opening', -75], ['s5', 'memo_out', -1, -1.20, null, 'Vikram Chawla (approval)', 'On approval, back by 3 Nov', -6], ['s5', 'memo_back', 1, 1.20, null, 'Vikram Chawla (approval)', 'Returned, not chosen', -2],
  ['s6', 'in', 1, 0.50, null, 'Shah Gems', 'Opening', -15],
  ['s7', 'in', 2000, 20.00, null, 'Shree Manufacturing, Mumbai', 'Opening parcel', -64], ['s7', 'issue', -22, -0.28, 'D-20261019-001', 'Imran Qureshi (setting)', 'Hidden halo', -1], ['s7', 'issue', -92, -2.30, 'D-20261013-001', 'Ramesh Soni (casting)', 'Bangle pavé', -1], ['s7', 'return', 6, 0.07, 'D-20261013-001', 'Ramesh Soni (casting)', 'Spare after setting plan', 0], ['s7', 'adjust', -2, -0.02, null, '', 'Recount after sieving', -20],
  ['s8', 'in', 900, 13.50, null, 'Shree Manufacturing, Mumbai', 'Opening parcel', -64], ['s8', 'issue', -48, -7.20, 'D-20261008-002', 'Ramesh Soni (casting)', 'Tennis bracelet', -6], ['s8', 'issue', -60, -0.60, 'D-20261009-003', 'Sunil Verma (polish)', 'Stackable bands', -18],
  ['s9', 'in', 120, 3.60, null, 'Shah Gems', 'Opening parcel', -24], ['s9', 'memo_out', -30, -0.90, null, 'Shah Gems', 'Size check, back by 10 Nov', -3],
  ['s10', 'in', 1, 2.10, null, 'Jaipur Gem House', 'Opening', -113],
  ['s11', 'in', 1, 1.40, null, 'Jaipur Gem House', 'Opening', -113], ['s11', 'memo_out', -1, -1.40, null, 'Trunk show, Taj Palace', 'Trunk show, back 6 Nov', -2],
  ['s12', 'in', 1, 0, null, '', 'Opening', -66], ['s12', 'sale', -1, 0, 'D-20261027-005', '', 'Sold to Kavya Reddy', -8],
  ['s13', 'in', 1, 0, null, '', 'Opening', -66], ['s13', 'memo_out', -1, 0, null, 'Trunk show, Taj Palace', 'Trunk show, back 6 Nov', -2],
  ['s14', 'in', 1, 0, null, '', 'Opening', -55],
  ['s15', 'in', 1, 0, null, '', 'Opening', -30]
];
const STOCK_MOVES = STOCK_MOVES_RAW.map(([item, kind, pcs, ct, deal, vendor, note, d], i) => ({ id: 'm' + (i + 1), item, kind, pcs, ct, deal, vendor, note, at: at(d, '12:00'), by: kind === 'issue' || kind === 'return' ? 'u3' : 'u3' }));

/* ---------- audit, trash, imports, exports & bulk reads ---------- */
const AUDIT = [
  [0, '10:19', 'u2', 'lead_create', 'deal', 'D-20261104-003', 'Instagram · IG DM'],
  [0, '09:12', 'u5', 'lead_create', 'deal', 'D-20261104-002', 'Website · WEB'],
  [0, '09:02', 'u1', 'login', 'user', 'riya', ''],
  [0, '08:55', 'u3', 'gold_rate', 'settings', 'gold_rate_24k', '15,650 → 14,354'],
  [-1, '16:30', 'u1', 'quote_shared', 'deal', 'D-20261102-001', 'MQ-20261103-001 v1 · shown in store'],
  [-1, '12:00', 'u1', 'stage', 'deal', 'D-20261016-002', 'CAD Sent → CAD Approved'],
  [-1, '11:00', 'u3', 'material_issue', 'deal', 'D-20261019-001', 'Diamonds 23 pcs · 1.80 ct'],
  [-1, '18:10', 'u6', 'export_xlsx', 'export', 'all', 'Full database, 14 tables'],
  [-2, '11:00', 'u3', 'material_issue', 'deal', 'D-20261019-001', 'Metal 4.10 g 18K'],
  [-2, '17:20', 'u1', 'perms_save', 'settings', 'role_perms', 'ops + stock.cost (for the month-end count)'],
  [-3, '18:00', 'u1', 'trash_delete', 'contact', 'c-dup-91', 'Duplicate of Harsh Agarwal'],
  [-4, '10:00', 'u1', 'import', 'import', 'b14', 'Stock CSV: 6 new, 2 already in the ledger'],
  [-5, '09:30', 'u6', 'sheets_fetch', 'import', 'b13', 'Google Sheet: 4 new leads'],
  [-6, '19:02', 'u2', 'bulk_read_flag', 'user', 'kabir', '412 reads today (flag at 400)']
].map(([d, hm, user, action, entity, entity_id, detail]) => ({ at: at(d, hm), user, action, entity, entity_id, detail }));
const TRASH = [
  { entity: 'contact', label: 'Harsh Agarwal (duplicate)', sub: '+91 99106 33218 · created twice from the iPad', at: at(-3, '18:00'), by: 'u1', reason: 'Duplicate of Harsh Agarwal; merged' },
  { entity: 'payment', label: '₹5,000 UPI on SO-1034', sub: 'Advance · UPI 330109934400', at: at(-9, '13:00'), by: 'u1', reason: 'Entered twice; the real one is UPI …4417', deal: 'D-20261014-004' },
  { entity: 'activity', label: 'Note on D-20261030-002', sub: '"call back at 6" (typed on the wrong deal)', at: at(-2, '12:30'), by: 'u6', reason: 'Wrong deal', deal: 'D-20261030-002' },
  { entity: 'stock', label: 'ST-20261012-001 · Round 0.30 ct', sub: 'Typed in by mistake during the count', at: at(-12, '16:00'), by: 'u1', reason: 'Not a real stone' }
];
const IMPORTS = [
  { id: 'b14', kind: 'stock', file: 'stock_count_oct.csv', total: 8, created: 6, updated: 0, skipped: 2, at: at(-4, '10:00'), by: 'u1', undo: false },
  { id: 'b13', kind: 'sheet', file: 'Google Sheet (campaign intake)', total: 5, created: 4, updated: 0, skipped: 1, at: at(-5, '09:30'), by: 'u6', undo: true },
  { id: 'b12', kind: 'contacts', file: 'google_contacts_export.csv', total: 212, created: 188, updated: 19, skipped: 5, at: at(-30, '15:00'), by: 'u1', undo: true },
  { id: 'b11', kind: 'qom', file: 'Quote_Order_Manager_export.xlsx', total: 64, created: 61, updated: 0, skipped: 3, at: at(-31, '12:00'), by: 'u1', undo: true }
];
const BULK_EVENTS = [
  { at: at(-1, '18:10'), who: 'u6', what: 'Exported the full database (Excel)' },
  { at: at(-3, '18:00'), who: 'u1', what: 'Moved a contact to the Trash' },
  { at: at(-4, '10:00'), who: 'u1', what: 'Imported stock CSV (6 items)' },
  { at: at(-6, '19:02'), who: 'u2', what: 'Daily read flag: 412 reads' },
  { at: at(-9, '20:00'), who: 'u1', what: 'Downloaded a backup' }
];
const READS_14D = { u2: [212, 188, 240, 160, 0, 0, 201, 412, 176, 233, 190, 140, 0, 98], u5: [120, 133, 98, 140, 101, 0, 0, 87, 99, 120, 110, 90, 0, 44], u3: [90, 84, 77, 102, 96, 30, 0, 88, 91, 79, 85, 70, 0, 51], u4: [40, 22, 31, 18, 25, 0, 0, 30, 28, 33, 19, 12, 0, 9] };

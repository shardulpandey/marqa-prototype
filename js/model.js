/* The live MARQA Pipeline's rules (v2.7.0), as constants the screens read.
   Mirrors meta.php: stages, stage checks, picklists, roles and permissions, QC, templates, settings.
   Partner brands are shown generically; no business boundaries live here. */

/* ---------- stages (18, one ladder) ---------- */
const STAGE_LIST = [
  ['New', 'New enquiry', 'lead', 'L1', 'Enquiry captured. First reply within 2–4 business hours on WhatsApp/DM, 24h on email.'],
  ['Contacted', 'Contacted', 'lead', 'L2', 'We have replied and the conversation is open. Source and product interest captured.'],
  ['Qualified', 'Qualified', 'lead', 'L3', 'Budget, timeline and occasion known. Consult booked or walk-in happened.'],
  ['Quoted', 'Quoted', 'quote', 'Q1', 'Quotation shared (PDF, WhatsApp or in store). It holds 24 hours at the metal rate; an order may still be confirmed at that rate for 2 days from the quote date, after that re-price.'],
  ['Negotiating', 'Negotiating', 'quote', 'Q2', 'Client responded; changes or discount under discussion. Ends with the client\'s yes, the rate locked, terms agreed and the advance recorded.'],
  ['Order Confirmed', 'Order confirmed', 'order', 'S1', 'Advance in hand. Enter the ERP order number, assign the vendor, complete and issue the karigar order sheet, send the confirmation.'],
  ['CAD In Progress', 'CAD in progress', 'order', 'S2', 'Design team briefed and working.'],
  ['CAD Sent', 'CAD sent', 'order', 'S2', '2–3 renders sent with a feedback deadline. Revisions loop here.'],
  ['CAD Approved', 'CAD approved', 'order', 'S3', 'Final CAD filed, final confirmation with specs sent, production briefed.'],
  ['In Production', 'In production', 'order', 'S4', 'Casting → setting → polishing → hallmarking. Mid-process update for high-value pieces.'],
  ['QC', 'Quality check', 'order', 'S5', 'The QC checklist. Pass → Ready. Rework → back to production. Reject → founders.'],
  ['Ready', 'Ready for delivery', 'order', 'S5', 'QC passed, pre-delivery message sent, packaging arranged, balance settled or terms agreed.'],
  ['Dispatched', 'Dispatched', 'order', 'S6', 'Handed to courier or out for in-person delivery. Notification sent.'],
  ['Delivered', 'Delivered', 'order', 'S6', 'Received by the client. Invoice issued.'],
  ['Closed', 'Closed', 'closed', 'S6', 'Follow-up sent within 24–48h, balance zero, photo consent asked. Archived.'],
  ['Lost', 'Lost', 'lost', '—', 'Did not proceed. Reason required. Door stays open.'],
  ['Expired', 'Expired', 'lost', '—', 'Quote lapsed with no response after follow-ups.'],
  ['Cancelled', 'Cancelled', 'lost', '—', 'Order cancelled after confirmation. Refund handling required.']
];
const DSTAGES = STAGE_LIST.map(([key, label, group, sop, help], i) => ({ key, label, group, sop, help, i }));
const WON_STAGES = DSTAGES.filter(s => s.i >= 5 && s.i <= 14).map(s => s.key);
const OPEN_STAGES = DSTAGES.filter(s => s.i <= 13).map(s => s.key);
const GROUP_LABEL = { lead: 'Lead', quote: 'Quote', order: 'Order', closed: 'Closed', lost: 'Lost' };

const DEAL_TYPES = ['Sale', 'Bespoke', 'Stock', 'Repair', 'Exchange', 'Buyback'];
const TYPE_SKIPS = {
  Stock: ['CAD In Progress', 'CAD Sent', 'CAD Approved', 'In Production'],
  Repair: ['CAD In Progress', 'CAD Sent', 'CAD Approved'],
  Buyback: ['CAD In Progress', 'CAD Sent', 'CAD Approved', 'In Production', 'QC']
};
const PROD_SUBSTAGES = ['Casting', 'Setting', 'Polishing', 'Hallmarking', 'Final finish'];

/* ---------- stage checks: [key, label, required, rule, hint, either] ---------- */
const CHECKLISTS = {
  'New': [
    ['first_reply', 'First reply sent within SLA (2–4h WhatsApp/DM · 24h email)', 1, 'auto:activity_out', 'Quick log → Called / WhatsApp sent, or Message'],
    ['source_captured', 'Source captured (Walk-in / Meta ad / Google / Referral / Instagram / Website)', 1, 'auto:source', 'Overview → Source']
  ],
  'Contacted': [
    ['interest_captured', 'Product interest and occasion captured', 1, 'auto:interest', 'Overview → Looking for'],
    ['consult_offered', 'Consult / showroom visit offered', 0, '', '']
  ],
  'Qualified': [
    ['budget_known', 'Budget range known', 1, 'auto:budget', 'Overview → Budget'],
    ['timeline_known', 'Timeline / date-need known', 0, 'auto:timeline', 'Overview → Timeline', 1],
    ['visit_or_call', 'Consult call or showroom visit logged', 0, 'auto:activity_meeting', 'Quick log → Called / Visited', 1]
  ],
  'Quoted': [
    ['quote_sent', 'Quotation shared: PDF downloaded, WhatsApp L3 sent, or shown in store and logged', 1, 'auto:quote_shared', 'Quote tab → PDF / WhatsApp L3 / Shared in store'],
    ['validity_told', 'Client told the quote holds 24 hours at today\'s metal rate', 1, 'auto:quote_shared', 'Printed on the PDF and said in L3'],
    ['breakdown_shown', 'Full breakdown shown: stones, gold at rate, making, GST ("Nothing hidden")', 1, 'auto:quote_shared', 'Quote tab → share the quote']
  ],
  'Negotiating': [
    ['objection_noted', 'Objection / requested change noted', 0, '', ''],
    ['followup_scheduled', 'Next follow-up scheduled', 0, 'auto:next_action', 'Overview → Next action on'],
    ['client_accepted', 'Client said yes: final piece and price agreed', 1, '', ''],
    ['rate_locked', 'Metal rate locked: quote within its 2-day window, or re-priced today', 1, 'auto:rate_valid', 'Quote tab → Re-price'],
    ['promise_date_fixed', 'Promised delivery date fixed: 7 days or more out, or a founder\'s write-off', 1, 'auto:promise_date', 'Order & QC tab → Promised date'],
    ['payment_terms', 'Payment terms agreed (advance %, balance timing)', 1, 'auto:payment_terms', 'Order & QC tab → Payment terms'],
    ['advance_recorded', 'Advance recorded with mode and reference: no order is confirmed without it', 1, 'auto:advance', 'Billing → Record payment (Advance)']
  ],
  'Order Confirmed': [
    ['details_documented', 'Order details documented: design spec, size, metal, stones, deadline', 1, 'auto:design_spec', 'Order tab → Design spec (or the label on the quote)'],
    ['size_cross_checked', 'Size cross-checked against the client\'s own standard (international orders)', 1, 'auto:size_checked', 'Order & QC tab → Karigar order sheet → Client\'s size'],
    ['estimate_shared', 'Estimate / budget documented and shared with client', 1, 'auto:est_cost', 'Locked from the quote total at confirmation'],
    ['confirmation_sent', 'Confirmation message sent (template O1)', 1, 'auto:template:O1', 'Message → O1'],
    ['erp_order_no', 'ERP order number entered on the Order tab', 1, 'auto:order_no', 'Order tab → ERP order no.'],
    ['vendor_assigned', 'Vendor / manufacturer assigned', 1, 'auto:vendor', 'Order tab → Vendor / manufacturer'],
    ['pd_sheet_ready', 'Karigar order sheet complete: nothing required is missing', 1, 'auto:pd_sheet', 'Karigar order sheet card lists what is still missing'],
    ['pd_sheet_issued', 'Karigar order sheet printed and issued to the vendor', 1, 'auto:pd_issued', 'Karigar order sheet card → Order sheet PDF'],
    ['karigar_photo', 'Photo of the issued order sheet attached', 0, 'auto:karigar_sheet', 'Order tab → Karigar order sheet photo'],
    ['premium_flagged', 'Custom / premium materials flagged for cost impact', 0, 'auto:premium', 'Order tab → Premium materials flagged'],
    ['special_requests', 'Special requests noted', 0, 'auto:special_requests', 'Order tab → Special requests']
  ],
  'CAD In Progress': [
    ['design_briefed', 'Design team briefed with spec + reference images', 1, '', ''],
    ['cad_eta_told', 'Client told when to expect the CAD', 1, '', '']
  ],
  'CAD Sent': [
    ['renders_sent', '2–3 renders sent with a note on the design approach (template O2)', 1, 'auto:template:O2', 'Message → O2'],
    ['feedback_deadline', 'Feedback deadline given', 1, '', ''],
    ['feedback_logged', 'All client feedback documented (revisions loop here)', 1, '', '']
  ],
  'CAD Approved': [
    ['final_cad_filed', 'Approved / final CAD marked and filed', 1, '', ''],
    ['final_confirmation', 'Final confirmation with specs + delivery date sent (template O3)', 1, 'auto:template:O3', 'Message → O3'],
    ['production_briefed', 'Production team briefed; start date known', 1, '', ''],
    ['gold_issued', 'Metal issued to the karigar, weight recorded (Demand panel)', 1, 'auto:gold_issued', 'Demand panel → Issue metal'],
    ['diamonds_issued', 'Diamond pieces issued, count and carat recorded (Demand panel)', 1, 'auto:diamonds_issued', 'Demand panel → Issue diamonds'],
    ['materials_noted', 'Special materials / stones ordered noted', 0, '', '']
  ],
  'In Production': [
    ['timeline_tracked', 'Production on track: promised date set and not yet passed (re-promise if it has)', 1, 'auto:promise_date', 'Order tab → Promised date'],
    ['mid_update', 'Mid-process update sent (required for orders ≥ ₹1,00,000) (template O4)', 0, 'auto:template:O4', 'Message → O4'],
    ['client_confirms', 'Any client confirmations obtained and logged', 0, '', ''],
    ['issues_escalated', 'Production issues escalated early', 0, '', '']
  ],
  'QC': [
    ['qc_passed', 'QC checklist completed with status PASS', 1, 'auto:qc_pass', 'Order & QC tab → Quality check form'],
    ['variance_recorded', 'Estimate vs actual (weight + cost) recorded', 1, 'auto:variance', 'Recorded with the QC result'],
    ['variance_resolved', 'Budget variance resolved: within estimate, or client approved the overage', 1, 'auto:variance_ok', 'Order tab → Client approved variance (after O10)']
  ],
  'Ready': [
    ['predelivery_sent', 'Pre-delivery message sent with date/method (template O6)', 1, 'auto:template:O6', 'Message → O6'],
    ['delivery_confirmed', 'Delivery date and method confirmed with client', 1, 'auto:delivery', 'Order tab → Delivery method + Promised date'],
    ['packaging', 'Packaging / certificate / care card prepared', 1, '', ''],
    ['balance_terms', 'Balance settled, or balance-on-delivery agreed and logged', 1, 'auto:balance_ok', 'Billing → Record payment, or terms that say balance on delivery']
  ],
  'Dispatched': [
    ['dispatch_sent', 'Dispatch notification sent (template O7)', 1, 'auto:template:O7', 'Message → O7'],
    ['tracking_recorded', 'Courier + tracking recorded (if not in person)', 0, 'auto:tracking', 'Order tab → Courier + Tracking no.']
  ],
  'Delivered': [
    ['received', 'Delivery confirmed by client', 1, '', ''],
    ['invoice_issued', 'GST invoice issued from Zoho Books: number recorded', 1, 'auto:invoice', 'Billing → GST invoice no.'],
    ['balance_zero', 'Balance is zero (founders may override with a reason)', 1, 'auto:balance_zero', 'Billing → Record payment, or (founders) Order tab → Close-override reason']
  ],
  'Closed': [
    ['followup_sent', 'Follow-up sent within 24–48h (template O8)', 1, 'auto:template:O8', 'Message → O8'],
    ['photo_consent', 'Photo / story consent asked and answer recorded', 0, '', ''],
    ['satisfaction', 'Client satisfaction noted', 0, '', '']
  ]
};

/* ---------- QC form: 7 sections, 33 items, all ticked for PASS ---------- */
const QC_SECTIONS = [
  ['Client order verification & budget', ['Order ID and client name match the piece', 'Original order confirmation + approved CAD retrieved', 'Delivery timeline noted', 'Special requests / customisations noted', '★ Original estimate checked against materials actually used', '★ Any budget variation approved by client (or flagged)']],
  ['Material & purity', ['Gold colour matches order (yellow / white / rose)', 'Purity matches order (14K / 18K / 22K)', 'Cross-checked with the hallmark on the piece', 'Weight within ±2% of estimate']],
  ['Diamond / stone specifications', ['Grade matches client specification', 'Lab-grown certificate checked; number recorded', 'Correct cut and clarity', 'Setting secure, no loose stones (tap test)', 'Carat weight matches']],
  ['Design & detail', ['Physical piece matches approved CAD', 'Engravings / inscriptions correct', 'Design patterns and stone placement correct', 'Clasp / closure / sizing works', 'Approved deviations noted']],
  ['Finishing & polish', ['Smooth surfaces, no rough patches', 'Even colour throughout', 'No scratches or damage', 'Shine / matte as per design', 'Edges and joints properly finished']],
  ['Hallmarking', ['Hallmark present and legible', 'BIS purity mark correct', 'HUID recorded on the order', 'Maker\'s / MARQA mark present']],
  ['Weight & final inspection', ['Complete piece weighed and recorded', 'Weight compared to estimate; variance computed', 'Final visual inspection under good light + loupe', 'Photos taken (mandatory on Rework / Reject)']]
];

/* What the karigar order sheet needs before it prints */
const PD_REQUIRED = ['Order number', 'Vendor / manufacturer', 'Product category', 'What we are making', 'Metal purity', 'Metal colour', 'Approx. metal weight', 'Dispatch (promised) date', 'Product image', 'At least one stone line'];

/* ---------- metal: sell factor / buyback factor / base rate ---------- */
const GOLD = {
  '9K': [0.40, 0.375, 'gold'], '10K': [0.45, 0.416, 'gold'], '12K': [0.52, 0.50, 'gold'], '14K': [0.61, 0.585, 'gold'],
  '18K': [0.76, 0.75, 'gold'], '22K': [0.92, 0.916, 'gold'], '24K': [1.00, 0.995, 'gold'],
  'S925': [1.00, 0.925, 'silver'], 'PT950': [1.00, 0.95, 'platinum']
};
const PURITIES = Object.keys(GOLD);

/* ---------- picklists (Settings → Options); blank = these defaults ---------- */
const OPT = (group, label, items, note) => ({ group, label, items, note: note || '' });
const OPTIONS = {
  source_channels: OPT('Who & where', 'Sources', ['Walk-in', 'Website', 'Meta ad', 'Google', 'Instagram', 'Referral', 'Exhibition', 'Repeat', 'B2B', 'Partner boutique', 'Marketplace', 'Corporate gifting', 'Other'], 'How they found us, or which door. Walk-in and Exhibition mark the contact met in person.'),
  source_codes: OPT('Who & where', 'Source codes: campaign / event', ['WALKIN', 'GMB CALL', 'GMB MSG', 'REF', 'IG DM', 'WEB', 'META', 'EXHIB', 'REPEAT', 'B2B', 'PBQ', 'MKT', 'CORP', 'OTHER', 'AD_SOLI_NOV26', 'BRIDAL_FAIR_OCT26'], 'One per source plus campaign / event codes. Required on capture while the list has entries.'),
  cities: OPT('Who & where', 'Cities', ['Delhi', 'Gurugram', 'Noida', 'Ghaziabad', 'Faridabad', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Chandigarh', 'Lucknow', 'Ahmedabad', 'Dubai', 'London', 'Singapore', 'Other']),
  countries: OPT('Who & where', 'Countries (abroad)', ['United Arab Emirates', 'United Kingdom', 'United States', 'Canada', 'Australia', 'Singapore', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain', 'Hong Kong', 'Germany', 'Other'], 'India is the default. A country here marks every open enquiry international and tags the contact NRI.'),
  tags: OPT('Who & where', 'Tags', ['NRI', 'B2B', 'JEWELLER', 'BNI', 'VIP', 'REPEAT'], 'NRI and REPEAT are set by the system.'),
  competitors: OPT('Who & where', 'Competitors', ['Local jeweller', 'Online lab-grown brand', 'Natural diamond store'], 'Who we lose to. Empty list = the field stays blank.'),
  product_interests: OPT('Enquiry', 'Looking for', ['Engagement ring', 'Bridal set', 'Solitaire studs', 'Pendant', 'Necklace', 'Bracelet', 'Bangles', 'Loose stone', 'Bespoke', 'Gifting', 'Repair / resize', 'Unsure']),
  occasions: OPT('Enquiry', 'Occasions', ['Engagement', 'Wedding', 'Anniversary', 'Birthday', 'Self-purchase', 'Gift', 'Festive', 'Investment enquiry', 'Other']),
  timelines: OPT('Enquiry', 'Timelines', ['This week', 'This month', '1–3 months', 'Just exploring']),
  lost_reasons: OPT('Enquiry', 'Lost reasons', ['Price', 'Bought elsewhere', 'Timeline', 'No response', 'Not ready yet', 'Design not available', 'Natural diamond preferred', 'Other'], 'Required for Lost and Cancelled; the dashboard groups by these.'),
  item_types: OPT('Product', 'Item types', ['Ring', 'Engagement ring', 'Bridal set', 'Earrings / Studs', 'Pendant', 'Necklace', 'Bracelet', 'Bangles', 'Loose stone', 'Other'], 'Quote "Type"; also the labour-rate columns.'),
  sizes: OPT('Product', 'Sizes', [...Array.from({ length: 23 }, (_, i) => 'Ring ' + (i + 4)), 'Bangle 2.2', 'Bangle 2.4', 'Bangle 2.6', 'Bangle 2.8', 'Bangle 2.10', 'Free size', 'Not applicable']),
  gold_colours: OPT('Product', 'Gold colours', ['Yellow', 'White', 'Rose']),
  diamond_shapes: OPT('Product', 'Diamond shapes', ['Round', 'Princess', 'Oval', 'Marquise', 'Pear', 'Emerald', 'Cushion', 'Radiant', 'Asscher', 'Heart', 'Baguette', 'Melee', 'Polki', 'Round single-cut', 'Other'], 'Also the rows of the diamond rate sheet.'),
  diamond_qualities: OPT('Product', 'Diamond qualities', ['VS-FG', 'VVS-FG', 'VVS-EF', 'VS-EF', 'VVS-GH', 'VS-GH', 'SI-GH', 'Mixed', '—'], 'VS-FG is the default on every new line.'),
  stone_settings: OPT('Product', 'Stone settings', ['Prong', 'Pavé', 'Bezel', 'Channel', 'Micro pavé', 'Halo', 'Tension', 'Flush', 'Cluster', 'Invisible', 'Bar', 'Other']),
  platings: OPT('Product', 'Plating / rhodium', ['None', 'Rhodium', 'Black rhodium', 'Rose gold', 'Yellow gold', 'Two-tone']),
  finishes: OPT('Product', 'Finish / texture', ['High polish', 'Matte', 'Brushed', 'Hammered', 'Sandblast', 'Florentine', 'Textured', 'Mixed']),
  techniques: OPT('Product', 'Special techniques', ['Enamelling', 'Engraving', 'Filigree', 'Kundan', 'Hand-carving', 'Laser cutting', 'Milgrain', 'None']),
  post_types: OPT('Product', 'Earring post types', ['Push back', 'Screw back (Bombay)', 'Lever back', 'Omega', 'Hook', 'Clip-on', 'Not applicable']),
  gem_types: OPT('Product', 'Gem types', ['Sapphire', 'Emerald', 'Ruby', 'Tanzanite', 'Aquamarine', 'Morganite', 'Tourmaline', 'Moissanite', 'Pearl', 'Other']),
  cert_labs: OPT('Product', 'Certificate labs', ['IGI', 'GIA', 'HRD', 'SGL', 'GSI', 'IGL', 'Other']),
  diamond_colours: OPT('Product', 'Diamond colours', ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Fancy']),
  diamond_clarities: OPT('Product', 'Diamond clarities', ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3']),
  vendors: OPT('Order & billing', 'Vendors / manufacturers', ['Ramesh Soni (casting)', 'Imran Qureshi (setting)', 'Sunil Verma (polish)', 'Bablu Das (hand fabrication)', 'CAD Studio Jaipur', 'Shree Manufacturing, Mumbai'], 'Required before an order leaves Order Confirmed (Stock and Buyback excepted).'),
  stock_locations: OPT('Order & billing', 'Stock locations', ['Safe', 'Showcase', 'With karigar', 'Bank locker', 'Exhibition']),
  payment_terms: OPT('Order & billing', 'Payment terms', ['50% advance, balance on delivery', '30% advance, balance on delivery', '100% advance', 'Balance on delivery'], 'Needed before Order Confirmed.'),
  delivery_methods: OPT('Order & billing', 'Delivery methods', ['In person', 'Courier', 'Pickup by client'], 'Courier makes a tracking number expected.'),
  couriers: OPT('Order & billing', 'Couriers', ['Blue Dart', 'DTDC', 'Delhivery', 'Sequel Logistics', 'BVC Logistics', 'Hand delivery']),
  payment_modes: OPT('Order & billing', 'Payment modes', ['UPI', 'Card', 'Bank transfer', 'Cash', 'Cheque', 'Other'], 'Anything off the list is saved as Other.'),
  invoice_entities: OPT('Order & billing', 'Invoicing entities', ['MARQA Pvt Ltd'], 'Legal entity on the GST invoice.')
};
const OPTION_GROUPS = ['Who & where', 'Enquiry', 'Product', 'Order & billing'];
const opts = key => (OPTIONS[key] ? OPTIONS[key].items : []);
const SOURCE_CODE_FOR = { 'Walk-in': 'WALKIN', Website: 'WEB', 'Meta ad': 'META', Google: 'GMB CALL', Instagram: 'IG DM', Referral: 'REF', Exhibition: 'EXHIB', Repeat: 'REPEAT', B2B: 'B2B', 'Partner boutique': 'PBQ', Marketplace: 'MKT', 'Corporate gifting': 'CORP', Other: 'OTHER' };
const IN_PERSON_SOURCES = ['Walk-in', 'Exhibition'];

/* ---------- stock ---------- */
const STOCK_KINDS = { diamond: 'Diamond', gem: 'Gem', lot: 'Lot', jewellery: 'Jewellery' };
const STOCK_STATUS = { in_stock: ['In safe', 'green'], issued: ['Issued', 'amber'], memo: ['On memo', 'blue'], sold: ['Sold', ''], consumed: ['Consumed', ''], written_off: ['Written off', 'red'] };
const MOVE_LABEL = { in: 'In', issue: 'Issued', return: 'Returned', memo_out: 'Memo out', memo_back: 'Memo back', sale: 'Sold', adjust: 'Adjusted', write_off: 'Written off', reverse: 'Reversal' };
const GRADES = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
const FLUOR = ['None', 'Faint', 'Medium', 'Strong', 'Very Strong'];

/* ---------- roles and permissions ---------- */
const ROLES = { founders: 'Founders', sales: 'Sales', ops: 'Ops', marketing: 'Marketing' };
const PERM_LABELS = [
  ['contacts.write', 'Add and edit contacts'],
  ['deals.write.lead', 'Capture and edit leads'],
  ['deals.write', 'Edit quotes and the whole deal record'],
  ['deals.write.order', 'Edit order fields (S1–S6)'],
  ['deals.stage.lead', 'Move deals through the lead stages'],
  ['deals.stage.quote', 'Move deals through the quote stages (incl. Lost)'],
  ['deals.stage.order_s1', 'Confirm an order (S1)'],
  ['deals.stage.order', 'Move orders through production to Closed'],
  ['payments.write', 'Record payments'],
  ['payments.edit', 'Correct recorded payments'],
  ['qc.write', 'Record QC checks'],
  ['upload', 'Attach photos (quote, order form, QC)'],
  ['templates.write', 'Edit message templates'],
  ['settings.rates', 'Set today\'s gold, silver and platinum rates'],
  ['demand', 'Demand panel: see material requirements and record gold / diamond issue to karigars'],
  ['stock', 'Stock: see the stock ledger'],
  ['stock.write', 'Stock: add, edit and import items, record issue / return / sale / adjustments'],
  ['stock.cost', 'Stock: see purchase cost and value at cost'],
  ['reports', 'Reports: the walk-in × purchase matrix and the client profiles'],
  ['export.google', 'Export the Google Contacts CSV'],
  ['export.all', 'Export the full database (Excel / CSV tables)'],
  ['import', 'Import data and undo imports']
];
const SENSITIVE_PERMS = ['export.google', 'export.all', 'import', 'stock.cost'];
const PERMS = {
  sales: ['contacts.write', 'deals.write', 'deals.stage.lead', 'deals.stage.quote', 'deals.stage.order_s1', 'payments.write', 'upload', 'stock'],
  ops: ['deals.write.order', 'deals.stage.order', 'payments.write', 'payments.edit', 'qc.write', 'upload', 'settings.rates', 'demand', 'stock', 'stock.write'],
  marketing: ['deals.write.lead', 'deals.stage.lead', 'templates.write']
};
/* Fields a role never receives (fixed, not on the Access screen) */
const ROLE_HIDDEN = {
  founders: [],
  sales: ['buyback_value'],
  ops: ['buyback_value', 'source_code', 'source_channel', 'budget', 'competitor'],
  marketing: ['buyback_value', 'gold_rate_24k', 'gold_rate_applied', 'making_rate', 'labour', 'extra_stones', 'discount_pct', 'discount_amt']
};

/* ---------- settings (Rules, rates, naming, PDFs) ---------- */
const SETTINGS = {
  gold_rate_24k: 14354, gold_rate_date: '2026-11-04', silver_rate_999: 228, silver_rate_date: '2026-11-04', platinum_rate_950: 3180, platinum_rate_date: '2026-11-03',
  weight_tolerance_pct: 2, high_value_threshold: 100000, default_gst: 3, default_usd: 95, default_usd_spread: 2,
  sla_whatsapp_hours: 4, sla_email_hours: 24, target_monthly_revenue: 4000000, followup_default_days: 1,
  read_budget_soft: 400, read_budget_hard: 2000, profile_quick_days: 14, profile_hassle_touches: 12,
  company: 'MARQA Pvt Ltd', default_source: 'Walk-in',
  google_first_template: '{name}', google_last_template: '{source_channel} {tags} ({lifecycle})',
  google_custom_fields: 'Lead source = {source_code}\nSource = {source_channel}\nTags = {tags}\nStatus = {lifecycle}\nCountry = {country}\nMet in person = {met_in_person}',
  pay_details: 'UPI marqa@upi (demo) · bank account and IFSC as set in Settings → Rules',
  review_link: 'g.page/r/marqa-lajpat-nagar/review', referral_offer: 'a ₹5,000 thank-you',
  quote_terms: 'Quotation valid 24 hours from issue, subject to prevailing gold and diamond rates. All lab-grown diamonds certified. Prices inclusive of GST as shown. E&OE.',
  zoho_owner_map: 'riya=riya@example.com\nkabir=kabir@example.com',
  sheets_csv_url: 'https://docs.google.com/spreadsheets/d/e/2PACX-demo/pub?output=csv', sheets_last_fetch: '2026-11-04 09:30'
};
const QUOTE_VALID_HOURS = 24, QUOTE_REPRICE_GRACE_DAYS = 2, PROMISE_MIN_DAYS = 7;

/* Diamond rate sheet: quality band → shape → size band (per-stone ct). Figures are illustrative. */
const SIZE_BANDS = [['−2', 0, 0.005], ['Star', 0.005, 0.01], ['Melee', 0.01, 0.08], ['0.08–0.14', 0.08, 0.15], ['0.15–0.19', 0.15, 0.2], ['0.20–0.34', 0.2, 0.35], ['0.35–0.49', 0.35, 0.5], ['0.50–0.69', 0.5, 0.7], ['0.70–0.89', 0.7, 0.9], ['0.90–0.99', 0.9, 1], ['1.00–1.49', 1, 1.5], ['1.50+', 1.5, 99]];
const QUALITY_BANDS = [
  { key: 'EF', label: 'EF · VVS-VS', qualities: ['VVS-EF', 'VS-EF'] },
  { key: 'FG', label: 'FG · VS', qualities: ['VS-FG', 'VVS-FG'] },
  { key: 'GHI', label: 'GHI · VS-SI', qualities: ['VVS-GH', 'VS-GH', 'SI-GH'] }
];
const RATE_BASE = [9000, 10000, 11000, 12500, 13500, 15000, 17000, 19500, 22000, 24000, 28000, 34000];
const SHAPE_ADJ = { Round: 1, Princess: 0.96, Oval: 1.04, Marquise: 1.06, Pear: 1.04, Emerald: 1.02, Cushion: 1.02, Radiant: 1.02, Heart: 1.08, Polki: 0.7, 'Round single-cut': 0.8 };
const BAND_ADJ = { EF: 1.12, FG: 1, GHI: 0.88 };
const DIAMOND_RATE_MATRIX = Object.fromEntries(QUALITY_BANDS.map(b => [b.key, Object.fromEntries(Object.entries(SHAPE_ADJ).map(([shape, f]) => [shape, RATE_BASE.map(r => Math.round(r * f * BAND_ADJ[b.key] / 100) * 100)]))]));
const LABOUR_MATRIX = {
  '*': { '9K': 1100, '10K': 1100, '12K': 1200, '14K': 1400, '18K': 1400, '22K': 1500, '24K': 1500, S925: 900, PT950: 2200 },
  'Bangles': { '14K': 1200, '18K': 1250 }, 'Necklace': { '14K': 1300, '18K': 1300 }
};

/* ---------- WhatsApp templates (the customer journey) ---------- */
const TPL = (key, name, journey, stage, cat, trigger, body) => ({ key, name, journey, stage, cat, trigger, body, active: true });
const TEMPLATES = [
  TPL('L1', 'Enquiry acknowledged', 'lead', 'New', 'service', null, 'Hi {name}, thank you for reaching out to MARQA. I\'m {agent}, happy to help. Could you tell me a little about what you have in mind (the piece, the occasion, a rough budget)? If it\'s easier, we can talk on a quick call or you can visit us at Lajpat Nagar.'),
  TPL('L2', 'Consult / visit invite', 'lead', 'Contacted', 'utility', null, 'Hi {name}, lovely to hear from you. For a {interest}, the easiest way to get it right is to see stones side by side. Would you like to visit our Lajpat Nagar showroom, or do a 15-minute video consult? Suggested slots: {slots}.'),
  TPL('L3', 'Quote sent, with the breakdown', 'quote', 'Quoted', 'utility', null, 'Hi {name}, here is your quotation {quote_no} for {piece}.\n\nStones: INR {diamond_value}\nGold ({gold_wt} g, {purity} @ INR {gold_rate}/g): INR {gold_value}\nMaking: INR {labour}\nGST ({gst_pct}%): INR {gst_amt}\nTotal: INR {total}\n\nThis holds for 24 hours at today\'s gold rate. Nothing is hidden in that number; ask me anything about it.'),
  TPL('L4', 'Quote follow-up (day 3)', 'quote', 'Quoted', 'marketing', 3, 'Hi {name}, just checking whether you had a chance to look at the quotation for {piece}. If anything about the stone, the setting or the price needs adjusting, tell me. Most pieces change a little between the first quote and the final one.'),
  TPL('L5', 'Rate check-in (day 1)', 'quote', 'Quoted', 'utility', 1, 'Hi {name}, a quick note: quotation {quote_no} holds at today\'s gold rate until {valid_till}. If you\'d like to go ahead, I can lock it with the advance.'),
  TPL('L6', 'Door stays open', 'lead', 'Lost', 'marketing', null, 'Hi {name}, thank you for considering MARQA. If the timing or the piece changes, I\'m here, and if you\'d ever like a second opinion on a stone you\'re looking at elsewhere, I\'m happy to give one honestly.'),
  TPL('O1', 'Order received (S1)', 'order', 'Order Confirmed', 'utility', null, 'Hi {name}, thank you for choosing MARQA. We\'ve received your order {order_no} for {piece}.\n\nEstimate: INR {est_cost} · Advance received: INR {advance} · Balance: INR {balance}\n\nWhat happens next: we\'ll create the CAD design from your specifications and send it for your approval by {cad_date}.'),
  TPL('O2', 'CAD ready for approval (S2)', 'order', 'CAD Sent', 'utility', null, 'Hi {name}, your CAD design for {piece} is ready, images attached from {angles} angles. Please look closely at size, proportions and stone placement. A reply by {feedback_date} keeps us on schedule for {delivery_date}.'),
  TPL('O3', 'Design finalised, production starting (S3)', 'order', 'CAD Approved', 'utility', null, 'Hi {name}, your design is final and we\'re starting production.\n\nMetal: {gold_colour} gold, {purity}\nStones: {stone_spec}\nEstimated weight: {est_weight} g\nExpected delivery: {delivery_date}\n\nIf the finished weight differs from the estimate by more than 2%, we\'ll tell you before delivery, never after.'),
  TPL('O4', 'Mid-process update (S4)', 'order', 'In Production', 'utility', null, 'Hi {name}, a quick update on {piece}: we\'re at the {production_stage} stage and on track for {delivery_date}. {photo_line}'),
  TPL('O5', 'Confirmation needed (S4)', 'order', 'In Production', 'utility', null, 'Hi {name}, one quick confirmation before we continue: you mentioned {detail}. Shall we proceed with {option}? A reply by {reply_by} keeps everything on schedule.'),
  TPL('O6', 'QC passed, ready (S5)', 'order', 'Ready', 'utility', null, 'Hi {name}, good news: {piece} has passed our quality check and is ready. Final weight {actual_weight} g, hallmarked, certificate {cert_no}. Delivery: {delivery_method} on {delivery_date}. {balance_line}'),
  TPL('O7', 'Dispatched (S6)', 'order', 'Dispatched', 'utility', null, 'Hi {name}, your MARQA piece is on its way. {tracking_line} Expected {delivery_date}. Please check the seal is intact before accepting, and message me the moment it arrives.'),
  TPL('O8', 'Delivered, follow-up (S6, 24–48h)', 'order', 'Closed', 'utility', 2, 'Hi {name}, we hope {piece} is exactly what you imagined. If you\'re happy, a photo of it being worn would make our week. Care tip: warm water, a drop of mild soap, a soft brush; we\'ll clean and polish it free whenever you\'re passing.'),
  TPL('O9', 'Delay notice (rework / reject)', 'order', 'QC', 'utility', null, 'Hi {name}, an honest update: at quality check we weren\'t satisfied with {issue} on {piece}, so we\'ve sent it back for correction. New expected date: {new_date}. I\'d rather you have the piece perfect than on time.'),
  TPL('O10', 'Weight / budget variance: approval needed', 'order', 'QC', 'utility', null, 'Hi {name}, before we deliver: the finished weight of {piece} came to {actual_weight} g against the {est_weight} g estimate, which changes the price from INR {est_cost} to INR {actual_cost}. We won\'t proceed without your okay. Reply YES to confirm, or call me.'),
  TPL('B1', 'Advance receipt', 'billing', 'Order Confirmed', 'utility', null, 'Hi {name}, received with thanks: INR {amount} by {mode} ({reference}) towards order {order_no}. Balance due: INR {balance}. Your GST invoice will be issued on delivery.'),
  TPL('B2', 'Balance reminder', 'billing', 'Ready', 'utility', null, 'Hi {name}, {piece} is ready for delivery on {delivery_date}. Balance due: INR {balance}. UPI / bank details: {pay_details}. Once received, we\'ll issue the GST invoice and confirm the slot.'),
  TPL('B3', 'Payment received, thank you', 'billing', 'Delivered', 'utility', null, 'Hi {name}, thank you: INR {amount} received, and order {order_no} is fully settled. Your GST invoice {invoice_no} is attached. Keep it with the certificate.'),
  TPL('P1', '30-day check-in + care', 'post', 'Closed', 'marketing', 30, 'Hi {name}, it\'s been a month with {piece}. How is it wearing? Take it off for gym and pool, and let us clean it free whenever you\'re near Lajpat Nagar.'),
  TPL('P2', 'Review / photo request', 'post', 'Closed', 'marketing', 45, 'Hi {name}, if MARQA earned it, a Google review would help the next person choosing a jeweller: {review_link}. And a photo is always welcome, with your permission only.'),
  TPL('P3', 'Referral', 'post', 'Closed', 'marketing', 60, 'Hi {name}, most of our clients come to us because someone they trust sent them. If a friend is looking for a ring or a gift, send them my way. There\'s {referral_offer} on their first piece.'),
  TPL('P4', '6-month clean & polish invite', 'post', 'Closed', 'marketing', 180, 'Hi {name}, six months on, {piece} is due a professional clean and a prong check. It\'s free and takes ten minutes.'),
  TPL('P5', 'Anniversary of purchase', 'post', 'Closed', 'marketing', 365, 'Hi {name}, a year ago today you took {piece} home. Thank you for trusting us.'),
  TPL('P6', 'Birthday / anniversary greeting', 'post', null, 'marketing', null, 'Hi {name}, wishing you a very happy {occasion} from all of us at MARQA.'),
  TPL('P7', 'Festive note', 'post', null, 'marketing', null, 'Hi {name}, warm wishes for {festival} from MARQA.'),
  TPL('P8', 'Upgrade / buyback invitation', 'post', 'Closed', 'marketing', 365, 'Hi {name}, if you ever want to upgrade {piece}, we\'ll credit it at today\'s buyback rate towards a new design.')
];
const JOURNEYS = [['lead', 'Lead'], ['quote', 'Quote'], ['order', 'Order: S1–S6'], ['billing', 'Billing'], ['post', 'Post-purchase & engagement']];

/* ---------- ring and bangle size standards ---------- */
const UK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const UK_MM = [37.8, 39.1, 40.4, 41.7, 42.9, 44.2, 45.5, 46.8, 48.0, 49.3, 50.6, 51.9, 52.5, 53.8, 55.1, 56.3, 57.6, 58.9, 60.2, 61.4, 62.7, 64.0, 65.3, 66.6, 67.8, 68.5];

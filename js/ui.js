/* Shared UI helpers: icons, formatting, small components, sheets and toasts. */

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  chat: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75|c:9,7,4',
  user: 'M4 21a8 8 0 0 1 16 0|c:12,8,4',
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  funnel: 'M3 4h18l-7 8.5V19l-4 2v-8.5z',
  board: 'M4 4h4v15H4zM10 4h4v9h-4zM16 4h4v12h-4z',
  gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M10 3 8 9l4 12 4-12-2-6',
  ring: 'M9 3h6l2 3-5 4-5-4z|c:12,15,6',
  hammer: 'M13 7 4 16a2.1 2.1 0 0 0 3 3l9-9M11 4h6l4 4v3l-3 1-7-7z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  sparkles: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2L16 17l2.2-.8zM5 2.5l.6 1.4 1.4.6-1.4.6L5 6.5l-.6-1.4L3 4.5l1.4-.6z',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14',
  store: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  coins: 'M15.2 9.5A6 6 0 1 1 9.5 15.2|c:9,9,6',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3',
  chart: 'M3 20h18M6 16v-5M11 16V6M16 16v-8M21 16v-3',
  settings: 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z|c:12,12,3',
  search: 'M21 21l-4.3-4.3|c:11,11,7',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  plus: 'M12 5v14M5 12h14',
  chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6',
  x: 'M18 6 6 18M6 6l12 12', check: 'M20 6 9 17l-5-5',
  clock: 'M12 7v5l3 2|c:12,12,9',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  mail: 'M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z|c:12,13,4',
  image: 'M21 15l-5-5L5 21M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|c:8.5,8.5,1.5',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  calendar: 'M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  pin: 'M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z|c:12,10,2.5',
  star: 'M12 3l2.8 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.5 20l1-6.1L3 9.5l6.2-.9z',
  more: '|c:5,12,1.2|c:12,12,1.2|c:19,12,1.2',
  arrowUR: 'M7 17 17 7M8 7h9v9', arrowR: 'M5 12h14M13 6l6 6-6 6',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  mic: 'M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5',
  trend: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  scale: 'M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0zM8 21h8',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|c:12,12,3',
  share: 'M8.6 13.5l6.8 4M15.4 6.5l-6.8 4|c:18,5,3|c:6,12,3|c:18,19,3',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z|c:7.5,7.5,1.5',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  copy: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  key: 'M11.5 11.5 21 2M17 6l3 3M15 8l2 2|c:7.5,15.5,5.5',
  plug: 'M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0zM12 17v5',
  card: 'M2 10h20M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  globe: 'M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20|c:12,12,10',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7z|c:5.5,18.5,2.5|c:18.5,18.5,2.5',
  lock: 'M8 11V7a4 4 0 0 1 8 0v4M6 11h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  wand: 'M3 21 15 9M14 4v2M18 8h2M17 5l1.5-1.5M10 6l1 1M17 11l1 1',
  cube: 'M21 16V8l-9-5-9 5v8l9 5zM3.3 7 12 12l8.7-5M12 22V12',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 18h2M18 14h3',
  play: 'M6 4l14 8-14 8z',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  percent: 'M19 5 5 19|c:6.5,6.5,2.5|c:17.5,17.5,2.5',
  doc: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6',
  wa: 'M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.6zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.4-1.5-2-1-1 .8c-1-.4-2.2-1.6-2.6-2.6l.8-1-1-2z'
};
function icon(name, cls) {
  const d = ICONS[name] || ICONS.more;
  const [p, ...circles] = d.split('|');
  const cs = circles.map(c => { const [x, y, r] = c.slice(2).split(','); return `<circle cx="${x}" cy="${y}" r="${r}"/>`; }).join('');
  return `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${p ? `<path d="${p}"/>` : ''}${cs}</svg>`;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr = n => '₹' + NF.format(Math.round(n));
function inrShort(n) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return inr(n);
}
const grams = n => (Math.round(n * 100) / 100).toFixed(2) + ' g';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fdate = d => d ? `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}` : '—';
function rel(d) {
  if (!d) return '—';
  const n = Math.round((new Date(d.toDateString()) - new Date(TODAY.toDateString())) / 864e5);
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
const daysTo = d => Math.round((new Date(d.toDateString()) - new Date(TODAY.toDateString())) / 864e5);

const cust = id => CUSTOMERS.find(c => c.id === id) || { name: id, color: '#8A847B', tags: [] };
const karigar = id => KARIGARS.find(k => k.id === id);
const initials = n => n.replace(/&/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const av = (name, color, size) => `<span class="av ${size || ''}" style="background:${color || '#8A847B'}">${esc(initials(name))}</span>`;
const badge = (t, tone, dot) => `<span class="badge ${tone || ''}">${dot ? '<i class="d"></i>' : ''}${esc(t)}</span>`;


/* tiny charts */
function sparkline(vals, color) {
  const w = 120, h = 36, mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [i * w / (vals.length - 1), h - 4 - (v - mn) / rg * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d} L${w} ${h} L0 ${h}Z" fill="${color || '#B08D57'}" opacity=".1"/><path d="${d}" fill="none" stroke="${color || '#B08D57'}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
}
function columnChart(vals, labels, hi) {
  const w = 520, h = 190, pad = 26, mx = Math.max(...vals) * 1.12, bw = (w - pad) / vals.length;
  const bars = vals.map((v, i) => {
    const bh = (h - 40) * v / mx, x = pad + i * bw + bw * .22, y = h - 22 - bh;
    const on = i === (hi == null ? vals.length - 2 : hi);
    return `<rect x="${x}" y="${y}" width="${bw * .56}" height="${bh}" rx="5" fill="${on ? '#1A1A1A' : '#D9CBB2'}"/>
      <text x="${x + bw * .28}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="${on ? '#1A1A1A' : '#8A847B'}">${inrShort(v).replace('₹', '')}</text>
      <text x="${x + bw * .28}" y="${h - 6}" text-anchor="middle" font-size="11" fill="#8A847B">${labels[i]}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">${[0, .5, 1].map(f => `<line x1="${pad}" x2="${w}" y1="${h - 22 - (h - 40) * f}" y2="${h - 22 - (h - 40) * f}" stroke="#F0ECE5"/>`).join('')}${bars}</svg>`;
}

/* layer: sheets, modals */
const layer = () => document.getElementById('layer');
function closeLayer() { layer().innerHTML = ''; document.body.style.overflow = ''; }
function openSheet({ title, sub, body, foot, wide, onMount }) {
  layer().innerHTML = `<div class="scrim" data-act="close"></div>
    <aside class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-label="${esc(title)}">
      <div class="sh-h"><div class="grow"><h2>${title}</h2>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
      <button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
      <div class="sh-b">${body}</div>${foot ? `<div class="sh-f">${foot}</div>` : ''}</aside>`;
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(layer().querySelector('.sheet'));
}
function openModal(html, cls, onMount) {
  layer().innerHTML = `<div class="scrim" data-act="close"></div><div class="modal ${cls || ''}" role="dialog">${html}</div>`;
  if (onMount) onMount(layer().querySelector('.modal'));
}
function toast(msg, ic) {
  const el = document.createElement('div');
  el.className = 'toast'; el.innerHTML = icon(ic || 'check') + esc(msg);
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* registries: screens register themselves; data-act="name" calls ACTIONS[name](el, event) */
const SCREENS = {};
const ACTIONS = {};
const go = hash => { location.hash = hash; };

/* page head */
const pageHead = (title, sub, actions) => `<div class="ph"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
const card = (title, body, opts = {}) => `<section class="card ${opts.cls || ''}">${title ? `<div class="card-h"><h3>${title}</h3>${opts.right || ''}</div>` : ''}<div class="card-b ${opts.flush ? 'flush' : ''}">${body}</div></section>`;


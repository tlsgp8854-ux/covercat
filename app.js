/* CoverCat · horror for scaredy-cats. Vanilla JS, no build step.
   Screens are functions that return HTML built from the design-system classes in styles.css;
   go() renders one and keeps a back stack. Everything the person does is kept in localStorage under KEY. */
'use strict';
const KEY = 'peek.v1';
const app = document.getElementById('app');

/* ---------- data ---------- */
const GEN = {
  sup: { n: 'Supernatural', d: 'Ghosts, demons, curses', subs: [['ghosts', 'Ghosts'], ['possession', 'Possession']] },
  mon: { n: 'Monsters', d: 'Zombies, aliens, creatures', subs: [['zombies', 'Zombies'], ['creatures', 'Aliens']] },
  kil: { n: 'Killers', d: 'Slashers, home invasion, serial killers' },
  psy: { n: 'Psychological', d: 'Dread, paranoia, mind games' },
  gore: { n: 'Gore', d: 'Blood and injuries' }
};
const ORDER = ['sup', 'mon', 'kil', 'psy', 'gore'];
// What each star level feels like, per genre (level screen)
const LV_NAME = ['Gentle', 'Getting braver', 'Bring it'];
const LV_TXT = {
  sup: ['Creepy houses and spooky vibes. More mood than ghosts in your face.', 'Real hauntings and some nasty surprises. You will want the lights on.', 'Full-on demons and possessions. The ones people talk about for weeks.'],
  mon: ['Creature fun with laughs or action. Monsters you can cheer against.', 'Proper chases and tense hiding, with a few jumps on the way.', 'Relentless creatures and nowhere to run. Grip the sofa.'],
  kil: ['Mystery and suspense. More running than stabbing.', 'Classic slasher tension. Someone is in the house and you know it.', 'Brutal, drawn out and very personal. Not a cosy night in.'],
  psy: ['Odd and unsettling, but you will still sleep fine.', 'Slow dread that gets under your skin. Nothing is what it seems.', 'Deeply disturbing mind games. It stays with you for days.'],
  gore: ['Scary first, bloody second. Most of it happens off screen.', 'Some blood and a few wounds. It does not linger.', 'The hardest ones to sit through. A strong stomach helps.']
};
const TRIG = { an: 'Animals getting hurt', ch: 'Children getting hurt', su: 'Suicide or self-harm', sx: 'Sexual violence' };
const SEEN = ['tt0117571', 'tt5052448', 'tt6644200', 'tt1457767', 'tt0387564', 'tt8772262', 'tt1922777', 'tt7784604', 'tt1029234'];
const GORE_CAP = [2.4, 6.3, 8.7, 10];
const ZONE = [0, 6.4, 7.7, 10.01]; // level n = scare in [ZONE[n-1], ZONE[n])
const BLOOD_OPTS = ["I can't watch any blood", 'A little blood is okay', 'Wounds and injuries are okay', 'Bring on the gore'];
const JUMP_LINE = 'Next up, jump scares. How do you feel about them? Take your time…';
let FILMS = [], BY = {};

/* ---------- state ---------- */
const fresh = () => ({ test: { genres: {}, blood: null, jump: null, avoid: [], seen: {} }, done: false,
  levels: null, xp: 0, watched: {}, saved: [], sound: true, sel: null, name: '', offered: false, face: 'calm', photo: '', alHint: false });
let S = load();
// Web (1024px and up) is handled in web.js: it sets route, webURL and webStart
const isWeb = () => matchMedia('(min-width:1024px)').matches;
let route = (n, p) => [n, p], webURL = () => {}, webStart = null;
document.addEventListener('input', e => {
  if (e.target.id === 'afq') { AF.q = e.target.value; const r = app.querySelector('#afres'), all = app.querySelector('#afall'); r.innerHTML = afResults(AF.q); app.querySelector('.sf-clear').hidden = !AF.q; r.hidden = !AF.q.trim(); all.hidden = !!AF.q.trim(); }
});
function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.test) return Object.assign(fresh(), v); } catch (e) {} return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (S.user) putAccount(acctKey(S.user), S); }
// Accounts (simulated, no server): each account's progress is kept in this browser under its email or name.
// Log out stores it and starts a fresh visitor; logging in with the same email or name brings it back.
const ACCTS = 'peek.accounts';
const acctKey = u => ((u && (u.email || u.name)) || '').trim().toLowerCase();
function accounts() { try { return JSON.parse(localStorage.getItem(ACCTS)) || {}; } catch (e) { return {}; } }
function putAccount(k, v) { if (!k) return; try { const a = accounts(); a[k] = v; localStorage.setItem(ACCTS, JSON.stringify(a)); } catch (e) {} }
function dropAccount(k) { try { const a = accounts(); delete a[k]; localStorage.setItem(ACCTS, JSON.stringify(a)); } catch (e) {} }
function logIn(name, email) {
  const k = acctKey({ name, email }), saved = k && accounts()[k];
  if (saved) S = Object.assign(fresh(), saved, { lo: false });                               // welcome back: that account's progress
  else if (!S.user && S.done) Object.assign(S, { user: { name, email }, name, lo: false });      // new account keeps what this visitor already did
  else S = Object.assign(fresh(), { user: { name, email }, name, sound: S.sound, offered: true, lo: false });
  save(); return !!saved;
}
function logOut() { if (S.user) putAccount(acctKey(S.user), S); const sound = S.sound; S = Object.assign(fresh(), { sound, lo: true }); save(); }

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Three stars as one unbreakable unit, so flex gaps never split the dim ones off
const stars = (n, cls = '') => `<span class="stars ${cls}" aria-label="Level ${n} of 3"><span aria-hidden="true">${'★'.repeat(n)}<span class="dim">${'★'.repeat(3 - n)}</span></span></span>`;
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const PAL = [['#3B4A6B', '#0B1020'], ['#6E7F99', '#1A2233'], ['#2E4C55', '#081418'], ['#7A3340', '#1A0A12'], ['#4F5A3A', '#11140A']];
const posterBg = id => { const p = PAL[hash(id) % PAL.length]; return `background:linear-gradient(160deg,${p[0]},${p[1]})`; };
// Poster art from TMDB. No poster: the gradient behind stays as the card
const IMG = 'https://image.tmdb.org/t/p/';
const art = (f, size = 'w342') => f.poster ? `<img class="art" src="${IMG}${size}${f.poster}" alt="" loading="lazy" decoding="async" crossorigin="anonymous" onerror="this.parentNode.classList.remove('has-art');this.remove()">` : '';
const mainG = f => f.g.find(g => g !== 'gore') || 'gore';
const pl = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const courage = () => 1 + Math.floor(S.xp / 2);
// Jump timestamps: "js" holds seconds from the film's first scene, * = big scare ("295 2936* 3050")
const stamps = f => (f.js || '').split(' ').filter(Boolean).map(s => ({ s: parseFloat(s), big: s.endsWith('*') }));
// Start minute of the 10-minute stretch with the most jump scares
function busiest(st) {
  const cnt = {}; st.forEach(x => { const b = Math.floor(x.s / 600) * 10; cnt[b] = (cnt[b] || 0) + 1; });
  return +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a - b)[0] || 0;
}
// Timer chart: the detail page's 10-minute bars, past blocks dimmed, a white NOW line at the film time
function liveBars(st, rt) {
  const n = Math.ceil(rt / 10), all = Array(n).fill(0), big = Array(n).fill(0);
  st.forEach(x => { const i = Math.min(n - 1, Math.floor(x.s / 600)); all[i]++; if (x.big) big[i]++; });
  const mx = Math.max(1, ...all), lab = [0, 30, 60, 90, 120, 150].filter(m => m <= rt - 8);
  return `<div class="lchart" role="img" aria-label="Jump scares per 10 minutes, with a line at the current film time">
    <div class="lbars">${all.map((c, i) => `<div><span class="jb" style="height:${c ? Math.round(Math.max(6, c / mx * 64)) : 0}px">${big[i] ? `<i class="big" style="height:${(big[i] / c * 100).toFixed(1)}%"></i>` : ''}</span></div>`).join('')}
      <span class="lnow" id="alnow"><b>Now</b><i aria-hidden="true"></i></span></div>
    <div class="laxis">${lab.map((m, i) => { const at = m / (n * 10) * 100, last = i === lab.length - 1; return `<small class="${!m ? 'first' : last && at > 80 ? 'last' : ''}" style="left:${at.toFixed(2)}%">${m}${last ? ' min' : ''}</small>`; }).join('')}</div></div>
  <div class="tl-key small t3"><span><i></i>Jump scare</span><span><i class="big"></i>Big scare</span></div>`;
}
// Jump bars: one bar per 10 minutes with its count on top; big scares stacked red, the rest cyan; the busiest block highlighted
function jumpBars(st, rt, busy) {
  const n = Math.ceil(rt / 10), all = Array(n).fill(0), big = Array(n).fill(0);
  st.forEach(x => { const i = Math.min(n - 1, Math.floor(x.s / 600)); all[i]++; if (x.big) big[i]++; });
  const mx = Math.max(...all);
  return `<div class="jbars" role="img" aria-label="Jump scares per 10 minutes. ${pl(st.length, 'jump scare')}, ${pl(st.filter(x => x.big).length, 'big one')}">${all.map((c, i) => `<div class="${i * 10 === busy ? 'busy' : ''}">
    <b>${c || ''}</b><span class="jb" style="height:${c ? Math.round(Math.max(6, c / mx * 84)) : 0}px">${big[i] ? `<i class="big" style="height:${(big[i] / c * 100).toFixed(1)}%"></i>` : ''}</span><small>${i * 10}</small></div>`).join('')}</div>
  <div class="tl-key small t3"><span><i></i>Jump scare</span><span><i class="big"></i>Big scare</span></div>`;
}
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

// Ransom letters, big moments only. Letters are grouped per word (.rw never wraps), so lines break only between words
function ransom(text, size = 64, one = false) {
  const looks = [['#F2F6FF', '#050A1E', 'var(--f-d)', 900, 'italic'], ['#1F6BFF', '#F2F6FF', 'var(--f-n)', 400, 'normal'],
    ['#050A1E', '#7FF0FF', 'var(--f-d)', 900, 'italic'], ['#7FF0FF', '#04103F', 'var(--f-b)', 700, 'normal'], ['#0A1A5E', '#F2F6FF', 'var(--f-n)', 400, 'normal']];
  let i = 0;
  const word = w => `<span class="rw">${[...w].map(ch => {
    const L = looks[(i * 3 + hash(text)) % looks.length], r = ((i * 7) % 11) - 5; i++;
    return `<span class="rl" aria-hidden="true" style="background:${L[0]};color:${L[1]};font-family:${L[2]};font-weight:${L[3]};font-style:${L[4]};font-size:${(0.85 + (i % 3) * 0.1).toFixed(2)}em;--r:${r}deg;--i:${i}">${esc(ch)}</span>`;
  }).join('')}</span>`;
  return `<div class="ransom ${one ? 'one' : ''}" role="img" aria-label="${esc(text)}" style="font-size:${size}px" data-fit="${size}" data-fit-min="16">${text.split(' ').map(word).join('')}</div>`;
}

/* ---------- Peek ---------- */
// Width / height of every pose. Peek is always drawn whole and sized from the space it gets
const AR = { calm: 267 / 324, curious: 290 / 317, ready: 275 / 332, cantlook: 270 / 323, earsdown: 344 / 299, scared: 288 / 298,
  'wave-1': 575 / 654, 'sit-0-cover': 578 / 614, 'sit-1-peek': 552 / 614, 'sit-2-bandaid': 562 / 614, 'sit-3-shades': 563 / 614 };
const BOO = ['boo-1-crouch', 'boo-2-rise', 'boo-3-pop', 'boo-4-land'];
const CAT_FILES = [...Object.keys(AR), ...BOO];
// Where the syrup drop lands, as a share of the pose (x, y)
const DROPS = { curious: [.58, .135], 'sit-3-shades': [.63, .485] };
const DROP = `<svg class="drop" viewBox="0 0 20 28" aria-hidden="true"><path d="M10 1C10 1 1.5 13 1.5 18.5a8.5 8.5 0 0 0 17 0C18.5 13 10 1 10 1Z" fill="#D8143A" stroke="#0A0F24" stroke-width="2"/><path d="M6 18a4 4 0 0 1 3-4.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".75"/></svg>`;
/* Pose normalisation: every pose is drawn so its body has the same height, its feet sit on the same baseline and
   its body is centred, whatever empty space or raised paws its file has. Measured from the drawn pixels:
   [head top, feet line, body centre x] as shares of the file's height / width (centre from the lower body) */
const BODY = { calm: [.018, .985, .488], curious: [.018, .983, .493], ready: [.018, .983, .479], cantlook: [.018, .983, .497],
  earsdown: [.02, .982, .49], scared: [.02, .983, .48], 'wave-1': [.013, .988, .489], 'sit-0-cover': [.012, .987, .495],
  'sit-1-peek': [.013, .987, .491], 'sit-2-bandaid': [.013, .987, .491], 'sit-3-shades': [.013, .987, .491] };
const boxAR = k => AR[k] / (BODY[k][1] - BODY[k][0]);
// ar = the box Peek gets (width / body height). Poses that swap on one screen share one box
function peek(k, { cls = '', drop = false, ar = boxAR(k), inner = '' } = {}) {
  const d = drop && DROPS[k], [t, b, cx] = BODY[k], h = 1 / (b - t), w = h * AR[k] / ar * 100;
  const place = `height:${(h * 100).toFixed(2)}%;width:${w.toFixed(2)}%;top:${(-t * h * 100).toFixed(2)}%;left:${(50 - cx * w).toFixed(2)}%`;
  return `<span class="pk ${cls}" style="--ar:${ar.toFixed(3)}"><span class="pk-in"><span class="pk-img" style="${place}">${inner || `<img src="cats/${k}.svg" alt="">`}${d ? `<span class="dropat" style="left:${d[0] * 100}%;top:${d[1] * 100}%">${DROP}</span>` : ''}</span></span></span>`;
}
// Peek standing on a full-width dialogue box with the slanted PEEK name tag. Peek scales with the free height
function scene(k, text, o = {}) {
  return `<div class="scene ${o.compact ? 'compact' : ''} ${o.tight ? 'tight' : ''} ${o.mid ? 'mid' : ''}"><div class="scene-peek">${o.peekHtml || peek(k, o)}</div>
    <div class="dlg glass"><span class="nametag"><span>COVERCAT</span></span><p ${o.pid ? `id="${o.pid}"` : ''} ${o.label ? `aria-label="${esc(o.label)}"` : ''}>${text}</p></div></div>`;
}
/* sit-2-bandaid is drawn inline from its own file, with the band-aid (peach fill + its lines) split into a group,
   so the band-aid can squash on its own when it sticks */
let SIT2 = null;
const bbox = d => { const n = d.match(/-?[0-9.]+/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
function bandaidCat() {
  if (!SIT2) return '';
  const paths = [...SIT2.matchAll(/<path d="([^"]+)"([^>]*)>/g)], vb = (SIT2.match(/viewBox="([^"]+)"/) || [])[1];
  const by = c => paths.find(p => p[2].includes(c)), white = by('#FFFFFF'), peach = by('#F6C99B'), dark = by('#0A0F24');
  if (!vb || !white || !peach || !dark) return '';
  const box = bbox(peach[1]), subs = dark[1].split(/(?=M)/);
  const inAid = sp => { const b = bbox(sp); return b[0] >= box[0] - 2 && b[1] >= box[1] - 2 && b[2] <= box[2] + 2 && b[3] <= box[3] + 2; };
  return `<svg class="cat" viewBox="${vb}" aria-hidden="true"><path d="${white[1]}" fill="#FFFFFF"/><path d="${subs.filter(s => !inAid(s)).join('')}" fill="#0A0F24" fill-rule="evenodd"/>
    <g class="aid"><path d="${peach[1]}" fill="#F6C99B"/><path d="${subs.filter(inAid).join('')}" fill="#0A0F24" fill-rule="evenodd"/></g></svg>`;
}
/* Blood question: Peek stays sitting; every pose sits in one box (BLOOD_AR) so size and position never change.
   Answer -> [pose, motion, Peek's line] */
// Scare check: all three poses share one box, so Peek keeps its size and position across the steps
const CHECK_AR = Math.max(...['curious', 'earsdown', 'ready'].map(k => AR[k] / (BODY[k][1] - BODY[k][0])));
const BLOOD_AR = Math.max(...['curious', 'sit-0-cover', 'sit-1-peek', 'sit-2-bandaid', 'sit-3-shades'].map(boxAR));
const bloodLook = v => [
  ['curious', '', 'Can you handle blood?'],
  ['sit-0-cover', 'shake', 'Same here. We will keep it clean, promise.'],
  ['sit-1-peek', 'react-in', 'Just a little peek then. That works.'],
  ['sit-2-bandaid', 'proud', 'Tough cookie! Wounds are okay.'],
  ['sit-3-shades', 'chill', 'Ooh, cool cat. Bring on the gore.']
][v == null ? 0 : v + 1];
function bloodPeek(v, swap = false) {
  const [k, motion] = bloodLook(v);
  return peek(k, { cls: `${swap ? motion : ''} ${swap ? 'swap' : ''}`, drop: v == null || v === 3, ar: BLOOD_AR, inner: v === 2 ? bandaidCat() : '' });
}

/* ---------- building blocks ---------- */
function topbar({ back = true, skip = null, step = null } = {}) {
  const prog = step ? `<div class="prog" role="img" aria-label="Step ${step[0]} of ${step[1]}">${Array.from({ length: step[1] }, (_, i) => `<i class="${i < step[0] ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>';
  const bk = typeof back === 'string' ? `data-act="backto" data-s="${back}"` : 'data-act="back"';
  return `<div class="top">${back ? `<button class="back" ${bk}>‹ Back</button>` : '<span class="back"></span>'}${prog}${skip ? `<button class="skip" data-go="${skip}">Skip</button>` : '<span class="skip"></span>'}</div>`;
}
const kick = t => `<span class="kick"><span>${t}</span></span>`;
// Kicker plate, screen title (two lines max, then it shrinks) and an optional subline
const head = (k, t, sub = '') => `${kick(k)}<h1 class="d h1 title" data-fit-lines="2" data-fit="32" data-fit-min="22">${t}</h1>${sub ? `<p class="txt t2 sub">${sub}</p>` : ''}`;
const sec = (t, more = '') => `<div class="sec"><h2 class="d h2">${t}</h2>${more}</div>`;
const btn = (label, attrs = '', red = false) => `<button class="btn ${red ? 'red' : ''}" ${attrs}><span data-fit="22" data-fit-min="15">${label}</span></button>`;
// multi-choice row: label left, circle right (✓ when on)
const crow = (label, attrs, on) => `<button class="crow glass" aria-pressed="${on}" ${attrs}><span>${label}</span><span class="tick" aria-hidden="true">${on ? '✓' : ''}</span></button>`;
const opt = (label, attrs, on) => `<button class="opt glass" aria-pressed="${on}" ${attrs}><span class="radio" aria-hidden="true"></span><span>${label}</span></button>`;
const soundSwitch = () => `<button class="switch" role="switch" aria-checked="${S.sound}" data-act="sound"><span>Sound on</span><span class="knob" aria-hidden="true"></span></button>`;
const empty = text => `<div class="empty"><img src="cats/calm.svg" alt=""><p class="desc">${text}</p></div>`;
function tabs(cur) {
  return `<nav class="tabs"><div class="side-word" aria-hidden="true">Cover<span>Cat</span></div>${[['home', 'Films'], ['films', 'My films'], ['profile', 'Profile']].map(([k, l]) => `<button data-go="${k}" ${cur === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>`;
}
function poster(f, meta = true) {
  return `<button class="poster ${f.poster ? 'has-art' : ''}" style="${posterBg(f.id)}" data-go="detail" data-id="${f.id}" aria-label="${esc(f.t)}">${art(f)}
    <span class="pt">${esc(f.t)}</span>${meta ? `<span class="pm">${f.y} ${stars(f.lv)}</span>` : ''}</button>`;
}
// A film as a list row (My films, too scary)
// Scare check: one compact card with a small poster, the kicker and the film title
// (step 3 adds the score on the right)
const checkHead = (f, n) => `<div class="chead glass"><span class="mini" style="${posterBg(f.id)}">${art(f)}</span><span class="grow">${kick(`Scare check · ${n} of 3`)}<span class="d h3 chead-t" data-fit-lines="2" data-fit="20" data-fit-min="15">${esc(f.t)}</span></span>${n === 3 ? `<span class="chead-s"><span class="num">${f.scare.toFixed(1)}</span><span class="lbl s t2">Scare</span></span>` : ''}</div>`;
function filmRow(f, right = '<span class="chev" aria-hidden="true">›</span>') {
  return `<button class="lrow" data-go="detail" data-id="${f.id}"><span class="mini" style="${posterBg(f.id)}">${art(f)}</span>
    <span class="grow"><span class="d h2">${esc(f.t)}</span><span class="small">${f.y} · ${GEN[mainG(f)].n} · ${stars(f.lv)}</span></span>${right}</button>`;
}
function toast(msg) { app.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast glass'; t.setAttribute('role', 'status'); t.textContent = msg; app.appendChild(t); setTimeout(() => t.remove(), 2200); }

/* ---------- sound ---------- */
// Sounds live in sfx.js (sfx.play('on' | 'boo' | 'levelup')); they follow the Sound setting. Heads up alerts never play sound
sfx.enabled = () => S.sound;
document.addEventListener('pointerdown', () => sfx.unlock(), { passive: true }); // audio may only start after a tap
function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

/* ---------- matching ---------- */
// Levels from the test answers alone (also the baseline for "levels gained")
function testLevels() {
  const T = S.test, L = {};
  for (const g of ['sup', 'mon', 'kil', 'psy']) L[g] = T.genres[g] ? 1 : 2;
  L.gore = T.blood == null ? 2 : [1, 1, 2, 3][T.blood];
  for (const [id, r] of Object.entries(T.seen)) {
    const f = BY[id]; if (!f || !r) continue;
    for (const g of f.g) {
      if (r === 'easy') L[g] = Math.max(L[g], Math.min(3, f.lv + 1));
      else if (r === 'ok') L[g] = Math.max(L[g], f.lv);
      else if (r === 'too') L[g] = Math.min(L[g], Math.max(1, f.lv - 1));
    }
  }
  return L;
}
function computeLevels() { S.levels = testLevels(); }
function capFor(f, g) {
  let L = S.levels[g];
  const subs = S.test.genres[g];
  if (subs && GEN[g].subs && f.sub.length) {
    const mine = f.sub.filter(s => GEN[g].subs.some(x => x[0] === s));
    if (mine.length && mine.every(s => !subs.includes(s))) L = Math.max(L, 2);
  }
  return L;
}
function blocked(f) {
  const T = S.test;
  if (f.tr.some(t => T.avoid.includes(t))) return 'avoid';
  if (T.blood != null && f.gore > GORE_CAP[T.blood]) return 'gore';
  if (T.jump === 1 && f.j != null && f.j > 15) return 'jump';
  if (T.jump === 2 && (f.j == null || f.j > 6)) return 'jump';
  return null;
}
function fits(f, g) {
  if (blocked(f)) return false;
  if (g) return f.g.includes(g) && f.lv <= capFor(f, g);
  return f.g.every(x => f.lv <= capFor(f, x));
}
const PLOT_MAX = 140;
function plotHtml(s) {
  if (s.length <= PLOT_MAX + 20) return `<p class="txt t2 plot">${esc(s)}</p>`;
  const cut = s.slice(0, PLOT_MAX).replace(/\s+\S*$/, '').replace(/[,;:.\s]+$/, '');
  return `<p class="txt t2 plot"><span class="p-short">${esc(cut)}… </span><span class="p-full">${esc(s)} </span><button class="link cyan more-inline" data-act="more" aria-expanded="false">More</button></p>`;
}
let AF = { g: 'all', fit: null, lv: '0', sort: 'pop', q: '' };
const afResults = q => { const r = searchFilms(q); return r.length ? `<p class="lbl l sres-n">${pl(r.length, 'film')}</p><div class="row3 sres-grid">${r.map(resultCard).join('')}</div>` : `<div class="sres-none"><b class="d">We don't have this one yet</b><span class="small t2">Try another title, or clear the search to browse.</span></div>`; };
// Next level card: one layout in three states (locked films / filters block them / all open). Web uses the same parts
const NL_ICON = {
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>'
};
const WHY_TAG = { gore: 'Gore', jump: 'Jumps' }, TRIG_TAG = { an: 'Animals', ch: 'Kids', su: 'Self-harm', sx: 'Assault' };
const whyTag = f => { const w = blocked(f); return w === 'avoid' ? TRIG_TAG[f.tr.find(x => S.test.avoid.includes(x))] || 'Avoided' : WHY_TAG[w] || ''; };
// Next level card art: blurred posters with a lock (watch to unlock), blurred posters with red reason tags (your filters block them), clear posters (all open)
const nlArt = (films, mode) => `<div class="mu-p ${mode}" aria-hidden="true">${films.slice(0, mode === 'blocked' ? 2 : 3).map(f => `<div style="${posterBg(f.id)}">${art(f)}${mode === 'blocked' ? `<span class="mu-why">${whyTag(f)}</span>` : ''}</div>`).join('')}
  ${mode === 'locked' ? `<span class="mu-lock">${NL_ICON.lock}</span>` : ''}</div>`;
const nlBlocked = (g, L) => FILMS.filter(f => f.g.includes(g) && f.lv === L + 1 && blocked(f));
const nlTop = g => FILMS.filter(f => f.g.includes(g) && f.lv === 3 && !blocked(f));
const nlLocked = (g, L) => FILMS.filter(f => f.g.includes(g) && !blocked(f) && f.lv === L + 1);
const zoneList = g => FILMS.filter(f => fits(f, g) && !S.watched[f.id]).sort((a, b) => b.scare - a.scare);
// Home: what the next level opens. Always shown: a count, an empty state that points to the filters, or all done
function unlockCard(g, L) {
  const up = `<span class="stars">${'★'.repeat(L + 1)}</span>`, locked = L < 3 ? nlLocked(g, L) : [];
  if (L >= 3) return `<div class="munlock glass">${nlArt(nlTop(g), 'open')}<div class="mu-t"><span class="lbl s cyan">All levels open</span><span class="d h3">Every ${GEN[g].n} level unlocked</span></div>
    <button class="btn2 sm inline" data-go="level" data-g="${g}">Change level</button></div>`;
  if (!locked.length) { const bl = nlBlocked(g, L);
    return `<div class="munlock glass">${bl.length ? nlArt(bl, 'blocked') : ''}<div class="mu-t"><span class="lbl s cyan">Next level</span><span class="d h3">No ${up} films fit your filters</span></div>
    <button class="btn2 sm inline" data-go="filters">Fear filters</button></div>`; }
  return `<div class="munlock glass">${nlArt(locked, 'locked')}
    <div class="mu-t"><span class="lbl s cyan">Next level</span><span class="d h3">${pl(locked.length, 'more film unlocks', 'more films unlock')} at ${up}</span></div>
    <button class="btn2 sm inline" data-go="level" data-g="${g}">How</button></div>`;
}
// Seen any of these?: reaction labels, the poster being re-rated and the one that just changed (gets the short pop)
const FACE = { easy: 'Easy', ok: 'Fine', too: 'Too much' };
let SEEN_EDIT = null, SEEN_JUST = null;
const JUMP_OPTS = ['Any number is fine', '15 or fewer', '6 or fewer'];
// Segmented scare meter: 10 bars filled up to the score; filled bars inside the person's zone are sky, above it red
function meter(f, L) {
  return `<div class="meter10" role="img" aria-label="Scare ${f.scare.toFixed(1)} out of 10">${Array.from({ length: 10 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, f.scare - i)), over = i + fill / 2 > ZONE[L];
    return `<span><i class="${over ? 'over' : ''}" style="width:${(fill * 100).toFixed(0)}%"></i></span>`;
  }).join('')}</div>`;
}
// Profile picture: a Peek face (default calm) or an uploaded photo, shown on Home and Profile
const FACES = { calm: 'calm', curious: 'curious', ready: 'ready', scared: 'scared', cantlook: 'cantlook', shades: 'sit-3-shades' };
// Head crop per pose (ears included), measured from the drawn pixels: [centre x, centre y, square side] as shares of the
// file's width / height / width. The head sits centred in the circle with about 10% padding
const CROP = { calm: [.446, .239, .666], curious: [.558, .239, .585], ready: [.43, .239, .646], scared: [.431, .241, .741], cantlook: [.438, .239, .653], 'sit-3-shades': [.553, .235, .579] };
const faceImg = k => { const f = FACES[k] || 'calm', [cx, cy, sd] = CROP[f], D = sd / .8, w = 100 / D;
  return `<img src="cats/${f}.svg" alt="" style="width:${w.toFixed(1)}%;left:${(-(cx - D / 2) * w).toFixed(1)}%;top:${(-(cy / AR[f] - D / 2) * w).toFixed(1)}%">`; };
const avatarImg = () => S.photo ? `<img class="photo" src="${S.photo}" alt="">` : faceImg(S.face);
function avatarSheet() {
  return `<div class="av-ov" role="dialog" aria-label="Profile picture"><button class="av-scrim" data-act="avclose" aria-label="Close"></button>
    <div class="av-sheet glass"><h2 class="d h2">Profile picture</h2>
      <div class="av-grid">${Object.keys(FACES).map(k => `<button class="avatar ${!S.photo && S.face === k ? 'on' : ''}" data-act="avface" data-k="${k}" aria-label="${k}" aria-pressed="${!S.photo && S.face === k}">${faceImg(k)}</button>`).join('')}</div>
      <label class="btn2 av-up">Upload a photo<input type="file" id="avfile" accept="image/*" hidden></label>
      ${S.photo ? '<button class="link warn" data-act="avremove">Remove photo</button>' : ''}
      <button class="link" data-act="avclose">Done</button></div></div>`;
}
// Center-crop to a square, clip to a circle, max 256px, stored as a data URL
function avatarUpload(file) {
  if (!file || !/^image\//.test(file.type)) { toast('Pick an image file'); return; }
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => {
    const n = Math.min(256, im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'), x = c.getContext('2d'), side = Math.min(im.naturalWidth, im.naturalHeight);
    c.width = c.height = n; x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); x.clip();
    x.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, n, n);
    URL.revokeObjectURL(url);
    try {
      let d = c.toDataURL('image/webp', .85); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/png');
      S.photo = d; localStorage.setItem(KEY, JSON.stringify(S)); refresh(); toast('Photo saved');
    } catch (e) { S.photo = ''; toast('That photo is too big to save. Try another one.'); }
  };
  im.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image'); };
  im.src = url;
}
app.addEventListener('change', e => { if (e.target.id === 'avfile') avatarUpload(e.target.files[0]); });
// Line icons for list rows (stroke = currentColor)
const ICON = {
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/></svg>',
  install: '<svg viewBox="0 0 24 24"><path d="M12 4v10M7.5 9.5L12 14l4.5-4.5M5 16v3h14v-3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>'
};
// Install as an app. Chrome and Android give us an install prompt; iPhone needs Share then Add to Home Screen
let INSTALL_EVT = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; });
addEventListener('appinstalled', () => { INSTALL_EVT = null; S.instHint = true; save(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstall = () => !standalone();
// Search: film titles, ignoring filters, each result with its verdict for you
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '');
const searchFilms = q => { const n = norm(q.trim()); if (!n) return []; return FILMS.filter(f => norm(f.t).includes(n)).sort((a, b) => norm(a.t).indexOf(n) - norm(b.t).indexOf(n)).slice(0, 30); };
function verdict(f) {
  if (!S.done) return null; if (!S.levels) computeLevels();
  const g = S.sel && f.g.includes(S.sel) ? S.sel : mainG(f), L = capFor(f, g);
  return blocked(f) ? ['red', 'Not for you'] : f.lv < L ? ['cyan', 'Inside your zone'] : f.lv === L ? ['moon', 'At your edge'] : ['red', 'Above your zone'];
}
const resultCard = f => { const v = verdict(f); return `<div class="rcard">${poster(f)}${v ? `<span class="rv ${v[0]}">${v[1]}</span>` : ''}</div>`; };
const resultRow = (f, go = 'detail') => { const v = verdict(f);
  return `<button class="srow-f" data-go="${go}" data-id="${f.id}"><span class="sf-p" style="${posterBg(f.id)}">${art(f)}</span><span class="sf-t"><b>${esc(f.t)}</b><span class="small t3">${f.y} ${stars(f.lv)}</span></span>${v ? `<span class="vchip ${v[0]}"><span>${v[1]}</span></span>` : ''}</button>`; };
const BOOKMARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>';
// After the first scare check, Peek offers to save progress once. Accounts are UI only for now
const afterCheck = () => S.offered ? 'home' : 'savepro';
/* Fear type: every genre at the same level gets its own name, otherwise the strongest genre names it.
   Ties: a genre the person did not pick as scary in the test wins, then the one with better watched-film reactions */
const FEAR_ALL = ['UNDER THE BLANKET', 'PILLOW HUGGER', 'LIGHTS OFF'];
const FEAR_TOP = { sup: 'GHOST FRIEND', mon: 'MONSTER HUNTER', kil: 'SURVIVOR', psy: 'NERVES OF STEEL', gore: 'STRONG STOMACH' };
function fearType() {
  const L = S.levels || {}, lv = g => L[g] || 1, v = ORDER.map(lv);
  if (v.every(x => x === v[0])) return FEAR_ALL[v[0] - 1];
  const top = Math.max(...v), picked = g => S.test.genres[g] ? 1 : 0;
  const react = g => Object.entries(S.watched).reduce((n, [id, w]) => n + (BY[id] && BY[id].g.includes(g) ? ({ easy: 2, ok: 1, too: -1 }[w.r] || 0) : 0), 0);
  return FEAR_TOP[ORDER.filter(g => lv(g) === top).sort((a, b) => picked(a) - picked(b) || react(b) - react(a))[0]];
}
/* Fitting after each render: [data-fit-lines] wraps up to n lines then shrinks (titles), plain [data-fit] stays on one line */
function fit(root = app) {
  root.querySelectorAll('[data-fit-lines]').forEach(el => {
    const max = +el.dataset.fit, min = +(el.dataset.fitMin || 20), n = +el.dataset.fitLines;
    let px = max; el.style.fontSize = px + 'px';
    const tooBig = () => el.getBoundingClientRect().height > n * parseFloat(getComputedStyle(el).lineHeight) + 1 || el.scrollWidth > el.clientWidth + 1; // box height: italic glyphs overhang scrollHeight
    while (px > min && tooBig()) el.style.fontSize = --px + 'px';
  });
  root.querySelectorAll('[data-fit]:not([data-fit-lines])').forEach(el => {
    const max = +el.dataset.fit, min = +(el.dataset.fitMin || Math.round(max / 2));
    let px = max; el.style.fontSize = px + 'px';
    while (px > min && el.scrollWidth > el.clientWidth + 1) el.style.fontSize = --px + 'px';
  });
}

/* ---------- router ---------- */
const MOMENTS = ['result', 'share', 'tBoo'];
// Fear test and scare check: the content scrolls and the bottom button stays pinned (safe-area aware)
const FLOW = ['meet', 'tGenres', 'tBlood', 'tJump', 'tJumpHow', 'tAvoid', 'tSeen', 'check1', 'check2', 'check3'];
let stack = [], cur = null, timers = [];
function clearTimers() { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; }
function go(name, p = {}, push = true) {
  [name, p] = route(name, p);
  clearTimers();
  if (name !== 'altimer') wake(false);
  if (push && cur) stack.push(cur);
  cur = { name, p };
  const fn = SCREENS[name] || SCREENS.home;
  const moment = MOMENTS.includes(name) || (name === 'levelup' && p.up) ? 'moment' : '';
  app.innerHTML = `<section class="screen ${p.cls || ''} ${moment} ${name === 'tBoo' ? 'boo' : ''} ${FLOW.includes(name) ? 'flow' : ''} ${/^w[A-Z]/.test(name) ? 'web' : ''}" data-s="${name}">${fn(p)}</section>`;
  const sc = app.querySelector('.screen');
  fit(sc);
  if (sc.classList.contains('flow')) [sc, sc.querySelector(':scope>.scroll')].forEach(el => el && el.addEventListener('scroll', () => sc.classList.toggle('scrolled', el.scrollTop > 2), { passive: true }));
  // Genre tab rows: keep the chosen tab in view
  sc.querySelectorAll('.gtabs').forEach(r => { const o = r.querySelector('.gtab.on'); if (o) r.scrollLeft = o.offsetLeft - (r.clientWidth - o.offsetWidth) / 2; });
  if (name === 'allfilms' && p.search) { const i = sc.querySelector('#afq'); if (i) setTimeout(() => i.focus(), 60); }
  if (AFTER[name]) AFTER[name](p, sc);
  if (isWeb()) webURL(name, p);
  const h = sc.querySelector('h1,h2,.focus'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
// Same screen again after a tap (a toggle, a rating): no enter motion and the scroll position stays put
function refresh(p = cur.p) {
  const y = (app.querySelector('.scroll') || {}).scrollTop || 0, ys = (app.querySelector('.screen') || {}).scrollTop || 0;
  go(cur.name, { ...p, cls: 'still' }, false);
  const n = app.querySelector('.scroll'); if (n) n.scrollTop = y;
  app.querySelector('.screen').scrollTop = ys;
}
function back() { const prev = stack.pop(); if (prev) go(prev.name, { ...prev.p, cls: '' }, false); else go(S.done ? 'home' : 'meet', {}, false); }
function reset(name, p) { stack = []; cur = null; go(name, p, false); }

app.addEventListener('click', e => {
  const b = e.target.closest('[data-go],[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a) { ACT[a] && ACT[a](b, e); return; }
  const p = { ...b.dataset }; delete p.go;
  if (['home', 'films', 'profile'].includes(b.dataset.go)) reset(b.dataset.go, p); else go(b.dataset.go, p);
});
const pressOnly = (sel, b) => app.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', x === b));

/* ---------- actions ---------- */
const ACT = {
  back,
  sound() { S.sound = !S.sound; save(); app.querySelectorAll('[data-act=sound]').forEach(x => x.setAttribute('aria-checked', S.sound)); if (S.sound) { sfx.unlock(); sfx.play('on'); } },
  genre(b) {
    const g = b.dataset.g, T = S.test;
    if (T.genres[g]) delete T.genres[g]; else T.genres[g] = GEN[g].subs ? GEN[g].subs.map(s => s[0]) : [];
    save(); refresh();
  },
  sub(b, e) {
    e.stopPropagation();
    const { g, s } = b.dataset, arr = S.test.genres[g]; const i = arr.indexOf(s);
    if (i >= 0) arr.splice(i, 1); else arr.push(s); save(); refresh();
  },
  blood(b) {
    // Peek reacts in place (no re-render), so the swap is one small squash and nothing else moves
    const v = S.test.blood = +b.dataset.v; save();
    pressOnly('[data-act=blood]', b);
    app.querySelector('.scene-peek').innerHTML = bloodPeek(v, true);
    app.querySelector('#say').textContent = bloodLook(v)[2];
    app.querySelector('.actions').classList.remove('off');
    buzz(20);
  },
  jumphow(b) { S.test.jump = +b.dataset.v; save(); pressOnly('[data-act=jumphow]', b); timers.push(setTimeout(() => go('tAvoid'), 260)); },
  avoid(b) {
    const t = b.dataset.t, a = S.test.avoid, i = a.indexOf(t); i >= 0 ? a.splice(i, 1) : a.push(t); save();
    b.setAttribute('aria-pressed', i < 0); b.querySelector('.tick').textContent = i < 0 ? '✓' : '';
    app.querySelector('.actions .btn span').textContent = a.length ? 'Next' : 'All fine';
  },
  avpick() { app.querySelector('.screen').insertAdjacentHTML('beforeend', avatarSheet()); },
  avclose() { const o = app.querySelector('.av-ov'); o && o.remove(); },
  avface(b) { S.face = b.dataset.k; S.photo = ''; save(); refresh(); ACT.avpick(); },
  avremove() { S.photo = ''; save(); refresh(); ACT.avpick(); },
  // Back to a given earlier screen (skips the ones in between, e.g. BOO! is never replayed)
  backto(b) { const n = b.dataset.s; while (stack.length && stack[stack.length - 1].name !== n) stack.pop(); stack.length ? back() : go(n, {}, false); },
  more(b) { const p = b.closest('.plot'), open = p.classList.toggle('open'); b.textContent = open ? 'Less' : 'More'; b.setAttribute('aria-expanded', open); },
  fset(b) {
    const { k, v } = b.dataset, T = S.test;
    if (k === 'avoid') { const i = T.avoid.indexOf(v); i >= 0 ? T.avoid.splice(i, 1) : T.avoid.push(v); }
    else T[k] = +v;
    save(); refresh();
  },
  seen(b) { SEEN_JUST = SEEN_EDIT = null; const id = b.dataset.id, s = S.test.seen; if (id in s) delete s[id]; else s[id] = null; save(); refresh(); },
  face(b, e) { e.stopPropagation(); const { id, v } = b.dataset; S.test.seen[id] = v; SEEN_EDIT = null; SEEN_JUST = id; save(); refresh(); },
  faceopen(b) { SEEN_EDIT = SEEN_JUST = b.dataset.id; refresh(); },
  finish() { computeLevels(); S.done = true; if (!S.sel) S.sel = ORDER.find(g => S.levels[g] >= 2) || 'psy'; save(); reset('result'); },
  sel(b) { S.sel = b.dataset.g; save(); go('home', { cls: 'still' }, false); }, // no enter motion, so the menu never jumps
  signin() {
    const v = id => ((document.getElementById(id) || {}).value || '').trim(), email = v('email'), typed = v('mname').slice(0, 20);
    const name = typed || (email ? email.split('@')[0] : '') || S.name;
    if (!name) { toast('Add your name or email'); return; }
    const back = logIn(name, email); toast(back ? `Welcome back, ${S.user.name}` : `Welcome, ${S.user.name}. Your progress is saved.`);
    reset(S.done && S.levels ? 'home' : 'meet');
  },
  mlogout() { logOut(); reset('meet'); toast('Logged out'); },
  meetgo() { const n = document.getElementById('nick'); S.name = n ? n.value.trim().slice(0, 20) : ''; save(); go('tGenres'); },
  afg(b) { AF.g = b.dataset.v; refresh(); },
  afclear() { AF.q = ''; refresh(); const i = app.querySelector('#afq'); if (i) i.focus(); },
  async install() {
    S.instHint = true; save();
    if (INSTALL_EVT) { INSTALL_EVT.prompt(); try { await INSTALL_EVT.userChoice; } catch (e) {} INSTALL_EVT = null; refresh(); return; }
    const ios = isIOS();
    app.querySelector('.screen').insertAdjacentHTML('beforeend', `<div class="av-ov" role="dialog" aria-label="Install CoverCat"><button class="av-scrim" data-act="afclose" aria-label="Close"></button>
      <div class="av-sheet glass inst-sheet"><div class="inst-head"><img class="inst-app" src="icons/icon-192.png" alt=""><h2 class="d h2">Install CoverCat</h2></div><p class="desc">${ios ? 'Two taps in Safari and it lives on your home screen.' : 'Add it from your browser menu and it opens like an app.'}</p>
        <ol class="inst-steps"><li><span class="inst-ic">${ios ? ICON.share : ICON.dots}</span><span>${ios ? 'Tap <b>Share</b> at the bottom of Safari' : 'Open the browser <b>menu</b>'}</span></li>
          <li><span class="inst-ic">${ios ? ICON.plus : ICON.install}</span><span>Choose <b>${ios ? 'Add to Home Screen' : 'Install app'}</b></span></li></ol>
        <button class="link cyan" data-act="afclose">Got it</button></div></div>`);
  },
  instno() { S.instHint = true; save(); const b = app.querySelector('.inst'); if (b) b.remove(); },
  afsheet() {
    const o = (k, v, l) => `<button class="srow" role="radio" aria-checked="${AF[k] === v}" data-act="afset" data-k="${k}" data-v="${v}"><span>${l}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`;
    app.querySelector('.screen').insertAdjacentHTML('beforeend', `<div class="av-ov" role="dialog" aria-label="Sort and level"><button class="av-scrim" data-act="afclose" aria-label="Close"></button>
      <div class="av-sheet glass"><h2 class="d h2">Sort &amp; level</h2>
        <h3 class="lbl s t3">Level</h3><div class="slist glass" role="radiogroup" aria-label="Level">${o('lv', '0', 'Any level')}${o('lv', '1', '★ Gentle')}${o('lv', '2', '★★ Getting braver')}${o('lv', '3', '★★★ Brave')}</div>
        <h3 class="lbl s t3">Sort</h3><div class="slist glass" role="radiogroup" aria-label="Sort">${o('sort', 'pop', 'Popular')}${o('sort', 'calm', 'Least scary first')}${o('sort', 'scary', 'Scariest first')}</div>
        <button class="link cyan" data-act="afclose">Done</button></div></div>`);
  },
  afset(b) { AF[b.dataset.k] = b.dataset.v; refresh(); ACT.afsheet(); },
  afclose() { const o = app.querySelector('.av-ov'); if (o) o.remove(); },
  aff() { AF.fit = !AF.fit; refresh(); },
  setlv(b) { const g = b.dataset.g, n = +b.dataset.v; S.levels[g] = n; save(); refresh({ g, just: n }); },
  lvup() {
    const p = cur.p; for (const x of (p.sug || '').split(',').filter(Boolean)) S.levels[x] = Math.min(3, S.levels[x] + 1);
    save(); buzz([40, 30, 80]); go('levelup', { ...p, sug: '', up: p.sug }, false);
  },
  notyet() { go('levelup', { ...cur.p, sug: '', up: '' }, false); },
  save(b) {
    const id = b.dataset.id, a = S.saved, i = a.indexOf(id), on = i < 0;
    on ? a.unshift(id) : a.splice(i, 1); save();
    app.querySelectorAll(`[data-act=save][data-id="${id}"]`).forEach(x => {
      x.setAttribute('aria-pressed', on);
      if (x.classList.contains('bmark')) { x.setAttribute('aria-label', on ? 'Saved. Remove from My films' : 'Save to My films'); x.classList.remove('react'); void x.offsetWidth; x.classList.add('react'); }
    });
    toast(on ? 'Saved to My films' : 'Removed from My films');
  },
  notforme(b) { const id = b.dataset.id; S.watched[id] = { r: 'skip', t: Date.now() }; S.saved = S.saved.filter(x => x !== id); save(); toast('Got it. We will not show it again.'); back(); },
  seg(b) { go('films', { tab: b.dataset.tab, cls: 'still' }, false); },
  c1(b) { pressOnly('[data-act=c1]', b); timers.push(setTimeout(() => go('check2', { ...cur.p, r: b.dataset.v, cls: '' }), 260)); },
  c2(b) {
    const set = new Set((cur.p.what || '').split(',').filter(Boolean)), v = b.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v); cur.p.what = [...set].join(','); b.setAttribute('aria-pressed', set.has(v)); b.querySelector('.tick').textContent = set.has(v) ? '✓' : '';
  },
  c2next() { go('check3', { ...cur.p, cls: '' }); },
  c3(b) { pressOnly('[data-act=c3]', b); timers.push(setTimeout(() => finishCheck({ ...cur.p, score: b.dataset.v }), 260)); },
  retake() { S.test = fresh().test; S.done = false; S.levels = null; save(); reset('meet'); },
  wipe() { if (ACT._armed) { if (S.user) dropAccount(acctKey(S.user)); localStorage.removeItem(KEY); S = fresh(); ACT._armed = false; reset('meet'); } else { ACT._armed = true; toast(isWeb() ? 'Click again to erase everything' : 'Tap again to erase everything'); setTimeout(() => ACT._armed = false, 3000); } },
  async share() {
    // the image card: share sheet on phones, a download elsewhere; the text version only if drawing failed
    const file = SHARE_FILE || (SHARE_IMG ? await SHARE_IMG : null), text = shareText();
    const save = () => { const a = document.createElement('a'), u = URL.createObjectURL(file); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Card saved as an image'); };
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'My fear profile' }).catch(e => { if (e && e.name === 'NotAllowedError') save(); });
    } else if (file) save();
    else if (navigator.share) navigator.share({ title: 'My fear profile', text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard'), () => toast('Could not copy'));
    else toast('Sharing is not available here');
  },
  // jump alert controls
  alstart() { alGo(0); },
  alfrom() { const t = readTime(app); if (t != null) alGo(t); },
  alpp() { AL.run = !AL.run; AL.last = Date.now(); wake(AL.run); paintAlert(); },
  nudge(b) { seekAlert(AL.t + +b.dataset.v); },
  almenu() { app.querySelector('.al-menu').classList.toggle('open'); },
  alrestart() {
    if (ACT._rearm) { ACT._rearm = false; app.querySelector('.al-menu').classList.remove('open'); seekAlert(0); toast('Back to 0:00:00'); }
    else { ACT._rearm = true; toast('Tap Restart again to go back to the start'); setTimeout(() => ACT._rearm = false, 3000); }
  },
  // Film time in the card: tap to type the time from the player (h : mm : ss), checked against the runtime
  altedit() {
    const e = app.querySelector('.al-tedit'); e.hidden = !e.hidden; if (e.hidden) return;
    const t = Math.floor(AL.t), v = [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60];
    e.querySelectorAll('.tbox').forEach((b, i) => { b.value = String(v[i]).padStart(2, '0'); });
    const b = e.querySelector('.tbox'); b.focus(); b.select();
  },
  altcancel() { app.querySelector('.al-tedit').hidden = true; },
  altset() {
    const t = readTime(app.querySelector('.al-tedit')); if (t == null) return;
    app.querySelector('.al-tedit').hidden = true; seekAlert(t); toast(`Jumped to ${fmtH(t)}`);
  },
  alback() { app.querySelector('.al-stop').hidden = false; },
  alkeep() { app.querySelector('.al-stop').hidden = true; },
  alstop() {
    // stop the timer, release the wake lock and go back to the Watch it screen
    const id = AL.f.id; Object.assign(AL, { run: false, started: false }); wake(false);
    while (stack.length && stack[stack.length - 1].name !== 'where') stack.pop();
    stack.length ? back() : go('where', { id }, false);
  },
  dismiss() { const o = app.querySelector('.heads-ov'); o && o.remove(); }
};

function finishCheck(p) {
  const f = BY[p.id], g = f.g.includes(S.sel) ? S.sel : mainG(f), old = S.watched[f.id];
  if (p.again === '1' && old) {
    // Rate again: overwrite the old answer only (no extra courage, no level changes)
    S.watched[f.id] = { ...old, r: p.r, what: p.what || '', score: p.score }; save();
    p.from === 'films' ? reset('films', { tab: 'watched' }) : reset('detail', { id: f.id });
    return toast('Rating updated');
  }
  S.watched[f.id] = { r: p.r, t: Date.now(), what: p.what || '', score: p.score, seen: p.seen === '1' };
  S.saved = S.saved.filter(x => x !== f.id);
  if (p.r === 'too') {
    const before = S.levels[g]; S.levels[g] = Math.max(1, Math.min(before, f.lv - 1)); save();
    return reset('tooscary', { id: f.id, g });
  }
  S.xp += 1;
  // Peek only suggests the level up; the person says yes on the next screen
  const sug = p.r === 'easy' || p.r === 'ok' ? f.g.filter(x => f.lv >= S.levels[x] && S.levels[x] < 3 && (p.r === 'easy' || x === g)) : [];
  save();
  reset('levelup', { id: f.id, g, r: p.r, sug: sug.join(','), up: '' });
}
function shareText() {
  const L = S.levels || {};
  return `My fear type on CoverCat: ${fearType()}\n` + ORDER.map(g => `${GEN[g].n}: ${'★'.repeat(L[g] || 1)}${'☆'.repeat(3 - (L[g] || 1))}`).join('\n') + `\nCourage LV ${courage()}`;
}

/* Share card as an image: the same card as the share screen, drawn on a 1080x1350 canvas (4:5, fits most feeds).
   It is drawn when the share screen opens, so tapping Share can hand the file over right away
   (iOS only allows sharing straight from a tap). Phones get the share sheet with the image; elsewhere it downloads */
let SHARE_IMG = null, SHARE_FILE = null;
const CARD_FONTS = ['italic 900 60px "Barlow Condensed"', 'italic 700 40px "Barlow Condensed"', '400 60px Anton', '700 40px Archivo'];
async function drawShareCard() {
  try { await Promise.all(CARD_FONTS.map(f => document.fonts.load(f))); } catch (e) {}
  // CoverCat drawn flat first (no shadow), sized from its viewBox. Safari would shadow every stroke if the shadow went on the SVG itself
  const cat = await (async () => { try {
    let svg = await (await fetch('cats/ready.svg')).text(); const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1], [, , vw, vh] = (vb || '0 0 300 360').split(/[ ,]+/).map(Number);
    const h = 420, w = Math.round(h * vw / vh); svg = svg.replace(/<svg\b[^>]*>/, m => m.replace(/\s(width|height)="[^"]*"/g, '').replace('<svg', `<svg width="${w}" height="${h}"`));
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(im, 0, 0, w, h); return o;
  } catch (e) { return null; } })();
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), L = S.levels || {};
  const FD = '"Barlow Condensed", "Arial Narrow", sans-serif', FN = 'Anton, Impact, sans-serif', FB = 'Archivo, system-ui, sans-serif';
  const rrect = (X, Y, w, h, r) => { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); };
  // background: the big-moment gradient with the two diagonal bands
  const bg = x.createLinearGradient(0, 0, W * .55, H); bg.addColorStop(0, '#1F6BFF'); bg.addColorStop(.6, '#0A1A5E'); bg.addColorStop(1, '#04103F');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.save(); x.translate(W / 2, H * .44); x.rotate(-12 * Math.PI / 180);
  x.globalAlpha = .12; x.fillStyle = '#F2F6FF'; x.fillRect(-W, -150, W * 2, 300);
  x.globalAlpha = 1; x.fillStyle = '#7FF0FF'; x.fillRect(-W, 190, W * 2, 26); x.restore();
  // kicker plate
  const kick = (t, X, Y) => { x.font = `italic 700 30px ${FD}`; const w = x.measureText(t).width + 44;
    x.save(); x.translate(X, Y); x.transform(1, 0, -Math.tan(11 * Math.PI / 180), 1, 0, 0); x.fillStyle = '#050A1E'; x.fillRect(0, 0, w, 50); x.restore();
    x.fillStyle = '#7FF0FF'; x.textBaseline = 'middle'; x.fillText(t, X + 20, Y + 26); };
  kick('YOUR FEAR PROFILE', 76, 92);
  // white card
  const CX = 70, CY = 172, CW = W - 140, CH = 1000, P = 56;
  x.fillStyle = '#F2F6FF'; rrect(CX, CY, CW, CH, 40); x.fill();
  x.textBaseline = 'alphabetic'; x.fillStyle = '#1F6BFF'; x.font = `italic 700 32px ${FD}`; x.fillText('MY FEAR PROFILE', CX + P, CY + 76);
  // fear type in ransom letters (same looks and rotations as ransom())
  const text = fearType(), looks = [['#F2F6FF', '#050A1E', FD, '900', 'italic'], ['#1F6BFF', '#F2F6FF', FN, '400', 'normal'],
    ['#050A1E', '#7FF0FF', FD, '900', 'italic'], ['#7FF0FF', '#04103F', FB, '700', 'normal'], ['#0A1A5E', '#F2F6FF', FN, '400', 'normal']];
  const layout = base => { let i = 0, X = 0; const out = [];
    text.split(' ').forEach((w, wi) => { if (wi) X += base * .3;
      for (const ch of w) { const Lk = looks[(i * 3 + hash(text)) % looks.length], r = ((i * 7) % 11) - 5; i++;
        const size = base * (0.85 + (i % 3) * 0.1); x.font = `${Lk[4]} ${Lk[3]} ${size}px ${Lk[2]}`;
        const cw = x.measureText(ch).width + size * .16; out.push({ ch, Lk, r, size, X, cw }); X += cw - size * .04; } });
    return { out, w: X }; };
  let base = 104, R = layout(base); const maxW = CW - P * 2;
  if (R.w > maxW) { base = Math.floor(base * maxW / R.w); R = layout(base); }
  const RY = CY + 120 + base * .62;
  R.out.forEach(o => { const h = o.size * 1.05; x.save(); x.translate(CX + P + o.X + o.cw / 2, RY); x.rotate(o.r * Math.PI / 180);
    x.fillStyle = o.Lk[0]; x.fillRect(-o.cw / 2, -h / 2, o.cw, h);
    x.fillStyle = o.Lk[1]; x.font = `${o.Lk[4]} ${o.Lk[3]} ${o.size}px ${o.Lk[2]}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.ch, 0, o.size * .04); x.restore(); });
  // five genre rows with stars
  x.textAlign = 'left'; let Y = RY + base * .62 + 40;
  ORDER.forEach(g => { const n = L[g] || 1;
    x.fillStyle = '#050A1E'; x.font = `italic 900 50px ${FD}`; x.textBaseline = 'middle'; x.fillText(GEN[g].n.toUpperCase(), CX + P, Y + 46);
    x.font = `44px ${FB}`; x.textAlign = 'right';
    x.fillStyle = 'rgba(5,10,30,.2)'; x.fillText('★'.repeat(3 - n), CX + CW - P, Y + 46);
    const dimW = 3 - n ? x.measureText('★'.repeat(3 - n)).width + 6 : 0;
    x.fillStyle = '#1F6BFF'; x.fillText('★'.repeat(n), CX + CW - P - dimW, Y + 46); x.textAlign = 'left';
    x.fillStyle = 'rgba(5,10,30,.12)'; x.fillRect(CX + P, Y + 88, CW - P * 2, 3); Y += 90; });
  // foot: Courage LV and a tilted Peek
  const FY = CY + CH - 56;
  x.fillStyle = '#050A1E'; x.textBaseline = 'alphabetic'; x.font = `italic 700 40px ${FD}`; x.fillText('Courage LV', CX + P, FY);
  const lw = x.measureText('Courage LV ').width; x.save(); x.translate(CX + P + lw, FY); x.transform(1, 0, -Math.tan(8 * Math.PI / 180), 1, 0, 0);
  x.font = `400 76px ${FN}`; x.fillText(String(courage()), 0, 0); x.restore();
  if (cat) { const ch = 210, cw = ch * cat.width / cat.height; x.save(); x.translate(CX + CW - P - cw / 2, CY + CH - 30 - ch / 2); x.rotate(6 * Math.PI / 180);
    x.shadowColor = '#050A1E'; x.shadowOffsetX = 8; x.shadowOffsetY = 8; x.shadowBlur = 0; x.drawImage(cat, -cw / 2, -ch / 2, cw, ch); x.restore(); }
  // wordmark
  x.textBaseline = 'alphabetic'; x.font = `italic 900 56px ${FD}`; const a = x.measureText('COVER').width, b = x.measureText('CAT').width, sx = (W - a - b) / 2;
  x.fillStyle = '#F2F6FF'; x.fillText('COVER', sx, H - 76); x.fillStyle = '#7FF0FF'; x.fillText('CAT', sx + a, H - 76);
  return new Promise(res => c.toBlob(b => res(b && new File([b], 'covercat-fear-profile.png', { type: 'image/png' })), 'image/png'));
}

/* ---------- screens ---------- */
const SCREENS = {
  meet() {
    return `${topbar({ back: false, skip: 'tGenres' })}${kick('Hello')}
    ${scene('wave-1', 'Hi, I am CoverCat. I love horror too, I just watch it from under a sheet. What should I call you?', { cls: 'float' })}
    <div class="form"><input class="input" id="nick" type="text" maxlength="20" autocomplete="nickname" enterkeyhint="go" placeholder="Your nickname (optional)" aria-label="Nickname, optional" value="${esc(S.name)}">
      ${soundSwitch()}</div>
    <div class="actions">${btn("Let's go", 'data-act="meetgo"')}</div>`;
  },
  tGenres() {
    const T = S.test;
    return `${topbar({ skip: 'tBlood', step: [1, 5] })}
    <div class="scroll">${head('Fear test · 1 of 5', 'What scares you?', 'Pick any that make you want to hide.')}
      <div class="mt">${['sup', 'mon', 'kil', 'psy'].map(g => {
        const on = !!T.genres[g];
        return `<div class="gcard ${on ? 'on' : 'glass'}" role="button" tabindex="0" data-act="genre" data-g="${g}" aria-pressed="${on}">
          <h3 class="d h3">${GEN[g].n}</h3><p class="desc">${GEN[g].d}</p><span class="tick" aria-hidden="true">${on ? '✓' : ''}</span>
          ${on && GEN[g].subs ? `<div class="pills" data-fit="13" data-fit-min="10">${GEN[g].subs.map(([k, l]) => `<button class="pill" data-act="sub" data-g="${g}" data-s="${k}" aria-pressed="${T.genres[g].includes(k)}">${l}</button>`).join('')}</div>
            <p class="small">Tap to turn off the ones that don't scare you.</p>` : ''}
        </div>`;
      }).join('')}</div>
    </div>
    <div class="actions">${btn(Object.keys(T.genres).length ? 'Next' : 'None of these', 'data-go="tBlood"')}</div>`;
  },
  tBlood() {
    const v = S.test.blood;
    return `${topbar({ skip: 'tJump', step: [2, 5] })}${kick('Fear test · 2 of 5')}
    ${scene('', bloodLook(v)[2], { peekHtml: bloodPeek(v), pid: 'say', mid: true })}
    <div class="opts">${BLOOD_OPTS.map((l, i) => opt(l, `data-act="blood" data-v="${i}"`, v === i)).join('')}</div>
    <div class="actions ${v == null ? 'off' : ''}">${btn('Next', 'data-go="tJump"')}</div>`;
  },
  tJump() {
    // Peek types the line out; BOO! starts about 1.5s after the whole line is visible (never a warning)
    return `${topbar({ skip: 'tAvoid', step: [3, 5] })}${kick('Fear test · 3 of 5')}
    ${scene('calm', '<span id="type" aria-hidden="true"></span><span class="caret" aria-hidden="true"></span>', { label: JUMP_LINE })}`;
  },
  tBoo() {
    // One CSS timeline (~1.4s): crouch, rise, pop with flash and shake, letters slam in, land, settle
    return `<div class="boo-dim"></div><div class="boo-flash"><div class="band ink"></div><div class="band white"></div><div class="band cyan"></div></div>
    <div class="boo-word">${ransom('BOO!', 92)}</div>
    <div class="boo-stage" aria-hidden="true">${BOO.map(k => `<img class="${k}" src="cats/${k}.svg" alt="">`).join('')}</div>`;
  },
  tJumpHow() {
    return `${topbar({ back: 'tBlood', skip: 'tAvoid', step: [3, 5] })}${kick('Fear test · 3 of 5')}
    ${scene('cantlook', 'Sorry! That was the jump scare question. How was that?')}
    <div class="opts">${[['Ha, cute. Bring it on', 0], ['Got me, but I am fine', 1], ['I hated that', 2]].map(([l, v]) => opt(l, `data-act="jumphow" data-v="${v}"`, S.test.jump === v)).join('')}</div>`;
  },
  tAvoid() {
    const a = S.test.avoid;
    return `${topbar({ skip: 'tSeen', step: [4, 5] })}${kick('Fear test · 4 of 5')}
    ${scene('earsdown', 'Anything you would rather not see? I will keep those films away from you.', { compact: true })}
    <div class="crows">${Object.entries(TRIG).map(([k, l]) => crow(l, `data-act="avoid" data-t="${k}"`, a.includes(k))).join('')}</div>
    <div class="actions">${btn(a.length ? 'Next' : 'All fine', 'data-go="tSeen"')}</div>`;
  },
  tSeen() {
    const s = S.test.seen;
    return `${topbar({ skip: 'finish', step: [5, 5] })}
    <div class="scroll">${head('Fear test · 5 of 5', 'Seen any of these?', 'Tap the ones you have watched. Tell me how it went if you like.')}
      <div class="seen-grid mt">${SEEN.map(id => { const f = BY[id], on = id in s;
        return `<div class="sc ${on ? 'on' : ''}"><div class="sc-frame">
          <button class="poster ${f.poster ? 'has-art' : ''}" style="${posterBg(id)}" data-act="seen" data-id="${id}" aria-pressed="${on}" aria-label="${esc(f.t)}">${art(f)}<span class="pt">${esc(f.t)}</span></button>
          ${on ? `<button class="badge" data-act="seen" data-id="${id}" aria-label="Unmark ${esc(f.t)}"><span>✓</span></button>` : ''}
          ${on && s[id] && SEEN_EDIT !== id ? `<button class="seen-pick ${SEEN_JUST === id ? 'pop' : ''}" data-act="faceopen" data-id="${id}" aria-label="${esc(f.t)}: ${FACE[s[id]]}. Change"><span>${FACE[s[id]]}</span></button>`
            : on ? `<div class="seen-rate ${SEEN_JUST === id ? 'pop' : ''}" role="group" aria-label="How was ${esc(f.t)}?">${Object.entries(FACE).map(([v, l]) =>
            `<button class="schip" data-act="face" data-id="${id}" data-v="${v}" aria-pressed="${s[id] === v}"><span>${l}</span></button>`).join('')}</div>` : ''}</div>
          <div class="sc-t" aria-hidden="true">${esc(f.t)}</div></div>`; }).join('')}</div>
    </div>
    <div class="actions">${btn(Object.keys(s).length ? 'See my result' : 'Seen none', 'data-act="finish"')}</div>`;
  },
  finish() { return ''; },
  result() {
    const L = S.levels, n = FILMS.filter(f => fits(f)).length, k = S.test.avoid.length;
    return `<div class="res-top">${kick('Your fear type')}<div class="res-word">${ransom(fearType(), 52)}</div></div>
    <div class="res-mid"><div class="band white" aria-hidden="true"></div><div class="band cyan" aria-hidden="true"></div>
      <div class="ink"><div class="row"><span class="num res-n">${n}</span><span class="lbl l">${n === 1 ? 'film fits' : 'films fit'} you<br>right now</span></div>
        <p class="desc ink">${k ? `${pl(k, 'thing')} kept away` : 'Nothing kept away'}</p></div>
      <img class="tilt-peek" src="cats/ready.svg" alt=""></div>
    <div class="res-zone card glass">${ORDER.map(g => `<div class="between"><span class="lbl l up">${GEN[g].n}</span>${stars(L[g])}</div>`).join('')}</div>
    <div class="actions">${btn('Show me films', 'data-go="home"', true)}<button class="link" data-go="share">Make a share card ›</button></div>`;
  },
  share() {
    const L = S.levels;
    return `<div class="share-bands" aria-hidden="true"><div class="band white"></div><div class="band cyan"></div></div>
    ${topbar()}
    <div class="share-k">${kick('Your fear profile')}</div>
    <div class="sharecard">
      <div class="lbl s elec up">My fear profile</div>
      <div class="share-word">${ransom(fearType(), 46, true)}</div>
      ${ORDER.map(g => `<div class="between"><span class="d h2">${GEN[g].n}</span>${stars(L[g])}</div>`).join('')}
      <div class="foot"><span class="lbl l">Courage LV <span class="num">${courage()}</span></span><img class="tilt-peek" src="cats/ready.svg" alt=""></div>
    </div>
    <div class="actions">${btn('Share', 'data-act="share"', true)}</div>`;
  },
  home() {
    if (!S.levels) computeLevels();
    const g = S.sel || 'psy', L = S.levels[g], xp = S.xp % 2, list = zoneList(g);
    const next = L < 3 ? FILMS.filter(f => f.g.includes(g) && !blocked(f) && f.lv === L + 1).length : 0;
    return `<div class="hello"><div class="greet"><div class="lbl l cyan">${greeting()}</div>
        <h1 class="d h1" data-fit="32" data-fit-min="22">${S.name ? `Hi, ${esc(S.name)}` : 'Hi there'}</h1></div>
      <button class="avatar" data-go="profile" aria-label="Profile">${avatarImg()}</button></div>
    <div class="courage"><span class="lbl l">Courage LV <span class="num">${courage()}</span></span>
      <span class="bar" role="img" aria-label="${xp} of 2 films to the next level"><i style="width:${xp * 50 + 8}%"></i></span><span class="small">${pl(2 - xp, 'more film', 'more films')}</span></div>
    <button class="sfield" data-go="allfilms" data-search="1"><span class="sf-ic" aria-hidden="true">${ICON.search}</span><span>Search ${FILMS.length} films</span></button>
    <div class="gtabs home-tabs" role="tablist" aria-label="Genre">${ORDER.map(k => `<button class="gtab ${k === g ? 'on' : ''}" role="tab" data-act="sel" data-g="${k}" aria-selected="${k === g}">${GEN[k].n}</button>`).join('')}</div>
    <div class="home-lv"><span class="lbl l">${GEN[g].n}</span>${stars(S.levels[g])}<button class="link cyan home-ch" data-go="level" data-g="${g}" aria-label="Change your ${GEN[g].n} level">Change ›</button></div>
    <div class="scroll">${!S.instHint && canInstall() ? `<div class="inst glass"><img class="inst-app" src="icons/icon-192.png" alt=""><span class="inst-t"><b>Keep CoverCat on your home screen</b><span class="small t2">Opens like an app, full screen.</span></span><button class="btn2 sm inline" data-act="install">Install</button><button class="inst-x" data-act="instno" aria-label="Not now">${ICON.x}</button></div>` : ''}
      ${sec('In your zone', list.length ? `<button class="more" data-go="zone"><span class="num">${list.length}</span> ${list.length === 1 ? 'film' : 'films'} ›</button>` : '')}
      ${list.length ? `<div class="row3 zone-grid">${list.slice(0, 12).map(f => poster(f)).join('')}</div>` : empty('Nothing here yet. Watch something a little easier and CoverCat will open this up.')}
      ${unlockCard(g, L, next)}
      <button class="browse-all" data-go="allfilms">Browse all ${FILMS.length} films ›</button>
    </div>
    ${tabs('home')}`;
  },
  zone() {
    const g = S.sel || 'psy', list = zoneList(g);
    return `${topbar()}<div class="scroll">${head(GEN[g].n, 'In your zone', `${pl(list.length, 'film')} that fit you right now, scariest first.`)}
      <div class="row3 mt">${list.map(f => poster(f)).join('')}</div></div>`;
  },
  allfilms() {
    // Every film. "Only films that fit me" starts on, so the safe view is the default
    if (AF.fit === null) AF.fit = !!S.done;
    let list = FILMS.filter(f => !(S.watched[f.id] && S.watched[f.id].r === 'skip'));
    if (AF.g !== 'all') list = list.filter(f => f.g.includes(AF.g));
    if (AF.fit && S.done) list = list.filter(f => fits(f));
    if (AF.lv !== '0') list = list.filter(f => f.lv === +AF.lv);
    if (AF.sort === 'calm') list = [...list].sort((a, b) => a.scare - b.scare);
    if (AF.sort === 'scary') list = [...list].sort((a, b) => b.scare - a.scare);
    const n = (AF.lv !== '0') + (AF.sort !== 'pop');
    const q = AF.q || '';
    return `${topbar()}<div class="scroll">${head('Browse', 'All films', 'Every film, rated for scaredy-cats.')}
      <div class="sfield is-input"><span class="sf-ic" aria-hidden="true">${ICON.search}</span><input id="afq" type="text" inputmode="search" enterkeyhint="search" placeholder="Search a film" autocomplete="off" value="${esc(q)}" aria-label="Search films"><button class="sf-clear" data-act="afclear" aria-label="Clear search" ${q ? '' : 'hidden'}>${ICON.x}</button></div>
      <div id="afres" ${q ? '' : 'hidden'}>${afResults(q)}</div>
      <div id="afall" ${q ? 'hidden' : ''}>
      <div class="gtabs" role="group" aria-label="Genre">${[['all', 'All'], ...ORDER.map(k => [k, GEN[k].n])].map(([v, l]) => `<button class="gtab ${AF.g === v ? 'on' : ''}" data-act="afg" data-v="${v}" aria-pressed="${AF.g === v}">${l}</button>`).join('')}</div>
      ${S.done ? `<button class="switch af-fit" role="switch" aria-checked="${AF.fit}" data-act="aff"><span>Only films that fit me</span><span class="knob" aria-hidden="true"></span></button>` : ''}
      <div class="af-bar"><span class="lbl l">${pl(list.length, 'film')}</span><button class="btn2 sm inline" data-act="afsheet">Sort &amp; level${n ? ` · ${n}` : ''}</button></div>
      ${list.length ? `<div class="row3 mt">${list.map(f => poster(f)).join('')}</div>` : empty('No films match. Try another genre.')}</div></div>`;
  },
  filters() {
    // Fear settings: the filters from the fear test, changed in place
    const T = S.test;
    return `${topbar()}<div class="scroll">${head('Fear settings', 'Your filters', 'CoverCat keeps films past these out of your lists.')}
      ${sec('Blood')}<div class="opts">${BLOOD_OPTS.map((l, i) => opt(l, `data-act="fset" data-k="blood" data-v="${i}"`, T.blood === i)).join('')}</div>
      ${sec('Jump scares')}<div class="opts">${JUMP_OPTS.map((l, i) => opt(l, `data-act="fset" data-k="jump" data-v="${i}"`, T.jump === i)).join('')}</div>
      ${sec('Keep away')}<div class="crows">${Object.entries(TRIG).map(([k, l]) => crow(l, `data-act="fset" data-k="avoid" data-v="${k}"`, T.avoid.includes(k))).join('')}</div>
    </div>`;
  },
  savepro() {
    return `${kick('One more thing')}<h1 class="d h1 title">Save your progress?</h1>
    <p class="txt t2 sub">Your levels and films live on this phone right now. Make an account and they follow you to any phone.</p>
    <div class="actions">${btn('Save it', 'data-go="signin"')}<button class="link" data-go="home">Not now</button></div>`;
  },
  signin() {
    return `${topbar()}<div class="scroll">${head('Account', 'Create account or log in', 'Keep your fear profile, levels and films saved to your account.')}
      <div class="stack mt"><button class="btn2" data-act="signin">Continue with Apple</button><button class="btn2" data-act="signin">Continue with Google</button>
        <p class="small center">or</p>
        <input class="input" id="mname" type="text" maxlength="20" autocomplete="nickname" placeholder="Your name" aria-label="Name" value="${esc(S.name || '')}">
        <input class="input" id="email" type="email" autocomplete="email" inputmode="email" placeholder="Your email" aria-label="Email"></div>
      <p class="small mt-s">No passwords. CoverCat never posts anything for you.</p></div>
    <div class="actions">${btn('Continue', 'data-act="signin"')}<button class="link" data-go="home">Keep using CoverCat without an account ›</button></div>`;
  },
  level(p) {
    const g = p.g in GEN ? p.g : 'psy', L = S.levels[g];
    return `${topbar()}<div class="scroll">${head(GEN[g].n, 'Your level', 'Here is what each level means. Feel braver or less brave? Pick one yourself.')}
      <div class="mt">${[1, 2, 3].map(n => {
        // films.json is roughly in popularity order, so the first three are well-known examples
        const ex = FILMS.filter(f => f.g.includes(g) && f.lv === n).slice(0, 3), on = n === L, just = +p.just === n;
        return `<div class="card lvcard ${on ? 'on' : 'glass'}">
          <div class="head">${stars(n, 'l')}<h3 class="d h3">${LV_NAME[n - 1]}</h3>${on ? `<span class="tag fill ${just ? 'just' : ''}">${just ? 'Done! You are here' : 'You are here'}</span>` : ''}</div>
          <p class="desc">${LV_TXT[g][n - 1]}</p>
          <p class="small">Like these</p>
          <div class="row3">${ex.map(f => poster(f, false)).join('')}</div>
          ${on ? '' : `<button class="btn2 sm" data-act="setlv" data-g="${g}" data-v="${n}">Set to ${'★'.repeat(n)}</button>`}
        </div>`; }).join('')}</div></div>`;
  },
  films(p) {
    const tab = p.tab || 'saved', watched = Object.keys(S.watched).filter(id => S.watched[id].r !== 'skip');
    const ids = tab === 'saved' ? S.saved : watched.sort((a, b) => S.watched[b].t - S.watched[a].t);
    const face = { easy: ['Easy', 'cyan'], ok: ['Fine', 'moon'], too: ['Too much', 'red'] };
    return `${kick('Library')}<h1 class="d h1 title">My films</h1>
    <div class="seg">${[['saved', `Saved ${S.saved.length}`], ['watched', `Watched ${watched.length}`]].map(([k, l]) => `<button class="pill" data-act="seg" data-tab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>
    <div class="scroll mt">${ids.length ? `<div class="list glass">${ids.map(id => { const f = BY[id]; if (!f) return ''; const w = S.watched[id];
        if (tab !== 'watched' || !w || !face[w.r]) return filmRow(f);
        return `<div class="wrow">${filmRow(f, '')}<div class="wrow-r"><span class="tag ${face[w.r][1]}">${face[w.r][0]}</span><button class="link cyan rate-again" data-go="check1" data-id="${id}" data-again="1" data-from="films">Rate again</button></div></div>`; }).join('')}</div>`
      : empty(tab === 'saved' ? 'Nothing saved yet. Tap Save on any film.' : 'Nothing watched yet. After a film, tell CoverCat how it went.')}</div>
    ${tabs('films')}`;
  },
  profile() {
    const L = S.levels, w = Object.values(S.watched).filter(x => x.r !== 'skip').length, xp = S.xp % 2, base = testLevels();
    const gained = ORDER.reduce((n, g) => n + Math.max(0, L[g] - base[g]), 0);
    return `<div class="scroll">
      <div class="status">
        <div class="status-head">${kick(S.name ? `${esc(S.name)}'s profile` : 'Profile')}<button class="avatar big" data-act="avpick" aria-label="Change profile picture">${avatarImg()}</button></div>
        <div class="status-type">${ransom(fearType(), 36, true)}</div>
        <div class="status-lv"><span class="lbl l">Courage LV</span><span class="num">${courage()}</span>
          <span class="status-bar"><span class="bar" role="img" aria-label="${xp} of 2 films to the next level"><i style="width:${xp * 50 + 8}%"></i></span><span class="small">${pl(2 - xp, 'more film', 'more films')} to the next level</span></span></div>
        <div class="stats3">${[['Watched', w], ['Saved', S.saved.length], ['Level ups', gained]].map(([l, v]) => `<div class="glass"><span class="lbl s t2">${l}</span><span class="num">${v}</span></div>`).join('')}</div>
      </div>
      ${sec('Your levels')}
      <div class="menu plain">${ORDER.map(g => `<div class="mrow"><button class="mname" data-go="level" data-g="${g}">${GEN[g].n}</button>
        <button class="mstars" data-go="level" data-g="${g}" aria-label="${GEN[g].n} level ${L[g]} of 3. Change it">${stars(L[g])}</button></div>`).join('')}</div>
      ${sec('Settings')}
      <div class="list glass">
        ${S.user ? '' : '<button class="lrow" data-go="signin"><span class="grow txt">Create account or log in</span><span class="chev" aria-hidden="true">›</span></button>'}
        <button class="lrow" data-go="share"><span class="grow txt">Share my fear profile</span><span class="chev" aria-hidden="true">›</span></button>
        ${canInstall() ? '<button class="lrow" data-act="install"><span class="grow txt">Install CoverCat</span><span class="chev" aria-hidden="true">›</span></button>' : ''}
        <button class="lrow" data-go="filters"><span class="grow txt">Fear settings</span><span class="chev" aria-hidden="true">›</span></button>
        <button class="lrow" data-act="retake"><span class="grow txt">Retake the fear test</span><span class="chev" aria-hidden="true">›</span></button>
        ${S.user ? '<button class="lrow" data-act="mlogout"><span class="grow txt warn">Log out</span></button>' : ''}
        <button class="lrow" data-act="wipe"><span class="grow txt warn">Erase my data</span></button>
      </div>
      <p class="small credit">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </div>
    ${tabs('profile')}`;
  },
  detail(p) {
    const f = BY[p.id]; if (!f) return SCREENS.home();
    const g = S.sel && f.g.includes(S.sel) ? S.sel : mainG(f), L = capFor(f, g), why = blocked(f);
    const st = stamps(f), saved = S.saved.includes(f.id), w = S.watched[f.id];
    const busy = busiest(st), rt = f.rt || 100;
    const chart = st.length ? `${sec('When the jumps come')}
      <p class="desc">Busiest stretch: ${busy}–${busy + 10} min</p>${jumpBars(st, rt, busy)}` : '';
    const row = (icon, label, attrs, sub = '') => `<button class="lrow" ${attrs}><span class="licon" aria-hidden="true">${icon}</span><span class="grow"><span class="txt">${label}</span>${sub ? `<span class="small t3">${sub}</span>` : ''}</span><span class="chev" aria-hidden="true">›</span></button>`;
    const vc = why ? ['red', 'Not for you'] : f.lv < L ? ['cyan', 'Inside your zone'] : f.lv === L ? ['moon', 'Right at your edge'] : ['red', 'Above your zone'];
    const whyTxt = { avoid: 'Has something you asked to avoid.', gore: 'More blood than you asked for.', jump: 'More jump scares than you like.' }[why];
    // Back and bookmark stay fixed on top; once the poster is scrolled away a dark bar with the title fades in behind them
    return `<div class="dtop"><button class="dplate" data-act="back"><span>‹ Back</span></button><span class="dtop-t" aria-hidden="true">${esc(f.t)}</span>
        <button class="dplate bmark" data-act="save" data-id="${f.id}" aria-pressed="${saved}" aria-label="${saved ? 'Saved. Remove from My films' : 'Save to My films'}"><span>${BOOKMARK}</span></button></div>
    <div class="scroll">
      <div class="dhead" style="${posterBg(f.id)}">${art(f, 'w500')}<div class="dshade" aria-hidden="true"></div>
        <div class="dtext"><h1 class="d h1 dtitle" data-fit-lines="2" data-fit="32" data-fit-min="22">${esc(f.t)}</h1>
          <div class="lbl l t2">${[f.y, `${f.rt} min`, GEN[mainG(f)].n, f.cert].filter(Boolean).join(' · ')}</div></div>
      </div>
      <div class="plotbox">${plotHtml(f.overview || f.plot)}</div>
      ${f.tr.length || f.sub.length ? `<div class="chips">${f.tr.map(t => `<span class="tag alert"><span aria-hidden="true">⚠</span>${TRIG[t]}</span>`).join('')}${f.sub.map(s => `<span class="tag">${cap(s)}</span>`).join('')}</div>` : ''}
      <div class="qacts spread">
        ${w && w.r !== 'skip' ? `<button class="qa" data-go="check1" data-id="${f.id}" data-again="1" data-from="detail">${ICON.eye}<span>Rated: ${FACE[w.r] || 'Fine'}</span></button>`
          : `<button class="qa" data-go="check1" data-id="${f.id}" data-seen="1">${ICON.eye}<span>I've seen it</span></button>`}
        <button class="qa" data-act="notforme" data-id="${f.id}">${ICON.x}<span>Not for me</span></button>
      </div>
      <div class="dsec">${sec('The scare')}
      <div class="mcard glass">
        <div class="mt-top"><span class="lbl cyan">Scare</span><span class="vchip ${vc[0]}"><span>${vc[1]}</span></span></div>
        <span class="num mc-score">${f.scare.toFixed(1)}<small>/10</small></span>${meter(f, L)}<span class="small t3">Your ${GEN[g].n.toLowerCase()} zone is <span class="stars">${'★'.repeat(L)}</span></span>
        <div class="m3">
          <div><span class="lbl s t2">Jumps</span>${f.j == null ? '<span class="num nod">–</span><span class="small t3">No data yet</span>' : `<span class="num">${f.j}</span><span class="small t3">${st.length ? `Most at ${busy}–${busy + 10}m` : 'No timings'}</span>`}</div>
          <div><span class="lbl s t2">Gore</span><span class="num">${f.gore.toFixed(1)}<small>/10</small></span><span class="mbar" aria-hidden="true"><i style="width:${f.gore * 10}%"></i></span></div>
          <div><span class="lbl s t2">Level</span><span class="mt-stars">${stars(f.lv)}</span><span class="small t3">${LV_NAME[f.lv - 1]}</span></div>
        </div>
      </div>
      ${why ? `<p class="desc mt-s">${whyTxt}</p>` : ''}</div>
      ${chart ? `<div class="dsec">${chart}</div>` : ''}
      ${w && w.r !== 'skip' ? `<p class="lbl l cyan mt">You watched this. It was ${({ easy: 'easy', ok: 'fine', too: 'too much' })[w.r]}.</p>` : ''}

    </div>
    <div class="sticky">${btn('Watch it', `data-go="where" data-id="${f.id}"`)}</div>`;
  },
  where(p) {
    // Watch it: jump alerts first (primary), then where to stream and I finished the film (secondary).
    // Without timestamps there is no jump alerts step and Where to stream is the primary button
    const f = BY[p.id], has = stamps(f).length;
    const step = (n, t) => `<div class="wstep"><span class="num wnum">${n}</span><h2 class="d h2">${t}</h2></div>`;
    const href = `https://www.justwatch.com/se/search?q=${encodeURIComponent(f.t)}`;
    const stream = has ? `<a class="btn2" href="${href}" target="_blank" rel="noopener">Where to stream ↗</a>`
      : `<a class="btn" href="${href}" target="_blank" rel="noopener"><span data-fit="22" data-fit-min="15">Where to stream ↗</span></a>`;
    let n = 0;
    return `${topbar()}<div class="scroll">${kick('Watch it')}<h1 class="d h1 title" data-fit-lines="2" data-fit="32" data-fit-min="22">${esc(f.t)}</h1>
      ${has ? `${step(++n, 'Jump alerts')}<p class="desc">CoverCat warns you 5 seconds before each jump scare.</p>
      <div class="mt-s">${btn('Start jump alerts', `data-go="alert" data-id="${f.id}"`)}</div>` : ''}
      ${step(++n, 'Where to stream')}${stream}
      <p class="small center mt-s">Shows which services have it in Sweden.</p>
      ${step(++n, 'After the film')}
      <button class="btn2" data-go="check1" data-id="${f.id}">I finished the film</button>
    </div>`;
  },
  alert(p) {
    // Jump alerts setup: start from the beginning, or type the time the player shows (h : mm : ss)
    const f = BY[p.id]; alState(f);
    const big = AL.st.filter(x => x.big).length, now = p.set && AL.started ? [Math.floor(AL.t / 3600), Math.floor(AL.t / 60) % 60, Math.floor(AL.t % 60)] : null;
    const box = (i, label) => `<input class="input tbox" data-i="${i}" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" placeholder="00" aria-label="${label}" value="${now ? String(now[i]).padStart(2, '0') : ''}">`;
    return `${topbar()}<div class="scroll">${kick('Jump alerts')}<h1 class="d h1 title" data-fit-lines="2" data-fit="32" data-fit-min="22">${esc(f.t)}</h1>
      <div class="al-film"><div class="al-thumb" style="${posterBg(f.id)}">${art(f)}</div>
        <p class="lbl l">${pl(AL.st.length, 'jump scare')}${big ? ` · ${pl(big, 'big one')}` : ''}</p></div>
      <p class="txt t2 mt">Start this when the film's first scene begins. CoverCat will warn you 5 seconds before each scare.</p>
      <div class="al-start">${btn('Start from the beginning', 'data-act="alstart"')}</div>
      ${sec('Already watching?')}
      <p class="desc">Type the time your player shows.</p>
      <div class="al-time">${box(0, 'Hours')}<span class="al-colon">:</span>${box(1, 'Minutes')}<span class="al-colon">:</span>${box(2, 'Seconds')}</div>
      <button class="btn2 mt-s" data-act="alfrom">Start from here</button>
      <p class="small t3 al-info">Times count from the film's first scene, not the streaming service's intro.</p></div>`;
  },
  altimer(p) {
    // Jump alerts timer: film card, ring countdown to the next scare, the 10-minute chart, controls, up next
    const f = BY[p.id]; alState(f);
    const rt = (f.rt || 100) * 60, R = 104, C = (2 * Math.PI * R).toFixed(1);
    return `<div class="al-top"><button class="back" data-act="alback">‹ Back</button><span class="al-head"></span>
        <button class="al-more" data-act="almenu" aria-label="More">⋯</button>
        <div class="al-menu"><button class="al-scrim" data-act="almenu" aria-label="Close menu"></button><div class="list glass"><button class="lrow" data-act="alrestart"><span class="grow txt">Restart</span></button></div></div></div>
    <div class="scroll">
      <div class="al-fcard glass"><div class="al-thumb" style="${posterBg(f.id)}">${art(f)}</div>
        <div class="al-fname"><span class="lbl s cyan">Jump alerts on</span><span class="d h3" data-fit-lines="2" data-fit="22" data-fit-min="15">${esc(f.t)}</span></div>
        <button class="al-ftime" data-act="altedit" aria-label="Film time. Tap to set it"><span class="small t2">Film time</span><span class="al-tfield ${S.alHint ? '' : 'pulse'}"><span class="num" id="altm">${fmtH(AL.t)}</span>${ICON.pencil}</span><span class="small t3">of ${fmtH(rt)}</span></button>
        <div class="al-tedit" hidden><div class="al-time">${['Hours', 'Minutes', 'Seconds'].map((l, i) => `${i ? '<span class="al-colon">:</span>' : ''}<input class="input tbox" data-i="${i}" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" placeholder="00" aria-label="${l}">`).join('')}</div>
          <div class="al-tbtns"><button class="btn2" data-act="altcancel">Cancel</button>${btn('Set', 'data-act="altset"')}</div></div></div>
      <div class="al-ring" aria-live="polite">
        <svg viewBox="0 0 230 230" aria-hidden="true"><circle class="al-rtrack" cx="115" cy="115" r="${R}"/><circle class="al-rbar" id="alring" cx="115" cy="115" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
        <div class="al-rin"><span class="lbl t2" id="cdl">Next scare in</span><span class="num" id="cd">–</span>
          <span class="vchip red" id="albig" hidden><span>Big one</span></span><span class="small t2" id="alat"></span></div></div>
      <div class="al-ccard glass">${liveBars(AL.st, f.rt || 100)}</div>
      <div class="al-ctl">
        ${[['-60', '−1m', 'Back 1 minute'], ['-10', '−10s', 'Back 10 seconds']].map(([v, l, a]) => `<button class="al-b" data-act="nudge" data-v="${v}" aria-label="${a}"><span>${l}</span></button>`).join('')}
        <button class="al-pp" data-act="alpp" id="alpp" aria-label="Pause"><span>${ICON.pause}</span></button>
        ${[['10', '+10s', 'Forward 10 seconds'], ['60', '+1m', 'Forward 1 minute']].map(([v, l, a]) => `<button class="al-b" data-act="nudge" data-v="${v}" aria-label="${a}"><span>${l}</span></button>`).join('')}
      </div>
      <div class="al-k">${kick('Up next')}</div><div id="alnext">${upNext()}</div>
      <div class="al-end">${btn('I finished the film', `data-go="check1" data-id="${f.id}"`)}</div>
    </div>
    <div class="al-stop" hidden role="dialog" aria-label="Stop jump alerts?"><button class="al-scrim" data-act="alkeep" aria-label="Keep watching"></button>
      <div class="al-stopbox glass"><h2 class="d h2">Stop jump alerts?</h2><p class="desc">The timer stops and CoverCat won't warn you anymore.</p>
        ${btn('Stop', 'data-act="alstop"')}<button class="btn2" data-act="alkeep">Keep watching</button></div></div>`;
  },
  check1(p) {
    const f = BY[p.id];
    return `${topbar({ step: [1, 3] })}${checkHead(f, 1)}
    ${scene('curious', p.seen || p.again ? 'You have seen this one. How was it?' : 'You made it out! How was it?', { compact: true, ar: CHECK_AR })}
    <div class="opts">${[['easy', 'Easy. I wanted more'], ['ok', 'Scary, but I made it'], ['too', 'Too scary for me']].map(([v, l]) => opt(l, `data-act="c1" data-v="${v}"`, p.r === v)).join('')}</div>`;
  },
  check2(p) {
    const set = (p.what || '').split(','), f = BY[p.id];
    return `${topbar({ step: [2, 3] })}${checkHead(f, 2)}
    ${scene('earsdown', 'What scared you most? Pick any.', { compact: true, ar: CHECK_AR })}
    <div class="crows">${[['jump', 'Jump scares'], ['gore', 'Blood and gore'], ['mood', 'The creepy mood'], ['story', 'The story itself'], ['none', 'Nothing really']].map(([v, l]) =>
      crow(l, `data-act="c2" data-v="${v}"`, set.includes(v))).join('')}</div>
    <div class="actions">${btn('Next', 'data-act="c2next"')}</div>`;
  },
  check3(p) {
    const f = BY[p.id];
    return `${topbar({ step: [3, 3] })}${checkHead(f, 3)}
    ${scene('ready', 'Was our score right?', { compact: true, ar: CHECK_AR })}
    <div class="opts">${[['high', 'Too high. It was easier'], ['right', 'About right'], ['low', 'Too low. It was scarier']].map(([v, l]) => opt(l, `data-act="c3" data-v="${v}"`, false)).join('')}</div>`;
  },
  levelup(p) {
    const f = BY[p.id], sug = (p.sug || '').split(',').filter(Boolean), names = gs => gs.map(x => GEN[x].n).join(' and ');
    if (sug.length) return `${kick('Nice work')}<h1 class="d h1 title">You made it!</h1><p class="desc sub">${esc(f.t)} is in your watched list.</p>
    ${scene('ready', `${p.r === 'easy' ? 'That looked easy for you.' : 'Scary, but you made it.'} Ready to ${sug.length === 1 ? `go up to ${'★'.repeat(S.levels[sug[0]] + 1)} in ${GEN[sug[0]].n}` : `level up in ${names(sug)}`}?`)}
    <div class="actions">${btn('Level up', 'data-act="lvup"')}<button class="link" data-act="notyet">Not yet</button></div>`;
    if (!p.up) return `${kick('Logged')}<h1 class="d h1 title">Nice one</h1><p class="desc sub">${esc(f.t)} is in your watched list.</p>
    ${scene('calm', `Every film you finish adds to your courage. You are at Courage LV ${courage()}.`)}
    <div class="actions">${btn('Back to films', `data-go="${afterCheck()}"`)}</div>`;
    // the big moment
    const gs = p.up.split(','), lv = Math.max(...gs.map(x => S.levels[x]));
    const opened = FILMS.filter(x => x.g.some(y => gs.includes(y)) && !blocked(x) && x.lv === lv).length;
    return `<div class="lu-word">${ransom('LEVEL UP!', 60)}</div>
    <div class="lu-band"><div class="band ink" aria-hidden="true"></div><div class="band white" aria-hidden="true"></div><div class="band cyan" aria-hidden="true"></div>
      <div class="lu-gen"><div class="lbl l elec">${names(gs)} ${gs.length > 1 ? 'are' : 'is'} now</div><div class="big">${LV_NAME[lv - 1]}</div>${stars(lv)}</div></div>
    <div class="lu-foot"><div class="lu-count"><div class="row"><span class="num lu-n">${opened}</span><span class="lbl l">${opened === 1 ? 'scarier film' : 'scarier films'}<br>just opened up</span></div>
      <p class="txt t2">Courage LV <span class="num">${courage()}</span></p></div><img class="tilt-peek" src="cats/ready.svg" alt=""></div>
    <div class="actions">${btn('See what opened up', `data-go="${afterCheck()}"`, true)}</div>`;
  },
  tooscary(p) {
    const f = BY[p.id], g = p.g;
    const alt = FILMS.filter(x => x.g.includes(g) && fits(x, g) && !S.watched[x.id] && x.scare < f.scare).sort((a, b) => b.scare - a.scare)[0];
    return `${kick('Too scary')}<h1 class="d h1 title">That one was a lot</h1>
    ${scene('cantlook', `No shame. ${GEN[g].n} is back to ${'★'.repeat(S.levels[g])} for now. I hid under my sheet too.`)}
    ${alt ? `${sec('Try this lighter one')}<div class="list glass">${filmRow(alt)}</div>` : ''}
    <div class="actions">${btn('Back to films', `data-go="${afterCheck()}"`)}</div>`;
  }
};

/* ---------- screen behaviour after render ---------- */
const AFTER = {
  share() { SHARE_FILE = null; SHARE_IMG = drawShareCard().then(f => (SHARE_FILE = f)).catch(() => null); },
  detail(p, sc) {
    const s = sc.querySelector('.scroll'), h = sc.querySelector('.dhead'), top = sc.querySelector('.dtop');
    const upd = () => top.classList.toggle('solid', s.scrollTop > h.offsetHeight - top.offsetHeight - 8);
    s.addEventListener('scroll', upd, { passive: true }); upd();
  },
  tJump(p, sc) {
    const el = sc.querySelector('#type'), caret = sc.querySelector('.caret');
    let i = matchMedia('(prefers-reduced-motion: reduce)').matches ? JUMP_LINE.length : 0;
    const type = () => {
      el.textContent = JUMP_LINE.slice(0, i);
      if (i < JUMP_LINE.length) { i++; timers.push(setTimeout(type, 34)); return; }
      caret.remove();
      timers.push(setTimeout(() => sc.classList.add('dimming'), 1500));
      timers.push(setTimeout(() => go('tBoo', {}, false), 1850));
    };
    type();
  },
  tBoo() {
    timers.push(setTimeout(() => { sfx.play('boo'); buzz([60, 40, 120]); }, 520)); // at the pop, the peak of the timeline
    timers.push(setTimeout(() => go('tJumpHow', {}, false), 2200));
  },
  finish() { ACT.finish(); },
  levelup(p) { if (p.up) timers.push(setTimeout(() => sfx.play('levelup'), 160)); }, // as the LEVEL UP! letters land (after the fade)
  alert(p, sc) { const b = sc.querySelector('.tbox'); if (p.set && b) timers.push(setTimeout(() => { b.scrollIntoView({ block: 'center' }); b.focus(); b.select(); }, 0)); },
  altimer(p, sc) { initTimer(BY[p.id]); bindScrub(sc); if (!S.alHint) { S.alHint = true; save(); } }, // the film time field pulses only the first time
  savepro() { S.offered = true; save(); }
};

/* ---------- jump alert timer ---------- */
// AL keeps the timer across screens. Times are seconds from the film's first scene
const AL = {};
const fmtH = x => { x = Math.max(0, Math.floor(x)); return `${Math.floor(x / 3600)}:${String(Math.floor(x / 60) % 60).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
// h : mm : ss boxes inside el -> seconds, or null (with a toast) when empty, invalid or past the runtime
function readTime(el) {
  const [h, m, sec] = [...el.querySelectorAll('.tbox')].map(x => x.value), rt = AL.f.rt || 100;
  if (!h && !m && !sec) { toast('Type the time from your player first'); el.querySelector('.tbox').focus(); return null; }
  if (+m > 59 || +sec > 59) { toast('Minutes and seconds go up to 59'); return null; }
  const t = (+h || 0) * 3600 + (+m || 0) * 60 + (+sec || 0);
  if (t > rt * 60) { toast(`That's past the end. The film is ${rt} min.`); return null; }
  return t;
}
// Scrub the timer chart: tap or drag to a time, the target shows above the NOW line, release to jump
function bindScrub(sc) {
  const bars = sc.querySelector('.lbars'); if (!bars) return;
  const span = Math.ceil((AL.f.rt || 100) / 10) * 600, rt = (AL.f.rt || 100) * 60, now = bars.querySelector('.lnow'), lab = now.querySelector('b');
  const at = e => { const r = bars.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(rt, (e.clientX - r.left) / r.width * span))); };
  const show = t => { now.style.left = (t / span * 100) + '%'; lab.textContent = fmtS(t); now.classList.add('drag'); };
  bars.addEventListener('pointerdown', e => { AL.drag = at(e); bars.setPointerCapture(e.pointerId); show(AL.drag); });
  bars.addEventListener('pointermove', e => { if (AL.drag == null) return; AL.drag = at(e); show(AL.drag); });
  const end = () => { if (AL.drag == null) return; const t = AL.drag; AL.drag = null; lab.textContent = 'Now'; now.classList.remove('drag'); seekAlert(t); };
  bars.addEventListener('pointerup', end); bars.addEventListener('pointercancel', end);
}
const fmtS = x => { const h = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, s = String(x % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`; };
// Over 5 minutes: whole minutes only (changes once a minute). 5 minutes or less: m:ss every second
const fmtCd = x => { if (x > 300) return `${Math.ceil(x / 60)}<small>min</small>`; // number big, min small on the same baseline
  const c = Math.ceil(x); return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`; };
// Keep the screen on while alerts run; fails silently where the Wake Lock API is missing or refused
async function wake(on) {
  try {
    if (on && !AL.lock && navigator.wakeLock) { AL.lock = await navigator.wakeLock.request('screen'); AL.lock.addEventListener('release', () => { AL.lock = null; }); }
    if (!on && AL.lock) { await AL.lock.release(); AL.lock = null; }
  } catch (e) { AL.lock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && AL.run && cur && cur.name === 'altimer') wake(true); });
const alState = f => { if (AL.f !== f) Object.assign(AL, { f, st: stamps(f), t: 0, run: false, started: false, fired: new Set() }); };
function initTimer(f) {
  alState(f);
  if (!AL.run) AL.last = Date.now(); // a running timer keeps counting while another screen is open
  timers.push(setInterval(() => {
    if (!AL.run) return; const now = Date.now(); AL.t += (now - AL.last) / 1000; AL.last = now; paintAlert();
  }, 250));
  paintAlert(); wake(AL.run);
}
// Start at t seconds and open the timer as a new screen
function alGo(t) {
  Object.assign(AL, { started: true, run: true, last: Date.now() });
  seekAlert(t, false);
  go('altimer', { id: AL.f.id });
}
// Jump the timer; scares already behind it count as done so they never pop up late
function seekAlert(t, paint = true) {
  AL.t = Math.min(Math.max(0, t), (AL.f.rt || 100) * 60); AL.last = Date.now();
  AL.fired = new Set(AL.st.map((x, i) => (x.s <= AL.t ? i : -1)).filter(i => i >= 0));
  if (paint) paintAlert();
}
// The last scare that passed (greyed) and the next three, with their time and a big tag
function upNext() {
  if (!AL.st || !AL.st.length) return '';
  const i = AL.st.findIndex(x => x.s > AL.t), from = i < 0 ? AL.st.length - 1 : Math.max(0, i - 1), to = i < 0 ? AL.st.length : i + 3;
  return `<div class="list glass al-list">${AL.st.slice(from, to).map((x, k) => `<div class="al-row ${x.s <= AL.t ? 'past' : ''}"><span class="num">${fmtH(x.s)}</span>${x.big ? '<span class="vchip red"><span>Big</span></span>' : ''}<span class="small t3 al-n">${from + k + 1} of ${AL.st.length}</span></div>`).join('')}</div>`;
}
function paintAlert() {
  const tm = document.getElementById('altm'); if (!tm) return;
  tm.textContent = fmtH(AL.t);
  const i = AL.st.findIndex(x => x.s > AL.t), nx = document.getElementById('alnext');
  if (nx && nx.dataset.k !== String(i)) { nx.innerHTML = upNext(); nx.dataset.k = i; }
  const rt = (AL.f.rt || 100) * 60, pos = Math.min(100, AL.t / rt * 100);
  if (AL.drag == null) document.getElementById('alnow').style.left = Math.min(100, AL.t / (Math.ceil(rt / 600) * 600) * 100) + '%';
  app.querySelectorAll('.lbars>div').forEach((d, k) => d.classList.toggle('past', (k + 1) * 600 <= AL.t || (k + 1) * 600 > rt && AL.t >= rt));
  const pp = document.getElementById('alpp'); if (pp.dataset.run !== String(AL.run)) { pp.dataset.run = AL.run; pp.innerHTML = `<span>${AL.run ? ICON.pause : ICON.play}</span>`; pp.setAttribute('aria-label', AL.run ? 'Pause' : 'Play'); }
  const cd = document.getElementById('cd'), cdl = document.getElementById('cdl'), big = document.getElementById('albig'), at = document.getElementById('alat'), ring = document.getElementById('alring'), box = cd.closest('.al-ring');
  box.classList.toggle('done', i < 0);
  if (i < 0) { cdl.textContent = ''; cd.textContent = "No more jump scares. You're safe."; big.hidden = true; at.textContent = ''; ring.style.strokeDashoffset = ring.getAttribute('stroke-dasharray'); return; }
  const left = AL.st[i].s - AL.t, from = i ? AL.st[i - 1].s : 0, frac = Math.max(0, Math.min(1, left / Math.max(1, AL.st[i].s - from)));
  cdl.textContent = 'Next scare in'; cd.innerHTML = fmtCd(left); big.hidden = !AL.st[i].big; at.textContent = `at ${fmtH(AL.st[i].s)}`;
  box.classList.toggle('big', AL.st[i].big);
  ring.style.strokeDashoffset = (ring.getAttribute('stroke-dasharray') * (1 - frac)).toFixed(1); // empties from the previous scare to the next one
  if (AL.run && left <= 5 && !AL.fired.has(i)) {
    AL.fired.add(i); buzz([200, 100, 200]);
    const o = document.createElement('div');
    o.className = 'screen alarm heads-ov'; o.dataset.i = i;
    o.innerHTML = `${kick('Heads up')}<h1 class="d h1 title">Jump scare in</h1><span class="num hcd" id="hcd" aria-live="assertive">${Math.max(1, Math.ceil(left))}</span>
      ${AL.st[i].big ? '<span class="vchip hbig"><span>Big one</span></span>' : ''}<p class="txt b sub">This closes by itself after the scare.</p>
      <img class="warn-peek" src="cats/cantlook.svg" alt=""><div class="actions">${btn('Close', 'data-act="dismiss"')}</div>`;
    app.querySelector('.screen').appendChild(o);
  }
  paintHeads();
}
// Heads up overlay: the count pops on every second and the overlay closes itself 2 seconds after the scare
function paintHeads() {
  const o = app.querySelector('.heads-ov'); if (!o) return;
  const x = AL.st[+o.dataset.i], left = x.s - AL.t, n = document.getElementById('hcd');
  if (left < -2) { o.remove(); return; }
  const v = String(Math.max(1, Math.ceil(left)));
  if (n.textContent !== v) { n.textContent = v; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
}
// h : mm : ss boxes: digits only, two digits jump to the next box, Backspace in an empty box goes back
app.addEventListener('input', e => {
  const b = e.target; if (!b.classList || !b.classList.contains('tbox')) return;
  b.value = b.value.replace(/\D/g, '').slice(0, 2);
  if (b.value.length === 2) { const n = app.querySelector(`.tbox[data-i="${+b.dataset.i + 1}"]`); if (n) { n.focus(); n.select(); } }
});
app.addEventListener('keydown', e => {
  const b = e.target; if (!b.classList || !b.classList.contains('tbox')) return;
  if (e.key === 'Backspace' && !b.value) { const p = app.querySelector(`.tbox[data-i="${+b.dataset.i - 1}"]`); if (p) { e.preventDefault(); p.focus(); p.value = p.value.slice(0, -1); } }
  if (e.key === 'Enter') { e.preventDefault(); b.closest('.al-tedit') ? ACT.altset() : ACT.alfrom(); }
});

/* ---------- keyboard for role=button cards ---------- */
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'nick') { e.preventDefault(); ACT.meetgo(); return; } if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); e.target.click(); } });

/* ---------- boot ---------- */
if (document.fonts) { document.fonts.ready.then(() => fit()); document.fonts.addEventListener('loadingdone', () => fit()); } // widths change once the display font arrives
addEventListener('resize', () => fit());
// Every cat is loaded and decoded before the first screen, so Peek never appears in pieces or late
const loadCat = k => new Promise(res => { const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(res); im.onerror = res; im.src = `cats/${k}.svg`; });
const cats = Promise.all([...CAT_FILES.map(loadCat), fetch('cats/sit-2-bandaid.svg').then(r => r.text()).then(t => { SIT2 = t; }).catch(() => {})]);
// Splash on open (~2.5s, tap to skip), then Meet for new people or Home for a saved profile.
// The CSS base styles are the end frame, so reduced motion shows the cantlook cat and wordmark still for 1s.
const splash = isWeb() ? Promise.resolve() : new Promise(done => { // no splash on the web
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.innerHTML = `<section class="screen splash" data-s="splash" aria-label="CoverCat">
    <div class="sp-cat"><img class="sp-a" src="cats/cover-round.svg" alt=""><img class="sp-b" src="cats/cantlook.svg" alt="CoverCat, a cat under a sheet covering its eyes"></div>
    <div class="sp-word">Cover<span>Cat</span></div>
    <small class="sp-c">© 2026 CoverCat</small></section>`;
  const sp = app.querySelector('.splash');
  const t = setTimeout(() => { sp.classList.add('out'); setTimeout(done, rm ? 0 : 350); }, rm ? 1000 : 2400);
  sp.addEventListener('click', () => { clearTimeout(t); done(); }, { once: true });
});
Promise.all([fetch('films.json').then(r => r.json()), Promise.race([cats, new Promise(r => setTimeout(r, isWeb() ? 800 : 2500))]), splash]).then(([d]) => {
  FILMS = d; BY = Object.fromEntries(d.map(f => [f.id, f]));
  if (isWeb() && webStart) webStart(); else if (S.done && S.levels) reset('home'); else reset('meet');
}).catch(() => { app.innerHTML = '<section class="screen"><h1 class="d h1 title">Could not load films. Check your connection and reload.</h1></section>'; });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}

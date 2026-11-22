/* CoverCat web (1024px and up).
   Same link, same data and design system as the phone app, but website structure:
   a landing page for new visitors, a films catalogue anyone can browse, film pages, separate log in / sign up,
   a profile and settings behind the account menu. No splash. Below 1024px the phone app runs unchanged. */

// Phone screen name <-> web page name. route() is called by go() for every screen change
const TO_WEB = { home: 'wHome', zone: 'wFilms', films: 'wProfile', profile: 'wProfile', detail: 'wFilm', where: 'wFilm',
  allfilms: 'wFilms', filters: 'wSettings', signin: 'wAuth', level: 'wLevel', meet: 'tGenres', result: 'wResult' };
const TO_APP = { wResult: 'result', wHome: 'home', wFilms: 'allfilms', wProfile: 'profile', wFilm: 'detail', wSettings: 'filters', wAuth: 'signin', wLevel: 'level' };
route = (name, p) => {
  if (isWeb()) {
    if (name === 'savepro') return S.user ? ['wHome', p] : ['wAuth', { ...p, mode: 'signup', save: '1' }];
    if (name === 'zone') return ['wFilms', { ...p, fit: '1', g: S.sel || 'all' }];
    if (name === 'films') return ['wProfile', { ...p, tab: p.tab || 'saved' }];
    return [TO_WEB[name] || name, p];
  }
  return [TO_APP[name] || name, p];
};

/* ---------- URLs: every web page has its own address, browser back works ---------- */
const PATHS = { wHow: 'how', wHome: '', wFilms: 'films', wFilm: 'film', wProfile: 'profile', wSettings: 'settings', wLevel: 'level', altimer: 'alerts', wResult: 'result', share: 'share' };
const SLIM = [...FLOW, 'altimer', 'check1', 'check2', 'check3', 'savepro', 'levelup', 'tooscary'];
webURL = (name, p) => {
  // Fear test, scare check and jump alerts keep their focused layout, under a slim header with the wordmark and Exit
  const sc = app.querySelector('.screen');
  if (SLIM.includes(name) && sc && !sc.querySelector('.flowhead')) sc.insertAdjacentHTML('afterbegin', `<header class="webhead flowhead"><div class="wh-in"><button class="wh-logo" data-go="wHome" aria-label="CoverCat home">Cover<span>Cat</span></button>
      <span class="lbl l t3">${name === 'altimer' ? 'Jump alerts' : /^check|levelup|tooscary/.test(name) ? 'Scare check' : 'Fear test'}</span><div class="wh-right">${name === 'altimer' ? '<button class="wh-login" data-act="alrestart">Restart</button>' : ''}<button class="wh-login" data-go="wHome">Exit</button></div></div></header>`);
  if (sc && name === 'share' && !sc.querySelector('.wclose')) {
    const top = sc.querySelector(':scope>.top'); if (top) top.remove();
    sc.insertAdjacentHTML('afterbegin', '<button class="wclose" data-act="back" aria-label="Close"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button>');
  }
  // Steps get a website-style bottom bar: Previous on the left, progress in the middle, Skip and the main button on the right
  if (sc && SLIM.includes(name) && !['altimer', 'levelup', 'tooscary'].includes(name) && !sc.querySelector('.wflowbar')) {
    const top = sc.querySelector(':scope>.top'), acts = sc.querySelector(':scope>.actions'), bar = document.createElement('div');
    bar.className = 'wflowbar'; bar.innerHTML = '<div class="wfb-in"><div class="wfb-l"></div><div class="wfb-c"></div><div class="wfb-r"></div></div>';
    const prev = top && top.querySelector('.back[data-act]'), prog = top && top.querySelector('.prog'), skip = top && top.querySelector('.skip[data-go]');
    if (prev) { prev.textContent = '‹ Previous'; bar.querySelector('.wfb-l').append(prev); }
    if (prog) bar.querySelector('.wfb-c').append(prog);
    if (skip) bar.querySelector('.wfb-r').append(skip);
    if (acts) bar.querySelector('.wfb-r').append(acts);
    if (top) top.remove();
    sc.append(bar);
  }
  let h = name === 'wAuth' ? (p.mode === 'login' ? 'login' : 'signup') : FLOW.includes(name) ? 'test' : PATHS[name];
  if (h == null) return;
  if ((name === 'wFilm' || name === 'altimer') && p.id) h += '/' + p.id;
  if (name === 'wLevel' && p.g) h += '/' + p.g;
  const url = '#/' + h;
  if (location.hash !== url && !(url === '#/' && !location.hash)) history.pushState(null, '', url);
};
function fromHash() {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  const m = { how: ['wHow', {}], films: ['wFilms', {}], film: ['wFilm', { id: b }], profile: ['wProfile', {}], settings: ['wSettings', {}], login: ['wAuth', { mode: 'login' }],
    signup: ['wAuth', { mode: 'signup' }], level: ['wLevel', { g: b }], test: ['tGenres', {}], share: [S.done ? 'share' : 'wHome', {}], result: [S.done ? 'wResult' : 'wHome', {}], alerts: ['altimer', { id: b }] }[a];
  if (!m || (m[1].id !== undefined && !BY[m[1].id])) return ['wHome', {}];
  return m;
}
webStart = () => { const [n, p] = fromHash(); reset(n, p); };
addEventListener('popstate', () => { if (!isWeb() || !FILMS.length) return; const [n, p] = fromHash(); stack = []; cur = null; go(n, p, false); });
// Crossing 1024px re-renders the same place in the other layout
matchMedia('(min-width:1024px)').addEventListener('change', () => { if (cur && FILMS.length) { const c = cur; stack = []; cur = null; go(c.name, c.p, false); } });

/* ---------- shared pieces ---------- */
// QR code (qrcode.min.js) to open a page on the phone
const siteURL = (h = '') => location.origin + location.pathname + h;
function qrSvg(url) { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; } }
const guest = () => !S.user;
const showLanding = () => !S.done || (!S.user && S.lo); // no fear test yet (or logged out): the landing page
const lv = () => { if (!S.levels) computeLevels(); return S.levels; };
const pbtn = (label, attrs = '') => `<button class="btn" ${attrs}><span>${label}</span></button>`;
const sbtn = (label, attrs = '') => `<button class="btn2" ${attrs}>${label}</button>`;
function whead(nav) {
  const items = S.user ? [['wFilms', 'Films'], ['wProfile', 'My films', 'data-tab="saved"']] : [['wFilms', 'Films'], ['wHow', 'How it works']];
  const links = items.map(([k, l, x = '']) => k === 'how' ? `<button data-act="whow">${l}</button>`
    : `<button data-go="${k}" ${x} ${nav === k ? 'aria-current="page"' : ''}>${l}</button>`).join('');
  const right = S.user
    ? `<div class="wh-acc"><button class="avatar wh-av" data-act="wmenu" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">${avatarImg()}</button>
        <div class="wh-menu glass" role="menu"><div class="wh-who"><b>${esc(S.user.name)}</b><span>${esc(S.user.email || '')}</span></div>
          <button role="menuitem" data-go="wProfile">Profile</button><button role="menuitem" data-go="wSettings">Settings</button><span class="wh-sep" role="separator"></span><button role="menuitem" class="wh-out" data-act="wlogout">Log out</button></div></div>`
    : `<button class="wh-login" data-go="wAuth" data-mode="login">Log in</button><button class="wh-signup" data-go="wAuth" data-mode="signup"><span>Sign up</span></button>`;
  return `<header class="webhead"><div class="wh-in"><button class="wh-logo" data-go="wHome" aria-label="CoverCat home">Cover<span>Cat</span></button>
    <nav class="wh-nav">${links}</nav><div class="wh-right"><div class="sfield is-input wh-sf"><span class="sf-ic" aria-hidden="true">${ICON.search}</span><input id="whq" type="text" inputmode="search" placeholder="Search films" autocomplete="off" value="${esc(WF.q || '')}" aria-label="Search films"><button class="sf-clear" data-act="whclear" aria-label="Clear search" ${WF.q ? '' : 'hidden'}>${ICON.x}</button></div>${right}</div></div></header>`;
}
const wfoot = () => `<footer class="wfoot"><div class="wf-in">
  <div class="wf-brand"><div class="wh-logo">Cover<span>Cat</span></div><p class="small">Horror for people who love horror but scare easily.</p></div>
  <div class="wf-col"><span class="lbl s t3">Explore</span><button data-go="wFilms">Films</button><button data-act="wtest">Fear test</button><button data-act="whow">How it works</button></div>
  <div class="wf-col"><span class="lbl s t3">Account</span>${S.user ? '<button data-go="wProfile">Profile</button><button data-go="wSettings">Settings</button>' : '<button data-go="wAuth" data-mode="login">Log in</button><button data-go="wAuth" data-mode="signup">Sign up</button>'}</div>
  <div class="wf-qr"><span class="wf-qr-c">${qrSvg(siteURL())}</span><span><b class="d">Get it on your phone</b><span class="small t3">Scan to open CoverCat. No app store needed.</span>${INSTALL_EVT && !standalone() ? '<button class="link cyan" data-act="install">Install on this computer</button>' : ''}</span></div>
  <div class="wf-small small"><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><p>© 2026 CoverCat · Designed and built by Hailey</p><p>Hyper Island DC27 individual project</p></div></div></footer>`;
const page = (nav, body, cls = '') => `${whead(nav)}<main class="wmain ${cls}">${body}</main>${wfoot()}`;
const bd = f => f && f.poster ? `<div class="wbd" aria-hidden="true"><img src="${IMG}w780${f.poster}" alt="" crossorigin="anonymous" onerror="this.remove()"></div>` : '<div class="wbd" aria-hidden="true"></div>';
// Poster card for web grids: title and level under the poster (and your rating in Watched)
function wposter(f, opts = {}) {
  const w = S.watched[f.id];
  const corner = opts.rating && w && FACE[w.r] ? `<span class="wp-tag ${({ easy: 'cyan', ok: 'moon', too: 'red' })[w.r]}">${FACE[w.r]}</span>` : '';
  return `<div class="wp"><button class="poster ${f.poster ? 'has-art' : ''}" style="${posterBg(f.id)}" data-go="wFilm" data-id="${f.id}" aria-label="${esc(f.t)}">${art(f)}
      <span class="pt">${esc(f.t)}</span>${corner}</button>
    <div class="wp-t">${esc(f.t)}</div><div class="wp-m small">${f.y} · ${GEN[mainG(f)].n} ${stars(f.lv)}</div></div>`;
}

/* ---------- actions ---------- */
Object.assign(ACT, {
  whow() { go('wHow'); },
  whowalerts() { go('wHow'); setTimeout(() => { const a = app.querySelector('#how-alerts'); a && a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); },
  wmenu(b) { const m = b.closest('.wh-acc'); const open = !m.classList.contains('open'); m.classList.toggle('open', open); b.setAttribute('aria-expanded', open); },
  wlogout() { logOut(); reset('wHome'); toast('Logged out'); },
  wauth() {
    const mode = cur.p.mode === 'login' ? 'login' : 'signup', v = id => ((app.querySelector('#' + id) || {}).value || '').trim();
    const email = v('wa-email'), typed = v('wa-name').slice(0, 20);
    if (mode === 'signup' && !typed) { toast('Add your name first'); app.querySelector('#wa-name').focus(); return; }
    if (mode === 'login' && !email) { toast('Add your email'); app.querySelector('#wa-email').focus(); return; }
    const back = logIn(typed || email.split('@')[0], email);
    reset('wHome'); toast(back ? `Welcome back, ${S.user.name}` : mode === 'login' ? `Welcome, ${S.user.name}` : `Welcome, ${S.user.name}. Your fear profile is saved.`);
  },
  wsso() { const n = app.querySelector('#wa-name'), m = app.querySelector('#wa-email');
    const name = (n && n.value.trim()) || S.name || 'Friend', email = (m && m.value.trim()) || '';
    const back = logIn(name.slice(0, 20), email); reset('wHome'); toast(back ? `Welcome back, ${S.user.name}` : `Welcome, ${S.user.name}`); },
  wf(b) { const { k, v } = b.dataset; WF[k] = k === 'fit' ? !WF.fit : v; refresh(); },
  wptab(b) { go('wProfile', { ...cur.p, tab: b.dataset.tab, cls: 'still' }, false); },
  wtest() { S.lo = false; save(); reset('tGenres'); },
  wdd(b) { const d = b.closest('.wdd'), open = !d.classList.contains('open'); app.querySelectorAll('.wdd.open').forEach(x => { x.classList.remove('open'); x.querySelector('.wdd-b').setAttribute('aria-expanded', 'false'); });
    d.classList.toggle('open', open); b.setAttribute('aria-expanded', open); },
  wddpick(b) { WF[b.dataset.k] = b.dataset.v; refresh(); },
  wsetsec(b) { go('wSettings', { sec: b.dataset.sec, cls: 'still' }, false); },
  wacct() { const n = (app.querySelector('#ws-name') || {}).value.trim().slice(0, 20), m = (app.querySelector('#ws-email') || {}).value.trim();
    if (!n) { toast('Add your name'); return; } if (m && !/.+@.+\..+/.test(m)) { toast('Check your email'); return; }
    S.user.name = n; S.name = n; S.user.email = m; save(); refresh(); toast('Saved'); },
  wemail() { const v = (app.querySelector('#ws-email') || {}).value || ''; if (!/.+@.+\..+/.test(v)) { toast('Add a valid email'); return; } S.user.email = v.trim(); save(); refresh(); toast('Email saved'); },
  whclear() { WF.q = ''; if (cur.name === 'wFilms') refresh(); else { const i = app.querySelector('#whq'); i.value = ''; app.querySelector('.wh-sf .sf-clear').hidden = true; } const i = app.querySelector('#whq'); if (i) i.focus(); },
  wfclear() { WF = { g: 'all', lv: '0', fit: !!S.done, sort: 'pop' }; refresh(); }
});
const _finish = ACT.finish; ACT.finish = () => { S.lo = false; _finish(); };
document.addEventListener('click', e => {
  if (!e.target.closest('.wh-acc')) app.querySelectorAll('.wh-acc.open').forEach(m => m.classList.remove('open'));
  if (!e.target.closest('.wdd')) app.querySelectorAll('.wdd.open').forEach(m => m.classList.remove('open'));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') app.querySelectorAll('.wdd.open,.wh-acc.open').forEach(m => { m.classList.remove('open'); const b = m.querySelector('[aria-expanded]'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }); });
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.wauth-form')) { e.preventDefault(); ACT.wauth(); } });

/* ---------- pages ---------- */
let WF = { g: 'all', lv: '0', fit: null, sort: 'pop', q: '' };
const wfResults = q => { const r = searchFilms(q); return r.length ? `<div class="wsr-head"><h2 class="d h2 wsec-h"><span>Results for “${esc(q.trim())}”</span></h2><span class="small t2">${pl(r.length, 'film')}</span></div><div class="wgrid">${r.map(f => `<div class="rcard">${wposter(f)}${(v => v ? `<span class="rv ${v[0]}">${v[1]}</span>` : '')(verdict(f))}</div>`).join('')}</div>` : `<div class="sres-none"><b class="d">We don't have this one yet</b><span class="small t2">Try another title, or clear the search to browse.</span></div>`; };
document.addEventListener('input', e => {
  if (e.target.id !== 'whq') return;
  WF.q = e.target.value; const c = app.querySelector('.wh-sf .sf-clear'); if (c) c.hidden = !WF.q;
  if (!cur || cur.name !== 'wFilms') { const pos = e.target.selectionStart; go('wFilms', {}); const i = app.querySelector('#whq'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } return; }
  const r = app.querySelector('#wfres'), all = app.querySelector('#wfall'), on = !!WF.q.trim(); r.innerHTML = wfResults(WF.q); r.hidden = !on; all.hidden = on;
});
Object.assign(SCREENS, {
  wHome() { return showLanding() ? landing() : personal(); },

  wFilms(p) {
    if (WF.fit === null) WF.fit = !!S.done; // films that fit you first: the safe view is the default
    if (p.fit && !p.applied) { WF = { ...WF, fit: S.done, g: p.g || 'all' }; p.applied = 1; }
    let list = FILMS.filter(f => !(S.watched[f.id] && S.watched[f.id].r === 'skip'));
    if (WF.g !== 'all') list = list.filter(f => f.g.includes(WF.g));
    if (WF.lv !== '0') list = list.filter(f => f.lv === +WF.lv);
    if (WF.fit && S.done) list = list.filter(f => fits(f));
    if (WF.sort === 'calm') list = [...list].sort((a, b) => a.scare - b.scare);
    if (WF.sort === 'scary') list = [...list].sort((a, b) => b.scare - a.scare);
    const tab = (v, l, st = '') => `<button class="wh-tab ${WF.g === v ? 'on' : ''}" data-act="wf" data-k="g" data-v="${v}" aria-pressed="${WF.g === v}"><span class="d">${l}</span>${st}</button>`;
    const sel = (k, label, opts) => { const cur = opts.find(o => o[0] === WF[k]) || opts[0];
      return `<div class="wdd" data-k="${k}"><button class="wdd-b" data-act="wdd" aria-haspopup="listbox" aria-expanded="false"><span class="lbl s t3">${label}</span><span class="wdd-v">${cur[1]}</span><i aria-hidden="true"></i></button>
        <div class="wdd-m" role="listbox" aria-label="${label}">${opts.map(([v, l]) => `<button role="option" data-act="wddpick" data-k="${k}" data-v="${v}" aria-selected="${WF[k] === v}"><span>${l}</span><svg class="wdd-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`).join('')}</div></div>`; };
    const changed = WF.g !== 'all' || WF.lv !== '0' || WF.sort !== 'pop' || WF.fit !== !!S.done;
    const sum = [WF.g !== 'all' && GEN[WF.g].n, WF.lv !== '0' && '★'.repeat(+WF.lv), WF.fit && 'Fits me'].filter(Boolean).join(' · ');
    return page('wFilms', `
      <div class="wtitle"><div>${kick('All films')}<h1 class="d wh1">Films</h1><p class="txt t2">${FILMS.length} horror films, each one rated for how scary it really is.</p></div></div>
      <div id="wfres" ${WF.q ? '' : 'hidden'}>${wfResults(WF.q || '')}</div>
      <div id="wfall" ${WF.q ? 'hidden' : ''}>
      <div class="wfilters">
        <div class="wf-tabs" role="group" aria-label="Genre">${tab('all', 'All')}${ORDER.map(g => tab(g, GEN[g].n, S.done ? stars(lv()[g]) : '')).join('')}</div>
      </div>
      <div class="wf-bar">
        <div class="wf-sum"><span class="lbl l">${pl(list.length, 'film')}</span>${sum ? `<span class="small t2">${sum}</span>` : ''}${changed ? '<button class="link cyan" data-act="wfclear">Clear</button>' : ''}</div>
        <div class="wf-ctl">
          ${S.done ? `<button class="switch wf-fit" role="switch" aria-checked="${WF.fit}" data-act="wf" data-k="fit"><span>Only films that fit me</span><span class="knob" aria-hidden="true"></span></button>`
            : `<button class="link cyan wf-cta" data-act="wtest">Take the fear test to see what fits you ›</button>`}
          ${sel('lv', 'Level', [['0', 'Any'], ['1', '★ Gentle'], ['2', '★★ Getting braver'], ['3', '★★★ Brave']])}
          ${sel('sort', 'Sort', [['pop', 'Popular'], ['calm', 'Least scary first'], ['scary', 'Scariest first']])}
        </div>
      </div>
      ${list.length ? `<div class="wgrid">${list.map(f => wposter(f)).join('')}</div>` : `<div class="wempty">${empty('No films match these filters.')}</div>`}</div>`);
  },

  wFilm(p) {
    const f = BY[p.id]; if (!f) return SCREENS.wFilms({});
    const L0 = lv(), g = S.sel && f.g.includes(S.sel) ? S.sel : mainG(f), L = capFor(f, g), why = S.done && blocked(f);
    const st = stamps(f), saved = S.saved.includes(f.id), w = S.watched[f.id], rated = w && w.r !== 'skip';
    const vc = why ? ['red', 'Not for you'] : f.lv < L ? ['cyan', 'Inside your zone'] : f.lv === L ? ['moon', 'Right at your edge'] : ['red', 'Above your zone'];
    const whyTxt = { avoid: 'Has something you asked to avoid.', gore: 'More blood than you asked for.', jump: 'More jump scares than you like.' }[why];
    const busy = st.length ? busiest(st) : 0, href = `https://www.justwatch.com/se/search?q=${encodeURIComponent(f.t)}`;
    const like = FILMS.filter(x => x.id !== f.id && x.g.includes(mainG(f)) && Math.abs(x.lv - f.lv) <= 1 && !(S.watched[x.id] && S.watched[x.id].r === 'skip')).slice(0, 6);
    return `${whead('wFilms')}${bd(f)}<main class="wmain">
      <div class="wf-hero">
        <div class="wf-poster" style="${posterBg(f.id)}">${art(f, 'w500')}</div>
        <div class="wf-info">
          ${kick(GEN[mainG(f)].n)}
          <h1 class="d wh1 wf-title">${esc(f.t)}</h1>
          <p class="lbl l t2">${[f.y, `${f.rt} min`, f.cert, f.g.map(x => GEN[x].n).join(', ')].filter(Boolean).join(' · ')}</p>
          ${f.tr.length || f.sub.length ? `<div class="chips">${f.tr.map(t => `<span class="tag alert"><span aria-hidden="true">⚠</span>${TRIG[t]}</span>`).join('')}${f.sub.map(s => `<span class="tag">${cap(s)}</span>`).join('')}</div>` : ''}
          <p class="txt t2 wf-plot">${esc(f.overview || f.plot)}</p>
        </div>
        <aside class="wf-side glass">
          ${S.done ? `<div class="ws-verdict v-${vc[0]}"><span class="d ws-v">${vc[1]}</span>
            <p class="small t2">${why ? whyTxt : `Your ${GEN[g].n.toLowerCase()} zone is <span class="stars">${'★'.repeat(L)}</span>. ${f.lv < L ? 'This one is easier.' : f.lv === L ? 'This one is as scary as you go right now.' : 'This one is scarier.'}`}</p>
</div>`
            : `<div class="ws-verdict"><span class="d ws-v">Fits you?</span><button class="link cyan ws-test" data-act="wtest">Take the fear test to find out ›</button></div>`}
          <div class="ws-acts">
            ${st.length ? `${pbtn('Start jump alerts', `data-go="altimer" data-id="${f.id}"`)}<p class="small t3 ws-note">Warns you 5 seconds before each jump scare.</p>` : ''}
            <a class="btn2" href="${href}" target="_blank" rel="noopener">Where to stream ↗</a>
          </div>
          <div class="qacts ws-q">
            <button class="qa wsave" data-act="save" data-id="${f.id}" aria-pressed="${saved}">${BOOKMARK}<span class="on-t">Saved</span><span class="off-t">Save</span></button>
            ${rated ? `<button class="qa" data-go="check1" data-id="${f.id}" data-again="1" data-from="detail">${ICON.eye}<span>${FACE[w.r]}</span></button>`
              : `<button class="qa" data-go="check1" data-id="${f.id}" data-seen="1">${ICON.eye}<span>Seen it</span></button>`}
            <button class="qa" data-act="notforme" data-id="${f.id}">${ICON.x}<span>Not for me</span></button>
          </div>
          ${st.length ? `<div class="ws-qr"><span class="ws-qr-c">${qrSvg(siteURL('#/film/' + f.id))}</span><span class="small t2">Jump alerts work best on your phone. Scan to open this film there.</span></div>` : ''}
        </aside>
      </div>
      <section class="wsec"><h2 class="d h2 wsec-h"><span>The scare</span></h2>
        <div class="wf-tiles">
          <div class="wf-tile glass wf-tile-scare"><span class="lbl cyan">Scare</span><span class="num">${f.scare.toFixed(1)}<small>/10</small></span>${meter(f, L)}<span class="small t3">${S.done ? `Sky bars are inside your ${GEN[g].n.toLowerCase()} zone.` : 'How frightening people found it.'}</span></div>
          <div class="wf-tile glass"><span class="lbl cyan">Jump scares</span>${f.j == null ? '<span class="num nod">–</span><span class="small t3">No data yet</span>' : `<span class="num">${f.j}</span><span class="small t3">${st.length ? `Busiest at ${busy}–${busy + 10} min` : 'No timings yet'}</span>`}</div>
          <div class="wf-tile glass"><span class="lbl cyan">Gore</span><span class="num">${f.gore.toFixed(1)}<small>/10</small></span><span class="wbar" aria-hidden="true"><i style="width:${f.gore * 10}%"></i></span></div>
          <div class="wf-tile glass"><span class="lbl cyan">Level</span><span class="wf-lv">${stars(f.lv, 'l')}</span><span class="lbl l">${LV_NAME[f.lv - 1]}</span></div>
        </div></section>
      ${st.length ? `<section class="wsec"><div class="wsec-row"><h2 class="d h2 wsec-h"><span>When the jumps come</span></h2><span class="small t2">${pl(st.length, 'jump scare')} · busiest stretch ${busy}–${busy + 10} min</span></div>
        <div class="glass wf-chart">${jumpBars(st, f.rt || 100, busy)}</div></section>` : ''}
      ${like.length ? `<section class="wsec"><h2 class="d h2 wsec-h"><span>More like this</span></h2><div class="wgrid">${like.map(x => wposter(x)).join('')}</div></section>` : ''}
    </main>${wfoot()}`;
  },

  wProfile(p) {
    if (!S.user) return SCREENS.wAuth({ mode: 'login', from: 'profile' });
    const L = lv(), tab = p.tab || 'watched', xp = S.xp % 2, base = testLevels();
    const watched = Object.keys(S.watched).filter(id => S.watched[id].r !== 'skip').sort((a, b) => S.watched[b].t - S.watched[a].t);
    const gained = ORDER.reduce((n, g) => n + Math.max(0, L[g] - base[g]), 0);
    const tabs = [['watched', `Watched ${watched.length}`], ['saved', `Saved ${S.saved.length}`], ['levels', 'Levels']];
    let body;
    if (tab === 'levels') body = `<div class="wlevels">${ORDER.map(g => `<button class="wlv glass" data-go="wLevel" data-g="${g}">
        <span class="d h2">${GEN[g].n}</span>${stars(L[g], 'l')}<span class="lbl l cyan">${LV_NAME[L[g] - 1]}</span><span class="desc">${LV_TXT[g][L[g] - 1]}</span><span class="link cyan">Change ›</span></button>`).join('')}</div>`;
    else { const ids = tab === 'saved' ? S.saved : watched;
      body = ids.length ? `<div class="wgrid">${ids.map(id => BY[id] && wposter(BY[id], { rating: tab === 'watched' })).join('')}</div>`
        : `<div class="wempty">${empty(tab === 'saved' ? 'Nothing saved yet. Save any film to find it here.' : 'Nothing watched yet. After a film, tell CoverCat how it went.')}</div>`; }
    return `${whead(tab === 'saved' ? 'wProfile' : '')}<div class="wp-banner" aria-hidden="true"><div class="band white"></div><div class="band cyan"></div></div>
    <main class="wmain">
      <div class="wp-head">
        <button class="avatar wp-av" data-act="avpick" aria-label="Change profile picture">${avatarImg()}</button>
        <div class="wp-id">${kick(`${esc(S.user.name)}'s profile`)}<div class="wp-type">${S.done ? ransom(fearType(), 40, true) : `<h1 class="d wh1">${esc(S.user.name)}</h1>`}</div>
          <div class="courage"><span class="lbl l">Courage LV <span class="num">${courage()}</span></span><span class="bar" role="img" aria-label="${xp} of 2 films to the next level"><i style="width:${xp * 50 + 8}%"></i></span><span class="small">${pl(2 - xp, 'more film', 'more films')} to the next level</span></div></div>
        <div class="wp-btns">${sbtn('Share fear profile', 'data-go="share"')}${sbtn('Settings', 'data-go="wSettings"')}</div>
      </div>
      <div class="wp-stats">${[['Watched', watched.length], ['Saved', S.saved.length], ['Level ups', gained], ['Courage LV', courage()]].map(([l, v]) => `<div class="glass"><span class="lbl s t2">${l}</span><span class="num">${v}</span></div>`).join('')}</div>
      ${S.done ? '' : `<div class="wbanner glass"><span class="txt">Take the fear test to get your fear type and films that fit you.</span>${pbtn('Take the fear test', 'data-act="wtest"')}</div>`}
      <div class="wtabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="wptab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
      ${body}
    </main>${wfoot()}`;
  },

  wHow() {
    const demo = FILMS.find(f => stamps(f).length >= 6 && f.poster) || FILMS[0], st = stamps(demo);
    const ex = FILMS.find(f => f.poster && f.j != null) || demo;
    const card = (n, h, d) => `<div class="wh-item glass"><span class="num wnum">${n}</span><div><h3 class="d h3">${h}</h3><p class="desc">${d}</p></div></div>`;
    return page('wHow', `<div class="wtitle">${kick('How it works')}<h1 class="d wh1">Horror, one level at a time</h1>
      <p class="txt t2">CoverCat finds horror you can actually enjoy, warns you before the jumps, and lets you get braver at your own pace.</p></div>
      ${howHtml(false, false)}

      <section class="wsec"><h2 class="d h2 wsec-h"><span>Reading the scores</span></h2>
        <div class="wf-tiles">
          <div class="wf-tile glass wf-tile-scare"><span class="lbl cyan">Scare</span><span class="num">${ex.scare.toFixed(1)}<small>/10</small></span>${meter(ex, 2)}<span class="small t3">How frightening it is</span></div>
          <div class="wf-tile glass"><span class="lbl cyan">Jump scares</span><span class="num">${ex.j}</span><span class="small t3">How many sudden scares</span></div>
          <div class="wf-tile glass"><span class="lbl cyan">Gore</span><span class="num">${ex.gore.toFixed(1)}<small>/10</small></span><span class="wbar" aria-hidden="true"><i style="width:${ex.gore * 10}%"></i></span><span class="small t3">How much blood</span></div>
          <div class="wf-tile glass"><span class="lbl cyan">Level</span><span class="wh-lvls">${[1, 2, 3].map(n => `<span>${stars(n)} <span class="small t2">${LV_NAME[n - 1]}</span></span>`).join('')}</span></div>
        </div>
        <div class="wh-verdicts">
          <div><span class="vchip cyan"><span>Inside your zone</span></span><span class="small t2">Relax and enjoy</span></div>
          <div><span class="vchip moon"><span>Right at your edge</span></span><span class="small t2">A chance to level up</span></div>
          <div><span class="vchip red"><span>Above your zone</span></span><span class="small t2">Not yet</span></div>
        </div></section>

      <section class="wsec" id="how-alerts"><h2 class="d h2 wsec-h"><span>Jump alerts</span></h2>
        <div class="wh-flow">
          <figure class="wh-frame">${timerMock(st, true)}<figcaption><b>Start with the film</b><span class="small t2">Press start when you press play</span></figcaption></figure>
          <span class="wh-arrow" aria-hidden="true">›</span>
          <figure class="wh-frame"><div class="wh-red" aria-hidden="true">${kick('Heads up')}<span class="d">Jump scare in</span><span class="num">3</span><img src="cats/cantlook.svg" alt=""></div><figcaption><b>Warned 5 seconds before</b><span class="small t2">Cover your eyes or lower the volume</span></figcaption></figure>
          <span class="wh-arrow" aria-hidden="true">›</span>
          <figure class="wh-frame"><div class="wh-done" aria-hidden="true"><img src="cats/sit-3-shades.svg" alt=""></div><figcaption><b>Closes by itself</b><span class="small t2">No sound, ever</span></figcaption></figure>
        </div></section>

      <section class="wsec"><h2 class="d h2 wsec-h"><span>After the film</span></h2>
        <div class="wh-after">
          <div class="glass"><img src="cats/sit-3-shades.svg" alt=""><b class="d">Easy</b><span class="small t2">Level up</span></div>
          <div class="glass"><img src="cats/ready.svg" alt=""><b class="d">Made it</b><span class="small t2">More courage</span></div>
          <div class="glass"><img src="cats/cantlook.svg" alt=""><b class="d">Too scary</b><span class="small t2">Back down a level</span></div>
        </div></section>

      <section class="wsec"><h2 class="d h2 wsec-h"><span>Fear filters</span></h2>
        <p class="txt t2 wh-lead">You choose what stays away.</p>
        <div class="wh-filters" aria-hidden="true">
          <div class="glass"><span class="lbl l">Blood</span><span class="pills"><span class="pill">None</span><span class="pill" aria-pressed="true">A little</span><span class="pill">Lots</span></span></div>
          <div class="glass"><span class="lbl l">Jump scares</span><span class="pills"><span class="pill">Any</span><span class="pill" aria-pressed="true">15 or fewer</span><span class="pill">6 or fewer</span></span></div>
          <div class="glass"><span class="lbl l">Keep away</span><span class="pills"><span class="pill">Animals</span><span class="pill">Kids</span><span class="pill" aria-pressed="true">Self-harm</span></span></div>
        </div></section>

      <section class="wl-cta"><div class="band white" aria-hidden="true"></div><div class="wl-cta-in"><h2 class="d wh2">${S.done ? 'Ready for a film?' : 'Ready? It takes two minutes.'}</h2>${S.done ? pbtn('Browse films', 'data-go="wFilms"') : pbtn('Take the fear test', 'data-act="wtest"')}</div><img src="cats/${S.done ? 'sit-3-shades' : 'curious'}.svg" alt=""></section>`);
  },

  wResult() {
    const L = lv(), n = FILMS.filter(f => fits(f)).length, k = S.test.avoid.length;
    return `${whead('')}<div class="wr-bg" aria-hidden="true"><div class="band white"></div><div class="band cyan"></div></div><main class="wmain wr">
      <div class="wr-l">${kick('Your fear type')}<div class="wr-type">${ransom(fearType(), 64)}</div>
        <div class="wr-stat"><span class="num">${n}</span><span class="lbl l">${n === 1 ? 'film fits' : 'films fit'} you right now</span></div>
        <p class="txt t2">${k ? `${pl(k, 'thing')} you asked to avoid ${k === 1 ? 'is' : 'are'} kept away.` : 'Nothing kept away.'} You can change your levels any time.</p>
        <div class="wr-btns">${btn('Show me films', 'data-go="wHome"', true)}${sbtn('Make a share card', 'data-go="share"')}</div>
        ${S.user ? '' : '<p class="small t2">Want to keep this? <button class="link cyan" data-go="wAuth" data-mode="signup" data-save="1">Create a free account</button></p>'}</div>
      <div class="wr-r"><img class="wr-cat" src="cats/ready.svg" alt="">
        <div class="glass wr-card">${ORDER.map(g => `<div class="between"><span class="lbl l up">${GEN[g].n}</span>${stars(L[g], 'l')}</div>`).join('')}</div></div>
    </main>`;
  },

  wLevel(p) {
    const g = p.g in GEN ? p.g : 'psy', L = lv()[g];
    return page('', `<div class="wtitle">${kick(GEN[g].n)}<h1 class="d wh1">Your level</h1><p class="txt t2">Here is what each level means. Feel braver or less brave? Pick one yourself.</p></div>
      <div class="wh-tabs wlv-tabs" role="tablist">${ORDER.map(k => `<button role="tab" class="wh-tab ${k === g ? 'on' : ''}" data-act="wlvg" data-g="${k}" aria-selected="${k === g}"><span class="d">${GEN[k].n}</span>${stars(lv()[k])}</button>`).join('')}</div>
      <div class="wlv-cols">${[1, 2, 3].map(n => {
        const ex = FILMS.filter(f => f.g.includes(g) && f.lv === n).slice(0, 3), on = n === L, just = +p.just === n;
        return `<div class="wlv-card glass ${on ? 'on' : ''}">
          <div class="wlv-h">${stars(n, 'l')}${on ? `<span class="tag fill">${just ? 'Done! You are here' : 'You are here'}</span>` : ''}</div>
          <h2 class="d h2">${LV_NAME[n - 1]}</h2><p class="desc">${LV_TXT[g][n - 1]}</p>
          <p class="small t3">Like these</p>
          <div class="wlv-ex">${ex.map(f => `<button class="poster ${f.poster ? 'has-art' : ''}" style="${posterBg(f.id)}" data-go="wFilm" data-id="${f.id}" aria-label="${esc(f.t)}">${art(f)}<span class="pt">${esc(f.t)}</span></button>`).join('')}</div>
          ${on ? '' : `<button class="btn2 sm" data-act="setlv" data-g="${g}" data-v="${n}">Set to ${'★'.repeat(n)}</button>`}
        </div>`; }).join('')}</div>`);
  },

  wSettings(p) {
    if (!S.user) return SCREENS.wAuth({ mode: 'login' });
    const T = S.test, sec = p.sec || 'account';
    const menu = [['account', 'Account'], ['filters', 'Fear filters'], ['sound', 'Sound'], ['test', 'Fear test'], ['data', 'Data']];
    const row = (l, v) => `<div class="ws-row"><span class="lbl l t2">${l}</span><span class="txt">${v}</span></div>`;
    const body = {
      account: `<div class="ws-head"><h2 class="d h2">Account</h2><p class="desc">Your name shows on your profile and home.</p></div>
        <label class="ws-field"><span class="lbl l">Name</span><input class="input" id="ws-name" type="text" maxlength="20" value="${esc(S.user.name)}"></label>
        <label class="ws-field"><span class="lbl l">Email</span><input class="input" id="ws-email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(S.user.email || '')}"></label>
        <div class="ws-save">${pbtn('Save changes', 'data-act="wacct"')}</div>
        <div class="ws-div"></div>
        <div class="ws-head"><h3 class="lbl l">Log out of CoverCat</h3><p class="desc">Your films and levels stay saved.</p></div>
        <button class="link ws-out" data-act="wlogout">Log out</button>`,
      filters: `<div class="ws-head"><h2 class="d h2">Fear filters</h2><p class="desc">CoverCat keeps films past these out of your lists.</p></div>
        <h3 class="lbl l mt">Blood</h3><div class="opts">${BLOOD_OPTS.map((l, i) => opt(l, `data-act="fset" data-k="blood" data-v="${i}"`, T.blood === i)).join('')}</div>
        <h3 class="lbl l mt">Jump scares</h3><div class="opts">${JUMP_OPTS.map((l, i) => opt(l, `data-act="fset" data-k="jump" data-v="${i}"`, T.jump === i)).join('')}</div>
        <h3 class="lbl l mt">Keep away</h3><div class="crows">${Object.entries(TRIG).map(([k, l]) => crow(l, `data-act="fset" data-k="avoid" data-v="${k}"`, T.avoid.includes(k))).join('')}</div>`,
      sound: `<div class="ws-head"><h2 class="d h2">Sound</h2><p class="desc">Little sounds for level ups and BOO!. Jump alerts never make a sound.</p></div><div class="glass ws-card">${soundSwitch()}</div>`,
      test: `<div class="ws-head"><h2 class="d h2">Fear test</h2><p class="desc">Start over with new answers. Your watched films stay.</p></div>${sbtn('Retake the fear test', 'data-act="wtest"')}`,
      data: `<div class="ws-head"><h2 class="d h2">Data</h2><p class="desc">Everything is kept in this browser for now. Erasing it can not be undone.</p></div><button class="btn2 warn-b" data-act="wipe">Erase my data</button>`
    }[sec];
    return page('', `<button class="wclose" data-act="back" aria-label="Close settings"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button>
      <div class="ws-top"><h1 class="d ws-h1">Settings</h1></div>
      <div class="ws-layout"><nav class="ws-nav" aria-label="Settings">${menu.map(([k, l]) => `<button data-act="wsetsec" data-sec="${k}" ${k === sec ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>
        <section class="ws-body">${body}</section></div>`, 'wset-main');
  },

  wAuth(p) {
    const login = p.mode === 'login';
    return `${whead('')}<main class="wmain wauth-main"><div class="wauth glass">
      <div class="wauth-art"><div class="band white" aria-hidden="true"></div><div class="band cyan" aria-hidden="true"></div>
        <div class="wauth-copy">${kick(login ? 'Welcome back' : p.save ? 'Save your progress' : 'Join CoverCat')}
          <h2 class="d wh2">${login ? 'Your films are waiting.' : 'Keep your fear profile.'}</h2>
          <p class="txt t2">${login ? 'Log in to see your zone, your saved films and your courage level.' : 'Save your levels, films and courage, and pick up where you left off on any device.'}</p></div>
        <img src="cats/${login ? 'wave-1' : 'ready'}.svg" alt=""></div>
      <div class="wauth-form">
        <h1 class="d wh1">${login ? 'Log in' : 'Create account'}</h1>
        <div class="stack">${sbtn('Continue with Apple', 'data-act="wsso"')}${sbtn('Continue with Google', 'data-act="wsso"')}</div>
        <p class="small t3 wauth-or"><span>or</span></p>
        ${login ? '' : `<label class="wl"><span class="lbl s t2">Name</span><input class="input" id="wa-name" type="text" maxlength="20" autocomplete="nickname" placeholder="What should CoverCat call you?" value="${esc(S.name || '')}"></label>`}
        <label class="wl"><span class="lbl s t2">Email</span><input class="input" id="wa-email" type="email" autocomplete="email" placeholder="you@example.com"></label>
        ${pbtn(login ? 'Log in' : 'Create account', 'data-act="wauth"')}
        <p class="small t3">Prototype: no passwords, your account lives in this browser.</p>
        <p class="small wauth-sw">${login ? 'New here? <button class="link cyan" data-go="wAuth" data-mode="signup">Create an account</button>' : 'Already have an account? <button class="link cyan" data-go="wAuth" data-mode="login">Log in</button>'}</p>
      </div></div></main>${wfoot()}`;
  }
});

// How it works: the three steps and the jump alert demo. Used on the landing page and on its own page
// A small static jump alerts timer (ring + up next), used to explain the feature
function timerMock(st, mini) {
  const R = 104, C = (2 * Math.PI * R).toFixed(1), nx = st.slice(0, 3), fmt = fmtH, first = nx[0] ? nx[0].s : 540;
  const ring = `<div class="al-ring wt-ring"><svg viewBox="0 0 230 230" aria-hidden="true"><circle class="al-rtrack" cx="115" cy="115" r="${R}"/><circle class="al-rbar" cx="115" cy="115" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${(C * 0.28).toFixed(1)}"/></svg>
    <div class="al-rin"><span class="lbl t2">Next scare in</span><span class="num">${Math.max(1, Math.round(first / 60))}<small>min</small></span>${mini ? '' : `<span class="small t2">at ${fmt(first)}</span>`}</div></div>`;
  if (mini) return `<div class="wt-mini" aria-hidden="true">${ring}</div>`;
  return `<div class="wt-mock glass" aria-hidden="true">${ring}<div class="wt-next">${kick('Up next')}<div class="list glass al-list">${nx.map((s, i) => `<div class="al-row"><span class="num">${fmt(s.s)}</span>${s.big ? '<span class="tag fill red">Big</span>' : ''}<span class="al-n small t3">${i + 1} of ${st.length}</span></div>`).join('')}</div></div></div>`;
}
// How it works: the three steps (landing and its own page) and the jump alert demo (landing)
function howHtml(title, demoToo = true) {
  const demo = FILMS.find(f => stamps(f).length >= 6 && f.poster) || FILMS[0], st = stamps(demo), busy = busiest(st);
  const steps = `<section class="wsec" id="how">${title ? '<h2 class="d h2 wsec-h"><span>How it works</span></h2>' : ''}
      <div class="wl-steps">${[['curious', 'Take the fear test', 'Five quick questions about ghosts, killers, blood and jump scares. CoverCat learns what gets to you.'],
        ['sit-1-peek', 'Get films that fit', 'Every film has a scare score, a gore score and a jump scare count. You only see the ones inside your zone.'],
        ['sit-3-shades', 'Watch, then level up', 'Jump alerts warn you before each scare. Tell CoverCat how it went and your zone grows with you.']]
        .map(([c, t, d], i) => `<div class="wl-step glass"><span class="num wnum">${i + 1}</span><img src="cats/${c}.svg" alt=""><h3 class="d h2">${t}</h3><p class="desc">${d}</p></div>`).join('')}</div>
      ${title ? '<button class="link cyan wl-more" data-go="wHow">See how it works ›</button>' : ''}</section>`;
  if (!demoToo) return steps;
  return `${steps}
    <section class="wsec wl-feat">
      <div class="glass wl-demo"><div class="wl-demo-h"><div class="wl-dp" style="${posterBg(demo.id)}">${art(demo)}</div><div>${kick('Know what is coming')}<div class="d h2">${esc(demo.t)}</div>
        <p class="small t2">${demo.j} jump scares · busiest at ${busy}–${busy + 10} min</p></div></div>${jumpBars(st, demo.rt || 100, busy)}${timerMock(st, true)}</div>
      <div class="wl-feat-t"><h2 class="d wh2">No more surprise jump scares.</h2><p class="txt t2">CoverCat knows when the jumps come in ${FILMS.filter(f => stamps(f).length).length} films. Press start with the film. CoverCat counts down and warns you five seconds before each jump.</p>
        ${sbtn('See how jump alerts work', 'data-act="whowalerts"')}</div>
    </section>`;
}

/* ---------- Home: landing for new visitors ---------- */
function landing() {
  const top = FILMS.filter(f => f.poster).slice(0, 3), start = FILMS.filter(f => f.lv === 1).slice(0, 6);
  const demo = FILMS.find(f => stamps(f).length >= 6 && f.poster) || FILMS[0], st = stamps(demo), busy = busiest(st);
  return `${whead('wHome')}${bd(top[0])}<main class="wmain">
    <section class="wl-hero">
      <div class="wl-copy">${kick('Horror for scaredy-cats')}
        <h1 class="d wl-h1">Love horror.<br><span>Scare easily.</span></h1>
        <p class="wl-sub">Take a two-minute fear test. CoverCat finds horror films that fit how brave you are, warns you before every jump scare, and levels you up one film at a time.</p>
        <div class="wl-btns">${pbtn('Take the fear test', 'data-act="wtest"')}${sbtn('Browse films', 'data-go="wFilms"')}</div>
        <p class="small t3">Free. No account needed to start.</p></div>
      <div class="wl-art" aria-hidden="true">${top.map((f, i) => `<div class="wl-p wl-p${i}" style="${posterBg(f.id)}">${art(f)}</div>`).join('')}<img class="wl-cat" src="cats/wave-1.svg" alt=""></div>
    </section>
${howHtml(true)}
    <section class="wsec"><div class="wsec-row"><h2 class="d h2 wsec-h"><span>Start gentle</span></h2><button class="link cyan" data-go="wFilms">Browse all films ›</button></div>
      <div class="wgrid">${start.map(f => wposter(f)).join('')}</div></section>
    <section class="wl-cta"><div class="band white" aria-hidden="true"></div><div class="wl-cta-in"><h2 class="d wh2">Ready? It takes two minutes.</h2>${pbtn('Take the fear test', 'data-act="wtest"')}</div><img src="cats/curious.svg" alt=""></section>
  </main>${wfoot()}`;
}

/* ---------- Home: personal, after the test ---------- */
function personal() {
  const L = lv(), g = S.sel || 'psy', list = zoneList(g), xp = S.xp % 2;
  const next = L[g] < 3 ? FILMS.filter(f => f.g.includes(g) && !blocked(f) && f.lv === L[g] + 1).length : 0;
  const saved = S.saved.map(id => BY[id]).filter(Boolean).slice(0, 6);
  return `${whead('wHome')}${bd(list[0])}<main class="wmain">
    <section class="wh-hero">
      <div><div class="lbl l cyan">${greeting()}</div><h1 class="d wl-h1 wh-name">${S.name ? `Hi, ${esc(S.name)}` : 'Hi there'}</h1>
        <div class="wh-type">${kick('Your fear type')}<span class="d h2">${fearType()}</span></div>
        <div class="courage"><span class="lbl l">Courage LV <span class="num">${courage()}</span></span><span class="bar" role="img" aria-label="${xp} of 2 films to the next level"><i style="width:${xp * 50 + 8}%"></i></span><span class="small">${pl(2 - xp, 'more film', 'more films')} to the next level</span></div></div>
      <img class="wh-cat" src="cats/calm.svg" alt="">
    </section>
    ${S.user ? '' : `<div class="wbanner glass"><span class="txt"><b>Save your fear profile.</b> Right now it only lives in this browser.</span>${pbtn('Sign up', 'data-go="wAuth" data-mode="signup" data-save="1"')}<button class="link" data-go="wAuth" data-mode="login">Log in</button></div>`}
    <div class="wh-tabs" role="tablist">${ORDER.map(k => `<button role="tab" class="wh-tab ${k === g ? 'on' : ''}" data-act="wsel" data-g="${k}" aria-selected="${k === g}"><span class="d">${GEN[k].n}</span>${stars(L[k])}</button>`).join('')}</div>
    <section class="wsec wsec-tight"><div class="wsec-row"><h2 class="d h2 wsec-h"><span>In your zone</span></h2>${list.length ? `<button class="link cyan" data-go="wFilms" data-fit="1" data-g="${g}">See all ${list.length} ›</button>` : ''}</div>
      ${list.length ? `<div class="wgrid">${list.slice(0, 12).map(f => wposter(f)).join('')}</div>` : `<div class="wempty">${empty('Nothing here yet. Watch something a little easier and CoverCat will open this up.')}</div>`}
      ${wunlock(g, L[g])}</section>
    ${saved.length ? `<section class="wsec"><div class="wsec-row"><h2 class="d h2 wsec-h"><span>Saved for later</span></h2><button class="link cyan" data-go="wProfile" data-tab="saved">All saved ›</button></div><div class="wgrid">${saved.map(f => wposter(f)).join('')}</div></section>` : ''}
  </main>${wfoot()}`;
}
// What the next level opens, web style: the locked films are shown blurred next to the explanation
function wunlock(g, L) {
  const n = GEN[g].n, up = `<span class="stars">${'★'.repeat(L + 1)}</span>`;
  const art4 = (films, mode) => `<div class="wu-posters ${mode}" aria-hidden="true">${films.slice(0, 4).map(f => `<div class="wu-p" style="${posterBg(f.id)}">${art(f)}${mode === 'blocked' ? `<span class="mu-why">${whyTag(f)}</span>` : ''}</div>`).join('')}${mode === 'locked' ? `<span class="wu-lock">${NL_ICON.lock}</span>` : ''}</div>`;
  if (L >= 3) return `<div class="wunlock glass">${art4(nlTop(g), 'open')}<div class="wu-t"><span class="lbl l cyan">All levels open</span><span class="d h2">Every ${n} level unlocked</span>
    <p class="desc">You can watch anything in ${n.toLowerCase()} now. Brave cat.</p></div></div>`;
  const locked = nlLocked(g, L);
  if (!locked.length) { const bl = nlBlocked(g, L);
    return `<div class="wunlock glass">${bl.length ? art4(bl, 'blocked') : ''}<div class="wu-t"><span class="lbl l cyan">Next level</span><span class="d h2">No ${up} ${n} films fit your filters</span>
    <p class="desc">${bl.length ? `Your fear filters keep ${bl.length} away. Change them if you feel ready.` : 'Change your fear filters if you feel ready.'}</p></div>${sbtn('Fear filters', 'data-go="wSettings" data-sec="filters"')}</div>`; }
  return `<div class="wunlock glass">${art4(locked, 'locked')}
    <div class="wu-t"><span class="lbl l cyan">Next level</span><span class="d h2">${pl(locked.length, 'more film unlocks', 'more films unlock')} at ${up}</span>
      <p class="desc">Watch a film from your zone, then tell CoverCat how it went. If it was easy, your ${n.toLowerCase()} level goes up.</p></div>
    ${sbtn('How levels work', `data-go="wLevel" data-g="${g}"`)}</div>`;
}
ACT.wlvg = b => go('wLevel', { g: b.dataset.g, cls: 'still' }, false);
ACT.wsel = b => { S.sel = b.dataset.g; save(); go('wHome', { cls: 'still' }, false); };

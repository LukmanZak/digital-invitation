import anime from 'animejs/lib/anime.es.js';
window.anime = anime;
import { CONFIG as __CFG } from './config.js';
import * as api from './api.js';
window.__CONFIG = __CFG;
(function(){
  /* =========================================================
     CONFIG: ganti data di sini (nama, tanggal, lokasi, foto)
     ========================================================= */
  var CONFIG = window.__CONFIG;

  /* ---------- helpers ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasAnime = typeof anime !== 'undefined';
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var doc = document.documentElement;

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

  /* ---------- fill config ---------- */
  $('#akadTime').textContent = CONFIG.akad.time;
  $('#akadPlace').innerHTML = CONFIG.akad.place.split('\n').map(escapeHtml).join('<br>');
  $('#resepsiTime').textContent = CONFIG.resepsi.time;
  $('#resepsiPlace').innerHTML = CONFIG.resepsi.place.split('\n').map(escapeHtml).join('<br>');
  $('#imgNida').src = CONFIG.photos.nida;
  $('#imgLukman').src = CONFIG.photos.lukman;
  var guest = new URLSearchParams(location.search).get('to');
  $('#guestName').textContent = (guest && guest.trim()) ? guest.trim().slice(0, 60) : CONFIG.guestDefault;
  var guestCode = (new URLSearchParams(location.search).get('g') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  var guestInfo = null;   // { name, max_guests, attending, guests } once Supabase answers
  var canSave = api.enabled && !!guestCode;
  if (canSave){
    api.getGuest(guestCode).then(function(g){
      if (!g) return;
      guestInfo = g; guest = g.name;
      $('#guestName').textContent = g.name;
      document.dispatchEvent(new CustomEvent('guest-ready'));
    }).catch(function(){ canSave = false; });
  }

  /* ---------- split titles into letters ---------- */
  $$('.ttl.split').forEach(function(t){
    var txt = t.textContent; t.textContent = '';
    txt.split(' ').forEach(function(word, wi, arr){
      var w = document.createElement('span'); w.className = 'wd';   // a word never breaks in the middle
      word.split('').forEach(function(ch){
        var s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.appendChild(s);
      });
      t.appendChild(w);
      if (wi < arr.length - 1) t.appendChild(document.createTextNode(' '));
    });
    t.setAttribute('aria-label', txt);
  });

  /* ---------- lock scroll until the gate is opened ---------- */
  doc.classList.add('locked');
  $('#openBtn').addEventListener('click', function(){
    doc.classList.remove('locked');
    var wofTrack = document.getElementById('tr-wof'); if (wofTrack) wofTrack.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
    showToast('Selamat datang, terima kasih sudah hadir');
    burstPetals(8);
    showScrollHint();
  });

  /* ---------- scroll hint: after "Buka undangan" until the guest has scrolled on their own ---------- */
  function showScrollHint(){
    var h = $('#scrollHint'); if (!h) return;
    var y0 = 0, done = false, armed = false, idle = null, t = null;
    function hide(){
      if (done) return; done = true;
      clearTimeout(t); clearTimeout(idle); h.classList.remove('show');
      window.removeEventListener('scroll', onMove); window.removeEventListener('wheel', onUser); window.removeEventListener('touchmove', onUser);
    }
    // the automatic scroll to the first board also fires scroll events: show the hint only once the page has come to rest,
    // then hide it as soon as the guest scrolls by themselves
    var yStart = window.scrollY;
    function arm(){ if (done) return; armed = true; y0 = window.scrollY; h.classList.add('show'); }
    function onMove(){
      if (armed){ if (Math.abs(window.scrollY - y0) > 60) hide(); return; }
      // the automatic scroll has begun: arm once it has been still for a moment
      if (Math.abs(window.scrollY - yStart) > 60){ clearTimeout(idle); idle = setTimeout(arm, 450); }
    }
    function onUser(){ hide(); }
    window.addEventListener('scroll', onMove, {passive: true});
    window.addEventListener('wheel', onUser, {passive: true});
    window.addEventListener('touchmove', onUser, {passive: true});
    // the automatic scroll can start late (the first frames after opening are heavy): wait for it, but not forever
    idle = setTimeout(arm, 6000);
    t = setTimeout(hide, 14000);
  }

  /* ---------- toast ---------- */
  var toast = $('#toast'), toastTimer = null;
  function showToast(msg, withLink){
    $('#toastMsg').textContent = msg;
    $('#toastLink').hidden = !withLink;
    toast.hidden = false;
    requestAnimationFrame(function(){ toast.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5200);
  }
  function hideToast(){ toast.classList.remove('show'); }
  $('#toastX').addEventListener('click', hideToast);
  $('#toastLink').addEventListener('click', hideToast);

  /* ---------- petals ---------- */
  function burstPetals(n){
    if (reduce) return;
    n = Math.min(n, 8);
    for (var i = 0; i < n; i++){
      var p = document.createElement('span');
      p.className = 'petal';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.animationDuration = (5 + Math.random() * 4) + 's';
      p.style.animationDelay = (-Math.random() * 2) + 's';
      document.body.appendChild(p);
      setTimeout(function(el){ return function(){ el.remove(); }; }(p), 9500);
    }
  }

  /* ---------- countdown to akad ---------- */
  var target = new Date(CONFIG.akad.at).getTime();
  var pad2 = function(n){ return n < 10 ? '0' + n : String(n); };
  var cdGrid = $('#cdGrid');
  var cards = {};
  [['d','Hari'],['h','Jam'],['m','Menit'],['s','Detik']].forEach(function(u){
    var wrap = document.createElement('div');
    wrap.className = 'fc ' + ({d:'teal',h:'mustard',m:'sage',s:'rose'})[u[0]];
    wrap.innerHTML = '<div class="fc-card"><div class="h top"><span></span></div><div class="h bot"><span></span></div>' +
      '<div class="h fl-top"><span></span></div><div class="h fl-bot"><span></span></div></div><div class="lbl">' + u[1] + '</div>';
    cdGrid.appendChild(wrap);
    var el = wrap.firstChild;
    cards[u[0]] = { el: el, top: $('.top span', el), bot: $('.bot span', el), flt: $('.fl-top span', el), flb: $('.fl-bot span', el), cur: null, t: 0 };
  });
  function setCd(c, v){
    if (c.cur === v) return;
    if (c.cur === null || reduce){
      c.top.textContent = c.bot.textContent = c.flt.textContent = c.flb.textContent = v;
      c.cur = v; return;
    }
    c.top.textContent = v;
    c.flt.textContent = c.cur;
    c.flb.textContent = v;
    c.el.classList.remove('flipping'); void c.el.offsetWidth; c.el.classList.add('flipping');
    c.cur = v;
    clearTimeout(c.t);
    c.t = setTimeout(function(){ c.bot.textContent = c.cur; c.el.classList.remove('flipping'); }, 600);
  }
  function tick(){
    var d = target - Date.now();
    if (d <= 0){
      setCd(cards.d, '00'); setCd(cards.h, '00'); setCd(cards.m, '00'); setCd(cards.s, '00');
      return;
    }
    var s = Math.floor(d / 1000);
    var days = Math.floor(s / 86400);
    cards.d.el.parentNode.classList.toggle('three', days >= 100);   // 3 digits need a smaller font
    setCd(cards.d, pad2(days));
    setCd(cards.h, pad2(Math.floor(s % 86400 / 3600)));
    setCd(cards.m, pad2(Math.floor(s % 3600 / 60)));
    setCd(cards.s, pad2(s % 60));
  }
  tick(); setInterval(tick, 1000);

  // "Simpan di kalender": download an .ics for the akad
  $('#cdSave').addEventListener('click', function(){
    var st = new Date(target), en = new Date(target + 3 * 3600 * 1000);
    var f = function(x){ return x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Undangan//ID', 'BEGIN:VEVENT',
      'UID:' + target + '@undangan', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en),
      'SUMMARY:Pernikahan ' + CONFIG.bride + ' & ' + CONFIG.groom,
      'LOCATION:' + CONFIG.akad.place.replace(/\n/g, ', '),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'pernikahan-nida-lukman.ics';
    document.body.appendChild(a); a.click(); a.remove();
    showToast('Tanggal pernikahan disimpan');
  });

  /* ---------- scroll: progress bar only (nothing else may touch the document while scrolling) ---------- */
  var bar = $('#bar');
  var ticking = false;

  function frame(){
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0) + ')';
  }
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onScroll);

  frame();

  /* ---------- reveal on scroll (anime.js) ---------- */
  var rvEls = $$('.rv');
  var ttlEls = $$('.ttl.split');
  function reveal(el){
      if (el.classList.contains('in')) return;
      el.classList.add('in');
      if (reduce || !hasAnime) return;

      if (el.classList.contains('ttl')){
        anime({ targets: el.querySelectorAll('.ch'), opacity: [0,1], translateY: [18,0], delay: anime.stagger(50), duration: 700, easing: 'easeOutCubic' });
      } else if (el.classList.contains('person')){
        anime({ targets: el, opacity: [0,1], translateX: el.classList.contains('n') ? [-30,0] : [30,0], duration: 900, easing: 'easeOutCubic' });
      } else if (el.classList.contains('hero')){
        // arch "opens" from the bottom; clip-path removed afterwards so the shadow isn't cut
        anime({ targets: el, opacity: [0,1], scale: [0.94,1], clipPath: ['inset(100% 0% 0% 0%)','inset(0% 0% 0% 0%)'], duration: 1100, easing: 'easeOutCubic',
          complete: function(){ el.style.clipPath = 'none'; } });
      } else if (el.classList.contains('dt')){
        anime({ targets: el, opacity: [0,1], translateY: [16,0], duration: 800, easing: 'easeOutQuad' });
        var dn = $('#dayNum'), cnt = { v: 1 };
        dn.textContent = '01';
        anime({ targets: cnt, v: 29, round: 1, duration: 1400, delay: 300, easing: 'easeOutCubic',
          update: function(){ dn.textContent = pad2(cnt.v); } });
      } else if (el.classList.contains('gtabs') || el.classList.contains('gpanel') || el.classList.contains('rcard') || el.classList.contains('live') || el.classList.contains('icon') || el.classList.contains('date') || el.classList.contains('to') || el.classList.contains('guest')){
        anime({ targets: el, opacity: [0,1], translateY: [16,0], duration: 800, easing: 'easeOutQuad' });
      } else {
        anime({ targets: el, opacity: [0,1], translateY: [22,0], duration: 900, easing: 'easeOutCubic' });
      }
  }
  /* a board "arrives": its titles and blocks play their reveal once */
  function revealBoard(id){
    var b = document.getElementById('bd-' + id) || document.getElementById(id);
    if (!b) return;
    var list = [].slice.call(b.querySelectorAll('.rv, .ttl.split'));
    list.forEach(function(el, i){ setTimeout(function(){ reveal(el); }, reduce ? 0 : i * 90); });
  }

  /* the floating icons are a CSS animation (.icon.float / .gicon.float in legacy.css), paused while their board is away */

  /* ---------- PHOTO / VENUE CARD ----------
     Not a modal popup: a light card that slides up at the bottom. The page behind it keeps scrolling (no backdrop, no focus trap);
     the card goes away by itself when the guest scrolls on, and can be swiped left/right to browse the photos. */
  var dlg = $('#pcard'), body = $('#pcardBody'), lastFocus = null, openY = 0, hideTimer = null;

  function closeCloseBtn(){ return '<button class="x" type="button" aria-label="Tutup" data-close>×</button>'; }

  function render(type, data){
    data = data || {};
    if (type === 'photo' || type === 'story'){
      var src = data.img, cap = data.cap, text = data.text;
      var list = type === 'story' ? CONFIG.story : CONFIG.gallery, nav = '';
      if (typeof data.i === 'number' && list.length > 1){
        nav = '<div class="actions nav"><button class="ibtn" type="button" data-nav="-1" data-kind="' + type + '" data-i="' + data.i + '" aria-label="Sebelumnya"><svg class="ic" aria-hidden="true"><use href="#i-left"/></svg></button>' +
          '<span class="navn">' + (data.i + 1) + ' / ' + list.length + '</span>' +
          '<button class="ibtn" type="button" data-nav="1" data-kind="' + type + '" data-i="' + data.i + '" aria-label="Berikutnya"><svg class="ic" aria-hidden="true"><use href="#i-right"/></svg></button></div>';
      }
      // the small 512 px copy shows at once; the full picture replaces it when decoded (see openSheet)
      var thumb = /\.webp$/.test(src) ? src.replace(/\.webp$/, '.s.webp') : src;
      return closeCloseBtn() + '<img class="big loading" src="' + escapeHtml(thumb) + '" data-full="' + escapeHtml(src) + '" decoding="async" alt="' + escapeHtml(cap) + '">' +
        '<h3>' + escapeHtml(cap) + '</h3>' + (text ? '<p>' + escapeHtml(text) + '</p>' : '') + nav;
    }
    if (type === 'venue'){
      var v = data.venue === 'resepsi' ? CONFIG.resepsi : CONFIG.akad;
      var title = data.venue === 'resepsi' ? 'Resepsi' : 'Akad';
      return closeCloseBtn() + '<h3>' + title + '</h3>' +
        '<img class="big map" src="' + escapeHtml(CONFIG.map) + '" alt="Peta lokasi ' + escapeHtml(title) + '">' +
        '<p>' + v.place.split('\n').map(escapeHtml).join('<br>') + '</p>' +
        '<div class="actions"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(v.q) + '">Buka di Google Maps</a></div>';
    }
    return '';
  }

  /* the popup shows the small copy first; swap in the full picture once it is downloaded and decoded (no jump, no blank wait) */
  function upgradeSheetImage(){
    var im = body.querySelector('img.big[data-full]');
    if (!im) return;
    var full = im.getAttribute('data-full');
    if (im.getAttribute('src') === full){ im.classList.remove('loading'); return; }
    var pre = new Image(); pre.decoding = 'async';
    pre.onload = function(){
      var done = function(){ if (im.isConnected && im.getAttribute('data-full') === full){ im.src = full; im.classList.remove('loading'); } };
      if (pre.decode) pre.decode().then(done, done); else done();
    };
    pre.onerror = function(){ im.classList.remove('loading'); };
    pre.src = full;
  }

  function cardOpen(){ return dlg.classList.contains('show'); }
  function openSheet(type, data){
    clearTimeout(hideTimer);
    if (!cardOpen()) lastFocus = document.activeElement;
    body.innerHTML = render(type, data);
    upgradeSheetImage();
    dlg.hidden = false;
    doc.classList.add('card-open');
    openY = window.scrollY;
    requestAnimationFrame(function(){ dlg.classList.add('show'); });
    dlg.setAttribute('aria-label', (data && data.cap) || (type === 'venue' ? 'Lokasi acara' : 'Foto'));
  }
  function openPhoto(kind, i){
    var list = kind === 'story' ? CONFIG.story : CONFIG.gallery, it = list[i];
    if (it) openSheet(kind === 'story' ? 'story' : 'photo', { img: it.img, pos: it.pos, cap: it.cap, text: it.text, fit: it.fit, i: i });
  }
  function closeSheet(){
    if (!cardOpen()) return;
    dlg.classList.remove('show');
    doc.classList.remove('card-open');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){ if (!cardOpen()){ dlg.hidden = true; body.innerHTML = ''; } }, 380);
    if (lastFocus && lastFocus.focus && document.activeElement && dlg.contains(document.activeElement)) lastFocus.focus();
  }
  function stepPhoto(kind, from, dir){
    var lst = kind === 'story' ? CONFIG.story : CONFIG.gallery;
    var ni = (from + dir + lst.length) % lst.length, it = lst[ni];
    body.innerHTML = render(kind, { img: it.img, pos: it.pos, cap: it.cap, text: it.text, fit: it.fit, i: ni });
    dlg.setAttribute('aria-label', it.cap);
    upgradeSheetImage();
  }

  // delegated clicks
  document.addEventListener('click', function(e){
    var nv = e.target.closest('[data-nav]');
    if (nv){ stepPhoto(nv.dataset.kind, +nv.dataset.i, +nv.dataset.nav); return; }
    var t = e.target.closest('[data-sheet], [data-copy], [data-close]');
    if (!t) return;
    if (t.hasAttribute('data-close')){ closeSheet(); return; }
    if (t.hasAttribute('data-copy')){
      copyText(t.dataset.copy);
      if (hasAnime && !reduce) anime({ targets: t, scale: [1, 0.88, 1], duration: 320, easing: 'easeOutQuad' });
      return;
    }
    var kind = t.dataset.sheet;
    if (kind === 'story'){
      var s = CONFIG.story[+t.dataset.i];
      if (t.classList.contains('jr-node') && !reduce && hasAnime){
        anime({ targets: t.querySelector('.jr-face'), scale: [1, 0.86, 1], duration: 380, easing: 'easeOutQuad' });
      }
      openSheet('story', { img: s.img, pos: s.pos, cap: s.cap, text: s.text, fit: s.fit, i: +t.dataset.i });
    } else if (kind === 'photo'){
      openPhoto('photo', +t.dataset.i);
    } else if (kind === 'venue'){
      openSheet('venue', { venue: t.dataset.venue });
    } else {
      openSheet(kind);
    }
  });

  // the card follows the page: it leaves when the guest scrolls on (more than ~40% of a screen), or with Esc
  window.addEventListener('scroll', function(){
    if (cardOpen() && Math.abs(window.scrollY - openY) > window.innerHeight * 0.4) closeSheet();
  }, {passive: true});
  document.addEventListener('keydown', function(e){
    if (!cardOpen()) return;
    if (e.key === 'Escape') closeSheet();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
      var b = body.querySelector('[data-nav="' + (e.key === 'ArrowLeft' ? '-1' : '1') + '"]'); if (b) b.click();
    }
  });
  // swipe left / right on the card = previous / next photo
  (function(){
    var sx = null, sy = 0;
    dlg.addEventListener('pointerdown', function(e){ sx = e.clientX; sy = e.clientY; }, {passive: true});
    dlg.addEventListener('pointerup', function(e){
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      var b = body.querySelector('[data-nav="' + (dx > 0 ? '-1' : '1') + '"]'); if (b) b.click();
    }, {passive: true});
    dlg.addEventListener('pointercancel', function(){ sx = null; }, {passive: true});
  })();

  /* ---------- copy helper (toast tells the truth about the result) ---------- */
  function copyText(txt){
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try{ ok = document.execCommand('copy'); }catch(err){}
      ta.remove();
      showToast(ok ? 'Tersalin' : 'Tidak bisa menyalin, salin manual ya');
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ showToast('Tersalin'); }, fallback);
    } else fallback();
  }

  /* =========================================================
     WEDDING GIFT: icon tabs, flip card (money), parcel label (goods)
     ========================================================= */
  (function(){
    var G = CONFIG.gift;
    if (G.bank.logo){
      var lg = document.createElement('img'); lg.className = 'bc-logo-img'; lg.src = G.bank.logo; lg.alt = G.bank.name; lg.decoding = 'async';
      $('#bankName').textContent = ''; $('#bankName').appendChild(lg);
    } else $('#bankName').textContent = G.bank.name;
    $('#bankNo').textContent = G.bank.no;
    $('#bankAn').textContent = G.bank.an;
    $('#bankCopy').dataset.copy = G.bank.no.replace(/\s/g, '');
    $('#ewName').textContent = G.ewallet.name;
    $('#ewNo').textContent = G.ewallet.no;
    $('#ewAn').textContent = G.ewallet.an;
    $('#ewCopy').dataset.copy = G.ewallet.no.replace(/\s/g, '');
    $('#gName').textContent = G.address.name;
    $('#gPhone').textContent = G.address.phone;
    $('#gAddr').innerHTML = G.address.lines.map(escapeHtml).join('<br>');
    $('#addrCopy').dataset.copy = [G.address.name, G.address.phone, G.address.lines.join(', ')].join('\n');
    $('#addrMap').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(G.address.q);

    var tabs = $$('.gtab'), pans = [$('#panMoney'), $('#panGift')], tabBar = $('#gTabs'), box = $('#pkgBox');
    function playLid(){ box.classList.remove('open'); void box.offsetWidth; box.classList.add('open'); }
    function selectTab(i, focus){
      tabs.forEach(function(t, k){ t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      tabBar.dataset.i = i;
      pans.forEach(function(p, k){ p.hidden = k !== i; });
      if (hasAnime && !reduce) anime({ targets: pans[i], opacity: [0,1], translateX: [i ? 28 : -28, 0], duration: 520, easing: 'easeOutCubic' });
      if (i === 1) playLid();
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function(t, k){
      t.addEventListener('click', function(){ selectTab(k); });
      t.addEventListener('keydown', function(e){
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); selectTab(k ? 0 : 1, true); }
      });
    });

    var bcard = $('#bcard'), front = $('#bcFront'), back = $('#bcBack');
    back.inert = true;
    function flipCard(){
      var f = !bcard.classList.contains('flip');
      bcard.classList.toggle('flip', f);
      front.inert = f; back.inert = !f;
    }
    bcard.addEventListener('click', function(e){ if (!e.target.closest('button')) flipCard(); });
    $('#bFlip').addEventListener('click', flipCard);
  })();

  /* =========================================================
     RSVP: name, two icon buttons, guest stepper, paper plane
     ========================================================= */
  (function(){
    var rform = $('#rsvpForm'), rcard = $('#rcard'), rok = $('#rok'), gst = $('#gst'), gnum = $('#gNum');
    var RSVP_KEY = 'wplan_rsvp';
    var guests = 2;
    if (guest && guest.trim()) $('#nm').value = guest.trim().slice(0, 60);

    var maxG = 5;
    function setGuests(n){
      guests = Math.max(1, Math.min(maxG, n));
      gnum.textContent = guests;
      if (hasAnime && !reduce) anime({ targets: gnum, scale: [1.4, 1], duration: 380, easing: 'easeOutBack' });
    }
    $('#gMinus').addEventListener('click', function(){ setGuests(guests - 1); });
    $('#gPlus').addEventListener('click', function(){ setGuests(guests + 1); });
    $$('input[name=att]', rform).forEach(function(r){
      r.addEventListener('change', function(){ gst.classList.toggle('off', rform.att.value === 'tidak'); });
    });

    function showDone(name, att, n, silent){
      rform.hidden = true; rok.hidden = false;
      $('#rokMsg').textContent = att === 'hadir'
        ? 'Terima kasih, ' + name + '. Sampai jumpa di hari bahagia kami' + (n > 1 ? ' (' + n + ' tamu).' : '.')
        : 'Terima kasih sudah memberi kabar, ' + name + '. Doa terbaik dari kami.';
      // the pop / check-mark / text entrance are CSS animations on .rok (see legacy.css): nothing to run here
    }
    function showForm(){
      rok.hidden = true; rform.hidden = false;
      if (hasAnime) anime.set('#sendIc', { translateX: 0, translateY: 0, opacity: 1 });
    }
    $('#rUndo').addEventListener('click', showForm);
    // the invitation link is personal: fill the name, cap the guest count, show an earlier answer
    document.addEventListener('guest-ready', function(){
      $('#nm').value = guestInfo.name;
      maxG = Math.max(1, guestInfo.max_guests || 5);
      setGuests(Math.min(guests, maxG));
      if (guestInfo.attending !== null && guestInfo.attending !== undefined){
        showDone(guestInfo.name, guestInfo.attending ? 'hadir' : 'tidak', guestInfo.guests, true);
      }
    });

    rform.addEventListener('submit', function(e){
      e.preventDefault();
      var name = $('#nm').value.trim();
      if (!name){
        showToast('Isi nama dulu ya');
        $('#nm').focus();
        if (hasAnime && !reduce) anime({ targets: '.nmf', translateX: [0,-8,8,-5,5,0], duration: 420, easing: 'easeOutQuad' });
        return;
      }
      if (rform.hp && rform.hp.value) return;   // honeypot: bots fill hidden fields
      var att = rform.att.value, n = att === 'hadir' ? guests : 0;
      function finish(){ showDone(name, att, n); burstPetals(8); }
      function fly(){
        if (hasAnime && !reduce){
          anime({ targets: '#sendIc', translateX: 70, translateY: -70, opacity: 0, duration: 520, easing: 'easeInCubic', complete: finish });
        } else finish();
      }
      if (canSave){
        var btn = rform.querySelector('.sendb'); btn.disabled = true;
        api.submitRsvp(guestCode, att === 'hadir', n).then(function(r){ if (r){ name = r.name || name; n = r.guests; } fly(); },
          function(err){ showToast(err.message); }).then(function(){ btn.disabled = false; });
        return;
      }
      try{
        var list = JSON.parse(localStorage.getItem(RSVP_KEY) || '[]');
        list.push({ name: name, att: att, guests: n, at: Date.now() });
        localStorage.setItem(RSVP_KEY, JSON.stringify(list));
      }catch(err){}
      fly();
    });

    // already answered in this browser: show the finished state (only for links that are not personal)
    if (!canSave) try{
      var prev = JSON.parse(localStorage.getItem(RSVP_KEY) || '[]').pop();
      if (prev && prev.name) showDone(prev.name, prev.att, prev.guests, true);
    }catch(err){}
  })();

  /* =========================================================
     UCAPAN & DOA: TikTok-style live comments (dummy + your own)
     ========================================================= */
  (function(){
    var DUMMY = [
      ['Aisyah Putri', 'Barakallahu lakuma, semoga sakinah mawaddah warahmah ya Nida & Lukman 🤍'],
      ['Pak Budi Santoso', 'Selamat menempuh hidup baru! Semoga langgeng sampai kakek nenek.'],
      ['Dinda Maharani', 'Akhirnya sah juga!! Bahagia banget lihat kalian berdua 😭🤍'],
      ['Rizky Pratama', 'Selamat bro Lukman! Semoga jadi imam yang baik. Aamiin.'],
      ['Keluarga Hartono', 'Doa terbaik kami untuk kalian. Semoga rumah tangganya penuh berkah.'],
      ['Salsabila', 'Nida cantik banget, nggak sabar datang ke acaranya!'],
      ['Bu Ratna', 'Selamat ya, Nak. Semoga selalu rukun dan saling menyayangi.'],
      ['Fajar Nugroho', 'Congrats Lukman & Nida! Semoga lancar sampai hari H 🎉'],
      ['Tim Kantor Nida', 'Selamat ya Nida! Kami tunggu traktirannya 😄 Bahagia selalu.'],
      ['Anisa Rahma', 'Semoga segera dikaruniai keturunan yang sholeh dan sholehah.'],
      ['Dimas & Rani', 'Happy wedding! Kalian couple goals banget 🥹'],
      ['Kak Yuli', 'Semoga cinta kalian makin kuat setiap harinya. Barakallah!'],
      ['Teman SMA 2015', 'Dari satu bangku sekolah sampai pelaminan. Selamat ya, kalian luar biasa!'],
      ['Ustadz Hasan', 'Semoga Allah mempersatukan kalian dalam kebaikan dunia dan akhirat. Aamiin.']
    ];
    var COLORS = ['#e39aa9', '#5b9bb5', '#d9a24a', '#c9707f', '#6f7f62', '#3f7f9a', '#b98424', '#b88a7a'];
    var WISH_KEY = 'wplan_wishes';
    var feed = $('#feed'), live = $('#live'), wCount = $('#wCount');
    // messages stack from the bottom of a fixed window; only this wrapper and the new bubble are ever animated
    var feedIn = document.createElement('div'); feedIn.className = 'feed-in'; feed.appendChild(feedIn);
    var total = 128, MAXMSG = 6, wIdx = 0, wTimer = null, wView = false;
    var real = canSave, lastId = 0, pollTimer = null;

    function colorFor(name){
      var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      return COLORS[h % COLORS.length];
    }
    function makeMsg(name, text, me, likes){
      var d = document.createElement('div'); d.className = 'msg' + (me ? ' me' : '');
      var av = document.createElement('span'); av.className = 'av'; av.style.setProperty('--c', colorFor(name)); av.textContent = name.charAt(0).toUpperCase();
      var mb = document.createElement('div'); mb.className = 'mb';
      var b = document.createElement('b'); b.textContent = me ? name + ' (kamu)' : name;
      var p = document.createElement('p'); p.textContent = text;
      mb.appendChild(b); mb.appendChild(p);
      var lk = document.createElement('button'); lk.type = 'button'; lk.className = 'lk'; lk.setAttribute('aria-label', 'Suka'); lk.setAttribute('aria-pressed', 'false'); lk.dataset.n = likes;
      lk.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span>' + likes + '</span>';
      d.appendChild(av); d.appendChild(mb); d.appendChild(lk);
      return d;
    }
    function addMsg(name, text, me, seed){
      var el = makeMsg(name, text, me, me ? 0 : Math.floor(Math.random() * 25));
      feedIn.appendChild(el);
      while (feedIn.children.length > MAXMSG) feedIn.removeChild(feedIn.firstChild);   // the oldest sits above the visible window
      if (!seed){ total++; wCount.textContent = total; }
      if (!seed && !reduce && feedIn.animate){
        // FLIP: the list jumped up by one bubble; slide it back down to 0 and fade the new bubble in. One layout read, no per-frame layout.
        var shift = el.offsetHeight + 10;
        feedIn.animate([{ transform: 'translateY(' + shift + 'px)' }, { transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.22,.8,.3,1)' });
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      }
    }
    function pollReal(){
      clearTimeout(pollTimer);
      if (!real || !wView || document.hidden) return;
      api.listWishes(MAXMSG).then(function(rows){
        (rows || []).slice().reverse().forEach(function(w){ if (w.id > lastId){ lastId = w.id; addMsg(w.name, w.message, w.name === (guestInfo && guestInfo.name), !lastSeeded); } });
        lastSeeded = true;
      }).catch(function(){}).then(function(){ pollTimer = setTimeout(pollReal, 20000); });
      api.wishCount().then(function(n){ if (typeof n === 'number'){ total = n; wCount.textContent = n; } }).catch(function(){});
    }
    var lastSeeded = false;
    function nextDummy(){ var m = DUMMY[wIdx % DUMMY.length]; wIdx++; addMsg(m[0], m[1], false); }
    function wSchedule(){
      clearTimeout(wTimer);
      if (real){ if (wView) pollReal(); return; }
      if (reduce || !wView || document.hidden) return;
      // calmer pace, and never while the guest is typing a wish
      wTimer = setTimeout(function(){ if (!doc.classList.contains('typing')) nextDummy(); wSchedule(); }, 4200 + Math.random() * 2200);
    }

    // initial feed: dummy first, then this browser's own recent wishes
    if (real){ total = 0; wCount.textContent = '0'; }
    else {
      var seedN = reduce ? 6 : 4;
      for (; wIdx < seedN; wIdx++) addMsg(DUMMY[wIdx][0], DUMMY[wIdx][1], false, true);
      try{
        JSON.parse(localStorage.getItem(WISH_KEY) || '[]').slice(-2).forEach(function(w){ if (w && w.name && w.msg) addMsg(w.name, w.msg, true, true); });
      }catch(err){}
    }

    // the 3D layer tells us when the wishes board is in front of the camera
    window.__wishActive = function(on){ wView = on; wSchedule(); };
    document.addEventListener('visibilitychange', wSchedule);

    function heartsFrom(btn){
      if (reduce || !hasAnime) return;
      var r = btn.getBoundingClientRect(), hr = live.getBoundingClientRect();
      for (var i = 0; i < 2; i++){
        var h = document.createElement('span'); h.className = 'hb';
        h.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg>';
        h.style.left = (r.left - hr.left + r.width / 2 - 8) + 'px';
        h.style.top = (r.top - hr.top + r.height / 2 - 8) + 'px';
        live.appendChild(h);
        if (!h.animate){ h.remove(); continue; }
        var dx = (Math.random() - 0.5) * 44, dy = -(40 + Math.random() * 40);
        h.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.15)', opacity: 0 }],
          { duration: 900 + i * 140, easing: 'ease-out' }).onfinish = (function(el){ return function(){ el.remove(); }; })(h);
      }
    }
    feedIn.addEventListener('click', function(e){
      var lk = e.target.closest('.lk'); if (!lk) return;
      var on = !lk.classList.contains('on');
      lk.classList.toggle('on', on); lk.setAttribute('aria-pressed', on ? 'true' : 'false');
      var n = (+lk.dataset.n) + (on ? 1 : -1); lk.dataset.n = n; lk.lastChild.textContent = n;
      if (on){
        heartsFrom(lk);
        if (hasAnime && !reduce) anime({ targets: lk.firstChild, scale: [1, 1.5, 1], duration: 420, easing: 'easeOutBack' });
      }
    });

    $('#wishForm').addEventListener('submit', function(e){
      e.preventDefault();
      var input = $('#wMsg'), msg = input.value.trim();
      if (!msg) return;
      if (real){
        var sb = $('#wishForm').querySelector('button'); sb.disabled = true;
        api.submitWish(guestCode, msg).then(function(w){
          if (w && w.id > lastId){ lastId = w.id; addMsg(w.name, w.message, true); }
          input.value = ''; burstPetals(8);
        }, function(err){ showToast(err.message); }).then(function(){ sb.disabled = false; });
        return;
      }
      var name = ($('#nm').value.trim() || (guest && guest.trim()) || 'Tamu').slice(0, 40);
      addMsg(name, msg, true);
      try{
        var arr = JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); arr.push({ name: name, msg: msg, at: Date.now() });
        localStorage.setItem(WISH_KEY, JSON.stringify(arr.slice(-30)));
      }catch(err){}
      input.value = '';
      burstPetals(8);
      wSchedule();
    });
  })();

  /* ---------- RSVP reminder toast, once, when the event board is seen ---------- */
  var reminded = false;
  function remindRsvp(){
    if (reminded) return;
    reminded = true;
    setTimeout(function(){ showToast('Jangan lupa konfirmasi kehadiran Anda', true); }, 600);
  }

  /* ---------- hooks used by the 3D layer (main.js, scene/) ---------- */
  window.__legacy = {
    CONFIG: CONFIG,
    openSheet: openSheet,
    openPhoto: openPhoto,
    showToast: showToast,
    reveal: revealBoard,
    /* the camera arrived at a stop (id) that has these boards */
    activate: function(id){
      revealBoard(id);
      if (id === 'event') remindRsvp();
    },
    wishes: function(on){ if (window.__wishActive) window.__wishActive(on); }
  };
})();

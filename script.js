gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ignoreMobileResize: true});
gsap.ticker.lagSmoothing(500, 33);
const desktop = matchMedia('(min-width: 769px)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Heavy effects (blur, tilt) only on capable, non-touch desktops
const strong = desktop && (navigator.hardwareConcurrency || 4) > 4 && !matchMedia('(pointer: coarse)').matches;

// Loader
const counter = {v: 0}, pct = document.getElementById('pct');
gsap.to(counter, {v: 100, duration: 1.6, ease: 'power2.inOut',
  onUpdate: () => pct.textContent = Math.round(counter.v),
  onComplete: () => {
    gsap.to('#loader', {yPercent: -100, duration: .9, ease: 'power4.inOut', onComplete: () => document.getElementById('loader').style.display = 'none'});
    startHero();
  }});

// Scroll progress + decaying scroll velocity (shared by tilt and embers)
let vel = 0;
gsap.to('#progress', {scaleX: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: .3}});
ScrollTrigger.create({start: 0, end: 'max', onUpdate: s => vel = s.getVelocity()});
gsap.ticker.add(() => {vel *= .9; if (Math.abs(vel) < 1) vel = 0;});

// Stat bars
const style = document.createElement('style');
style.textContent = '.stats i::after{width:var(--fill,0%)!important;transition:width 1.2s cubic-bezier(.2,.8,.2,1)}';
document.head.appendChild(style);
const fill = card => card.querySelectorAll('.stats i').forEach(b => b.style.setProperty('--fill', b.dataset.v + '%'));
const cards = gsap.utils.toArray('.card');
cards.forEach(c => c.addEventListener('mouseenter', () => fill(c)));

// Horizontal track + per-card effects
let hTween = null;
gsap.matchMedia().add('(min-width: 769px)', () => {
  const track = document.querySelector('.h-track');
  hTween = gsap.to(track, {x: () => -(track.scrollWidth - innerWidth), ease: 'none',
    scrollTrigger: {trigger: '.h-wrap', start: 'top top', end: () => '+=' + track.scrollWidth, pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => pillUpdate(self.progress), onToggle: s => pill.classList.toggle('show', s.isActive)}});

  if (!reduce) cards.forEach(card => {
    const off = strong ? {scale: .9, opacity: .4, filter: 'blur(4px)'} : {scale: .9, opacity: .5};
    const on = strong ? {scale: 1.05, opacity: 1, filter: 'blur(0px)', ease: 'none'} : {scale: 1.05, opacity: 1, ease: 'none'};
    gsap.timeline({scrollTrigger: {trigger: card, containerAnimation: hTween, start: 'left 95%', end: 'right 5%', scrub: true}})
      .fromTo(card, off, on).to(card, {...off, ease: 'none'});
  });

  if (strong) {
    const skew = gsap.quickTo(cards, 'skewX', {duration: .5, ease: 'power3.out'});
    const tilt = gsap.quickTo(cards, 'rotationY', {duration: .5, ease: 'power3.out'});
    let idle = true;
    gsap.ticker.add(() => {
      if (!vel && idle) return;
      const v = gsap.utils.clamp(-1, 1, vel / 2500);
      skew(v * -8); tilt(v * 12); idle = !vel;
    });
  }
});

// SVG energy tracing
cards.forEach(card => {
  const paths = card.querySelectorAll('.trace *');
  const st = {trigger: card, start: desktop ? 'left 75%' : 'top 80%', toggleActions: 'play none none reverse'};
  if (desktop) st.containerAnimation = hTween;
  gsap.to(paths, {strokeDashoffset: 0, duration: 1.6, stagger: .25, ease: 'power2.inOut', scrollTrigger: st, onStart: () => fill(card)});
});

// Reveals
gsap.utils.toArray('.reveal, .feature h2').forEach(el =>
  gsap.from(el, {y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: {trigger: el, start: 'top 85%', once: true}}));

// Embers: pre-rendered glow sprites (no per-frame shadowBlur), capped DPR, fewer on mobile
const cv = document.getElementById('embers'), ctx = cv.getContext('2d');
if (reduce) cv.remove(); else {
  const resize = () => {cv.width = innerWidth; cv.height = innerHeight;};
  resize(); addEventListener('resize', resize);
  const sprite = (r, g) => {
    const d = r * 10, s = document.createElement('canvas'); s.width = s.height = d;
    const c = s.getContext('2d'), gr = c.createRadialGradient(d/2, d/2, 0, d/2, d/2, d/2);
    gr.addColorStop(0, `rgba(255,${g},60,1)`); gr.addColorStop(.3, `rgba(255,${g},60,.7)`); gr.addColorStop(1, 'rgba(255,60,30,0)');
    c.fillStyle = gr; c.fillRect(0, 0, d, d); return s;
  };
  const k = desktop ? 1 : .4;
  const layers = [{n: 36*k, s: .3, r: 1, a: .45, g: 120}, {n: 22*k, s: .8, r: 1.8, a: .6, g: 140}, {n: 10*k, s: 1.6, r: 2.8, a: .8, g: 160}]
    .map(L => ({...L, sp: sprite(L.r, L.g)}));
  const parts = layers.flatMap(L => Array.from({length: Math.round(L.n)}, () =>
    ({x: Math.random() * innerWidth, y: Math.random() * innerHeight, L, d: Math.random() * 6.28})));
  (function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    const boost = Math.min(Math.abs(vel) / 400, 12);
    for (const p of parts) {
      p.y -= p.L.s * (1 + boost); p.d += .02; p.x += Math.sin(p.d) * .4 * p.L.s;
      if (p.y < -10) {p.y = cv.height + 10; p.x = Math.random() * cv.width;}
      ctx.globalAlpha = p.L.a; const h = p.L.sp.width / 2;
      ctx.drawImage(p.L.sp, p.x - h, p.y - h);
    }
    requestAnimationFrame(loop);
  })();
}

// Back to top
const btn = document.getElementById('toTop');
let shown = false;
addEventListener('scroll', () => {const s = scrollY > 600; if (s !== shown) {shown = s; btn.classList.toggle('show', s);}}, {passive: true});
btn.addEventListener('click', () => scrollTo({top: 0, behavior: 'smooth'}));

// ---------- Progress pill (active character, counter, fill) ----------
const pill = document.getElementById('pill'), pillName = document.getElementById('pillName'),
      pillCount = document.getElementById('pillCount'), pillFill = document.getElementById('pillFill');
let act = -1;
function setActive(i) {
  if (i === act) return; act = i;
  pillName.textContent = cards[i].querySelector('h3').textContent;
  pillCount.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
  pill.style.borderColor = cards[i].style.getPropertyValue('--glow');
  fill(cards[i]);
}
function pillUpdate(p) {
  pillFill.style.transform = 'scaleX(' + p + ')';
  const mid = innerWidth / 2; let best = 0, bd = 1e9;
  cards.forEach((c, i) => {const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) {bd = d; best = i;}});
  setActive(best);
}
gsap.matchMedia().add('(max-width: 768px)', () => {
  ScrollTrigger.create({trigger: '#characters', start: 'top 70%', end: 'bottom 30%',
    onToggle: s => pill.classList.toggle('show', s.isActive),
    onUpdate: s => {pillFill.style.transform = 'scaleX(' + s.progress + ')';}});
  cards.forEach((c, i) => ScrollTrigger.create({trigger: c, start: 'top 55%', end: 'bottom 55%', onToggle: s => s.isActive && setActive(i)}));
});

// ---------- Hero: video picked by the screen's shape (portrait file / landscape file) ----------
const HERO = {
  desktop: 'video/hero-desktop.mp4', mobile: 'video/hero-mobile.mp4',
  posterDesktop: 'video/poster-desktop.jpg', posterMobile: 'video/poster-mobile.jpg'
};
const heroEl = document.querySelector('.hero'), vid = document.getElementById('heroVideo'), vbtn = document.getElementById('vidToggle');
let userPaused = false, heroVisible = true, blobs = {};
function asUrl(src) { // data: URIs are converted to Blob URLs so every desktop browser can loop/seek them
  if (!src.startsWith('data:')) return src;
  if (blobs[src]) return blobs[src];
  const [meta, b64] = src.split(','), bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return blobs[src] = URL.createObjectURL(new Blob([arr], {type: meta.slice(5, meta.indexOf(';'))}));
}
function tryPlay() {if (!userPaused && heroVisible && !document.hidden) vid.play().catch(() => {});}
function loadVideo() {
  const portrait = innerWidth < 768 || innerHeight > innerWidth, src = portrait ? HERO.mobile : HERO.desktop;
  if (vid.dataset.src === src) return;
  vid.dataset.src = src;
  vid.poster = asUrl(portrait ? HERO.posterMobile : HERO.posterDesktop);
  vid.muted = true; vid.src = asUrl(src); vid.load(); tryPlay();
}
loadVideo();
let rt; addEventListener('resize', () => {clearTimeout(rt); rt = setTimeout(loadVideo, 200);});
vid.addEventListener('canplay', tryPlay);
['click', 'touchstart', 'keydown', 'scroll'].forEach(e => addEventListener(e, tryPlay, {once: true, passive: true}));
new IntersectionObserver(([e]) => {heroVisible = e.isIntersecting; e.isIntersecting ? tryPlay() : vid.pause();}).observe(heroEl);
document.addEventListener('visibilitychange', () => document.hidden ? vid.pause() : tryPlay());
vbtn.addEventListener('click', () => {
  userPaused = !userPaused;
  userPaused ? vid.pause() : tryPlay();
  vbtn.textContent = userPaused ? '▶' : '❚❚';
  vbtn.setAttribute('aria-label', userPaused ? 'Play background video' : 'Pause background video');
});
function startHero() {
  gsap.from('.hero-text > *', {y: 60, opacity: 0, stagger: .15, duration: 1, delay: .3, ease: 'power3.out'});
}

addEventListener('load', () => ScrollTrigger.refresh());

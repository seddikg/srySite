/* ============ CONFIG ============ */
const WEBHOOK_URL = "https://discord.com/api/webhooks/1569719128934322196/7V0cNCQq9UYV9zFHXEHGdnVwV-oqdKEmjqzldkPfiCi9Av2MhP1BqykDEMqrBBKfz0gz"; // throwaway webhook
const START = new Date("2026-08-31T20:08:00+01:00");    // 31 Aug 20:08 GMT+1 (absolute moment)
const SONG_VOLUME = 0.85, ACT3_VOLUME = 0.35;

/* ============ HELPERS ============ */
const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slides = [...document.querySelectorAll("body > .slide")];
const song = $("#song");
let idx = 0, busy = false, locked = false, skipping = false;
const waiters = new Set();

/* wait that can be cut short by a tap (skips the typing / reveal) */
function wait(ms) {
  return new Promise(res => {
    if (skipping) return res();
    const done = () => { clearTimeout(t); waiters.delete(done); res(); };
    const t = setTimeout(done, ms);
    waiters.add(done);
  });
}
function skip() { skipping = true; [...waiters].forEach(f => f()); }

/* ============ TYPEWRITER ============ */
async function typeInto(el) {
  const text = el.dataset.full;
  el.textContent = ""; el.classList.add("show", "typing");
  for (const ch of text) {
    if (skipping) break;
    el.textContent += ch;
    await wait(/[.,!?]/.test(ch) ? 230 : ch === " " ? 28 : 38);
  }
  el.textContent = text; el.classList.remove("typing");
}

/* ============ SLIDE ENGINE ============ */
async function runSlide(s) {
  busy = true; skipping = false; updateUI();
  s.classList.add("active");
  if (s.id === "end") hearts();
  for (const el of s.querySelectorAll(":scope > p, :scope > h1")) {
    if (el.classList.contains("type")) { await typeInto(el); await wait(500); }
    else { el.classList.add("show"); await wait(el.tagName === "H1" ? 1000 : 700); }
  }
  s.classList.add("done");
  busy = false; skipping = false; updateUI();
}

async function advance(force) {
  if (locked) return;
  if (busy) { skip(); return; }
  const cur = slides[idx];
  if (!force && cur.hasAttribute("data-input")) return;
  if (idx >= slides.length - 1) return;
  locked = true; updateUI();
  if (cur.hasAttribute("data-submit")) submitAll();
  cur.classList.remove("active");
  const then = cur.dataset.then;
  if (then === "act2") await act2();
  else if (then === "act3") await act3();
  else await sleep(350);
  idx++; locked = false;
  runSlide(slides[idx]);
}

function updateUI() {
  const s = slides[idx];
  const input = s.hasAttribute("data-input");
  $("#hint").classList.toggle("on", !busy && !locked && !input && idx < slides.length - 1);
  $("#next").classList.toggle("on", !busy && !locked && !!s.querySelector("textarea"));
}

document.addEventListener("click", e => {
  if (e.target.closest("button, textarea")) return;
  advance();
});
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA") return;
  if (["Enter", " ", "ArrowRight"].includes(e.key)) { e.preventDefault(); advance(); }
});
$("#next").addEventListener("click", () => advance(true));

/* ============ IMPACT FRAMES ============ */
async function impact(frames) {
  const o = $("#impact"), w = $(".word", o), b = $(".burst", o);
  o.style.display = "flex";
  for (const f of frames) {
    o.style.background = f.bg; o.style.setProperty("--fg", f.fg);
    w.textContent = f.t; w.style.color = f.fg;
    const dx = (Math.random() - .5) * 26, dy = (Math.random() - .5) * 26;
    w.style.transform = `translate(${dx}px, ${dy}px) rotate(${f.r || 0}deg) scale(${f.s || 1})`;
    b.style.opacity = f.t ? (f.burst === 0 ? 0 : .9) : 0;
    b.style.transform = `rotate(${Math.random() * 20}deg)`;
    await sleep(f.ms);
  }
  o.style.display = "none";
}

const FRAMES_ACT2 = [
  { t: "YOU", bg: "#fff", fg: "#000", ms: 120 },
  { t: "YOU", bg: "#000", fg: "#fff", ms: 90, s: 1.15, r: -3 },
  { t: "YOU", bg: "#f7879a", fg: "#fff", ms: 90, s: 1.3, r: 3 },
  { t: "ONLY", bg: "#fff", fg: "#000", ms: 140, s: 1.1, r: -6 },
  { t: "YOU", bg: "#000", fg: "#ffd37a", ms: 100, s: 1.5 },
  { t: "YOU!", bg: "#ffd37a", fg: "#000", ms: 280, s: 2 },
  { t: "", bg: "#fff", fg: "#fff", ms: 70 },
  { t: "", bg: "#000", fg: "#000", ms: 250 }
];
const FRAMES_ACT3 = [
  { t: "BUT", bg: "#fff", fg: "#000", ms: 130 },
  { t: "BUT", bg: "#000", fg: "#fff", ms: 100, s: 1.2, r: 2 },
  { t: "THERE'S", bg: "#f7879a", fg: "#fff", ms: 150, s: 1.1, r: -4 },
  { t: "MORE", bg: "#000", fg: "#f7879a", ms: 220, s: 1.8 },
  { t: "...", bg: "#000", fg: "#fff", ms: 600, burst: 0 },
  { t: "", bg: "#000", fg: "#000", ms: 500 }
];

function setAct(n) { document.body.className = "act" + n; actNow = n; }
let actNow = 1;

async function act2() {
  const p = impact(FRAMES_ACT2);
  setAct(2);
  await p;
  await disk();
}
async function act3() {
  const p = impact(FRAMES_ACT3);
  setAct(3);
  fade(ACT3_VOLUME, 2500);
  await p;
}

/* ============ RECORD PLAYER ============ */
function fade(to, ms = 1500) {
  const from = song.volume, t0 = performance.now();
  (function f() {
    const k = Math.min(1, (performance.now() - t0) / ms);
    song.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(f);
  })();
}
async function disk() {
  const p = $("#player");
  p.className = "on"; void p.offsetWidth;
  p.classList.add("drop");
  await sleep(1100);
  p.classList.add("spin");
  await sleep(600);
  p.classList.add("play");
  song.volume = SONG_VOLUME;
  song.play().catch(() => console.warn("song.mp3 missing or blocked"));
  await sleep(4200);
  p.classList.add("out");
  await sleep(850);
  p.className = "";
}

/* ============ COUNTER ============ */
function tick() {
  let s = Math.max(0, Math.floor((Date.now() - START.getTime()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  $("#cd").textContent = d; $("#ch").textContent = h; $("#cm").textContent = m; $("#cs").textContent = s;
}
setInterval(tick, 1000); tick();

/* ============ WEBHOOK ============ */
const answers = { forgive: "(no answer)" };
async function send(payload) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE")) { console.log("[webhook not set]", payload); return; }
  try {
    await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) { console.warn("webhook failed", e); }
}
const clip = t => (t.trim() || "(left blank)").slice(0, 1000);
function submitAll() {
  send({
    username: "My Love Site",
    embeds: [{
      title: "She finished the page",
      color: 0xf7879a,
      fields: [
        { name: "Forgives you?", value: answers.forgive },
        { name: "Did this make you feel differently? How so?", value: clip($("#a1").value) },
        { name: "Anything you do that she doesn't like / need to work on?", value: clip($("#a2").value) },
        { name: "What she likes about you", value: clip($("#a3").value) }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}
document.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => {
  if (locked || busy) return;
  answers.forgive = b.dataset.v.toUpperCase();
  send({ username: "My Love Site", content: "Forgiveness answer: **" + answers.forgive + "**" });
  advance(true);
}));

/* ============ FINAL HEARTS ============ */
function hearts() {
  for (let i = 0; i < 28; i++) {
    const h = document.createElement("span");
    h.className = "heart"; h.textContent = "♥";
    h.style.left = Math.random() * 100 + "vw";
    h.style.fontSize = 14 + Math.random() * 30 + "px";
    h.style.animationDuration = 5 + Math.random() * 6 + "s";
    h.style.animationDelay = Math.random() * 5 + "s";
    document.body.appendChild(h);
  }
}

/* ============ SKY + LYRA ============ */
const cv = $("#sky"), cx = cv.getContext("2d");
let W, H, stars = [];
const LYRA = [[.30, .08], [.40, .27], [.28, .30], [.30, .62], [.55, .50], [.62, .80]]; // Vega, Epsilon, Zeta, Delta, Beta, Gamma
const EDGES = [[0, 1], [0, 2], [1, 2], [2, 4], [4, 5], [5, 3], [3, 2]];
const T0 = performance.now() + 1200, DRAW_MS = 7000;
function resize() {
  const d = window.devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
  stars = Array.from({ length: Math.round(W * H / 7000) }, () => ({
    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5
  }));
}
addEventListener("resize", resize);
const pt = ([nx, ny]) => { const S = Math.min(W, H) * .95; return [W / 2 + (nx - .45) * S, H / 2 + (ny - .44) * S]; };
const LOOK = {
  1: { star: "255,245,225", line: "255,223,150", a: .9 },
  2: { star: "255,255,255", line: "255,255,255", a: .6 },
  3: { star: "255,225,235", line: "247,135,154", a: .35 }
};
function frame(now) {
  cx.clearRect(0, 0, W, H);
  const L = LOOK[actNow];
  for (const s of stars) {
    const a = (.35 + .65 * Math.abs(Math.sin(now / 1000 * s.s + s.p))) * (actNow === 2 ? .55 : 1);
    cx.fillStyle = `rgba(${L.star},${a})`;
    cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
  }
  const prog = Math.max(0, Math.min(1, (now - T0) / DRAW_MS)) * EDGES.length;
  const seen = new Set([0]);
  cx.lineWidth = 1.6; cx.strokeStyle = `rgba(${L.line},${L.a * .8})`;
  EDGES.forEach(([i, j], n) => {
    const f = Math.max(0, Math.min(1, prog - n));
    if (f <= 0) return;
    seen.add(i); if (f > .98) seen.add(j);
    const [x1, y1] = pt(LYRA[i]), [x2, y2] = pt(LYRA[j]);
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f); cx.stroke();
  });
  seen.forEach(i => {
    const [x, y] = pt(LYRA[i]);
    const r = (i === 0 ? 6 : 4) + Math.sin(now / 500 + i) * .8;
    const g = cx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(${L.line},${L.a})`); g.addColorStop(1, `rgba(${L.line},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 4, 0, 6.283); cx.fill();
    cx.fillStyle = `rgba(255,255,255,${L.a})`; cx.beginPath(); cx.arc(x, y, r * .6, 0, 6.283); cx.fill();
  });
  requestAnimationFrame(frame);
}

/* ============ INIT ============ */
document.querySelectorAll(".type").forEach(p => { p.dataset.full = p.textContent; p.textContent = ""; });
document.querySelectorAll("[data-repeat]").forEach(p => {
  p.textContent = p.dataset.repeat.repeat(+p.dataset.count || 800);
  p.classList.add("show");
});
resize();
requestAnimationFrame(frame);
runSlide(slides[0]);

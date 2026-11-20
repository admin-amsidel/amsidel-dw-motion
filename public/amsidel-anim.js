/*!
 * Amsidel product-proof animations: shared player.
 * One transparent strip at the bottom of the screen. Scene files (amsidel-termite.js,
 * amsidel-monsoon.js, amsidel-noise.js, ...) register with it and play one at a time, in turn,
 * with a pause between them, until the visitor closes it (x) for the session.
 * No dependencies.
 *
 * Load this file and the scene files with defer, in this order, before the closing body tag.
 * Optional settings: an inline script BEFORE them sets
 *     window.AMSIDEL_ANIM = {
 *       interval: 15000,   // pause after a scene ends before the next one starts (ms)
 *       firstDelay: 3000,  // wait after page load (ms)
 *       bottom: 16,        // distance from the bottom of the screen (px)
 *       align: "center",   // "center" | "left" | "right"
 *       edge: 10,          // distance from the left/right edge when align is "left"/"right" (px)
 *       width: "75vw",     // any CSS width
 *       height: 100,       // strip height (px); everything scales with it
 *       card: false,       // true = dark glass card with light text; false = transparent, dark text with a white halo
 *       zIndex: 2147483000,
 *       order: ["termite", "monsoon", "noise"] // rotation order (default: the order the files load)
 *     };
 *
 * Controls: window.AmsidelAnim.play("monsoon") / .next() / .stop()
 */
(function () {
  "use strict";
  if (window.AmsidelAnim) return;

  var CFG = Object.assign(
    { interval: 15000, firstDelay: 3000, bottom: 16, align: "center", edge: 10, width: "75vw", height: 100, card: false, zIndex: 2147483000, order: null },
    window.AMSIDEL_ANIM || window.AMSIDEL_TERMITE || {}
  );
  var CLOSED_KEY = "amsidel-anim-closed";
  var VH = 110, GROUND = 90;     // every scene: 110 units tall, ground at 90, x = 0 is the middle of the strip
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- colours: dark card, or transparent over the page ---------- */
  var T = CFG.card
    ? { ink: "#ffffff", wood: "#e9c9a0", bad: "#ff8a7a", muted: "rgba(255,255,255,.7)", halo: "rgba(0,0,0,.35)", haloW: 3,
        ground: "rgba(255,255,255,.18)", frame: "#cfd5dc", track: "rgba(255,255,255,.15)", room: "rgba(255,214,150,.07)",
        sparkA: "#ffffff", sparkB: "#ffe066", warm: "#f3c98b", clink: "#ffe066", ting: "#ffffff", wave: "#ffd84d",
        rain: "rgba(170,205,255,.75)", cloudA: "#5b6376", cloudB: "#6b7488", seal: "#7ee2a6",
        closeBg: "rgba(255,255,255,.14)", closeHover: "rgba(255,255,255,.28)" }
    : { ink: "#1e1e21", wood: "#8a5220", bad: "#c0392b", muted: "rgba(30,30,33,.7)", halo: "#ffffff", haloW: 3.5,
        ground: "rgba(30,30,33,.25)", frame: "#9aa3ad", track: "rgba(30,30,33,.15)", room: "rgba(255,190,110,.13)",
        sparkA: "#ff9f1a", sparkB: "#ffd23f", warm: "#8a5220", clink: "#d98e00", ting: "#1f6fd1", wave: "#e08a00",
        rain: "rgba(40,110,190,.55)", cloudA: "#7d8597", cloudB: "#949bac", seal: "#22a85a",
        closeBg: "rgba(30,30,33,.55)", closeHover: "rgba(30,30,33,.8)" };

  /* ---------- styles ---------- */
  var place = CFG.align === "left" ? "left:" + CFG.edge + "px;"
    : CFG.align === "right" ? "right:" + CFG.edge + "px;"
    : "left:50%;transform:translateX(-50%);";
  var R = "#amsa-root";
  var baseCss =
    R + "{position:fixed;" + place + "bottom:" + CFG.bottom + "px;width:" + CFG.width + ";height:" + CFG.height + "px;" +
    "z-index:" + CFG.zIndex + ";pointer-events:none;opacity:0;transition:opacity .5s ease;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}" +
    R + ".am-on{opacity:1}" +
    R + " .am-card{position:relative;height:100%;border-radius:14px;box-sizing:border-box}" +
    R + " .am-glass{padding:2px 4px;background:rgba(22,22,26,.8);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);" +
    "border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 30px rgba(0,0,0,.35)}" +
    R + " .am-stage{width:100%;height:100%}" +
    R + " svg{display:block;width:100%;height:100%;overflow:hidden}" +
    R + " .am-close{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;border:0;padding:0;" +
    "background:" + T.closeBg + ";color:#fff;font:15px/22px system-ui,sans-serif;cursor:pointer;pointer-events:auto}" +
    R + " .am-close:hover{background:" + T.closeHover + "}" +
    R + " .am-txt," + R + " .am-lbl," + R + " .am-small{paint-order:stroke;stroke:" + T.halo + ";stroke-width:" + T.haloW + "px;stroke-linejoin:round}" +
    R + " .am-txt," + R + " .am-lbl{text-anchor:middle}" +
    R + " .am-txt{font-weight:800}" +
    R + " .am-lbl{font-weight:800;font-size:13px;letter-spacing:.4px}" +
    R + " .am-small{font-weight:800;font-size:9px;letter-spacing:.4px;stroke-width:2.5px}" +
    R + " .am-fb{transform-box:fill-box}";

  /* ---------- state ---------- */
  var scenes = [], idx = 0, busy = false, stopped = false, started = false;
  var root = null, stage = null, current = null, timers = [];
  var left = -180;   // left edge of the strip in scene units (set by fit())

  /* ---------- helpers handed to scenes ---------- */
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function q(s) { return stage.querySelector(s); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    (parent || q(".am-fx")).appendChild(n);
    return n;
  }
  function anim(node, frames, opts) {
    var a = node.animate(frames, Object.assign({ fill: "forwards" }, opts));
    return a.finished.then(function () {
      var last = frames[frames.length - 1];
      for (var k in last) if (k !== "offset" && k !== "easing") node.style[k] = last[k];
      a.cancel();
    }).catch(function () {});
  }
  function fly(node, frames, opts) {   // one-off effect element: removed when done
    node.animate(frames, opts).finished.then(function () { node.remove(); }).catch(function () {});
  }
  function every(fn, ms) {
    var t = setInterval(function () { if (root) fn(); }, ms);
    timers.push(t);
    return t;
  }
  function later(fn, ms) {
    var t = setTimeout(function () { if (root) fn(); }, ms);
    timers.push(t);
    return t;
  }
  function clearTimers() { timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); timers = []; }
  function pop(text, x, y, color, size, hold) {
    var t = el("text", { x: 0, y: 0, "class": "am-txt", fill: color, "font-size": size || 16 });
    t.textContent = text;
    fly(t, [
      { transform: "translate(" + x + "px," + (y + 6) + "px) scale(.4)", opacity: 0 },
      { transform: "translate(" + x + "px," + y + "px) scale(1.15)", opacity: 1, offset: 0.15 },
      { transform: "translate(" + x + "px," + y + "px) scale(1)", opacity: 1, offset: 0.25 },
      { transform: "translate(" + x + "px," + (y - 4) + "px) scale(1)", opacity: 1, offset: 0.8 },
      { transform: "translate(" + x + "px," + (y - 7) + "px) scale(1)", opacity: 0 }
    ], { duration: hold || 1100, easing: "ease-out" });
  }
  function caption(text) {
    var c = q(".am-cap");
    return anim(c, [{ opacity: 0.85 }, { opacity: 0 }], { duration: 200 }).then(function () {
      c.textContent = text;
      return anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    });
  }
  function spark(x, y) {
    var g = el("g", {});
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2, r1 = 4, r2 = i % 2 ? 10 : 15;
      el("line", {
        x1: (Math.cos(a) * r1).toFixed(1), y1: (Math.sin(a) * r1).toFixed(1),
        x2: (Math.cos(a) * r2).toFixed(1), y2: (Math.sin(a) * r2).toFixed(1),
        stroke: i % 2 ? T.sparkA : T.sparkB, "stroke-width": 2, "stroke-linecap": "round"
      }, g);
    }
    fly(g, [
      { transform: "translate(" + x + "px," + y + "px) scale(.2)", opacity: 1 },
      { transform: "translate(" + x + "px," + y + "px) scale(1.3)", opacity: 0 }
    ], { duration: 480, easing: "ease-out" });
  }
  /* The end badge: pops in on the label row at x = cx, replacing the label `hide` (a selector). */
  function badge(text, fill, stroke, cx, hide) {
    var g = el("g", { opacity: 0 });
    el("rect", { x: -86, y: -11, width: 172, height: 22, rx: 11, fill: fill, stroke: stroke, "stroke-width": 1.2 }, g);
    var t = el("text", { "class": "am-txt", x: 0, y: 4.5, "font-size": 13, fill: "#fff", style: "stroke:none" }, g);
    t.textContent = text;
    if (hide) anim(q(hide), [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    return anim(g, [
      { transform: "translate(" + cx + "px,11px) scale(0)", opacity: 0 },
      { transform: "translate(" + cx + "px,11px) scale(1.15)", opacity: 1, offset: 0.6 },
      { transform: "translate(" + cx + "px,11px) scale(1)", opacity: 1 }
    ], { duration: 500, easing: "ease-out" });
  }

  var ctx = {
    T: T, GROUND: GROUND, VH: VH, card: !!CFG.card,
    get left() { return left; },   // strip's left edge in scene units: start entrances beyond it
    q: q, el: el, anim: anim, fly: fly, wait: wait, rnd: rnd, clamp: clamp,
    every: every, later: later, pop: pop, caption: caption, spark: spark, badge: badge
  };

  /* ---------- the strip ---------- */
  function mount() {
    if (root) return;
    var st = document.createElement("style");
    st.id = "amsa-style";
    st.textContent = baseCss + scenes.map(function (s) { return s.css || ""; }).join("");
    document.head.appendChild(st);
    root = document.createElement("div");
    root.id = "amsa-root";
    root.setAttribute("role", "img");
    root.innerHTML = '<div class="am-card' + (CFG.card ? " am-glass" : "") + '"><button class="am-close" aria-label="Hide animation" title="Hide">×</button><div class="am-stage"></div></div>';
    root.querySelector(".am-close").addEventListener("click", function () {
      try { sessionStorage.setItem(CLOSED_KEY, "1"); } catch (e) {}
      api.stop();
    });
    document.body.appendChild(root);
    stage = root.querySelector(".am-stage");
  }
  /* Match the viewBox to the strip's shape so nothing is squashed; place x just left of the story. */
  function fit() {
    if (!root || !current) return;
    var svg = stage.querySelector("svg");
    if (!svg) return;
    var r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var half = current.content || 170;
    var w = Math.max(half * 2, VH * r.width / r.height);
    left = -w / 2;
    svg.setAttribute("viewBox", left + " 0 " + w + " " + VH);
    var scale = Math.min(r.height / VH, r.width / w);
    root.querySelector(".am-close").style.left = Math.max(2, r.width / 2 - half * scale - 24) + "px";
  }
  window.addEventListener("resize", fit);

  async function play(scene) {
    if (busy || stopped || !scene) return;
    busy = true;
    try {
      mount();
      current = scene;
      root.setAttribute("aria-label", scene.label || "Amsidel animation");
      stage.innerHTML =
        '<svg viewBox="-180 0 360 ' + VH + '" xmlns="' + SVGNS + '" aria-hidden="true">' +
        scene.svg(T) +
        '<text class="am-txt am-cap" x="0" y="106" font-size="14" fill="' + T.ink + '" style="opacity:.85">' + (scene.caption || "") + "</text>" +
        '<g class="am-fx"></g></svg>';
      fit();
      await wait(30);
      root.classList.add("am-on");
      await wait(450);
      await scene.story(ctx);
      root.classList.remove("am-on");
      await wait(550);
    } catch (e) { /* never break the host site */ }
    clearTimers();
    if (stage) stage.innerHTML = "";   // ends any looping effects (rain, waves)
    busy = false;
  }

  async function loop() {
    await wait(CFG.firstDelay);
    while (!stopped) {
      if (!document.hidden && scenes.length) {
        await play(scenes[idx % scenes.length]);
        idx++;
      }
      await wait(CFG.interval);
    }
  }

  function register(scene) {
    if (!scene || !scene.name || scenes.some(function (s) { return s.name === scene.name; })) return;
    scenes.push(scene);
    if (CFG.order) {
      var rank = function (s) { var i = CFG.order.indexOf(s.name); return i < 0 ? 999 : i; };
      scenes.sort(function (a, b) { return rank(a) - rank(b); });
    }
    if (root) { var st = document.getElementById("amsa-style"); if (st) st.textContent += scene.css || ""; }
  }

  var api = {
    add: register,
    play: function (name) {
      stopped = false;
      var s = name ? scenes.filter(function (x) { return x.name === name; })[0] : scenes[idx % scenes.length];
      return play(s);
    },
    next: function () { idx++; return api.play(); },
    stop: function () {
      stopped = true;
      clearTimers();
      if (root) { root.remove(); root = null; stage = null; }
      var s = document.getElementById("amsa-style");
      if (s) s.remove();
    },
    scenes: function () { return scenes.map(function (s) { return s.name; }); }
  };
  window.AmsidelAnim = api;

  // scenes that loaded before this file queued themselves here; later ones call push() directly
  var queued = window.AmsidelAnimQueue || [];
  window.AmsidelAnimQueue = { push: register };
  queued.forEach(register);

  var closed = false;
  try { closed = sessionStorage.getItem(CLOSED_KEY) === "1"; } catch (e) {}
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || closed || !Element.prototype.animate) return;
  function start() { if (!started) { started = true; loop(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else setTimeout(start, 0);
})();

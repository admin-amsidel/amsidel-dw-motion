/*!
 * Amsidel scene: "Monsoon-Proof"
 * Storm clouds roll in, lightning, heavy rain. The wooden window soaks, swells, warps,
 * grows mould and leaks a puddle. The Amsidel uPVC/WPC window sheds every drop and
 * stays sealed. Badge: 100% WATERPROOF.
 * Needs amsidel-anim.js (the shared player); load it with defer after that file.
 */
(function () {
  "use strict";
  var R = "#amsa-root";
  var GROUND = 90;
  var WOOD = { x: -112, cx: -86 };   // wooden window: 52 x 58
  var WIN = { x: 50, cx: 76 };       // Amsidel window: 52 x 58

  var css =
    R + " #amm-wood," + R + " #amm-puddle," + R + " #amm-sun," + R + " #amm-mould circle," + R + " .amm-rays{transform-box:fill-box}" +
    R + " #amm-wood{transform-origin:50% 100%}" +
    R + " #amm-puddle," + R + " #amm-sun," + R + " #amm-mould circle{transform-origin:center}" +
    R + " .amm-rays{transform-origin:center;animation:amm-spin 9s linear infinite}" +
    "@keyframes amm-spin{to{transform:rotate(360deg)}}";

  function cloud(x, y, s, c) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')" fill="' + c + '">' +
      '<circle cx="0" cy="10" r="16"/><circle cx="20" cy="0" r="22"/><circle cx="46" cy="4" r="19"/><circle cx="66" cy="12" r="14"/>' +
      '<rect x="-14" y="10" width="92" height="16" rx="8"/></g>';
  }
  var PANES = "M-112 32h52v58h-52z M-107 37h19v22h-19z M-84 37h19v22h-19z M-107 63h19v22h-19z M-84 63h19v22h-19z";
  var MOULD = [[-110, 40, 3], [-109, 75, 3.5], [-63, 48, 3], [-86, 61, 2.5], [-100, 87, 2.5], [-72, 35, 2.5], [-62, 82, 3.5], [-95, 35, 2], [-110, 58, 2.5], [-78, 87, 2]];

  function svg(T) {
    return "<defs>" +
      '<linearGradient id="amm-woodgrad" x1="0" x2="1"><stop offset="0" stop-color="#c99458"/><stop offset=".5" stop-color="#b37a40"/><stop offset="1" stop-color="#94602f"/></linearGradient>' +
      '<linearGradient id="amm-glassgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9eefa"/><stop offset="1" stop-color="#86b9dc"/></linearGradient>' +
      '<linearGradient id="amm-oldglass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb3c0"/><stop offset="1" stop-color="#6f8796"/></linearGradient>' +
      "</defs>" +
      '<g id="amm-rain"></g>' +
      '<line x1="-176" y1="90.5" x2="176" y2="90.5" stroke="' + T.ground + '" stroke-width="1.2"/>' +
      '<ellipse id="amm-puddle" cx="' + WOOD.cx + '" cy="90.5" rx="38" ry="4" fill="#4f9fd8" opacity=".75" style="transform:scale(0)"/>' +
      /* wooden window */
      '<g id="amm-wood">' +
      '<path d="' + PANES + '" fill="url(#amm-woodgrad)" fill-rule="evenodd" stroke="#6e4220" stroke-width="1.6"/>' +
      '<g fill="url(#amm-oldglass)"><rect x="-107" y="37" width="19" height="22"/><rect x="-84" y="37" width="19" height="22"/><rect x="-107" y="63" width="19" height="22"/><rect x="-84" y="63" width="19" height="22"/></g>' +
      '<path d="M-110 35 C-109 55 -111 70 -110 88 M-62 35 C-63 55 -61 70 -62 88" stroke="#7a4b23" stroke-width="1" fill="none" opacity=".5"/>' +
      '<path id="amm-soak" d="' + PANES + '" fill="#2a1606" fill-rule="evenodd" opacity="0"/>' +
      '<g id="amm-mould">' + MOULD.map(function (m, i) {
        return '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + m[2] + '" fill="' + (i % 2 ? "#7f9c4c" : "#5d7a35") + '" opacity="0"/>';
      }).join("") + "</g>" +
      '<path id="amm-crack" d="M-77 66 L-73 72 L-76 77 L-71 84 M-73 72 L-68 74" stroke="#eef4f7" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-dasharray="40" stroke-dashoffset="40"/>' +
      "</g>" +
      /* amsidel window */
      '<rect x="50" y="32" width="52" height="58" rx="2" fill="#f5f6f8" stroke="' + T.frame + '" stroke-width="1.6"/>' +
      '<rect x="55" y="37" width="19" height="48" rx="1.5" fill="url(#amm-glassgrad)"/>' +
      '<rect x="78" y="37" width="19" height="48" rx="1.5" fill="url(#amm-glassgrad)"/>' +
      '<path d="M58 52 L68 42 M60 60 L71 49 M81 52 L91 42 M83 60 L94 49" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '<rect x="74.5" y="54" width="3" height="11" rx="1.5" fill="#9aa3ad"/>' +
      '<rect id="amm-seal" x="47" y="29" width="58" height="64" rx="4" fill="none" stroke="' + T.seal + '" stroke-width="2.5" opacity="0"/>' +
      /* sun (between the windows, after the storm) */
      '<g id="amm-sun" style="opacity:0"><g class="amm-rays" stroke="#f5b400" stroke-width="2" stroke-linecap="round">' +
      '<path d="M-6 31v-5M-6 61v5M-21 46h-5M9 46h5M-16.6 35.4l-3.5-3.5M4.6 56.6l3.5 3.5M4.6 35.4l3.5-3.5M-16.6 56.6l-3.5 3.5"/></g>' +
      '<circle cx="-6" cy="46" r="8" fill="#ffc93c"/></g>' +
      /* clouds (moved in from the left by the story), labels drawn over them */
      '<g id="amm-clouds" style="transform:translateX(-999px)">' +
      cloud(-166, 13, 0.45, T.cloudA) + cloud(-100, 11, 0.5, T.cloudB) + cloud(-30, 13, 0.45, T.cloudA) + cloud(40, 11, 0.5, T.cloudB) + cloud(112, 13, 0.45, T.cloudA) +
      "</g>" +
      '<path id="amm-bolt" d="M-2 22 L-9 40 L-2 40 L-8 60" stroke="#ffb800" stroke-width="2.5" fill="none" stroke-linejoin="round" opacity="0"/>' +
      '<text id="amm-woodlbl" class="am-lbl" x="' + WOOD.cx + '" y="15" fill="' + T.wood + '">ORDINARY WOOD</text>' +
      '<text id="amm-winlbl" class="am-lbl" x="' + WIN.cx + '" y="15" fill="' + T.ink + '">AMSIDEL uPVC · WPC</text>';
  }

  async function story(c) {
    var q = c.q, T = c.T, rnd = c.rnd;
    var rain = [];

    function flash() {
      c.anim(q("#amm-bolt"), [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 550 });
    }
    function startRain(n) {
      var g = q("#amm-rain");
      for (var i = 0; i < n; i++) {
        var x = rnd(-165, 185), len = rnd(6, 10);
        var d = c.el("line", { x1: 0, y1: 0, x2: -2, y2: len, stroke: T.rain, "stroke-width": 1.3, "stroke-linecap": "round" }, g);
        rain.push(d.animate([
          { transform: "translate(" + x + "px,22px)" },
          { transform: "translate(" + (x - 14) + "px," + (GROUND - len) + "px)" }
        ], { duration: rnd(380, 520), iterations: Infinity, delay: -rnd(0, 520), easing: "linear" }));
      }
    }
    function stopRain() {
      return c.anim(q("#amm-rain"), [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }).then(function () {
        rain.forEach(function (a) { a.cancel(); });
        rain = [];
      });
    }
    function glassDrop() {   // a drop sliding down the Amsidel glass
      var x = Math.random() < 0.5 ? rnd(57, 72) : rnd(80, 95);
      c.fly(c.el("ellipse", { rx: 1.3, ry: 1.9, fill: "rgba(255,255,255,.95)", stroke: "rgba(60,120,180,.5)", "stroke-width": 0.5 }), [
        { transform: "translate(" + x + "px,38px)", opacity: 0 },
        { transform: "translate(" + x + "px,44px)", opacity: 1, offset: 0.15 },
        { transform: "translate(" + (x + rnd(-1.5, 1.5)) + "px,82px)", opacity: 1, offset: 0.85 },
        { transform: "translate(" + x + "px,85px)", opacity: 0 }
      ], { duration: rnd(800, 1100), easing: "ease-in" });
    }
    function splash() {     // drops bouncing off the top of the Amsidel frame
      var x = rnd(52, 100), y = 32;
      for (var i = 0; i < 3; i++) {
        var dx = rnd(-7, 7);
        c.fly(c.el("circle", { r: 1.1, fill: T.rain }), [
          { transform: "translate(" + x + "px," + y + "px)", opacity: 1 },
          { transform: "translate(" + (x + dx) + "px," + (y - rnd(4, 8)) + "px)", opacity: 1, offset: 0.5 },
          { transform: "translate(" + (x + dx * 1.4) + "px," + (y + 2) + "px)", opacity: 0 }
        ], { duration: 400, easing: "ease-out" });
      }
    }
    function leak() {       // water running out under the wooden window
      var x = rnd(-108, -64);
      c.fly(c.el("ellipse", { rx: 1.3, ry: 2, fill: "#4f9fd8" }), [
        { transform: "translate(" + x + "px,85px)", opacity: 1 },
        { transform: "translate(" + x + "px,90px)", opacity: 0 }
      ], { duration: 360, easing: "ease-in" });
    }

    var clouds = q("#amm-clouds"), from = "translateX(" + (c.left * 2 - 40) + "px)";
    clouds.style.transform = from;

    // 1. Storm rolls in
    await c.anim(clouds, [{ transform: from }, { transform: "translateX(0)" }], { duration: 1300, easing: "ease-out" });

    // 2. Lightning + heavy rain
    flash();
    await c.wait(250);
    startRain(45);
    var t1 = c.every(splash, 180), t2 = c.every(glassDrop, 160);
    await c.wait(500);

    // 3. Wood soaks, swells, warps, leaks, grows mould
    c.caption("Wood soaks, swells & rots… 😩");
    c.anim(q("#amm-soak"), [{ opacity: 0 }, { opacity: 0.5 }], { duration: 2800, easing: "ease-in" });
    c.anim(q("#amm-wood"), [
      { transform: "none" },
      { transform: "scale(1.05,1.03) skewX(-3deg)", offset: 0.6 },
      { transform: "scale(1.07,1.04) skewX(-5deg) rotate(-1.5deg)" }
    ], { duration: 3200, easing: "ease-in-out" });
    await c.wait(700);
    var t3 = c.every(leak, 140);
    c.anim(q("#amm-puddle"), [{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 3000, easing: "ease-out" });
    Array.prototype.forEach.call(q("#amm-mould").querySelectorAll("circle"), function (m, i) {
      m.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 0.85, transform: "scale(1)" }],
        { duration: 600, delay: 300 + i * 160, fill: "forwards" });
    });
    await c.wait(900);
    flash();
    c.anim(q("#amm-crack"), [{ strokeDashoffset: "40" }, { strokeDashoffset: "0" }], { duration: 600, easing: "ease-out" });
    await c.wait(900);

    // 4. Amsidel stays sealed
    c.caption("…Amsidel stays sealed 💧✓");
    c.anim(q("#amm-seal"), [{ opacity: 0 }, { opacity: 0.9 }, { opacity: 0.2 }, { opacity: 0.9 }, { opacity: 0 }], { duration: 1400 });
    await c.wait(1700);

    // 5. Rain stops, sun comes out, badge
    [t1, t2, t3].forEach(clearInterval);
    stopRain();
    c.anim(clouds, [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(160px)", opacity: 0 }], { duration: 1200, easing: "ease-in" });
    await c.wait(500);
    c.anim(q("#amm-sun"), [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 700, easing: "ease-out" });
    var wl = q("#amm-woodlbl");
    wl.textContent = "WOOD ✗ WARPED";
    wl.setAttribute("fill", T.bad);
    c.badge("💧 100% WATERPROOF", "#2f86d6", "#9fd0ff", WIN.cx, "#amm-winlbl");
    c.caption("Heavy monsoon? Amsidel uPVC & WPC stays dry.");
    await c.wait(3000);
  }

  (window.AmsidelAnimQueue = window.AmsidelAnimQueue || []).push({
    name: "monsoon",
    content: 172,
    label: "Animation: heavy rain warps a wooden window, while the Amsidel uPVC or WPC window stays sealed and dry.",
    caption: "Monsoon is coming… 🌧️",
    css: css,
    svg: svg,
    story: story
  });
})();

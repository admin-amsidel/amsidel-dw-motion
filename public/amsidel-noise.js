/*!
 * Amsidel scene: "Noise-Blocking"
 * A truck honks outside. Through an ordinary single-pane window the sound waves pass straight
 * through and the baby wakes up crying. The window becomes an Amsidel uPVC double-glazed window,
 * the truck honks again, the waves bounce off the glass and the baby sleeps on. Badge: NOISE-BLOCKING.
 * Needs amsidel-anim.js (the shared player); load it with defer after that file.
 */
(function () {
  "use strict";
  var R = "#amsa-root";
  var GROUND = 90;
  var HORN_X = -98, HORN_Y = 60, WALL_X = -8;   // truck horn, outer face of the wall

  var css = R + " #amn-meter{transform-box:fill-box;transform-origin:left center}";

  function svg(T) {
    return '<rect x="12" y="24" width="164" height="66" fill="' + T.room + '"/>' +
      '<line x1="-186" y1="90.5" x2="186" y2="90.5" stroke="' + T.ground + '" stroke-width="1.2"/>' +
      /* noise meter (inside the room) */
      '<text class="am-small" x="40" y="35" fill="' + T.muted + '">NOISE INSIDE</text>' +
      '<rect x="124" y="30" width="36" height="6" rx="3" fill="' + T.track + '"/>' +
      '<rect id="amn-meter" x="124" y="30" width="36" height="6" rx="3" fill="#22a85a" style="transform:scaleX(.08)"/>' +
      /* crib + baby (original drawing, scaled into the room) */
      '<g id="amn-crib"><g transform="translate(-223 -4.6) scale(.55)">' +
      '<rect x="478" y="150" width="150" height="10" rx="3" fill="#c9a07a"/>' +
      '<rect x="486" y="142" width="134" height="9" rx="3" fill="#f4f1ea"/>' +
      '<rect x="478" y="112" width="8" height="60" rx="3" fill="#c9a07a"/><rect x="620" y="112" width="8" height="60" rx="3" fill="#c9a07a"/>' +
      '<rect x="478" y="112" width="150" height="6" rx="3" fill="#c9a07a"/>' +
      '<g stroke="#c9a07a" stroke-width="3"><path d="M600 118v24M586 118v24M572 118v24"/></g>' +
      '<circle cx="512" cy="132" r="11" fill="#f2c9a0"/>' +
      '<path d="M504 124 q8 -8 16 0" fill="#7a4a2a"/>' +
      '<rect x="520" y="126" width="74" height="17" rx="8" fill="#8ec5ff"/>' +
      '<g id="amn-sleep" stroke="#7a4a2a" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M505 133 q3 2 6 0"/><path d="M514 131 q3 2 6 0"/></g>' +
      '<g id="amn-awake" style="opacity:0"><circle cx="508" cy="132" r="2" fill="#3a2214"/><circle cx="517" cy="130" r="2" fill="#3a2214"/>' +
      '<ellipse cx="514" cy="138.5" rx="3" ry="3.5" fill="#a33a3a"/></g>' +
      "</g></g>" +
      /* truck (outside; moved in from the left by the story) */
      '<g id="amn-truck" style="transform:translateX(-999px)"><g transform="translate(-192 -4.6) scale(.55)">' +
      '<rect x="22" y="104" width="92" height="56" rx="4" fill="#e8833a"/>' +
      '<rect x="30" y="112" width="76" height="6" rx="3" fill="#f6a865"/>' +
      '<path d="M114 122 h30 l18 16 v22 h-48z" fill="#d9662b"/>' +
      '<path d="M120 127 h21 l12 11 h-33z" fill="#bfe3fa"/>' +
      '<rect x="158" y="148" width="8" height="6" rx="2" fill="#ffe066"/>' +
      '<circle cx="48" cy="162" r="10" fill="#22252b"/><circle cx="48" cy="162" r="4" fill="#9aa3ad"/>' +
      '<circle cx="138" cy="162" r="10" fill="#22252b"/><circle cx="138" cy="162" r="4" fill="#9aa3ad"/>' +
      "</g></g>" +
      /* wall with the window opening (cross-section) */
      '<rect x="-8" y="24" width="16" height="20" fill="#5a606d"/><rect x="-8" y="74" width="16" height="16" fill="#5a606d"/>' +
      '<g stroke="rgba(255,255,255,.2)" stroke-width=".8"><path d="M-8 31h16M-8 38h16M0 24v7M-4 31v7M4 38v6M-8 81h16M0 74v7M-4 81v9"/></g>' +
      '<g id="amn-old">' +
      '<rect x="-10" y="44" width="20" height="4" fill="#9a6634"/><rect x="-10" y="70" width="20" height="4" fill="#9a6634"/>' +
      '<rect x="-1" y="48" width="2" height="22" fill="#9fc6e0"/>' +
      "</g>" +
      '<g id="amn-new" style="opacity:0">' +
      '<rect x="-12" y="42" width="24" height="6" rx="1.5" fill="#f5f6f8" stroke="' + T.frame + '" stroke-width=".8"/>' +
      '<rect x="-12" y="70" width="24" height="6" rx="1.5" fill="#f5f6f8" stroke="' + T.frame + '" stroke-width=".8"/>' +
      '<rect x="-4" y="48" width="8" height="22" fill="#cfe6f5" opacity=".35"/>' +
      '<rect x="-6.5" y="48" width="2.5" height="22" fill="#9fd0f0"/><rect x="4" y="48" width="2.5" height="22" fill="#9fd0f0"/>' +
      "</g>" +
      '<text id="amn-lbl" class="am-lbl" x="0" y="15" fill="' + T.wood + '"><tspan id="amn-l1">ORDINARY WINDOW</tspan>' +
      '<tspan id="amn-l2" font-weight="600" fill="' + T.muted + '"> · single glass</tspan></text>';
  }

  async function story(c) {
    var q = c.q, T = c.T, rnd = c.rnd;
    var level = 0.08;

    function meter(to, color) {
      var m = q("#amn-meter"), from = level;
      level = to;
      m.setAttribute("fill", color);
      return c.anim(m, [{ transform: "scaleX(" + from + ")" }, { transform: "scaleX(" + to + ")" }], { duration: 500, easing: "ease-out" });
    }
    function ring(x, y) {
      c.fly(c.el("circle", { r: 4, fill: "none", stroke: "#7cc4ff", "stroke-width": 1.6 }), [
        { transform: "translate(" + x + "px," + y + "px) scale(.5)", opacity: 0.9 },
        { transform: "translate(" + x + "px," + y + "px) scale(2.4)", opacity: 0 }
      ], { duration: 420, easing: "ease-out" });
    }
    // One sound wave ")" from the horn. blocked = it bounces off the glass.
    function wave(blocked) {
      var w = c.el("path", { d: "M0 -10 Q6 0 0 10", stroke: T.wave, "stroke-width": 2.4, fill: "none", "stroke-linecap": "round" });
      var at = function (x, sx, sy) { return "translate(" + x + "px," + HORN_Y + "px) scale(" + sx + "," + sy + ")"; };
      c.fly(w, blocked ? [
        { transform: at(HORN_X, 0.5, 0.5), opacity: 1 },
        { transform: at(WALL_X - 3, 1.3, 1.3), opacity: 1, offset: 0.55 },
        { transform: at(WALL_X - 50, -1.3, 1.3), opacity: 0.6, offset: 0.8 },
        { transform: at(WALL_X - 100, -1.5, 1.5), opacity: 0 }
      ] : [
        { transform: at(HORN_X, 0.5, 0.5), opacity: 1 },
        { transform: at(WALL_X + 14, 1.3, 1.3), opacity: 1, offset: 0.4 },
        { transform: at(100, 1.8, 1.8), opacity: 0.85, offset: 0.8 },
        { transform: at(150, 2, 2), opacity: 0 }
      ], { duration: blocked ? 1300 : 1500, easing: "linear" });
      if (blocked) c.later(function () { ring(WALL_X - 2, HORN_Y); }, 700);
    }
    function honk(blocked) {
      c.pop("HONK! HONK! 📢", -132, 46, T.clink, 13, 1300);
      c.anim(q("#amn-truck"), [
        { transform: "translate(0,0)" }, { transform: "translate(-1.5px,-1.5px)" }, { transform: "translate(1.5px,1px)" },
        { transform: "translate(-1.5px,-1px)" }, { transform: "translate(1px,1px)" }, { transform: "translate(0,0)" }
      ], { duration: 500 });
      for (var i = 0; i < 6; i++) c.later(function () { wave(blocked); }, i * 170);
    }
    function zzz() {
      var z = c.el("text", { x: 0, y: 0, "class": "am-small", "font-size": 9, fill: "#1f6fd1" });
      z.textContent = "z";
      c.fly(z, [
        { transform: "translate(64px,62px) scale(.6)", opacity: 0 },
        { transform: "translate(70px,54px) scale(1)", opacity: 1, offset: 0.3 },
        { transform: "translate(80px,40px) scale(1.4)", opacity: 0 }
      ], { duration: 1500, easing: "ease-out" });
    }
    function tear() {
      var x = Math.random() < 0.5 ? 55.5 : 62;
      c.fly(c.el("ellipse", { rx: 1, ry: 1.5, fill: "#3f9be8" }), [
        { transform: "translate(" + x + "px,69px)", opacity: 1 },
        { transform: "translate(" + (x + (x < 59 ? -5 : 5)) + "px,76px)", opacity: 0 }
      ], { duration: 500, easing: "ease-in" });
    }

    var truck = q("#amn-truck"), away = "translateX(" + (c.left + 90) + "px)";
    truck.style.transform = away;
    var zTimer = c.every(zzz, 650);

    // 1. Truck pulls up outside an ordinary window
    await c.anim(truck, [{ transform: away }, { transform: "translateX(0)" }], { duration: c.clamp((-90 - c.left) / 0.3, 900, 1800), easing: "ease-out" });
    await c.wait(300);

    // 2. HONK — the noise goes straight through single glass
    honk(false);
    await c.wait(900);
    meter(0.95, "#e5484d");
    clearInterval(zTimer);
    q("#amn-sleep").style.opacity = 0;
    q("#amn-awake").style.opacity = 1;
    var shake = q("#amn-crib").animate([{ transform: "translateX(-1px)" }, { transform: "translateX(1px)" }],
      { duration: 90, iterations: Infinity, direction: "alternate" });
    var tTimer = c.every(tear, 180);
    c.pop("WAAH! 😭", 146, 62, T.bad, 14, 1500);
    c.caption("Noise gets in… baby wakes up 😭");
    await c.wait(1900);

    // 3. Upgrade to Amsidel double glazing
    c.caption("Now with Amsidel double glazing…");
    c.anim(q("#amn-old"), [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
    c.anim(q("#amn-new"), [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 500, easing: "ease-out" });
    ring(0, 59);
    q("#amn-l1").textContent = "AMSIDEL uPVC";
    q("#amn-l2").textContent = " · double glazing";
    q("#amn-lbl").setAttribute("fill", T.ink);
    clearInterval(tTimer);
    shake.cancel();
    q("#amn-awake").style.opacity = 0;
    q("#amn-sleep").style.opacity = 1;
    meter(0.08, "#22a85a");
    c.every(zzz, 650);
    await c.wait(1400);

    // 4. HONK again — the waves bounce off the glass, baby sleeps on
    honk(true);
    await c.wait(1300);
    c.caption("…honk blocked. Baby sleeps on 😴");
    meter(0.12, "#22a85a");
    await c.wait(900);

    // 5. Badge + final line, truck drives off
    c.badge("🔇 NOISE-BLOCKING", "#7a4fd6", "#c4a8ff", 0, "#amn-lbl");
    c.caption("Amsidel double glazing keeps the noise out.");
    c.anim(truck, [{ transform: "translateX(0)" }, { transform: away }], { duration: 1600, delay: 600, easing: "ease-in" });
    await c.wait(2800);
  }

  (window.AmsidelAnimQueue = window.AmsidelAnimQueue || []).push({
    name: "noise",
    content: 186,
    label: "Animation: a truck honks; through an ordinary window the baby wakes, but with Amsidel double glazing the noise bounces off and the baby keeps sleeping.",
    caption: "Shh… baby is sleeping 😴",
    css: css,
    svg: svg,
    story: story
  });
})();

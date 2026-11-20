/*!
 * Amsidel scene: "Termite-Proof"
 * A termite walks in, eats a wooden door, then tries to bite an Amsidel uPVC/WPC
 * window: CLINK! It gets dizzy and runs away. Badge: 100% TERMITE-PROOF.
 * Needs amsidel-anim.js (the shared player); load it with defer after that file.
 */
(function () {
  "use strict";
  var R = "#amsa-root";
  var GROUND = 90, S = 1, TIP = 61 * S;
  var DOOR = { x: -110, cx: -88 };   // wooden door: 44 x 64
  var WIN = { x: 50, cx: 76 };       // Amsidel window: 52 x 58

  var css =
    R + " .amt-flip," + R + " .amt-abd," + R + " .amt-mand," + R + " .amt-legA," + R + " .amt-legB," + R + " .amt-dizzy," + R + " .amt-ant," + R + " #amt-pile{transform-box:fill-box}" +
    R + " .amt-flip{transform-origin:center}" +
    R + " .amt-abd{transform-origin:right center}" +
    R + " .amt-mand{transform-origin:left center}" +
    R + " .amt-legA," + R + " .amt-legB{transform-origin:50% 0%}" +
    R + " .amt-ant{transform-origin:left bottom;animation:amt-ant 1.2s ease-in-out infinite alternate}" +
    R + " #amt-pile{transform-origin:center bottom}" +
    R + " .amt-dizzy{transform-origin:center;animation:amt-spin .7s linear infinite}" +
    R + " .amt-walk .amt-legA{animation:amt-leg .2s ease-in-out infinite alternate}" +
    R + " .amt-walk .amt-legB{animation:amt-leg .2s ease-in-out infinite alternate-reverse}" +
    R + " .amt-walk .amt-body{animation:amt-bob .2s ease-in-out infinite alternate}" +
    R + " .amt-run .amt-legA," + R + " .amt-run .amt-legB," + R + " .amt-run .amt-body{animation-duration:.09s}" +
    "@keyframes amt-leg{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}" +
    "@keyframes amt-bob{from{transform:translateY(0)}to{transform:translateY(-1.2px)}}" +
    "@keyframes amt-ant{from{transform:rotate(-6deg)}to{transform:rotate(8deg)}}" +
    "@keyframes amt-spin{to{transform:rotate(360deg)}}";

  function svg(T) {
    return "<defs>" +
      '<linearGradient id="amt-woodgrad" x1="0" x2="1"><stop offset="0" stop-color="#c99458"/><stop offset=".5" stop-color="#b37a40"/><stop offset="1" stop-color="#94602f"/></linearGradient>' +
      '<linearGradient id="amt-glassgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9eefa"/><stop offset="1" stop-color="#86b9dc"/></linearGradient>' +
      '<mask id="amt-wood-mask" maskUnits="userSpaceOnUse" x="-200" y="0" width="400" height="110"><rect x="-200" width="400" height="110" fill="#fff"/><g id="amt-bites"></g></mask>' +
      "</defs>" +
      '<line x1="-176" y1="90.5" x2="176" y2="90.5" stroke="' + T.ground + '" stroke-width="1.2"/>' +
      /* wood door */
      '<text id="amt-woodlbl" class="am-lbl" x="' + DOOR.cx + '" y="15" fill="' + T.wood + '">ORDINARY WOOD</text>' +
      '<g id="amt-wood" mask="url(#amt-wood-mask)">' +
      '<rect x="-110" y="26" width="44" height="64" rx="2" fill="url(#amt-woodgrad)" stroke="#6e4220" stroke-width="1.6"/>' +
      '<rect x="-105" y="31" width="34" height="26" rx="1.5" fill="none" stroke="#7a4b23" stroke-width="1.2" opacity=".6"/>' +
      '<rect x="-105" y="61" width="34" height="25" rx="1.5" fill="none" stroke="#7a4b23" stroke-width="1.2" opacity=".6"/>' +
      '<path d="M-100 33 C-97 41 -102 49 -99 55 M-88 33 C-91 41 -86 49 -89 55 M-76 33 C-73 41 -78 49 -75 55 M-100 63 C-97 71 -102 79 -99 84 M-88 63 C-91 71 -86 79 -89 84 M-76 63 C-73 71 -78 79 -75 84" stroke="#7a4b23" stroke-width="1" fill="none" opacity=".45"/>' +
      '<circle cx="-70" cy="59" r="2.2" fill="#e9c46a"/>' +
      "</g>" +
      '<ellipse id="amt-pile" cx="' + DOOR.cx + '" cy="' + GROUND + '" rx="26" ry="4" fill="#b98250" style="transform:scale(0)"/>' +
      /* amsidel uPVC / WPC window */
      '<text id="amt-winlbl" class="am-lbl" x="' + WIN.cx + '" y="15" fill="' + T.ink + '">AMSIDEL uPVC · WPC</text>' +
      '<rect x="50" y="32" width="52" height="58" rx="2" fill="#f5f6f8" stroke="' + T.frame + '" stroke-width="1.6"/>' +
      '<rect x="55" y="37" width="19" height="48" rx="1.5" fill="url(#amt-glassgrad)"/>' +
      '<rect x="78" y="37" width="19" height="48" rx="1.5" fill="url(#amt-glassgrad)"/>' +
      '<path d="M58 52 L68 42 M60 60 L71 49 M81 52 L91 42 M83 60 L94 49" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '<rect x="74.5" y="54" width="3" height="11" rx="1.5" fill="#9aa3ad"/>' +
      /* termite (placed off the left edge by the story) */
      '<g id="amt-t" style="transform:translate(-999px,' + GROUND + 'px)"><g class="amt-flip">' +
      '<g opacity=".5" stroke="#8a5a2b" stroke-width="2" stroke-linecap="round">' +
      '<path class="amt-legB" d="M21 -6 L16 0"/><path class="amt-legA" d="M33 -7 L34 0"/><path class="amt-legB" d="M40 -7 L50 0"/></g>' +
      '<g class="amt-body">' +
      '<g stroke="#8a5a2b" stroke-width="2" stroke-linecap="round">' +
      '<path class="amt-legA" d="M18 -6 L12 0"/><path class="amt-legB" d="M30 -7 L30 0"/><path class="amt-legA" d="M38 -7 L46 0"/></g>' +
      '<g class="amt-abd"><ellipse cx="15" cy="-13" rx="15" ry="9.5" fill="#f3e0bb" stroke="#c9a46a" stroke-width="1.2"/>' +
      '<path d="M9 -21.5 Q7 -13 9 -4.5 M15 -22.5 Q13 -13 15 -3.5 M21 -21.5 Q19 -13 21 -4.5" stroke="#dcc08e" stroke-width="1.2" fill="none"/></g>' +
      '<ellipse cx="33" cy="-13" rx="6.5" ry="6" fill="#ecd3a4" stroke="#c9a46a" stroke-width="1.2"/>' +
      '<g class="amt-ant" stroke="#a86a2c" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M47 -21 Q53 -33 61 -31"/><path d="M43 -21 Q45 -34 53 -37"/></g>' +
      '<ellipse cx="45" cy="-14" rx="9" ry="8" fill="#d08a3c" stroke="#9c5c22" stroke-width="1.2"/>' +
      '<circle cx="48" cy="-17" r="2.6" fill="#fff"/><circle cx="48.8" cy="-17" r="1.3" fill="#222"/>' +
      '<g class="amt-mand" stroke="#5a2e0e" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M53 -16 Q60 -17 61 -12"/><path d="M53 -10 Q60 -8 61 -13"/></g>' +
      '<g class="amt-dizzy" style="opacity:0" fill="#ffc400" stroke="#8a5a00" stroke-width=".6" font-size="10"><text x="34" y="-30">★</text><text x="46" y="-40">★</text><text x="56" y="-28">★</text></g>' +
      "</g></g></g>";
  }

  async function story(c) {
    var q = c.q, T = c.T, rnd = c.rnd, tx = 0;
    function tPos(x, y) { return "translate(" + x + "px," + (GROUND + (y || 0)) + "px) scale(" + S + ")"; }
    function walk(to, dur, easing) {
      var from = tx; tx = to;
      return c.anim(q("#amt-t"), [{ transform: tPos(from) }, { transform: tPos(to) }], { duration: dur, easing: easing || "linear" });
    }
    function hop(to, dur) {
      var from = tx; tx = to;
      return c.anim(q("#amt-t"), [
        { transform: tPos(from) }, { transform: tPos((from + to) / 2, -7), offset: 0.45 }, { transform: tPos(to) }
      ], { duration: dur, easing: "ease-out" });
    }
    function chomp() {
      return c.anim(q(".amt-mand"), [
        { transform: "scaleY(1)" }, { transform: "scaleY(2)" }, { transform: "scaleY(.4)" }, { transform: "scaleY(1)" }
      ], { duration: 320, easing: "ease-in-out" });
    }
    function dust(x, y, n, spread) {
      var cols = ["#c48d55", "#a8723f", "#e0b27c", "#8c5a2c"];
      for (var i = 0; i < n; i++) {
        var sx = x + rnd(-spread, spread), sy = y + rnd(-spread, spread), dx = rnd(-18, 18);
        c.fly(c.el("circle", { r: rnd(1, 2.2).toFixed(1), fill: cols[i % 4] }), [
          { transform: "translate(" + sx + "px," + sy + "px)", opacity: 1 },
          { transform: "translate(" + (sx + dx * 0.4) + "px," + (sy - rnd(3, 10)) + "px)", offset: 0.3 },
          { transform: "translate(" + (sx + dx) + "px," + (GROUND - 1) + "px)", opacity: 0.9, offset: 0.85 },
          { transform: "translate(" + (sx + dx) + "px," + (GROUND - 1) + "px)", opacity: 0 }
        ], { duration: rnd(700, 1100), easing: "ease-in" });
      }
    }
    function setWalking(on, run) {
      var t = q("#amt-t");
      t.classList.toggle("amt-walk", on);
      t.classList.toggle("amt-run", !!run);
    }

    var bites = q("#amt-bites");
    tx = c.left - 70;
    q("#amt-t").style.transform = tPos(tx);

    // 1. Termite walks in from the left edge of the strip to the wooden door
    setWalking(true);
    var to = DOOR.x + 2 - TIP;
    await walk(to, c.clamp((to - tx) / 0.14, 1200, 3000));
    setWalking(false);

    // 2. Eats the wood
    var pile = q("#amt-pile");
    for (var i = 0; i < 6; i++) {
      chomp();
      await c.wait(160);
      var tip = tx + TIP;
      for (var k = 0; k < 3; k++) {
        c.el("circle", { cx: (tip + rnd(0, 4)).toFixed(1), cy: rnd(30, 88).toFixed(1), r: rnd(7, 10).toFixed(1), fill: "#000" }, bites);
      }
      c.el("circle", { cx: (tip + 2).toFixed(1), cy: rnd(78, 88).toFixed(1), r: 9, fill: "#000" }, bites);
      dust(tip + 3, GROUND - 18, 6, 6);
      pile.style.transform = "scale(" + ((i + 1) / 8).toFixed(2) + ")";
      if (i === 0) c.pop("crunch!", DOOR.x - 34, 44, T.warm, 16, 900);
      if (i === 3) c.pop("munch munch 😋", DOOR.x - 34, 44, T.warm, 14, 1000);
      await c.wait(180);
      if (i < 5) { setWalking(true); await walk(tx + 7, 200); setWalking(false); }
    }
    // Wood crumbles
    dust(DOOR.cx, 58, 22, 20);
    c.anim(q(".amt-abd"), [{ transform: "scale(1)" }, { transform: "scale(1.22)" }], { duration: 500, easing: "ease-out" });
    pile.style.transform = "scale(1)";
    await c.anim(q("#amt-wood"), [
      { transform: "translateY(0)", opacity: 1 }, { transform: "translateY(8px)", opacity: 0 }
    ], { duration: 650, easing: "ease-in" });
    var wl = q("#amt-woodlbl");
    wl.textContent = "WOOD ✗ EATEN";
    wl.setAttribute("fill", T.bad);
    c.caption("Wood is termite food… 🪵");

    // 3. Walks to the Amsidel window
    await c.wait(300);
    setWalking(true);
    await walk(WIN.x - TIP, 1300);
    setWalking(false);
    await c.caption("…but what about Amsidel?");

    // 4. CLINK! — can't bite
    chomp(); await c.wait(150);
    c.spark(WIN.x + 2, GROUND - 14);
    c.pop("CLINK!", WIN.x - 22, 40, T.clink, 17, 900);
    await hop(WIN.x - 14 - TIP, 260);
    await c.wait(380);
    setWalking(true); await walk(WIN.x - TIP, 220); setWalking(false);
    chomp(); await c.wait(150);
    c.spark(WIN.x + 2, GROUND - 14);
    c.pop("TING!", WIN.x - 20, 40, T.ting, 17, 900);
    await hop(WIN.x - 30 - TIP, 320);

    // 5. Dizzy + badge
    q(".amt-dizzy").style.opacity = 1;
    c.badge("✓ 100% TERMITE-PROOF", "#22a85a", "#7ee2a6", WIN.cx, "#amt-winlbl");
    await c.wait(1100);
    q(".amt-dizzy").style.opacity = 0;
    c.pop("Nope! 😵", tx + 30, 46, T.ink, 15, 1000);
    await c.wait(350);

    // 6. Runs away, off the left edge of the strip
    q(".amt-flip").style.transform = "scaleX(-1)";
    setWalking(true, true);
    c.caption("Termites eat wood. Not Amsidel uPVC & WPC.");
    var out = c.left - 90;
    await walk(out, c.clamp((tx - out) / 0.35, 1200, 2200), "ease-in");
    setWalking(false);
    await c.wait(1900);
  }

  (window.AmsidelAnimQueue = window.AmsidelAnimQueue || []).push({
    name: "termite",
    content: 166,
    label: "Animation: a termite eats wood but cannot bite an Amsidel uPVC or WPC window.",
    caption: "Can a termite eat it? 🤔",
    css: css,
    svg: svg,
    story: story
  });
})();

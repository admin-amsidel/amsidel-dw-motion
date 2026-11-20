/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// Home landing: a short door-opening intro, a 3D hero arc with one lead unit per range, then one pinned module
// per range where scrolling swings the door open (or slides the window), turns it round to show the inside and
// opens it again. Everything 3D is drawn into one fixed canvas by Stage; the DOM supplies the boxes to fill.
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { INK, SHOWCASE_VIEWS, ShowcaseView } from '../../../data/showcase';
import { bezier, clamp, easeInOut, easeOut, InteriorLabel, lerp, restState, Stage, Unit, UnitState } from './stage';

const N = SHOWCASE_VIEWS.length;
/** Half the width of a door in the centre slot, in u (430u tall at about 2:1). Wider units push neighbours out. */
const DOOR_HALF = 108;
const INTRO_KEY = 'amsidel-intro-seen';
const AUTOPLAY_MS = 3600;
const slideEase = bezier(0.25, 0.75, 0.2, 1);
const enterEase = bezier(0.16, 1, 0.3, 1);

/** Hero arc slots by |k| (distance from the centre): dx, dy, box height (all in u), rz, ry. */
const SLOTS = [
  [0, 0, 430, 0, 0],
  [245, 24, 330, 4, 16],
  [452, 44, 312, 8, 26],
  [660, 80, 296, 12, 34],
  [860, 118, 280, 15, 40],
];

interface Tween {
  from: number;
  to: number;
  start: number;
  dur: number;
  ease: (t: number) => number;
  /** The first sweep in after the intro. */
  entrance?: boolean;
}

interface ModuleRig {
  lead: Unit;
  partner?: Unit;
  /** Smoothed values, so a jump in scroll position still animates. */
  ry: number;
  open: number;
  pOpen: number;
}

@Component({
  selector: 'app-showcase',
  imports: [RouterLink],
  templateUrl: './showcase.html',
  styleUrl: './showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Showcase {
  protected readonly views = SHOWCASE_VIEWS;
  protected readonly ink = INK;
  protected readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Intro plays once per browser session, never under reduced motion. */
  protected readonly intro = signal(!this.reduced && !readFlag());
  protected readonly introDone = signal(!this.intro());
  /** Centred range in the hero. */
  protected readonly current = signal(0);
  protected readonly autoplay = signal(!this.reduced);
  /** Current step (0..2) of each module. */
  protected readonly steps = signal<number[]>(SHOWCASE_VIEWS.map(() => 0));

  private readonly router = inject(Router);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gl');
  private readonly heroEl = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly revealEl = viewChild.required<ElementRef<HTMLElement>>('reveal');
  private readonly titleEl = viewChild.required<ElementRef<HTMLElement>>('title');
  private readonly fadeEls = viewChildren<ElementRef<HTMLElement>>('fade');
  private readonly moduleEls = viewChildren<ElementRef<HTMLElement>>('mod');
  private readonly boxEls = viewChildren<ElementRef<HTMLElement>>('box');
  private readonly box2Els = viewChildren<ElementRef<HTMLElement>>('box2');

  private stage?: Stage;
  private heroUnits: Unit[] = [];
  private rigs: ModuleRig[] = [];
  private pos = -2.6;
  private tween?: Tween;
  private drag?: { id: number; x0: number; pos0: number; moved: boolean; lastX: number; lastT: number; v: number };
  private lastInteract = performance.now();
  private centreOpen = 0;
  private hoverCentre = false;
  private settledAt = 0;
  private heroVisible = 1;
  private shown = 0; // index whose title is on screen
  private raf = 0;
  private last = performance.now();
  private idleFrames = 0;
  private u = 1;

  constructor() {
    const destroy = inject(DestroyRef);
    if (this.intro()) document.documentElement.classList.add('sx-locked');
    afterNextRender(() => this.start());
    destroy.onDestroy(() => {
      cancelAnimationFrame(this.raf);
      removeEventListener('resize', this.onResize);
      removeEventListener('keydown', this.onKey);
      document.documentElement.classList.remove('sx-locked');
      this.stage?.dispose();
    });
  }

  /* ---------- setup ---------- */

  private start(): void {
    try {
      this.stage = new Stage(this.canvas().nativeElement);
    } catch {
      // no WebGL: the page still works, the boxes show their flat photos (see .no-gl styles)
      this.heroEl().nativeElement.closest('.sx')?.classList.add('no-gl');
      this.finishIntro();
      return;
    }
    for (const v of this.views) {
      const label: InteriorLabel = {
        range: v.cat.short,
        model: v.lead.name,
        rows: [
          ['Range', v.cat.short],
          ['Type', v.lead.kind === 'door' ? 'Door' : 'Window'],
          ['Opening', v.lead.opening === 'hinged' ? 'Hinged' : `${v.lead.panels ?? 2}-track sliding`],
          ['Designs', String(v.count)],
          ['Sizes', 'Made to measure'],
          ['Fitting', 'By Amsidel team'],
        ],
        points: v.points,
      };
      this.heroUnits.push(this.stage.unit(v.lead, label, v.colour));
    }
    this.views.forEach((v, i) => {
      // the module re-uses the hero's textures (cached by unit id), so this costs no extra downloads
      const label: InteriorLabel = { range: v.cat.short, model: v.lead.name, rows: [], points: v.points };
      const lead = this.stage!.unit(v.lead, label, v.colour);
      const partner = v.partner
        ? this.stage!.unit(v.partner, { range: v.cat.short, model: v.partner.name, rows: [], points: v.points }, v.colour)
        : undefined;
      this.rigs[i] = { lead, partner, ry: -30, open: 0, pOpen: 0 };
    });

    this.setTitle(0, 1, true);
    addEventListener('resize', this.onResize);
    addEventListener('keydown', this.onKey);
    this.onResize();
    // the title is sized by measuring text; measure again once the display font has actually arrived
    document.fonts.load('400 100px "Archivo Black"').then(() => this.fitTitle(), () => undefined);
    if (!this.intro()) this.enterHero();
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly onResize = () => {
    this.stage?.resize();
    const hero = this.heroEl().nativeElement;
    const vw = innerWidth;
    // the hero fills the first screen under the contact bar and header (the bar wraps on phones)
    const bar = document.querySelector('app-store-shell .topbar');
    hero.style.setProperty('--topbar-h', (bar ? bar.getBoundingClientRect().height : 0) + 'px');
    const hh = hero.clientHeight;
    // phones: a smaller arc so the units, name and buttons all fit one compact screen
    this.u = vw < 820 ? Math.min(vw / 660, hh / 1050) : Math.min(vw / 1440, hh / 900);
    hero.style.setProperty('--u', this.u + 'px');
    this.fitTitle();
    this.idleFrames = 0;
  };

  /* ---------- intro ---------- */

  protected finishIntro(): void {
    if (this.introDone()) return;
    this.introDone.set(true);
    writeFlag();
    document.documentElement.classList.remove('sx-locked');
    setTimeout(() => this.intro.set(false), 700);
    this.enterHero();
  }

  protected onIntroEnd(e: AnimationEvent): void {
    // Angular scopes keyframe names per component, so match on the end of the name
    if (e.target === e.currentTarget && e.animationName.includes('sx-intro-out')) this.finishIntro();
  }

  private enterHero(): void {
    const now = performance.now();
    this.pos = this.reduced ? 0 : -2.6;
    this.tween = this.reduced ? undefined : { from: -2.6, to: 0, start: now + 120, dur: 1700, ease: enterEase, entrance: true };
    this.heroEl().nativeElement.classList.add('is-in');
    this.lastInteract = now;
  }

  /* ---------- hero controls ---------- */

  protected next(): void {
    this.interact();
    this.goTo(Math.round(this.tween?.to ?? this.pos) + 1);
  }

  protected goToRange(i: number): void {
    this.interact();
    const base = Math.round(this.tween?.to ?? this.pos);
    const cur = mod(base, N);
    let d = i - cur;
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    this.goTo(base + d);
  }

  protected toggleAutoplay(): void {
    this.autoplay.update((v) => !v);
    this.interact();
  }

  private goTo(target: number): void {
    const from = this.pos;
    const d = Math.abs(target - from);
    if (d < 0.001) return;
    this.tween = this.reduced
      ? { from: target, to: target, start: 0, dur: 1, ease: (t) => t }
      : { from, to: target, start: performance.now(), dur: 650 + 160 * Math.max(0, Math.round(d) - 1), ease: slideEase };
  }

  private interact(): void {
    this.lastInteract = performance.now();
    this.idleFrames = 0;
  }

  private readonly onKey = (e: KeyboardEvent) => {
    if (this.heroVisible < 0.5 || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') {
      this.interact();
      this.goTo(Math.round(this.tween?.to ?? this.pos) - 1);
    }
  };

  protected onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.interact();
    this.drag = { id: e.pointerId, x0: e.clientX, pos0: this.pos, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
  }

  protected onPointerMove(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    if (!this.drag || this.drag.id !== e.pointerId) {
      const over = this.heroUnits.find((u) => u.hit(e.clientX, e.clientY));
      this.hoverCentre = !!over && over === this.heroUnits[mod(Math.round(this.pos), N)];
      el.style.cursor = over ? 'pointer' : 'grab';
      return;
    }
    const d = this.drag;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      this.tween = undefined;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    }
    if (!d.moved) return;
    const now = performance.now();
    const slot = 245 * this.u * (innerWidth < 820 ? 1.02 : 1);
    this.pos = d.pos0 - dx / slot;
    const inst = (-(e.clientX - d.lastX) / slot / Math.max(1, now - d.lastT)) * 1000;
    d.v = lerp(d.v, inst, 0.4);
    d.lastX = e.clientX;
    d.lastT = now;
    this.interact();
  }

  protected onPointerUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = undefined;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    if (d.moved) {
      const target = Math.round(this.pos + clamp(d.v * 0.22, -2, 2));
      const dist = Math.abs(target - this.pos);
      this.tween = { from: this.pos, to: target, start: performance.now(), dur: Math.max(380, 650 * Math.min(1, dist + 0.35)), ease: slideEase };
      return;
    }
    // a tap: centre unit opens its range, side units come to the centre
    const centre = Math.round(this.pos);
    for (let k = -4; k <= 4; k++) {
      const j = mod(centre + k, N);
      if (this.heroUnits[j].hit(e.clientX, e.clientY)) {
        if (k === 0) this.router.navigate(['/category', this.views[j].slug]);
        else this.goTo(centre + k);
        return;
      }
    }
  }

  protected onPointerCancel(): void {
    if (!this.drag) return;
    this.drag = undefined;
    if (Math.abs(this.pos - Math.round(this.pos)) > 0.02) this.goTo(Math.round(this.pos));
  }

  protected onPointerLeave(): void {
    this.hoverCentre = false;
  }

  /* ---------- frame loop ---------- */

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const stage = this.stage!;
    if (document.hidden) return;
    const dt = Math.min(64, now - this.last);
    this.last = now;

    // hero position
    if (this.tween) {
      const t = this.tween;
      const k = clamp((now - t.start) / t.dur);
      this.pos = lerp(t.from, t.to, t.ease(k));
      if (k >= 1) {
        this.pos = t.to;
        this.tween = undefined;
        this.settledAt = now;
      }
    }
    const idx = mod(Math.round(this.pos), N);
    // the entrance sweep passes several ranges in a row; only the one it lands on gets a title change
    if (idx !== this.shown && this.introDone() && !this.tween?.entrance) {
      const dir = this.drag ? Math.sign(-(this.drag.v || 1)) || 1 : Math.sign((this.tween?.to ?? this.pos) - this.pos) || 1;
      this.changeTo(idx, dir >= 0 ? 1 : -1);
    }

    // autoplay
    if (
      this.autoplay() &&
      this.introDone() &&
      !this.drag &&
      !this.tween &&
      this.heroVisible >= 0.6 &&
      now - this.lastInteract > AUTOPLAY_MS
    ) {
      this.lastInteract = now;
      this.goTo(Math.round(this.pos) + 1);
    }

    const active = this.layoutHero(now, dt) + this.layoutModules(now, dt);
    // keep drawing while anything moves; when nothing is on screen draw one clearing frame, then idle
    if (active > 0) this.idleFrames = 0;
    else this.idleFrames++;
    if (this.idleFrames < 2) stage.render();
  };

  /** Places the hero units. Returns how many are visible. */
  private layoutHero(now: number, dt: number): number {
    const hero = this.heroEl().nativeElement;
    const r = hero.getBoundingClientRect();
    const vh = innerHeight;
    const vw = innerWidth;
    const phone = vw < 820;
    this.heroVisible = clamp((Math.min(r.bottom, vh) - Math.max(r.top, 0)) / Math.max(1, r.height));
    const fade = clamp(1 - (-r.top / Math.max(1, r.height)) * 1.4);
    let shown = 0;
    if (r.bottom < 0 || fade <= 0) {
      for (const u of this.heroUnits) u.apply({ ...restState(), op: 0 });
      return 0;
    }
    const u = this.u;
    const spread = phone ? 1.02 : 1;
    const cx = vw / 2;
    const cy = r.top + heroCentreY(r.height, u, phone);

    // the centre unit opens a little once it has settled, more while hovered
    const settled = !this.tween && !this.drag && now - this.settledAt > 500 && this.introDone();
    const want = this.reduced ? 0 : settled ? (this.hoverCentre ? 0.75 : 0.4) : 0;
    this.centreOpen = lerp(this.centreOpen, want, 1 - Math.exp(-dt / (want > this.centreOpen ? 260 : 120)));

    // Units are sized by height, so a wide window at the centre needs more room than a door. As a unit nears the
    // centre its width cap grows to full size, and every other unit is pushed outward by the extra half-width it
    // needs beyond a door's, so the centre one always stands out and nothing overlaps.
    const ks = this.heroUnits.map((_, j) => mod(j - this.pos + N / 2, N) - N / 2);
    const centreH = SLOTS[0][2] * u;
    let extra = 0;
    ks.forEach((k, j) => {
      const c = clamp(1 - Math.abs(k));
      if (c <= 0) return;
      const asp = this.views[j].lead.aspect;
      const halfW = Math.min(centreH, centreH * 0.95 * asp) / asp / 2;
      extra += c * Math.max(0, halfW - DOOR_HALF * u);
    });

    for (let j = 0; j < N; j++) {
      const unit = this.heroUnits[j];
      const k = ks[j];
      const a = Math.min(4, Math.abs(k));
      const i0 = Math.floor(a);
      const i1 = Math.min(4, i0 + 1);
      const f = a - i0;
      const slot = SLOTS[i0].map((v, n) => lerp(v, SLOTS[i1][n], f));
      const sg = Math.sign(k) || 1;
      const op = (Math.abs(k) <= 3.3 ? 1 : clamp(1 - (Math.abs(k) - 3.3) / 0.6)) * fade;
      const boxH = slot[2] * u;
      // side slots share one width cap so neighbours fit the slot spacing; the centre slot allows full size
      const boxW = boxH * lerp(0.95, 0.6, clamp(a));
      const h = Math.min(boxH, boxW * this.views[j].lead.aspect);
      const b = this.reduced ? 0 : Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
      const isCentre = Math.abs(k) < 0.5;
      const s: UnitState = {
        x: cx + sg * (slot[0] * u * spread + extra * clamp(a)),
        y: cy + slot[1] * u - (0.5 * b + 0.5) * 7 * u - (1 - fade) * 120,
        h,
        rx: 0,
        ry: sg * slot[4],
        rz: sg * slot[3] + 0.3 * b,
        z: -a * 34 * u,
        op,
        open: isCentre ? this.centreOpen * (1 - Math.abs(k) * 2) : 0,
        shadow: 1,
      };
      unit.apply(s);
      if (op > 0.01) shown++;
    }
    return shown;
  }

  /** Places the module units from their pinned boxes and the scroll position. Returns how many are visible. */
  private layoutModules(now: number, dt: number): number {
    const mods = this.moduleEls();
    const boxes = this.boxEls();
    const boxes2 = this.box2Els();
    const vh = innerHeight;
    const top = headerHeight();
    const pinH = vh - top;
    const smooth = this.reduced ? 1 : 1 - Math.exp(-dt / 110);
    let shown = 0;
    let stepsChanged = false;
    const steps = this.steps().slice();
    let b2 = 0;

    mods.forEach((m, i) => {
      const rig = this.rigs[i];
      if (!rig) return;
      const v = this.views[i];
      const box2 = v.partner ? boxes2[b2++] : undefined;
      const r = m.nativeElement.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) {
        rig.lead.apply({ ...restState(), op: 0 });
        rig.partner?.apply({ ...restState(), op: 0 });
        return;
      }
      const p = clamp((top - r.top) / Math.max(1, r.height - pinH));
      const enter = clamp((vh - r.top) / Math.max(1, vh - top));
      const exit = clamp((vh - r.bottom) / Math.max(1, pinH));

      const step = p < 0.32 ? 0 : p < 0.64 ? 1 : 2;
      if (steps[i] !== step) {
        steps[i] = step;
        stepsChanged = true;
      }

      // A: swing / slide open. B: close, turn round to the inside. C: turn back and open wide.
      let ry: number;
      let open: number;
      if (p < 0.32) {
        ry = lerp(-24, 0, easeOut(p / 0.12));
        open = easeInOut((p - 0.06) / 0.2);
      } else if (p < 0.64) {
        open = 1 - easeInOut((p - 0.32) / 0.08);
        ry = lerp(0, 180, easeInOut((p - 0.42) / 0.18));
      } else {
        ry = lerp(180, 360, easeInOut((p - 0.64) / 0.14));
        open = easeInOut((p - 0.8) / 0.14);
      }
      ry += -40 * (1 - easeOut(enter)) + 50 * exit;
      if (this.reduced) {
        rig.ry = ry;
        rig.open = open;
      } else {
        // move the long way smoothly but never lag far behind the scroll
        rig.ry = lerp(rig.ry, ry, smooth);
        rig.open = lerp(rig.open, open, smooth);
      }

      const op = clamp(enter * 1.5) * (1 - clamp(exit * 1.6));
      const bob = this.reduced ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 5;
      const br = boxes[i].nativeElement.getBoundingClientRect();
      const h = Math.min(br.height, br.width * v.lead.aspect);
      rig.lead.apply({
        x: br.left + br.width / 2,
        y: br.top + br.height / 2 + bob - exit * 0.25 * vh,
        h: h * lerp(0.82, 1, easeOut(enter)),
        rx: 0,
        ry: rig.ry,
        rz: 2 * (1 - easeOut(enter)),
        z: 0,
        op,
        open: rig.open,
        shadow: 1,
      });
      if (op > 0.01) shown++;

      if (rig.partner && box2) {
        const b = box2.nativeElement.getBoundingClientRect();
        const visible = b.width > 4 && b.height > 4;
        const pOpen = step === 1 ? 0 : step === 0 ? easeInOut((p - 0.1) / 0.18) : easeInOut((p - 0.7) / 0.18);
        rig.pOpen = this.reduced ? pOpen : lerp(rig.pOpen, pOpen, smooth);
        const ph = Math.min(b.height, b.width * v.partner!.aspect);
        rig.partner.apply({
          x: b.left + b.width / 2,
          y: b.top + b.height / 2 - bob * 0.6 - exit * 0.2 * vh,
          h: ph,
          rx: 0,
          ry: -14 - 30 * (1 - easeOut(enter)) + 40 * exit,
          rz: 0,
          z: -40,
          op: visible ? op * clamp((enter - 0.25) * 2) : 0,
          open: rig.pOpen,
          shadow: 0.8,
        });
      }
    });
    if (stepsChanged) this.steps.set(steps);
    return shown;
  }

  /* ---------- hero text ---------- */

  private changeTo(i: number, dir: 1 | -1): void {
    const prev = this.shown;
    this.shown = i;
    this.current.set(i);
    this.reveal(this.views[i].colour, this.views[prev].colour);
    this.setTitle(i, dir, false);
  }

  /** The new range colour grows out as a circle from the centre unit. */
  private reveal(colour: string, from: string): void {
    const hero = this.heroEl().nativeElement;
    const el = this.revealEl().nativeElement;
    el.getAnimations().forEach((a) => a.cancel());
    if (this.reduced) {
      hero.style.setProperty('--flav', colour);
      return;
    }
    hero.style.setProperty('--flav', from);
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const cx = w / 2;
    const cy = heroCentreY(h, this.u, w < 820);
    const R = 1.1 * Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    el.style.background = colour;
    const anim = el.animate(
      [{ clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${R}px at ${cx}px ${cy}px)` }],
      { duration: 560, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
    );
    anim.onfinish = () => {
      hero.style.setProperty('--flav', colour);
      anim.cancel();
    };
  }

  /** Letters of the old name rise out, the new name rises in letter by letter. */
  private setTitle(i: number, dir: 1 | -1, instant: boolean): void {
    const host = this.titleEl().nativeElement;
    const text = this.views[i].lead.name;
    const old = Array.from(host.querySelectorAll<HTMLElement>('.sx-line'));
    const line = document.createElement('span');
    line.className = 'sx-line';
    let n = 0;
    for (const word of text.split(' ')) {
      const w = document.createElement('span');
      w.className = 'sx-word';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'sx-ch';
        c.textContent = ch;
        w.appendChild(c);
        if (!instant && !this.reduced) {
          c.animate([{ transform: `translateY(${110 * dir}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], {
            duration: 620,
            delay: 120 + 22 * n,
            easing: 'cubic-bezier(.22,1,.36,1)',
            fill: 'backwards',
          });
        }
        n++;
      }
      line.appendChild(w);
      line.appendChild(document.createTextNode(' '));
    }
    for (const o of old) {
      // a name already leaving is dropped at once, so quick changes never stack up more than two names
      if (instant || this.reduced || o.classList.contains('is-out')) {
        o.remove();
        continue;
      }
      o.classList.add('is-out');
      o.querySelectorAll<HTMLElement>('.sx-ch').forEach((c, k) =>
        c.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-110 * dir}%)`, opacity: 0 }], {
          duration: 300,
          delay: 11 * k,
          easing: 'cubic-bezier(.45,0,.75,.3)',
          fill: 'forwards',
        }),
      );
      setTimeout(() => o.remove(), 700);
    }
    host.appendChild(line);
    host.setAttribute('aria-label', text);
    this.fitTitle();
    if (!instant && !this.reduced) {
      for (const f of this.fadeEls()) {
        f.nativeElement.animate(
          [
            { transform: 'translateY(14px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 420, delay: 60, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'backwards' },
        );
      }
    }
  }

  /** Largest size up to 96u at which the name fits 760u (desktop) or the screen width (phones). */
  private fitTitle(): void {
    const host = this.titleEl().nativeElement;
    const text = this.views[this.shown].lead.name;
    const g = measureCtx();
    g.font = '400 100px "Archivo Black", Impact, sans-serif';
    const vw = innerWidth;
    if (vw < 820) {
      // one line on phones: the whole name fits the screen width, between 22 and 40 px
      const w = g.measureText(text.toUpperCase()).width;
      host.style.fontSize = Math.max(20, Math.min(40, ((vw - 44) * 100) / w)) + 'px';
    } else {
      const w = g.measureText(text.toUpperCase()).width;
      host.style.fontSize = Math.min(96 * this.u, (900 * this.u * 100) / w) + 'px';
    }
  }

  protected rangeLabel(v: ShowcaseView): string {
    return `${v.cat.name} · ${v.count} designs`;
  }
}

/* ---------- helpers ---------- */

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Vertical centre of the hero arc, from the hero's top. Keep in step with the text block's top in showcase.scss. */
const heroCentreY = (h: number, u: number, phone: boolean) => (phone ? h * 0.4 : h / 2 - 118 * u);

let ctx: CanvasRenderingContext2D | undefined;
function measureCtx(): CanvasRenderingContext2D {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  return ctx;
}

/** Bottom of the sticky site header (the modules pin just under it). */
function headerHeight(): number {
  const h = document.querySelector('app-store-shell .header');
  return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0;
}

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* private mode: the intro may play again, which is fine */
  }
}

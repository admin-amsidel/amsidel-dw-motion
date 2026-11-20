/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// Real-time 3D door and window units for the home showcase (three.js / WebGL).
// One fixed canvas draws every unit. The camera is set so one world unit = one CSS pixel at z = 0, which lets
// each unit be placed straight from a screen rectangle (x, y, height) taken from the DOM.
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ShowcaseUnit } from '../../../data/showcase';

/** Where and how a unit is drawn this frame. Angles in degrees, lengths in CSS px. */
export interface UnitState {
  /** Centre on screen. */
  x: number;
  y: number;
  /** Drawn height of the whole unit (frame included). */
  h: number;
  rx: number;
  ry: number;
  /** Lean, clockwise positive. */
  rz: number;
  /** Depth: negative moves away from the camera. */
  z: number;
  /** Opacity 0..1. */
  op: number;
  /** How far the leaf / sash is open, 0..1. */
  open: number;
  /** Contact shadow strength 0..1. */
  shadow: number;
}

export const restState = (): UnitState => ({ x: 0, y: 0, h: 0, rx: 0, ry: 0, rz: 0, z: 0, op: 0, open: 0, shadow: 1 });

/** Text drawn on the inside face of a unit (the "interior" side people see when it turns around). */
export interface InteriorLabel {
  range: string;
  model: string;
  rows: [string, string][];
  points: string[];
}

const DEG = Math.PI / 180;
const FRAME_D = 0.07; // frame depth, in unit widths
const LEAF_D = 0.045; // leaf / sash depth
const DOOR_SWING = 78; // degrees a hinged leaf opens

interface TexturePair {
  front: CanvasTexture;
  back: CanvasTexture;
  /** Average colour of the frame, used for the unit's edges. */
  edge: Color;
  ready: Promise<void>;
}

/** [u0, v0, u1, v1] in texture space (v up). */
type Region = [number, number, number, number];

export class Stage {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 10, 8000);
  private readonly textures = new Map<string, TexturePair>();
  private readonly glowTex = { door: makeGlow('door'), window: makeGlow('window') };
  private readonly shadowTex = makeShadow();
  readonly units: Unit[] = [];
  vw = 1;
  vh = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new AmbientLight(0xffffff, 0.55));
    const key = new DirectionalLight(0xffffff, 1.1);
    key.position.set(-0.6, 0.9, 1.4);
    this.scene.add(key);
    this.resize();
  }

  resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.vw = vw;
    this.vh = vh;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, vw < 820 ? 1.75 : 2));
    this.renderer.setSize(vw, vh, false);
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';
    const d = Math.min(2200, Math.max(1000, 1500 * Math.min(vw / 1440, vh / 900)));
    this.camera.position.set(0, 0, d);
    this.camera.fov = (2 * Math.atan(vh / 2 / d)) / DEG;
    this.camera.aspect = vw / vh;
    this.camera.near = 10;
    this.camera.far = d * 4;
    this.camera.updateProjectionMatrix();
  }

  /** A new unit, hidden until a state with op > 0 is applied. */
  unit(def: ShowcaseUnit, label: InteriorLabel, tint: string): Unit {
    const u = new Unit(this, def, this.texturesFor(def, label, tint));
    this.units.push(u);
    return u;
  }

  /** @internal */
  add(o: Group | Mesh): void {
    this.scene.add(o);
  }

  /** @internal */
  glow(kind: 'door' | 'window'): Texture {
    return this.glowTex[kind];
  }

  /** @internal */
  shadowTexture(): Texture {
    return this.shadowTex;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const u of this.units) u.dispose();
    for (const t of this.textures.values()) {
      t.front.dispose();
      t.back.dispose();
    }
    this.glowTex.door.dispose();
    this.glowTex.window.dispose();
    this.shadowTex.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  private texturesFor(def: ShowcaseUnit, label: InteriorLabel, tint: string): TexturePair {
    const key = def.id;
    const hit = this.textures.get(key);
    if (hit) return hit;
    const W = 640;
    const H = Math.round(W * def.aspect);
    const fc = canvasOf(W, H);
    const bc = canvasOf(W, H);
    const base = new Color(tint).lerp(new Color('#1e1e21'), 0.3);
    // until the photo arrives: a plain panel in the range colour
    for (const c of [fc, bc]) {
      const g = c.getContext('2d')!;
      g.fillStyle = '#' + base.getHexString();
      g.fillRect(0, 0, W, H);
    }
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const front = new CanvasTexture(fc);
    const back = new CanvasTexture(bc);
    for (const t of [front, back]) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, aniso);
    }
    const pair: TexturePair = { front, back, edge: base.clone(), ready: Promise.resolve() };
    pair.ready = loadImage(def.img).then(
      async (img) => {
        const g = fc.getContext('2d')!;
        g.drawImage(img, 0, 0, W, H);
        front.needsUpdate = true;
        pair.edge.copy(sampleEdge(fc, def));
        await fontsReady();
        drawInterior(bc, fc, label, pair.edge);
        back.needsUpdate = true;
      },
      () => undefined, // keep the plain panel if the image can't load
    );
    this.textures.set(key, pair);
    return pair;
  }
}

export class Unit {
  private readonly group = new Group();
  private readonly mats: Material[] = [];
  private readonly edgeMat: MeshStandardMaterial;
  private readonly glowMat: MeshBasicMaterial;
  private readonly shadowMat: MeshBasicMaterial;
  private readonly shadow: Mesh;
  /** Hinged leaf pivot, or the sliding sash. */
  private mover?: Group | Mesh;
  private slideFrom = 0;
  private slideBy = 0;
  private slideZ = 0;
  readonly aspect: number;
  /** Last state applied; read it to hit-test or to continue a tween. */
  readonly state = restState();

  constructor(
    private readonly stage: Stage,
    readonly def: ShowcaseUnit,
    tex: TexturePair,
  ) {
    const A = (this.aspect = def.aspect);
    const env = { metalness: 0, transparent: true, envMapIntensity: 0.5 };
    this.edgeMat = this.track(new MeshStandardMaterial({ ...env, color: tex.edge, roughness: 0.6 }));
    tex.ready.then(() => this.edgeMat.color.copy(tex.edge));
    const frontMat = this.track(new MeshStandardMaterial({ ...env, map: tex.front, roughness: 0.5 }));
    const backMat = this.track(new MeshStandardMaterial({ ...env, map: tex.back, roughness: 0.55 }));
    const mats = [this.edgeMat, this.edgeMat, this.edgeMat, this.edgeMat, frontMat, backMat];

    const [l, t, r, b] = def.leaf;
    // fixed frame: four bars around the leaf area, each showing its own slice of the photo
    const bars: [number, number, number, number][] = [
      [0, 0, l, 1],
      [r, 0, 1, 1],
      [l, 0, r, t],
      [l, b, r, 1],
    ];
    for (const [x0, y0, x1, y1] of bars) {
      if (x1 - x0 < 0.004 || y1 - y0 < 0.004) continue;
      this.group.add(part(mats, A, x0, y0, x1, y1, FRAME_D, -FRAME_D / 2));
    }

    // light coming through the opening, visible only while it is open
    this.glowMat = this.track(
      new MeshBasicMaterial({ map: stage.glow(def.kind), transparent: true, opacity: 0, depthWrite: false }),
    );
    const glow = new Mesh(new PlaneGeometry((r - l) * 1.0, (b - t) * A), this.glowMat);
    glow.position.set((l + r) / 2 - 0.5, (0.5 - (t + b) / 2) * A, -FRAME_D + 0.004);
    this.group.add(glow);

    const leafZ = -0.006 - LEAF_D / 2;
    if (def.opening === 'hinged') {
      const hingeX = def.hinge === 'right' ? r : l;
      const pivot = new Group();
      pivot.position.set(hingeX - 0.5, 0, leafZ + LEAF_D / 2);
      const leaf = part(mats, A, l, t, r, b, LEAF_D, -LEAF_D / 2);
      leaf.position.x -= hingeX - 0.5;
      pivot.add(leaf);
      this.group.add(pivot);
      this.mover = pivot;
    } else {
      const n = Math.max(2, def.panels ?? 2);
      const pw = (r - l) / n;
      for (let i = 0; i < n; i++) {
        const sash = part(mats, A, l + i * pw, t, l + (i + 1) * pw, b, LEAF_D, leafZ);
        this.group.add(sash);
        if (i === n - 1) {
          this.mover = sash;
          this.slideFrom = sash.position.x;
          this.slideBy = pw * 0.97;
          this.slideZ = leafZ;
        }
      }
    }

    // soft shadow on the wall behind
    this.shadowMat = new MeshBasicMaterial({ map: stage.shadowTexture(), transparent: true, opacity: 0, depthWrite: false });
    this.shadow = new Mesh(new PlaneGeometry(1.25, 1.04 * A), this.shadowMat);
    this.shadow.renderOrder = -1;
    this.group.visible = false;
    this.shadow.visible = false;
    stage.add(this.group);
    stage.add(this.shadow);
  }

  apply(s: UnitState): void {
    Object.assign(this.state, s);
    const show = s.op > 0.01 && s.h > 1;
    this.group.visible = show;
    this.shadow.visible = show && s.shadow > 0.01;
    if (!show) return;
    const { vw, vh } = this.stage;
    const k = s.h / this.aspect;
    this.group.position.set(s.x - vw / 2, vh / 2 - s.y, s.z);
    this.group.scale.set(k, k, k);
    this.group.rotation.set(s.rx * DEG, s.ry * DEG, -s.rz * DEG, 'ZYX');
    for (const m of this.mats) m.opacity = s.op;

    const open = Math.max(0, Math.min(1, s.open));
    if (this.mover) {
      if (this.def.opening === 'hinged') {
        const a = easeInOut(open) * DOOR_SWING * DEG;
        this.mover.rotation.y = this.def.hinge === 'right' ? a : -a;
      } else {
        // the sash steps back first, then glides behind its neighbour
        const back = Math.min(1, open * 5);
        this.mover.position.z = this.slideZ - back * LEAF_D * 1.1;
        this.mover.position.x = this.slideFrom - easeInOut(Math.max(0, (open - 0.08) / 0.92)) * this.slideBy;
      }
    }
    this.glowMat.opacity = s.op * Math.min(1, open * 3);

    const lift = 0.05 * s.h;
    this.shadow.position.set(s.x - vw / 2, vh / 2 - s.y - lift, s.z - 0.32 * s.h);
    this.shadow.scale.set(k * Math.max(0.3, Math.abs(Math.cos(s.ry * DEG))), k, 1);
    this.shadow.rotation.set(0, 0, -s.rz * DEG);
    this.shadowMat.opacity = 0.5 * s.op * s.shadow;
  }

  /** Screen rectangle of the unit (approximate, ignores rotation): for hit tests. */
  hit(px: number, py: number): boolean {
    const s = this.state;
    if (s.op < 0.3) return false;
    const w = (s.h / this.aspect) * Math.max(0.35, Math.abs(Math.cos(s.ry * DEG)));
    return Math.abs(px - s.x) <= w / 2 && Math.abs(py - s.y) <= s.h / 2;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    this.shadow.geometry.dispose();
    for (const m of this.mats) m.dispose();
    this.shadowMat.dispose();
  }

  private track<T extends Material>(m: T): T {
    this.mats.push(m);
    return m;
  }
}

/* ---------- geometry ---------- */

/**
 * A box covering the image rectangle (x0, y0)-(x1, y1) (fractions, y down), centred at depth z.
 * Its front face shows that slice of the front texture; its back face the matching slice of the
 * mirrored interior texture, so the slices line up from both sides.
 */
function part(mats: Material[], A: number, x0: number, y0: number, x1: number, y1: number, depth: number, z: number): Mesh {
  const w = x1 - x0;
  const h = (y1 - y0) * A;
  const geo = new BoxGeometry(w, h, depth);
  const front: Region = [x0, 1 - y1, x1, 1 - y0];
  const back: Region = [1 - x1, 1 - y1, 1 - x0, 1 - y0];
  remapUV(geo, 4, front);
  remapUV(geo, 5, back);
  const m = new Mesh(geo, mats);
  m.position.set((x0 + x1) / 2 - 0.5, (0.5 - (y0 + y1) / 2) * A, z);
  return m;
}

/** BoxGeometry faces have 4 vertices each, in +x, -x, +y, -y, +z, -z order. */
function remapUV(geo: BoxGeometry, face: number, [u0, v0, u1, v1]: Region): void {
  const uv = geo.attributes['uv'];
  for (let i = face * 4; i < face * 4 + 4; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
}

/* ---------- textures ---------- */

function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

let fontsPromise: Promise<unknown> | undefined;
function fontsReady(): Promise<unknown> {
  fontsPromise ??= Promise.all(
    ['400 40px "Archivo Black"', '400 20px "DM Mono"', '500 20px "DM Mono"'].map((f) => document.fonts.load(f).catch(() => null)),
  );
  return fontsPromise;
}

/** Average colour of the frame strip beside the leaf. */
function sampleEdge(c: HTMLCanvasElement, def: ShowcaseUnit): Color {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const x = Math.max(1, Math.floor(def.leaf[0] * c.width * 0.5));
  const d = g.getImageData(Math.floor(x / 2), Math.floor(c.height * 0.3), Math.max(1, x), Math.floor(c.height * 0.4)).data;
  let r = 0,
    gg = 0,
    b = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    gg += d[i + 1];
    b += d[i + 2];
  }
  const col = new Color();
  col.setRGB(r / n / 255, gg / n / 255, b / n / 255, SRGBColorSpace);
  return col;
}

/** The inside face: the front mirrored and toned down, with a specification card printed on it. */
function drawInterior(c: HTMLCanvasElement, front: HTMLCanvasElement, label: InteriorLabel, edge: Color): void {
  const W = c.width;
  const H = c.height;
  const g = c.getContext('2d')!;
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  g.drawImage(front, 0, 0);
  g.restore();
  const tone = edge.clone().lerp(new Color('#f6f1ea'), 0.55);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.62;
  g.fillStyle = '#' + tone.getHexString(SRGBColorSpace);
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  const sheen = g.createLinearGradient(0, 0, W, 0);
  sheen.addColorStop(0, 'rgba(0,0,0,.10)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,.14)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.8, 'rgba(0,0,0,.04)');
  sheen.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  const ink = '#' + edge.clone().lerp(new Color('#1e1e21'), 0.78).getHexString(SRGBColorSpace);
  const tall = H / W > 1.5;
  const at = (f: number) => H * (tall ? f : 0.5 + (f - 0.5) * 0.92);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink;
  g.font = `400 ${W * 0.085}px "Archivo Black", Impact, sans-serif`;
  g.fillText('AMSIDEL', W / 2, at(tall ? 0.12 : 0.1));
  g.font = `500 ${W * 0.036}px "DM Mono", ui-monospace, monospace`;
  g.fillText(`${label.range} · ${label.model}`.toUpperCase(), W / 2, at(tall ? 0.155 : 0.17), W * 0.86);

  // specification card
  const x0 = W * 0.13;
  const x1 = W * 0.87;
  const y0 = at(tall ? 0.19 : 0.22);
  const rows = label.rows.slice(0, 6);
  const rowH = tall ? H * 0.034 : H * 0.07;
  const y1 = y0 + rowH * (rows.length + 2.2);
  g.fillStyle = 'rgba(255,255,255,.92)';
  roundRect(g, x0, y0, x1 - x0, y1 - y0, W * 0.03);
  g.fill();
  g.fillStyle = ink;
  g.font = `400 ${W * 0.052}px "Archivo Black", Impact, sans-serif`;
  g.fillText('SPECIFICATION', W / 2, y0 + rowH * 0.9);
  g.fillRect(x0 + W * 0.05, y0 + rowH * 1.55, x1 - x0 - W * 0.1, 2);
  rows.forEach(([k, v], i) => {
    const y = y0 + rowH * (2.3 + i);
    g.font = `${i < 2 ? 500 : 400} ${W * 0.03}px "DM Mono", ui-monospace, monospace`;
    g.textAlign = 'left';
    g.globalAlpha = 0.65;
    g.fillText(k.toUpperCase(), x0 + W * 0.05, y);
    g.globalAlpha = 1;
    g.textAlign = 'right';
    g.fillText(v, x1 - W * 0.05, y, (x1 - x0) * 0.58);
    g.globalAlpha = 0.18;
    g.fillRect(x0 + W * 0.05, y + rowH * 0.45, x1 - x0 - W * 0.1, 1);
    g.globalAlpha = 1;
  });

  // highlights
  g.textAlign = 'center';
  let y = y1 + rowH * 1.4;
  g.font = `500 ${W * 0.034}px "DM Mono", ui-monospace, monospace`;
  g.fillText('FEATURES', W / 2, y);
  g.font = `400 ${W * 0.032}px "DM Mono", ui-monospace, monospace`;
  for (const p of label.points.slice(0, 3)) {
    y += rowH * 0.95;
    if (y > H * 0.86) break;
    g.fillText('· ' + p, W / 2, y, W * 0.76);
  }
  g.font = `500 ${W * 0.03}px "DM Mono", ui-monospace, monospace`;
  g.fillText('MADE TO MEASURE · AMSIDEL', W / 2, H * (tall ? 0.885 : 0.9));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Warm light through a door; bright daylight through a window. */
function makeGlow(kind: 'door' | 'window'): CanvasTexture {
  const c = canvasOf(256, 512);
  const g = c.getContext('2d')!;
  if (kind === 'door') {
    const lin = g.createLinearGradient(0, 0, 0, 512);
    lin.addColorStop(0, '#fff3dc');
    lin.addColorStop(0.55, '#ffd89a');
    lin.addColorStop(1, '#e9b56c');
    g.fillStyle = lin;
    g.fillRect(0, 0, 256, 512);
    const rad = g.createRadialGradient(128, 200, 10, 128, 220, 300);
    rad.addColorStop(0, 'rgba(255,255,255,.95)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, 256, 512);
  } else {
    const lin = g.createLinearGradient(0, 0, 0, 512);
    lin.addColorStop(0, '#bfe0f5');
    lin.addColorStop(0.55, '#eef7fb');
    lin.addColorStop(0.75, '#cfe6c4');
    lin.addColorStop(1, '#8fbf86');
    g.fillStyle = lin;
    g.fillRect(0, 0, 256, 512);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function makeShadow(): CanvasTexture {
  const c = canvasOf(128, 128);
  const g = c.getContext('2d')!;
  const rad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  rad.addColorStop(0, 'rgba(20,20,24,.5)');
  rad.addColorStop(0.6, 'rgba(20,20,24,.22)');
  rad.addColorStop(1, 'rgba(20,20,24,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/* ---------- maths ---------- */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
/** cubic-bezier(x1, y1, x2, y2) as a function of t, like CSS. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    x = clamp(x);
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp(t));
  };
}

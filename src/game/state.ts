// Globals of the original (global.sl_*), colours, shapes, levels, the fade and the save file.
import { dcos, dsin, rgb } from "../engine/math";
import type { Tex } from "../engine/gfx";

export const SL_W = 720;
export const SL_H = 1280;
const SAVE_KEY = "shadowlock.best";

export const COL = {
  bgTop: rgb(24, 18, 43),
  bgBot: rgb(57, 28, 74),
  shadow: rgb(12, 9, 24),
  text: rgb(245, 240, 255),
  dim: rgb(150, 135, 185),
  good: rgb(94, 234, 170),
  bad: rgb(255, 92, 110),
  gold: rgb(255, 209, 102),
};
export const SHAPE_COLS = [rgb(255, 140, 105), rgb(108, 197, 255), rgb(255, 209, 102), rgb(190, 140, 255), rgb(120, 230, 190), rgb(255, 120, 180)];

export function regular(n: number, r: number) {
  const a: number[] = [];
  for (let i = 0; i < n; i++) {
    const ang = -90 + (i * 360) / n;
    a.push(dcos(ang) * r, dsin(ang) * r);
  }
  return a;
}
export function star(n: number, r1: number, r2: number) {
  const a: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = -90 + (i * 180) / n;
    const r = i % 2 === 0 ? r1 : r2;
    a.push(dcos(ang) * r, dsin(ang) * r);
  }
  return a;
}

export type Shape = { name: string; sym: number; pts: number[] };
// pts are unit size, drawn as a fan from 0,0 so the origin stays inside the shape.
// sym = how many times per turn it lines up
export const SHAPES: Shape[] = [
  { name: "triangle", sym: 3, pts: regular(3, 1.0) },
  { name: "square", sym: 4, pts: [-0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, 0.8] },
  { name: "cross", sym: 4, pts: [-0.32, -1, 0.32, -1, 0.32, -0.32, 1, -0.32, 1, 0.32, 0.32, 0.32, 0.32, 1, -0.32, 1, -0.32, 0.32, -1, 0.32, -1, -0.32, -0.32, -0.32] },
  { name: "pentagon", sym: 5, pts: regular(5, 0.95) },
  { name: "arrow", sym: 1, pts: [0, -1, 0.8, 0.1, 0.35, 0.1, 0.35, 1, -0.35, 1, -0.35, 0.1, -0.8, 0.1] },
  { name: "house", sym: 1, pts: [0, -1, 0.85, -0.2, 0.85, 0.9, -0.85, 0.9, -0.85, -0.2] },
  { name: "star", sym: 5, pts: star(5, 1.0, 0.45) },
  { name: "kite", sym: 1, pts: [0, -1, 0.62, -0.25, 0, 1, -0.62, -0.25] },
  { name: "chevron", sym: 1, pts: [0, -1, 0.9, 0.8, 0, 0.3, -0.9, 0.8] },
];

export type LevelCfg = { title: string; shapes: number; rot: number; fall: number; tol: number; need: number; hint: boolean; sockRot: number; pulse: number; flip: boolean };
// rot in deg/s, fall in seconds, tol in degrees
export const LEVELS: LevelCfg[] = [
  { title: "WARM UP", shapes: 3, rot: 90, fall: 4.2, tol: 18, need: 6, hint: true, sockRot: 0, pulse: 0, flip: false },
  { title: "ONE WAY", shapes: 6, rot: 130, fall: 3.6, tol: 15, need: 8, hint: false, sockRot: 0, pulse: 0, flip: true },
  { title: "MOVING DARK", shapes: 8, rot: 150, fall: 3.3, tol: 14, need: 10, hint: false, sockRot: -35, pulse: 0, flip: true },
  { title: "HEARTBEAT", shapes: 9, rot: 180, fall: 3.5, tol: 13, need: 12, hint: false, sockRot: 25, pulse: 0.55, flip: true },
];

export const CIRCLE = regular(90, 1.0);
export const HEART: number[] = [];
for (let i = 0; i < 28; i++) {
  const a = (i * 360) / 28;
  const hx = 16 * Math.pow(dsin(a), 3);
  const hy = -(13 * dcos(a) - 5 * dcos(2 * a) - 2 * dcos(3 * a) - dcos(4 * a));
  HEART.push(hx / 17, (hy - 2) / 17);
}

/** How far (degrees) angle a is from lining up with b, for a shape that lines up `sym` times per turn. */
export function angleErr(a: number, b: number, sym: number) {
  const period = 360 / sym;
  let d = (a - b) % period;
  if (d < 0) d += period;
  if (d > period * 0.5) d = period - d;
  return d;
}

export type RoomName = "start" | "game" | "over";

export const S = {
  fade: 1,
  fadeOut: false,
  nextRoom: null as RoomName | null,
  switchTo: null as RoomName | null,
  score: 0,
  levelReached: 1,
  won: false,
  newBest: false,
  best: 0,
  tex: {} as Record<"glow" | "mat" | "bg" | "haze" | "vig" | "grain", Tex | null>,
};

export function loadBest() {
  try { S.best = Number(localStorage.getItem(SAVE_KEY)) || 0; } catch { S.best = 0; }
}
export function saveBest() {
  try { localStorage.setItem(SAVE_KEY, String(S.best)); } catch { /* private mode: keep it for this session */ }
}

export function goto(room: RoomName) {
  if (S.fadeOut) return;
  S.fadeOut = true;
  S.nextRoom = room;
}
export function fadeStep(dt: number) {
  if (S.fadeOut) {
    S.fade += dt * 4.5;
    if (S.fade >= 1) {
      S.fade = 1;
      S.fadeOut = false;
      S.switchTo = S.nextRoom;
    }
  } else {
    S.fade = Math.max(0, S.fade - dt * 3);
  }
}

// Boot: load textures, font and sounds, then run the room loop (menu → play → end) at the display's frame rate.
import { Gfx, type Tex } from "./engine/gfx";
import { bindInput, endFrame } from "./engine/input";
import { playMusic, preloadSounds, unlockAudio } from "./engine/audio";
import { S, SL_H, SL_W, fadeStep, loadBest, type RoomName } from "./game/state";
import { Start } from "./game/start";
import { Game } from "./game/game";
import { Over } from "./game/over";

const BASE = import.meta.env.BASE_URL + "assets/";
const SOUNDS = ["snd_ambient", "snd_click", "snd_fail", "snd_level", "snd_lock", "snd_perfect", "snd_shatter", "snd_whoosh"];

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;
const g = new Gfx(ctx);

// ---- letterboxed 720×1280 view, sharp on high-DPI screens
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  scale = Math.min(w / SL_W, h / SL_H);
  offX = (w - SL_W * scale) / 2;
  offY = (h - SL_H * scale) / 2;
}
window.addEventListener("resize", resize);
resize();

function loadTex(file: string, ox: number, oy: number): Promise<Tex | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ img, w: img.naturalWidth, h: img.naturalHeight, ox, oy });
    img.onerror = () => res(null);
    img.src = BASE + "tex/" + file;
  });
}

async function loadFont() {
  try {
    const f = new FontFace("Poppins", `url(${BASE}fonts/Poppins-Bold.ttf)`, { weight: "700" });
    document.fonts.add(await f.load());
    g.font = "Poppins, sans-serif";
    ctx.font = "700 10px Poppins";
  } catch { /* falls back to the system font, like the original without the ttf */ }
}

type Room = { step(dt: number): void; draw(g: Gfx): void };
const make = (r: RoomName): Room => (r === "start" ? new Start() : r === "game" ? new Game() : new Over());
let room: Room;

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  fadeStep(dt);
  room.step(dt);
  if (S.switchTo) {
    room = make(S.switchTo);
    S.switchTo = null;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0b0816";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SL_W, SL_H);
  ctx.clip();
  room.draw(g);
  ctx.restore();

  endFrame();
  requestAnimationFrame(frame);
}

async function boot() {
  const [glowT, mat, bg, haze, vig, grain] = await Promise.all([
    loadTex("tex_glow.png", 64, 64),
    loadTex("tex_mat.png", 0, 0),
    loadTex("tex_bg.png", 0, 0),
    loadTex("tex_haze.png", 0, 0),
    loadTex("tex_vignette.png", 0, 0),
    loadTex("tex_grain.png", 0, 0),
    loadFont(),
    preloadSounds(BASE + "snd/", SOUNDS),
  ]);
  S.tex = { glow: glowT, mat, bg, haze, vig, grain };
  loadBest();
  playMusic("snd_ambient", 0.4);

  bindInput(canvas, (cx, cy) => [(cx - offX) / scale, (cy - offY) / scale], () => void unlockAudio());
  room = make("start");
  if (import.meta.env.DEV) {
    // dev only (stripped from builds): jump around for screenshots and debugging
    Object.assign(window, { shadowlock: { S, go: (r: RoomName) => { S.switchTo = r; }, room: () => room } });
  }
  document.getElementById("loading")?.remove();
  last = performance.now();
  requestAnimationFrame(frame);
}

void boot();

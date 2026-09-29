// GameMaker-style math helpers. Angles are in degrees, like dsin/dcos in GML.

export const dsin = (a: number) => Math.sin((a * Math.PI) / 180);
export const dcos = (a: number) => Math.cos((a * Math.PI) / 180);
export const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const frac = (x: number) => x - Math.trunc(x);
export const pointDistance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
export const pointInRect = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) =>
  px >= x1 && px <= x2 && py >= y1 && py <= y2;

// Random source can be swapped for a seeded one (tests use this).
let rng: () => number = Math.random;
export const setRandom = (fn: () => number) => { rng = fn; };
export const random = (n: number) => rng() * n;
export const randomRange = (a: number, b: number) => a + rng() * (b - a);
/** irandom(n): integer in [0, n] inclusive */
export const irandom = (n: number) => Math.floor(rng() * (n + 1));
export const choose = <T>(...xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** Small deterministic PRNG (mulberry32) for reproducible runs. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Colours are packed 0xRRGGBB numbers.
export const rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
export const C_WHITE = 0xffffff;
export const mergeColour = (a: number, b: number, k: number) => {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const m = (s: number) => Math.round(lerp(ch(a, s), ch(b, s), k));
  return rgb(m(16), m(8), m(0));
};
export const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

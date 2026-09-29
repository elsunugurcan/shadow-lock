// Web Audio port of audio_play_sound / audio_sound_pitch / audio_sound_gain.
// Browsers only allow audio after a user gesture, so the context is created on the first tap / key.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const raw = new Map<string, ArrayBuffer>();
let pendingMusic: { name: string; gain: number } | null = null;
let musicStarted = false;

/** Fetches the files up front (no decoding yet: that needs an AudioContext). */
export async function preloadSounds(base: string, names: string[]) {
  await Promise.all(
    names.map(async (n) => {
      try {
        const r = await fetch(`${base}${n}.wav`);
        if (r.ok) raw.set(n, await r.arrayBuffer());
      } catch { /* missing sound: play() becomes a no-op, like a missing asset */ }
    }),
  );
}

export async function unlockAudio() {
  if (ctx) { void ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  await Promise.all(
    [...raw].map(async ([n, data]) => {
      try { buffers.set(n, await ctx!.decodeAudioData(data.slice(0))); } catch { /* unsupported */ }
    }),
  );
  if (pendingMusic) startLoop(pendingMusic.name, pendingMusic.gain);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend(); else void ctx.resume();
  });
}

function startLoop(name: string, gain: number) {
  const b = buffers.get(name);
  if (!ctx || !master || !b || musicStarted) return;
  musicStarted = true;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start();
}

/** audio_play_sound(snd, 0, true) + gain: starts as soon as audio is unlocked. */
export function playMusic(name: string, gain: number) {
  if (ctx && buffers.size) startLoop(name, gain);
  else pendingMusic = { name, gain };
}

/** ink_play(snd, pitch, gain) */
export function play(name: string, pitch = 1, gain = 1) {
  if (!ctx || !master || ctx.state !== "running") return;
  const b = buffers.get(name);
  if (!b) return;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = pitch;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start();
}

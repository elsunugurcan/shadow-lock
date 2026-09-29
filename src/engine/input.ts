// Mouse / touch / keyboard state with GameMaker semantics:
// "pressed" and "released" are true for exactly one frame (step + draw), "down" while held.

export const input = {
  x: 0,
  y: 0,
  down: false,
  pressed: false,
  released: false,
  keysPressed: new Set<string>(),
};

/** Called by the loop after step + draw of a frame. */
export function endFrame() {
  input.pressed = false;
  input.released = false;
  input.keysPressed.clear();
}

export const keyPressed = (...keys: string[]) => keys.some((k) => input.keysPressed.has(k));

/**
 * Binds pointer events on the canvas. toLogical maps client coordinates to the 1280×720 (or other) room space.
 * onFirstGesture fires once, used to unlock audio.
 */
export function bindInput(el: HTMLElement, toLogical: (cx: number, cy: number) => [number, number], onFirstGesture: () => void) {
  let active: number | null = null;
  let unlocked = false;
  const set = (e: PointerEvent) => { [input.x, input.y] = toLogical(e.clientX, e.clientY); };
  el.addEventListener("pointerdown", (e) => {
    if (!unlocked) { unlocked = true; onFirstGesture(); }
    if (active !== null) return;
    active = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    set(e);
    input.down = true;
    input.pressed = true;
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => {
    if (active !== null && e.pointerId !== active) return;
    set(e);
  });
  const up = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    set(e);
    active = null;
    input.down = false;
    input.released = true;
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    if (!unlocked) { unlocked = true; onFirstGesture(); }
    if (!e.repeat) input.keysPressed.add(e.key);
    if (e.key === "Backspace") e.preventDefault();
  });
}

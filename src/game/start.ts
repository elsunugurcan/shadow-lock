// obj_start: title, a demo piece that spins down and clicks into its shadow, shapes drifting in the back.
import { Gfx } from "../engine/gfx";
import { keyPressed } from "../engine/input";
import { play as sfx } from "../engine/audio";
import { random, randomRange, rgb } from "../engine/math";
import { CIRCLE, COL, SHAPES, SHAPE_COLS, SL_H, SL_W, S, goto, type Shape } from "./state";
import { button, drawBackground, drawOverlay, drawPiece, drawRing, drawShape, drawShapeOutline, drawSocket, easeBack, glow, lightBeam, text, textDrop } from "./draw";

type Floater = { shape: Shape; x: number; y: number; vy: number; a: number; va: number; sc: number; col: number };

export class Start {
  t = 0;
  demoAng = 0;
  demoShape = SHAPES[6];
  lockFx = 0;
  wasLocked = false;
  go = false;
  floaters: Floater[] = [];

  constructor() {
    for (let i = 0; i < 7; i++) {
      this.floaters.push({
        shape: SHAPES[i % SHAPES.length], x: random(SL_W), y: random(SL_H), vy: randomRange(12, 34),
        a: random(360), va: randomRange(-25, 25), sc: randomRange(36, 80), col: SHAPE_COLS[i % SHAPE_COLS.length],
      });
    }
  }

  step(dt: number) {
    this.t += dt;
    this.lockFx = Math.max(0, this.lockFx - dt * 2);
    for (const f of this.floaters) {
      f.y -= f.vy * dt;
      f.a += f.va * dt;
      if (f.y < -120) {
        f.y = SL_H + 120;
        f.x = random(SL_W);
      }
    }
    // demo piece spins down and clicks into its shadow
    const cyc = this.t % 3.2;
    const locked = cyc >= 2.2;
    this.demoAng = locked ? 36 : (1 - Math.pow(1 - cyc / 2.2, 3)) * 360 + 36;
    if (locked && !this.wasLocked) this.lockFx = 1;
    this.wasLocked = locked;

    if (keyPressed("Enter", " ")) this.go = true;
    if (this.go) {
      this.go = false;
      sfx("snd_click");
      goto("game");
    }
  }

  draw(g: Gfx) {
    const t = this.t;
    drawBackground(g, t);
    for (const f of this.floaters) {
      drawShape(g, f.shape.pts, f.x, f.y, f.sc, f.a, f.col, 0.07);
      drawShapeOutline(g, f.shape.pts, f.x, f.y, f.sc, f.a, f.col, 0.12, 2);
    }

    textDrop(g, SL_W * 0.5, 235, "SHADOW", 0, COL.text, t - 0.2, 1.3);
    textDrop(g, SL_W * 0.5, 335, "LOCK", 0, COL.gold, t - 0.7, 1.3);

    const cx = SL_W * 0.5, cy = 650;
    const cyc = t % 3.2;
    const locked = cyc >= 2.2;
    const intro = easeBack((t - 0.4) / 0.5);

    lightBeam(g, cx, 60, 290, cy + 120, 0.09);

    if (t > 0.4) {
      glow(g, cx + 12, cy + 36, 6.6 * intro, 0x000000, 0.55);
      drawPiece(g, CIRCLE, cx, cy + 14, 200 * intro, 0, rgb(30, 22, 52), 1);
      drawPiece(g, CIRCLE, cx, cy, 200 * intro, t * 3, rgb(74, 58, 112), 1);
      drawSocket(g, this.demoShape.pts, cx, cy, 128 * intro, 36, locked ? COL.good : COL.dim, locked ? 1 : 0.55, this.lockFx);

      const lift = locked ? 0 : 150 * Math.pow(1 - cyc / 2.2, 2);
      const q = this.lockFx * this.lockFx;
      const sx = 1 + 0.14 * q * Math.cos(this.lockFx * 14), sy = 1 - 0.14 * q * Math.cos(this.lockFx * 14);
      if (!locked) drawShape(g, this.demoShape.pts, cx + 8 + lift * 0.12, cy + 12 + lift * 0.2, 120 * intro, this.demoAng, 0x000000, 0.3);
      g.additive(true);
      glow(g, cx, cy - lift, 4.4, SHAPE_COLS[2], 0.2 + 0.3 * this.lockFx);
      g.additive(false);
      drawPiece(g, this.demoShape.pts, cx, cy - lift, 120 * intro, this.demoAng, SHAPE_COLS[2], 1, sx, sy);
      if (this.lockFx > 0) {
        g.additive(true);
        drawRing(g, cx, cy, 120 + (1 - this.lockFx) * 260, 30 * this.lockFx + 4, COL.gold, 0.7 * q);
        g.additive(false);
      }
    }

    const ta = Math.min(1, Math.max(0, (t - 1.2) * 2));
    text(g, SL_W * 0.5, 925, "Tap when the shape", 2, COL.text, 0.8 * ta);
    text(g, SL_W * 0.5, 965, "lines up with its shadow", 2, COL.text, 0.8 * ta);

    const bk = easeBack((t - 1.0) / 0.5);
    if (t > 1.0) {
      const pulse = bk * (1 + 0.03 * Math.sin(t * 4));
      if (button(g, SL_W * 0.5, 1080, 380 * pulse, 116 * pulse, "PLAY", COL.gold, t > 1.3, t)) this.go = true;
    }
    if (S.best > 0) text(g, SL_W * 0.5, 1200, "BEST  " + S.best, 2, COL.text, 0.9 * ta);

    drawOverlay(g, t);
  }
}

// obj_over: result, score count-up, retry / menu. Confetti when something went well, broken bits otherwise.
import { Gfx } from "../engine/gfx";
import { keyPressed } from "../engine/input";
import { play as sfx } from "../engine/audio";
import { dsin, irandom, random, randomRange, rgb } from "../engine/math";
import { COL, SHAPES, SHAPE_COLS, SL_H, SL_W, S, goto } from "./state";
import { button, drawBackground, drawOverlay, drawPiece, drawRotRect, easeBack, glow, text, textDrop } from "./draw";

type Bit = { x: number; y: number; vx: number; vy: number; a: number; va: number; w: number; h: number; ph: number; col: number };

export class Over {
  t = 0;
  shown = 0;
  action = 0;
  tickTimer = 0;
  bits: Bit[] = [];
  celebrate = S.won || S.newBest;

  constructor() {
    if (S.won) sfx("snd_level");
    for (let i = 0; i < (this.celebrate ? 46 : 14); i++) this.addBit(randomRange(-SL_H, 0));
  }
  addBit(y: number) {
    this.bits.push({
      x: random(SL_W), y, vx: randomRange(-40, 40), vy: randomRange(140, 320),
      a: random(360), va: randomRange(-300, 300), w: randomRange(10, 22), h: randomRange(8, 16),
      ph: random(6), col: this.celebrate ? SHAPE_COLS[irandom(SHAPE_COLS.length - 1)] : COL.dim,
    });
  }

  step(dt: number) {
    this.t += dt;
    const t = this.t;
    if (t > 0.6 && this.shown < S.score) {
      this.shown = Math.min(S.score, this.shown + (Math.max(1, S.score) * dt) / 0.9);
      this.tickTimer -= dt;
      if (this.tickTimer <= 0) {
        this.tickTimer = 0.06;
        sfx("snd_click", 1.2 + (0.6 * this.shown) / Math.max(1, S.score), 0.35);
      }
    }
    for (const b of this.bits) {
      b.x += (b.vx + Math.sin(t * 2 + b.ph) * 60) * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      if (b.y > SL_H + 40) {
        b.y = -40;
        b.x = random(SL_W);
      }
    }
    if (keyPressed("Backspace", "Escape")) this.action = 2;
    if (this.action !== 0) {
      sfx("snd_click");
      goto(this.action === 1 ? "game" : "start");
      this.action = 0;
    }
  }

  draw(g: Gfx) {
    const t = this.t;
    drawBackground(g, t);
    for (const b of this.bits) {
      // fake a flip by squeezing the height
      const flip = this.celebrate ? Math.abs(Math.sin(t * 5 + b.ph)) : 1;
      drawRotRect(g, b.x, b.y, b.w, b.h * Math.max(0.15, flip), b.a, b.col, this.celebrate ? 0.9 : 0.35);
    }

    const k0 = Math.min(1, Math.max(0, t - 0.8)) * 0.8;
    if (S.won) {
      textDrop(g, SL_W * 0.5, 230, "ALL CLEAR!", 0, COL.gold, t - 0.1, 1);
      text(g, SL_W * 0.5, 315, "every shadow locked", 2, COL.text, k0);
    } else {
      textDrop(g, SL_W * 0.5, 230, "GAME OVER", 0, COL.bad, t - 0.1, 1);
      text(g, SL_W * 0.5, 315, "reached level " + S.levelReached, 2, COL.text, k0);
    }

    const sh = SHAPES[S.won ? 6 : 4];
    const k = easeBack((t - 0.3) / 0.5);
    if (t > 0.3) {
      const a = S.won ? t * 40 : 160 + dsin(t * 90) * 8;
      const bob = dsin(t * 70) * 10;
      const pc = S.won ? COL.gold : rgb(120, 110, 150);
      glow(g, SL_W * 0.5 + 10, 640, 3.4 - bob * 0.02, 0x000000, 0.4);
      if (S.won) {
        g.additive(true);
        glow(g, SL_W * 0.5, 510 + bob, 6 + 0.4 * Math.sin(t * 3), COL.gold, 0.35);
        g.additive(false);
      }
      drawPiece(g, sh.pts, SL_W * 0.5, 510 + bob, 112 * k, a, pc, 1);
      if (!S.won) {
        // crack
        g.setColour(COL.shadow);
        g.setAlpha(0.8);
        const cx = SL_W * 0.5, cy = 510 + bob;
        g.line(cx - 30, cy - 50, cx + 4, cy - 8, 4);
        g.line(cx + 4, cy - 8, cx - 16, cy + 20, 4);
        g.line(cx - 16, cy + 20, cx + 22, cy + 60, 4);
        g.setAlpha(1);
      }
    }

    const ka = Math.min(1, Math.max(0, (t - 0.5) * 3));
    text(g, SL_W * 0.5, 725, "SCORE", 2, COL.dim, ka);
    const done = this.shown >= S.score;
    text(g, SL_W * 0.5, 800, String(Math.floor(this.shown)), 0, COL.text, ka, "center", done ? 1 + 0.08 * Math.max(0, Math.sin(t * 3)) * (S.newBest ? 1 : 0) : 1.08);
    if (S.newBest) {
      if (done) text(g, SL_W * 0.5, 885, "NEW BEST!", 1, COL.gold, 0.7 + 0.3 * Math.sin(t * 6), "center", 1 + 0.05 * Math.sin(t * 6));
    } else {
      text(g, SL_W * 0.5, 885, "BEST  " + S.best, 2, COL.text, 0.9 * ka);
    }

    const b1 = easeBack((t - 0.9) / 0.4), b2 = easeBack((t - 1.05) / 0.4);
    if (t > 0.9 && button(g, SL_W * 0.5, 1020, 390 * b1, 108 * b1, "RETRY", COL.gold, t > 1.2, t)) this.action = 1;
    if (t > 1.05 && button(g, SL_W * 0.5, 1155, 390 * b2, 108 * b2, "MENU", COL.good, t > 1.2, t + 1.3)) this.action = 2;

    drawOverlay(g, t);
  }
}

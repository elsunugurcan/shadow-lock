// obj_game: a shape spins down towards its carved shadow. Tap to slam it in; close enough locks, otherwise it shatters.
import { Gfx } from "../engine/gfx";
import { input, keyPressed } from "../engine/input";
import { play as sfx } from "../engine/audio";
import { choose, clamp, css, dcos, dsin, irandom, lerp, mergeColour, random, randomRange, rgb, C_WHITE } from "../engine/math";
import { CIRCLE, COL, HEART, LEVELS, SHAPES, SHAPE_COLS, SL_H, SL_W, S, angleErr, goto, saveBest, type LevelCfg, type Shape } from "./state";
import { drawBackground, drawOverlay, drawPiece, drawRing, drawShape, drawShapeOutline, drawSocket, easeBack, glow, lightBeam, text, xform } from "./draw";

const C_BLACK = 0x000000;
type State = "banner" | "fall" | "slam" | "result";
type Part = { kind: 0 | 1; x: number; y: number; vx: number; vy: number; life: number; col: number; r: number };
type Shard = { x: number; y: number; ax: number; ay: number; bx: number; by: number; cx: number; cy: number; vx: number; vy: number; rot: number; vrot: number; life: number; col: number };

export class Game {
  level = 1;
  cfg: LevelCfg = LEVELS[0];
  hp = 3;
  points = 0;
  dispPoints = 0;
  scorePop = 0;
  combo = 0;
  matched = 0;
  barFill = 0;
  hpAnim = [0, 0, 0];

  sockX = SL_W * 0.5;
  sockY = 960;
  startY = 260;
  size = 118;

  state: State = "banner";
  timer = 1.6;
  bannerLen = 1.6;
  t = 0;
  shake = 0;
  flash = 0;
  flashCol = C_WHITE;
  freeze = 0;
  squash = 0;
  spawnT = 1;
  rays = 0;
  plateKick = 0;

  shape: Shape = SHAPES[0];
  col = SHAPE_COLS[0];
  ang = 0;
  sockAng = 0;
  dir = 1;
  prog = 0;
  sy = this.startY;
  slamFrom = 0;
  slamT = 0;
  err = 0;
  hit = false;
  perfect = false;
  lastShape = -1;
  shattered = false;

  parts: Part[] = [];
  shards: Shard[] = [];
  rings: { x: number; y: number; r: number; spd: number; w: number; life: number; col: number }[] = [];
  popups: { str: string; y: number; life: number; col: number }[] = [];
  ghosts: { y: number; a: number; life: number }[] = [];
  ghostTimer = 0;

  spawn() {
    let i = irandom(this.cfg.shapes - 1);
    if (i === this.lastShape) i = (i + 1 + irandom(this.cfg.shapes - 2)) % this.cfg.shapes;
    this.lastShape = i;
    this.shape = SHAPES[i];
    this.col = SHAPE_COLS[irandom(SHAPE_COLS.length - 1)];
    this.ang = random(360);
    this.sockAng = irandom(11) * 30;
    this.dir = this.cfg.flip && irandom(1) === 0 ? -1 : 1;
    this.prog = 0;
    this.sy = this.startY;
    this.hit = false;
    this.shattered = false;
    this.spawnT = 0;
    this.squash = 0;
    this.ghosts = [];
    this.state = "fall";
    sfx("snd_whoosh", randomRange(1.3, 1.5), 0.25);
  }

  sparks(x: number, y: number, col: number, count: number, spd: number) {
    for (let k = 0; k < count; k++) {
      const a = random(360), v = randomRange(spd * 0.25, spd);
      this.parts.push({ kind: 0, x, y, vx: dcos(a) * v, vy: dsin(a) * v - 120, life: randomRange(0.45, 1.0), col, r: randomRange(0.25, 0.6) });
    }
  }
  dust(x: number, y: number, count: number) {
    for (let k = 0; k < count; k++) {
      const side = choose(-1, 1);
      this.parts.push({ kind: 1, x: x + side * randomRange(40, this.size), y: y + randomRange(-20, 40), vx: side * randomRange(120, 380), vy: randomRange(-90, 30), life: randomRange(0.5, 0.9), col: COL.dim, r: randomRange(0.5, 1.1) });
    }
  }
  ring(x: number, y: number, col: number, speed: number, w: number) {
    this.rings.push({ x, y, r: this.size * 0.7, spd: speed, w, life: 1, col });
  }
  /** break the piece into its fan triangles and throw them */
  shatter() {
    const { sockX, sy } = this;
    const p = xform(this.shape.pts, sockX, sy, this.size, this.ang, 1, 1), n = p.length;
    for (let i = 0; i < n; i += 2) {
      const m = (i + 2) % n;
      const mx = (sockX + p[i] + p[m]) / 3, my = (sy + p[i + 1] + p[m + 1]) / 3;
      const d = Math.atan2(my - sy, mx - sockX);
      const v = randomRange(260, 620);
      this.shards.push({
        x: mx, y: my, ax: sockX - mx, ay: sy - my, bx: p[i] - mx, by: p[i + 1] - my, cx: p[m] - mx, cy: p[m + 1] - my,
        vx: Math.cos(d) * v, vy: Math.sin(d) * v - 260, rot: 0, vrot: randomRange(-540, 540), life: randomRange(0.9, 1.4), col: this.col,
      });
    }
    this.shattered = true;
  }
  popup(str: string, col: number) { this.popups.push({ str, y: this.sockY - 250, life: 1.0, col }); }

  step(rdt: number) {
    this.t += rdt;
    // hit stop
    let dt = rdt;
    if (this.freeze > 0) {
      this.freeze -= rdt;
      dt = rdt * 0.05;
    }

    this.shake = Math.max(0, this.shake - rdt * 45);
    this.flash = Math.max(0, this.flash - rdt * 2.5);
    this.squash = Math.max(0, this.squash - dt * 4);
    this.rays = Math.max(0, this.rays - dt * 1.6);
    this.plateKick = Math.max(0, this.plateKick - dt * 5);
    this.scorePop = Math.max(0, this.scorePop - rdt * 4);
    this.spawnT = Math.min(1, this.spawnT + dt / 0.3);
    this.dispPoints = lerp(this.dispPoints, this.points, 1 - Math.pow(0.0005, rdt));
    if (Math.abs(this.points - this.dispPoints) < 0.6) this.dispPoints = this.points;
    this.barFill = lerp(this.barFill, this.matched / this.cfg.need, 1 - Math.pow(0.001, rdt));
    for (let i = 0; i < 3; i++) this.hpAnim[i] = Math.max(0, this.hpAnim[i] - rdt * 2.2);

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.kind === 0) {
        p.vy += 1100 * dt;
        p.vx *= Math.pow(0.25, dt);
      } else {
        p.vx *= Math.pow(0.02, dt);
        p.vy *= Math.pow(0.05, dt);
        p.r += dt * 1.4;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      s.vy += 1700 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vrot * dt;
      if (s.life <= 0 || s.y > SL_H + 200) this.shards.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.life -= dt * 1.9;
      rg.r += rg.spd * dt * (0.4 + rg.life);
      if (rg.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pp = this.popups[i];
      pp.life -= dt;
      pp.y -= 80 * dt * pp.life;
      if (pp.life <= 0) this.popups.splice(i, 1);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].life -= dt * 4.5;
      if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
    }

    if (keyPressed("Backspace", "Escape")) goto("start");
    if (S.fadeOut) return;

    // tap, click, or space / enter on a keyboard
    const tapped = input.pressed || keyPressed(" ", "Enter");
    const cfg = this.cfg;

    switch (this.state) {
      case "banner":
        this.timer -= dt;
        if (this.timer <= 0 || (tapped && this.timer < this.bannerLen - 0.6)) this.spawn();
        break;

      case "fall": {
        let spd = cfg.rot * this.dir;
        if (cfg.pulse > 0) spd *= 1 + cfg.pulse * Math.sin(this.t * 3.2);
        this.ang += spd * dt;
        this.sockAng += cfg.sockRot * dt;
        this.prog += dt / cfg.fall;
        this.sy = lerp(this.startY, this.sockY, this.prog * this.prog * 0.35 + this.prog * 0.65);

        this.ghostTimer -= dt;
        if (this.ghostTimer <= 0) {
          this.ghostTimer = 0.045;
          this.ghosts.push({ y: this.sy, a: this.ang, life: 1 });
        }

        if (tapped) {
          this.err = angleErr(this.ang, this.sockAng, this.shape.sym);
          this.hit = this.err <= cfg.tol;
          this.slamFrom = this.sy;
          this.slamT = 0;
          this.state = "slam";
          sfx("snd_whoosh", 1, 0.5);
        } else if (this.prog >= 1) {
          this.err = 999;
          this.hit = false;
          this.slamFrom = this.sockY;
          this.slamT = 1;
          this.state = "slam";
        }
        break;
      }

      case "slam":
        this.slamT += dt / 0.13;
        this.sy = lerp(this.slamFrom, this.sockY, Math.min(1, this.slamT * this.slamT));
        this.ghosts.push({ y: this.sy, a: this.ang, life: 0.8 });
        if (this.slamT >= 1) this.land();
        break;

      case "result":
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.hp <= 0 || (this.matched >= cfg.need && this.level >= LEVELS.length)) {
            S.won = this.hp > 0;
            S.score = this.points + (S.won ? this.hp * 100 : 0);
            S.levelReached = this.level;
            S.newBest = S.score > S.best;
            if (S.newBest) {
              S.best = S.score;
              saveBest();
            }
            goto("over");
          } else if (this.matched >= cfg.need) {
            this.level++;
            this.cfg = LEVELS[this.level - 1];
            this.matched = 0;
            this.barFill = 0;
            this.lastShape = -1;
            if (this.hp < 3) {
              this.hpAnim[this.hp] = 1;
              this.hp++;
            }
            sfx("snd_level");
            this.state = "banner";
            this.bannerLen = 2.0;
            this.timer = this.bannerLen;
          } else {
            this.spawn();
          }
        }
        break;
    }
  }

  private land() {
    const cfg = this.cfg, { sockX, sockY } = this;
    this.sy = sockY;
    this.squash = 1;
    this.plateKick = 1;
    this.dust(sockX, sockY + this.size * 0.6, this.hit ? 8 : 14);
    if (this.hit) {
      const period = 360 / this.shape.sym;
      this.ang = this.sockAng + Math.round((this.ang - this.sockAng) / period) * period;
      this.perfect = this.err <= cfg.tol * 0.35;
      this.combo++;
      const mult = 1 + Math.min(4, Math.floor(this.combo / 3));
      const gain = (this.perfect ? 25 : 10) * mult;
      this.points += gain;
      this.scorePop = 1;
      this.matched++;
      this.sparks(sockX, sockY, this.col, this.perfect ? 34 : 16, this.perfect ? 900 : 600);
      if (this.perfect) this.sparks(sockX, sockY, COL.gold, 18, 700);
      this.ring(sockX, sockY, this.perfect ? COL.gold : this.col, this.perfect ? 900 : 650, this.perfect ? 46 : 30);
      if (this.perfect) {
        this.ring(sockX, sockY, C_WHITE, 520, 22);
        this.rays = 1;
      }
      this.popup((this.perfect ? "PERFECT +" : "+") + gain, this.perfect ? COL.gold : COL.good);
      if (mult > 1) this.popup("x" + mult, COL.text);
      sfx(this.perfect ? "snd_perfect" : "snd_lock", 1 + Math.min(this.combo, 10) * 0.03);
      this.flash = this.perfect ? 0.3 : 0.12;
      this.flashCol = C_WHITE;
      this.shake = this.perfect ? 12 : 6;
      this.freeze = this.perfect ? 0.09 : 0.05;
      this.timer = 0.6;
    } else {
      this.hp--;
      this.hpAnim[this.hp] = 1;
      this.combo = 0;
      this.shatter();
      this.sparks(sockX, sockY, COL.bad, 20, 700);
      this.ring(sockX, sockY, COL.bad, 700, 34);
      this.popup(this.err > 900 ? "TOO LATE" : "MISS", COL.bad);
      sfx("snd_shatter", randomRange(0.9, 1.1));
      sfx("snd_fail", 1, 0.7);
      this.flash = 0.45;
      this.flashCol = COL.bad;
      this.shake = 20;
      this.freeze = 0.12;
      this.timer = this.hp <= 0 ? 1.3 : 0.85;
    }
    this.state = "result";
  }

  draw(g: Gfx) {
    const ctx = g.ctx, t = this.t, cfg = this.cfg, { sockX, sockY, size } = this;
    drawBackground(g, t);

    const playing = this.state !== "banner";
    const pop = easeBack(this.spawnT);

    // light falling on the plate
    lightBeam(g, sockX, 70, 300, sockY + 120, 0.1);
    g.additive(true);
    glow(g, sockX, -10, 5, C_WHITE, 0.16 + 0.03 * Math.sin(t * 2.3));
    g.additive(false);

    const shx = randomRange(-this.shake, this.shake), shy = randomRange(-this.shake, this.shake);
    ctx.save();
    ctx.translate(shx, shy);

    // plate
    const py = sockY + this.plateKick * this.plateKick * 10;
    glow(g, sockX + 14, py + 40, 7.6, C_BLACK, 0.55);
    drawPiece(g, CIRCLE, sockX, py + 16, 232, 0, rgb(30, 22, 52), 1);
    drawPiece(g, CIRCLE, sockX, py, 232, t * 3, rgb(74, 58, 112), 1);
    drawShapeOutline(g, CIRCLE, sockX, py, 196, 0, C_BLACK, 0.25, 3);
    drawShapeOutline(g, CIRCLE, sockX, py + 2, 196, 0, C_WHITE, 0.08, 2);
    for (let i = 0; i < 12; i++) {
      const ta = i * 30;
      const tx = sockX + dcos(ta) * 212, ty = py + dsin(ta) * 212;
      g.setColour(C_BLACK);
      g.setAlpha(0.35);
      g.circle(tx, ty, 5, false);
      g.setColour(C_WHITE);
      g.setAlpha(0.18);
      g.circle(tx - 1, ty - 1.5, 2, false);
    }
    g.setAlpha(1);

    if (playing) {
      const aligned = this.state === "fall" && cfg.hint && angleErr(this.ang, this.sockAng, this.shape.sym) <= cfg.tol;
      let ringCol = COL.dim, ringA = 0.55, gl = 0;
      if (aligned) { ringCol = COL.good; ringA = 1; gl = 0.7 + 0.3 * Math.sin(t * 18); }
      if (this.state === "result") {
        ringCol = this.hit ? COL.good : COL.bad;
        ringA = 1;
        gl = clamp(this.timer * 2, 0, 1);
      }
      drawSocket(g, this.shape.pts, sockX, py, size * 1.07 * pop, this.sockAng, ringCol, ringA, gl);

      // drop guide
      g.setColour(COL.dim);
      for (let gy = this.startY + 40; gy < sockY - 250; gy += 40) {
        g.setAlpha(0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 5 - gy * 0.02)));
        g.line(sockX, gy, sockX, gy + 16, 3);
      }
      g.setAlpha(1);

      if (!this.shattered) {
        const landed = this.state === "result";
        const near = clamp((this.sy - this.startY) / (sockY - this.startY), 0, 1);

        // shadow the piece throws on the plate, tightens as it gets close
        if (!landed) drawShape(g, this.shape.pts, sockX + 26 * (1 - near) + 6, py + 40 * (1 - near) + 8, size * (1.25 - 0.2 * near), this.ang, C_BLACK, 0.1 + 0.25 * near * near);

        for (const gh of this.ghosts) drawShape(g, this.shape.pts, sockX, gh.y, size * pop, gh.a, this.col, 0.1 * gh.life);

        let sx = 1, sy2 = 1, sc = size * pop;
        if (this.state === "slam") { sx = 0.9; sy2 = 1.14; }
        if (landed) {
          const q = this.squash * this.squash, wv = Math.cos(this.squash * 14);
          sx = 1 + 0.16 * q * wv;
          sy2 = 1 - 0.16 * q * wv;
          sc = size * (1 + 0.05 * q);
        }

        g.additive(true);
        glow(g, sockX, this.sy, 4.6 + 0.3 * Math.sin(t * 6), this.col, landed ? 0.35 * clamp(this.timer * 3, 0, 1) : 0.22);
        g.additive(false);

        if (!landed) drawShape(g, this.shape.pts, sockX + 8, this.sy + 14, sc, this.ang, C_BLACK, 0.28, sx, sy2);
        drawPiece(g, this.shape.pts, sockX, this.sy, sc, this.ang, this.col, 1, sx, sy2);

        if (landed && this.hit) {
          // white pop that fades off the piece
          const w = clamp((this.timer - 0.35) / 0.25, 0, 1);
          if (w > 0) {
            g.additive(true);
            drawShape(g, this.shape.pts, sockX, this.sy, sc, this.ang, C_WHITE, 0.7 * w, sx, sy2);
            g.additive(false);
          }
        }
      }
    }

    g.additive(true);
    if (this.rays > 0) {
      const rl = 520 * (1.2 - this.rays * 0.4);
      const gr = ctx.createRadialGradient(sockX, sockY, 0, sockX, sockY, rl);
      gr.addColorStop(0, css(COL.gold, 0.55 * this.rays));
      gr.addColorStop(1, css(COL.gold, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const ra = i * 30 + t * 40, wdt = 7 + (i % 3) * 4;
        ctx.moveTo(sockX, sockY);
        ctx.lineTo(sockX + dcos(ra - wdt) * rl, sockY + dsin(ra - wdt) * rl);
        ctx.lineTo(sockX + dcos(ra + wdt) * rl, sockY + dsin(ra + wdt) * rl);
        ctx.closePath();
      }
      ctx.fill();
    }
    for (const rg of this.rings) drawRing(g, rg.x, rg.y, rg.r, rg.w * rg.life + 4, rg.col, 0.75 * rg.life * rg.life);
    g.additive(false);

    for (const p of this.parts) if (p.kind === 1) glow(g, p.x, p.y, p.r, p.col, 0.3 * clamp(p.life * 2, 0, 1));
    g.additive(true);
    for (const p of this.parts) {
      if (p.kind === 0) {
        const k = clamp(p.life * 2, 0, 1);
        glow(g, p.x, p.y, p.r * k, p.col, 0.9);
        glow(g, p.x, p.y, p.r * k * 0.35, C_WHITE, 0.9);
      }
    }
    g.additive(false);

    for (const s of this.shards) {
      const c = dcos(s.rot), sn = dsin(s.rot);
      const al = clamp(s.life * 2, 0, 1);
      const x1 = s.x + s.ax * c - s.ay * sn, y1 = s.y + s.ax * sn + s.ay * c;
      const x2 = s.x + s.bx * c - s.by * sn, y2 = s.y + s.bx * sn + s.by * c;
      const x3 = s.x + s.cx * c - s.cy * sn, y3 = s.y + s.cx * sn + s.cy * c;
      const gr = ctx.createLinearGradient(x1, y1, (x2 + x3) / 2, (y2 + y3) / 2);
      gr.addColorStop(0, css(mergeColour(s.col, C_WHITE, 0.35), al));
      gr.addColorStop(1, css(mergeColour(s.col, C_BLACK, 0.15), al));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
      g.setColour(C_WHITE);
      g.setAlpha(al * 0.5);
      g.line(x2, y2, x3, y3, 2);
      g.setAlpha(1);
    }

    this.popups.forEach((pp, i) => {
      const pk = easeBack(clamp((1 - pp.life) * 5, 0, 1));
      text(g, sockX, pp.y - i * 60, pp.str, 1, pp.col, clamp(pp.life * 3, 0, 1), "center", 0.5 + 0.5 * pk);
    });

    ctx.restore();
    this.drawHud(g);
    drawOverlay(g, t);
  }

  private drawHud(g: Gfx) {
    const ctx = g.ctx, t = this.t, cfg = this.cfg;
    text(g, SL_W * 0.5, 100, String(Math.round(this.dispPoints)), 0, COL.text, 1, "center", 1 + 0.3 * this.scorePop * this.scorePop);
    text(g, 36, 64, "LEVEL " + this.level, 2, COL.dim, 1, "left");
    for (let i = 0; i < 3; i++) {
      const hx = SL_W - 52 - i * 52, hy = 64;
      const on = i < this.hp, an = this.hpAnim[i];
      const beat = on && this.hp === 1 ? 0.12 * Math.max(0, Math.sin(t * 9)) : 0;
      drawShape(g, HEART, hx + 2, hy + 4, 22, 0, C_BLACK, 0.35);
      if (on) {
        drawPiece(g, HEART, hx, hy, 22 * (1 + beat + 0.5 * an), 0, COL.bad, 1);
      } else {
        drawShape(g, HEART, hx, hy, 22, 0, COL.shadow, 0.8);
        if (an > 0) {
          g.additive(true);
          drawShape(g, HEART, hx, hy, 22 * (1 + (1 - an) * 1.6), 0, COL.bad, an * 0.8);
          g.additive(false);
        }
      }
    }

    const bw = 440, bx = (SL_W - bw) * 0.5, by = 168, bh = 18;
    g.setColour(C_BLACK);
    g.setAlpha(0.5);
    g.roundrect(bx - 3, by - 3, bx + bw + 3, by + bh + 3, bh + 6, bh + 6, false);
    g.setAlpha(1);
    const fillw = bw * clamp(this.barFill, 0, 1);
    if (fillw > bh) {
      g.setColour(COL.good);
      g.roundrect(bx, by, bx + fillw, by + bh, bh, bh, false);
      g.setColour(C_WHITE);
      g.setAlpha(0.35);
      g.roundrect(bx + 5, by + 3, bx + fillw - 5, by + 8, 5, 5, false);
      g.setAlpha(1);
      g.additive(true);
      glow(g, bx + fillw - 6, by + bh * 0.5, 0.7, COL.good, 0.6 + 0.2 * Math.sin(t * 7));
      g.additive(false);
    }
    g.setColour(C_BLACK);
    g.setAlpha(0.3);
    for (let i = 1; i < cfg.need; i++) g.line(bx + (bw * i) / cfg.need, by + 2, bx + (bw * i) / cfg.need, by + bh - 2, 2);
    g.setAlpha(1);

    if (this.combo >= 3) text(g, SL_W * 0.5, 228, "COMBO " + this.combo, 2, COL.gold, 1, "center", 1 + 0.06 * Math.sin(t * 12));

    if (this.state === "banner") {
      const e = this.bannerLen - this.timer;
      const kin = easeBack(e / 0.45);
      const kout = clamp(this.timer / 0.25, 0, 1);
      const slide = (1 - kin) * -500;
      g.setColour(C_BLACK);
      g.setAlpha(0.35 * kout * clamp(e * 4, 0, 1));
      g.rect(0, 440, SL_W, 760, false);
      g.setAlpha(1);
      text(g, SL_W * 0.5 + slide, 520, "LEVEL " + this.level, 0, COL.text, kout);
      text(g, SL_W * 0.5 - slide, 612, cfg.title, 1, COL.gold, kout);
      const lw = 260 * clamp((e - 0.3) / 0.4, 0, 1);
      g.setColour(COL.gold);
      g.setAlpha(kout);
      g.line(SL_W * 0.5 - lw, 660, SL_W * 0.5 + lw, 660, 3);
      g.setAlpha(1);
      const tip = ["Tap when the shape matches its shadow", "No more glow. Watch the direction!", "The shadow is turning too", "The spin speeds up and slows down"][this.level - 1];
      text(g, SL_W * 0.5, 710, tip, 2, COL.text, kout * clamp((e - 0.5) * 3, 0, 1));
    }

    if (this.flash > 0) {
      g.setColour(this.flashCol);
      g.setAlpha(this.flash * 0.6);
      g.rect(0, 0, SL_W, SL_H, false);
      g.setAlpha(1);
    }
    if (this.hp === 1) {
      const a = 0.16 + 0.08 * Math.sin(t * 9);
      const gr = ctx.createLinearGradient(0, SL_H - 260, 0, SL_H);
      gr.addColorStop(0, css(C_BLACK, a));
      gr.addColorStop(1, css(COL.bad, a));
      g.additive(true);
      ctx.fillStyle = gr;
      ctx.fillRect(0, SL_H - 260, SL_W, 260);
      g.additive(false);
    }
  }
}

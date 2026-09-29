// Port of the drawing half of scr_shadow_lock: pieces, sockets, bevels, glows, text, background, buttons.
import { Gfx, type Align } from "../engine/gfx";
import { clamp, css, dcos, dsin, lerp, mergeColour, pointInRect, C_WHITE } from "../engine/math";
import { input } from "../engine/input";
import { COL, S, SL_H, SL_W } from "./state";

const C_BLACK = 0x000000;
const RAD = Math.PI / 180;

export function easeBack(x: number) {
  x = clamp(x, 0, 1);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
}
export function easeBounce(x: number) {
  x = clamp(x, 0, 1);
  if (x < 1 / 2.75) return 7.5625 * x * x;
  if (x < 2 / 2.75) { x -= 1.5 / 2.75; return 7.5625 * x * x + 0.75; }
  if (x < 2.5 / 2.75) { x -= 2.25 / 2.75; return 7.5625 * x * x + 0.9375; }
  x -= 2.625 / 2.75;
  return 7.5625 * x * x + 0.984375;
}

/** rotate, then squash in screen space. returns flat [x, y, ...] in room coords */
export function xform(pts: number[], cx: number, cy: number, scale: number, ang: number, sx: number, sy: number) {
  const c = dcos(ang), s = dsin(ang), out = new Array<number>(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i] * scale, py = pts[i + 1] * scale;
    out[i] = cx + (px * c - py * s) * sx;
    out[i + 1] = cy + (px * s + py * c) * sy;
  }
  return out;
}

function path(ctx: CanvasRenderingContext2D, p: number[]) {
  ctx.beginPath();
  for (let i = 0; i < p.length; i += 2) {
    if (i === 0) ctx.moveTo(p[i], p[i + 1]); else ctx.lineTo(p[i], p[i + 1]);
  }
  ctx.closePath();
}

/** flat fill, used for ghosts / shadows */
export function drawShape(g: Gfx, pts: number[], cx: number, cy: number, scale: number, ang: number, col: number, alpha: number, sx = 1, sy = 1) {
  if (scale <= 0 || alpha <= 0) return;
  path(g.ctx, xform(pts, cx, cy, scale, ang, sx, sy));
  g.ctx.fillStyle = css(col, alpha);
  g.ctx.fill();
}

export function drawShapeOutline(g: Gfx, pts: number[], cx: number, cy: number, scale: number, ang: number, col: number, alpha: number, width: number, sx = 1, sy = 1) {
  if (scale <= 0 || alpha <= 0) return;
  const p = xform(pts, cx, cy, scale, ang, sx, sy), n = p.length;
  g.setColour(col);
  g.setAlpha(alpha);
  for (let i = 0; i < n; i += 2) {
    const m = (i + 2) % n;
    g.line(p[i], p[i + 1], p[m], p[m + 1], width);
    g.circle(p[i], p[i + 1], width * 0.5, false);
  }
  g.setAlpha(1);
}

/**
 * Edge band between the outline and a slightly smaller copy, shaded by which way the edge faces.
 * Light comes from the top left. inv flips it so the shape reads as a hole instead of a raised piece.
 */
export function drawBevel(g: Gfx, p: number[], cx: number, cy: number, inset: number, strength: number, inv: boolean) {
  const ctx = g.ctx, n = p.length, lx = -0.45, ly = -0.89;
  for (let i = 0; i < n; i += 2) {
    const m = (i + 2) % n;
    const ax = p[i], ay = p[i + 1], bx = p[m], by = p[m + 1];
    const dx = bx - ax, dy = by - ay;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    let lit = (dy / len) * lx + (-dx / len) * ly;
    if (inv) lit = -lit;
    const col = lit > 0 ? C_WHITE : C_BLACK;
    const al = Math.abs(lit) * strength * (lit > 0 ? 0.75 : 0.6);
    if (al <= 0.002) continue;
    const iax = cx + (ax - cx) * inset, iay = cy + (ay - cy) * inset;
    const ibx = cx + (bx - cx) * inset, iby = cy + (by - cy) * inset;
    const gr = ctx.createLinearGradient((ax + bx) / 2, (ay + by) / 2, (iax + ibx) / 2, (iay + iby) / 2);
    gr.addColorStop(0, css(col, al));
    gr.addColorStop(1, css(col, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(ibx, iby);
    ctx.lineTo(iax, iay);
    ctx.closePath();
    ctx.fill();
  }
}

/** the proper textured piece: material texture, lighter centre, bevelled edge */
export function drawPiece(g: Gfx, pts: number[], cx: number, cy: number, scale: number, ang: number, col: number, alpha: number, sx = 1, sy = 1) {
  if (scale <= 0) return;
  const ctx = g.ctx;
  const p = xform(pts, cx, cy, scale, ang, sx, sy);
  const cc = mergeColour(col, C_WHITE, 0.3), ce = mergeColour(col, C_BLACK, 0.1);
  let rmax = 0;
  for (let i = 0; i < pts.length; i += 2) rmax = Math.max(rmax, Math.hypot(pts[i], pts[i + 1]));
  const R = scale * rmax * Math.max(sx, sy);
  ctx.save();
  ctx.globalAlpha = alpha;
  path(ctx, p);
  const mat = S.tex.mat;
  if (mat) {
    ctx.clip();
    // texture coordinates follow the unit shape: u = 0.5 + x * 0.47
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.rotate(ang * RAD);
    ctx.scale(scale / (0.47 * mat.w), scale / (0.47 * mat.h));
    ctx.drawImage(mat.img, -mat.w / 2, -mat.h / 2);
    ctx.restore();
    ctx.globalCompositeOperation = "multiply";
  }
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
  gr.addColorStop(0, css(cc));
  gr.addColorStop(1, css(ce));
  ctx.fillStyle = gr;
  if (mat) ctx.fillRect(cx - R - 2, cy - R - 2, 2 * R + 4, 2 * R + 4);
  else ctx.fill();
  ctx.restore();
  drawBevel(g, p, cx, cy, 0.8, alpha, false);
}

/** carved slot in the plate */
export function drawSocket(g: Gfx, pts: number[], cx: number, cy: number, scale: number, ang: number, ringCol: number, ringAlpha: number, glow: number) {
  if (scale <= 0) return;
  const ctx = g.ctx, p = xform(pts, cx, cy, scale, ang, 1, 1);
  path(ctx, p);
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale);
  gr.addColorStop(0, css(COL.shadow, 0.97));
  gr.addColorStop(1, css(C_BLACK, 0.97));
  ctx.fillStyle = gr;
  ctx.fill();
  drawBevel(g, p, cx, cy, 0.84, 1, true);
  if (glow > 0) {
    g.additive(true);
    drawShapeOutline(g, pts, cx, cy, scale, ang, ringCol, 0.18 * glow, 22);
    drawShapeOutline(g, pts, cx, cy, scale, ang, ringCol, 0.3 * glow, 12);
    g.additive(false);
  }
  drawShapeOutline(g, pts, cx, cy, scale, ang, ringCol, ringAlpha, 4);
}

/** soft ring: bright at r, fading out over w on both sides */
export function drawRing(g: Gfx, x: number, y: number, r: number, w: number, col: number, alpha: number) {
  if (alpha <= 0 || r + w <= 0) return;
  const ctx = g.ctx, outer = r + w, inner = Math.max(0, r - w);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gr.addColorStop(inner / outer, css(col, 0));
  gr.addColorStop(r / outer, css(col, alpha));
  gr.addColorStop(1, css(col, 0));
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();
}

export function glow(g: Gfx, x: number, y: number, scale: number, col: number, alpha: number, xs = 1, ys = 1) {
  if (alpha <= 0 || scale <= 0) return;
  if (S.tex.glow) {
    g.sprite(S.tex.glow, x, y, scale * xs, scale * ys, 0, col, alpha);
  } else {
    g.setColour(col);
    g.setAlpha(alpha * 0.3);
    g.circle(x, y, 40 * scale, false);
    g.setAlpha(1);
  }
}

export function drawRotRect(g: Gfx, x: number, y: number, w: number, h: number, ang: number, col: number, alpha: number) {
  const ctx = g.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang * RAD);
  ctx.fillStyle = css(col, alpha);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---- text. size: 0 big, 1 mid, 2 small (Poppins Bold 68 / 40 / 26 pt at 96 dpi)
const FONT_PX = [90.67, 53.33, 34.67];

export function text(g: Gfx, x: number, y: number, str: string, size: 0 | 1 | 2, col: number, alpha: number, halign: Align = "center", scale = 1) {
  if (alpha <= 0 || scale === 0) return;
  const off = size === 2 ? 2 : 4;
  g.setColour(C_BLACK);
  g.setAlpha(alpha * 0.4);
  g.text(x + off * 0.5, y + off, str, FONT_PX[size], halign, scale, 0);
  g.setColour(col);
  g.setAlpha(alpha);
  g.text(x, y, str, FONT_PX[size], halign, scale, 0);
  g.setAlpha(1);
}

/** letters drop in one after another, then bob a little */
export function textDrop(g: Gfx, x: number, y: number, str: string, size: 0 | 1 | 2, col: number, t: number, scale: number) {
  g.setFont(FONT_PX[size]);
  const chars = [...str];
  const widths = chars.map((ch) => g.textWidth(ch) * scale);
  let px = x - widths.reduce((a, b) => a + b, 0) * 0.5;
  chars.forEach((ch, i0) => {
    const i = i0 + 1, w = widths[i0];
    const lt = t - (i - 1) * 0.07;
    if (lt > 0) {
      const k = easeBounce(lt / 0.7);
      const yy = y - (1 - k) * 420 + dsin(t * 120 + i * 50) * 4 * clamp(lt - 0.7, 0, 1);
      text(g, px + w * 0.5, yy, ch, size, col, clamp(lt * 6, 0, 1), "center", scale);
    }
    px += w;
  });
}

/** beam of light falling on the plate (additive trapezoid) */
export function lightBeam(g: Gfx, cx: number, topHalf: number, botHalf: number, bottom: number, alpha: number) {
  const ctx = g.ctx;
  const gr = ctx.createLinearGradient(0, -20, 0, bottom);
  gr.addColorStop(0, css(C_WHITE, alpha));
  gr.addColorStop(1, css(C_WHITE, 0));
  g.additive(true);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, -20);
  ctx.lineTo(cx + topHalf, -20);
  ctx.lineTo(cx + botHalf, bottom);
  ctx.lineTo(cx - botHalf, bottom);
  ctx.closePath();
  ctx.fill();
  g.additive(false);
}

export function drawBackground(g: Gfx, t: number) {
  g.setAlpha(1);
  if (S.tex.bg) {
    g.stretched(S.tex.bg, -10, -10 + dsin(t * 8) * 8, SL_W + 20, SL_H + 20);
  } else {
    const gr = g.ctx.createLinearGradient(0, 0, 0, SL_H);
    gr.addColorStop(0, css(COL.bgTop));
    gr.addColorStop(1, css(COL.bgBot));
    g.ctx.fillStyle = gr;
    g.ctx.fillRect(0, 0, SL_W, SL_H);
  }

  g.additive(true);
  if (S.tex.haze) {
    g.tiledExt(S.tex.haze, t * 9, t * -5, 4, C_WHITE, 0.1, SL_W, SL_H);
    g.tiledExt(S.tex.haze, t * -14 + 300, t * 4 + 200, 2.6, COL.gold, 0.04, SL_W, SL_H);
  }
  // stars
  for (let i = 0; i < 34; i++) {
    const sx = (i * 197.3 + 40) % SL_W;
    const sy = (i * i * 31.7 + i * 89) % (SL_H * 0.8);
    const tw = 0.35 + 0.35 * Math.sin(t * (1.2 + (i % 4) * 0.5) + i * 2.1);
    glow(g, sx, sy, 0.1 + (i % 3) * 0.05, C_WHITE, tw);
  }
  // dust floating up
  for (let i = 0; i < 18; i++) {
    const px = (i * 173.3 + dsin(t * 14 + i * 40) * 40) % SL_W;
    const py = SL_H - ((t * (16 + (i % 5) * 7) + i * 211.7) % (SL_H + 60));
    glow(g, px, py, 0.18 + (i % 4) * 0.08, COL.dim, 0.22);
  }
  g.additive(false);
}

/** vignette + grain + room fade, drawn last */
export function drawOverlay(g: Gfx, t: number) {
  g.stretched(S.tex.vig, 0, 0, SL_W, SL_H);
  if (S.tex.grain) {
    const j = Math.floor(t * 14);
    g.tiledExt(S.tex.grain, (j * 37) % 128, (j * 91) % 128, 2, C_WHITE, 0.045, SL_W, SL_H);
  }
  if (S.fade > 0) {
    g.setColour(C_BLACK);
    g.setAlpha(S.fade);
    g.rect(-20, -20, SL_W + 20, SL_H + 20, false);
    g.setAlpha(1);
  }
}

export function button(g: Gfx, cx: number, cy: number, w: number, h: number, label: string, col: number, enabled: boolean, t: number) {
  const x1 = cx - w * 0.5, y1 = cy - h * 0.5, x2 = cx + w * 0.5, y2 = cy + h * 0.5;
  const over = pointInRect(input.x, input.y, x1, y1, x2, y2);
  const down = over && input.down;
  const off = down ? 6 : 0;
  const r = h * 0.5;

  g.setAlpha(0.4);
  g.setColour(C_BLACK);
  g.roundrect(x1 + 4, y1 + 16, x2 + 4, y2 + 16, r, r, false);
  g.setAlpha(1);
  // side
  g.setColour(mergeColour(col, C_BLACK, 0.45));
  g.roundrect(x1, y1 + 10, x2, y2 + 10, r, r, false);
  // face
  g.setColour(col);
  g.roundrect(x1, y1 + off, x2, y2 + off, r, r, false);
  g.setColour(C_WHITE);
  g.setAlpha(0.28);
  g.roundrect(x1 + 14, y1 + off + 8, x2 - 14, y1 + off + h * 0.45, r * 0.6, r * 0.6, false);
  g.setAlpha(1);

  // shine sweeping across now and then
  const sw = (t % 2.6) / 0.6;
  if (sw < 1) {
    const sx = lerp(x1 + r, x2 - r, sw);
    g.additive(true);
    glow(g, sx, cy + off, 1, C_WHITE, 0.35 * Math.sin(sw * Math.PI), 0.7, h / 128);
    g.additive(false);
  }

  text(g, cx, cy + off + 2, label, 1, COL.shadow, 1, "center", clamp(h / 112, 0, 1.05));
  return enabled && !S.fadeOut && over && input.released;
}

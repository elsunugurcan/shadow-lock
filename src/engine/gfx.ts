// A thin GameMaker-flavoured drawing layer on top of Canvas 2D.
// Keeps the draw code of the original readable line by line: setColour / setAlpha / line / circle / roundrect ...
import { css, C_WHITE } from "./math";

export type Tex = { img: CanvasImageSource; w: number; h: number; ox: number; oy: number };
export type Align = "left" | "center" | "right";

export class Gfx {
  colour = C_WHITE;
  alpha = 1;
  font = "sans-serif";
  private tintCache = new Map<string, HTMLCanvasElement>();
  private patterns = new Map<Tex, CanvasPattern | null>();

  constructor(public ctx: CanvasRenderingContext2D) {}

  setColour(c: number) { this.colour = c; }
  setAlpha(a: number) { this.alpha = a; }
  private fill() { return css(this.colour, this.alpha); }

  /** draw_line_width: a quad of width w, flat ends */
  line(x1: number, y1: number, x2: number, y2: number, w: number) {
    const c = this.ctx;
    c.strokeStyle = this.fill();
    c.lineWidth = w;
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  circle(x: number, y: number, r: number, outline: boolean) {
    if (r <= 0) return;
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    this.paint(outline);
  }

  /** draw_ellipse takes the bounding box */
  ellipse(x1: number, y1: number, x2: number, y2: number, outline: boolean) {
    const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
    if (rx <= 0 || ry <= 0) return;
    const c = this.ctx;
    c.beginPath();
    c.ellipse((x1 + x2) / 2, (y1 + y2) / 2, rx, ry, 0, 0, Math.PI * 2);
    this.paint(outline);
  }

  rect(x1: number, y1: number, x2: number, y2: number, outline: boolean) {
    const c = this.ctx;
    c.beginPath();
    c.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    this.paint(outline);
  }

  /** draw_roundrect_ext: GameMaker's corner size is a diameter, so the canvas radius is half of it */
  roundrect(x1: number, y1: number, x2: number, y2: number, xr: number, _yr: number, outline: boolean) {
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    if (w <= 0 || h <= 0) return;
    const r = Math.max(0, Math.min(xr / 2, w / 2, h / 2));
    const c = this.ctx;
    c.beginPath();
    c.roundRect(Math.min(x1, x2), Math.min(y1, y2), w, h, r);
    this.paint(outline);
  }

  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, outline: boolean) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineTo(x3, y3);
    c.closePath();
    this.paint(outline);
  }

  private paint(outline: boolean) {
    const c = this.ctx;
    if (outline) {
      c.strokeStyle = this.fill();
      c.lineWidth = 1;
      c.stroke();
    } else {
      c.fillStyle = this.fill();
      c.fill();
    }
  }

  /** Colour-multiplied copy of a texture, cached (GameMaker blends sprites with the draw colour). */
  tinted(t: Tex, col: number): CanvasImageSource {
    if (col === C_WHITE) return t.img;
    const key = `${t.w}x${t.h}:${(t.img as HTMLImageElement).src ?? ""}:${col}`;
    let cv = this.tintCache.get(key);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = t.w;
      cv.height = t.h;
      const x = cv.getContext("2d")!;
      x.drawImage(t.img, 0, 0);
      x.globalCompositeOperation = "multiply";
      x.fillStyle = css(col);
      x.fillRect(0, 0, t.w, t.h);
      x.globalCompositeOperation = "destination-in";
      x.drawImage(t.img, 0, 0);
      this.tintCache.set(key, cv);
    }
    return cv;
  }

  /** draw_sprite_ext: rotation in degrees, counter-clockwise like GameMaker */
  sprite(t: Tex | null, x: number, y: number, xs: number, ys: number, rot: number, col: number, alpha: number) {
    if (!t || xs === 0 || ys === 0) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    if (rot) c.rotate((-rot * Math.PI) / 180);
    c.scale(xs, ys);
    c.drawImage(this.tinted(t, col), -t.ox, -t.oy);
    c.restore();
  }

  stretched(t: Tex | null, x: number, y: number, w: number, h: number, alpha = 1) {
    if (!t) return;
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(t.img, x, y, w, h);
    this.ctx.globalAlpha = 1;
  }

  pattern(t: Tex): CanvasPattern | null {
    if (!this.patterns.has(t)) this.patterns.set(t, this.ctx.createPattern(t.img, "repeat"));
    return this.patterns.get(t) ?? null;
  }

  /** draw_sprite_tiled_ext with scale 1 over the visible area */
  tiled(t: Tex, ox: number, oy: number, w: number, h: number) {
    const p = this.pattern(t);
    if (!p) return;
    const c = this.ctx;
    c.save();
    c.translate(ox, oy);
    c.fillStyle = p;
    c.fillRect(-ox, -oy, w, h);
    c.restore();
  }

  /** gpu_set_blendmode(bm_add / bm_normal) */
  additive(on: boolean) { this.ctx.globalCompositeOperation = on ? "lighter" : "source-over"; }

  /** draw_sprite_tiled_ext with a scale, colour and alpha, covering w×h from the origin */
  tiledExt(t: Tex, ox: number, oy: number, scale: number, col: number, alpha: number, w: number, h: number) {
    const img = this.tinted(t, col);
    const p = this.ctx.createPattern(img, "repeat");
    if (!p) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    const tw = t.w * scale, th = t.h * scale;
    c.translate((((ox % tw) + tw) % tw) - tw, (((oy % th) + th) % th) - th);
    c.scale(scale, scale);
    c.fillStyle = p;
    c.fillRect(0, 0, (w + 2 * tw) / scale, (h + 2 * th) / scale);
    c.restore();
  }

  /** Text measured and drawn in Poppins at a pixel size; valign is always middle in this game. */
  setFont(px: number) { this.ctx.font = `700 ${px}px ${this.font}`; }
  textWidth(s: string) { return this.ctx.measureText(s).width; }
  text(x: number, y: number, s: string, px: number, halign: Align, scale: number, ang: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    if (ang) c.rotate((-ang * Math.PI) / 180);
    c.scale(scale, scale);
    c.font = `700 ${px}px ${this.font}`;
    c.textAlign = halign;
    c.textBaseline = "middle";
    c.fillStyle = this.fill();
    c.fillText(s, 0, 0);
    c.restore();
  }
}

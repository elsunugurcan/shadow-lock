import { describe, expect, it } from "vitest";
import { LEVELS, SHAPES, angleErr } from "../src/game/state";

describe("angle error", () => {
  it("is zero when lined up and symmetric shapes line up several times per turn", () => {
    expect(angleErr(30, 30, 1)).toBe(0);
    expect(angleErr(120, 0, 3)).toBeCloseTo(0);
    expect(angleErr(90, 0, 4)).toBeCloseTo(0);
    expect(angleErr(72, 0, 5)).toBeCloseTo(0);
    expect(angleErr(90, 0, 1)).toBe(90);
  });
  it("measures the shortest way round, in both directions", () => {
    expect(angleErr(10, 0, 1)).toBe(10);
    expect(angleErr(-10, 0, 1)).toBe(10);
    expect(angleErr(350, 0, 1)).toBe(10);
    expect(angleErr(100, 0, 4)).toBeCloseTo(10);
    expect(angleErr(80, 0, 4)).toBeCloseTo(10);
  });
  it("never exceeds half a period", () => {
    for (const s of SHAPES) for (let a = -720; a <= 720; a += 7.3) expect(angleErr(a, 13, s.sym)).toBeLessThanOrEqual(180 / s.sym + 1e-9);
  });
});

describe("shapes and levels", () => {
  it("declares the right symmetry for each shape (rotating by one period gives the same outline)", () => {
    for (const s of SHAPES) {
      const key = (pts: number[]) => {
        const out: string[] = [];
        for (let i = 0; i < pts.length; i += 2) out.push(`${pts[i].toFixed(3)},${pts[i + 1].toFixed(3)}`);
        return out.sort().join(" ");
      };
      const a = (360 / s.sym) * (Math.PI / 180);
      const rot: number[] = [];
      for (let i = 0; i < s.pts.length; i += 2) rot.push(s.pts[i] * Math.cos(a) - s.pts[i + 1] * Math.sin(a) + 0, s.pts[i] * Math.sin(a) + s.pts[i + 1] * Math.cos(a) + 0);
      expect(key(rot.map((v) => (Math.abs(v) < 5e-4 ? 0 : v))), s.name).toBe(key(s.pts.map((v) => (Math.abs(v) < 5e-4 ? 0 : v))));
    }
  });
  it("gets harder level by level", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].tol).toBeLessThan(LEVELS[i - 1].tol);
      expect(LEVELS[i].need).toBeGreaterThan(LEVELS[i - 1].need);
      expect(LEVELS[i].shapes).toBeGreaterThanOrEqual(LEVELS[i - 1].shapes);
    }
    expect(LEVELS[3].shapes).toBe(SHAPES.length);
  });
});

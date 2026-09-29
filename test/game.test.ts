// Runs the real game logic headless (no canvas, no audio) with a seeded random source.
import { beforeEach, describe, expect, it } from "vitest";
import { seeded, setRandom } from "../src/engine/math";
import { input } from "../src/engine/input";
import { Game } from "../src/game/game";
import { LEVELS, S, angleErr } from "../src/game/state";

const DT = 1 / 60;
const tick = (g: Game, tap = false) => { input.pressed = tap; g.step(DT); input.pressed = false; };
const run = (g: Game, sec: number, until?: () => boolean) => { for (let i = 0; i < sec * 60; i++) { tick(g); if (until?.()) return; } };
const err = (g: Game) => angleErr(g.ang, g.sockAng, g.shape.sym);

/** waits for the piece to be within `max` degrees (or beyond `min`) and taps */
function tapAt(g: Game, ok: (e: number) => boolean) {
  run(g, 10, () => g.state === "fall" && g.prog > 0.05 && g.prog < 0.95 && ok(err(g)));
  expect(g.state).toBe("fall");
  tick(g, true);
  run(g, 3, () => g.state === "result");
  expect(g.state).toBe("result");
}

beforeEach(() => {
  setRandom(seeded(11));
  S.fadeOut = false; S.fade = 0; S.best = 0; S.switchTo = null;
});

describe("a round", () => {
  it("opens with the level banner, then drops a piece", () => {
    const g = new Game();
    expect(g.state).toBe("banner");
    run(g, 1.7);
    expect(g.state).toBe("fall");
    expect(g.sy).toBeGreaterThan(g.startY);
  });

  it("locks the piece when tapped within tolerance and snaps it onto the shadow", () => {
    const g = new Game();
    tapAt(g, (e) => e <= 10 && e > 6.3);
    expect(g.hit).toBe(true);
    expect(g.perfect).toBe(false);
    expect(g.points).toBe(10);
    expect(g.matched).toBe(1);
    expect(err(g)).toBeCloseTo(0, 6);
  });

  it("pays 25 for a perfect lock (within 35% of the tolerance)", () => {
    const g = new Game();
    tapAt(g, (e) => e <= LEVELS[0].tol * 0.35);
    expect(g.perfect).toBe(true);
    expect(g.points).toBe(25);
  });

  it("shatters the piece and costs a heart on a miss, and resets the combo", () => {
    const g = new Game();
    tapAt(g, (e) => e <= 5);
    tapAt(g, (e) => e > 40);
    expect(g.hit).toBe(false);
    expect(g.hp).toBe(2);
    expect(g.combo).toBe(0);
    expect(g.shards.length).toBeGreaterThan(2);
    expect(g.popups.at(-1)?.str).toBe("MISS");
  });

  it("counts a piece that reaches the plate untouched as too late", () => {
    const g = new Game();
    run(g, 1.7);
    run(g, 6, () => g.state === "result");
    expect(g.hit).toBe(false);
    expect(g.popups.at(-1)?.str).toBe("TOO LATE");
  });

  it("multiplies points every three locks in a row", () => {
    const g = new Game();
    const gains: number[] = [];
    for (let i = 0; i < 6; i++) { const before = g.points; tapAt(g, (e) => e <= 3); gains.push(g.points - before); }
    expect(gains).toEqual([25, 25, 50, 50, 50, 75]);
  });

  it("moves to the next level after enough locks and gives a heart back", () => {
    const g = new Game();
    tapAt(g, (e) => e > 40); // lose a heart first
    for (let i = 0; i < LEVELS[0].need; i++) tapAt(g, (e) => e <= 8);
    run(g, 1, () => g.state === "banner");
    expect(g.level).toBe(2);
    expect(g.cfg.title).toBe("ONE WAY");
    expect(g.hp).toBe(3);
    expect(g.matched).toBe(0);
  });

  it("ends the run with the score and saves a new best when the hearts run out", () => {
    const g = new Game();
    for (let i = 0; i < 3; i++) tapAt(g, (e) => e > 40);
    run(g, 2, () => S.fadeOut);
    expect(S.fadeOut).toBe(true);
    expect(S.nextRoom).toBe("over");
    expect(S.won).toBe(false);
    expect(S.levelReached).toBe(1);
  });

  it("can be cleared from start to finish, with 100 per remaining heart on top", () => {
    const g = new Game();
    let total = 0;
    for (const lv of LEVELS) { total += lv.need; for (let i = 0; i < lv.need; i++) tapAt(g, (e) => e <= lv.tol * 0.6); run(g, 2.5, () => g.state === "fall" || S.fadeOut); }
    expect(total).toBe(36);
    expect(S.won).toBe(true);
    expect(S.score).toBe(g.points + 300);
    expect(S.newBest).toBe(true);
    expect(S.best).toBe(S.score);
  });
});

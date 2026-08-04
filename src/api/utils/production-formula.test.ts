import { describe, it, expect } from "vitest";
import {
  calculateRequiredRolls,
  calculateTotalRolls,
  calculateTotalWeight,
  completionPct,
} from "./production-formula";

describe("calculateRequiredRolls", () => {
  it("is quantity / (7800 / (labelSizeMm / 25))", () => {
    // labelsPerRoll = 7800 / (50/25) = 3900 → 7800 / 3900 = 2 rolls
    expect(calculateRequiredRolls(7800, 50)).toBe(2);
  });

  it("returns a fractional value (not rounded)", () => {
    // labelsPerRoll = 7800 / (25/25) = 7800 → 1000 / 7800 ≈ 0.1282
    expect(calculateRequiredRolls(1000, 25)).toBeCloseTo(1000 / 7800, 6);
  });

  it("guards non-positive inputs", () => {
    expect(calculateRequiredRolls(0, 50)).toBe(0);
    expect(calculateRequiredRolls(1000, 0)).toBe(0);
    expect(calculateRequiredRolls(-5, 50)).toBe(0);
  });
});

describe("calculateTotalRolls", () => {
  it("rounds required + extra UP to a whole roll", () => {
    expect(calculateTotalRolls(2.1, 0)).toBe(3);
    expect(calculateTotalRolls(2, 1.5)).toBe(4); // ceil(3.5)
  });

  it("treats negative extra rolls as zero", () => {
    expect(calculateTotalRolls(2, -5)).toBe(2);
  });
});

describe("calculateTotalWeight", () => {
  it("is weightPerRoll * totalRolls", () => {
    expect(calculateTotalWeight(0.16, 10)).toBeCloseTo(1.6, 6);
  });

  it("guards non-positive inputs", () => {
    expect(calculateTotalWeight(0, 10)).toBe(0);
    expect(calculateTotalWeight(0.16, 0)).toBe(0);
  });
});

describe("completionPct", () => {
  it("is packaged / total as a 2-dp percentage", () => {
    expect(completionPct(5, 10)).toBe(50);
    expect(completionPct(1, 3)).toBe(33.33);
  });

  it("is 0 when there is no total", () => {
    expect(completionPct(5, 0)).toBe(0);
  });
});

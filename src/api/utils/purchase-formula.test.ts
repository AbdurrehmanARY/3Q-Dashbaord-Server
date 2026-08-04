import { describe, it, expect } from "vitest";
import { calculateTotalRollPer200m, calculateInvoiceWeight } from "./purchase-formula";

describe("calculateTotalRollPer200m", () => {
  it("standardises total rolls to a 200m length", () => {
    // 10 rolls at 400m each = 10 * (400/200) = 20
    expect(calculateTotalRollPer200m(10, 400)).toBe(20);
  });

  it("guards non-positive inputs", () => {
    expect(calculateTotalRollPer200m(0, 400)).toBe(0);
    expect(calculateTotalRollPer200m(10, 0)).toBe(0);
  });
});

describe("calculateInvoiceWeight", () => {
  it("is (netWeight * 200) / (totalRoll * rollLength)", () => {
    expect(calculateInvoiceWeight(100, 10, 400)).toBeCloseTo((100 * 200) / (10 * 400), 6);
  });

  it("guards non-positive inputs", () => {
    expect(calculateInvoiceWeight(0, 10, 400)).toBe(0);
    expect(calculateInvoiceWeight(100, 0, 400)).toBe(0);
    expect(calculateInvoiceWeight(100, 10, 0)).toBe(0);
  });
});

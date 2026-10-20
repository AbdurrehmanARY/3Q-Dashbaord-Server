import { describe, it, expect } from "vitest";
import { estimateWeavingHours } from "./work-order.helpers";

describe("estimateWeavingHours", () => {
  it("computes (qty / repeat) * pick / (speed * 60), rounded to 2dp", () => {
    // (60000 / 60) * 853 / (500 * 60) = 1000 * 853 / 30000 = 28.433… -> 28.43
    expect(
      estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 853, speed: 500 })
    ).toBe(28.43);
  });

  it("defaults speed to 600 RPM when speed is 0", () => {
    const withDefault = estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 853, speed: 0 });
    const withExplicit = estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 853, speed: 600 });
    expect(withDefault).toBe(withExplicit);
    expect(withDefault).toBeGreaterThan(0);
  });

  it("defaults speed to 600 RPM when speed is omitted", () => {
    expect(
      estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 853 })
    ).toBe(estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 853, speed: 600 }));
  });

  it("accepts decimal/string inputs (Drizzle numerics cross the wire as strings)", () => {
    expect(
      estimateWeavingHours({ totalQty: 60000, repeat: "60", pick: "853", speed: "500" })
    ).toBe(28.43);
  });

  it("returns 0 when repeat is 0 (guard against division by zero)", () => {
    expect(estimateWeavingHours({ totalQty: 60000, repeat: 0, pick: 853, speed: 500 })).toBe(0);
  });

  it("returns 0 when pick is 0", () => {
    expect(estimateWeavingHours({ totalQty: 60000, repeat: 60, pick: 0, speed: 500 })).toBe(0);
  });

  it("returns 0 when totalQty is 0", () => {
    expect(estimateWeavingHours({ totalQty: 0, repeat: 60, pick: 853, speed: 500 })).toBe(0);
  });
});

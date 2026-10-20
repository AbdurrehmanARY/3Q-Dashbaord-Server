import { describe, it, expect } from "vitest";
import type { ProductionOrder, ProductionOrderLine } from "@db/schema";
import { cascadeChain, deriveLineStatus, deriveOrderPatch, stageCompletionPatch, toNumbers } from "./production-order.helpers";

/** Minimal line factory — decimals are strings over the wire, so defaults are "0". */
function makeLine(overrides: Partial<Record<string, unknown>> = {}): ProductionOrderLine {
  return {
    id: 1,
    productionOrderId: 1,
    labelType: "Care Label",
    quantity: "1000",
    labelSize: "50",
    rollLength: "0",
    requiredRolls: "0",
    extraRolls: "0",
    totalRolls: "10",
    totalWeight: null,
    materialCode: "MAT-1",
    issuedRolls: "0",
    printedRolls: "0",
    sentToCuttingRolls: "0",
    cutRolls: "0",
    sentToPackagingRolls: "0",
    packagedRolls: "0",
    packagedQty: "0",
    printingMachineId: 1,
    printingOperatorId: 1,
    cuttingMachineId: null,
    cuttingOperatorId: null,
    packagingOperatorId: null,
    status: "pending",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ProductionOrderLine;
}

const order = { completedAt: null } as ProductionOrder;

describe("cascadeChain", () => {
  it("clamps every downstream counter down to its new ceiling", () => {
    const out = cascadeChain({
      printedRolls: 8,
      sentToCuttingRolls: 10,
      cutRolls: 10,
      sentToPackagingRolls: 10,
      packagedRolls: 10,
    });
    expect(out).toEqual({
      printedRolls: 8,
      sentToCuttingRolls: 8,
      cutRolls: 8,
      sentToPackagingRolls: 8,
      packagedRolls: 8,
    });
  });

  it("never raises a downstream counter (raising printing does not un-cut rolls)", () => {
    const out = cascadeChain({
      printedRolls: 10,
      sentToCuttingRolls: 4,
      cutRolls: 4,
      sentToPackagingRolls: 0,
      packagedRolls: 0,
    });
    expect(out.sentToCuttingRolls).toBe(4);
    expect(out.cutRolls).toBe(4);
    expect(out.sentToPackagingRolls).toBe(0);
  });
});

describe("toNumbers", () => {
  it("converts the string decimal columns to numbers", () => {
    const n = toNumbers(makeLine({ totalRolls: "10", packagedRolls: "3" }));
    expect(n.totalRolls).toBe(10);
    expect(n.packagedRolls).toBe(3);
    expect(typeof n.totalRolls).toBe("number");
  });
});

describe("deriveLineStatus", () => {
  it("is completed once every planned roll is packaged", () => {
    expect(deriveLineStatus(makeLine({ totalRolls: "10", packagedRolls: "10" }))).toBe("completed");
  });
  it("is active once any progress exists", () => {
    expect(deriveLineStatus(makeLine({ printedRolls: "1" }))).toBe("active");
  });
  it("is pending with no progress", () => {
    expect(deriveLineStatus(makeLine())).toBe("pending");
  });

  it("completes against required rolls even when extra rolls remain un-packaged", () => {
    const line = makeLine({ requiredRolls: "2", totalRolls: "10", packagedRolls: "2" });
    expect(deriveLineStatus(line)).toBe("completed");
  });

  it("stays in progress when only the buffer (not required) is packaged", () => {
    const line = makeLine({ requiredRolls: "2", totalRolls: "10", packagedRolls: "1" });
    expect(deriveLineStatus(line)).toBe("active");
  });

  it("falls back to totalRolls when requiredRolls is 0", () => {
    // makeLine defaults requiredRolls to "0"; completion still keys to totalRolls here.
    expect(deriveLineStatus(makeLine({ totalRolls: "10", packagedRolls: "10" }))).toBe("completed");
  });
});

describe("deriveOrderPatch", () => {
  it("an order with no lines is planned", () => {
    expect(deriveOrderPatch([], order).status).toBe("planned");
  });
  // Completion is a deliberate user action, not a side effect of the counters reaching
  // the plan — reaching the target only makes the order READY for completion.
  it("does NOT auto-complete when every line is fully packaged", () => {
    const lines = [
      makeLine({ totalRolls: "10", packagedRolls: "10" }),
      makeLine({ id: 2, totalRolls: "5", packagedRolls: "5" }),
    ];
    expect(deriveOrderPatch(lines, order).status).toBe("production");
  });

  it("keeps a manually-completed order complete", () => {
    const lines = [makeLine({ totalRolls: "10", packagedRolls: "10" })];
    const completed = { ...order, status: "complete" } as ProductionOrder;
    expect(deriveOrderPatch(lines, completed).status).toBe("complete");
  });
  it("is production when some lines have progress but not all are complete", () => {
    const lines = [
      makeLine({ totalRolls: "10", packagedRolls: "10" }),
      makeLine({ id: 2, totalRolls: "5", printedRolls: "2" }),
    ];
    expect(deriveOrderPatch(lines, order).status).toBe("production");
  });
  it("is planned when lines exist but none has progress", () => {
    expect(deriveOrderPatch([makeLine()], order).status).toBe("planned");
  });
});

describe("stageCompletionPatch", () => {
  it("completes printing exactly once printed reaches required rolls", () => {
    const line = makeLine({ requiredRolls: "2", totalRolls: "10" });
    expect(stageCompletionPatch(line).printingCompletedAt).toBeNull();
    expect(stageCompletionPatch(makeLine({ requiredRolls: "2", totalRolls: "10", printedRolls: "2" })).printingCompletedAt).not.toBeNull();
  });

  it("completes each stage against required rolls, not total", () => {
    const done = {
      ...makeLine({ requiredRolls: "3", totalRolls: "10" }),
      printedRolls: "3",
      sentToCuttingRolls: "3",
      cutRolls: "3",
      sentToPackagingRolls: "3",
      packagedRolls: "3",
    } as ProductionOrderLine;
    const patch = stageCompletionPatch(done);
    expect(patch.printingCompletedAt).not.toBeNull();
    expect(patch.cuttingCompletedAt).not.toBeNull();
    expect(patch.packagingCompletedAt).not.toBeNull();
  });

  it("clears a stamp when a count drops back below required", () => {
    const line = makeLine({
      requiredRolls: "2",
      totalRolls: "10",
      printedRolls: "2",
      printingCompletedAt: new Date("2026-10-01T00:00:00Z"),
    });
    expect(stageCompletionPatch(line).printingCompletedAt).toEqual(new Date("2026-10-01T00:00:00Z"));
    const corrected = { ...line, printedRolls: "1" };
    expect(stageCompletionPatch(corrected).printingCompletedAt).toBeNull();
  });

  it("falls back to totalRolls when requiredRolls is 0", () => {
    expect(stageCompletionPatch(makeLine({ totalRolls: "5", printedRolls: "5" })).printingCompletedAt).not.toBeNull();
    expect(stageCompletionPatch(makeLine({ totalRolls: "5", printedRolls: "4" })).printingCompletedAt).toBeNull();
  });

  it("allows over-production past required without clearing the stamp", () => {
    const line = makeLine({
      requiredRolls: "2",
      totalRolls: "10",
      printedRolls: "2",
      printingCompletedAt: new Date("2026-10-01T00:00:00Z"),
    });
    expect(stageCompletionPatch({ ...line, printedRolls: "4" }).printingCompletedAt).toEqual(
      new Date("2026-10-01T00:00:00Z")
    );
  });

  it("does nothing when no rolls are planned", () => {
    expect(stageCompletionPatch(makeLine({ totalRolls: "0", requiredRolls: "0" })).printingCompletedAt).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import type { ProductionOrder, WovenProductionLine } from "@db/schema";
import {
  deriveWovenOrderPatch,
  deriveWovenLineStatus,
  canStartCutting,
  canStartPackaging,
  MAX_THREAD_COLORS,
} from "./woven-production.helpers";

function makeLine(overrides: Record<string, unknown> = {}): WovenProductionLine {
  return {
    id: 1,
    productionOrderId: 1,
    quantity: "1000",
    totalThreadWeightKg: "0",
    planningCompletedAt: null,
    weavingMachineId: 1,
    weavingOperatorId: 1,
    wovenQty: "0",
    weavingStatus: "pending",
    weavingStartedAt: null,
    weavingEndedAt: null,
    cuttingOperatorId: null,
    cutQty: "0",
    cuttingDate: null,
    packagingOperatorId: null,
    packagedQty: "0",
    packagedWeightKg: "0",
    packagingDate: null,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as WovenProductionLine;
}

const order = { plannedAt: null, completedAt: null } as ProductionOrder;

describe("woven planning constraints", () => {
  it("caps thread colours at 8", () => {
    expect(MAX_THREAD_COLORS).toBe(8);
  });
});

describe("stage gates", () => {
  it("cutting is blocked until weaving is 100% complete", () => {
    expect(canStartCutting(makeLine({ quantity: "1000", wovenQty: "999" }))).toBe(false);
    expect(canStartCutting(makeLine({ quantity: "1000", wovenQty: "1000" }))).toBe(true);
  });

  it("packaging is blocked until cut quantity equals woven quantity", () => {
    expect(canStartPackaging(makeLine({ wovenQty: "1000", cutQty: "999" }))).toBe(false);
    expect(canStartPackaging(makeLine({ wovenQty: "1000", cutQty: "1000" }))).toBe(true);
  });

  it("packaging is blocked when nothing has been cut", () => {
    expect(canStartPackaging(makeLine({ wovenQty: "1000", cutQty: "0" }))).toBe(false);
  });
});

describe("deriveWovenLineStatus", () => {
  it("is completed once every piece is packaged", () => {
    expect(deriveWovenLineStatus(makeLine({ quantity: "100", packagedQty: "100" }))).toBe("completed");
  });
  it("is active once weaving starts", () => {
    expect(deriveWovenLineStatus(makeLine({ wovenQty: "5" }))).toBe("active");
  });
  it("is pending with no progress", () => {
    expect(deriveWovenLineStatus(makeLine())).toBe("pending");
  });
});

describe("deriveWovenOrderPatch", () => {
  it("an order with no woven lines is planned", () => {
    expect(deriveWovenOrderPatch([], order).status).toBe("planned");
  });

  it("stays planned while lines exist but nothing has been produced", () => {
    expect(deriveWovenOrderPatch([makeLine()], order).status).toBe("planned");
  });

  it("moves to production once weaving starts", () => {
    expect(deriveWovenOrderPatch([makeLine({ wovenQty: "10" })], order).status).toBe("production");
  });

  it("is complete only when every line is fully packaged", () => {
    const lines = [
      makeLine({ quantity: "1000", packagedQty: "1000" }),
      makeLine({ id: 2, quantity: "500", packagedQty: "500" }),
    ];
    expect(deriveWovenOrderPatch(lines, order).status).toBe("complete");
  });

  it("is still production when one line lags behind", () => {
    const lines = [
      makeLine({ quantity: "1000", packagedQty: "1000" }),
      makeLine({ id: 2, quantity: "500", packagedQty: "100" }),
    ];
    expect(deriveWovenOrderPatch(lines, order).status).toBe("production");
  });

  it("stamps plannedAt once lines exist and preserves it thereafter", () => {
    const stamped = new Date("2026-01-01T00:00:00Z");
    const patch = deriveWovenOrderPatch([makeLine()], { ...order, plannedAt: stamped } as ProductionOrder);
    expect(patch.plannedAt).toBe(stamped);
  });
});

import { describe, it, expect } from "vitest";
import { buildCompletionReport, type CompletionReportBatch } from "./completion-report.builder";

/**
 * Minimal batch factory — decimals are strings over the wire, so defaults are "0".
 * Waste is recorded per batch at the stage it happened on (recordable at every stage
 * since migration 0027).
 */
function makeBatch(overrides: Partial<CompletionReportBatch> = {}): CompletionReportBatch {
  return {
    stage: "printing",
    status: "COMPLETED",
    labelType: "Care Label",
    operatorName: "Amit",
    machineName: "Press 1",
    batchCode: "P-001",
    assignedRolls: "0",
    producedRolls: "0",
    wastedRolls: "0",
    wasteReason: null,
    ...overrides,
  };
}

describe("buildCompletionReport", () => {
  it("is empty/zero when an order has no batches", () => {
    const report = buildCompletionReport([], "printed");
    expect(report.productType).toBe("printed");
    expect(report.unit).toBe("rolls");
    expect(report.totals).toEqual({
      issued: 0,
      produced: 0,
      wasted: 0,
      remaining: 0,
      yieldPct: 0,
      wastePct: 0,
    });
    expect(report.stageDetail).toHaveLength(3);
    expect(report.wasteByOperator).toEqual([]);
    expect(report.wasteByLabelType).toEqual([]);
  });

  it("sums order-wide issued (first stage) and produced (packaging) with waste", () => {
    // Printed: 10 issued at printing, 8 good at packaging, 1 wasted at cutting, 1 at packaging.
    const batches = [
      makeBatch({ stage: "printing", assignedRolls: "10", producedRolls: "9", wastedRolls: "0" }),
      makeBatch({ stage: "cutting", assignedRolls: "9", producedRolls: "8", wastedRolls: "1" }),
      makeBatch({
        stage: "packaging",
        assignedRolls: "8",
        producedRolls: "8",
        wastedRolls: "1",
      }),
    ];
    const report = buildCompletionReport(batches, "printed");

    expect(report.totals.issued).toBe(10); // printing's assigned
    expect(report.totals.produced).toBe(8); // packaging's produced
    expect(report.totals.wasted).toBe(2); // cutting 1 + packaging 1
    expect(report.totals.remaining).toBe(0); // 10 - 8 - 2
    expect(report.totals.yieldPct).toBe(80); // 8 / 10
    expect(report.totals.wastePct).toBe(20); // 2 / 10
    expect(report.stageDetail).toHaveLength(3);
    expect(report.stageDetail.map((s) => s.stage)).toEqual(["printing", "cutting", "packaging"]);
    expect(report.stageDetail[2]).toMatchObject({
      stage: "packaging",
      batchCount: 1,
      produced: 8,
      wasted: 1,
    });
  });

  it("clamps remaining to zero when produced + wasted exceed issued", () => {
    const batches = [
      makeBatch({ stage: "printing", assignedRolls: "10", producedRolls: "9", wastedRolls: "0" }),
      makeBatch({ stage: "packaging", assignedRolls: "8", producedRolls: "8", wastedRolls: "3" }),
    ];
    const report = buildCompletionReport(batches, "printed");
    expect(report.totals.issued).toBe(10);
    expect(report.totals.produced).toBe(8);
    expect(report.totals.wasted).toBe(3);
    expect(report.totals.remaining).toBe(0); // 10 - 8 - 3 = -1 -> clamped
  });

  it("labels the woven first stage as Weaving and uses the pcs unit", () => {
    const batches = [
      makeBatch({ stage: "weaving", assignedRolls: "1000", producedRolls: "990", wastedRolls: "0" }),
      makeBatch({ stage: "packaging", assignedRolls: "990", producedRolls: "985", wastedRolls: "0" }),
    ];
    const report = buildCompletionReport(batches, "woven");
    expect(report.productType).toBe("woven");
    expect(report.unit).toBe("pcs");
    expect(report.totals.issued).toBe(1000);
    expect(report.totals.produced).toBe(985);
    expect(report.stageDetail[0]).toMatchObject({ stage: "weaving", label: "Weaving", issued: 1000 });
    expect(report.stageDetail[2]).toMatchObject({ stage: "packaging", label: "Packaging" });
  });

  it("excludes CANCELLED and IN_PROGRESS batches from totals (only COMPLETED counts)", () => {
    const batches = [
      makeBatch({ stage: "printing", assignedRolls: "10", wastedRolls: "5" }), // counted
      makeBatch({ stage: "printing", status: "CANCELLED", assignedRolls: "100", wastedRolls: "50" }), // ignored
      makeBatch({ stage: "printing", status: "IN_PROGRESS", assignedRolls: "20", wastedRolls: "2" }), // ignored
      makeBatch({ stage: "packaging", producedRolls: "8", wastedRolls: "0" }),
    ];
    const report = buildCompletionReport(batches, "printed");
    expect(report.totals.issued).toBe(10); // only the COMPLETED printing batch
    expect(report.totals.produced).toBe(8);
    expect(report.totals.wasted).toBe(5); // packaging adds 0
  });

  it("groups waste per operator (desc by total) with a per-batch breakdown", () => {
    const batches = [
      makeBatch({ stage: "printing", operatorName: "Amit", wastedRolls: "3", wasteReason: "Tear" }),
      makeBatch({ stage: "cutting", operatorName: "Amit", wastedRolls: "2", wasteReason: "Mis-cut" }),
      makeBatch({ stage: "packaging", operatorName: "Priya", wastedRolls: "4", wasteReason: "Tear" }),
      makeBatch({ stage: "packaging", operatorName: "Priya", wastedRolls: "2", wasteReason: "Tear" }), // aggregates with above
      makeBatch({ stage: "weaving", operatorName: "Unknown", wastedRolls: "0", wasteReason: null }), // skipped (no waste)
    ];
    const report = buildCompletionReport(batches, "printed");

    expect(report.wasteByOperator).toHaveLength(2);
    expect(report.wasteByOperator[0]).toMatchObject({
      operatorName: "Priya",
      totalWasted: 6,
      breakdown: [{ stage: "packaging", labelType: "Care Label", reason: "Tear", wasted: 6 }],
    });
    expect(report.wasteByOperator[1]).toMatchObject({
      operatorName: "Amit",
      totalWasted: 5,
    });
    // Amit's two batches are distinct (different stage/reason)
    expect(report.wasteByOperator[1].breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "printing", reason: "Tear", wasted: 3 }),
        expect.objectContaining({ stage: "cutting", reason: "Mis-cut", wasted: 2 }),
      ])
    );
  });

  it("groups waste per label type with a per-operator split", () => {
    const batches = [
      makeBatch({ labelType: "Care Label", operatorName: "Amit", wastedRolls: "3", wasteReason: "Tear" }),
      makeBatch({ labelType: "Core Label", operatorName: "Priya", wastedRolls: "2", wasteReason: "Tear" }),
      makeBatch({ labelType: "Care Label", operatorName: "Priya", wastedRolls: "1", wasteReason: "Tear" }),
    ];
    const report = buildCompletionReport(batches, "printed");

    expect(report.wasteByLabelType).toHaveLength(2);
    expect(report.wasteByLabelType[0]).toMatchObject({ labelType: "Care Label", totalWasted: 4 });
    expect(report.wasteByLabelType[0].byOperator).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operatorName: "Amit", totalWasted: 3 }),
        expect.objectContaining({ operatorName: "Priya", totalWasted: 1 }),
      ])
    );
    expect(report.wasteByLabelType[1]).toMatchObject({ labelType: "Core Label", totalWasted: 2 });
  });

  it("attributes waste recorded on a null operator to 'Unassigned' and a null reason to a default", () => {
    const batches = [
      makeBatch({ stage: "cutting", operatorName: null, wastedRolls: "4", wasteReason: null }),
    ];
    const report = buildCompletionReport(batches, "printed");
    expect(report.wasteByOperator[0]).toMatchObject({
      operatorName: "Unassigned",
      totalWasted: 4,
      breakdown: [
        { stage: "cutting", labelType: "Care Label", reason: "No reason recorded", wasted: 4 },
      ],
    });
  });

  it("clamps yieldPct to 100 even when produced exceeds issued", () => {
    const batches = [
      makeBatch({ stage: "printing", assignedRolls: "5", producedRolls: "0" }),
      makeBatch({ stage: "packaging", producedRolls: "7" }),
    ];
    const report = buildCompletionReport(batches, "printed");
    expect(report.totals.issued).toBe(5);
    expect(report.totals.produced).toBe(7);
    expect(report.totals.yieldPct).toBe(100);
  });
});


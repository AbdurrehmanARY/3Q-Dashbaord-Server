import { describe, it, expect } from "vitest";
import {
  batchPositionOf,
  lineFlowOf,
  lineSizeFlows,
  batchCodeFor,
  requireUpstream,
  assertWithinPlan,
  assertWithinAvailable,
  assertOutputWithinInput,
  isReadyForCompletion,
  STAGE_MACHINE_TYPE,
  STAGE_DESIGNATION,
  STAGES_OF,
  UNIT_OF,
  kindOwnsStage,
  isFirstStage,
  inputNoun,
  estimatedMinutesFor,
  formatDuration,
  beamThreadKgOf,
  type FlowBatch,
  type LineSizeFlow,
} from "./batch-flow.helpers";
import { isSizeLabel, LABEL_TYPES, type SizePlan } from "@db/size-plans";
import { validateSizePlan, normalizeSizePlan } from "@shared/constants/labels";

/** Decimals arrive from Postgres as strings, so the factory produces strings. */
const batch = (
  stage: FlowBatch["stage"],
  assigned: number,
  produced = 0,
  consumed = 0,
  wasted = 0,
  extra: Partial<FlowBatch> = {}
): FlowBatch => ({
  stage,
  assignedRolls: String(assigned),
  producedRolls: String(produced),
  wastedRolls: String(wasted),
  consumedRolls: String(consumed),
  ...extra,
});

describe("batchPositionOf", () => {
  it("available is produced minus consumed; pending is input still to run", () => {
    const p = batchPositionOf(batch("printing", 10, 6, 4, 1));
    expect(p.available).toBe(2); // 6 produced − 4 consumed
    expect(p.pending).toBe(3); // 10 assigned − 6 produced − 1 wasted
  });

  it("clamps rather than reporting negatives", () => {
    const p = batchPositionOf(batch("cutting", 5, 2, 4));
    expect(p.available).toBe(0);
    expect(p.pending).toBe(3);
  });
});

describe("batchCodeFor", () => {
  it("prefixes by stage and pads the number", () => {
    expect(batchCodeFor("printing", 1)).toBe("P-001");
    expect(batchCodeFor("cutting", 12)).toBe("C-012");
    expect(batchCodeFor("packaging", 7)).toBe("PK-007");
  });
});

describe("requireUpstream", () => {
  it("maps each consuming stage to the one it draws from, per workflow", () => {
    expect(requireUpstream("printed", "cutting")).toBe("printing");
    expect(requireUpstream("printed", "packaging")).toBe("cutting");
    // The one place the pipelines genuinely differ.
    expect(requireUpstream("woven", "cutting")).toBe("weaving");
    expect(requireUpstream("woven", "packaging")).toBe("cutting");
  });
  it("refuses the first stage of each workflow — both draw from the plan", () => {
    expect(() => requireUpstream("printed", "printing")).toThrow(/production plan/);
    expect(() => requireUpstream("woven", "weaving")).toThrow(/production plan/);
  });
});

/**
 * The user's worked example, step by step:
 *   Care = 20 planned; P-001..P-004 assigned 5 each; P-001 makes 5, P-002 makes 3;
 *   C-001 consumes 5 + 3 and makes 6; PK-001 takes 4 and makes 4.
 */
describe("the 20-roll Care example", () => {
  it("step 1 — four printing batches consume the whole plan", () => {
    const batches = [
      batch("printing", 5),
      batch("printing", 5),
      batch("printing", 5),
      batch("printing", 5),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.assignedToPrinting).toBe(20);
    expect(f.remainingPlanned).toBe(0);
    expect(f.printedProduced).toBe(0);
  });

  it("step 2 — partial output is available before the batch finishes", () => {
    const batches = [
      batch("printing", 5, 5),
      batch("printing", 5, 3),
      batch("printing", 5),
      batch("printing", 5),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.printedProduced).toBe(8);
    expect(f.printedAvailable).toBe(8);
  });

  it("step 3 — C-001 consuming 5 + 3 empties printed availability without touching the total", () => {
    const batches = [
      batch("printing", 5, 5, 5),
      batch("printing", 5, 3, 3),
      batch("printing", 5),
      batch("printing", 5),
      batch("cutting", 8),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.printedProduced).toBe(8); // total never falls
    expect(f.printedAvailable).toBe(0); // all of it consumed
    expect(f.cutProduced).toBe(0);
  });

  it("step 4 — C-001 makes 6 of its 8", () => {
    const batches = [
      batch("printing", 5, 5, 5),
      batch("printing", 5, 3, 3),
      batch("cutting", 8, 6),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.cutProduced).toBe(6);
    expect(f.cutAvailable).toBe(6);
  });

  it("step 5 — PK-001 takes 4, leaving 2 cut rolls for another packaging batch", () => {
    const batches = [
      batch("printing", 5, 5, 5),
      batch("printing", 5, 3, 3),
      batch("cutting", 8, 6, 4),
      batch("packaging", 4, 4, 0, 0, { packagedQty: "4000" }),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.cutProduced).toBe(6);
    expect(f.cutAvailable).toBe(2); // 6 − 4, exactly as the spec says
    expect(f.packagedProduced).toBe(4);
    expect(f.packagedLabels).toBe(4000);
    expect(f.remainingRolls).toBe(16); // 20 planned − 4 packaged
  });
});

describe("lineFlowOf", () => {
  it("ignores cancelled batches entirely", () => {
    const batches = [
      batch("printing", 5, 5),
      batch("printing", 5, 5, 0, 0, { status: "CANCELLED" }),
    ];
    const f = lineFlowOf(20, batches);
    expect(f.assignedToPrinting).toBe(5);
    expect(f.printedProduced).toBe(5);
    expect(f.remainingPlanned).toBe(15);
  });

  it("tracks printing waste separately from output", () => {
    const f = lineFlowOf(20, [batch("printing", 10, 7, 0, 3)]);
    expect(f.printedProduced).toBe(7);
    expect(f.printedWasted).toBe(3);
  });
});

describe("validation guards", () => {
  it("printing cannot assign beyond the plan", () => {
    expect(() => assertWithinPlan(5, 0, 20)).toThrow(/0 of the 20 planned rolls remain unassigned/);
    expect(() => assertWithinPlan(0, 10, 20)).toThrow(/greater than zero/);
    expect(() => assertWithinPlan(5, 5, 20)).not.toThrow();
  });

  it("consuming cannot exceed a source's availability", () => {
    const source = { ...batch("printing", 5, 3, 0), batchCode: "P-002", stage: "printing" as const };
    expect(() => assertWithinAvailable(5, source)).toThrow(
      /P-002 has only 3 printed rolls available; requested 5/
    );
    expect(() => assertWithinAvailable(3, source)).not.toThrow();
  });

  it("output cannot exceed the input the batch was given", () => {
    expect(() => assertOutputWithinInput(7, 0, 5, "C-001")).toThrow(/C-001 was assigned 5 rolls/);
    expect(() => assertOutputWithinInput(4, 2, 5, "P-001")).toThrow(/and 2 wasted/);
    expect(() => assertOutputWithinInput(4, 1, 5, "P-001")).not.toThrow();
  });
});

describe("isReadyForCompletion", () => {
  it("needs every line to have packaged its full plan", () => {
    expect(isReadyForCompletion([{ planned: 20, packagedProduced: 20, wastedTotal: 0 }])).toBe(true);
    expect(isReadyForCompletion([{ planned: 20, packagedProduced: 19, wastedTotal: 0 }])).toBe(false);
    expect(
      isReadyForCompletion([
        { planned: 20, packagedProduced: 20, wastedTotal: 0 },
        { planned: 10, packagedProduced: 4, wastedTotal: 0 },
      ])
    ).toBe(false);
  });

  it("an order with no lines is never ready", () => {
    expect(isReadyForCompletion([])).toBe(false);
  });

  it("counts waste toward completion but not toward assignment capacity", () => {
    expect(
      isReadyForCompletion([{ planned: 20, packagedProduced: 15, wastedTotal: 5 }])
    ).toBe(true);
    expect(
      isReadyForCompletion([{ planned: 20, packagedProduced: 10, wastedTotal: 5 }])
    ).toBe(false);
    expect(
      isReadyForCompletion([
        { planned: 20, packagedProduced: 18, wastedTotal: 2 },
        { planned: 10, packagedProduced: 5, wastedTotal: 0 },
      ])
    ).toBe(false);
  });

  it("measures readiness against required rolls, not the full plan", () => {
    // 5 required of 20 planned: ready once 5 packaged even though 15 buffer rolls are not.
    expect(isReadyForCompletion([{ planned: 20, required: 5, packagedProduced: 5, wastedTotal: 0 }])).toBe(true);
    expect(isReadyForCompletion([{ planned: 20, required: 5, packagedProduced: 4, wastedTotal: 0 }])).toBe(false);
  });

  it("counts waste toward the required target", () => {
    expect(
      isReadyForCompletion([{ planned: 20, required: 10, packagedProduced: 7, wastedTotal: 3 }])
    ).toBe(true);
    expect(
      isReadyForCompletion([{ planned: 20, required: 10, packagedProduced: 4, wastedTotal: 3 }])
    ).toBe(false);
  });

  it("falls back to planned when required is omitted or 0", () => {
    expect(isReadyForCompletion([{ planned: 20, packagedProduced: 20, wastedTotal: 0 }])).toBe(true);
    expect(isReadyForCompletion([{ planned: 20, required: 0, packagedProduced: 19, wastedTotal: 0 }])).toBe(false);
  });

  it("completes the order once every line meets its required target", () => {
    expect(
      isReadyForCompletion([
        { planned: 20, required: 5, packagedProduced: 7, wastedTotal: 0 },
        { planned: 10, required: 8, packagedProduced: 6, wastedTotal: 2 },
      ])
    ).toBe(true);
  });
});

describe("stage resource mapping", () => {
  it("pairs each stage with the machine type and designation it can run", () => {
    expect(STAGE_MACHINE_TYPE.printing).toBe("Printing");
    expect(STAGE_MACHINE_TYPE.cutting).toBe("Cutting");
    expect(STAGE_DESIGNATION.printing).toBe("Printing");
    expect(STAGE_DESIGNATION.cutting).toBe("Cutting");
    expect(STAGE_DESIGNATION.packaging).toBe("Packaging");
  });

  it("gives packaging no machine type — it is done by hand", () => {
    expect(STAGE_MACHINE_TYPE.packaging).toBeNull();
  });
});

/**
 * The woven pipeline: Planning -> Weaving -> Cutting -> Packaging, counted in PIECES.
 * It shares every rule with the printed side and differs in only two places — its first
 * stage, and its unit.
 */
describe("the woven workflow", () => {
  const woven = (
    stage: FlowBatch["stage"],
    assigned: number,
    produced = 0,
    consumed = 0,
    wasted = 0
  ): FlowBatch => batch(stage, assigned, produced, consumed, wasted);

  it("runs weaving, cutting, packaging — never printing", () => {
    expect(STAGES_OF.woven).toEqual(["weaving", "cutting", "packaging"]);
    expect(STAGES_OF.printed).toEqual(["printing", "cutting", "packaging"]);
    expect(kindOwnsStage("woven", "printing")).toBe(false);
    expect(kindOwnsStage("printed", "weaving")).toBe(false);
  });

  it("counts pieces, not rolls", () => {
    expect(UNIT_OF.woven).toBe("pcs");
    expect(UNIT_OF.printed).toBe("rolls");
  });

  it("treats weaving as the stage that draws from the plan", () => {
    expect(isFirstStage("woven", "weaving")).toBe(true);
    expect(isFirstStage("woven", "cutting")).toBe(false);
    expect(isFirstStage("printed", "weaving")).toBe(false);
  });

  it("weaves a plan and flows it through cutting to packaging", () => {
    // 100 planned; weave 60 assigned / 40 made; cut 30 of them; package 20.
    const f = lineFlowOf(
      100,
      [woven("weaving", 60, 40, 30), woven("cutting", 30, 30, 20), woven("packaging", 20, 20)],
      "woven"
    );
    expect(f.assignedToPrinting).toBe(60); // assigned to WEAVING
    expect(f.remainingPlanned).toBe(40);
    expect(f.printedProduced).toBe(40); // woven output
    expect(f.printedAvailable).toBe(10); // 40 made − 30 cut
    expect(f.cutProduced).toBe(30);
    expect(f.cutAvailable).toBe(10); // 30 cut − 20 packaged
    expect(f.packagedProduced).toBe(20);
    expect(f.remainingRolls).toBe(80);
  });

  it("names each stage's input after the workflow it belongs to", () => {
    expect(inputNoun("woven", "cutting")).toBe("woven");
    expect(inputNoun("printed", "cutting")).toBe("printed");
    expect(inputNoun("woven", "packaging")).toBe("cut");
    expect(inputNoun("woven", "weaving")).toBe("planned");
  });

  it("codes batches by stage", () => {
    expect(batchCodeFor("weaving", 1)).toBe("W-001");
  });

  it("states quantities in the right unit when refusing over-allocation", () => {
    expect(() => assertWithinPlan(50, 40, 100, "woven", "weaving")).toThrow(
      /Cannot assign 50 pcs to weaving: 40 of the 100 planned pcs remain unassigned/
    );
  });

  it("offers looms to weaving and nothing to packaging", () => {
    expect(STAGE_MACHINE_TYPE.weaving).toBe("Woven");
    expect(STAGE_DESIGNATION.weaving).toBe("Weaving");
    expect(STAGE_MACHINE_TYPE.packaging).toBeNull();
  });
});

describe("estimatedMinutesFor", () => {
  const design = { pick: 8, repeat: 2, speed: 600 };

  it("uses the weaving formula: (qty / repeat) x pick / speed", () => {
    // (1200 / 2) * 8 / 600 = 8 minutes
    expect(estimatedMinutesFor("weaving", 1200, design)).toBe(8);
  });

  it("scales with the batch's own quantity, not the line's", () => {
    expect(estimatedMinutesFor("weaving", 2400, design)).toBe(16);
  });

  it("falls back to 600 RPM when the design states no speed", () => {
    expect(estimatedMinutesFor("weaving", 1200, { pick: 8, repeat: 2 })).toBe(8);
  });

  it("returns 0 — rendered 00:00 — for stages whose formula is not defined yet", () => {
    for (const stage of ["printing", "cutting", "packaging"] as const) {
      expect(estimatedMinutesFor(stage, 1200, design)).toBe(0);
    }
  });

  it("returns 0 when the design is missing the figures it needs", () => {
    expect(estimatedMinutesFor("weaving", 1200, null)).toBe(0);
    expect(estimatedMinutesFor("weaving", 1200, { pick: 0, repeat: 2 })).toBe(0);
    expect(estimatedMinutesFor("weaving", 0, design)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("renders minutes as HH:MM", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(8)).toBe("00:08");
    expect(formatDuration(95)).toBe("01:35");
    expect(formatDuration(1440)).toBe("24:00");
  });

  it("never renders a negative duration", () => {
    expect(formatDuration(-10)).toBe("00:00");
  });
});

describe("beamThreadKgOf", () => {
  it("is packaged weight minus dyed thread consumed", () => {
    expect(beamThreadKgOf(120, 45.5)).toBe(74.5);
  });

  it("stays signed — consumption above packaged weight is information, not an error", () => {
    expect(beamThreadKgOf(40, 55)).toBe(-15);
  });

    it("rounds to grams", () => {
    expect(beamThreadKgOf(10.0005, 1.0001)).toBe(9);
  });
});

describe("LABEL_TYPES + isSizeLabel", () => {
  it("exposes exactly the three label kinds the dropdown offers", () => {
    expect(LABEL_TYPES).toEqual(["Size Label", "Care Label", "Main Label"]);
  });

  it("recognises a Size Label regardless of case or spaces", () => {
    expect(isSizeLabel("Size Label")).toBe(true);
    expect(isSizeLabel("  size label  ")).toBe(true);
    expect(isSizeLabel("SIZE LABEL")).toBe(true);
  });

  it("does not match the other label kinds", () => {
    expect(isSizeLabel("Care Label")).toBe(false);
    expect(isSizeLabel("Main Label")).toBe(false);
    expect(isSizeLabel("")).toBe(false);
    expect(isSizeLabel(null)).toBe(false);
  });
});

describe("lineSizeFlows", () => {
  const wovenBatch = (
    size: string | null,
    assigned: number,
    produced = 0
  ): FlowBatch => ({
    stage: "weaving",
    assignedRolls: String(assigned),
    producedRolls: String(produced),
    wastedRolls: "0",
    consumedRolls: "0",
    status: "ASSIGNED",
    labelSize: size,
  });

  const sizes: SizePlan[] = [
    { size: "XS", quantity: 100 },
    { size: "SM", quantity: 100 },
    { size: "L", quantity: 50 },
  ];

  it("returns an empty array when the line has no sizes", () => {
    expect(lineSizeFlows([], [], "weaving")).toEqual([]);
  });

  it("starts every size showing nothing assigned", () => {
    const flows = lineSizeFlows(sizes, [], "weaving");
    expect(flows).toEqual([
      { size: "XS", planned: 100, assigned: 0, remaining: 100, produced: 0 },
      { size: "SM", planned: 100, assigned: 0, remaining: 100, produced: 0 },
      { size: "L", planned: 50, assigned: 0, remaining: 50, produced: 0 },
    ]);
  });

  it("tracks per-size assignment and remaining", () => {
    // XS: 60 assigned, 40 left. SM: 100 assigned, 0 left. L: 0 assigned, 50 left.
    const batches = [wovenBatch("XS", 60, 50), wovenBatch("SM", 100, 80)];
    const flows = lineSizeFlows(sizes, batches, "weaving");
    expect(flows).toEqual([
      { size: "XS", planned: 100, assigned: 60, remaining: 40, produced: 50 },
      { size: "SM", planned: 100, assigned: 100, remaining: 0, produced: 80 },
      { size: "L", planned: 50, assigned: 0, remaining: 50, produced: 0 },
    ]);
  });

    it("excludes cancelled batches from the assignment totals", () => {
    const batches: FlowBatch[] = [
      wovenBatch("XS", 60, 50),
      { ...wovenBatch("XS", 40, 30), status: "CANCELLED" },
    ];
    const flows = lineSizeFlows(sizes, batches, "weaving");
    expect(flows[0]).toEqual({
      size: "XS",
      planned: 100,
      assigned: 60,
      remaining: 40,
      produced: 50,
    });
  });

  it("only looks at the first stage of the line's workflow", () => {
    // A cutting batch with labelSize "XS" is ignored — only weaving batches count.
    const batches: FlowBatch[] = [
      wovenBatch("XS", 60, 50),
      { stage: "cutting", assignedRolls: "60", producedRolls: "60", wastedRolls: "0", consumedRolls: "0", status: "COMPLETED", labelSize: "XS" },
    ];
    const flows = lineSizeFlows(sizes, batches, "weaving");
    expect(flows[0]).toEqual({
      size: "XS",
      planned: 100,
      assigned: 60,
      remaining: 40,
      produced: 50,
    });
  });
});

describe("validateSizePlan", () => {
  it("returns empty for a non-size label type", () => {
    const result = validateSizePlan([], "Care Label", 10, "Care Label");
    expect(result).toEqual([]);
  });

  it("accepts sizes that sum to the quantity for a Size Label", () => {
    const sizes = [
      { size: "S", quantity: 200 },
      { size: "XL", quantity: 100 },
      { size: "32/32", quantity: 50 },
    ];
    expect(validateSizePlan(sizes, "Size Label", 350, "test")).toEqual(sizes);
  });

  it("requires at least one size for a Size Label", () => {
    expect(() => validateSizePlan([], "Size Label", 10, "test")).toThrow(/Size Label/);
  });

  it("rejects sizes that do not sum to the quantity", () => {
    const sizes = [{ size: "S", quantity: 50 }, { size: "XL", quantity: 40 }];
    expect(() => validateSizePlan(sizes, "Size Label", 100, "test")).toThrow(/add up to 90 pcs/);
  });

  it("rejects zero or negative quantities", () => {
    expect(() => validateSizePlan([{ size: "XL", quantity: 0 }], "Size Label", 0, "test")).toThrow(
      /positive whole-number quantity/
    );
  });

  it("rejects duplicate sizes (case-insensitive)", () => {
    const sizes = [{ size: "XL", quantity: 50 }, { size: "xl", quantity: 50 }];
    expect(() => validateSizePlan(sizes, "Size Label", 100, "test")).toThrow(/listed twice/);
  });

  it("trims whitespace from size names", () => {
    const result = normalizeSizePlan([{ size: "  XL  ", quantity: 50 }]);
    expect(result[0].size).toBe("XL");
  });

  it("rejects non-integer quantities", () => {
    expect(() => normalizeSizePlan([{ size: "XL", quantity: 1.5 }])).toThrow(/whole-number/);
  });
});

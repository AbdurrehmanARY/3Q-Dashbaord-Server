import { describe, it, expect, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  batchConsumptions,
  machines,
  operators,
  productionBatches,
  productionOrderLines,
  wovenProductionLines,
} from "@db/schema";
import {
  BatchFlowRepository,
  lineRefOfBatch,
  lineRefOfBatchOrNull,
} from "./batch-flow.repository";
import type { LineRef } from "./batch-flow.helpers";

/**
 * The database handle is stubbed: this file exercises how the reads BUILD their queries, not the
 * database. `@db/index` eagerly validates env vars and opens a pool, so it must never load here.
 * The handle is mutable so a single test can swap in a fake that records its joins.
 */
const hoisted = vi.hoisted(() => ({ db: {} as unknown }));

vi.mock("@db/index", () => ({
  __esModule: true,
  get db() {
    return hoisted.db;
  },
}));

/**
 * Regression (reported from the floor):
 *
 *   POST /api/production/weaving-batches/lines/15  -> 400
 *   "Cannot assign 1998 pcs to weaving: 0 of the 40000 planned pcs remain unassigned"
 *
 * line 15 planned 40,000 pcs and had NO batches, yet the server answered "0 remain
 * unassigned" — so the first batch of a line could never be created. Cause: the guard read
 * its two figures as scalar sub-selects FROM `production_batches`. An outer query over a
 * table with no rows returns no rows at all, so the sub-selects never ran and the
 * `?? 0` fallbacks turned "40,000 planned, 0 assigned" into "0 remaining". The outer row
 * must therefore come from the LINE table, which always has exactly one row per line.
 *
 * The guard below is structural: it fails if the read ever targets `production_batches`
 * again, which is the shape that produced the bug.
 */
type FakeRow = { planned: string; assigned: string };

/** Records which table each read targets and returns canned rows for it. */
function fakeTx(rowsByTable: Record<string, FakeRow[]>) {
  const readTables: string[] = [];
  const tx = {
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => {
        const name = getTableName(table);
        readTables.push(name);
        return {
          where: () => ({
            limit: async () => rowsByTable[name] ?? [],
          }),
        };
      },
    }),
  };
  return { tx, readTables };
}

interface RemainingPlanned {
  remainingPlannedTx(tx: unknown, line: LineRef, excludeBatchId?: number): Promise<number>;
}

const repo = () => new BatchFlowRepository() as unknown as RemainingPlanned;

const WOVEN = getTableName(wovenProductionLines);
const PRINTED = getTableName(productionOrderLines);

describe("BatchFlowRepository.remainingPlannedTx", () => {
  it("reads a woven line's plan from woven_production_lines", async () => {
    const { tx, readTables } = fakeTx({
      [WOVEN]: [{ planned: "40000.00", assigned: "0" }],
    });

    await expect(repo().remainingPlannedTx(tx, { kind: "woven", id: 15 })).resolves.toBe(40000);
    expect(readTables).toEqual([WOVEN]);
    // The bug: a read from production_batches returns no row while it is empty, so the
    // whole plan looked already assigned.
    expect(readTables).not.toContain("production_batches");
  });

  it("reads a printed line's plan from production_order_lines", async () => {
    const { tx, readTables } = fakeTx({
      [PRINTED]: [{ planned: "120.00", assigned: "20.00" }],
    });

    await expect(repo().remainingPlannedTx(tx, { kind: "printed", id: 7 })).resolves.toBe(100);
    expect(readTables).toEqual([PRINTED]);
    expect(readTables).not.toContain("production_batches");
  });

  it("still honours excludeBatchId when re-checking an assignment", async () => {
    const { tx, readTables } = fakeTx({
      [WOVEN]: [{ planned: "40000.00", assigned: "38000.00" }],
    });

    await expect(
      repo().remainingPlannedTx(tx, { kind: "woven", id: 15 }, 42)
    ).resolves.toBe(2000);
    expect(readTables).toEqual([WOVEN]);
  });
});

/* ------------------------------------------------------------- line-scoped reads */

type JoinKind = "inner" | "left";
interface Join {
  kind: JoinKind;
  table: string;
}

const BATCHES = getTableName(productionBatches);
const CONSUMPTIONS = getTableName(batchConsumptions);
const MACHINES = getTableName(machines);
const OPERATORS = getTableName(operators);
/** The two tables a read must never JOIN on to FIND a batch — only to label one. */
const LINE_TABLES: string[] = [PRINTED, WOVEN];

/**
 * A fake Drizzle handle that records HOW each table is joined, not what the database answers.
 * `orderBy` is the terminal await on every read shape here, so it resolves the canned rows.
 */
function fakeDb(rowsByFrom: Record<string, unknown[]>, opts: { joins?: Join[] } = {}) {
  const joins = opts.joins ?? [];

  const chainFor = (fromTable: string) => {
    const node: Record<string, (...args: unknown[]) => unknown> = {};
    node.leftJoin = (table) => {
      joins.push({ kind: "left", table: getTableName(table as never) });
      return node;
    };
    node.innerJoin = (table) => {
      joins.push({ kind: "inner", table: getTableName(table as never) });
      return node;
    };
    node.where = () => node;
    node.orderBy = async () => rowsByFrom[fromTable] ?? [];
    return node;
  };

  return {
    joins,
    select: () => ({ from: (table: unknown) => chainFor(getTableName(table as never)) }),
    execute: async () => [],
  };
}

/**
 * A batch as the line-scoped schema stores it. Every stage carries a line; which column is set
 * says whether the batch counts rolls (printed) or pieces (woven).
 */
const cuttingRow = {
  id: 41,
  productionOrderId: 22,
  productionOrderLineId: 15,
  wovenProductionLineId: null,
  stage: "cutting" as const,
  batchNumber: 1,
  batchCode: "C-001",
  machineId: null,
  machineName: null,
  operatorId: null,
  operatorName: null,
  labelSize: null,
  assignedRolls: "10000.00",
  producedRolls: "6000.00",
  wastedRolls: "0.00",
  consumedRolls: "2000.00",
  availableRolls: "4000.00",
  packagedQty: "0.00",
  status: "IN_PROGRESS" as const,
  notes: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};


/**
 * Regression (reported from the floor): the cutting and packaging panels stayed empty while the
 * floor showed cutting batches.
 *
 * Cause: every panel read its stage through the LINE, and cutting/packaging batches carried no
 * line (the old `production_batches_first_stage_one_line` check forbade it), so a line-filtered
 * read returned `[]` for those stages by construction.
 *
 * Now that cutting and packaging are line-scoped, a line-scoped read must return them — and must
 * still find them WITHOUT joining a line table, because the filter is the batch's own column.
 */
describe("BatchFlowRepository.findByLine", () => {
  const printed = { kind: "printed" as const, id: 15 };

  it("returns a cutting batch, which the old line-filtered read could never see", async () => {
    hoisted.db = fakeDb({ [BATCHES]: [cuttingRow], [CONSUMPTIONS]: [] });

    const rows = await new BatchFlowRepository().findByLine(printed, "cutting");

    expect(rows).toHaveLength(1);
    expect(rows[0].batchCode).toBe("C-001");
    expect(rows[0].productionOrderLineId).toBe(15);
  });

  it("finds every stage of the line, not just its first", async () => {
    hoisted.db = fakeDb({
      [BATCHES]: [
        { ...cuttingRow, id: 30, stage: "printing", batchCode: "P-001" },
        cuttingRow,
        { ...cuttingRow, id: 43, stage: "packaging", batchCode: "PK-001" },
      ],
      [CONSUMPTIONS]: [],
    });

    const rows = await new BatchFlowRepository().findByLine(printed);

    expect(rows.map((r) => r.stage)).toEqual(["printing", "cutting", "packaging"]);
  });

  it("filters on the batch's own line column, so it needs no line-table join", async () => {
    const fake = fakeDb({ [BATCHES]: [cuttingRow], [CONSUMPTIONS]: [] });
    hoisted.db = fake;

    await new BatchFlowRepository().findByLine(printed, "cutting");

    // Machines and operators are LEFT joined for display. The line tables are not joined at
    // all, which is what keeps the read independent of a batch's label type; the one INNER
    // join is the later source lookup, and it joins batches, not lines.
    const mainRead = fake.joins.filter((j) => j.table !== BATCHES);
    expect(mainRead.map((j) => j.table)).toEqual([MACHINES, OPERATORS]);
    expect(mainRead.every((j) => j.kind === "left")).toBe(true);
    expect(fake.joins.some((j) => LINE_TABLES.includes(j.table))).toBe(false);
  });
});


/**
 * The order-wide read exists for the manager overview. It must LEFT join both line tables purely
 * to resolve `labelType` — an INNER join there is the exact shape that dropped rows before.
 */
describe("BatchFlowRepository.findByOrder", () => {
  const findByOrder = () => new BatchFlowRepository().findByOrder(22, "printed", "cutting");

  it("LEFT joins both line tables so no batch can be filtered out by them", async () => {
    const joins: Join[] = [];
    hoisted.db = fakeDb({ [BATCHES]: [cuttingRow], [CONSUMPTIONS]: [] }, { joins });

    await findByOrder();

    // The line tables are joined purely to read `labelType`, so they must never be able to
    // drop a row: the main read's joins are all LEFT, and the only INNER join is the later
    // source lookup, which joins batches rather than lines.
    const mainRead = joins.filter((j) => j.table !== BATCHES);
    expect(mainRead.map((j) => j.table)).toEqual([PRINTED, WOVEN, MACHINES, OPERATORS]);
    expect(mainRead.every((j) => j.kind === "left")).toBe(true);
    expect(joins.filter((j) => j.kind === "inner").map((j) => j.table)).toEqual([BATCHES]);
  });

  it("returns the row with its labelType resolved and no mix to resolve", async () => {
    hoisted.db = fakeDb({
      [BATCHES]: [{ ...cuttingRow, labelType: "Size Label" }],
      [CONSUMPTIONS]: [],
    });

    const rows = await findByOrder();

    expect(rows).toHaveLength(1);
    expect(rows[0].labelType).toBe("Size Label");
    // This fixture has no consumption edges; the shape must still be present, since pro-rata
    // attribution is gone and consumers read `sources` directly.
    expect(rows[0].sources).toEqual([]);
  });
});


/* ------------------------------------------------------------ line resolution */

/**
 * Every batch hangs off exactly one line, so these predicates are what the rest of the module
 * leans on. The throwing variant is deliberate: a line-less row is corruption, not a shape, and
 * silently returning null would push that ambiguity into every caller.
 */
describe("lineRefOfBatch", () => {
  it("reads the woven column when it is set", () => {
    expect(lineRefOfBatch({ productionOrderLineId: null, wovenProductionLineId: 15 })).toEqual({
      kind: "woven",
      id: 15,
    });
  });

  it("reads the printed column when it is set", () => {
    expect(lineRefOfBatch({ productionOrderLineId: 15, wovenProductionLineId: null })).toEqual({
      kind: "printed",
      id: 15,
    });
  });

  it("throws for a line-less batch, which the schema now forbids", () => {
    expect(() =>
      lineRefOfBatch({ productionOrderLineId: null, wovenProductionLineId: null })
    ).toThrow(/not attached to a label type/);
  });

  it("answers null rather than throwing in the non-throwing probe", () => {
    expect(
      lineRefOfBatchOrNull({ productionOrderLineId: null, wovenProductionLineId: null })
    ).toBeNull();
  });
});


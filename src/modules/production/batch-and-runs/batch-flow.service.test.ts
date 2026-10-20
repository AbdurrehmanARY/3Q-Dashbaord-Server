import { describe, it, expect, vi, beforeEach } from "vitest";
import { BatchFlowService } from "./batch-flow.service";

/**
 * The repository layer is mocked so the service can be exercised as a pure unit without a
 * database. What is under test is the line-scoped contract: every batch hangs off exactly one
 * label type, so every figure is a plain sum over that label type's own batches and the source
 * picker can only ever offer what `createBatch` will accept.
 */
const mocks = vi.hoisted(() => ({
  batchFlowRepository: {
    findById: vi.fn(),
    findByOrder: vi.fn(),
    findByLine: vi.fn(),
  },
  wovenProductionRepository: {
    findLineById: vi.fn(),
    findOrderContext: vi.fn(),
    findLines: vi.fn(),
  },
  productionOrderRepository: {
    findLineById: vi.fn(),
    findById: vi.fn(),
    findLines: vi.fn(),
  },
  machineRepository: { findAll: vi.fn() },
  operatorRepository: { findAll: vi.fn() },
  userService: { assertActor: vi.fn() },
}));

vi.mock("./batch-flow.repository", () => ({
  __esModule: true,
  batchFlowRepository: mocks.batchFlowRepository,
}));
vi.mock("../woven-production/woven-production.repository", () => ({
  __esModule: true,
  wovenProductionRepository: mocks.wovenProductionRepository,
}));
vi.mock("../production-orders/production-order.repository", () => ({
  __esModule: true,
  productionOrderRepository: mocks.productionOrderRepository,
}));
vi.mock("@modules/machines/machine.repository", () => ({
  __esModule: true,
  machineRepository: mocks.machineRepository,
}));
vi.mock("@modules/operators/operator.repository", () => ({
  __esModule: true,
  operatorRepository: mocks.operatorRepository,
}));
vi.mock("@modules/users/user.service", () => ({ __esModule: true, userService: mocks.userService }));

const service = () => new BatchFlowService();

/** A cutting batch: line-scoped like every other stage since 0025. */
const cuttingBatch = {
  id: 41,
  productionOrderId: 11,
  productionOrderLineId: 15,
  wovenProductionLineId: null,
  stage: "cutting",
  batchNumber: 1,
  batchCode: "C-001",
  machineId: null,
  machineName: null,
  operatorId: null,
  operatorName: null,
  labelSize: null,
  assignedRolls: "5000.00",
  producedRolls: "0.00",
  wastedRolls: "0.00",
  consumedRolls: "0.00",
  availableRolls: "0.00",
  packagedQty: "0.00",
  status: "ASSIGNED",
  notes: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

describe("BatchFlowService.getBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a cutting batch through the same path as any other stage", async () => {
    mocks.batchFlowRepository.findById.mockResolvedValue(cuttingBatch);

    // Cutting carries a line now, so there is no special case: the mutating routes re-read
    // through this method and must not need one.
    const result = await service().getBatch(41);

    expect(result).toMatchObject({ id: 41, stage: "cutting", productionOrderId: 11 });
    // withEstimates only fetches woven-time context for weaving batches; cutting needs none.
    expect(mocks.wovenProductionRepository.findOrderContext).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------- source picker */

/**
 * The picker must offer only what `createBatch` will accept. Since `lockSourcesTx` refuses a
 * source from another line, an order-wide picker would hand the floor buttons that always fail
 * with "is not a batch of line 15".
 */
describe("BatchFlowService.getAvailableSources (line-scoped)", () => {
  beforeEach(() => vi.clearAllMocks());

  const wovenLine15 = () => {
    mocks.wovenProductionRepository.findLineById.mockResolvedValue({
      id: 15,
      productionOrderId: 11,
      labelType: "Size Label",
      quantity: 40000,
    });
    mocks.productionOrderRepository.findLineById.mockResolvedValue(undefined);
  };

  it("lists cutting sources from this line only", async () => {
    wovenLine15();
    // Two weaving batches on line 15 — one exhausted, one with output still available.
    mocks.batchFlowRepository.findByLine.mockResolvedValue([
      {
        id: 37,
        batchCode: "W-001",
        producedRolls: "3000.00",
        consumedRolls: "3000.00",
        availableRolls: "0.00",
        status: "COMPLETED",
        machineName: null,
        operatorName: null,
        stage: "weaving",
      },
      {
        id: 39,
        batchCode: "W-002",
        producedRolls: "4000.00",
        consumedRolls: "0.00",
        availableRolls: "4000.00",
        status: "COMPLETED",
        machineName: null,
        operatorName: null,
        stage: "weaving",
      },
    ]);

    const result = await service().getAvailableSources(15, "cutting");

    // The line-scoped read, upstream stage, never an order-wide one.
    expect(mocks.batchFlowRepository.findByLine).toHaveBeenCalledWith(
      { kind: "woven", id: 15 },
      "weaving"
    );
    expect(mocks.batchFlowRepository.findByOrder).not.toHaveBeenCalled();
    // Only the batch with available output is exposed; the exhausted one is dropped.
    expect(result.sources.map((s: { batchCode: string }) => s.batchCode)).toEqual(["W-002"]);
    expect(result.totalAvailable).toBe(4000);
  });

  it("reports the plan's remaining quantity for a first stage instead of sources", async () => {
    wovenLine15();
    mocks.batchFlowRepository.findByLine.mockResolvedValue([]);

    const result = await service().getAvailableSources(15, "weaving");

    expect(result.fromPlan).toBe(true);
    expect(result.remainingPlanned).toBe(40000);
    expect(result.sources).toEqual([]);
    // A first stage draws from the plan, so no upstream batch is ever consulted.
    expect(mocks.batchFlowRepository.findByLine).toHaveBeenCalledWith(
      { kind: "woven", id: 15 }
    );
  });
});

/* ------------------------------------------------------------- order flow */

/** A batch row as the line-scoped read returns it: decimals as strings, sources attached. */
const batchRow = (over: Record<string, unknown>) => ({
  id: 1,
  productionOrderId: 22,
  productionOrderLineId: null as number | null,
  wovenProductionLineId: 15 as number | null,
  stage: "cutting",
  batchNumber: 1,
  batchCode: "C-001",
  machineId: null,
  machineName: null,
  operatorId: null,
  operatorName: null,
  labelSize: null,
  assignedRolls: "0.00",
  producedRolls: "0.00",
  wastedRolls: "0.00",
  consumedRolls: "0.00",
  availableRolls: "0.00",
  packagedQty: "0.00",
  status: "COMPLETED",
  notes: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  labelType: null,
  sources: [],
  ...over,
});

/** Order 22 on the floor: woven, with one label type per line by default. */
function mockOrder22(
  batches: unknown[],
  lines: Array<{ id: number; labelType: string; quantity: number }> = [
    { id: 15, labelType: "Size Label", quantity: 40000 },
  ]
) {
  mocks.productionOrderRepository.findById.mockResolvedValue({ id: 22, productType: "woven" });
  mocks.wovenProductionRepository.findLines.mockResolvedValue(
    lines.map((l) => ({ ...l, sizes: [] }))
  );
  mocks.batchFlowRepository.findByOrder.mockResolvedValue(batches);
}

/**
 * Regression (reported from the floor): the stage progress bars showed cutting at 0 while two
 * cutting batches sat on the floor, and the order could never reach "ready to complete".
 *
 * Cause: cutting and packaging batches carried no line, so a sum filtered by the line's id was
 * structurally 0 — and with it `packagedProduced`, which gates `readyForCompletion`. The pro-rata
 * overlay that used to paper over this has been deleted: all three stages carry the line now, so
 * each label type simply sums its own batches.
 */
describe("BatchFlowService.getOrderFlow (line-scoped)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("credits the cutting and packaging batches to the line that owns them", async () => {
    mockOrder22([
      batchRow({
        id: 30,
        stage: "weaving",
        batchCode: "W-001",
        assignedRolls: "40000.00",
        producedRolls: "40000.00",
        availableRolls: "0.00",
      }),
      batchRow({
        id: 41,
        batchCode: "C-001",
        assignedRolls: "40000.00",
        producedRolls: "40000.00",
        availableRolls: "40000.00",
      }),
      batchRow({
        id: 43,
        stage: "packaging",
        batchCode: "PK-001",
        assignedRolls: "40000.00",
        producedRolls: "40000.00",
        packagedQty: "40000.00",
      }),
    ]);

    const flow = await service().getOrderFlow(22);

    expect(flow.lines[0].packagedProduced).toBe(40000);
    expect(flow.lines[0].packagedLabels).toBe(40000);
    expect(flow.lines[0].batchCounts.packaging).toBe(1);
    expect(flow.lines[0].cutProduced).toBe(40000);
    expect(flow.lines[0].batchCounts.cutting).toBe(1);
    // Nothing else in the system can currently produce this trueness.
    expect(flow.readyForCompletion).toBe(true);
  });

  it("reads the order once and sums each label type's own batches", async () => {
    mockOrder22([
      batchRow({ id: 41, batchCode: "C-001", producedRolls: "22000.00", availableRolls: "22000.00" }),
    ]);

    const flow = await service().getOrderFlow(22);

    // One order-wide read; per-line figures are derived from it in memory.
    expect(mocks.batchFlowRepository.findByOrder).toHaveBeenCalledTimes(1);
    expect(mocks.batchFlowRepository.findByOrder).toHaveBeenCalledWith(22, "woven");
    expect(flow.lines[0].cutProduced).toBe(22000);
    expect(flow.totals.cutProduced).toBe(22000);
    // 40 000 planned, nothing packaged yet — the banner stays off.
    expect(flow.readyForCompletion).toBe(false);
  });

  it("gives each cutting batch to exactly one label type — never a pro-rata split", async () => {
    mockOrder22(
      [
        batchRow({
          id: 41,
          batchCode: "C-001",
          wovenProductionLineId: 15,
          producedRolls: "22000.00",
          availableRolls: "22000.00",
        }),
        batchRow({
          id: 42,
          batchCode: "C-002",
          batchNumber: 1,
          wovenProductionLineId: 16,
          producedRolls: "8000.00",
          availableRolls: "8000.00",
        }),
      ],
      [
        { id: 15, labelType: "Size Label", quantity: 40000 },
        { id: 16, labelType: "Care Label", quantity: 20000 },
      ]
    );

    const flow = await service().getOrderFlow(22);

    // A batch belongs to one line, so it lands whole on that line and nowhere else.
    expect(flow.lines.map((l) => l.cutProduced)).toEqual([22000, 8000]);
    expect(flow.totals.cutProduced).toBe(30000);
    expect(flow.lines.map((l) => l.batchCounts.cutting)).toEqual([1, 1]);
  });

  it("lists running batches on the line that owns them", async () => {
    mockOrder22(
      [
        batchRow({
          id: 41,
          batchCode: "C-001",
          status: "IN_PROGRESS",
          assignedRolls: "5000.00",
          wovenProductionLineId: 15,
        }),
        batchRow({
          id: 44,
          batchCode: "C-002",
          batchNumber: 2,
          status: "IN_PROGRESS",
          assignedRolls: "3000.00",
          wovenProductionLineId: 16,
        }),
      ],
      [
        { id: 15, labelType: "Size Label", quantity: 40000 },
        { id: 16, labelType: "Care Label", quantity: 20000 },
      ]
    );

    const flow = await service().getOrderFlow(22);

    expect(flow.lines.find((l) => l.lineId === 15)?.running).toEqual(["C-001"]);
    expect(flow.lines.find((l) => l.lineId === 16)?.running).toEqual(["C-002"]);
  });

  it("moves nothing when the batch is cancelled", async () => {
    mockOrder22([
      batchRow({
        id: 41,
        batchCode: "C-001",
        status: "CANCELLED",
        assignedRolls: "5000.00",
        producedRolls: "5000.00",
        availableRolls: "5000.00",
      }),
    ]);

    const flow = await service().getOrderFlow(22);

    expect(flow.lines[0].cutProduced).toBe(0);
    expect(flow.lines[0].batchCounts.cutting).toBe(0);
    expect(flow.totals.cutProduced).toBe(0);
  });
});


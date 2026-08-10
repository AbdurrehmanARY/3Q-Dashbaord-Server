import { productionOrderRepository, type PageOpts } from "../repositories/production-order.repository";
import { workOrderRepository } from "../repositories/work-order.repository";
import { machineRepository } from "../repositories/machine.repository";
import { operatorRepository } from "../repositories/operator.repository";
import { materialRepository } from "../repositories/material.repository";
import { inventoryRepository } from "../repositories/inventory.repository";
import { userService } from "./user.service";
import { mailService } from "./mail.service";
import { ApiError, ConflictError, NotFoundError } from "../utils/ApiError";
import {
  calculateRequiredRolls,
  calculateTotalRolls,
  calculateTotalWeight,
  DEFAULT_ROLL_LENGTH_M,
} from "../utils/production-formula";
import { buildProductionOverviewBody } from "./production-order-overview.builder";
import { Messages, Entity } from "../constants/messages";
import type { ProductionOrder, ProductionOrderLine } from "@db/schema";

import {
  RESOURCE_SLOTS,
  toNumbers,
  missingStartRequirements,
  missingCuttingRequirements,
  cascadeChain,
  hasAnyProgress,
  deriveLineStatus,
  deriveOrderPatch,
  stageCompletionPatch,
  type ProductionStage,
  type TransferTarget,
  type PlanLineInput,
} from "./production-order.helpers";

export type { ProductionStage, TransferTarget, PlanLineInput };

export class ProductionOrderService {
  /* ============================ Reads ============================ */

  async getProductionOrders(filters?: { status?: string; soNumber?: string; poNumber?: string }) {
    return productionOrderRepository.findAll(filters);
  }

  async getProductionOrder(id: number | string) {
    const order = await productionOrderRepository.findById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    const lines = await productionOrderRepository.findLines(id);
    return { ...order, lines };
  }

  /** Submitted sales orders that do not yet have a production order — the Office Staff picklist. */
  async getEligibleSalesOrders() {
    return productionOrderRepository.findEligibleWorkOrders();
  }

  private async getLineOrThrow(lineId: number | string): Promise<ProductionOrderLine> {
    const line = await productionOrderRepository.findLineById(lineId);
    if (!line) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER_LINE));
    return line;
  }

  private async getOrderOrThrow(id: number | string): Promise<ProductionOrder> {
    const order = await productionOrderRepository.findRawById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    return order;
  }

  /* ============ Machine / operator locking ============ */

  /**
   * Machines and operators held by other active production lines, mapped to the label
   * type holding them so the error can say *where* the resource already is.
   */
  private async getResourceLocks(exclude?: { lineId?: number; productionOrderId?: number }) {
    const rows = await productionOrderRepository.findResourceAssignments(exclude);
    const machines = new Map<number, string>();
    const operators = new Map<number, string>();

    for (const row of rows) {
      const where = `${row.productionNumber} · ${row.labelType}`;
      for (const slot of RESOURCE_SLOTS) {
        const id = row[slot.key];
        if (id == null) continue;
        (slot.kind === "machine" ? machines : operators).set(id, where);
      }
    }
    return { machines, operators };
  }

  /**
   * Rejects an assignment that would put a machine or operator on two active jobs at
   * once. `assignments` is the merged (existing + patch) slot set for one line.
   */
  private assertResourcesFree(
    assignments: Partial<Record<(typeof RESOURCE_SLOTS)[number]["key"], number | null | undefined>>,
    locks: { machines: Map<number, string>; operators: Map<number, string> }
  ) {
    for (const slot of RESOURCE_SLOTS) {
      const id = assignments[slot.key];
      if (id == null) continue;
      const heldBy = (slot.kind === "machine" ? locks.machines : locks.operators).get(id);
      if (heldBy) {
        throw new ApiError(`${slot.label} is already assigned to ${heldBy}`, 400);
      }
    }
  }

  /**
   * Machines and operators available to a line or an order — the free ones, plus
   * whatever the caller already holds (so its own current selection stays selectable).
   */
  async getAvailableResources(
    exclude?: { lineId?: number; productionOrderId?: number },
    /** Narrows operators to those trained for this line (the type itself plus `both`). */
    productType?: "printed" | "woven"
  ) {
    const [locks, allMachines, allOperators] = await Promise.all([
      this.getResourceLocks(exclude),
      machineRepository.findAll(),
      operatorRepository.findAll(productType ? { productType } : undefined),
    ]);

    return {
      machines: allMachines
        .filter((m) => !locks.machines.has(m.id))
        .map((m) => ({ id: m.id, name: m.machineName, machineType: m.machineType })),
      operators: allOperators
        .filter((o) => !locks.operators.has(o.id))
        .map((o) => ({ id: o.id, name: o.name, designation: o.designation })),
      lockedMachineIds: [...locks.machines.keys()],
      lockedOperatorIds: [...locks.operators.keys()],
    };
  }

  /* ==================== Phase 1: Office Staff ==================== */

  /**
   * Raises a production order against a submitted sales order. No planning happens
   * here — the order starts empty, carrying only the sales order link and its quantity.
   */
  async createProductionOrder(input: { workOrderId: number; notes?: string; createdByUserId?: number }) {
    const workOrder = await workOrderRepository.findRawById(input.workOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    if (workOrder.status === "complete") {
      throw new ApiError("Cannot raise a production order against a completed work order", 400);
    }

    const existing = await productionOrderRepository.findByWorkOrderId(input.workOrderId);
    if (existing) {
      throw new ConflictError(`Sales order ${workOrder.soNumber} already has production order ${existing.productionNumber}`);
    }

    const createdByUserId = await userService.assertActor(input.createdByUserId);

    // productionNumber is unique in the database; retry covers the gap between reading
    // the last number and inserting the new row. Create + sales-order status flip happen
    // in one transaction (see createWithWorkOrderStatusTx).
    for (let attempt = 0; attempt < 5; attempt++) {
      const productionNumber = await this.nextProductionNumber();
      try {
        return await productionOrderRepository.createWithWorkOrderStatusTx({
          productionNumber,
          workOrderId: input.workOrderId,
          totalQty: workOrder.totalQty,
          notes: input.notes,
          createdByUserId,
        });
      } catch (error: any) {
        if (error?.code !== "23505") throw error;
        // A duplicate on work_order_id means another request raised a production order for
        // this sales order first — a conflict, not something retrying a new number can fix.
        if (String(error?.detail ?? "").includes("work_order_id")) {
          throw new ConflictError(
            `Sales order ${workOrder.soNumber} already has a production order`
          );
        }
        // Otherwise it's the production-number collision the retry loop exists for.
        if (attempt === 4) throw error;
      }
    }
    throw new ApiError("Could not allocate a production number", 500);
  }

  private async nextProductionNumber(): Promise<string> {
    const last = await productionOrderRepository.findLastProductionNumber();
    const lastSeq = last ? Number(last.replace(/\D/g, "")) : 0;
    const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `PRD-${String(next).padStart(5, "0")}`;
  }

  async updateProductionOrder(
    id: number | string,
    data: { notes?: string; status?: "planned" | "production" | "complete" }
  ) {
    const order = await this.getOrderOrThrow(id);
    const patch: Partial<ProductionOrder> = {};
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "complete") {
        patch.completedAt = order.completedAt ?? new Date();
      } else {
        patch.completedAt = null;
      }
    }

    const updated = await productionOrderRepository.update(id, patch);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));

    if (data.status === "complete") {
      await this.notifyIfOrderCompleted(Number(id), "complete");
    }

    return updated;
  }

  /**
   * Deleting an order returns everything it was holding: the rolls it drew go back to
   * stock, its machines and operators are released with its lines, and the sales order
   * drops back to `initiate_production`. All of it in one transaction.
   */
  async deleteProductionOrder(id: number | string): Promise<void> {
    await this.getOrderOrThrow(id);
    await productionOrderRepository.releaseOrderInventoryTransaction(Number(id));
  }

  /* ============ Phase 2: Per-label-type planning ============ */

  /**
   * Planning happens **one label type at a time**. Each call creates a single planning
   * record and immediately reserves everything it needs — material (drawn from stock),
   * printing machine and printing operator — so the next label type cannot claim them.
   *
   * The reservation lasts until the line finishes production or is cancelled; there is
   * no separate release step.
   */
  async planLine(productionOrderId: number | string, input: PlanLineInput & { actorUserId?: number }) {
    const order = await this.getOrderOrThrow(productionOrderId);
    if (order.status === "complete") {
      throw new ApiError("Cannot add a label type to a completed production order", 400);
    }
    const actorUserId = await userService.assertActor(input.actorUserId);

    const siblings = await productionOrderRepository.findLines(productionOrderId);
    const row = await this.buildPlanRow(order, input, siblings, null);

    return productionOrderRepository.createLinePlanTransaction(
      Number(productionOrderId),
      row,
      (lines) => deriveOrderPatch(lines, order),
      actorUserId
    );
  }

  /**
   * Re-plans one label type. Rejected once the line has recorded progress: the plan is
   * what that progress is measured against.
   */
  async updateLinePlan(lineId: number | string, input: PlanLineInput & { actorUserId?: number }) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    const siblings = (await productionOrderRepository.findLines(line.productionOrderId)).filter(
      (l) => l.id !== line.id
    );
    const row = await this.buildPlanRow(order, input, siblings, line);

    return productionOrderRepository.updateLinePlanTransaction(
      Number(lineId),
      line.productionOrderId,
      row,
      (lines) => deriveOrderPatch(lines, order),
      actorUserId
    );
  }

  /**
   * Cancels one label type, releasing its rolls back to stock and freeing its machine
   * and operator for another job.
   */
  async deleteLine(lineId: number | string): Promise<void> {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    if (hasAnyProgress(line)) {
      throw new ApiError(
        `Cannot cancel '${line.labelType}': production progress has already been recorded against it`,
        400
      );
    }
    await productionOrderRepository.deleteLineTransaction(
      Number(lineId),
      line.productionOrderId,
      (lines) => deriveOrderPatch(lines, order)
    );
  }

  async reconcileLine(
    lineId: number | string,
    data: {
      usedRolls: number;
      usedWeight: number;
      extraRollsReturned: number;
      extraWeight: number;
      actorUserId?: number | null;
    }
  ) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.reconcileLineStockTransaction(Number(lineId), data);
  }

  /**
   * Validates one label type against its order and siblings, and derives the three
   * server-calculated planning figures. `current` is the line being re-planned (so its
   * own quantity, resources and stock draw are excluded from the contention checks).
   */
  private async buildPlanRow(
    order: ProductionOrder,
    input: PlanLineInput,
    siblings: ProductionOrderLine[],
    current: ProductionOrderLine | null
  ) {
    const labelType = input.labelType.trim();
    if (!labelType) throw new ApiError("Label type is required", 400);
    if (!(input.quantity > 0)) {
      throw new ApiError(`Quantity for '${labelType}' must be greater than zero`, 400);
    }
    if (!(input.labelSize > 0)) {
      throw new ApiError(`Label size for '${labelType}' must be greater than zero`, 400);
    }
    if (input.extraRolls !== undefined && input.extraRolls < 0) {
      throw new ApiError(`Extra rolls for '${labelType}' cannot be negative`, 400);
    }

    if (siblings.some((l) => l.labelType.trim().toLowerCase() === labelType.toLowerCase())) {
      throw new ApiError(`'${labelType}' is already planned on this production order`, 400);
    }

    // Incremental planning can't require an exact total on every submit, so the rule is
    // "never over-allocate"; the order is fully planned once the parts sum to totalQty.
    const plannedElsewhere = siblings.reduce((sum, l) => sum + Number(l.quantity), 0);
    if (plannedElsewhere + input.quantity > order.totalQty) {
      const remaining = order.totalQty - plannedElsewhere;
      throw new ApiError(
        `Quantity ${input.quantity} over-allocates the order: ${remaining} of ${order.totalQty} still unplanned`,
        400
      );
    }

    // Submitting a label type reserves material + printing machine + printing operator.
    if (!input.materialCode) throw new ApiError(`Select a material for '${labelType}'`, 400);
    if (input.printingMachineId == null) {
      throw new ApiError(`Select a printing machine for '${labelType}'`, 400);
    }
    if (input.printingOperatorId == null) {
      throw new ApiError(`Select a printing operator for '${labelType}'`, 400);
    }

    const material = await materialRepository.findByCode(input.materialCode);
    if (!material) throw new NotFoundError(`Material with code '${input.materialCode}' not found`);

    const assignedRollsInput = input.assignedRolls ?? 0;
    if (assignedRollsInput < 0) {
      throw new ApiError(`Assigned rolls for '${labelType}' cannot be negative`, 400);
    }

    const rollLength = input.rollLength && input.rollLength > 0 ? input.rollLength : DEFAULT_ROLL_LENGTH_M;
    const requiredRolls = calculateRequiredRolls(input.quantity, input.labelSize, rollLength);
    const extraRolls = input.extraRolls ?? 0;
    const calculatedTotalRolls = calculateTotalRolls(requiredRolls, extraRolls);

    const assignedRolls = assignedRollsInput > 0 ? assignedRollsInput : calculatedTotalRolls;
    const totalRolls = assignedRolls;
    const totalWeight = calculateTotalWeight(Number(material.weightPerRoll), totalRolls);

    // Availability is read from the inventory stock ledger only — never recomputed from
    // purchase records. Purchases credit that ledger; nothing else is stock.
    const stock = await inventoryRepository.findInventoryRollByMaterialCode(input.materialCode);
    const releasing =
      current && current.materialCode === input.materialCode ? Number(current.issuedRolls) : 0;
    const available = stock ? Number(stock.balanceRolls) + releasing : 0;

    if (assignedRolls > available) {
      throw new ApiError(
        `Cannot assign ${assignedRolls} rolls of ${input.materialCode}: only ${available} available in inventory stock`,
        400
      );
    }

    // Only the line being re-planned is excluded. Sibling label types on this same order
    // hold their own machine and operator — planning one at a time is precisely what makes
    // those reservations contend with each other.
    const locks = await this.getResourceLocks(current ? { lineId: current.id } : undefined);
    this.assertResourcesFree(
      { printingMachineId: input.printingMachineId, printingOperatorId: input.printingOperatorId },
      locks
    );

    return {
      labelType,
      quantity: String(input.quantity),
      labelSize: String(input.labelSize),
      rollLength: String(rollLength),
      requiredRolls: String(requiredRolls),
      extraRolls: String(extraRolls),
      totalRolls: String(totalRolls),
      totalWeight: String(totalWeight),
      materialCode: input.materialCode,
      printingMachineId: input.printingMachineId,
      printingOperatorId: input.printingOperatorId,
      notes: input.notes,
      assignedRolls,
    };
  }

  /* ============ Phases 4, 6 & 8: Resource assignment ============ */

  /** Assigns the machine and operator for one stage. Packaging has an operator but no machine. */
  async assignLineResources(
    lineId: number | string,
    input: { stage: ProductionStage; machineId?: number | null; operatorId?: number | null; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (input.stage === "packaging" && input.machineId != null) {
      throw new ApiError("Packaging is performed without a machine", 400);
    }

    if (input.machineId != null) {
      const machine = await machineRepository.findById(input.machineId);
      if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    }
    if (input.operatorId != null) {
      const operator = await operatorRepository.findById(input.operatorId);
      if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }

    // A machine or operator can only be on one active job at a time.
    const locks = await this.getResourceLocks({ lineId: Number(lineId) });
    const machineKey = input.stage === "cutting" ? "cuttingMachineId" : "printingMachineId";
    const operatorKey =
      input.stage === "printing"
        ? "printingOperatorId"
        : input.stage === "cutting"
          ? "cuttingOperatorId"
          : "packagingOperatorId";
    this.assertResourcesFree({ [machineKey]: input.machineId, [operatorKey]: input.operatorId }, locks);

    const patch: Partial<ProductionOrderLine> = {};
    if (input.stage === "printing") {
      if (input.machineId !== undefined) patch.printingMachineId = input.machineId;
      if (input.operatorId !== undefined) patch.printingOperatorId = input.operatorId;
    } else if (input.stage === "cutting") {
      if (input.machineId !== undefined) patch.cuttingMachineId = input.machineId;
      if (input.operatorId !== undefined) patch.cuttingOperatorId = input.operatorId;
    } else {
      if (input.operatorId !== undefined) patch.packagingOperatorId = input.operatorId;
    }

    if (Object.keys(patch).length === 0) return line;

    const order = await this.getOrderOrThrow(line.productionOrderId);
    return productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // Assignment-only edit: the patch is built from `input`, not from the line's counters,
      // so there is nothing to recompute against the locked row.
      () => ({
        linePatch: patch,
        event: { eventType: "assignment", actorUserId, note: `Assigned ${input.stage} resources` },
      }),
      (lines) => deriveOrderPatch(lines, order)
    );
  }

  /* ============ Phases 4, 6 & 8: Cumulative progress ============ */

  /**
   * Sets a stage's cumulative completed-roll count to an absolute value.
   *
   * Each stage is bounded above by what has been handed to it and below by what it has
   * already handed on, which is what lets the three stages run at the same time without
   * one being able to invalidate another:
   *
   *   sentToCutting <= printed <= totalRolls
   *   sentToPackaging <= cut <= sentToCutting
   *   packaged <= sentToPackaging
   */
  async updateStageProgress(
    lineId: number | string,
    stage: ProductionStage,
    input: { completed: number; packagedQty?: number; note?: string; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (input.completed < 0) {
      throw new ApiError("Completed rolls cannot be negative", 400);
    }

    const missing = missingStartRequirements(line);
    if (missing.length > 0) {
      throw new ApiError(
        `Production cannot start on '${line.labelType}' until a ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} assigned`,
        400
      );
    }

    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // Computed against the locked row so a concurrent edit to this line can't be lost.
      (freshLine) => {
        const n = toNumbers(freshLine);

        // Setting a stage lowers whatever is downstream of it rather than refusing the edit:
        // dropping Printing to 8 drags Cutting and Packaging down with it.
        const requested = { ...n };
        let previousValue: number;

        if (stage === "printing") {
          previousValue = n.printedRolls;
          if (input.completed > n.totalRolls) {
            throw new ApiError(`Printed rolls (${input.completed}) cannot exceed total rolls (${n.totalRolls})`, 400);
          }
          requested.printedRolls = input.completed;
        } else if (stage === "cutting") {
          previousValue = n.cutRolls;
          const missingCut = missingCuttingRequirements(freshLine);
          if (missingCut.length > 0) {
            throw new ApiError(
              `Cutting progress cannot be recorded on '${freshLine.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
              400
            );
          }
          if (input.completed > n.sentToCuttingRolls) {
            throw new ApiError(
              `Cut rolls (${input.completed}) cannot exceed the ${n.sentToCuttingRolls} sent to cutting`,
              400
            );
          }
          requested.cutRolls = input.completed;
        } else {
          previousValue = n.packagedRolls;
          if (input.completed > n.sentToPackagingRolls) {
            throw new ApiError(
              `Packaged rolls (${input.completed}) cannot exceed the ${n.sentToPackagingRolls} sent to packaging`,
              400
            );
          }
          requested.packagedRolls = input.completed;
        }

        const cascaded = cascadeChain(requested);
        const patch: Partial<ProductionOrderLine> = {};
        if (cascaded.printedRolls !== n.printedRolls) patch.printedRolls = String(cascaded.printedRolls);
        if (cascaded.sentToCuttingRolls !== n.sentToCuttingRolls) patch.sentToCuttingRolls = String(cascaded.sentToCuttingRolls);
        if (cascaded.cutRolls !== n.cutRolls) patch.cutRolls = String(cascaded.cutRolls);
        if (cascaded.sentToPackagingRolls !== n.sentToPackagingRolls) patch.sentToPackagingRolls = String(cascaded.sentToPackagingRolls);
        if (cascaded.packagedRolls !== n.packagedRolls) patch.packagedRolls = String(cascaded.packagedRolls);

        if (stage === "packaging" && input.packagedQty !== undefined) {
          if (input.packagedQty < 0) {
            throw new ApiError("Packaged quantity cannot be negative", 400);
          }
          if (input.packagedQty > n.quantity) {
            throw new ApiError(
              `Packaged quantity (${input.packagedQty}) cannot exceed the planned quantity (${n.quantity})`,
              400
            );
          }
          patch.packagedQty = String(input.packagedQty);
        }

        const mergedLine = { ...freshLine, ...patch } as ProductionOrderLine;
        patch.status = deriveLineStatus(mergedLine);
        // Record who/when each stage finished — the traceability record for the order.
        Object.assign(patch, stageCompletionPatch(mergedLine));

        return {
          linePatch: patch,
          event: {
            eventType: `${stage}_progress` as "printing_progress" | "cutting_progress" | "packaging_progress",
            previousValue: String(previousValue),
            newValue: String(input.completed),
            delta: String(input.completed - previousValue),
            actorUserId,
            note: input.note,
          },
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }

  /* ============ Phases 5 & 7: Manual stage transfers ============ */

  /**
   * Hands a batch of finished rolls to the next stage. Transfers are deltas, not
   * absolutes — the manager moves "4 more rolls", and the running total is what the
   * downstream stage is then allowed to work through.
   */
  async transferRolls(
    lineId: number | string,
    input: { target: TransferTarget; rolls: number; note?: string; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (!(input.rolls > 0)) {
      throw new ApiError("Transfer quantity must be greater than zero", 400);
    }

    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // The delta is applied to the locked row's current total, so two concurrent transfers
      // add up instead of one overwriting the other.
      (freshLine) => {
        const n = toNumbers(freshLine);
        const patch: Partial<ProductionOrderLine> = {};
        let previousValue: number;
        let newValue: number;

        if (input.target === "cutting") {
          previousValue = n.sentToCuttingRolls;
          newValue = previousValue + input.rolls;
          const missingCut = missingCuttingRequirements(freshLine);
          if (missingCut.length > 0) {
            throw new ApiError(
              `Cannot send rolls to cutting on '${freshLine.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
              400
            );
          }
          if (newValue > n.printedRolls) {
            const available = n.printedRolls - previousValue;
            throw new ApiError(
              `Cannot send ${input.rolls} rolls to cutting: only ${available} of the ${n.printedRolls} printed rolls are still waiting to be transferred`,
              400
            );
          }
          patch.sentToCuttingRolls = String(newValue);
        } else {
          previousValue = n.sentToPackagingRolls;
          newValue = previousValue + input.rolls;
          if (newValue > n.cutRolls) {
            const available = n.cutRolls - previousValue;
            throw new ApiError(
              `Cannot send ${input.rolls} rolls to packaging: only ${available} of the ${n.cutRolls} cut rolls are still waiting to be transferred`,
              400
            );
          }
          patch.sentToPackagingRolls = String(newValue);
        }

        const mergedLine = { ...freshLine, ...patch } as ProductionOrderLine;
        patch.status = deriveLineStatus(mergedLine);
        // Record who/when each stage finished — the traceability record for the order.
        Object.assign(patch, stageCompletionPatch(mergedLine));

        return {
          linePatch: patch,
          event: {
            eventType: input.target === "cutting" ? "transfer_to_cutting" : "transfer_to_packaging",
            previousValue: String(previousValue),
            newValue: String(newValue),
            delta: String(input.rolls),
            actorUserId,
            note: input.note,
          },
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }

  /* ============ Inline row editing (Production Progress table) ============ */

  /**
   * Applies a full row edit from the inline Production Progress table: any subset of
   * the five roll counters, the packaged label quantity, and the five machine/operator
   * assignments, all in one atomic save. Every provided counter is an absolute value,
   * merged with whatever wasn't sent, then validated as one consistent chain:
   *
   *   printed <= totalRolls
   *   sentToCutting <= printed
   *   cut <= sentToCutting
   *   sentToPackaging <= cut
   *   packaged <= sentToPackaging
   *
   * Unlike `updateStageProgress` (which only touches one stage and so also needs a
   * lower bound against whatever is already downstream), this touches the whole chain
   * in one transaction, so only the upper-bound checks above are needed — there's no
   * "other stage" left stale to fall out of sync with.
   */
  async updateLineFull(
    lineId: number | string,
    input: {
      printedRolls?: number;
      sentToCuttingRolls?: number;
      cutRolls?: number;
      sentToPackagingRolls?: number;
      packagedRolls?: number;
      packagedQty?: number;
      materialCode?: string;
      printingMachineId?: number | null;
      printingOperatorId?: number | null;
      cuttingMachineId?: number | null;
      cuttingOperatorId?: number | null;
      packagingOperatorId?: number | null;
      status?: ProductionOrderLine["status"];
      note?: string;
      actorUserId?: number;
    }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    const touchesProgress =
      input.printedRolls !== undefined ||
      input.sentToCuttingRolls !== undefined ||
      input.cutRolls !== undefined ||
      input.sentToPackagingRolls !== undefined ||
      input.packagedRolls !== undefined ||
      input.packagedQty !== undefined;

    // Steps 3-5 of the workflow gate step 6: nothing can be produced against a line that
    // has no material or no printing crew. Assignment-only edits are how you clear it.
    if (touchesProgress) {
      const merged = {
        ...line,
        materialCode: input.materialCode ?? line.materialCode,
        printingMachineId:
          input.printingMachineId !== undefined ? input.printingMachineId : line.printingMachineId,
        printingOperatorId:
          input.printingOperatorId !== undefined ? input.printingOperatorId : line.printingOperatorId,
      } as ProductionOrderLine;
      const missing = missingStartRequirements(merged);
      if (missing.length > 0) {
        throw new ApiError(
          `Production cannot start on '${line.labelType}' until a ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} assigned`,
          400
        );
      }

      const effectiveCuttingMachine =
        input.cuttingMachineId !== undefined ? input.cuttingMachineId : line.cuttingMachineId;
      const effectiveCuttingOperator =
        input.cuttingOperatorId !== undefined ? input.cuttingOperatorId : line.cuttingOperatorId;

      const isCuttingActive =
        (input.sentToCuttingRolls !== undefined && input.sentToCuttingRolls > 0) ||
        (input.cutRolls !== undefined && input.cutRolls > 0) ||
        Number(line.sentToCuttingRolls) > 0 ||
        Number(line.cutRolls) > 0;

      if (isCuttingActive) {
        const missingCut = missingCuttingRequirements({
          cuttingMachineId: effectiveCuttingMachine,
          cuttingOperatorId: effectiveCuttingOperator,
        });
        if (missingCut.length > 0) {
          throw new ApiError(
            `Cutting cannot proceed on '${line.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
            400
          );
        }
      }
    }

    // Resource validity + one-active-job checks read external state, so they stay outside
    // the transaction (they aren't what the per-line lock protects against). Fetched in
    // parallel rather than one round trip at a time.
    const machineIds = [input.printingMachineId, input.cuttingMachineId].filter(
      (id): id is number => id != null
    );
    const operatorIds = [
      input.printingOperatorId,
      input.cuttingOperatorId,
      input.packagingOperatorId,
    ].filter((id): id is number => id != null);
    const [machines, operators] = await Promise.all([
      Promise.all(machineIds.map((id) => machineRepository.findById(id))),
      Promise.all(operatorIds.map((id) => operatorRepository.findById(id))),
    ]);
    if (machines.some((m) => !m)) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    if (operators.some((o) => !o)) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));

    // A resource freed by this same edit shouldn't count as taken, so only the slots the
    // caller is actually setting are checked, against locks held by *other* lines.
    this.assertResourcesFree(
      {
        printingMachineId: input.printingMachineId,
        printingOperatorId: input.printingOperatorId,
        cuttingMachineId: input.cuttingMachineId,
        cuttingOperatorId: input.cuttingOperatorId,
        packagingOperatorId: input.packagingOperatorId,
      },
      await this.getResourceLocks({ lineId: Number(lineId) })
    );

    // Builds the counter + assignment patch from a snapshot of the line. Every provided
    // counter is absolute, merged with whatever wasn't sent, then validated and cascaded as
    // one chain (only the top is a hard error; everything below resolves by clamping). Run
    // once against the pre-read row to short-circuit a genuine no-op, then again inside the
    // transaction against the *locked* row so a concurrent counter edit to this line is
    // recomputed against — never silently overwritten.
    const buildRowPatch = (src: ProductionOrderLine): Partial<ProductionOrderLine> => {
      const n = toNumbers(src);
      const requested = {
        printedRolls: input.printedRolls ?? n.printedRolls,
        sentToCuttingRolls: input.sentToCuttingRolls ?? n.sentToCuttingRolls,
        cutRolls: input.cutRolls ?? n.cutRolls,
        sentToPackagingRolls: input.sentToPackagingRolls ?? n.sentToPackagingRolls,
        packagedRolls: input.packagedRolls ?? n.packagedRolls,
      };

      if (requested.printedRolls > n.totalRolls) {
        throw new ApiError(`Printed (${requested.printedRolls}) cannot exceed total rolls (${n.totalRolls})`, 400);
      }
      if (input.sentToCuttingRolls !== undefined && input.sentToCuttingRolls > requested.printedRolls) {
        throw new ApiError(`Cutting (${input.sentToCuttingRolls}) cannot exceed printed (${requested.printedRolls})`, 400);
      }
      if (input.cutRolls !== undefined && input.cutRolls > requested.sentToCuttingRolls) {
        throw new ApiError(`Cutted (${input.cutRolls}) cannot exceed cutting (${requested.sentToCuttingRolls})`, 400);
      }
      if (input.sentToPackagingRolls !== undefined && input.sentToPackagingRolls > requested.cutRolls) {
        throw new ApiError(
          `Packaging (${input.sentToPackagingRolls}) cannot exceed cutted (${requested.cutRolls})`,
          400
        );
      }
      if (input.packagedRolls !== undefined && input.packagedRolls > requested.sentToPackagingRolls) {
        throw new ApiError(
          `Packaged (${input.packagedRolls}) cannot exceed packaging (${requested.sentToPackagingRolls})`,
          400
        );
      }

      const merged = { ...cascadeChain(requested), packagedQty: input.packagedQty ?? n.packagedQty };

      if (merged.packagedQty > n.quantity) {
        throw new ApiError(
          `Packaged quantity (${merged.packagedQty}) cannot exceed the planned quantity (${n.quantity})`,
          400
        );
      }

      const patch: Partial<ProductionOrderLine> = {};
      if (merged.printedRolls !== n.printedRolls) patch.printedRolls = String(merged.printedRolls);
      if (merged.sentToCuttingRolls !== n.sentToCuttingRolls) patch.sentToCuttingRolls = String(merged.sentToCuttingRolls);
      if (merged.cutRolls !== n.cutRolls) patch.cutRolls = String(merged.cutRolls);
      if (merged.sentToPackagingRolls !== n.sentToPackagingRolls) patch.sentToPackagingRolls = String(merged.sentToPackagingRolls);
      if (merged.packagedRolls !== n.packagedRolls) patch.packagedRolls = String(merged.packagedRolls);
      if (input.packagedQty !== undefined) patch.packagedQty = String(merged.packagedQty);
      if (input.materialCode !== undefined) patch.materialCode = input.materialCode;
      if (input.printingMachineId !== undefined) patch.printingMachineId = input.printingMachineId;
      if (input.printingOperatorId !== undefined) patch.printingOperatorId = input.printingOperatorId;
      if (input.cuttingMachineId !== undefined) patch.cuttingMachineId = input.cuttingMachineId;
      if (input.cuttingOperatorId !== undefined) patch.cuttingOperatorId = input.cuttingOperatorId;
      if (input.packagingOperatorId !== undefined) patch.packagingOperatorId = input.packagingOperatorId;
      if (input.status !== undefined) patch.status = input.status;
      return patch;
    };

    // Nothing actually changes vs. the current row → no write, no audit event (as before).
    if (Object.keys(buildRowPatch(line)).length === 0) return line;

    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      (freshLine) => {
        const patch = buildRowPatch(freshLine);
        const mergedLine = { ...freshLine, ...patch } as ProductionOrderLine;
        patch.status = input.status ?? deriveLineStatus(mergedLine);
        // Record who/when each stage finished — the traceability record for the order.
        Object.assign(patch, stageCompletionPatch(mergedLine));
        return {
          linePatch: patch,
          event: {
            eventType: "row_update",
            actorUserId,
            note: input.note ?? "Row edited via Production Progress table",
          },
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }

  /* ============ Material issuance from inventory ============ */

  /**
   * Issues raw material rolls from inventory to a production line.
   *
   * Two guards, mirroring the physical constraints: you cannot issue more than is
   * actually in stock, and you cannot issue more than the line was planned to consume
   * (`totalRolls`, i.e. required + extra).
   */
  async issueRolls(
    lineId: number | string,
    input: { materialCode?: string; rolls: number; note?: string; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    // Confirm the parent order exists (issuance doesn't change its status).
    await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (!(input.rolls > 0)) {
      throw new ApiError("Issued rolls must be greater than zero", 400);
    }

    // Fall back to the material planned for this line when the caller doesn't override it.
    const materialCode = input.materialCode ?? line.materialCode ?? undefined;
    if (!materialCode) {
      throw new ApiError(
        "This label type has no material assigned. Set a material on the production plan before issuing rolls.",
        400
      );
    }

    const material = await materialRepository.findByCode(materialCode);
    if (!material) throw new NotFoundError(`Material with code '${materialCode}' not found`);

    const stock = await inventoryRepository.findInventoryRollByMaterialCode(materialCode);
    if (!stock) throw new NotFoundError(`No inventory record for material '${materialCode}'`);

    const balance = Number(stock.balanceRolls);
    if (input.rolls > balance) {
      throw new ApiError(
        `Cannot issue ${input.rolls} rolls of ${materialCode}: only ${balance} in stock`,
        400
      );
    }

    const n = toNumbers(line);
    if (n.totalRolls > 0 && n.issuedRolls + input.rolls > n.totalRolls) {
      const remaining = Math.max(n.totalRolls - n.issuedRolls, 0);
      throw new ApiError(
        `Cannot issue ${input.rolls} rolls: this label type needs ${n.totalRolls} in total and ${n.issuedRolls} have already been issued (${remaining} remaining)`,
        400
      );
    }

    await productionOrderRepository.issueRollsTransaction(
      Number(lineId),
      materialCode,
      input.rolls,
      input.note,
      actorUserId
    );

    // If the line was planned without a material, remember what was actually issued.
    if (!line.materialCode) {
      await productionOrderRepository.updateLine(lineId, { materialCode });
    }

    return this.getLineOrThrow(lineId);
  }

  async getLineIssuances(lineId: number | string, opts?: PageOpts) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.findLineIssuances(lineId, opts);
  }

  /* ============ Audit trail ============ */

  async getLineEvents(lineId: number | string, opts?: PageOpts) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.findLineEvents(lineId, opts);
  }

  async getOrderEvents(id: number | string, opts?: PageOpts) {
    await this.getOrderOrThrow(id);
    return productionOrderRepository.findOrderEvents(id, opts);
  }

  /* ============ Production Manager dashboard ============ */

  /**
   * Everything the manager dashboard renders, in one round trip: order header,
   * per-label-type planning/assignment/live-progress detail, and order rollups.
   */
  async getProductionOrderOverview(id: number | string) {
    const order = await productionOrderRepository.findById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));

    const rawLines = await productionOrderRepository.findLines(id);
    const [allMachines, allOperators, allMaterials] = await Promise.all([
      machineRepository.findAll({ includeInactive: true }),
      operatorRepository.findAll({ includeInactive: true }),
      materialRepository.findAll(),
    ]);

    // Per-label-type detail + order rollups are pure shaping — see the builder.
    const { lines, totals } = buildProductionOverviewBody(
      rawLines,
      allMachines,
      allOperators,
      allMaterials,
      order.totalQty
    );

    return {
      productionOrder: {
        id: order.id,
        productionNumber: order.productionNumber,
        workOrderId: order.workOrderId,
        soNumber: order.soNumber,
        poNumber: order.poNumber,
        // The customer is the company that owns the brand — the schema has no separate
        // customer entity, so both fields resolve to the same company name.
        companyId: order.companyId,
        companyName: order.companyName,
        customer: order.companyName,
        productType: order.productType,
        brandId: order.brandId,
        brandName: order.brandName,
        totalQty: order.totalQty,
        status: order.status,
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        notes: order.notes,
        plannedAt: order.plannedAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
      },
      lines,
      totals,
    };
  }

  private async notifyIfOrderCompleted(productionOrderId: number, previousStatus: string) {
    if (previousStatus === "complete") return;
    try {
      const updatedOrder = await productionOrderRepository.findById(productionOrderId);
      if (updatedOrder && updatedOrder.status === "complete") {
        mailService
          .sendProductionCompletedEmail({
            productionNumber: updatedOrder.productionNumber,
            soNumber: updatedOrder.soNumber,
            poNumber: updatedOrder.poNumber,
            companyName: updatedOrder.companyName,
            brandName: updatedOrder.brandName,
            totalQty: updatedOrder.totalQty,
            completedAt: updatedOrder.completedAt,
          })
          .catch((err) => {
            console.error("[ProductionOrderService] Error sending completion email:", err);
          });
      }
    } catch (err) {
      console.error("[ProductionOrderService] Failed to check completion status for email notification:", err);
    }
  }
}

export const productionOrderService = new ProductionOrderService();

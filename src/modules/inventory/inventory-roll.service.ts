import {
  inventoryRollRepository,
  type RollListFilters,
} from "./inventory-roll.repository";
import { materialRepository } from "./material.repository";
import { ApiError, ConflictError, NotFoundError } from "@shared/errors/ApiError";
import { Messages } from "@shared/constants/messages";
import { userService } from "@modules/users/user.service";

/** A ledger row plus its computed, read-only per-SKU balance. */
export interface InventoryRollWithComputed {
  id: number;
  materialCode: string;
  openingStock: string;
  receivedRolls: string;
  issuedRolls: string;
  balanceRolls: string;
  rollPerKg: string;
  perSkuBalance: string;
  materialDescription?: string | null;
  materialType?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Per-SKU balance = remaining (balance) rolls × rolls-per-kg. Always derived, never stored. */
function withPerSkuBalance<T extends { balanceRolls: string; rollPerKg: string }>(roll: T) {
  return { ...roll, perSkuBalance: String(Number(roll.balanceRolls) * Number(roll.rollPerKg)) };
}

/** Rejects a stock figure that isn't a usable non-negative number. */
function assertNonNegative(label: string, value?: number) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(`${label} must be zero or greater`, 400);
  }
}

export class InventoryRollService {
  /**
   * Reconciles the ledgers with purchasing once, then reads. The sync has to finish before
   * either read so the page and its total can't disagree — running it inside both would
   * have them racing to write the same rows.
   */
  async getInventoryRolls(filters?: RollListFilters) {
    await inventoryRollRepository.syncMaterialStockLedgers();
    const [rows, total] = await Promise.all([
      inventoryRollRepository.findAll(filters),
      inventoryRollRepository.countAll(filters),
    ]);
    return { items: rows.map(withPerSkuBalance), total };
  }

  async getInventoryRollByMaterialCode(materialCode: string) {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));
    return withPerSkuBalance(roll);
  }

  /** Append-only movement history for one material, or the whole ledger. */
  async getMovements(materialCode?: string, limit?: number) {
    const rows = await inventoryRollRepository.findMovements(materialCode, limit);
    return rows.map((r) => ({ ...r, rolls: Number(r.rolls), balanceAfter: Number(r.balanceAfter) }));
  }

  async createInventoryRoll(data: {
    materialCode: string;
    openingStock?: number;
    receivedRolls?: number;
    issuedRolls?: number;
    rollPerKg?: number;
    actorUserId?: number;
  }) {
    const material = await materialRepository.findByCode(data.materialCode);
    if (!material) throw new NotFoundError(Messages.notFound("Material"));

    const existing = await inventoryRollRepository.findByMaterialCode(data.materialCode);
    if (existing) {
      throw new ConflictError(`A stock ledger already exists for ${data.materialCode}`);
    }

    assertNonNegative("Opening stock", data.openingStock);
    assertNonNegative("Received rolls", data.receivedRolls);
    assertNonNegative("Issued rolls", data.issuedRolls);
    assertNonNegative("Rolls per kg", data.rollPerKg);

    const openingStock = data.openingStock ?? 0;
    const receivedRolls = data.receivedRolls ?? 0;
    const issuedRolls = data.issuedRolls ?? 0;
    // Balance is always derived — accepting it from the client would let the three inputs
    // and the balance disagree from the very first row.
    const balanceRolls = openingStock + receivedRolls - issuedRolls;
    if (balanceRolls < 0) {
      throw new ApiError(
        `Issued rolls (${issuedRolls}) cannot exceed opening plus received (${openingStock + receivedRolls})`,
        400
      );
    }

    const actorUserId = await userService.assertActor(data.actorUserId);
    const roll = await inventoryRollRepository.createWithHistory(
      {
        materialCode: data.materialCode,
        openingStock: String(openingStock),
        receivedRolls: String(receivedRolls),
        issuedRolls: String(issuedRolls),
        balanceRolls: String(balanceRolls),
        rollPerKg: String(data.rollPerKg ?? 0),
      },
      actorUserId
    );
    return withPerSkuBalance(roll);
  }

  /**
   * Edits a ledger. Any change to the three stock figures re-derives the balance, and the
   * difference is written to the movement history as an adjustment, so the history always
   * reconciles to the balance.
   */
  async updateInventoryRoll(
    materialCode: string,
    data: {
      openingStock?: number;
      receivedRolls?: number;
      issuedRolls?: number;
      rollPerKg?: number;
      note?: string;
      actorUserId?: number;
    }
  ) {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));

    assertNonNegative("Opening stock", data.openingStock);
    assertNonNegative("Received rolls", data.receivedRolls);
    assertNonNegative("Issued rolls", data.issuedRolls);
    assertNonNegative("Rolls per kg", data.rollPerKg);

    const openingStock = data.openingStock ?? Number(roll.openingStock);
    const receivedRolls = data.receivedRolls ?? Number(roll.receivedRolls);
    const issuedRolls = data.issuedRolls ?? Number(roll.issuedRolls);
    const balanceRolls = openingStock + receivedRolls - issuedRolls;
    if (balanceRolls < 0) {
      throw new ApiError(
        `Issued rolls (${issuedRolls}) cannot exceed opening plus received (${openingStock + receivedRolls})`,
        400
      );
    }

    const actorUserId = await userService.assertActor(data.actorUserId);
    const updated = await inventoryRollRepository.updateWithHistory(
      materialCode,
      {
        openingStock: String(openingStock),
        receivedRolls: String(receivedRolls),
        issuedRolls: String(issuedRolls),
        balanceRolls: String(balanceRolls),
        ...(data.rollPerKg !== undefined ? { rollPerKg: String(data.rollPerKg) } : {}),
      },
      data.note,
      actorUserId
    );
    if (!updated) throw new NotFoundError(Messages.notFound("Inventory roll"));
    return withPerSkuBalance(updated);
  }

  /**
   * Removes a ledger. Blocked while production has drawn against the material — deleting it
   * would orphan those issuances and silently change what the floor believes it holds.
   */
  async deleteInventoryRoll(materialCode: string): Promise<void> {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));

    if (Number(roll.issuedRolls) > 0) {
      throw new ApiError(
        `Cannot delete the ${materialCode} ledger: ${Number(roll.issuedRolls)} rolls have already been issued to production. Adjust the stock instead.`,
        400
      );
    }
    await inventoryRollRepository.delete(materialCode);
  }
}

export const inventoryRollService = new InventoryRollService();

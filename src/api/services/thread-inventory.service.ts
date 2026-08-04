import {
  threadInventoryRepository,
  type Denier,
  type StockType,
} from "../repositories/thread-inventory.repository";
import { userService } from "./user.service";
import { ApiError, NotFoundError } from "../utils/ApiError";

export interface ThreadPurchaseInput {
  receivedDate: string;
  denier: Denier;
  threadColor: "White" | "Black";
  vendor: string;
  invoiceNumber: string;
  totalCtns: number;
  weightPerCtnKg: number;
  notes?: string;
  actorUserId?: number;
}

export interface DyeBatchInput {
  denier: Denier;
  fromColorName: "White" | "Black";
  toColorName: string;
  toColorCode: string;
  inputWeightKg: number;
  outputWeightKg: number;
  notes?: string;
  actorUserId?: number;
}

/**
 * Thread inventory: receiving, dyeing and stock reporting.
 *
 * `totalWeightKg` on a purchase is **always** computed here as `weightPerCtnKg × totalCtns`
 * — the validation schema has no field for it, mirroring how the printed side treats its
 * purchase-record formulas.
 */
export class ThreadInventoryService {
  /* ========================= Stock ========================= */

  async getStocks(filters?: { stockType?: StockType; denier?: Denier; colorName?: string }) {
    const rows = await threadInventoryRepository.findStocks(filters);
    return rows.map((r) => ({
      ...r,
      balanceKg: Number(r.balanceKg),
      receivedKg: Number(r.receivedKg),
      consumedKg: Number(r.consumedKg),
    }));
  }

  /** Stock split into the two pools the floor thinks in terms of. */
  async getStockSummary() {
    const rows = await this.getStocks();
    const primary = rows.filter((r) => r.stockType === "primary");
    const secondary = rows.filter((r) => r.stockType === "secondary");
    return {
      primary,
      secondary,
      totals: {
        primaryKg: primary.reduce((a, r) => a + r.balanceKg, 0),
        secondaryKg: secondary.reduce((a, r) => a + r.balanceKg, 0),
        primaryCount: primary.length,
        secondaryCount: secondary.length,
      },
    };
  }

  /**
   * Creates a thread ledger by hand (the usual source is receiving or dyeing, but a facility
   * needs to be able to record stock it already holds).
   */
  async createStock(input: {
    stockType: StockType;
    denier: Denier;
    colorName: string;
    colorCode?: string | null;
    openingKg?: number;
    actorUserId?: number;
  }) {
    const actorUserId = await userService.assertActor(input.actorUserId);
    const colorName = input.colorName.trim();
    if (!colorName) throw new ApiError("Colour name is required", 400);

    // Dyed stock is identified by its dye lot; undyed stock has no code by definition.
    const colorCode = input.stockType === "secondary" ? (input.colorCode ?? "").trim() : null;
    if (input.stockType === "secondary" && !colorCode) {
      throw new ApiError("Dyed (secondary) stock requires a colour code", 400);
    }
    if (input.openingKg !== undefined && input.openingKg < 0) {
      throw new ApiError("Opening balance cannot be negative", 400);
    }

    const clash = (await threadInventoryRepository.findStocks({
      stockType: input.stockType,
      denier: input.denier,
    })).find(
      (s) =>
        s.colorName.toLowerCase() === colorName.toLowerCase() &&
        (s.colorCode ?? "").toLowerCase() === (colorCode ?? "").toLowerCase()
    );
    if (clash) {
      throw new ApiError(`A ${input.stockType} ledger already exists for this colour and denier`, 400);
    }

    return threadInventoryRepository.createStockWithHistory(
      { stockType: input.stockType, denier: input.denier, colorName, colorCode },
      input.openingKg ?? 0,
      actorUserId
    );
  }

  /** Edits a thread ledger; a balance change is recorded as an adjustment movement. */
  async updateStock(
    id: number,
    input: { colorName?: string; colorCode?: string | null; balanceKg?: number; note?: string; actorUserId?: number }
  ) {
    const existing = await threadInventoryRepository.findStockById(id);
    if (!existing) throw new NotFoundError("Thread stock not found");
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (input.balanceKg !== undefined && input.balanceKg < 0) {
      throw new ApiError("Balance cannot be negative", 400);
    }
    if (input.colorName !== undefined && !input.colorName.trim()) {
      throw new ApiError("Colour name is required", 400);
    }

    return threadInventoryRepository.updateStockWithHistory(
      id,
      {
        ...(input.colorName !== undefined ? { colorName: input.colorName.trim() } : {}),
        ...(input.colorCode !== undefined
          ? { colorCode: input.colorCode ? input.colorCode.trim() : null }
          : {}),
        ...(input.balanceKg !== undefined ? { balanceKg: input.balanceKg } : {}),
      },
      input.note,
      actorUserId
    );
  }

  /**
   * Removes a thread ledger. Blocked once any of it has been consumed — deleting it would
   * orphan the dye batches and production draws that reference it.
   */
  async deleteStock(id: number) {
    const existing = await threadInventoryRepository.findStockById(id);
    if (!existing) throw new NotFoundError("Thread stock not found");

    // Only real process consumption blocks deletion — a manual recount does not, even
    // though it also shows up in `consumedKg`.
    const consumedByProcess = await threadInventoryRepository.findConsumedByProcessKg(id);
    if (consumedByProcess > 0) {
      throw new ApiError(
        `Cannot delete ${existing.colorName} ${existing.denier}D: ${consumedByProcess} kg has already been issued to production or dyeing. Adjust the balance instead.`,
        400
      );
    }
    await threadInventoryRepository.deleteStock(id);
  }

  async getMovements(threadStockId?: number, limit?: number) {
    const rows = await threadInventoryRepository.findMovements(threadStockId, limit);
    return rows.map((r) => ({
      ...r,
      weightKg: Number(r.weightKg),
      balanceAfterKg: Number(r.balanceAfterKg),
    }));
  }

  /* ======================= Purchases ======================= */

  async getPurchases(filters?: { vendor?: string; denier?: Denier }) {
    const rows = await threadInventoryRepository.findPurchases(filters);
    return rows.map((r) => ({
      ...r,
      weightPerCtnKg: Number(r.weightPerCtnKg),
      totalWeightKg: Number(r.totalWeightKg),
    }));
  }

  /**
   * Records a thread receipt and credits primary (undyed) stock in the same transaction —
   * there is no approval step, exactly like the printed purchase records.
   */
  async createPurchase(input: ThreadPurchaseInput) {
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (!(input.totalCtns > 0)) throw new ApiError("Total cartons must be greater than zero", 400);
    if (!(input.weightPerCtnKg > 0)) {
      throw new ApiError("Weight per carton must be greater than zero", 400);
    }

    // Server-calculated — a client-supplied total is ignored.
    const totalWeightKg = input.weightPerCtnKg * input.totalCtns;

    return threadInventoryRepository.createPurchaseWithStock(
      {
        receivedDate: input.receivedDate,
        itemName: "Thread",
        denier: input.denier,
        threadColor: input.threadColor,
        vendor: input.vendor,
        invoiceNumber: input.invoiceNumber,
        totalCtns: input.totalCtns,
        weightPerCtnKg: String(input.weightPerCtnKg),
        totalWeightKg: String(totalWeightKg),
        notes: input.notes,
      },
      { denier: input.denier, colorName: input.threadColor, weightKg: totalWeightKg },
      actorUserId
    );
  }

  /** Deleting a receipt reverses its stock credit; blocked if the thread is already used. */
  async deletePurchase(id: number, actorUserId?: number) {
    const existing = await threadInventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError("Thread purchase not found");
    const actor = await userService.assertActor(actorUserId);

    await threadInventoryRepository.deletePurchaseWithStock(
      id,
      {
        denier: existing.denier,
        colorName: existing.threadColor,
        weightKg: Number(existing.totalWeightKg),
      },
      actor
    );
  }

  /* ========================= Dyeing ========================= */

  async getDyeBatches() {
    const rows = await threadInventoryRepository.findDyeBatches();
    return rows.map((r) => ({
      ...r,
      inputWeightKg: Number(r.inputWeightKg),
      outputWeightKg: Number(r.outputWeightKg),
    }));
  }

  private async nextBatchNumber(): Promise<string> {
    const last = await threadInventoryRepository.findLastBatchNumber();
    const lastSeq = last ? Number(last.replace(/\D/g, "")) : 0;
    const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `DYE-${String(next).padStart(5, "0")}`;
  }

  /**
   * Dyes undyed thread into a colour: debits primary, credits secondary, atomically.
   *
   * Output may legitimately be less than input (process loss), but more output than input
   * would be creating thread from nothing — that is rejected.
   */
  async createDyeBatch(input: DyeBatchInput) {
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (!(input.inputWeightKg > 0)) throw new ApiError("Input weight must be greater than zero", 400);
    if (!(input.outputWeightKg > 0)) throw new ApiError("Output weight must be greater than zero", 400);
    if (input.outputWeightKg > input.inputWeightKg) {
      throw new ApiError(
        `Dyed output (${input.outputWeightKg} kg) cannot exceed the undyed input (${input.inputWeightKg} kg)`,
        400
      );
    }
    if (!input.toColorName?.trim()) throw new ApiError("Colour name is required", 400);
    if (!input.toColorCode?.trim()) throw new ApiError("Colour code is required", 400);

    const batchNumber = await this.nextBatchNumber();

    return threadInventoryRepository.createDyeBatchTransaction(
      {
        batchNumber,
        denier: input.denier,
        colorName: input.toColorName.trim(),
        colorCode: input.toColorCode.trim(),
        inputWeightKg: String(input.inputWeightKg),
        outputWeightKg: String(input.outputWeightKg),
        notes: input.notes,
        actorUserId,
      },
      { denier: input.denier, colorName: input.fromColorName },
      { denier: input.denier, colorName: input.toColorName.trim(), colorCode: input.toColorCode.trim() },
      { inputKg: input.inputWeightKg, outputKg: input.outputWeightKg },
      actorUserId
    );
  }
}

export const threadInventoryService = new ThreadInventoryService();

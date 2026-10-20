import { db } from "@db/index";
import {
  threadDyeingSends,
  threadDyeingAllocations,
  threadDyeingReceives,
  threadServiceProviders,
} from "@db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { threadInventoryRepository, type Denier } from "../thread-inventory/thread-inventory.repository";
import { BadRequestError, NotFoundError } from "@shared/errors/ApiError";
import type { NewThreadDyeingSend, NewThreadDyeingAllocation, NewThreadDyeingReceive } from "@db/schema";

export class ThreadDyeingRepository {
  async findSends() {
    return db
      .select({
        id: threadDyeingSends.id,
        serviceProviderId: threadDyeingSends.serviceProviderId,
        serviceProviderName: threadServiceProviders.name,
        sendingDate: threadDyeingSends.sendingDate,
        senderTrackingNumber: threadDyeingSends.senderTrackingNumber,
        denier: threadDyeingSends.denier,
        baseThreadColor: threadDyeingSends.baseThreadColor,
        totalWeightSent: threadDyeingSends.totalWeightSent,
        status: threadDyeingSends.status,
        createdAt: threadDyeingSends.createdAt,
      })
      .from(threadDyeingSends)
      .leftJoin(threadServiceProviders, eq(threadDyeingSends.serviceProviderId, threadServiceProviders.id))
      .orderBy(desc(threadDyeingSends.sendingDate), desc(threadDyeingSends.id));
  }

  async findAllocationsForSends(sendIds: number[]) {
    if (sendIds.length === 0) return [];
    return db
      .select()
      .from(threadDyeingAllocations)
      .where(inArray(threadDyeingAllocations.threadDyeingSendId, sendIds));
  }

  async findReceivesForSends(sendIds: number[]) {
    if (sendIds.length === 0) return [];
    return db
      .select()
      .from(threadDyeingReceives)
      .where(inArray(threadDyeingReceives.threadDyeingSendId, sendIds));
  }

  async findSendById(id: number) {
    const [send] = await db.select().from(threadDyeingSends).where(eq(threadDyeingSends.id, id));
    return send;
  }

  /**
   * Records a send + its colour allocations and deducts the total from Undyed (primary)
   * stock — all atomic. The stock debit runs through the shared `moveStockTx`, so it locks
   * the ledger row and refuses to go negative just like every other thread outflow.
   */
  async sendForDyeingTransaction(
    send: NewThreadDyeingSend,
    allocations: Omit<NewThreadDyeingAllocation, "threadDyeingSendId">[],
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [sendRow] = await tx.insert(threadDyeingSends).values(send).returning();

      const allocRows = await tx
        .insert(threadDyeingAllocations)
        .values(allocations.map((a) => ({ ...a, threadDyeingSendId: sendRow.id })))
        .returning();

      const primary = await threadInventoryRepository.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: send.denier as Denier,
        colorName: send.baseThreadColor,
        colorCode: null,
      });
      await threadInventoryRepository.moveStockTx(
        tx,
        primary.id,
        -Number(send.totalWeightSent),
        "dye_consume",
        {
          referenceType: "thread_dyeing_send",
          referenceId: sendRow.id,
          note: `Sent for dyeing (${allocRows.length} colour${allocRows.length === 1 ? "" : "s"})`,
          actorUserId,
        }
      );

      return { ...sendRow, allocations: allocRows };
    });
  }

  /**
   * Receives a send back dyed: one Dyed (secondary) stock credit per allocation colour, then
   * advances the send status — all atomic. Re-receiving a completed send is refused.
   */
  async receiveDyedTransaction(
    sendId: number,
    receive: Omit<NewThreadDyeingReceive, "threadDyeingSendId">,
    received: Array<{ id: number; colorCode?: string; receivedWeight: number }>,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [send] = await tx
        .select()
        .from(threadDyeingSends)
        .where(eq(threadDyeingSends.id, sendId))
        .for("update");
      if (!send) throw new NotFoundError("Thread dyeing send not found");
      if (send.status === "received") {
        throw new BadRequestError("This send has already been received in full");
      }

      const allocations = await tx
        .select()
        .from(threadDyeingAllocations)
        .where(eq(threadDyeingAllocations.threadDyeingSendId, sendId));
      const allocById = new Map(allocations.map((a) => [a.id, a]));

      const [receiveRow] = await tx
        .insert(threadDyeingReceives)
        .values({ ...receive, threadDyeingSendId: sendId })
        .returning();

      for (const r of received) {
        const alloc = allocById.get(r.id);
        if (!alloc) throw new BadRequestError(`Allocation ${r.id} does not belong to this send`);
        // Colour code is finalised at receive; the entered "after" weight is what's credited.
        const code = (r.colorCode?.trim() || alloc.colorCode?.trim() || alloc.pantone?.trim() || alloc.colorName.trim());

        await tx
          .update(threadDyeingAllocations)
          .set({ colorCode: code, receivedWeight: String(r.receivedWeight) })
          .where(eq(threadDyeingAllocations.id, alloc.id));

        const secondary = await threadInventoryRepository.getOrCreateStockTx(tx, {
          stockType: "secondary",
          denier: send.denier as Denier,
          colorName: alloc.colorName,
          colorCode: code,
        });
        await threadInventoryRepository.moveStockTx(tx, secondary.id, r.receivedWeight, "dye_produce", {
          referenceType: "thread_dyeing_receive",
          referenceId: receiveRow.id,
          note: `Received dyed ${alloc.colorName} (${code}) from provider`,
          actorUserId,
        });
      }

      await tx
        .update(threadDyeingSends)
        .set({ status: "received", updatedAt: new Date() })
        .where(eq(threadDyeingSends.id, sendId));

      return receiveRow;
    });
  }
}

export const threadDyeingRepository = new ThreadDyeingRepository();

import { threadDyeingRepository } from "../repositories/thread-dyeing.repository";
import { threadServiceProviderRepository } from "../repositories/thread-service-provider.repository";
import { BadRequestError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type { CreateDyeingSendDTO, ReceiveDyeingDTO } from "../validations/thread-dyeing.validation";

export class ThreadDyeingService {
  /** Sends with their colour allocations and receive records folded in. */
  async listSends() {
    const sends = await threadDyeingRepository.findSends();
    const ids = sends.map((s) => s.id);
    const [allocations, receives] = await Promise.all([
      threadDyeingRepository.findAllocationsForSends(ids),
      threadDyeingRepository.findReceivesForSends(ids),
    ]);
    return sends.map((s) => ({
      ...s,
      totalWeightSent: Number(s.totalWeightSent),
      allocations: allocations
        .filter((a) => a.threadDyeingSendId === s.id)
        .map((a) => ({ ...a, allocatedWeight: Number(a.allocatedWeight) })),
      receives: receives.filter((r) => r.threadDyeingSendId === s.id),
    }));
  }

  /**
   * Send undyed thread for dyeing. Allocation weights must sum to the total sent (this is the
   * hard rule), and the total is deducted from undyed stock in the repository transaction.
   */
  async sendForDyeing(input: CreateDyeingSendDTO) {
    const provider = await threadServiceProviderRepository.findById(input.serviceProviderId);
    if (!provider) throw new NotFoundError(Messages.notFound(Entity.THREAD_SERVICE_PROVIDER));

    const sumAllocated = input.allocations.reduce((a, x) => a + x.allocatedWeight, 0);
    if (Math.abs(sumAllocated - input.totalWeightSent) > 0.0005) {
      throw new BadRequestError(
        `Allocated colour weights (${sumAllocated.toFixed(3)} kg) must equal the total weight sent (${input.totalWeightSent.toFixed(3)} kg)`
      );
    }

    return threadDyeingRepository.sendForDyeingTransaction(
      {
        serviceProviderId: input.serviceProviderId,
        sendingDate: input.sendingDate,
        senderTrackingNumber: input.senderTrackingNumber,
        denier: input.denier,
        baseThreadColor: input.baseThreadColor,
        totalWeightSent: String(input.totalWeightSent),
      },
      input.allocations.map((a) => ({
        colorName: a.colorName,
        pantone: a.pantone,
        colorCode: a.colorCode,
        allocatedWeight: String(a.allocatedWeight),
      })),
      input.actorUserId
    );
  }

  /** Receive a send back dyed — credits dyed stock per allocation using the entered
   *  after-weight, and finalises each colour code. */
  async receiveDyed(sendId: number, input: ReceiveDyeingDTO) {
    const send = await threadDyeingRepository.findSendById(sendId);
    if (!send) throw new NotFoundError(Messages.notFound(Entity.THREAD_DYEING_SEND));

    return threadDyeingRepository.receiveDyedTransaction(
      sendId,
      {
        receivingDate: input.receivingDate,
        receiverTrackingNumber: input.receiverTrackingNumber,
        invoiceNumber: input.invoiceNumber,
      },
      input.allocations.map((a) => ({
        id: a.id,
        colorCode: a.colorCode,
        receivedWeight: a.receivedWeight,
      })),
      input.actorUserId
    );
  }
}

export const threadDyeingService = new ThreadDyeingService();

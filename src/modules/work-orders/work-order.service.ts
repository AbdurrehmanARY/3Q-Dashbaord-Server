import { workOrderRepository } from "./work-order.repository";
import { estimateWeavingHours } from "./work-order.helpers";
import { productionOrderRepository } from "@modules/production/production-orders/production-order.repository";
import { ApiError, ConflictError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import { mailService } from "@shared/services/mail.service";

/**
 * Sales orders are a commercial header only — SO/PO number, dates, brand and a total
 * quantity. Breaking that quantity into label types is production planning, and lives
 * on the production order (see production-order.service.ts).
 */
export class WorkOrderService {
  async getWorkOrders(filters?: {
    soNumber?: string;
    poNumber?: string;
    status?: "initiate_production" | "production" | "complete";
    productType?: "printed" | "woven";
    dcNumber?: string;
    lcNumber?: string;
    designCode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return workOrderRepository.findAll(filters);
  }

  async getWorkOrder(id: number | string) {
    const workOrder = await workOrderRepository.findById(id);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    // Surfaced so the UI can link a sales order to the production run raised against it.
    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    return { ...workOrder, productionOrder: productionOrder ?? null };
  }

  /**
   * Creates a sales order for either workflow. Company / Brand / PO / SO / Quantity are
   * identical across both; a woven order additionally carries its loom specification,
   * which is written in the same transaction as the order itself.
   */
  async createWorkOrder(data: {
    soNumber: string;
    poNumber?: string;
    orderDate?: string;
    dueDate?: string;
    totalQty: number;
    brandId?: number;
    comment?: string;
    priority?: string;
    orderType?: string;
    /** Artwork / reference image URL. Blank clears it. */
    imageUrl?: string;
    productType?: "printed" | "woven";
    wovenDetail?: {
      designCode: string;
      pick: number;
      repeat: number;
      density: number;
      speed?: number;
      extra?: number;
      sizeLabels?: string[];
    };
  }) {
    const existing = await workOrderRepository.findAll({ soNumber: data.soNumber });
    if (existing.length > 0) {
      throw new ConflictError(Messages.alreadyExists(Entity.WORK_ORDER));
    }

    const header = {
      soNumber: data.soNumber,
      poNumber: data.poNumber,
      orderDate: data.orderDate || new Date().toISOString().split("T")[0],
      dueDate: data.dueDate,
      totalQty: data.totalQty,
      brandId: data.brandId,
      comment: data.comment,
      priority: data.priority ?? "normal",
      orderType: data.orderType ?? "normal order",
      imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
    };

    if (data.productType === "woven") {
      if (!data.wovenDetail) {
        throw new ApiError("Woven work orders require the design specification", 400);
      }
      // Design codes identify a customer's artwork and must be unique facility-wide.
      const clash = await workOrderRepository.findByDesignCode(data.wovenDetail.designCode);
      if (clash) {
        throw new ConflictError(`Design code '${data.wovenDetail.designCode}' is already in use`);
      }
      return workOrderRepository.createWithWovenDetail(header, {
        designCode: data.wovenDetail.designCode,
        pick: data.wovenDetail.pick,
        density: data.wovenDetail.density,
        // Decimal columns take strings through Drizzle.
        repeat: String(data.wovenDetail.repeat),
        speed: String(data.wovenDetail.speed ?? 0),
        extra: String(data.wovenDetail.extra ?? 0),
        sizeLabels: data.wovenDetail.sizeLabels ?? [],
        // Derived server-side — never accepted from the client (clinerules §3).
        estimatedWeavingHours: String(
          estimateWeavingHours({
            totalQty: data.totalQty,
            repeat: data.wovenDetail.repeat,
            pick: data.wovenDetail.pick,
            speed: data.wovenDetail.speed,
          })
        ),
      });
    }

    return workOrderRepository.create({ ...header, productType: "printed" });
  }

  /**
   * Completes dispatch and moves the order to `dispatched`.
   *
   * DC Number, LC Number and FBR Invoice Number are all mandatory: they are the paperwork
   * proving the goods left the facility, and filling them in is precisely what the
   * `dispatched` status records. A `complete` order stays editable for exactly these
   * fields, which is how production handover works — production finishes the goods, the
   * office finishes the paperwork.
   *
   * Re-dispatching an already-dispatched order is allowed (correcting a typo'd DC number
   * shouldn't require unwinding the order), but production must have finished first.
   */
  async dispatchWorkOrder(
    id: number | string,
    data: {
      dcNumber: string;
      lcNumber: string;
      fbrInvoiceNumber: string;
      dispatchedDate: string;
      dispatchedQty: number;
      imageUrl?: string;
      dcImageUrl?: string;
    }
  ) {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));

    if (existing.status !== "complete" && existing.status !== "dispatched") {
      throw new ApiError(
        "This order cannot be dispatched yet — production must finish it first (packaging complete)",
        400
      );
    }
    if (data.dispatchedQty > existing.totalQty) {
      throw new ApiError(
        `Dispatch quantity (${data.dispatchedQty}) cannot exceed the ordered quantity (${existing.totalQty})`,
        400
      );
    }

    const updated = await workOrderRepository.update(id, {
      dcNumber: data.dcNumber,
      lcNumber: data.lcNumber,
      fbrInvoiceNumber: data.fbrInvoiceNumber,
      dispatchedDate: data.dispatchedDate,
      dispatchedQty: data.dispatchedQty,
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.dcImageUrl !== undefined ? { dcImageUrl: data.dcImageUrl } : {}),
      // Paperwork complete — this is the only place the status becomes `dispatched`.
      status: "dispatched",
    });

    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    mailService
      .sendProductionCompletedEmail({
        productionNumber: productionOrder?.productionNumber || `SO-${existing.soNumber}`,
        soNumber: existing.soNumber,
        poNumber: existing.poNumber,
        totalQty: existing.totalQty,
      })
      .catch((err) => {
        console.error("[WorkOrderService] Error sending dispatch email:", err);
      });

    return updated;
  }

  /**
   * Commercial fields only. **Status is never accepted from the client** — it is derived
   * from the production order (see production-order.repository.ts), so a `status` key in
   * the payload is ignored rather than honoured.
   *
   * A completed work order is locked apart from its dispatch paperwork: DC number and
   * dispatched date are recorded *after* production finishes it, so they have to stay
   * writable once it is complete.
   */
  async updateWorkOrder(id: number | string, data: {
    poNumber?: string;
    dueDate?: string;
    totalQty?: number;
    brandId?: number;
    comment?: string;
    priority?: string;
    orderType?: string;
    imageUrl?: string;
    dcImageUrl?: string;
    dcNumber?: string;
    lcNumber?: string;
    fbrInvoiceNumber?: string;
    dispatchedDate?: string;
    dispatchedQty?: number;
    wovenDetail?: { designCode?: string; pick?: number; repeat?: number; density?: number; speed?: number; extra?: number; sizeLabels?: string[] };
  }) {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));

    const {
      dcNumber,
      lcNumber,
      fbrInvoiceNumber,
      dispatchedDate,
      dispatchedQty,
      wovenDetail,
      ...commercial
    } = data;

    if (wovenDetail && Object.keys(wovenDetail).length > 0) {
      if (existing.productType !== "woven") {
        throw new ApiError("Only a woven work order carries a design specification", 400);
      }
      // A renamed design code still has to stay unique across the facility.
      if (wovenDetail.designCode) {
        const clash = await workOrderRepository.findByDesignCode(wovenDetail.designCode);
        if (clash && clash.workOrderId !== Number(id)) {
          throw new ConflictError(`Design code '${wovenDetail.designCode}' is already in use`);
        }
      }
      // The estimate depends on loom inputs *and* totalQty — recompute whenever either
      // side of the update could move it, merging the partial patch over the stored row
      // so a fieldless update doesn't zero out the inputs.
      const loomChanged =
        wovenDetail.pick !== undefined ||
        wovenDetail.repeat !== undefined ||
        wovenDetail.speed !== undefined ||
        commercial.totalQty !== undefined;
      let estimatedWeavingHoursPatch: { estimatedWeavingHours: string } | undefined;
      if (loomChanged) {
        const current = await workOrderRepository.findWovenDetail(id);
        const merged = {
          totalQty: commercial.totalQty ?? existing.totalQty,
          pick: wovenDetail.pick ?? current?.pick ?? 0,
          repeat: wovenDetail.repeat ?? current?.repeat ?? 0,
          speed: wovenDetail.speed ?? current?.speed ?? 0,
        };
        estimatedWeavingHoursPatch = {
          estimatedWeavingHours: String(estimateWeavingHours(merged)),
        };
      }

      await workOrderRepository.upsertWovenDetail(Number(id), {
        ...(wovenDetail.designCode !== undefined ? { designCode: wovenDetail.designCode } : {}),
        ...(wovenDetail.pick !== undefined ? { pick: wovenDetail.pick } : {}),
        ...(wovenDetail.density !== undefined ? { density: wovenDetail.density } : {}),
        ...(wovenDetail.repeat !== undefined ? { repeat: String(wovenDetail.repeat) } : {}),
        ...(wovenDetail.speed !== undefined ? { speed: String(wovenDetail.speed) } : {}),
        ...(wovenDetail.extra !== undefined ? { extra: String(wovenDetail.extra) } : {}),
        ...(wovenDetail.sizeLabels !== undefined ? { sizeLabels: wovenDetail.sizeLabels } : {}),
        ...estimatedWeavingHoursPatch,
      });
    } else if (commercial.totalQty !== undefined && existing.productType === "woven") {
      // totalQty changed without a loom-spec patch (the common edit): recompute from
      // the stored loom inputs so the persisted estimate never goes stale.
      const current = await workOrderRepository.findWovenDetail(id);
      if (current) {
        await workOrderRepository.upsertWovenDetail(Number(id), {
          estimatedWeavingHours: String(
            estimateWeavingHours({
              totalQty: commercial.totalQty,
              repeat: current.repeat,
              pick: current.pick,
              speed: current.speed,
            })
          ),
        });
      }
    }

    return workOrderRepository.update(id, {
      ...commercial,
      ...(dcNumber !== undefined ? { dcNumber } : {}),
      ...(lcNumber !== undefined ? { lcNumber } : {}),
      ...(fbrInvoiceNumber !== undefined ? { fbrInvoiceNumber } : {}),
      ...(dispatchedDate !== undefined ? { dispatchedDate } : {}),
      ...(dispatchedQty !== undefined ? { dispatchedQty } : {}),
    });
  }

  async deleteWorkOrder(id: number | string): Promise<void> {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));

    // Delete linked production order first if any exists so FK restriction doesn't block
    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    if (productionOrder) {
      await productionOrderRepository.releaseOrderInventoryTransaction(Number(productionOrder.id));
    }

    await workOrderRepository.delete(id);
  }
}

export const workOrderService = new WorkOrderService();

import { db } from "@db/index";
import { workOrders, brands, companies, wovenWorkOrderDetails } from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { WorkOrder, NewWovenWorkOrderDetail } from "@db/schema";

/**
 * A sales order is always read with its brand/company, and — for woven orders — its loom
 * specification. The woven join is a LEFT join, so printed orders simply come back with
 * null design fields rather than needing a second query or a different select.
 */
const workOrderWithBrandSelect = {
  id: workOrders.id,
  soNumber: workOrders.soNumber,
  poNumber: workOrders.poNumber,
  orderDate: workOrders.orderDate,
  dueDate: workOrders.dueDate,
  totalQty: workOrders.totalQty,
  brandId: workOrders.brandId,
  comment: workOrders.comment,
  imageUrl: workOrders.imageUrl,
  status: workOrders.status,
  productType: workOrders.productType,
  dcNumber: workOrders.dcNumber,
  lcNumber: workOrders.lcNumber,
  fbrInvoiceNumber: workOrders.fbrInvoiceNumber,
  dispatchedDate: workOrders.dispatchedDate,
  dispatchedQty: workOrders.dispatchedQty,
  createdAt: workOrders.createdAt,
  updatedAt: workOrders.updatedAt,
  brandName: brands.name,
  companyId: companies.id,
  companyName: companies.name,
  designCode: wovenWorkOrderDetails.designCode,
  pick: wovenWorkOrderDetails.pick,
  repeat: wovenWorkOrderDetails.repeat,
  density: wovenWorkOrderDetails.density,
  extra: wovenWorkOrderDetails.extra,
};

export class WorkOrderRepository {
  async findAll(filters?: {
    soNumber?: string;
    poNumber?: string;
    status?: WorkOrder["status"];
    productType?: WorkOrder["productType"];
    dcNumber?: string;
    lcNumber?: string;
    designCode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const conditions = [];
    // Partial, case-insensitive — the list filters are search boxes, not exact lookups.
    if (filters?.soNumber) conditions.push(sql`${workOrders.soNumber} ILIKE ${"%" + filters.soNumber + "%"}`);
    if (filters?.poNumber) conditions.push(sql`${workOrders.poNumber} ILIKE ${"%" + filters.poNumber + "%"}`);
    // Dispatch paperwork is searchable — the whole point of indexing both numbers.
    if (filters?.dcNumber) conditions.push(sql`${workOrders.dcNumber} ILIKE ${"%" + filters.dcNumber + "%"}`);
    if (filters?.lcNumber) conditions.push(sql`${workOrders.lcNumber} ILIKE ${"%" + filters.lcNumber + "%"}`);
    if (filters?.designCode) {
      conditions.push(sql`${wovenWorkOrderDetails.designCode} ILIKE ${"%" + filters.designCode + "%"}`);
    }
    if (filters?.status) conditions.push(eq(workOrders.status, filters.status));
    if (filters?.productType) conditions.push(eq(workOrders.productType, filters.productType));
    if (filters?.startDate && filters?.endDate) {
      conditions.push(sql`${workOrders.orderDate} BETWEEN ${filters.startDate} AND ${filters.endDate}`);
    }

    return db
      .select(workOrderWithBrandSelect)
      .from(workOrders)
      .leftJoin(brands, eq(workOrders.brandId, brands.id))
      .leftJoin(companies, eq(brands.companyId, companies.id))
      .leftJoin(wovenWorkOrderDetails, eq(wovenWorkOrderDetails.workOrderId, workOrders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workOrders.createdAt));
  }

  async findById(id: number | string) {
    const [workOrder] = await db
      .select(workOrderWithBrandSelect)
      .from(workOrders)
      .leftJoin(brands, eq(workOrders.brandId, brands.id))
      .leftJoin(companies, eq(brands.companyId, companies.id))
      .leftJoin(wovenWorkOrderDetails, eq(wovenWorkOrderDetails.workOrderId, workOrders.id))
      .where(eq(workOrders.id, Number(id)));
    return workOrder;
  }

  /** The loom spec for a woven order, or undefined for a printed one. */
  async findWovenDetail(workOrderId: number | string) {
    const [row] = await db
      .select()
      .from(wovenWorkOrderDetails)
      .where(eq(wovenWorkOrderDetails.workOrderId, Number(workOrderId)));
    return row;
  }

  async findByDesignCode(designCode: string) {
    const [row] = await db
      .select()
      .from(wovenWorkOrderDetails)
      .where(eq(wovenWorkOrderDetails.designCode, designCode));
    return row;
  }

  async findRawById(id: number | string) {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, Number(id)));
    return workOrder;
  }

  async create(data: {
    soNumber: string;
    poNumber?: string;
    orderDate: string;
    dueDate?: string;
    totalQty: number;
    brandId?: number;
    comment?: string;
    imageUrl?: string | null;
    productType?: WorkOrder["productType"];
  }) {
    const [workOrder] = await db.insert(workOrders).values(data).returning();
    return workOrder;
  }

  /**
   * Creates a woven sales order and its loom specification atomically — a woven order
   * without its design spec would be unusable, so the two must land together.
   */
  async createWithWovenDetail(
    data: {
      soNumber: string;
      poNumber?: string;
      orderDate: string;
      dueDate?: string;
      totalQty: number;
      brandId?: number;
      comment?: string;
      imageUrl?: string | null;
    },
    detail: Omit<NewWovenWorkOrderDetail, "workOrderId">
  ) {
    return db.transaction(async (tx) => {
      const [workOrder] = await tx
        .insert(workOrders)
        .values({ ...data, productType: "woven" })
        .returning();
      await tx.insert(wovenWorkOrderDetails).values({ ...detail, workOrderId: workOrder.id });
      return workOrder;
    });
  }

  async upsertWovenDetail(workOrderId: number, detail: Partial<Omit<NewWovenWorkOrderDetail, "workOrderId">>) {
    const [row] = await db
      .update(wovenWorkOrderDetails)
      .set({ ...detail, updatedAt: new Date() })
      .where(eq(wovenWorkOrderDetails.workOrderId, workOrderId))
      .returning();
    return row;
  }

  async update(id: number | string, data: {
    poNumber?: string;
    dueDate?: string;
    totalQty?: number;
    brandId?: number;
    comment?: string;
    imageUrl?: string | null;
    /** Derived from the production order — see production-order.repository.ts. */
    status?: WorkOrder["status"];
    dcNumber?: string | null;
    lcNumber?: string | null;
    fbrInvoiceNumber?: string | null;
    dispatchedDate?: string | null;
    dispatchedQty?: number | null;
  }) {
    const [workOrder] = await db.update(workOrders).set({ ...data, updatedAt: new Date() }).where(eq(workOrders.id, Number(id))).returning();
    return workOrder;
  }

  async delete(id: number | string) {
    await db.delete(workOrders).where(eq(workOrders.id, Number(id)));
  }
}

export const workOrderRepository = new WorkOrderRepository();

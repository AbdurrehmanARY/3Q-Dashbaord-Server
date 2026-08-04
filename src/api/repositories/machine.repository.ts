import { db } from "@db/index";
import { machines } from "@db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import type { Machine } from "@db/schema";

export type MachineProductType = "printed" | "woven" | "both";

export class MachineRepository {
  async findAll(filters?: { type?: string; productType?: "printed" | "woven"; includeInactive?: boolean }) {
    const conditions = [];
    if (filters?.type) conditions.push(eq(machines.machineType, filters.type));
    if (filters?.productType) {
      conditions.push(inArray(machines.productType, [filters.productType, "both"]));
    }
    if (!filters?.includeInactive) conditions.push(eq(machines.isActive, true));
    return db
      .select()
      .from(machines)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(machines.name));
  }

  async findById(id: number | string) {
    const [machine] = await db.select().from(machines).where(eq(machines.id, Number(id)));
    return machine;
  }

  async create(data: { name: string; machineCode: string; machineName: string; machineType: string; productType?: MachineProductType; machineOperatorId?: number; capacityPerHour?: number; status: string }) {
    const [machine] = await db.insert(machines).values(data).returning();
    return machine;
  }

  async update(id: number | string, data: { name?: string; machineCode?: string; machineName?: string; machineType?: string; productType?: MachineProductType; machineOperatorId?: number; capacityPerHour?: number; status?: string; isActive?: boolean }) {
    const [machine] = await db
      .update(machines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(machines.id, Number(id)))
      .returning();
    return machine;
  }

  async softDelete(id: number | string) {
    const [machine] = await db
      .update(machines)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(machines.id, Number(id)))
      .returning();
    return machine;
  }
}

export const machineRepository = new MachineRepository();

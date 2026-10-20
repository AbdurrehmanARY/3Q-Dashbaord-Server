import { db } from "@db/index";
import { operators } from "@db/schema";
import { eq, asc, and, sql, inArray } from "drizzle-orm";
import type { Operator } from "@db/schema";

export type OperatorType = "printed" | "woven" | "both";

export interface OperatorFilters {
  designation?: string;
  /**
   * Narrows to operators capable of this product line. `printed` matches printed + both;
   * `woven` matches woven + both — an operator trained for `both` is always eligible.
   */
  productType?: "printed" | "woven";
  /** Exact operator-type match, for the master-data list's own filter. */
  operatorType?: OperatorType;
  search?: string;
  includeInactive?: boolean;
}

export class OperatorRepository {
  async findAll(filters?: OperatorFilters) {
    const conditions = [];
    if (filters?.designation) conditions.push(eq(operators.designation, filters.designation));
    if (filters?.operatorType) conditions.push(eq(operators.operatorType, filters.operatorType));
    // Capability filter: `both` always qualifies alongside the specific line.
    if (filters?.productType) {
      conditions.push(inArray(operators.operatorType, [filters.productType, "both"]));
    }
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(sql`(${operators.name} ILIKE ${q} OR ${operators.employeeCode} ILIKE ${q})`);
    }
    if (!filters?.includeInactive) conditions.push(eq(operators.isActive, true));

    return db
      .select()
      .from(operators)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(operators.name));
  }

  async findById(id: number | string) {
    const [operator] = await db.select().from(operators).where(eq(operators.id, Number(id)));
    return operator;
  }

  async create(data: {
    name: string;
    employeeCode?: string;
    designation: string;
    operatorType?: OperatorType;
    avatarUrl?: string | null;
    shift?: string;
    status: string;
  }) {
    const [operator] = await db.insert(operators).values(data).returning();
    return operator;
  }

  async update(
    id: number | string,
    data: Partial<
      Pick<
        Operator,
        | "name"
        | "employeeCode"
        | "designation"
        | "operatorType"
        | "avatarUrl"
        | "shift"
        | "status"
        | "isActive"
      >
    >
  ) {
    const [operator] = await db
      .update(operators)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(operators.id, Number(id)))
      .returning();
    return operator;
  }

  async softDelete(id: number | string) {
    const [operator] = await db
      .update(operators)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(operators.id, Number(id)))
      .returning();
    return operator;
  }
}

export const operatorRepository = new OperatorRepository();

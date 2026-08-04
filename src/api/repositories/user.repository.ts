import { db } from "@db/index";
import { users } from "@db/schema";
import { eq, asc, and } from "drizzle-orm";
import type { User, NewUser } from "@db/schema";

export class UserRepository {
  async findAll(filters?: { role?: string; includeInactive?: boolean }) {
    const conditions = [];
    if (filters?.role) conditions.push(eq(users.role, filters.role as User["role"]));
    if (!filters?.includeInactive) conditions.push(eq(users.isActive, true));
    return db
      .select()
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(users.name));
  }

  async findById(id: number | string) {
    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async update(id: number | string, data: Partial<User>) {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, Number(id)))
      .returning();
    return user;
  }

  async softDelete(id: number | string) {
    const [user] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, Number(id)))
      .returning();
    return user;
  }
}

export const userRepository = new UserRepository();

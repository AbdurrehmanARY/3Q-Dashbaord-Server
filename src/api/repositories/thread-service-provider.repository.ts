import { db } from "@db/index";
import { threadServiceProviders } from "@db/schema";
import { asc, eq } from "drizzle-orm";
import type { NewThreadServiceProvider } from "@db/schema";

export class ThreadServiceProviderRepository {
  findAll() {
    return db.select().from(threadServiceProviders).orderBy(asc(threadServiceProviders.name));
  }
  async findById(id: number) {
    const [row] = await db.select().from(threadServiceProviders).where(eq(threadServiceProviders.id, id));
    return row;
  }
  async create(data: NewThreadServiceProvider) {
    const [row] = await db.insert(threadServiceProviders).values(data).returning();
    return row;
  }
  async update(id: number, data: Partial<NewThreadServiceProvider>) {
    const [row] = await db
      .update(threadServiceProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(threadServiceProviders.id, id))
      .returning();
    return row;
  }
  async remove(id: number) {
    const [row] = await db.delete(threadServiceProviders).where(eq(threadServiceProviders.id, id)).returning();
    return row;
  }
}

export const threadServiceProviderRepository = new ThreadServiceProviderRepository();

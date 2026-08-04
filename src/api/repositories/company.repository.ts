import { db } from "@db/index";
import { companies, brands } from "@db/schema";
import { eq, asc } from "drizzle-orm";
import type { Company, Brand } from "@db/schema";

export class CompanyRepository {
  async findAll(filters?: { includeInactive?: boolean }) {
    return db
      .select()
      .from(companies)
      .where(filters?.includeInactive ? undefined : eq(companies.isActive, true))
      .orderBy(asc(companies.createdAt));
  }

  async findById(id: number | string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, Number(id)));
    return company;
  }

  async findByCompanyName(name: string) {
    const [company] = await db.select().from(companies).where(eq(companies.name, name));
    return company;
  }

  async create(data: { name: string; email: string; location: string; contactPerson?: string; phone?: string }) {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async update(id: number | string, data: { name?: string; email?: string; location?: string; contactPerson?: string; phone?: string; isActive?: boolean }) {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, Number(id)))
      .returning();
    return company;
  }

  async softDelete(id: number | string) {
    const [company] = await db
      .update(companies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companies.id, Number(id)))
      .returning();
    return company;
  }
}

export class BrandRepository {
  async findAll() {
    return db
      .select({
        id: brands.id,
        companyId: brands.companyId,
        name: brands.name,
        createdAt: brands.createdAt,
        updatedAt: brands.updatedAt,
        companyName: companies.name,
      })
      .from(brands)
      .innerJoin(companies, eq(brands.companyId, companies.id))
      .orderBy(asc(companies.name), asc(brands.name));
  }

  async findById(id: number | string) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, Number(id)));
    return brand;
  }

  async findByName(name: string) {
    const [brand] = await db.select().from(brands).where(eq(brands.name, name));
    return brand;
  }

  async findByCompanyId(companyId: number | string) {
    return db.select().from(brands).where(eq(brands.companyId, Number(companyId))).orderBy(asc(brands.name));
  }

  async create(data: { companyId: number; name: string }) {
    const [brand] = await db.insert(brands).values(data).returning();
    return brand;
  }

  async update(id: number | string, data: { companyId?: number; name?: string }) {
    const [brand] = await db
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, Number(id)))
      .returning();
    return brand;
  }

  async delete(id: number | string) {
    await db.delete(brands).where(eq(brands.id, Number(id)));
  }
}

export const companyRepository = new CompanyRepository();
export const brandRepository = new BrandRepository();

import { companyRepository, brandRepository } from "./company.repository";
import { ApiError, ConflictError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type { Company, Brand } from "@db/schema";

export class CompanyService {
  async getCompanies(filters?: { includeInactive?: boolean }): Promise<Company[]> {
    return companyRepository.findAll(filters);
  }

  async getCompanyById(id: string): Promise<Company> {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    return company;
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    return companyRepository.findByCompanyName(name);
  }

  async createCompany(data: { name: string; email: string; location: string; contactPerson?: string; phone?: string }): Promise<Company> {
    const existing = await companyRepository.findByCompanyName(data.name);
    if (existing) throw new ConflictError(Messages.alreadyExists(Entity.COMPANY));
    return companyRepository.create(data);
  }

  async updateCompany(id: string, data: { name?: string; email?: string; location?: string; contactPerson?: string; phone?: string; isActive?: boolean }): Promise<Company> {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    const updated = await companyRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    return updated;
  }

  async deleteCompany(id: string): Promise<void> {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    await companyRepository.softDelete(id);
  }
}

export class BrandService {
  async getBrands(): Promise<Brand[]> {
    return brandRepository.findAll() as unknown as Promise<Brand[]>;
  }

  async getBrand(id: string): Promise<Brand> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    return brand;
  }

  async getBrandsByCompany(companyId: string): Promise<Brand[]> {
    return brandRepository.findByCompanyId(companyId);
  }

  async createBrand(data: { companyId: number; name: string }): Promise<Brand> {
    const existing = await brandRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(Messages.alreadyExists(Entity.BRAND));
    }
    return brandRepository.create(data);
  }

  async updateBrand(id: string, data: { companyId?: number; name?: string }): Promise<Brand> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    const updated = await brandRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    return updated;
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    await brandRepository.delete(id);
  }
}

export const companyService = new CompanyService();
export const brandService = new BrandService();

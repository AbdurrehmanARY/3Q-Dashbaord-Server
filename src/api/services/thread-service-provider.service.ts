import { threadServiceProviderRepository } from "../repositories/thread-service-provider.repository";
import { NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type {
  CreateThreadServiceProviderDTO,
  UpdateThreadServiceProviderDTO,
} from "../validations/thread-service-provider.validation";

export class ThreadServiceProviderService {
  getAll() {
    return threadServiceProviderRepository.findAll();
  }
  async getOne(id: number) {
    const row = await threadServiceProviderRepository.findById(id);
    if (!row) throw new NotFoundError(Messages.notFound(Entity.THREAD_SERVICE_PROVIDER));
    return row;
  }
  create(data: CreateThreadServiceProviderDTO) {
    return threadServiceProviderRepository.create(data);
  }
  async update(id: number, data: UpdateThreadServiceProviderDTO) {
    await this.getOne(id);
    return threadServiceProviderRepository.update(id, data);
  }
  async remove(id: number) {
    await this.getOne(id);
    await threadServiceProviderRepository.remove(id);
  }
}

export const threadServiceProviderService = new ThreadServiceProviderService();

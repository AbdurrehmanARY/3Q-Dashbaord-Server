import { machineRepository } from "../repositories/machine.repository";
import { resourceAvailabilityService } from "./resource-availability.service";
import { ApiError, ConflictError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type { Machine } from "@db/schema";

export class MachineService {
  /** Each machine carries its live availability, derived from the lines holding it. */
  async getMachines(filters?: { type?: string; productType?: "printed" | "woven"; includeInactive?: boolean }) {
    const machines = await machineRepository.findAll(filters);
    const decorated = await resourceAvailabilityService.decorate(machines, []);
    return decorated.machines;
  }

  async getMachine(id: number | string): Promise<Machine> {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    return machine;
  }

  async createMachine(data: { name: string; machineCode: string; machineName: string; machineType: string; productType?: "printed" | "woven" | "both"; machineOperatorId?: number; capacityPerHour?: number; status: string }): Promise<Machine> {
    const existing = await machineRepository.findAll({ includeInactive: true });
    if (existing.some((m) => m.machineCode === data.machineCode)) {
      throw new ConflictError(Messages.alreadyExists(Entity.MACHINE));
    }
    return machineRepository.create(data);
  }

  async updateMachine(id: number | string, data: { name?: string; machineCode?: string; machineName?: string; machineType?: string; productType?: "printed" | "woven" | "both"; machineOperatorId?: number; capacityPerHour?: number; status?: string; isActive?: boolean }): Promise<Machine> {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    const updated = await machineRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    return updated;
  }

  async deleteMachine(id: number | string): Promise<void> {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    await machineRepository.softDelete(id);
  }
}

export const machineService = new MachineService();

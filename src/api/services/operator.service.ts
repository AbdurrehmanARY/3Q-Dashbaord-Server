import { operatorRepository, type OperatorFilters, type OperatorType } from "../repositories/operator.repository";
import { resourceAvailabilityService } from "./resource-availability.service";
import { ConflictError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type { Operator } from "@db/schema";

/** Blank strings from a form mean "cleared", not "unchanged" — normalise before storing. */
function normaliseAvatar(url?: string | null): string | null | undefined {
  if (url === undefined) return undefined;
  const trimmed = (url ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export class OperatorService {
  /**
   * Each operator carries their live availability, derived from the lines holding them.
   * `productType` narrows the list to operators capable of that line (the specific type
   * plus `both`) — this is the filter production pickers use.
   */
  async getOperators(filters?: OperatorFilters) {
    const operators = await operatorRepository.findAll(filters);
    const decorated = await resourceAvailabilityService.decorate([], operators);
    return decorated.operators;
  }

  async getOperator(id: number | string): Promise<Operator> {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    return operator;
  }

  async createOperator(data: {
    name: string;
    employeeCode?: string;
    designation: string;
    operatorType?: OperatorType;
    avatarUrl?: string;
    shift?: string;
    status: string;
  }): Promise<Operator> {
    const existing = await operatorRepository.findAll({ includeInactive: true });
    if (existing.some((o) => o.name === data.name)) {
      throw new ConflictError(Messages.alreadyExists(Entity.OPERATOR));
    }
    return operatorRepository.create({
      ...data,
      operatorType: data.operatorType ?? "both",
      avatarUrl: normaliseAvatar(data.avatarUrl) ?? null,
    });
  }

  async updateOperator(
    id: number | string,
    data: {
      name?: string;
      employeeCode?: string;
      designation?: string;
      operatorType?: OperatorType;
      avatarUrl?: string;
      shift?: string;
      status?: string;
      isActive?: boolean;
    }
  ): Promise<Operator> {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));

    const { avatarUrl, ...rest } = data;
    const updated = await operatorRepository.update(id, {
      ...rest,
      ...(avatarUrl !== undefined ? { avatarUrl: normaliseAvatar(avatarUrl) ?? null } : {}),
    });
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    return updated;
  }

  async deleteOperator(id: number | string): Promise<void> {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    await operatorRepository.softDelete(id);
  }
}

export const operatorService = new OperatorService();

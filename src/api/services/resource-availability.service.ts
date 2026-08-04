import { productionOrderRepository } from "../repositories/production-order.repository";

/**
 * Real-time availability of production resources, derived from what production lines are
 * currently holding them. Nothing is stored: a resource is busy because an unfinished
 * line references it, so finishing or cancelling that line frees it with no extra step.
 */

/** `Maintenance` comes from the machine record; the rest are derived from line state. */
export type MachineAvailability = "Available" | "Reserved" | "In Production" | "Maintenance";

/** `Completed` means the operator's only jobs are finished — they are free again. */
export type OperatorAvailability = "Available" | "Assigned" | "Working" | "Completed";

export interface ResourceUsage {
  /** Where the resource is currently committed, e.g. "PRD-00003 · Care Label". */
  heldBy: string | null;
}

interface Classification {
  machines: Map<number, { state: "Reserved" | "In Production" | "Completed"; heldBy: string }>;
  operators: Map<number, { state: "Assigned" | "Working" | "Completed"; heldBy: string }>;
}

/** Precedence: an in-flight job outranks a reserved one, which outranks a finished one. */
const RANK = { "In Production": 3, Working: 3, Reserved: 2, Assigned: 2, Completed: 1 } as const;

async function classify(): Promise<Classification> {
  const rows = await productionOrderRepository.findResourceUsage();
  const machines: Classification["machines"] = new Map();
  const operators: Classification["operators"] = new Map();

  for (const row of rows) {
    const finished = row.lineStatus === "completed" || row.orderStatus === "complete";
    const started =
      Number(row.printedRolls) > 0 || Number(row.cutRolls) > 0 || Number(row.packagedRolls) > 0;
    const heldBy = `${row.productionNumber} · ${row.labelType}`;

    const machineState = finished ? "Completed" : started ? "In Production" : "Reserved";
    const operatorState = finished ? "Completed" : started ? "Working" : "Assigned";

    const put = <S extends string>(map: Map<number, { state: S; heldBy: string }>, id: number | null, state: S) => {
      if (id == null) return;
      const existing = map.get(id);
      if (existing && RANK[existing.state as keyof typeof RANK] >= RANK[state as keyof typeof RANK]) return;
      map.set(id, { state, heldBy });
    };

    put(machines, row.printingMachineId, machineState);
    put(machines, row.cuttingMachineId, machineState);
    put(operators, row.printingOperatorId, operatorState);
    put(operators, row.cuttingOperatorId, operatorState);
    put(operators, row.packagingOperatorId, operatorState);
  }

  return { machines, operators };
}

export interface MachineWithAvailability {
  availability: MachineAvailability;
  /** Reserved / In Production / Maintenance machines cannot take another job. */
  isOccupied: boolean;
  heldBy: string | null;
}

export interface OperatorWithAvailability {
  availability: OperatorAvailability;
  /** Assigned / Working operators cannot take another job. */
  isOccupied: boolean;
  heldBy: string | null;
}

export class ResourceAvailabilityService {
  /**
   * Decorates machine and operator records with their live availability in one pass, so
   * a list endpoint costs one extra query rather than one per row.
   */
  async decorate<M extends { id: number; status: string }, O extends { id: number }>(
    machines: M[],
    operators: O[]
  ): Promise<{ machines: (M & MachineWithAvailability)[]; operators: (O & OperatorWithAvailability)[] }> {
    const { machines: machineState, operators: operatorState } = await classify();

    return {
      machines: machines.map((machine) => {
        // A machine down for maintenance is unavailable regardless of what is assigned.
        if (machine.status === "Maintenance") {
          return { ...machine, availability: "Maintenance" as const, isOccupied: true, heldBy: null };
        }
        const held = machineState.get(machine.id);
        if (!held || held.state === "Completed") {
          return { ...machine, availability: "Available" as const, isOccupied: false, heldBy: null };
        }
        return { ...machine, availability: held.state, isOccupied: true, heldBy: held.heldBy };
      }),

      operators: operators.map((operator) => {
        const held = operatorState.get(operator.id);
        if (!held) {
          return { ...operator, availability: "Available" as const, isOccupied: false, heldBy: null };
        }
        if (held.state === "Completed") {
          return { ...operator, availability: "Completed" as const, isOccupied: false, heldBy: null };
        }
        return { ...operator, availability: held.state, isOccupied: true, heldBy: held.heldBy };
      }),
    };
  }
}

export const resourceAvailabilityService = new ResourceAvailabilityService();

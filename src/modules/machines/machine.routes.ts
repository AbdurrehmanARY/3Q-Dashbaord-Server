import { Router } from "express";
import { machineController } from "./machine.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import { createMachineSchema, updateMachineSchema } from "./machine.schema";
import { listMachinesQuerySchema } from "@shared/validation/query.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/", validateQuery(listMachinesQuerySchema), machineController.getMachines);
router.get("/:id", validateParams(idParamsSchema), machineController.getMachine);
router.post("/", validateRequest(createMachineSchema), machineController.createMachine);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateMachineSchema), machineController.updateMachine);
router.delete("/:id", validateParams(idParamsSchema), machineController.deleteMachine);

export default router;

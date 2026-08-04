import { Router } from "express";
import { machineController } from "@api/controllers/machine.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import { createMachineSchema, updateMachineSchema } from "@api/validations/machines.validation";
import { listMachinesQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", validateQuery(listMachinesQuerySchema), machineController.getMachines);
router.get("/:id", validateParams(idParamsSchema), machineController.getMachine);
router.post("/", validateRequest(createMachineSchema), machineController.createMachine);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateMachineSchema), machineController.updateMachine);
router.delete("/:id", validateParams(idParamsSchema), machineController.deleteMachine);

export default router;

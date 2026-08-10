import { Router } from "express";
import { threadServiceProviderController } from "@api/controllers/thread-service-provider.controller";
import { validateRequest, validateParams } from "@api/middleware/validateRequest";
import {
  createThreadServiceProviderSchema,
  updateThreadServiceProviderSchema,
} from "@api/validations/thread-service-provider.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", threadServiceProviderController.getAll);
router.post("/", validateRequest(createThreadServiceProviderSchema), threadServiceProviderController.create);
router.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateThreadServiceProviderSchema),
  threadServiceProviderController.update
);
router.delete("/:id", validateParams(idParamsSchema), threadServiceProviderController.remove);

export default router;

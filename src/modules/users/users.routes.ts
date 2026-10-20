import { Router } from "express";
import { userController } from "./user.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { listUsersQuerySchema } from "@shared/validation/query.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/", validateQuery(listUsersQuerySchema), userController.getUsers);
router.get("/:id", validateParams(idParamsSchema), userController.getUser);
router.post("/", validateRequest(createUserSchema), userController.createUser);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateUserSchema), userController.updateUser);
router.delete("/:id", validateParams(idParamsSchema), userController.deleteUser);

export default router;

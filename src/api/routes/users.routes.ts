import { Router } from "express";
import { userController } from "@api/controllers/user.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import { createUserSchema, updateUserSchema } from "@api/validations/users.validation";
import { listUsersQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", validateQuery(listUsersQuerySchema), userController.getUsers);
router.get("/:id", validateParams(idParamsSchema), userController.getUser);
router.post("/", validateRequest(createUserSchema), userController.createUser);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateUserSchema), userController.updateUser);
router.delete("/:id", validateParams(idParamsSchema), userController.deleteUser);

export default router;

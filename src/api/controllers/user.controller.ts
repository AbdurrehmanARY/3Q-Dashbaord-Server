import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/user.service";
import type { CreateUserDTO, UpdateUserDTO } from "../validations/users.validation";
import type { ListUsersQueryDTO } from "../validations/query.validation";

class UserController {
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { role, includeInactive } = (req.validatedQuery ?? req.query) as ListUsersQueryDTO;
    const data = await userService.getUsers({ role, includeInactive });
    res.json({ data });
  });

  getUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await userService.getUser(id);
    res.json({ data });
  });

  createUser = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateUserDTO;
    const data = await userService.createUser(input);
    res.status(201).json({ data });
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as UpdateUserDTO;
    const data = await userService.updateUser(id, input);
    res.json({ data });
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await userService.deleteUser(id);
    res.status(204).send();
  });
}

export const userController = new UserController();

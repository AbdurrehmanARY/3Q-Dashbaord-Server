import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type { User } from "@db/schema";

export type UserRole = User["role"];

export class UserService {
  async getUsers(filters?: { role?: string; includeInactive?: boolean }): Promise<User[]> {
    return userRepository.findAll(filters);
  }

  async getUser(id: number | string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));
    return user;
  }

  async createUser(data: {
    name: string;
    employeeCode?: string;
    email?: string;
    role: UserRole;
  }): Promise<User> {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new ConflictError(Messages.alreadyExists(Entity.USER));
    }
    return userRepository.create(data);
  }

  async updateUser(
    id: number | string,
    data: { name?: string; employeeCode?: string; email?: string; role?: UserRole; isActive?: boolean }
  ): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));

    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new ConflictError(Messages.alreadyExists(Entity.USER));
    }

    const updated = await userRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.USER));
    return updated;
  }

  async deleteUser(id: number | string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));
    await userRepository.softDelete(id);
  }

  /** Resolves an actor id supplied by the client, rejecting unknown or deactivated users. */
  async assertActor(actorUserId?: number): Promise<number | null> {
    if (actorUserId === undefined) return null;
    const user = await userRepository.findById(actorUserId);
    if (!user || !user.isActive) throw new NotFoundError(Messages.notFound(Entity.USER));
    return user.id;
  }
}

export const userService = new UserService();

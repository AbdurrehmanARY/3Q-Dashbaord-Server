import {
  stickerMaterialRepository,
  localSheetRepository,
  labelSheetRepository,
} from "./material-receipts.repository";
import { NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type {
  CreateStickerMaterialDTO,
  UpdateStickerMaterialDTO,
  CreateLocalSheetDTO,
  UpdateLocalSheetDTO,
  CreateLabelSheetDTO,
  UpdateLabelSheetDTO,
} from "./material-receipts.schema";

/** `totalWeight` is always derived server-side, never accepted from the client. */
const money = (n: number) => String(n);

export class StickerMaterialService {
  getAll() {
    return stickerMaterialRepository.findAll();
  }
  async create(data: CreateStickerMaterialDTO) {
    const totalWeight = money(data.rollQuantity * data.weightPerRoll);
    return stickerMaterialRepository.create({
      invoiceDate: data.invoiceDate,
      stickerSize: data.stickerSize,
      materialCode: data.materialCode,
      rollQuantity: money(data.rollQuantity),
      weightPerRoll: money(data.weightPerRoll),
      totalWeight,
    });
  }
  async update(id: number, data: UpdateStickerMaterialDTO) {
    const existing = await stickerMaterialRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.STICKER_MATERIAL));
    const rollQuantity = data.rollQuantity ?? Number(existing.rollQuantity);
    const weightPerRoll = data.weightPerRoll ?? Number(existing.weightPerRoll);
    return stickerMaterialRepository.update(id, {
      ...(data.invoiceDate !== undefined && { invoiceDate: data.invoiceDate }),
      ...(data.stickerSize !== undefined && { stickerSize: data.stickerSize }),
      ...(data.materialCode !== undefined && { materialCode: data.materialCode }),
      rollQuantity: money(rollQuantity),
      weightPerRoll: money(weightPerRoll),
      totalWeight: money(rollQuantity * weightPerRoll),
    });
  }
  async remove(id: number) {
    const existing = await stickerMaterialRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.STICKER_MATERIAL));
    await stickerMaterialRepository.remove(id);
  }
}

export class LocalSheetService {
  getAll() {
    return localSheetRepository.findAll();
  }
  async create(data: CreateLocalSheetDTO) {
    return localSheetRepository.create({
      date: data.date,
      materialCode: data.materialCode,
      packetQuantity: money(data.packetQuantity),
      packetWeight: money(data.packetWeight),
      totalWeight: money(data.packetQuantity * data.packetWeight),
    });
  }
  async update(id: number, data: UpdateLocalSheetDTO) {
    const existing = await localSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LOCAL_SHEET));
    const packetQuantity = data.packetQuantity ?? Number(existing.packetQuantity);
    const packetWeight = data.packetWeight ?? Number(existing.packetWeight);
    return localSheetRepository.update(id, {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.materialCode !== undefined && { materialCode: data.materialCode }),
      packetQuantity: money(packetQuantity),
      packetWeight: money(packetWeight),
      totalWeight: money(packetQuantity * packetWeight),
    });
  }
  async remove(id: number) {
    const existing = await localSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LOCAL_SHEET));
    await localSheetRepository.remove(id);
  }
}

export class LabelSheetService {
  getAll() {
    return labelSheetRepository.findAll();
  }
  async create(data: CreateLabelSheetDTO) {
    return labelSheetRepository.create({
      date: data.date,
      materialCode: data.materialCode,
      sheetQuantity: money(data.sheetQuantity),
      weightPerSheet: money(data.weightPerSheet),
      totalWeight: money(data.sheetQuantity * data.weightPerSheet),
    });
  }
  async update(id: number, data: UpdateLabelSheetDTO) {
    const existing = await labelSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LABEL_SHEET));
    const sheetQuantity = data.sheetQuantity ?? Number(existing.sheetQuantity);
    const weightPerSheet = data.weightPerSheet ?? Number(existing.weightPerSheet);
    return labelSheetRepository.update(id, {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.materialCode !== undefined && { materialCode: data.materialCode }),
      sheetQuantity: money(sheetQuantity),
      weightPerSheet: money(weightPerSheet),
      totalWeight: money(sheetQuantity * weightPerSheet),
    });
  }
  async remove(id: number) {
    const existing = await labelSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LABEL_SHEET));
    await labelSheetRepository.remove(id);
  }
}

export const stickerMaterialService = new StickerMaterialService();
export const localSheetService = new LocalSheetService();
export const labelSheetService = new LabelSheetService();

export const Messages = {
  alreadyExists: (entity: string) => `${entity} already exists`,
  notFound: (entity: string) => `${entity} not found`,
  created: (entity: string) => `${entity} created successfully`,
  updated: (entity: string) => `${entity} updated successfully`,
  deleted: (entity: string) => `${entity} deleted successfully`,
};

export const Entity = {
  COMPANY: "Company",
  BRAND: "Brand",
  MATERIAL: "Material",
  MACHINE: "Machine",
  OPERATOR: "Operator",
  WORK_ORDER: "Work order",
  PURCHASE_RECORD: "Purchase record",
  MATERIAL_ISSUE: "Material issue",
  USER: "User",
  PRODUCTION_ORDER: "Production order",
  PRODUCTION_ORDER_LINE: "Production order line",
  PRODUCTION_RUN: "Production run",
  STICKER_MATERIAL: "Sticker material",
  LOCAL_SHEET: "Local sheet",
  LABEL_SHEET: "Label sheet",
  THREAD_SERVICE_PROVIDER: "Thread service provider",
  THREAD_DYEING_SEND: "Thread dyeing send",
  INK_PURCHASE: "Ink purchase",
  INK_CONSUMPTION: "Ink consumption",
} as const;

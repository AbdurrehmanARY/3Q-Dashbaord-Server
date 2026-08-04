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
} as const;

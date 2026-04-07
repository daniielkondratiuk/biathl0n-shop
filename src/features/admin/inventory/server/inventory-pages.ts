import {
  listInventory,
  listInventoryMovements,
} from "@/features/admin/inventory";

export async function listInventoryWrapper(params: {
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  return listInventory(params);
}

export async function listInventoryMovementsWrapper(params: {
  q?: string;
  type?: string;
  dateRange?: string;
  page?: number;
  pageSize?: number;
}) {
  return listInventoryMovements(params);
}


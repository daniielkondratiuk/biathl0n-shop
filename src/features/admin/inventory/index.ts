export { InventoryTable } from "./ui/inventory-table";
export { InventoryTrendChart } from "./ui/inventory-trend-chart";
export { InventoryFilters } from "./ui/inventory-filters";
export { InventoryModeSwitch } from "./ui/inventory-mode-switch";
export { InventorySortControls } from "./ui/inventory-sort-controls";
export { AdminInventoryPage } from "./ui/admin-inventory-page";
export { AdminInventoryMovementsPage } from "./ui/admin-inventory-movements-page";

export {
  listInventory,
  getStockSourceOfTruth,
  getInventorySummary,
  getInventoryTrend,
  listInventoryMovements,
  type InventoryItem,
  type InventoryListResult,
  type InventorySummary,
  type InventoryMovement,
  type InventoryMovementsResult,
  type InventoryTrendData,
} from "./server/inventory-admin";


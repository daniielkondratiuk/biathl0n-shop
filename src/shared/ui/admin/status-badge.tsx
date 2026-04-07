// src/shared/ui/admin/status-badge.tsx
import { Badge } from "@/components/ui/badge";

type StatusType = "payment" | "fulfillment";

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  size?: "sm" | "md" | "lg";
}

// Map status strings to Badge variants
function getStatusVariant(status: string): "paid" | "processing" | "pending" | "cancelled" | "refunded" | "default" {
  const upperStatus = status.toUpperCase();
  
  // Payment statuses
  if (upperStatus === "SUCCEEDED" || upperStatus === "PAID") {
    return "paid";
  }
  if (upperStatus === "PENDING") {
    return "pending";
  }
  if (upperStatus === "FAILED" || upperStatus === "CANCELED" || upperStatus === "CANCELLED") {
    return "cancelled";
  }
  if (upperStatus === "REFUNDED") {
    return "refunded";
  }
  
  // Fulfillment statuses
  if (upperStatus === "PROCESSING" || upperStatus === "SHIPPED") {
    return "processing";
  }
  if (upperStatus === "DELIVERED") {
    return "paid";
  }
  
  return "default";
}

// Format status label
function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  const label = formatStatusLabel(status);
  const isProcessing = variant === "processing";

  return (
    <Badge variant={variant} size={size} showIcon={true} className={isProcessing ? "[&_svg]:animate-spin" : ""}>
      {label}
    </Badge>
  );
}


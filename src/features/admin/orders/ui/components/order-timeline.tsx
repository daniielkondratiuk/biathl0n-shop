// src/features/admin/orders/ui/components/order-timeline.tsx
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED";

interface OrderTimelineProps {
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const timelineSteps: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Placed" },
  { status: "PAID", label: "Paid" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

const statusOrder: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELED: -1,
};

export function OrderTimeline({ status, updatedAt }: OrderTimelineProps) {
  const currentStep = statusOrder[status];
  const isCanceled = status === "CANCELED";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Order Timeline</h3>
      <div className="space-y-3">
        {timelineSteps.map((step, index) => {
          const stepOrder = statusOrder[step.status];
          const isCompleted = stepOrder <= currentStep && !isCanceled;
          const isCurrent = stepOrder === currentStep && !isCanceled;

          return (
            <div key={step.status} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium",
                    isCompleted
                      ? "border-accent bg-accent text-accent-foreground"
                      : isCurrent
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                {index < timelineSteps.length - 1 && (
                  <div
                    className={cn(
                      "mt-1 h-8 w-0.5",
                      isCompleted ? "bg-accent" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {isCanceled && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-xs font-medium text-red-700">
              ✕
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Canceled</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// src/features/account/ui/order-status-steps.tsx
import { Check } from "lucide-react";

type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED";

interface OrderStatusStepsProps {
  status: OrderStatus;
}

const STEPS = [
  { key: "PENDING", label: "Pending" },
  { key: "PAID", label: "Paid" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

export function OrderStatusSteps({ status }: OrderStatusStepsProps) {
  // If canceled, show a simple canceled badge
  if (status === "CANCELED") {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-red-500/90 dark:bg-red-500/40 px-2 py-0.5 text-xs font-medium text-white border border-black/10 dark:border-white/15">
            Canceled
          </span>
        </div>
      </div>
    );
  }

  // Map status to step index
  const getCurrentStepIndex = (): number => {
    switch (status) {
      case "PENDING":
        return 0;
      case "PAID":
      case "PROCESSING":
        return 1;
      case "SHIPPED":
        return 2;
      case "DELIVERED":
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="relative flex items-end">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const lineIsActive = isCompleted || isCurrent;

        return (
          <div
            key={step.key}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {/* Step Label - ABOVE */}
            <p
              className={`text-xs text-center ${
                isCompleted
                  ? "text-foreground"
                  : isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </p>

            {/* Step Circle - BELOW */}
            <div className="relative flex w-full shrink-0 items-center justify-center">
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : null}
              </div>

              {/* Connector Line - spans from right edge of circle to left edge of next circle */}
              {index < STEPS.length - 1 && (
                <div
                  className={`absolute left-1/2 top-1/2 h-0.5 -translate-y-1/2 transition-colors ${
                    lineIsActive ? "bg-primary" : "bg-border"
                  }`}
                  style={{ 
                    left: "calc(50% + 1rem)",
                    right: "calc(-50% + 1rem)"
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


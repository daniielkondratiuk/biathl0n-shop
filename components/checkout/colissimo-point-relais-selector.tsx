"use client";

import type { ColissimoRelayPointResponse } from "@/features/checkout/shared/checkout-shipping";

type ColissimoPoint = ColissimoRelayPointResponse["points"][number];

interface ColissimoPointRelaisSelectorProps {
  points: ColissimoPoint[] | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  selectedPoint: ColissimoPoint | null;
  onSelect: (point: ColissimoPoint | null) => void;
}

export function ColissimoPointRelaisSelector({
  points,
  isLoading,
  errorMessage,
  selectedPoint,
  onSelect,
}: ColissimoPointRelaisSelectorProps) {
  const hasPoints = Array.isArray(points) && points.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            Colissimo Point Relais
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a nearby pickup point for your parcel.
          </p>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading nearby pickup points...
        </p>
      )}

      {!isLoading && errorMessage && (
        <p className="text-sm text-destructive">
          {errorMessage || "Unable to load pickup points."}
        </p>
      )}

      {!isLoading && !errorMessage && !hasPoints && (
        <p className="text-sm text-muted-foreground">
          No pickup points found for this address.
        </p>
      )}

      {!isLoading && !errorMessage && hasPoints && (
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {points!.map((point) => {
            const isSelected = selectedPoint?.id === point.id;
            let distanceLabel: string | null = null;
            if (point.distanceMeters != null) {
              if (point.distanceMeters >= 1000) {
                distanceLabel = `${(point.distanceMeters / 1000).toFixed(
                  1
                )} km`;
              } else {
                distanceLabel = `${point.distanceMeters} m`;
              }
            }

            return (
              <button
                key={point.id}
                type="button"
                onClick={() => onSelect(point)}
                className={`flex w-full flex-col items-start rounded border p-3 text-left text-sm transition hover:bg-muted ${
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">
                      {point.name || "Pickup point"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {point.address.line1 || ""}
                      {point.address.line1 && ", "}
                      {point.address.zipCode} {point.address.city}
                    </div>
                  </div>
                  {distanceLabel && (
                    <div className="text-xs text-muted-foreground">
                      {distanceLabel} away
                    </div>
                  )}
                </div>
                {(point.network || point.type) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[point.network, point.type]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                {point.openingHours && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Opening hours available.
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


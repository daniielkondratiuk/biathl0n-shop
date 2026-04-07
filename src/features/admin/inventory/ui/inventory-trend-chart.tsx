// src/features/admin/inventory/ui/inventory-trend-chart.tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  Legend,
} from "recharts";
import type { InventoryTrendData } from "@/features/admin/inventory";

interface InventoryTrendChartProps {
  data: InventoryTrendData[];
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function InventoryTrendChart({ data }: InventoryTrendChartProps) {
  // Ensure data has numeric values and check if there's meaningful data
  const processedData = data.map((d) => ({
    date: d.date,
    reserved: Number(d.reserved) || 0,
    adjustments: Number(d.adjustments) || 0,
  }));

  // Check if there's any meaningful data (non-zero values)
  const hasData = processedData.some(
    (d) => d.reserved > 0 || d.adjustments > 0
  );

  // Calculate max value for Y-axis domain
  const maxValue = Math.max(
    ...processedData.map((d) => Math.max(d.reserved, d.adjustments)),
    1
  );
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 10;

  // Empty state
  if (!hasData || processedData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No inventory trend data for this period yet.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={processedData}
          margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.2}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: "11px" }}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            interval="preserveStartEnd"
            minTickGap={50}
            height={35}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: "11px" }}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            domain={[0, yAxisMax]}
            width={40}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.375rem",
              padding: "0.5rem",
              fontSize: "11px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            labelStyle={{
              marginBottom: "0.25rem",
              fontWeight: 600,
              fontSize: "11px",
            }}
            itemStyle={{
              padding: "0.125rem 0",
              fontSize: "11px",
            }}
            labelFormatter={(label) => formatDate(label)}
            formatter={(value, name) => {
              const normalizedValue =
                typeof value === "number" || typeof value === "string"
                  ? String(value)
                  : Array.isArray(value)
                    ? value.join(", ")
                    : ""

              const normalizedName = typeof name === "string" ? name : String(name ?? "")

              return [normalizedValue, normalizedName]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
            iconSize={10}
            verticalAlign="top"
            align="right"
            height={20}
          />
          <Line
            type="monotone"
            dataKey="reserved"
            stroke="#3b82f6"
            strokeWidth={2.5}
            name="Reserved Units"
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="adjustments"
            stroke="#6b7280"
            strokeWidth={2.5}
            name="Adjustments"
            dot={false}
            activeDot={{ r: 4, fill: "#6b7280" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


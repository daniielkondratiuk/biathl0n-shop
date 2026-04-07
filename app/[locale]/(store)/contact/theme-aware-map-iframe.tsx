"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/shared/theme/use-mounted";

type ThemeAwareMapIframeProps = {
  encodedAddress: string;
};

export function ThemeAwareMapIframe({ encodedAddress }: ThemeAwareMapIframeProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const src = useMemo(
    () => `https://www.google.com/maps?q=${encodedAddress}&output=embed`,
    [encodedAddress],
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <iframe
      title="Company location map"
      src={src}
      className="h-72 w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={
        isDark
          ? {
              filter:
                "invert(90%) hue-rotate(180deg) saturate(110%) contrast(90%) brightness(95%)",
            }
          : undefined
      }
    />
  );
}


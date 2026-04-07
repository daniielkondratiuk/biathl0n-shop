"use client";

import { usePathname } from "next/navigation";

export function GlassWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  if (isHomePage) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex w-full h-full max-w-7xl flex-1 flex-col">
      <div className="flex flex-1 flex-col bg-background/10 backdrop-blur-xs shadow-sm">
        {children}
      </div>
    </div>
  );
}

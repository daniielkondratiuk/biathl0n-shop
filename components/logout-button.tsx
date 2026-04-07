// components/logout-button.tsx
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <button
      onClick={handleLogout}
      className="text-base font-medium text-foreground transition hover:text-muted-foreground"
    >
      Logout
    </button>
  );
}


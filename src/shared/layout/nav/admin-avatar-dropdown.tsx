// src/shared/layout/nav/admin-avatar-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface AdminAvatarDropdownProps {
  userName: string | null;
  userEmail: string;
}

export function AdminAvatarDropdown({
  userName,
  userEmail,
}: AdminAvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail[0].toUpperCase();

  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-medium transition hover:opacity-90"
        aria-label="Admin menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card shadow-lg">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <div className="py-2">
            <Link
              href="/admin/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-foreground transition hover:bg-muted"
            >
              Admin Profile
            </Link>
            <div className="border-t border-border my-2" />
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-sm text-foreground transition hover:bg-muted"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


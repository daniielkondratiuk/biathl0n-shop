// src/shared/layout/nav/admin-avatar-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useStoreThemeTokens } from "@/shared/store-theme";

interface AdminAvatarDropdownProps {
  userName: string | null;
  userEmail: string;
}

export function AdminAvatarDropdown({
  userName,
  userEmail,
}: AdminAvatarDropdownProps) {
  const themeTokens = useStoreThemeTokens();
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
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition hover:opacity-90"
        style={{
          backgroundColor: themeTokens.primary,
          color: themeTokens.white,
        }}
        aria-label="Admin menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border shadow-lg"
          style={{
            backgroundColor: themeTokens.cardBg,
            borderColor: themeTokens.border,
            color: themeTokens.textPrimary,
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: themeTokens.border }}>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
              {userEmail}
            </p>
          </div>
          <div className="py-2">
            <Link
              href="/admin/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm transition"
              style={{ color: themeTokens.textPrimary }}
            >
              Admin Profile
            </Link>
            <div className="border-t my-2" style={{ borderColor: themeTokens.border }} />
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-sm transition"
              style={{ color: themeTokens.textPrimary }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


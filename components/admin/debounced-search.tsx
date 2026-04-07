// components/admin/debounced-search.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

interface DebouncedSearchProps {
  placeholder?: string;
  debounceMs?: number;
}

export function DebouncedSearch({
  placeholder = "Search orders...",
  debounceMs = 300,
}: DebouncedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(urlSearch);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync input from URL when it changes (external navigation or after our own push)
  useEffect(() => {
    setInputValue(urlSearch);
  }, [urlSearch]);

  // Debounced URL update when user types
  useEffect(() => {
    const trimmed = inputValue.trim();

    if (trimmed === urlSearch) return;

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      params.set("page", "1");
      router.replace(`/admin/orders?${params.toString()}`);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, urlSearch, debounceMs, router, searchParams]);

  return (
    <Input
      type="search"
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      className="w-full"
    />
  );
}

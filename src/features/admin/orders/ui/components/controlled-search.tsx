// src/features/admin/orders/ui/components/controlled-search.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ControlledSearchProps {
  placeholder?: string;
}

export function ControlledSearch({
  placeholder = "Search by order ID, number, customer, email, or product...",
}: ControlledSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL is single source of truth
  const urlQuery = searchParams.get("q") || "";
  
  const [inputValue, setInputValue] = useState(urlQuery);
  const [trackedUrlQuery, setTrackedUrlQuery] = useState(urlQuery);

  // Render guard: sync input when URL changes externally (self-terminating)
  if (urlQuery !== trackedUrlQuery) {
    setTrackedUrlQuery(urlQuery);
    setInputValue(urlQuery);
  }

  function handleSearch() {
    const trimmedValue = inputValue.trim();
    if (trimmedValue === urlQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    
    if (trimmedValue) {
      params.set("q", trimmedValue);
    } else {
      params.delete("q");
    }
    params.set("page", "1"); // Reset to first page
    
    router.replace(`/admin/orders?${params.toString()}`);
  }

  function handleClear() {
    setInputValue("");
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set("page", "1"); // Reset to first page
    
    router.replace(`/admin/orders?${params.toString()}`);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSearch();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  const hasValue = inputValue.trim().length > 0;
  const hasActiveSearch = urlQuery.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type="search"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pr-10"
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <Button type="submit" variant="primary" size="md">
        Search
      </Button>
      {hasActiveSearch && (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleClear}
        >
          Clear
        </Button>
      )}
    </form>
  );
}


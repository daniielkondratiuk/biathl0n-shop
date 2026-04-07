"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function AdminSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/admin/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders, products, customers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64 pl-9 pr-3"
        />
      </div>
      <Button type="submit" variant="ghost" size="sm" disabled={query.trim().length < 2}>
        Search
      </Button>
    </form>
  );
}


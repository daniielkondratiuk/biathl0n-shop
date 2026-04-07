// components/admin/upload/url-input-section.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UrlInputSectionProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function UrlInputSection({
  value,
  onChange,
  disabled = false,
}: UrlInputSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        disabled={disabled}
      >
        <span>Add via URL</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex gap-2">
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="https://example.com/image.jpg"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleAddUrl}
              disabled={disabled || !urlInput.trim()}
            >
              Add
            </Button>
          </div>
          {value && (
            <div className="flex items-center justify-between rounded-md border border-border bg-card p-2">
              <span className="truncate text-xs text-muted-foreground">{value}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


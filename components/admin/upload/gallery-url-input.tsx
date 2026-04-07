// components/admin/upload/gallery-url-input.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GalleryUrlInputProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function GalleryUrlInput({
  value,
  onChange,
  disabled = false,
}: GalleryUrlInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleAddUrl = () => {
    if (urlInput.trim() && !value.includes(urlInput.trim())) {
      onChange([...value, urlInput.trim()]);
      setUrlInput("");
    }
  };

  const handleRemoveUrl = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        disabled={disabled}
      >
        <span>Add Gallery URLs</span>
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
          {value.length > 0 && (
            <div className="space-y-1">
              {value.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between rounded-md border border-border bg-card p-2"
                >
                  <span className="truncate text-xs text-muted-foreground">{url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUrl(url)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


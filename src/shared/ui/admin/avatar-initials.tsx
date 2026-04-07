// src/shared/ui/admin/avatar-initials.tsx
import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string | null | undefined;
  email?: string | null;
  size?: "sm" | "md" | "lg";
}

export function AvatarInitials({ name, email, size = "md" }: AvatarInitialsProps) {
  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name[0]?.toUpperCase() || "?";
    }
    if (email) {
      return email[0]?.toUpperCase() || "?";
    }
    return "?";
  };

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-accent font-medium text-accent-foreground",
        sizeClasses[size],
      )}
    >
      {getInitials()}
    </div>
  );
}


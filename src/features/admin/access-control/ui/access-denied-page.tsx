import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Access Denied</h1>
        <p className="mb-6 text-muted-foreground">
          You don&apos;t have permission to access the admin area.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/">
            <Button variant="primary">Go to Home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}


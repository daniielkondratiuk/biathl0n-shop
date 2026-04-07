// app/admin/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { AdminTopbar } from "@/shared/layout/nav/admin-topbar";
import { AdminSidebar } from "@/shared/layout/nav/admin-sidebar";
import { ToastProvider } from "@/shared/ui/admin/toast-provider";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/admin/access-denied");
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Admin Header */}
        <AdminTopbar />

        {/* Admin Content */}
        <main className="flex-1 p-6">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}



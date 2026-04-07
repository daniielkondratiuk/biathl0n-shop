// src/features/admin/company/ui/admin-company-page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getCompanyProfile } from "../server/company-profile";
import { CompanyForm } from "./company-form";

export async function AdminCompanyPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin/access-denied");
  }

  const profile = await getCompanyProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Company Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company information, contact details, and invoice settings
        </p>
      </div>

      <CompanyForm initialProfile={profile} />
    </div>
  );
}


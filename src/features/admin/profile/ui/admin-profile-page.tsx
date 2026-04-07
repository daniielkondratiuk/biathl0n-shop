import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";

export async function AdminProfilePage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">
        Admin Profile
      </h1>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="text-foreground">{session?.user.name || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-foreground">{session?.user.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="text-foreground">{session?.user.role}</p>
        </div>
      </div>
    </div>
  );
}



// src/features/admin/patches/ui/patches-list-page.tsx
import Link from "next/link";
import Image from "next/image";
import { listPatches } from "@/features/admin/patches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function PatchesListPage() {
  const { patches } = await listPatches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage custom patches for products
          </p>
        </div>
        <Link href="/admin/patches/new">
          <Button variant="primary" size="md">
            New Patch
          </Button>
        </Link>
      </div>

      {patches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No patches found.</p>
          <Link href="/admin/patches/new">
            <Button variant="primary" size="md" className="mt-4">
              Create First Patch
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patches.map((patch) => (
                  <tr key={patch.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-border bg-muted">
                        {patch.image ? (
                          <Image
                            src={patch.image}
                            alt={patch.name}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{patch.name}</div>
                      <div className="text-xs text-muted-foreground">{patch.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(patch.price / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={patch.isActive ? "paid" : "default"} 
                        size="sm"
                        showIcon={false}
                      >
                        {patch.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/patches/${patch.id}`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


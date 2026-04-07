// app/admin/patches/[id]/page.tsx
import { PatchEditPage } from "@/features/admin/patches";

interface AdminEditPatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditPatchPage({ params }: AdminEditPatchPageProps) {
  const { id } = await params;
  return <PatchEditPage patchId={id} />;
}

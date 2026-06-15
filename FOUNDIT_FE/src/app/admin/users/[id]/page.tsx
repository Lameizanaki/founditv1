import { notFound } from "next/navigation";
import { AdminUserDetailClient } from "@/components/features/admin-user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId) || userId <= 0) {
    notFound();
  }

  return <AdminUserDetailClient userId={userId} />;
}

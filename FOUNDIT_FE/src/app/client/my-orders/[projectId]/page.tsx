import { ClientOrderDetailClient } from "@/components/features/client-order-detail-client";

export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ClientOrderDetailClient projectId={projectId} />;
}

import { GigDetailClient } from "@/components/features/gig-detail-client";

export default async function ClientGigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GigDetailClient backHref="/client/browse-gigs" gigId={id} mode="workspace" />;
}

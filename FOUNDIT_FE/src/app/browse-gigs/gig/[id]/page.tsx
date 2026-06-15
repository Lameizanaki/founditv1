import { GigDetailClient } from "@/components/features/gig-detail-client";

export default async function PublicGigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GigDetailClient backHref="/browse-gigs" gigId={id} mode="public" />;
}


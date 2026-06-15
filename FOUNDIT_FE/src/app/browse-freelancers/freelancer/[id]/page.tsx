import { FreelancerDetailClient } from "@/components/features/freelancer-detail-client";

export default async function PublicFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FreelancerDetailClient backHref="/browse-freelancers" freelancerId={id} mode="public" />;
}


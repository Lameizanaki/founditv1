import { FreelancerDetailClient } from "@/components/features/freelancer-detail-client";

export default async function ClientFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FreelancerDetailClient backHref="/client/browse-freelancers" freelancerId={id} mode="workspace" />;
}


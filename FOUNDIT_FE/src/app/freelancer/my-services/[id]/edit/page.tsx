import { FreelancerServiceWorkspaceClient } from "@/components/features/freelancer-service-workspace-client";

export default async function FreelancerServiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FreelancerServiceWorkspaceClient gigId={id} mode="edit" />;
}

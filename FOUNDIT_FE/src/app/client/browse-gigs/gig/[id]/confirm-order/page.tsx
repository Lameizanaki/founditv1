import { ClientConfirmOrderClient } from "@/components/features/client-confirm-order-client";

export default async function ClientConfirmOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientConfirmOrderClient gigId={id} />;
}

import { ChatWorkspaceClient } from "@/components/features/chat-workspace-client";

export default async function ClientRoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const parsedRoomId = Number(roomId);

  return (
    <ChatWorkspaceClient
      initialRoomId={Number.isFinite(parsedRoomId) ? parsedRoomId : null}
      scope="client"
    />
  );
}

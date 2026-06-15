export type ChatScope = "client" | "freelancer";

export interface ConversationResponse {
  roomId: number;
  roomKey: string;
  otherUserId: number;
  otherUsername: string;
  otherRole?: string | null;
  otherClientId?: number | null;
  otherFreelancerId?: number | null;
  otherProfilePictureData?: string | null;
  otherProfilePictureType?: string | null;
  otherProfilePictureName?: string | null;
  hireRequestId?: number | null;
  projectId?: number | null;
  gigId?: number | null;
  projectTitle?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
}

export interface ChatMessageResponse {
  id?: number | null;
  roomId?: number | null;
  roomKey?: string | null;
  hireRequestId?: number | null;
  projectId?: number | null;
  gigId?: number | null;
  projectTitle?: string | null;
  senderId?: number | null;
  senderName?: string | null;
  senderEmail?: string | null;
  receiverId?: number | null;
  receiverName?: string | null;
  receiverEmail?: string | null;
  content?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentData?: string | null;
  sentAt?: string | null;
  isRead?: boolean | null;
}

export interface OpenConversationRequest {
  receiverId?: number;
  freelancerId?: number;
  clientId?: number;
  gigId?: number;
}

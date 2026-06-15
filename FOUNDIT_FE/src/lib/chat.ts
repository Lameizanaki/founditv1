import { getInitials } from "@/lib/data-utils";
import type { ChatMessageResponse, ConversationResponse } from "@/types/chat";

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const buildStructuredFallbackText = (parsed: Record<string, unknown>) => {
  const type = toText(parsed.messageType ?? parsed.type).toLowerCase();
  const gigTitle = toText(parsed.gigTitle) || toText(parsed.projectTitle) || "this project";
  const clientName = toText(parsed.clientName) || "Client";
  const revisionMessage = toText(parsed.revisionMessage);

  if (type === "hire_request") {
    return `${clientName} sent a hire request for ${gigTitle}.`;
  }

  if (type === "hire_request_cancelled") {
    return `${clientName} cancelled the hire request for ${gigTitle}.`;
  }

  if (type === "price_proposal") {
    return `A new price proposal is waiting for review.`;
  }

  if (type === "price_agreement" || type === "price_notice") {
    return `The proposed price was accepted.`;
  }

  if (type === "price_rejected") {
    return `The proposed price was rejected.`;
  }

  if (type === "project_delivery") {
    return `Project delivery was submitted for review.`;
  }

  if (type === "project_revision_request" || type === "revision_request") {
    return revisionMessage
      ? `Revision requested: ${revisionMessage}`
      : "A revision was requested for this delivery.";
  }

  if (type === "project_requirement_proposal") {
    return "Actual requirement submitted. Please review and accept it.";
  }

  return null;
};

export const extractStructuredChatText = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const explicitText = toText(parsed.text);
    if (explicitText) {
      return explicitText;
    }

    return buildStructuredFallbackText(parsed);
  } catch {
    return null;
  }
};

export const formatChatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const buildConversationPreview = (conversation: ConversationResponse) => {
  const structuredPreview = extractStructuredChatText(conversation.lastMessage);
  if (structuredPreview) {
    return structuredPreview;
  }

  if (conversation.lastMessage?.trim()) {
    return conversation.lastMessage;
  }

  if (conversation.projectTitle?.trim()) {
    return `Project chat for ${conversation.projectTitle}`;
  }

  return "No messages yet.";
};

export const buildMessagePreview = (message: ChatMessageResponse) => {
  const structuredPreview = extractStructuredChatText(message.content);
  if (structuredPreview) {
    return structuredPreview;
  }

  if (message.content?.trim()) {
    return message.content;
  }

  if (message.attachmentName?.trim()) {
    return `Attachment: ${message.attachmentName}`;
  }

  return "New message";
};

export const getConversationHeadline = (conversation: ConversationResponse) =>
  conversation.projectTitle?.trim() || conversation.otherUsername || "Untitled conversation";

export const getConversationSubline = (conversation: ConversationResponse) => {
  const role = conversation.otherRole?.trim();
  if (role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  if (conversation.gigId) {
    return `Gig #${conversation.gigId}`;
  }

  return "Direct chat";
};

export const getConversationInitials = (conversation: ConversationResponse) =>
  getInitials(conversation.otherUsername || conversation.projectTitle || "Chat");

export const upsertConversationFromMessage = (
  conversations: ConversationResponse[],
  message: ChatMessageResponse,
  currentEmail: string | null,
) => {
  const roomId = message.roomId;
  if (!roomId) {
    return conversations;
  }

  const senderIsCurrentUser =
    !!currentEmail &&
    !!message.senderEmail &&
    currentEmail.toLowerCase() === message.senderEmail.toLowerCase();

  const otherUserId = senderIsCurrentUser ? message.receiverId : message.senderId;
  const otherUsername = senderIsCurrentUser ? message.receiverName : message.senderName;

  const nextConversation: ConversationResponse = {
    roomId,
    roomKey: message.roomKey || String(roomId),
    otherUserId: otherUserId ?? 0,
    otherUsername: otherUsername || "Conversation",
    projectTitle: message.projectTitle ?? null,
    projectId: message.projectId ?? null,
    gigId: message.gigId ?? null,
    hireRequestId: message.hireRequestId ?? null,
    lastMessage: buildMessagePreview(message),
    lastMessageTime: message.sentAt ?? null,
  };

  const remaining = conversations.filter((item) => item.roomId !== roomId);
  const existing = conversations.find((item) => item.roomId === roomId);

  return [
    {
      ...existing,
      ...nextConversation,
      otherRole: existing?.otherRole ?? null,
      otherClientId: existing?.otherClientId ?? null,
      otherFreelancerId: existing?.otherFreelancerId ?? null,
      otherProfilePictureData: existing?.otherProfilePictureData ?? null,
      otherProfilePictureName: existing?.otherProfilePictureName ?? null,
      otherProfilePictureType: existing?.otherProfilePictureType ?? null,
    },
    ...remaining,
  ];
};

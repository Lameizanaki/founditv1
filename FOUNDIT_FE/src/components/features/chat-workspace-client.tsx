"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useChatNotifications } from "@/components/providers/chat-notification-provider";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { apiFileRequest, apiRequest, toErrorMessage } from "@/lib/api";
import {
  buildConversationPreview,
  extractStructuredChatText,
  formatChatTimestamp,
  getConversationHeadline,
  getConversationInitials,
  getConversationSubline,
  upsertConversationFromMessage,
} from "@/lib/chat";
import {
  formatDate,
  formatMoney,
  getInitials,
  normalizeStatus,
  toNumber,
  toText,
} from "@/lib/data-utils";
import type {
  ChatMessageResponse,
  ChatScope,
  ConversationResponse,
} from "@/types/chat";

type StructuredKind =
  | "formal_notice"
  | "price_proposal"
  | "price_agreement"
  | "price_rejected"
  | "project_requirement_proposal"
  | "project_delivery"
  | "project_revision_request"
  | "status_update";

interface WorkflowHireRequest {
  id: number;
  clientId: number | null;
  freelancerId: number | null;
  gigId: number | null;
  gigTitle: string;
  projectId: number | null;
  requirements: string;
  requirementFileName: string | null;
  agreedPrice: number;
  projectAgreedPrice: number;
  projectStatus: string;
  status: string;
  deadline: string | null;
}

interface WorkflowProject {
  id: number;
  clientId: number | null;
  gigId: number | null;
  gigTitle: string;
  projectTitle: string;
  requirements: string;
  requirementFileName: string | null;
  agreedPrice: number;
  deadline: string | null;
  deliveryFileName: string | null;
  deliveryMessage: string;
  revisionMessage: string;
  status: string;
}

interface AccountReportResponse {
  id: number;
}

function ProjectRequirementsEditor({
  disabled,
  initialDeadline,
  initialPrice,
  initialRequirements,
  initialTitle,
  onSubmit,
}: {
  disabled: boolean;
  initialDeadline: string;
  initialPrice: string;
  initialRequirements: string;
  initialTitle: string;
  onSubmit: (values: {
    deadline: string;
    file: File | null;
    price: string;
    requirements: string;
    startDate: string;
    title: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [price, setPrice] = useState(initialPrice);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState(initialDeadline);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
        Actual Requirements
      </p>
      <input
        className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Project title"
        value={title}
      />
      <textarea
        className="min-h-[90px] w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
        onChange={(event) => setRequirements(event.target.value)}
        placeholder="Share the exact scope, assets, or instructions"
        value={requirements}
      />
      <input
        className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
        onChange={(event) => setPrice(event.target.value)}
        placeholder="Agreed price"
        type="number"
        value={price}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          value={startDate}
        />
        <input
          className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
          onChange={(event) => setDeadline(event.target.value)}
          type="date"
          value={deadline}
        />
      </div>
      <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]">
        {file ? file.name : "Attach requirement file"}
        <input
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>
      <button
        className="w-full rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
        disabled={disabled}
        onClick={() => void onSubmit({ deadline, file, price, requirements, startDate, title })}
        type="button"
      >
        Send Requirements Update
      </button>
    </div>
  );
}

interface StructuredMessageMeta {
  kind: StructuredKind;
  status: string;
  text: string;
  requestId: number | null;
  projectId: number | null;
  proposalId: number | null;
  gigId: number | null;
  title: string | null;
  amount: number | null;
  revisionMessage: string | null;
}

const dedupeMessages = (messages: ChatMessageResponse[]) => {
  const seen = new Set<string>();
  const next: ChatMessageResponse[] = [];

  for (const message of messages) {
    const key = String(message.id ?? `${message.roomId}-${message.sentAt}-${message.content}`);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(message);
  }

  return next;
};

const sortConversations = (conversations: ConversationResponse[]) =>
  [...conversations].sort((left, right) => {
    const leftTime = left.lastMessageTime ? new Date(left.lastMessageTime).getTime() : 0;
    const rightTime = right.lastMessageTime ? new Date(right.lastMessageTime).getTime() : 0;
    return rightTime - leftTime;
  });

const messageTypeLabel: Record<StructuredKind, string> = {
  formal_notice: "Notice",
  price_proposal: "Price Proposal",
  price_agreement: "Price Accepted",
  price_rejected: "Price Rejected",
  project_requirement_proposal: "Requirements",
  project_delivery: "Delivery",
  project_revision_request: "Revision",
  status_update: "Update",
};

const normalizeWorkflowState = (value: string | null | undefined) => normalizeStatus(value ?? "");

const parseStructuredMessage = (message: ChatMessageResponse): StructuredMessageMeta | null => {
  if (!message.content) {
    return null;
  }

  try {
    const parsed = JSON.parse(message.content) as Record<string, unknown>;
    const type = toText(parsed.messageType ?? parsed.type).toLowerCase();
    if (!type) {
      return null;
    }

    let kind: StructuredKind = "status_update";
    if (type === "formal_notice" || type === "hire_request_cancelled") {
      kind = "formal_notice";
    } else if (type === "price_proposal") {
      kind = "price_proposal";
    } else if (type === "price_agreement" || type === "price_notice") {
      kind = "price_agreement";
    } else if (type === "price_rejected") {
      kind = "price_rejected";
    } else if (type === "project_requirement_proposal") {
      kind = "project_requirement_proposal";
    } else if (type === "project_delivery") {
      kind = "project_delivery";
    } else if (type === "project_revision_request" || type === "revision_request") {
      kind = "project_revision_request";
    }

    return {
      amount: toNumber(parsed.pricePending ?? parsed.agreedPrice, 0) || null,
      gigId: toNumber(parsed.gigId, 0) || null,
      kind,
      proposalId: toNumber(parsed.proposalId, 0) || null,
      projectId: toNumber(parsed.projectId, 0) || null,
      requestId: toNumber(parsed.requestId ?? parsed.hireRequestId, 0) || null,
      revisionMessage: toText(parsed.revisionMessage, "") || null,
      status: toText(parsed.status, "pending"),
      text: extractStructuredChatText(message.content) ?? toText(parsed.text, message.content),
      title: toText(parsed.projectTitle ?? parsed.gigTitle, "") || null,
    };
  } catch {
    return null;
  }
};

const getVisibleMessageText = (message: ChatMessageResponse) =>
  parseStructuredMessage(message)?.text ?? message.content ?? "";

const mapHireRequest = (entry: unknown): WorkflowHireRequest => {
  const record = entry as Record<string, unknown>;
  return {
    agreedPrice: toNumber(record.agreedPrice, 0),
    clientId: toNumber(record.clientId, 0) || null,
    deadline: toText(record.deadline, "") || null,
    freelancerId: toNumber(record.freelancerId, 0) || null,
    gigId: toNumber(record.gigId, 0) || null,
    gigTitle: toText(record.gigTitle, "Project"),
    id: toNumber(record.id, 0),
    projectAgreedPrice: toNumber(record.projectAgreedPrice, 0),
    projectId: toNumber(record.projectId, 0) || null,
    projectStatus: toText(record.projectStatus, "pending"),
    requirementFileName: toText(record.requirementFileName, "") || null,
    requirements: toText(record.requirements, ""),
    status: toText(record.status, "pending"),
  };
};

const mapProject = (entry: unknown): WorkflowProject => {
  const record = entry as Record<string, unknown>;
  return {
    agreedPrice: toNumber(record.agreedPrice, 0),
    clientId: toNumber(record.clientId, 0) || null,
    deadline: toText(record.deadline, "") || null,
    deliveryFileName: toText(record.deliveryFileName, "") || null,
    deliveryMessage: toText(record.deliveryMessage, ""),
    gigId: toNumber(record.gigId, 0) || null,
    gigTitle: toText(record.gigTitle, "Gig"),
    id: toNumber(record.id, 0),
    projectTitle: toText(record.projectTitle, "Project"),
    requirementFileName: toText(record.requirementFileName, "") || null,
    requirements: toText(record.requirements, ""),
    revisionMessage: toText(record.revisionMessage, ""),
    status: toText(record.status, "pending"),
  };
};

const statusToneClass = (status: string) => {
  const normalized = normalizeWorkflowState(status);
  if (normalized.includes("reject") || normalized.includes("cancel")) {
    return "bg-[#fee2e2] text-[#dc2626]";
  }
  if (normalized.includes("deliver") || normalized.includes("review") || normalized.includes("pending")) {
    return "bg-[#fef3c7] text-[#d97706]";
  }
  if (normalized.includes("complete")) {
    return "bg-[#dcfce7] text-[#16a34a]";
  }
  return "bg-[#eef2ff] text-[#2563eb]";
};

export function ChatWorkspaceClient({
  scope,
  initialRoomId,
}: {
  scope: ChatScope;
  initialRoomId?: number | null;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const { markChatRead } = useChatNotifications();
  const token = session?.token ?? null;
  const currentEmail = session?.user.email ?? null;

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [hireRequests, setHireRequests] = useState<WorkflowHireRequest[]>([]);
  const [projects, setProjects] = useState<WorkflowProject[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(initialRoomId ?? null);
  const [composerText, setComposerText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [deliveryText, setDeliveryText] = useState("");
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isWorkflowBusy, setIsWorkflowBusy] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const workflowBase = scope === "client" ? "/client" : "/freelancer";
  const workflowEndpoints =
    scope === "client"
      ? { projects: "/client/projects", requests: "/client/hire-requests" }
      : { projects: "/freelancer/view-project", requests: "/freelancer/view-hire-request" };

  const loadConversations = useCallback(async (preserveSelection = true) => {
    if (!token) {
      return;
    }

    setIsLoadingConversations(true);
    setSidebarError(null);

    try {
      const nextConversations = sortConversations(
        await apiRequest<ConversationResponse[]>("/api/chat/conversations", {
          token,
        }),
      );

      setConversations(nextConversations);
      setSelectedRoomId((current) => {
        if (
          preserveSelection &&
          current &&
          nextConversations.some((item) => item.roomId === current)
        ) {
          return current;
        }

        if (initialRoomId && nextConversations.some((item) => item.roomId === initialRoomId)) {
          return initialRoomId;
        }

        return nextConversations[0]?.roomId ?? null;
      });
    } catch (error) {
      setSidebarError(toErrorMessage(error));
    } finally {
      setIsLoadingConversations(false);
    }
  }, [initialRoomId, token]);

  const loadMessages = useCallback(async (roomId: number) => {
    if (!token) {
      return;
    }

    setIsLoadingMessages(true);
    setMessageError(null);

    try {
      const nextMessages = await apiRequest<ChatMessageResponse[]>(
        `/api/chat/rooms/${roomId}/messages`,
        {
          token,
        },
      );

      setMessages(dedupeMessages(nextMessages));
    } catch (error) {
      setMessages([]);
      setMessageError(toErrorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token]);

  const loadWorkflowData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingWorkflow(true);
    setWorkflowError(null);

    try {
      const [requestData, projectData] = await Promise.all([
        apiRequest<unknown[]>(workflowEndpoints.requests, { token }),
        apiRequest<unknown[]>(workflowEndpoints.projects, { token }),
      ]);

      setHireRequests(requestData.map(mapHireRequest));
      setProjects(projectData.map(mapProject));
    } catch (error) {
      setWorkflowError(toErrorMessage(error));
    } finally {
      setIsLoadingWorkflow(false);
    }
  }, [token, workflowEndpoints.projects, workflowEndpoints.requests]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void Promise.all([
      Promise.resolve().then(() => loadConversations(false)),
      Promise.resolve().then(() => loadWorkflowData()),
    ]);
  }, [loadConversations, loadWorkflowData, token]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    markChatRead();
    void Promise.resolve().then(() => loadMessages(selectedRoomId));
  }, [loadMessages, markChatRead, selectedRoomId]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.roomId === selectedRoomId) ?? null,
    [conversations, selectedRoomId],
  );

  const matchedHireRequest = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }

    return (
      hireRequests.find((request) => request.id === selectedConversation.hireRequestId) ??
      hireRequests.find((request) => {
        if (selectedConversation.gigId && request.gigId !== selectedConversation.gigId) {
          return false;
        }

        if (selectedConversation.projectId && request.projectId === selectedConversation.projectId) {
          return true;
        }

        if (scope === "client" && selectedConversation.otherFreelancerId) {
          return request.freelancerId === selectedConversation.otherFreelancerId;
        }

        if (scope === "freelancer" && selectedConversation.otherClientId) {
          return request.clientId === selectedConversation.otherClientId;
        }

        return false;
      }) ??
      null
    );
  }, [hireRequests, scope, selectedConversation]);

  const matchedProject = (() => {
    if (!selectedConversation) {
      return null;
    }

    return (
      projects.find((project) => project.id === selectedConversation.projectId) ??
      (matchedHireRequest?.projectId
        ? projects.find((project) => project.id === matchedHireRequest.projectId) ?? null
        : null) ??
      projects.find((project) => {
        if (selectedConversation.gigId && project.gigId !== selectedConversation.gigId) {
          return false;
        }

        if (scope === "client" && selectedConversation.otherFreelancerId) {
          return true;
        }

        if (scope === "freelancer" && selectedConversation.otherClientId) {
          return project.clientId === selectedConversation.otherClientId;
        }

        return false;
      }) ??
      null
    );
  })();

  const confirmOrderHref = useMemo(() => {
    const targetGigId = matchedProject?.gigId ?? matchedHireRequest?.gigId ?? selectedConversation?.gigId;
    if (scope !== "client" || !targetGigId) {
      return null;
    }

    const params = new URLSearchParams();
    if (matchedProject?.id) {
      params.set("mode", "pay");
      params.set("projectId", String(matchedProject.id));
    } else if (matchedHireRequest?.id) {
      params.set("mode", "request");
      params.set("requestId", String(matchedHireRequest.id));
    }

    if (selectedConversation?.roomId) {
      params.set("roomId", String(selectedConversation.roomId));
    }

    return `/client/browse-gigs/gig/${targetGigId}/confirm-order${params.size ? `?${params.toString()}` : ""}`;
  }, [matchedHireRequest, matchedProject, scope, selectedConversation]);

  const reportDefaults = useMemo(() => {
    const scopeLabel = scope === "client" ? "Client" : "Freelancer";
    const projectLabel =
      selectedConversation?.projectTitle ||
      matchedProject?.projectTitle ||
      matchedHireRequest?.gigTitle ||
      "this project";

    return {
      message: [
        `Please review a dispute reported by the ${scopeLabel.toLowerCase()}.`,
        selectedConversation?.roomId ? `Chat room: ${selectedConversation.roomId}` : null,
        selectedConversation?.otherUsername ? `Other user: ${selectedConversation.otherUsername}` : null,
        selectedConversation?.hireRequestId ? `Hire request: ${selectedConversation.hireRequestId}` : null,
        (selectedConversation?.projectId || matchedProject?.id)
          ? `Project: ${selectedConversation?.projectId ?? matchedProject?.id}`
          : null,
        `Context: ${projectLabel}`,
        "",
        "Issue details:",
      ]
        .filter(Boolean)
        .join("\n"),
      subject: `${scopeLabel} report: ${projectLabel}`,
    };
  }, [matchedHireRequest?.gigTitle, matchedProject?.id, matchedProject?.projectTitle, scope, selectedConversation]);

  const latestPendingIncomingPriceProposal = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const meta = parseStructuredMessage(message);
      if (!meta || meta.kind !== "price_proposal") {
        continue;
      }

      const isCurrentUser =
        !!currentEmail &&
        !!message.senderEmail &&
        currentEmail.toLowerCase() === message.senderEmail.toLowerCase();

      if (isCurrentUser || normalizeWorkflowState(meta.status) !== "pending") {
        continue;
      }

      return { message, meta };
    }

    return null;
  })();

  const latestPendingPriceProposal = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const meta = parseStructuredMessage(message);
      if (!meta || meta.kind !== "price_proposal") {
        continue;
      }

      if (normalizeWorkflowState(meta.status) !== "pending") {
        continue;
      }

      const isCurrentUser =
        !!currentEmail &&
        !!message.senderEmail &&
        currentEmail.toLowerCase() === message.senderEmail.toLowerCase();

      return { isCurrentUser, message, meta };
    }

    return null;
  })();

  const latestPendingIncomingRequirementProposal = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const meta = parseStructuredMessage(message);
      if (!meta || meta.kind !== "project_requirement_proposal") {
        continue;
      }

      const isCurrentUser =
        !!currentEmail &&
        !!message.senderEmail &&
        currentEmail.toLowerCase() === message.senderEmail.toLowerCase();

      if (isCurrentUser || normalizeWorkflowState(meta.status) !== "pending") {
        continue;
      }

      return { message, meta };
    }

    return null;
  })();

  const latestPendingRequirementProposal = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const meta = parseStructuredMessage(message);
      if (!meta || meta.kind !== "project_requirement_proposal") {
        continue;
      }

      if (normalizeWorkflowState(meta.status) !== "pending") {
        continue;
      }

      const isCurrentUser =
        !!currentEmail &&
        !!message.senderEmail &&
        currentEmail.toLowerCase() === message.senderEmail.toLowerCase();

      return { isCurrentUser, message, meta };
    }

    return null;
  })();

  const hireRequestStatus = normalizeWorkflowState(matchedHireRequest?.status);
  const projectStatus = normalizeWorkflowState(matchedProject?.status);
  const hasPendingPriceProposal = !!latestPendingPriceProposal;
  const hasPendingRequirementProposal = !!latestPendingRequirementProposal;
  const canFreelancerRespondToHireRequest = scope === "freelancer" && hireRequestStatus === "pending";
  const canClientCancelRequest =
    scope === "client" &&
    ["pending", "accepted"].includes(hireRequestStatus) &&
    !matchedProject &&
    !hasPendingPriceProposal &&
    !hasPendingRequirementProposal;
  const canProposePrice =
    ["accepted", "pending"].includes(hireRequestStatus) &&
    !hasPendingPriceProposal &&
    !["completed", "cancelled", "delivered"].includes(projectStatus);
  const canClientSubmitRequirements =
    scope === "client" &&
    !!matchedProject &&
    !hasPendingRequirementProposal &&
    !["completed", "cancelled", "delivered"].includes(projectStatus);
  const canFreelancerAcceptRequirements =
    scope === "freelancer" &&
    !!latestPendingIncomingRequirementProposal &&
    !["completed", "cancelled"].includes(projectStatus);
  const canFreelancerDeliverProject =
    scope === "freelancer" &&
    !!matchedProject &&
    ["in_progress", "revision_requested"].includes(projectStatus) &&
    !hasPendingRequirementProposal;
  const canClientReviewDelivery =
    scope === "client" &&
    !!matchedProject &&
    projectStatus === "delivered";
  const canFreelancerAcceptRevision =
    scope === "freelancer" &&
    !!matchedProject &&
    projectStatus.includes("revision");

  const upsertConversationSummary = useCallback(
    (message: ChatMessageResponse) => {
      setConversations((current) =>
        sortConversations(upsertConversationFromMessage(current, message, currentEmail)),
      );
    },
    [currentEmail],
  );

  const appendMessage = useCallback(
    (message: ChatMessageResponse) => {
      setMessages((current) => dedupeMessages([...current, message]));
      upsertConversationSummary(message);
    },
    [upsertConversationSummary],
  );

  const sendSystemMessage = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!token || !selectedConversation || !selectedRoomId) {
        return;
      }

      const response = await apiRequest<ChatMessageResponse>(
        `/api/chat/rooms/${selectedRoomId}/messages`,
        {
          body: {
            content: JSON.stringify(payload),
            receiverId: selectedConversation.otherUserId,
          },
          method: "POST",
          token,
        },
      );

      appendMessage(response);
    },
    [appendMessage, selectedConversation, selectedRoomId, token],
  );

  const refreshWorkflowAndRooms = useCallback(async () => {
    await Promise.all([loadWorkflowData(), loadConversations(true)]);
  }, [loadConversations, loadWorkflowData]);

  const runWorkflowAction = async (callback: () => Promise<void>) => {
    if (isWorkflowBusy) {
      return;
    }

    setIsWorkflowBusy(true);
    setWorkflowError(null);

    try {
      await callback();
      await refreshWorkflowAndRooms();
    } catch (error) {
      setWorkflowError(toErrorMessage(error));
    } finally {
      setIsWorkflowBusy(false);
    }
  };

  const realtimeStatus = useChatRealtime({
    enabled: !!token,
    roomId: selectedRoomId,
    token,
    onMessage: (message) => {
      upsertConversationSummary(message);

      if (message.roomId === selectedRoomId) {
        setMessages((current) => dedupeMessages([...current, message]));
      }
    },
  });

  const selectConversation = (roomId: number) => {
    setSelectedRoomId(roomId);
    setWorkflowError(null);
    router.replace(`/${scope}/${roomId}/chat`);
  };

  const openReportDialog = () => {
    setReportSubject(reportDefaults.subject);
    setReportMessage(reportDefaults.message);
    setReportError(null);
    setReportSuccess(null);
    setIsReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!token || isSubmittingReport) {
      return;
    }

    const subject = reportSubject.trim() || reportDefaults.subject;
    const message = reportMessage.trim();

    if (!message) {
      setReportError("Please describe the issue before submitting the report.");
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      const response = await apiRequest<AccountReportResponse>("/account/reports", {
        body: {
          message,
          subject,
        },
        method: "POST",
        token,
      });
      setIsReportDialogOpen(false);
      setReportSuccess(`Report #${response.id} was sent to admin for review.`);
    } catch (error) {
      setReportError(toErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!token || !selectedConversation || !selectedRoomId || isSending) {
      return;
    }

    if (!composerText.trim() && !selectedFile) {
      return;
    }

    setIsSending(true);
    setMessageError(null);

    try {
      const response = selectedFile
        ? await apiRequest<ChatMessageResponse>(
            `/api/chat/rooms/${selectedRoomId}/attachments`,
            {
              body: (() => {
                const payload = new FormData();
                payload.append("receiverId", String(selectedConversation.otherUserId));
                payload.append("file", selectedFile, selectedFile.name);
                if (composerText.trim()) {
                  payload.append("content", composerText.trim());
                }
                return payload;
              })(),
              method: "POST",
              token,
            },
          )
        : await apiRequest<ChatMessageResponse>(
            `/api/chat/rooms/${selectedRoomId}/messages`,
            {
              body: {
                content: composerText.trim(),
                receiverId: selectedConversation.otherUserId,
              },
              method: "POST",
              token,
            },
          );

      setComposerText("");
      setSelectedFile(null);
      appendMessage(response);
    } catch (error) {
      setMessageError(toErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentDownload = async (message: ChatMessageResponse) => {
    if (!token || !message.id) {
      return;
    }

    try {
      const blob = await apiFileRequest(`/api/chat/messages/${message.id}/attachment`, {
        token,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = message.attachmentName || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessageError(toErrorMessage(error));
    }
  };

  const handleRequirementDownload = async () => {
    if (!token || !matchedProject?.id || scope !== "freelancer") {
      return;
    }

    try {
      const blob = await apiFileRequest(
        `${workflowBase}/project/${matchedProject.id}/requirement-file`,
        { token },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = matchedProject.requirementFileName || "project-requirements";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setWorkflowError(toErrorMessage(error));
    }
  };

  const handleSubmitProjectRequirements = (values: {
    deadline: string;
    file: File | null;
    price: string;
    requirements: string;
    startDate: string;
    title: string;
  }) =>
    runWorkflowAction(async () => {
      if (scope !== "client") {
        return;
      }

      const projectId = matchedProject?.id ?? matchedHireRequest?.projectId ?? null;
      if (!projectId) {
        throw new Error("Project is not ready yet. Accept the hire request or price first.");
      }

      if (!values.title.trim() && !values.requirements.trim() && !values.file) {
        throw new Error("Add a project title, requirements, or requirement file before saving.");
      }

      if (hasPendingRequirementProposal) {
        throw new Error("Wait for the current requirement proposal to be reviewed before sending another.");
      }

      const payload = new FormData();
      if (values.title.trim()) {
        payload.append("projectTitle", values.title.trim());
      }
      if (values.requirements.trim()) {
        payload.append("requirements", values.requirements.trim());
      }
      if (values.price.trim()) {
        payload.append("agreedPrice", values.price.trim());
      }
      if (values.startDate) {
        payload.append("startDate", values.startDate);
      }
      if (values.deadline) {
        payload.append("deadline", values.deadline);
      }
      if (values.file) {
        payload.append("requirementFile", values.file, values.file.name);
      }

      await apiRequest<Record<string, unknown>>(
        `/client/project/${projectId}/requirements`,
        {
          body: payload,
          method: "PUT",
          token,
        },
      );
    });

  const handleAcceptRequirementProposal = () =>
    runWorkflowAction(async () => {
      if (scope !== "freelancer" || !latestPendingIncomingRequirementProposal?.meta.proposalId) {
        throw new Error("This requirement update is missing its proposal reference.");
      }

      if (!canFreelancerAcceptRequirements) {
        throw new Error("This requirement update is no longer waiting for freelancer approval.");
      }

      await apiRequest<Record<string, unknown>>(
        `/freelancer/project-requirements/${latestPendingIncomingRequirementProposal.meta.proposalId}/accept`,
        {
          method: "POST",
          token,
        },
      );
    });

  const handleDeliveryDownload = async () => {
    if (!token || !matchedProject?.id) {
      return;
    }

    try {
      const blob = await apiFileRequest(
        `${workflowBase}/project/${matchedProject.id}/delivery-file`,
        { token },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = matchedProject.deliveryFileName || "delivery-file";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setWorkflowError(toErrorMessage(error));
    }
  };

  const handleAcceptHireRequest = () =>
    runWorkflowAction(async () => {
      if (!matchedHireRequest) {
        return;
      }

      const project = await apiRequest<Record<string, unknown>>(
        `${workflowBase}/hire-request/${matchedHireRequest.id}/accept`,
        {
          method: "POST",
          token,
        },
      );

      await sendSystemMessage({
        gigId: matchedHireRequest.gigId,
        gigTitle: matchedHireRequest.gigTitle,
        messageType: "formal_notice",
        projectId: toNumber(project.id, 0) || null,
        requestId: matchedHireRequest.id,
        status: "accepted",
        text: `Formal notice: I accepted your hire request for "${matchedHireRequest.gigTitle}".`,
        type: "formal_notice",
      });
    });

  const handleRejectHireRequest = () =>
    runWorkflowAction(async () => {
      if (!matchedHireRequest) {
        return;
      }

      await apiRequest(`${workflowBase}/hire-request/${matchedHireRequest.id}/reject`, {
        method: "POST",
        token,
      });

      await sendSystemMessage({
        gigId: matchedHireRequest.gigId,
        gigTitle: matchedHireRequest.gigTitle,
        messageType: "formal_notice",
        requestId: matchedHireRequest.id,
        status: "rejected",
        text: `Formal notice: I rejected your hire request for "${matchedHireRequest.gigTitle}".`,
        type: "formal_notice",
      });
    });

  const handleCancelHireRequest = () =>
    runWorkflowAction(async () => {
      if (!matchedHireRequest) {
        return;
      }

      await apiRequest(`${workflowBase}/hire-request/${matchedHireRequest.id}/cancel`, {
        method: "PUT",
        token,
      });

      await sendSystemMessage({
        gigId: matchedHireRequest.gigId,
        gigTitle: matchedHireRequest.gigTitle,
        messageType: "hire_request_cancelled",
        requestId: matchedHireRequest.id,
        status: "cancelled",
        text: `This hire request for "${matchedHireRequest.gigTitle}" was cancelled by the client.`,
        type: "hire_request_cancelled",
      });
    });

  const handleProposePrice = () =>
    runWorkflowAction(async () => {
      if (!matchedHireRequest) {
        return;
      }

      if (hasPendingPriceProposal) {
        throw new Error("Resolve the current pending price proposal before sending a new one.");
      }

      const price = Number(priceDraft);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid price proposal before sending.");
      }

      const priceParamName = scope === "client" ? "price" : "agreedPrice";
      const response = await apiRequest<Record<string, unknown>>(
        `${workflowBase}/hire-request/${matchedHireRequest.id}/price?${priceParamName}=${price}`,
        {
          method: "PUT",
          token,
        },
      );

      setPriceDraft("");

      await sendSystemMessage({
        gigId: matchedHireRequest.gigId,
        gigTitle: matchedHireRequest.gigTitle,
        messageType: "price_proposal",
        pricePending: price,
        projectId: toNumber(response.id, 0) || matchedHireRequest.projectId,
        requestId: matchedHireRequest.id,
        status: "pending",
        text: `New price proposal: ${formatMoney(price)}.`,
        type: "price_proposal",
      });
    });

  const handleRespondToPriceProposal = (
    decision: "accepted" | "rejected",
    meta: StructuredMessageMeta,
  ) =>
    runWorkflowAction(async () => {
      if (!meta.requestId) {
        throw new Error("This price proposal is missing its request reference.");
      }

      const acceptPath =
        scope === "client"
          ? `${workflowBase}/hire-request/${meta.requestId}/accept-price`
          : `${workflowBase}/hire-request/${meta.requestId}/accept-price`;
      const rejectPath = `${workflowBase}/hire-request/${meta.requestId}/reject-price`;

      let projectId = meta.projectId;
      if (decision === "accepted") {
        const response = await apiRequest<Record<string, unknown>>(
          meta.amount
            ? `${acceptPath}?agreedPrice=${meta.amount}`
            : acceptPath,
          {
            method: "PUT",
            token,
          },
        );
        projectId = toNumber(response.id, 0) || meta.projectId;
      } else {
        await apiRequest(rejectPath, {
          method: "PUT",
          token,
        });
      }

      await sendSystemMessage({
        gigId: meta.gigId ?? matchedHireRequest?.gigId ?? matchedProject?.gigId,
        gigTitle:
          meta.title ?? matchedProject?.projectTitle ?? matchedHireRequest?.gigTitle ?? "Project",
        messageType: decision === "accepted" ? "price_agreement" : "price_rejected",
        projectId,
        requestId: meta.requestId,
        status: decision,
        text:
          decision === "accepted"
            ? `Price accepted: ${meta.amount ? formatMoney(meta.amount) : "approved"}.`
            : `Price proposal rejected${meta.amount ? `: ${formatMoney(meta.amount)}` : ""}.`,
        type: decision === "accepted" ? "price_agreement" : "price_rejected",
      });
    });

  const handleDeliverProject = () =>
    runWorkflowAction(async () => {
      if (!matchedProject) {
        return;
      }

      if (!canFreelancerDeliverProject) {
        throw new Error("Delivery is only available while the project is actively in progress.");
      }

      const message = deliveryText.trim();
      const deliverPath = message
        ? `${workflowBase}/project/${matchedProject.id}/deliver?deliveryMessage=${encodeURIComponent(message)}`
        : `${workflowBase}/project/${matchedProject.id}/deliver`;

      await apiRequest<Record<string, unknown>>(deliverPath, {
        method: "POST",
        token,
      });

      if (deliveryFile) {
        const payload = new FormData();
        payload.append("file", deliveryFile, deliveryFile.name);
        await apiRequest<Record<string, unknown>>(
          `${workflowBase}/project/${matchedProject.id}/delivery-file`,
          {
            body: payload,
            method: "POST",
            token,
          },
        );
      }

      setDeliveryText("");
      setDeliveryFile(null);

      await sendSystemMessage({
        gigId: matchedProject.gigId,
        messageType: "project_delivery",
        projectId: matchedProject.id,
        projectTitle: matchedProject.projectTitle,
        status: "DELIVERED",
        text: message
          ? `Project delivered: ${message}`
          : `Project "${matchedProject.projectTitle}" was delivered for review.`,
        type: "project_delivery",
      });
    });

  const handleApproveDelivery = () =>
    runWorkflowAction(async () => {
      if (!matchedProject) {
        return;
      }

      if (!canClientReviewDelivery) {
        throw new Error("Only delivered projects can be approved.");
      }

      await apiRequest<Record<string, unknown>>(
        `${workflowBase}/project/${matchedProject.id}/approve-delivery`,
        {
          method: "PUT",
          token,
        },
      );

      await sendSystemMessage({
        gigId: matchedProject.gigId,
        messageType: "project_delivery",
        projectId: matchedProject.id,
        projectTitle: matchedProject.projectTitle,
        status: "COMPLETED",
        text: `Delivery approved. "${matchedProject.projectTitle}" is now complete.`,
        type: "project_delivery",
      });

      if (confirmOrderHref) {
        router.push(confirmOrderHref);
      }
    });

  const handleRequestRevision = () =>
    runWorkflowAction(async () => {
      if (!matchedProject) {
        return;
      }

      if (!canClientReviewDelivery) {
        throw new Error("Only delivered projects can be sent back for revision.");
      }

      const message = revisionText.trim();
      if (!message) {
        throw new Error("Add a revision note before requesting changes.");
      }

      await apiRequest<Record<string, unknown>>(
        `${workflowBase}/project/${matchedProject.id}/request-revision?revisionMessage=${encodeURIComponent(message)}`,
        {
          method: "PUT",
          token,
        },
      );

      setRevisionText("");

      await sendSystemMessage({
        gigId: matchedProject.gigId,
        messageType: "project_revision_request",
        projectId: matchedProject.id,
        projectTitle: matchedProject.projectTitle,
        revisionMessage: message,
        status: "REVISION_REQUESTED",
        text: `Revision requested: ${message}`,
        type: "project_revision_request",
      });
    });

  const handleAcceptRevision = () =>
    runWorkflowAction(async () => {
      if (!matchedProject) {
        return;
      }

      if (!canFreelancerAcceptRevision) {
        throw new Error("There is no active revision request to accept.");
      }

      await apiRequest<Record<string, unknown>>(
        `${workflowBase}/project/${matchedProject.id}/accept-revision`,
        {
          method: "PUT",
          token,
        },
      );

      await sendSystemMessage({
        gigId: matchedProject.gigId,
        messageType: "project_revision_request",
        projectId: matchedProject.id,
        projectTitle: matchedProject.projectTitle,
        status: "IN_PROGRESS",
        text: `Revision accepted. Work resumed on "${matchedProject.projectTitle}".`,
        type: "project_revision_request",
      });
    });

  const emptyStateCopy =
    scope === "client"
      ? "Start a chat from a freelancer profile or a gig page."
      : "Client conversations will appear here after a hire request or direct chat is opened.";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-none text-[#111827] md:text-[18px]">
              Messages
            </h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              Keep delivery updates, requirements, and direct messages in one thread.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                realtimeStatus === "live"
                  ? "bg-[#dcfce7] text-[#16a34a]"
                  : realtimeStatus === "connecting"
                    ? "bg-[#fef3c7] text-[#d97706]"
                    : "bg-[#fee2e2] text-[#dc2626]"
              }`}
            >
              {realtimeStatus === "live"
                ? "Realtime live"
                : realtimeStatus === "connecting"
                  ? "Connecting"
                  : "Realtime offline"}
            </span>
            <button
              className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
              onClick={() => void Promise.all([loadConversations(true), loadWorkflowData()])}
              type="button"
            >
              Refresh
            </button>
            <button
              className="rounded-xl border border-[#fecaca] bg-white px-4 py-2.5 text-sm font-semibold text-[#dc2626] transition hover:bg-[#fef2f2]"
              onClick={openReportDialog}
              type="button"
            >
              Report to Admin
            </button>
          </div>
        </div>
      </section>

      {reportSuccess ? (
        <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-5 py-4 text-sm text-[#166534]">
          {reportSuccess}
        </div>
      ) : null}

      {isReportDialogOpen ? (
        <section className="mt-4 rounded-2xl border border-[#fecaca] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Report This Situation</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Send the current dispute or suspicious behavior to the admin team for review.
              </p>
            </div>
            <button
              className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
              onClick={() => {
                setIsReportDialogOpen(false);
                setReportError(null);
              }}
              type="button"
            >
              Close
            </button>
          </div>

          {reportError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reportError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            <input
              className="w-full rounded-xl border border-[#d1d5db] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#dc2626]"
              onChange={(event) => setReportSubject(event.target.value)}
              placeholder="Report subject"
              value={reportSubject}
            />
            <textarea
              className="min-h-[180px] w-full rounded-xl border border-[#d1d5db] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#dc2626]"
              onChange={(event) => setReportMessage(event.target.value)}
              placeholder="Describe what happened, what you need reviewed, and any important timestamps or behavior."
              value={reportMessage}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#6b7280]">
            {selectedConversation?.roomId ? <span>Room #{selectedConversation.roomId}</span> : null}
            {selectedConversation?.otherUsername ? <span>User: {selectedConversation.otherUsername}</span> : null}
            {selectedConversation?.projectId ? <span>Project #{selectedConversation.projectId}</span> : null}
            {selectedConversation?.hireRequestId ? <span>Request #{selectedConversation.hireRequestId}</span> : null}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
              onClick={() => {
                setReportSubject(reportDefaults.subject);
                setReportMessage(reportDefaults.message);
                setReportError(null);
              }}
              type="button"
            >
              Reset
            </button>
            <button
              className="rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
              disabled={isSubmittingReport}
              onClick={() => void handleSubmitReport()}
              type="button"
            >
              {isSubmittingReport ? "Sending..." : "Send Report"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#eef2f7] px-5 py-4">
            <h2 className="text-[16px] font-bold text-[#111827]">Conversations</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {conversations.length} active room{conversations.length === 1 ? "" : "s"}
            </p>
          </div>

          {sidebarError ? (
            <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {sidebarError}
            </div>
          ) : null}

          {isLoadingConversations ? (
            <div className="px-5 py-8 text-sm text-[#6b7280]">Loading conversations...</div>
          ) : conversations.length ? (
            <div className="divide-y divide-[#eef2f7]">
              {conversations.map((conversation) => {
                const isActive = conversation.roomId === selectedRoomId;
                return (
                  <button
                    key={conversation.roomId}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${
                      isActive ? "bg-[#f8fafc]" : "bg-white hover:bg-[#fafafa]"
                    }`}
                    onClick={() => selectConversation(conversation.roomId)}
                    type="button"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-semibold text-[#2563eb]">
                      {getConversationInitials(conversation)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[#111827]">
                          {conversation.otherUsername}
                        </p>
                        <span className="shrink-0 text-xs text-[#9ca3af]">
                          {formatChatTimestamp(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium uppercase tracking-[0.08em] text-[#6b7280]">
                        {getConversationSubline(conversation)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-[#6b7280]">
                        {buildConversationPreview(conversation)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold text-[#111827]">No conversations yet</p>
              <p className="mt-2 text-sm text-[#6b7280]">{emptyStateCopy}</p>
            </div>
          )}
        </aside>

        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
          {selectedConversation ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 border-b border-[#eef2f7] xl:border-b-0 xl:border-r">
                <div className="border-b border-[#eef2f7] px-5 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-semibold text-[#2563eb]">
                        {getInitials(selectedConversation.otherUsername)}
                      </div>
                      <div>
                        <h2 className="text-[16px] font-bold text-[#111827]">
                          {getConversationHeadline(selectedConversation)}
                        </h2>
                        <p className="mt-1 text-sm text-[#6b7280]">
                          {selectedConversation.otherUsername} | {getConversationSubline(selectedConversation)}
                        </p>
                      </div>
                    </div>

                    {selectedConversation.projectId ? (
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#2563eb]">
                        Project #{selectedConversation.projectId}
                      </span>
                    ) : null}
                  </div>
                </div>

                {messageError ? (
                  <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                    {messageError}
                  </div>
                ) : null}

                <div className="h-[520px] overflow-y-auto bg-[#f8fafc] px-5 py-5">
                  {isLoadingMessages ? (
                    <div className="text-sm text-[#6b7280]">Loading messages...</div>
                  ) : messages.length ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCurrentUser =
                          !!currentEmail &&
                          !!message.senderEmail &&
                          currentEmail.toLowerCase() === message.senderEmail.toLowerCase();
                        const meta = parseStructuredMessage(message);
                        const canRespondToPrice =
                          !!meta &&
                          meta.kind === "price_proposal" &&
                          normalizeWorkflowState(meta.status) === "pending" &&
                          latestPendingIncomingPriceProposal?.message.id === message.id &&
                          !isCurrentUser &&
                          !isWorkflowBusy;

                        return (
                          <div
                            key={String(message.id ?? `${message.roomId}-${message.sentAt}-${message.content}`)}
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                isCurrentUser
                                  ? "bg-[#2563eb] text-white"
                                  : "border border-[#e5e7eb] bg-white text-[#111827]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p
                                  className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                                    isCurrentUser ? "text-blue-100" : "text-[#6b7280]"
                                  }`}
                                >
                                  {isCurrentUser ? "You" : message.senderName || selectedConversation.otherUsername}
                                </p>
                                <span
                                  className={`text-xs ${
                                    isCurrentUser ? "text-blue-100" : "text-[#9ca3af]"
                                  }`}
                                >
                                  {formatChatTimestamp(message.sentAt)}
                                </span>
                              </div>

                              {meta ? (
                                <span
                                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    isCurrentUser
                                      ? "bg-white/15 text-white"
                                      : statusToneClass(meta.status)
                                  }`}
                                >
                                  {messageTypeLabel[meta.kind]}
                                </span>
                              ) : null}

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                                {getVisibleMessageText(message)}
                              </p>

                              {meta?.amount ? (
                                <p
                                  className={`mt-2 text-xs ${
                                    isCurrentUser ? "text-blue-100" : "text-[#6b7280]"
                                  }`}
                                >
                                  Amount: {formatMoney(meta.amount)}
                                </p>
                              ) : null}

                              {meta?.revisionMessage ? (
                                <p
                                  className={`mt-2 text-xs ${
                                    isCurrentUser ? "text-blue-100" : "text-[#6b7280]"
                                  }`}
                                >
                                  Revision note: {meta.revisionMessage}
                                </p>
                              ) : null}

                              {canRespondToPrice && meta ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    className="rounded-xl bg-[#16a34a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#15803d]"
                                    onClick={() => void handleRespondToPriceProposal("accepted", meta)}
                                    type="button"
                                  >
                                    Accept Price
                                  </button>
                                  <button
                                    className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
                                    onClick={() => void handleRespondToPriceProposal("rejected", meta)}
                                    type="button"
                                  >
                                    Reject Price
                                  </button>
                                </div>
                              ) : null}

                              {message.attachmentName ? (
                                <button
                                  className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                                    isCurrentUser
                                      ? "bg-white/15 text-white hover:bg-white/20"
                                      : "bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]"
                                  }`}
                                  onClick={() => void handleAttachmentDownload(message)}
                                  type="button"
                                >
                                  Download {message.attachmentName}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center">
                      <div>
                        <p className="text-base font-semibold text-[#111827]">No messages yet</p>
                        <p className="mt-2 text-sm text-[#6b7280]">
                          Start the conversation from the composer below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#eef2f7] bg-white p-5">
                  {selectedFile ? (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1d4ed8]">
                      <span className="truncate">{selectedFile.name}</span>
                      <button
                        className="font-medium text-[#1d4ed8] transition hover:opacity-80"
                        onClick={() => setSelectedFile(null)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                        Message
                      </label>
                      <textarea
                        className="min-h-[120px] w-full rounded-2xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
                        onChange={(event) => setComposerText(event.target.value)}
                        placeholder="Write a message, share next steps, or send an update..."
                        value={composerText}
                      />
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 lg:w-[220px]">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]">
                        Attach file
                        <input
                          accept="image/*,.pdf,.doc,.docx,.zip,.rar,.txt"
                          className="hidden"
                          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                          type="file"
                        />
                      </label>
                      <button
                        className="inline-flex items-center justify-center rounded-xl bg-[#16a34a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSending || (!composerText.trim() && !selectedFile)}
                        onClick={() => void handleSendMessage()}
                        type="button"
                      >
                        {isSending ? "Sending..." : "Send message"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="bg-white">
                <div className="border-b border-[#eef2f7] px-5 py-4">
                  <h3 className="text-[16px] font-bold text-[#111827]">Workflow Actions</h3>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Manage request, pricing, delivery, and revision steps in this room.
                  </p>
                </div>

                {workflowError ? (
                  <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                    {workflowError}
                  </div>
                ) : null}

                <div className="space-y-5 px-5 py-5">
                  {isLoadingWorkflow ? (
                    <div className="text-sm text-[#6b7280]">Loading workflow context...</div>
                  ) : null}

                  <section className="rounded-2xl border border-[#e5e7eb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                          Hire Request
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-[#111827]">
                          {matchedHireRequest?.gigTitle || "No linked request"}
                        </h4>
                      </div>
                      {matchedHireRequest ? (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusToneClass(matchedHireRequest.status)}`}>
                          {matchedHireRequest.status}
                        </span>
                      ) : null}
                    </div>

                    {matchedHireRequest ? (
                      <>
                        <div className="mt-3 space-y-2 text-sm text-[#6b7280]">
                          <p>Deadline: {formatDate(matchedHireRequest.deadline, "No deadline")}</p>
                          <p>Agreed price: {formatMoney(matchedHireRequest.projectAgreedPrice || matchedHireRequest.agreedPrice)}</p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {scope === "client" && confirmOrderHref ? (
                            <Link
                              className="inline-flex w-full items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#eff6ff]"
                              href={confirmOrderHref}
                            >
                              Open Order Page
                            </Link>
                          ) : null}

                          {canFreelancerRespondToHireRequest ? (
                            <div className="flex gap-2">
                              <button
                                className="flex-1 rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
                                disabled={isWorkflowBusy}
                                onClick={() => void handleAcceptHireRequest()}
                                type="button"
                              >
                                Accept
                              </button>
                              <button
                                className="flex-1 rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-60"
                                disabled={isWorkflowBusy}
                                onClick={() => void handleRejectHireRequest()}
                                type="button"
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}

                          {canClientCancelRequest ? (
                            <button
                              className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-60"
                              disabled={isWorkflowBusy}
                              onClick={() => void handleCancelHireRequest()}
                              type="button"
                            >
                              Cancel Request
                            </button>
                          ) : null}

                          {canProposePrice ? (
                            <div className="space-y-2">
                              <input
                                className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
                                onChange={(event) => setPriceDraft(event.target.value)}
                                placeholder="Propose a price"
                                value={priceDraft}
                              />
                              <button
                                className="w-full rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
                                disabled={isWorkflowBusy || !priceDraft.trim() || hasPendingPriceProposal}
                                onClick={() => void handleProposePrice()}
                                type="button"
                              >
                                Send Price Proposal
                              </button>
                            </div>
                          ) : null}

                          {latestPendingIncomingPriceProposal?.meta ? (
                            <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1d4ed8]">
                                Pending Price Proposal
                              </p>
                              <p className="mt-1 text-sm text-[#1e3a8a]">
                                {latestPendingIncomingPriceProposal.meta.amount
                                  ? formatMoney(latestPendingIncomingPriceProposal.meta.amount)
                                  : latestPendingIncomingPriceProposal.meta.text}
                              </p>
                              <div className="mt-3 flex gap-2">
                                <button
                                  className="flex-1 rounded-xl bg-[#16a34a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
                                  disabled={isWorkflowBusy}
                                  onClick={() =>
                                    void handleRespondToPriceProposal(
                                      "accepted",
                                      latestPendingIncomingPriceProposal.meta,
                                    )
                                  }
                                  type="button"
                                >
                                  Accept
                                </button>
                                <button
                                  className="flex-1 rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-60"
                                  disabled={isWorkflowBusy}
                                  onClick={() =>
                                    void handleRespondToPriceProposal(
                                      "rejected",
                                      latestPendingIncomingPriceProposal.meta,
                                    )
                                  }
                                  type="button"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {canFreelancerAcceptRequirements && latestPendingIncomingRequirementProposal ? (
                            <div className="rounded-xl border border-[#dcfce7] bg-[#f0fdf4] p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#15803d]">
                                Requirement Update
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#14532d]">
                                {latestPendingIncomingRequirementProposal.meta.title || "Project requirements"}
                              </p>
                              <p className="mt-1 text-sm text-[#166534]">
                                {latestPendingIncomingRequirementProposal.meta.text}
                              </p>
                              {latestPendingIncomingRequirementProposal.message.attachmentName ? (
                                <button
                                  className="mt-3 text-sm font-medium text-[#166534] underline underline-offset-2"
                                  onClick={() =>
                                    void handleAttachmentDownload(
                                      latestPendingIncomingRequirementProposal.message,
                                    )
                                  }
                                  type="button"
                                >
                                  Download attached requirements
                                </button>
                              ) : null}
                              <button
                                className="mt-3 w-full rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
                                disabled={isWorkflowBusy || !canFreelancerAcceptRequirements}
                                onClick={() => void handleAcceptRequirementProposal()}
                                type="button"
                              >
                                Accept Requirements
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[#6b7280]">
                        This conversation has not been tied to a hire request yet.
                      </p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#e5e7eb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                          Project
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-[#111827]">
                          {matchedProject?.projectTitle || "No active project"}
                        </h4>
                      </div>
                      {matchedProject ? (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusToneClass(matchedProject.status)}`}>
                          {matchedProject.status}
                        </span>
                      ) : null}
                    </div>

                    {matchedProject ? (
                      <>
                        <div className="mt-3 space-y-2 text-sm text-[#6b7280]">
                          <p>Due: {formatDate(matchedProject.deadline, "No deadline")}</p>
                          <p>Budget: {formatMoney(matchedProject.agreedPrice)}</p>
                          {matchedProject.requirementFileName ? (
                            <button
                              className="text-left font-medium text-[#2563eb] transition hover:text-[#1d4ed8]"
                              onClick={() => void handleRequirementDownload()}
                              type="button"
                            >
                              Download requirements
                            </button>
                          ) : null}
                          {matchedProject.deliveryFileName ? (
                            <button
                              className="text-left font-medium text-[#2563eb] transition hover:text-[#1d4ed8]"
                              onClick={() => void handleDeliveryDownload()}
                              type="button"
                            >
                              Download delivery file
                            </button>
                          ) : null}
                        </div>

                        {canFreelancerDeliverProject ? (
                          <div className="mt-4 space-y-2">
                            <textarea
                              className="min-h-[90px] w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
                              onChange={(event) => setDeliveryText(event.target.value)}
                              placeholder="Add a delivery note"
                              value={deliveryText}
                            />
                            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]">
                              {deliveryFile ? deliveryFile.name : "Attach delivery file"}
                              <input
                                className="hidden"
                                onChange={(event) => setDeliveryFile(event.target.files?.[0] ?? null)}
                                type="file"
                              />
                            </label>
                            <button
                              className="w-full rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
                              disabled={isWorkflowBusy || !canFreelancerDeliverProject}
                              onClick={() => void handleDeliverProject()}
                              type="button"
                            >
                              Deliver Project
                            </button>
                          </div>
                        ) : null}

                        {canClientReviewDelivery ? (
                          <div className="mt-4 space-y-2">
                            {confirmOrderHref ? (
                              <Link
                                className="inline-flex w-full items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#eff6ff]"
                                href={confirmOrderHref}
                              >
                                Open Payment Page
                              </Link>
                            ) : null}

                            <textarea
                              className="min-h-[90px] w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#2563eb]"
                              onChange={(event) => setRevisionText(event.target.value)}
                              placeholder="Add revision notes if changes are needed"
                              value={revisionText}
                            />
                            <div className="flex gap-2">
                              <button
                                className="flex-1 rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
                                disabled={isWorkflowBusy || !canClientReviewDelivery}
                                onClick={() => void handleApproveDelivery()}
                                type="button"
                              >
                                Approve Delivery
                              </button>
                              <button
                                className="flex-1 rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-60"
                                disabled={isWorkflowBusy || !revisionText.trim() || !canClientReviewDelivery}
                                onClick={() => void handleRequestRevision()}
                                type="button"
                              >
                                Request Revision
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {canFreelancerAcceptRevision ? (
                          <button
                            className="mt-4 w-full rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
                            disabled={isWorkflowBusy || !canFreelancerAcceptRevision}
                            onClick={() => void handleAcceptRevision()}
                            type="button"
                          >
                            Accept Revision
                          </button>
                        ) : null}

                        {canClientSubmitRequirements ? (
                          <ProjectRequirementsEditor
                            key={`${selectedConversation?.roomId ?? "room"}:${matchedProject.id}`}
                            disabled={isWorkflowBusy || !canClientSubmitRequirements}
                            initialDeadline={matchedProject.deadline ?? matchedHireRequest?.deadline ?? ""}
                            initialPrice={
                              matchedProject.agreedPrice
                                ? String(matchedProject.agreedPrice)
                                : matchedHireRequest?.projectAgreedPrice
                                  ? String(matchedHireRequest.projectAgreedPrice)
                                  : matchedHireRequest?.agreedPrice
                                    ? String(matchedHireRequest.agreedPrice)
                                    : ""
                            }
                            initialRequirements={matchedProject.requirements ?? matchedHireRequest?.requirements ?? ""}
                            initialTitle={matchedProject.projectTitle ?? matchedHireRequest?.gigTitle ?? ""}
                            onSubmit={handleSubmitProjectRequirements}
                          />
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[#6b7280]">
                        Project delivery and revision actions appear here after a request is accepted.
                      </p>
                    )}
                  </section>
                </div>
              </aside>
            </div>
          ) : (
            <div className="flex min-h-[640px] items-center justify-center bg-[#f8fafc] px-6 text-center">
              <div>
                <p className="text-2xl font-semibold text-[#111827]">Select a conversation</p>
                <p className="mt-3 text-sm text-[#6b7280]">
                  Choose a room from the left sidebar to view messages.
                </p>
                {scope === "client" ? (
                  <Link
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                    href="/client/browse-freelancers"
                  >
                    Find freelancers
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

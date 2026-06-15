import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ClipboardList,
  DollarSign,
  FileUp,
  LucideAngularModule,
  Paperclip,
  UserRound,
} from 'lucide-angular';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';
import {
  ChatService,
  ConversationResponse,
  ChatMessageResponse,
  HireRequestResponse,
  ProjectResponse,
} from '../../../services/chat/chat.service';

type ChatItem = {
  id: string;
  roomId: number | string;
  otherUserId?: number | null;
  otherRole?: string;
  otherClientId?: number | null;
  otherFreelancerId?: number | null;
  hireRequestId?: number | null;
  projectId?: number | null;
  gigId?: number | null;
  name: string;
  project: string;
  preview: string;
  time: string;
  lastMessageAt?: string | null;
  online: boolean;
  avatar?: string;
  initial?: string;
  unreadCount?: number;
};

type MessageItem = {
  id: string;
  roomId?: number | string;
  senderId?: number | string;
  receiverId?: number | string;
  senderName: string;
  text: string;
  time: string;
  isMine: boolean;
  avatar?: string;
  initial: string;
  isHireRequest?: boolean;
  isFormalNotice?: boolean;
  isPriceProposal?: boolean;
  isProjectRequirementProposal?: boolean;
  isProjectDelivery?: boolean;
  isProjectRevisionRequest?: boolean;
  projectRequirementProposalStatus?: string | null;
  projectRequirementProposalId?: number | null;
  projectDeliveryStatus?: string | null;
  projectRevisionStatus?: string | null;
  formalNoticeRequestId?: number | null;
  formalNoticeStatus?: 'accepted' | 'rejected' | null;
  formalNoticeProjectId?: number | null;
  priceProposalStatus?: 'pending' | 'accepted' | 'rejected' | string | null;
  priceProposalAmount?: number | null;
  hireRequestId?: number | null;
  hireRequestDetails?: Record<string, unknown> | null;
  hireRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentData?: string | null;
  attachmentUrl?: string | null;
};

@Component({
  selector: 'app-messages',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('messagesScroll') private messagesScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('attachmentInput') private attachmentInput?: ElementRef<HTMLInputElement>;

  private readonly chatService = inject(ChatService);
  private readonly profileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly realtimeSubscription: Subscription;

  selectedChatId: string | null = null;
  showMenu = true;
  showBlockModal = false;
  showReportModal = false;
  selectedReason = 'Spam or unwanted messages';
  searchTerm = '';
  reportReasons: string[] = [
    'Spam or unwanted messages',
    'Harassment or bullying',
    'Inappropriate content',
    'Scam or fraud',
    'Other',
  ];
  loading = true;
  loadingMessages = false;
  error = '';
  draftMessage = '';
  showAttachMenu = false;
  selectedAttachment: File | null = null;
  priceDraft = '';
  showProjectRequirementForm = false;
  savingProjectRequirement = false;
  projectRequirementForm = {
    projectTitle: '',
    requirements: '',
    agreedPrice: '',
    startDate: '',
    deadline: '',
    requirementFile: null as File | null,
  };
  private readonly priceActionMessageIds = new Set<string>();

  conversations: ChatItem[] = [];
  messages: MessageItem[] = [];
  private hireRequests: HireRequestResponse[] = [];
  private completedDeliveryProjectIds = new Set<number>();
  private currentUserEmail: string | null = null;
  private currentUserAvatar?: string;
  private readonly avatarObjectUrls = new Map<string, string>();

  readonly icons = {
    ClipboardList,
    DollarSign,
    FileUp,
    Paperclip,
    UserRound,
  };

  constructor() {
    this.realtimeSubscription = this.chatService.incomingMessages$.subscribe((message) => {
      this.handleIncomingMessage(message);
    });
  }

  ngOnInit(): void {
    this.currentUserEmail = this.getCurrentUserEmailFromToken();
    this.chatService.startRealtimeConnection();
    this.loadCurrentClientProfile();
    this.loadConversations();
    this.loadHireRequests();
    this.loadClientProjects();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription.unsubscribe();
    this.avatarObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.avatarObjectUrls.clear();
  }

  get selectedChat(): ChatItem | null {
    const found = this.conversations.find((c) => c.id === this.selectedChatId);
    return found ?? null;
  }

  get chats(): ChatItem[] {
    return this.conversations;
  }

  get errorMessage(): string {
    return this.error;
  }

  set errorMessage(value: string) {
    this.error = value;
  }

  get loadingConversations(): boolean {
    return this.loading;
  }

  get isDirectRoomRoute(): boolean {
    return Boolean(this.route.snapshot.paramMap.get('roomId') ?? this.route.snapshot.paramMap.get('id'));
  }

  set loadingConversations(value: boolean) {
    this.loading = value;
  }

  get canSendMessage(): boolean {
    return Boolean(this.draftMessage.trim() || this.selectedAttachment);
  }

  get filteredConversations(): ChatItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.conversations;

    return this.conversations.filter((conversation) => {
      return [conversation.name, conversation.project, conversation.preview, conversation.time]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }

  trackByConversationId(_: number, item: ChatItem): string {
    return item.id;
  }

  trackByMessageId(_: number, item: MessageItem): string {
    return item.id;
  }

  selectChat(idOrChat: string | ChatItem): void {
    this.closeProjectRequirementForm();

    if (typeof idOrChat === 'string') {
      this.selectedChatId = idOrChat;
      const chat = this.conversations.find((c) => c.id === idOrChat);
      if (chat) {
        this.chatService.watchRoom(chat.roomId);
        this.updateSelectedRoomRoute(chat.roomId);
        this.loadMessages(chat.roomId as number);
      }
      return;
    }

    this.selectedChatId = idOrChat.id;
    this.chatService.watchRoom(idOrChat.roomId);
    this.updateSelectedRoomRoute(idOrChat.roomId);
    this.loadMessages(idOrChat.roomId as number);
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  openBlockModal(): void {
    this.showMenu = false;
    this.showBlockModal = true;
    this.showReportModal = false;
  }

  openReportModal(): void {
    this.showMenu = false;
    this.showReportModal = true;
    this.showBlockModal = false;
  }

  closeAllModals(): void {
    this.showBlockModal = false;
    this.showReportModal = false;
    this.showMenu = false;
  }

  private loadConversations(): void {
    this.loading = true;
    this.error = '';
    const previousSelectedChatId = this.selectedChatId;

    this.chatService.getConversations().subscribe({
      next: (items) => {
        this.conversations = (items || [])
          .map((it) => this.mapConversation(it))
          .sort((a, b) => this.getConversationTimeValue(b) - this.getConversationTimeValue(a));
        this.loadConversationAvatars(this.conversations);
        this.conversations.forEach((conversation) =>
          this.chatService.watchRoom(conversation.roomId),
        );

        this.loading = false;

        const routeParam =
          this.route.snapshot.paramMap.get('roomId') ?? this.route.snapshot.paramMap.get('id');
        const routeTargetId = Number(routeParam);
        const state = history.state as
          | { freelancerId?: number; roomId?: number; requestId?: number; gigId?: number }
          | undefined;
        const hasExplicitTarget =
          state?.freelancerId !== undefined ||
          state?.roomId !== undefined ||
          state?.requestId !== undefined ||
          state?.gigId !== undefined ||
          !!routeParam;
        const targetFreelancerId = hasExplicitTarget
          ? Number(state?.freelancerId ?? routeTargetId)
          : Number.NaN;

        const nextConversation =
          this.conversations.find(
            (conversation) => routeParam && String(conversation.roomId) === routeParam,
          ) ??
          this.conversations.find(
            (conversation) =>
              state?.roomId !== undefined && String(conversation.roomId) === String(state.roomId),
          ) ??
          this.conversations.find(
            (conversation) =>
              state?.requestId !== undefined && conversation.hireRequestId === state.requestId,
          ) ??
          this.conversations.find(
            (conversation) => state?.gigId !== undefined && conversation.gigId === state.gigId,
          ) ??
          this.conversations.find(
            (conversation) =>
              Number.isFinite(targetFreelancerId) &&
              (conversation.otherFreelancerId === targetFreelancerId ||
                conversation.otherUserId === targetFreelancerId),
          ) ??
          this.conversations.find((conversation) => conversation.id === this.selectedChatId) ??
          this.conversations[0] ??
          null;

        if (nextConversation) {
          this.selectedChatId = nextConversation.id;
          this.updateSelectedRoomRoute(nextConversation.roomId, true);
          if (previousSelectedChatId !== nextConversation.id) {
            this.loadMessages(nextConversation.roomId);
          }
        } else if (state?.freelancerId !== undefined) {
          this.openConversationFromState(state);
        } else {
          this.messages = [];
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load conversations.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapConversation(it: ConversationResponse): ChatItem {
    const inlineAvatar = this.buildAvatarUrl(it.otherProfilePictureData, it.otherProfilePictureType);
    return {
      id: String(it.roomId),
      roomId: it.roomId,
      otherUserId: it.otherUserId ?? null,
      otherRole: it.otherRole,
      otherClientId: it.otherClientId ?? null,
      otherFreelancerId: it.otherFreelancerId ?? null,
      hireRequestId: it.hireRequestId ?? null,
      projectId: it.projectId ?? null,
      gigId: it.gigId ?? null,
      name: it.otherUsername,
      project: this.resolveConversationProjectTitle(it),
      preview: this.normalizeMessagePreview(it.lastMessage ?? 'No messages yet'),
      time: this.formatTime(it.lastMessageTime),
      lastMessageAt: it.lastMessageTime ?? null,
      online: false,
      avatar: inlineAvatar ?? this.avatarObjectUrls.get(this.getConversationAvatarKey(it)),
      initial: (it.otherUsername && it.otherUsername.charAt(0).toUpperCase()) || 'U',
      unreadCount: 0,
    };
  }

  private loadConversationAvatars(conversations: ChatItem[]): void {
    for (const conversation of conversations) {
      if (conversation.avatar) {
        continue;
      }

      const avatarKey = this.getChatItemAvatarKey(conversation);
      const cachedAvatar = this.avatarObjectUrls.get(avatarKey);
      if (cachedAvatar) {
        conversation.avatar = cachedAvatar;
        continue;
      }

      const avatarRequest =
        conversation.otherRole?.toLowerCase() === 'freelancer' && conversation.otherFreelancerId
          ? this.chatService.downloadFreelancerAvatar(conversation.otherFreelancerId)
          : conversation.otherRole?.toLowerCase() === 'client' && conversation.otherClientId
            ? this.chatService.downloadClientAvatar(conversation.otherClientId)
            : null;

      if (!avatarRequest) {
        continue;
      }

      avatarRequest.subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            return;
          }

          const previousUrl = this.avatarObjectUrls.get(avatarKey);
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }

          const url = URL.createObjectURL(blob);
          this.avatarObjectUrls.set(avatarKey, url);

          this.conversations = this.conversations.map((item) =>
            this.getChatItemAvatarKey(item) === avatarKey ? { ...item, avatar: url } : item,
          );

          const selectedChat = this.selectedChat;
          if (selectedChat && this.getChatItemAvatarKey(selectedChat) === avatarKey) {
            this.messages = this.messages.map((message) =>
              message.isMine ? message : { ...message, avatar: url },
            );
          }

          this.cdr.detectChanges();
        },
        error: () => {
          // Missing avatars fall back to initials.
        },
      });
    }
  }

  private getConversationAvatarKey(conversation: ConversationResponse): string {
    return `${conversation.otherRole ?? 'user'}:${
      conversation.otherFreelancerId ?? conversation.otherClientId ?? conversation.otherUserId
    }`;
  }

  private getChatItemAvatarKey(conversation: ChatItem): string {
    return `${conversation.otherRole ?? 'user'}:${
      conversation.otherFreelancerId ?? conversation.otherClientId ?? conversation.otherUserId
    }`;
  }

  private openConversationFromState(state: {
    freelancerId?: number;
    roomId?: number;
    requestId?: number;
    gigId?: number;
  }): void {
    if (state.freelancerId === undefined) {
      return;
    }

    this.chatService
      .openConversation({
        freelancerId: Number(state.freelancerId),
        gigId: state.gigId !== undefined ? Number(state.gigId) : undefined,
      })
      .subscribe({
        next: (conversation) => {
          const mapped = this.mapConversation(conversation);
          this.conversations = [
            mapped,
            ...this.conversations.filter((item) => item.id !== mapped.id),
          ];
          this.loadConversationAvatars([mapped]);
          this.selectedChatId = mapped.id;
          this.updateSelectedRoomRoute(mapped.roomId, true);
          this.loadMessages(mapped.roomId);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messages = [];
          this.loading = false;
          this.error = 'Unable to open this conversation.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadMessages(roomId: number | string): void {
    this.chatService.watchRoom(roomId);
    this.loadingMessages = true;
    this.error = '';

    this.chatService.getRoomMessages(Number(roomId)).subscribe({
      next: (items) => {
        this.messages = (items || []).map((m) => {
          const isMine = this.isCurrentUserMessage(m);
          return {
            id: String(m.id ?? ''),
            roomId: m.roomId ?? undefined,
            senderId: m.senderId ?? undefined,
            receiverId: m.receiverId ?? undefined,
            senderName: m.senderName ?? 'User',
            text: this.normalizeMessagePreview(m.content ?? ''),
            time: this.formatTime(m.sentAt),
            isMine,
            avatar: isMine ? this.currentUserAvatar : this.selectedChat?.avatar,
            initial: (m.senderName && m.senderName.charAt(0).toUpperCase()) || 'U',
            attachmentName: m.attachmentName ?? null,
            attachmentType: m.attachmentType ?? null,
            attachmentData: m.attachmentData ?? null,
            attachmentUrl: this.buildAttachmentUrl(m.attachmentData, m.attachmentType),
            ...this.parseFormalHireRequestNotice(m.content),
            ...this.parseProjectRequirementProposalMessage(m.content),
            ...this.parseProjectDeliveryMessage(m.content),
            ...this.parseProjectRevisionRequestMessage(m.content),
            ...this.parsePriceProposalMessage(m.content),
            ...this.parseHireRequestMessage(m.content),
          };
        });

        this.syncHireRequestStatusesFromNotices();
        this.syncHireRequestStatusesFromServer();
        this.syncPriceProposalStatusesFromServer();
        this.syncProjectRequirementProposalStatuses();
        this.syncProjectRevisionStatuses();

        this.loadingMessages = false;
        this.cdr.detectChanges();
        this.scrollToLatestMessage();
      },
      error: () => {
        this.error = 'Failed to load messages.';
        this.loadingMessages = false;
        this.cdr.detectChanges();
      },
    });
  }

  sendMessage(): void {
    const content = (this.draftMessage ?? '').trim();
    if (!content && !this.selectedAttachment) return;

    const conversation = this.selectedChat;
    if (!conversation) return;

    const receiver = conversation.otherUserId ?? null;
    if (!receiver) {
      this.error = 'Unable to determine receiver for this conversation.';
      return;
    }

    this.chatService
      .sendRoomMessage(conversation.roomId, {
        receiverId: Number(receiver),
        content,
        file: this.selectedAttachment,
      })
      .subscribe({
        next: (resp) => {
          if (!resp) return;

          const mapped: MessageItem = {
            id: String(resp.id ?? ''),
            roomId: resp.roomId ?? undefined,
            senderId: resp.senderId ?? undefined,
            receiverId: resp.receiverId ?? undefined,
            senderName: resp.senderName ?? 'You',
            text: resp.content ?? content,
            time: this.formatTime(resp.sentAt ?? new Date().toISOString()),
            isMine: true,
            avatar: this.currentUserAvatar,
            initial: (resp.senderName && resp.senderName.charAt(0).toUpperCase()) || 'U',
            attachmentName: resp.attachmentName ?? this.selectedAttachment?.name ?? null,
            attachmentType: resp.attachmentType ?? this.selectedAttachment?.type ?? null,
            attachmentData: resp.attachmentData ?? null,
            attachmentUrl: this.buildAttachmentUrl(resp.attachmentData, resp.attachmentType),
          };

          this.messages = this.upsertMessage(this.messages, mapped);
          this.updateConversationPreview(String(conversation.roomId), mapped.text, mapped.time);
          this.draftMessage = '';
          this.selectedAttachment = null;
          this.showAttachMenu = false;
          this.cdr.detectChanges();
          this.scrollToLatestMessage();
        },
        error: () => {
          this.error = 'Unable to send message right now.';
          this.cdr.detectChanges();
        },
      });
  }

  toggleAttachMenu(): void {
    this.showAttachMenu = !this.showAttachMenu;
  }

  openAttachmentPicker(): void {
    this.attachmentInput?.nativeElement.click();
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.selectedAttachment = file;
    this.showAttachMenu = false;

    if (input) {
      input.value = '';
    }
  }

  clearAttachment(): void {
    this.selectedAttachment = null;
  }

  toggleProjectRequirementForm(): void {
    this.showAttachMenu = false;
    this.showProjectRequirementForm = !this.showProjectRequirementForm;

    if (this.showProjectRequirementForm) {
      this.prefillProjectRequirementForm();
      return;
    }

    this.resetProjectRequirementForm();
  }

  onProjectRequirementFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.projectRequirementForm.requirementFile = input?.files?.[0] ?? null;

    if (input) {
      input.value = '';
    }
  }

  clearProjectRequirementFile(): void {
    this.projectRequirementForm.requirementFile = null;
  }

  submitProjectRequirement(): void {
    const projectId = this.resolveSelectedProjectId();
    if (!projectId) {
      this.error = 'Project is not ready yet. Accept the hire request or price first.';
      return;
    }

    if (
      !this.projectRequirementForm.projectTitle.trim() &&
      !this.projectRequirementForm.requirements.trim() &&
      !this.projectRequirementForm.requirementFile
    ) {
      this.error = 'Add a project title, requirements, or a requirement file before saving.';
      return;
    }

    this.savingProjectRequirement = true;
    this.error = '';

    this.chatService
      .updateProjectRequirement(projectId, {
        projectTitle: this.projectRequirementForm.projectTitle.trim(),
        requirements: this.projectRequirementForm.requirements.trim(),
        agreedPrice: this.projectRequirementForm.agreedPrice,
        startDate: this.projectRequirementForm.startDate,
        deadline: this.projectRequirementForm.deadline,
        requirementFile: this.projectRequirementForm.requirementFile,
      })
      .subscribe({
        next: (project) => {
          const chat = this.selectedChat;
          if (chat) {
            chat.projectId = project.projectId ?? chat.projectId;
            chat.project = project.projectTitle || this.projectRequirementForm.projectTitle || chat.project;
            chat.preview = 'Actual requirement sent for freelancer approval';
          }

          this.conversations = this.conversations.map((conversation) =>
            conversation.id === this.selectedChatId
              ? {
                  ...conversation,
                  projectId: project.projectId ?? conversation.projectId,
                  project:
                    project.projectTitle ||
                    this.projectRequirementForm.projectTitle ||
                    conversation.project,
                  preview: 'Actual requirement sent for freelancer approval',
                }
              : conversation,
          );

          this.showProjectRequirementForm = false;
          this.savingProjectRequirement = false;
          this.resetProjectRequirementForm();
          this.loadConversations();
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingProjectRequirement = false;
          this.error = 'Unable to save project requirements right now.';
          this.cdr.detectChanges();
        },
      });
  }

  private prefillProjectRequirementForm(): void {
    const chat = this.selectedChat;
    const request = this.findSelectedActionableHireRequest();
    const price = request?.projectAgreedPrice ?? request?.agreedPrice;

    this.projectRequirementForm = {
      projectTitle:
        this.pickDisplayString({ project: chat?.project }, ['project']) ||
        request?.gigTitle ||
        '',
      requirements: request?.requirements || '',
      agreedPrice: price ? String(price) : '',
      startDate: '',
      deadline: request?.deadline || '',
      requirementFile: null,
    };
  }

  private closeProjectRequirementForm(): void {
    this.showProjectRequirementForm = false;
    this.savingProjectRequirement = false;
    this.resetProjectRequirementForm();
  }

  private resetProjectRequirementForm(): void {
    this.projectRequirementForm = {
      projectTitle: '',
      requirements: '',
      agreedPrice: '',
      startDate: '',
      deadline: '',
      requirementFile: null,
    };
  }

  private resolveSelectedProjectId(): number | null {
    const chatProjectId = this.toNullableNumber(this.selectedChat?.projectId);
    if (chatProjectId) return chatProjectId;

    for (const message of this.messages) {
      const projectId =
        this.toNullableNumber(message.formalNoticeProjectId) ??
        this.toNullableNumber(message.hireRequestDetails?.['projectId']);
      if (projectId) return projectId;
    }

    const request = this.findSelectedActionableHireRequest();
    return this.toNullableNumber(request?.projectId);
  }

  downloadAttachment(message: MessageItem, fallbackUrl?: string | null): void {
    const messageId = Number(message.id);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      this.triggerAttachmentDownload(fallbackUrl, message.attachmentName);
      return;
    }

    this.chatService.downloadAttachment(messageId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.triggerAttachmentDownload(url, message.attachmentName);
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => {
        if (fallbackUrl) {
          this.triggerAttachmentDownload(fallbackUrl, message.attachmentName);
          return;
        }

        this.error = 'Unable to download attachment right now.';
        this.cdr.detectChanges();
      },
    });
  }

  private triggerAttachmentDownload(url?: string | null, fileName?: string | null): void {
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'attachment';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  openFreelancerProfile(): void {
    const freelancerId = this.selectedChat?.otherFreelancerId;
    if (!freelancerId) return;
    this.router.navigate(['/client/browse-freelancers/freelancer', freelancerId]);
  }

  submitPriceProposal(): void {
    const request = this.findSelectedActionableHireRequest();
    const price = Number(this.priceDraft);
    if (!request || !Number.isFinite(price) || price <= 0) {
      this.error = 'Select an accepted request in this chat and enter a valid price.';
      return;
    }

    this.chatService.proposeClientHireRequestPrice(request.id, price).subscribe({
      next: () => {
        const receiverId = this.selectedChat?.otherUserId;
        this.priceDraft = '';
        this.showAttachMenu = false;
        this.loadHireRequests();
        if (receiverId && this.selectedChat) {
          const content = JSON.stringify({
            type: 'price_proposal',
            messageType: 'price_proposal',
            status: 'pending',
            proposedBy: 'client',
            requestId: request.id,
            projectId: request.projectId,
            gigId: request.gigId ?? this.selectedChat.gigId,
            gigTitle: request.gigTitle ?? this.selectedChat.project,
            pricePending: price,
            text: `New price proposal: $${price}. Please review and accept to start the project.`,
          });

          this.chatService
            .sendRoomMessage(this.selectedChat.roomId, { receiverId: Number(receiverId), content })
            .subscribe({ next: () => this.loadMessages(this.selectedChat!.roomId) });
        }
      },
      error: () => {
        this.error = 'Unable to send the price proposal right now.';
        this.cdr.detectChanges();
      },
    });
  }

  private findSelectedActionableHireRequest(): HireRequestResponse | null {
    const chat = this.selectedChat;
    if (!chat) return null;

    return (
      this.hireRequests.find(
        (request) =>
          (chat.hireRequestId ? request.id === chat.hireRequestId : true) &&
          request.status === 'accepted',
      ) ??
      this.hireRequests.find(
        (request) =>
          (chat.gigId ? request.gigId === chat.gigId : false) &&
          (chat.otherFreelancerId ? request.freelancerId === chat.otherFreelancerId : true),
      ) ??
      null
    );
  }

  acceptPriceProposal(message: MessageItem): void {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.formalNoticeRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    const price = this.toNullableNumber(
      message.priceProposalAmount ?? message.hireRequestDetails?.['pricePending'],
    );

    if (!requestId || !price) {
      this.error = 'Unable to accept this price because request or price data is missing.';
      this.cdr.detectChanges();
      return;
    }

    const actionKey = this.getPriceActionKey(message);
    this.priceActionMessageIds.add(actionKey);
    this.cdr.detectChanges();

    this.chatService.acceptHireRequestPrice(requestId, price).subscribe({
      next: (project) => {
        const projectId =
          this.toNullableNumber(project?.id) ??
          this.toNullableNumber(message.hireRequestDetails?.['projectId']);

        this.updateMatchingPriceProposalCards('accepted', requestId, price, projectId);
        this.loadHireRequests();

        const receiverId = this.selectedChat?.otherUserId;
        if (receiverId && this.selectedChat) {
          const content = JSON.stringify({
            type: 'price_agreement',
            messageType: 'price_agreement',
            status: 'accepted',
            requestId,
            projectId,
            gigId: message.hireRequestDetails?.['gigId'] ?? this.selectedChat.gigId,
            gigTitle:
              this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']) ??
              this.selectedChat.project,
            agreedPrice: price,
            text: `Agreed price accepted: $${price}`,
          });

          this.chatService
            .sendRoomMessage(this.selectedChat.roomId, { receiverId: Number(receiverId), content })
            .subscribe();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.priceActionMessageIds.delete(actionKey);
        this.error = 'Unable to accept the price proposal right now.';
        this.cdr.detectChanges();
      },
    });
  }

  rejectPriceProposal(message: MessageItem): void {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.formalNoticeRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    const price = this.toNullableNumber(
      message.priceProposalAmount ??
        message.hireRequestDetails?.['pricePending'] ??
        message.hireRequestDetails?.['agreedPrice'],
    );

    if (!requestId) {
      this.error = 'Unable to reject this price because request data is missing.';
      this.cdr.detectChanges();
      return;
    }

    const actionKey = this.getPriceActionKey(message);
    this.priceActionMessageIds.add(actionKey);
    this.cdr.detectChanges();

    this.chatService.rejectHireRequestPrice(requestId).subscribe({
      next: () => {
        this.updateMatchingPriceProposalCards('rejected', requestId, price ?? null);
        this.loadHireRequests();

        const receiverId = this.selectedChat?.otherUserId;
        if (receiverId && this.selectedChat) {
          const content = JSON.stringify({
            type: 'price_rejected',
            messageType: 'price_rejected',
            status: 'rejected',
            requestId,
            projectId: message.hireRequestDetails?.['projectId'] ?? this.selectedChat.projectId,
            gigId: message.hireRequestDetails?.['gigId'] ?? this.selectedChat.gigId,
            gigTitle:
              this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']) ??
              this.selectedChat.project,
            pricePending: price,
            text: `Price proposal rejected${price ? `: $${price}` : ''}. Please discuss a new amount.`,
          });

          this.chatService
            .sendRoomMessage(this.selectedChat.roomId, { receiverId: Number(receiverId), content })
            .subscribe();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.priceActionMessageIds.delete(actionKey);
        this.error = 'Unable to reject the price proposal right now.';
        this.cdr.detectChanges();
      },
    });
  }

  hasAgreedPrice(message: MessageItem): boolean {
    const details = message.hireRequestDetails ?? {};
    return this.toNullableNumber(details['agreedPrice']) !== null;
  }

  canRespondToPriceProposal(message: MessageItem): boolean {
    return (
      message.isPriceProposal === true &&
      !message.isMine &&
      !this.priceActionMessageIds.has(this.getPriceActionKey(message)) &&
      message.priceProposalStatus !== 'accepted' &&
      message.priceProposalStatus !== 'rejected'
    );
  }

  private getPriceActionKey(message: MessageItem): string {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.formalNoticeRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    const price = this.toNullableNumber(
      message.priceProposalAmount ??
        message.hireRequestDetails?.['pricePending'] ??
        message.hireRequestDetails?.['agreedPrice'],
    );

    return `${message.id || 'price'}:${requestId ?? 'request'}:${price ?? 'amount'}`;
  }

  private updateMatchingPriceProposalCards(
    status: 'accepted' | 'rejected',
    requestId: number,
    price: number | null,
    projectId: number | null = null,
  ): void {
    this.messages = this.messages.map((item) => {
      if (!item.isPriceProposal) return item;

      const itemRequestId = this.toNullableNumber(
        item.hireRequestId ??
          item.formalNoticeRequestId ??
          item.hireRequestDetails?.['requestId'] ??
          item.hireRequestDetails?.['id'],
      );
      const itemPrice = this.toNullableNumber(
        item.priceProposalAmount ??
          item.hireRequestDetails?.['pricePending'] ??
          item.hireRequestDetails?.['agreedPrice'],
      );

      if (itemRequestId !== requestId || (price !== null && itemPrice !== price)) {
        return item;
      }

      this.priceActionMessageIds.add(this.getPriceActionKey(item));

      return {
        ...item,
        priceProposalStatus: status,
        hireRequestDetails: {
          ...(item.hireRequestDetails ?? {}),
          agreedPrice: status === 'accepted' ? price : item.hireRequestDetails?.['agreedPrice'],
          pricePending: null,
          status,
          projectId: projectId ?? item.hireRequestDetails?.['projectId'],
        },
      };
    });
  }

  onMessageInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.sendMessage();
  }

  private loadHireRequests(): void {
    this.chatService.getMyClientHireRequests().subscribe({
      next: (requests) => {
        this.hireRequests = requests ?? [];
        this.syncCompletedDeliveryProjectsFromServer();
        this.syncHireRequestStatusesFromServer();
        this.syncPriceProposalStatusesFromServer();
      },
      error: () => {
        this.hireRequests = [];
      },
    });
  }

  private loadCurrentClientProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.currentUserAvatar = this.buildAvatarUrl(
          profile.profilePictureData ?? profile.avatar ?? profile.profilePictureName,
          profile.profilePictureType,
        );

        if (!this.currentUserAvatar) {
          return;
        }

        this.messages = this.messages.map((message) =>
          message.isMine ? { ...message, avatar: this.currentUserAvatar } : message,
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUserAvatar = undefined;
      },
    });
  }

  private handleIncomingMessage(message: ChatMessageResponse): void {
    const roomId = message.roomId ?? null;
    if (roomId === null || roomId === undefined) {
      this.loadConversations();
      return;
    }

    const incomingRoomId = String(roomId);
    const mapped = this.mapIncomingMessage(message);
    const knownConversation = this.conversations.some(
      (conversation) => String(conversation.roomId) === incomingRoomId,
    );
    const selectedConversation = this.selectedChat;
    const selectedRoomId = selectedConversation ? String(selectedConversation.roomId) : null;

    if (selectedRoomId !== null && selectedRoomId === incomingRoomId) {
      this.messages = this.upsertMessage(this.messages, mapped);
      this.syncHireRequestStatusesFromNotices();
      this.syncHireRequestStatusesFromServer();
      this.syncPriceProposalStatusesFromServer();
      this.syncProjectRequirementProposalStatuses();
      this.syncProjectRevisionStatuses();
      this.scrollToLatestMessage();
    }

    this.updateConversationPreview(incomingRoomId, this.getMessageDisplayText(mapped), mapped.time);

    if (!knownConversation) {
      this.loadConversations();
      return;
    }

    this.cdr.detectChanges();
  }

  private scrollToLatestMessage(): void {
    requestAnimationFrame(() => {
      const element = this.messagesScroll?.nativeElement;
      if (!element) return;

      element.scrollTop = element.scrollHeight;
    });
  }

  private mapIncomingMessage(message: ChatMessageResponse): MessageItem {
    const content = message.content ?? '';
    const formalNotice = this.parseFormalHireRequestNotice(content);
    const isMine = this.isCurrentUserMessage(message);
    return {
      id: String(message.id ?? `${Date.now()}`),
      roomId: message.roomId ?? undefined,
      senderId: message.senderId ?? undefined,
      receiverId: message.receiverId ?? undefined,
      senderName: message.senderName ?? 'User',
      text: this.normalizeMessagePreview(content),
      time: this.formatTime(message.sentAt ?? new Date().toISOString()),
      isMine,
      avatar: isMine ? this.currentUserAvatar : this.selectedChat?.avatar,
      initial: (message.senderName && message.senderName.charAt(0).toUpperCase()) || 'U',
      attachmentName: message.attachmentName ?? null,
      attachmentType: message.attachmentType ?? null,
      attachmentData: message.attachmentData ?? null,
      attachmentUrl: this.buildAttachmentUrl(message.attachmentData, message.attachmentType),
      ...formalNotice,
      ...this.parseProjectRequirementProposalMessage(content),
      ...this.parseProjectDeliveryMessage(content),
      ...this.parseProjectRevisionRequestMessage(content),
      ...this.parsePriceProposalMessage(content),
      ...this.parseHireRequestMessage(content),
    };
  }

  private updateConversationPreview(roomId: string, preview: string, time: string): void {
    const index = this.conversations.findIndex(
      (conversation) => String(conversation.roomId) === roomId,
    );
    if (index < 0) return;

    this.conversations[index] = {
      ...this.conversations[index],
      preview,
      time,
      lastMessageAt: new Date().toISOString(),
    };

    const [updated] = this.conversations.splice(index, 1);
    this.conversations = [updated, ...this.conversations];
  }

  private getConversationTimeValue(conversation: ChatItem): number {
    const value = conversation.lastMessageAt ? Date.parse(conversation.lastMessageAt) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  private updateSelectedRoomRoute(roomId: number | string, replaceUrl = false): void {
    const currentRoomId =
      this.route.snapshot.paramMap.get('roomId') ?? this.route.snapshot.paramMap.get('id');
    const nextRoomId = String(roomId);

    if (currentRoomId === nextRoomId) {
      return;
    }

    void this.router.navigate(['/client', nextRoomId, 'chat'], { replaceUrl });
  }

  private upsertMessage(messages: MessageItem[], incoming: MessageItem): MessageItem[] {
    const incomingId = incoming.id.trim();

    if (incomingId) {
      const existingIndex = messages.findIndex((message) => message.id === incomingId);
      if (existingIndex >= 0) {
        return messages.map((message, index) => (index === existingIndex ? incoming : message));
      }
    }

    return [...messages, incoming];
  }

  private isCurrentUserMessage(message: Partial<ChatMessageResponse>): boolean {
    if (this.currentUserEmail && message.senderEmail) {
      return message.senderEmail.trim().toLowerCase() === this.currentUserEmail;
    }

    const currentUserId = this.getCurrentUserIdFromToken();
    return currentUserId !== null && Number(message.senderId ?? 0) === currentUserId;
  }

  private buildAvatarUrl(
    data?: string | Uint8Array | number[] | null,
    contentType?: string | null,
  ): string | undefined {
    let imageData = '';

    if (typeof data === 'string') {
      imageData = data.trim();
    } else if (data instanceof Uint8Array) {
      imageData = this.bytesToBase64(data);
    } else if (Array.isArray(data)) {
      imageData = this.bytesToBase64(new Uint8Array(data));
    }

    if (!imageData) {
      return undefined;
    }

    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData)) {
      return imageData;
    }

    return `data:${contentType?.trim() || 'image/jpeg'};base64,${imageData}`;
  }

  private buildAttachmentUrl(
    data?: string | null,
    contentType?: string | null,
  ): string | undefined {
    if (!data) {
      return undefined;
    }

    return `data:${contentType?.trim() || 'application/octet-stream'};base64,${data}`;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private formatTime(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return '';
    }

    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    const parsedDate = new Date(raw);
    if (Number.isNaN(parsedDate.getTime())) {
      return raw;
    }

    return parsedDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private syncHireRequestStatusesFromNotices(): void {
    let updated = false;

    for (const message of this.messages) {
      const notice = message.isFormalNotice
        ? {
            status: message.formalNoticeStatus ?? (message as any).status,
            requestId:
              message.formalNoticeRequestId ??
              this.toNullableNumber(
                (message as any).requestId ??
                  message.hireRequestDetails?.['requestId'] ??
                  message.hireRequestDetails?.['id'],
              ) ??
              null,
            gigTitle:
              (message as any).gigTitle ??
              this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']) ??
              undefined,
            projectId:
              message.formalNoticeProjectId ??
              (message as any).projectId ??
              this.toNullableNumber(message.hireRequestDetails?.['projectId']) ??
              null,
          }
        : this.parseFormalHireRequestNotice(message.text);

      if (!notice) continue;

      const target = [...this.messages]
        .reverse()
        .find(
          (candidate) =>
            candidate.isHireRequest &&
            this.matchesHireRequestNotice(
              candidate,
              notice.requestId,
              notice.gigTitle,
              notice.projectId,
            ) &&
            candidate.hireRequestStatus !== notice.status,
        );

      if (!target) continue;

      target.hireRequestStatus = notice.status ?? target.hireRequestStatus;
      if (target.hireRequestDetails) {
        target.hireRequestDetails = {
          ...target.hireRequestDetails,
          status: notice.status ?? target.hireRequestDetails['status'],
          projectId: notice.projectId ?? target.hireRequestDetails['projectId'],
        };
      }

      updated = true;
    }

    if (updated) {
      // replace the array reference to ensure Angular change detection notices updates
      this.messages = this.messages.map((m) => ({ ...m }));
      this.cdr.detectChanges();
    }
  }

  private syncHireRequestStatusesFromServer(): void {
    if (this.hireRequests.length === 0 || this.messages.length === 0) {
      return;
    }

    let updated = false;

    for (const message of this.messages) {
      if (!message.isHireRequest) continue;

      const requestId = this.toNullableNumber(
        message.hireRequestId ??
          message.hireRequestDetails?.['requestId'] ??
          message.hireRequestDetails?.['id'],
      );

      const projectId = this.toNullableNumber(
        message.formalNoticeProjectId ??
          message.hireRequestDetails?.['projectId'] ??
          (message as any).projectId,
      );

      const gigTitle = this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']);

      const matchedRequest = this.hireRequests.find((request) => {
        if (requestId !== null && request.id === requestId) {
          return true;
        }

        if (
          projectId !== null &&
          request.projectId !== undefined &&
          request.projectId === projectId
        ) {
          return true;
        }

        if (!gigTitle || !request.gigTitle) {
          return false;
        }

        return request.gigTitle.trim().toLowerCase() === gigTitle.trim().toLowerCase();
      });

      if (!matchedRequest || matchedRequest.status === message.hireRequestStatus) {
        continue;
      }

      message.hireRequestStatus = matchedRequest.status;
      message.hireRequestDetails = {
        ...(message.hireRequestDetails ?? {}),
        requestId: matchedRequest.id,
        projectId: matchedRequest.projectId ?? message.hireRequestDetails?.['projectId'],
        gigId: matchedRequest.gigId ?? message.hireRequestDetails?.['gigId'],
        freelancerId: matchedRequest.freelancerId ?? message.hireRequestDetails?.['freelancerId'],
        status: matchedRequest.status,
        gigTitle: matchedRequest.gigTitle,
        requestMessage: matchedRequest.requestMessage,
        requirements: matchedRequest.requirements,
        agreedPrice: matchedRequest.agreedPrice,
        projectAgreedPrice: matchedRequest.projectAgreedPrice,
      };

      updated = true;
    }

    if (updated) {
      this.messages = this.messages.map((message) => ({ ...message }));
      this.cdr.detectChanges();
    }
  }

  private syncPriceProposalStatusesFromServer(): void {
    if (this.hireRequests.length === 0 || this.messages.length === 0) {
      return;
    }

    let updated = false;

    this.messages = this.messages.map((message) => {
      if (
        !message.isPriceProposal ||
        message.priceProposalStatus === 'accepted' ||
        message.priceProposalStatus === 'rejected'
      ) {
        return message;
      }

      const requestId = this.toNullableNumber(
        message.hireRequestId ??
          message.formalNoticeRequestId ??
          message.hireRequestDetails?.['requestId'] ??
          message.hireRequestDetails?.['id'],
      );
      const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
      const gigId = this.toNullableNumber(message.hireRequestDetails?.['gigId']);
      const proposedPrice = this.toNullableNumber(
        message.priceProposalAmount ??
          message.hireRequestDetails?.['pricePending'] ??
          message.hireRequestDetails?.['agreedPrice'],
      );

      const matchedRequest = this.hireRequests.find((request) => {
        if (requestId !== null && request.id === requestId) return true;
        if (projectId !== null && request.projectId === projectId) return true;
        return gigId !== null && request.gigId === gigId;
      });

      if (!matchedRequest) {
        return message;
      }

      const agreedPrice = this.toNullableNumber(matchedRequest.projectAgreedPrice);
      const pendingPrice = this.toNullableNumber(matchedRequest.agreedPrice);
      let nextStatus: 'accepted' | 'rejected' | null = null;

      if (agreedPrice !== null && (proposedPrice === null || agreedPrice === proposedPrice)) {
        nextStatus = 'accepted';
      } else if (
        pendingPrice === null ||
        (proposedPrice !== null && pendingPrice !== proposedPrice)
      ) {
        nextStatus = 'rejected';
      }

      if (!nextStatus) {
        return message;
      }

      updated = true;
      this.priceActionMessageIds.add(this.getPriceActionKey(message));

      return {
        ...message,
        priceProposalStatus: nextStatus,
        hireRequestDetails: {
          ...(message.hireRequestDetails ?? {}),
          requestId: matchedRequest.id,
          projectId: matchedRequest.projectId ?? message.hireRequestDetails?.['projectId'],
          gigId: matchedRequest.gigId ?? message.hireRequestDetails?.['gigId'],
          freelancerId: matchedRequest.freelancerId ?? message.hireRequestDetails?.['freelancerId'],
          agreedPrice:
            nextStatus === 'accepted' ? agreedPrice : message.hireRequestDetails?.['agreedPrice'],
          pricePending: pendingPrice,
          projectAgreedPrice: matchedRequest.projectAgreedPrice,
          status: nextStatus,
        },
      };
    });

    if (updated) {
      this.cdr.detectChanges();
    }
  }

  private matchesHireRequestNotice(
    message: MessageItem,
    requestId?: number | null,
    gigTitle?: string,
    projectId?: number | null,
  ): boolean {
    if (requestId !== null && requestId !== undefined) {
      const existingRequestId = this.toNullableNumber(
        message.hireRequestId ??
          message.hireRequestDetails?.['requestId'] ??
          message.hireRequestDetails?.['id'],
      );

      if (existingRequestId !== null && existingRequestId === requestId) {
        return true;
      }
    }

    if (projectId !== null && projectId !== undefined) {
      const existingProjectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
      if (existingProjectId !== null && existingProjectId === projectId) {
        return true;
      }
    }

    if (!gigTitle) return false;

    const candidateTitle = String(message.hireRequestDetails?.['gigTitle'] ?? '')
      .trim()
      .toLowerCase();
    return candidateTitle === gigTitle.trim().toLowerCase();
  }

  private parseFormalHireRequestNotice(content?: unknown): {
    isFormalNotice: true;
    formalNoticeRequestId?: number | null;
    formalNoticeStatus: 'accepted' | 'rejected';
    // legacy alias
    status?: 'accepted' | 'rejected';
    gigTitle: string;
    formalNoticeProjectId: number | null;
    // legacy alias
    projectId?: number | null;
    // legacy alias
    requestId?: number | null;
    text: string;
  } | null {
    if (content === undefined || content === null) return null;

    let parsed: Record<string, unknown> | null = null;

    if (typeof content === 'string') {
      const trimmed = content.trim();
      try {
        parsed = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        parsed = null;
      }

      if (!parsed) {
        const match =
          /^Formal notice:\s*I have\s+(accepted|rejected)\s+your hire request for\s+"([^"]+)"/i.exec(
            trimmed,
          );
        if (!match) return null;

        return {
          isFormalNotice: true,
          formalNoticeStatus: match[1].toLowerCase() as 'accepted' | 'rejected',
          // legacy aliases for existing code
          status: match[1].toLowerCase() as 'accepted' | 'rejected',
          formalNoticeRequestId: null,
          requestId: null,
          gigTitle: match[2].trim(),
          formalNoticeProjectId: null,
          projectId: null,
          text:
            match[1].toLowerCase() === 'accepted'
              ? `Formal notice: I have accepted your hire request for "${match[2].trim()}". I will proceed with the project now.`
              : `Formal notice: I have rejected your hire request for "${match[2].trim()}". Thank you for considering my services.`,
        };
      }
    } else if (typeof content === 'object') {
      parsed = content as Record<string, unknown>;
    }

    if (!parsed || parsed['type'] !== 'formal_notice') return null;

    const status = this.pickString(parsed, ['status'])?.toLowerCase();
    if (status !== 'accepted' && status !== 'rejected') return null;

    const gigTitle = this.pickString(parsed, ['gigTitle']) ?? 'your request';
    const text =
      this.pickString(parsed, ['text']) ??
      (status === 'accepted'
        ? `Formal notice: I have accepted your hire request for "${gigTitle}". I will proceed with the project now.`
        : `Formal notice: I have rejected your hire request for "${gigTitle}". Thank you for considering my services.`);

    return {
      isFormalNotice: true,
      formalNoticeRequestId: this.toNullableNumber(parsed['requestId']),
      formalNoticeStatus: status as 'accepted' | 'rejected',
      // legacy aliases
      status: status as 'accepted' | 'rejected',
      requestId: this.toNullableNumber(parsed['requestId']),
      gigTitle,
      formalNoticeProjectId: this.toNullableNumber(parsed['projectId']),
      projectId: this.toNullableNumber(parsed['projectId']),
      text,
    };
  }

  openConfirmOrder(message: MessageItem): void {
    this.openConfirmOrderFromRequest(message, this.findMatchingHireRequest(message), true);
  }

  private openConfirmOrderFromRequest(
    message: MessageItem,
    matchedRequest: HireRequestResponse | null,
    allowRefresh: boolean,
  ): void {
    matchedRequest = matchedRequest ?? this.findAcceptedHireRequestFallback(message);
    const projectId =
      message.formalNoticeProjectId ??
      this.toNullableNumber(
        message.hireRequestDetails?.['projectId'] ?? matchedRequest?.projectId,
      ) ??
      null;

    const gigId = this.toNullableNumber(
      message.hireRequestDetails?.['gigId'] ?? matchedRequest?.gigId,
    );

    if ((!projectId || !gigId) && allowRefresh) {
      this.refreshHireRequestsAndOpenConfirmOrder(message);
      return;
    }

    if (!gigId) {
      this.error = 'Unable to open the confirm order page because the gig id is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.router.navigate(['/client/browse-gigs/gig', gigId, 'confirm-order'], {
      state: {
        mode: projectId ? 'pay' : 'request',
        requestStatus: 'accepted',
        order: {
          projectId: projectId ?? undefined,
          gig: {
            id: gigId ?? undefined,
            serviceTitle:
              this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']) ??
              matchedRequest?.gigTitle ??
              this.selectedChat?.project ??
              'Freelance service',
          },
          freelancer: {
            id:
              this.toNullableNumber(message.hireRequestDetails?.['freelancerId']) ??
              matchedRequest?.freelancerId ??
              this.toNullableNumber(message.senderId ?? message.receiverId),
            freelancerName: this.selectedChat?.name ?? message.senderName,
          },
          price: this.toNumber(
            message.hireRequestDetails?.['agreedPrice'] ??
              matchedRequest?.projectAgreedPrice ??
              matchedRequest?.agreedPrice ??
              message.hireRequestDetails?.['pricePending'] ??
              0,
          ),
          package: 'Confirmed Order',
        },
      },
    });
  }

  private refreshHireRequestsAndOpenConfirmOrder(message: MessageItem): void {
    this.error = '';

    this.chatService.getMyClientHireRequests().subscribe({
      next: (requests) => {
        this.hireRequests = requests ?? [];
        this.syncCompletedDeliveryProjectsFromServer();
        this.syncHireRequestStatusesFromServer();
        this.openConfirmOrderFromRequest(message, this.findMatchingHireRequest(message), false);
      },
      error: () => {
        this.error = 'Payment is not ready yet. Please wait for the freelancer acceptance notice.';
        this.cdr.detectChanges();
      },
    });
  }

  private findMatchingHireRequest(message: MessageItem): HireRequestResponse | null {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.formalNoticeRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );

    const projectId = this.toNullableNumber(
      message.formalNoticeProjectId ?? message.hireRequestDetails?.['projectId'],
    );

    const gigTitle = this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']);

    return (
      this.hireRequests.find((request) => {
        if (requestId !== null && request.id === requestId) {
          return true;
        }

        if (projectId !== null && request.projectId === projectId) {
          return true;
        }

        return (
          !!gigTitle &&
          !!request.gigTitle &&
          request.gigTitle.trim().toLowerCase() === gigTitle.trim().toLowerCase()
        );
      }) ?? null
    );
  }

  private findAcceptedHireRequestFallback(message: MessageItem): HireRequestResponse | null {
    const selectedFreelancerId = this.toNullableNumber(
      this.selectedChat?.otherFreelancerId ?? this.selectedChat?.otherUserId,
    );
    const gigTitle = this.pickString(message.hireRequestDetails ?? {}, ['gigTitle']);

    const acceptedRequests = this.hireRequests
      .filter((request) => request.status === 'accepted')
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

    return (
      acceptedRequests.find((request) => {
        if (selectedFreelancerId !== null && request.freelancerId === selectedFreelancerId) {
          return true;
        }

        return (
          !!gigTitle &&
          !!request.gigTitle &&
          request.gigTitle.trim().toLowerCase() === gigTitle.trim().toLowerCase()
        );
      }) ??
      acceptedRequests[0] ??
      null
    );
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return null;
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  getMessageDisplayText(message: MessageItem): string {
    if (message.isPriceProposal) {
      return this.pickString(message.hireRequestDetails ?? {}, ['text']) ?? message.text;
    }

    if (message.isFormalNotice) {
      return message.text;
    }

    if (!message.isHireRequest) {
      return message.text;
    }

    return this.normalizeHireRequestText(message.hireRequestDetails, message.text);
  }

  getPriceProposalTitle(message: MessageItem): string {
    const details = message.hireRequestDetails ?? {};
    return (
      this.pickDisplayString(details, ['gigTitle', 'projectTitle', 'title']) ??
      this.pickDisplayString({ project: this.selectedChat?.project }, ['project']) ??
      'Project chat'
    );
  }

  getPriceProposalAmount(message: MessageItem): string {
    const details = message.hireRequestDetails ?? {};
    const amount = this.toNullableNumber(
      message.priceProposalAmount ??
        details['pricePending'] ??
        details['agreedPrice'] ??
        details['price'] ??
        details['amount'],
    );

    return amount !== null ? `$${amount}` : 'Pending agreement';
  }

  getRequestTitle(message: MessageItem): string {
    const details = message.hireRequestDetails ?? {};
    return (
      this.pickDisplayString(details, ['gigTitle', 'projectTitle', 'title']) ??
      this.pickDisplayString({ project: this.selectedChat?.project }, ['project']) ??
      'Freelance chat'
    );
  }

  getRequestPrice(message: MessageItem): string {
    const details = message.hireRequestDetails ?? {};
    const price =
      this.pickDisplayString(details, ['agreedPrice', 'pricePending', 'price', 'amount']) ??
      'Pending agreement';

    return price;
  }

  private normalizeMessagePreview(text: string): string {
    const parsed = this.parseJsonPayload(text);
    if (!parsed) {
      return text;
    }

    if (parsed['type'] === 'formal_notice') {
      return this.pickString(parsed, ['text']) ?? text;
    }

    if (this.isProjectRequirementProposalPayload(parsed)) {
      return this.pickString(parsed, ['text']) ?? 'Actual requirement submitted';
    }

    if (this.isProjectDeliveryPayload(parsed)) {
      return this.pickString(parsed, ['text']) ?? 'Project delivery submitted';
    }

    if (this.isProjectRevisionRequestPayload(parsed)) {
      return this.pickString(parsed, ['text']) ?? 'Revision requested';
    }

    if (this.isPriceMessageType(parsed['type']) || this.isPriceMessageType(parsed['messageType'])) {
      const nested = this.getNestedJsonPayload(parsed);
      const source = { ...(nested ?? {}), ...parsed };
      return this.pickDisplayString(source, ['text']) ?? text;
    }

    if (parsed['type'] === 'hire_request') {
      return this.normalizeHireRequestText(parsed, text);
    }

    return text;
  }

  private syncProjectRequirementProposalStatuses(): void {
    if (this.messages.length === 0) {
      return;
    }

    const acceptedProposalIds = new Set<number>();
    const acceptedProjectIds = new Set<number>();

    for (const message of this.messages) {
      if (!message.isProjectRequirementProposal) {
        continue;
      }

      const status = (message.projectRequirementProposalStatus ?? '').toUpperCase();
      if (status !== 'ACCEPTED') {
        continue;
      }

      const proposalId = this.toNullableNumber(
        message.projectRequirementProposalId ?? message.hireRequestDetails?.['proposalId'],
      );
      const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);

      if (proposalId !== null) {
        acceptedProposalIds.add(proposalId);
      }

      if (projectId !== null) {
        acceptedProjectIds.add(projectId);
      }
    }

    if (acceptedProposalIds.size === 0 && acceptedProjectIds.size === 0) {
      return;
    }

    let updated = false;
    this.messages = this.messages.map((message) => {
      if (!message.isProjectRequirementProposal) {
        return message;
      }

      const status = (message.projectRequirementProposalStatus ?? '').toUpperCase();
      if (status === 'ACCEPTED') {
        return message;
      }

      const proposalId = this.toNullableNumber(
        message.projectRequirementProposalId ?? message.hireRequestDetails?.['proposalId'],
      );
      const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
      const shouldMarkAccepted =
        (proposalId !== null && acceptedProposalIds.has(proposalId)) ||
        (projectId !== null && acceptedProjectIds.has(projectId));

      if (!shouldMarkAccepted) {
        return message;
      }

      updated = true;
      return {
        ...message,
        projectRequirementProposalStatus: 'ACCEPTED',
        hireRequestDetails: {
          ...(message.hireRequestDetails ?? {}),
          status: 'ACCEPTED',
        },
      };
    });

    if (updated) {
      this.cdr.detectChanges();
    }
  }

  openPaymentForCompletedDelivery(message: MessageItem): void {
    const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    const gigId = this.toNullableNumber(
      message.hireRequestDetails?.['gigId'] ?? this.selectedChat?.gigId,
    );

    if (!projectId || !gigId) {
      this.error = 'Unable to open payment because project or gig information is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.router.navigate(['/client/browse-gigs/gig', gigId, 'confirm-order'], {
      state: {
        mode: 'pay',
        requestStatus: 'accepted',
        order: {
          projectId,
          gig: {
            id: gigId,
            serviceTitle:
              this.pickString(message.hireRequestDetails ?? {}, ['projectTitle', 'gigTitle']) ??
              this.selectedChat?.project ??
              'Completed work',
          },
          freelancer: {
            id: this.selectedChat?.otherFreelancerId ?? this.selectedChat?.otherUserId,
            freelancerName: this.selectedChat?.name ?? message.senderName,
          },
          price: this.toNumber(message.hireRequestDetails?.['agreedPrice']),
          package: 'Completed Work',
        },
      },
    });
  }

  private loadClientProjects(): void {
    this.chatService.getMyClientProjects().subscribe({
      next: (projects) => {
        this.syncCompletedDeliveryProjectsFromProjects(projects ?? []);
      },
      error: () => {
        // Hire-request sync still handles older backends or temporary project endpoint failures.
      },
    });
  }

  private parseProjectRequirementProposalMessage(
    content?: unknown,
  ): Pick<
    MessageItem,
    | 'isProjectRequirementProposal'
    | 'projectRequirementProposalStatus'
    | 'projectRequirementProposalId'
    | 'hireRequestDetails'
  > {
    const parsed =
      typeof content === 'string'
        ? this.parseJsonPayload(content)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : null;

    if (!parsed || !this.isProjectRequirementProposalPayload(parsed)) {
      return {};
    }

    return {
      isProjectRequirementProposal: true,
      projectRequirementProposalStatus: this.pickString(parsed, ['status']) ?? 'PENDING',
      projectRequirementProposalId: this.toNullableNumber(parsed['proposalId']),
      hireRequestDetails: parsed,
    };
  }

  private isProjectRequirementProposalPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_requirement_proposal';
  }

  getProjectRequirementValue(message: MessageItem, key: string): string {
    return this.pickDisplayString(message.hireRequestDetails ?? {}, [key]) ?? 'Not set';
  }

  getProjectRevisionValue(message: MessageItem, key: string): string {
    return this.pickDisplayString(message.hireRequestDetails ?? {}, [key]) ?? 'Not set';
  }

  getProjectRevisionStatusLabel(message: MessageItem): string {
    return this.resolveProjectRevisionStatus(message)
      .replace(/_/g, ' ')
      .toLowerCase();
  }

  private resolveProjectRevisionStatus(message: MessageItem): string {
    return String(
      message.projectRevisionStatus ?? message.hireRequestDetails?.['status'] ?? 'REVISION_REQUESTED',
    )
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  }

  private parseProjectDeliveryMessage(
    content?: unknown,
  ): Pick<MessageItem, 'isProjectDelivery' | 'projectDeliveryStatus' | 'hireRequestDetails'> {
    const parsed =
      typeof content === 'string'
        ? this.parseJsonPayload(content)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : null;

    if (!parsed || !this.isProjectDeliveryPayload(parsed)) {
      return {};
    }

    return {
      isProjectDelivery: true,
      projectDeliveryStatus: this.pickString(parsed, ['status']) ?? 'DELIVERED',
      hireRequestDetails: parsed,
    };
  }

  private isProjectDeliveryPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_delivery';
  }

  private parseProjectRevisionRequestMessage(
    content?: unknown,
  ): Pick<
    MessageItem,
    'isProjectRevisionRequest' | 'projectRevisionStatus' | 'hireRequestDetails'
  > {
    const parsed =
      typeof content === 'string'
        ? this.parseJsonPayload(content)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : null;

    if (!parsed || !this.isProjectRevisionRequestPayload(parsed)) {
      return {};
    }

    return {
      isProjectRevisionRequest: true,
      projectRevisionStatus: this.pickString(parsed, ['status']) ?? 'REVISION_REQUESTED',
      hireRequestDetails: parsed,
    };
  }

  private isProjectRevisionRequestPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_revision_request' || type === 'revision_request';
  }

  private resolveRevisionProjectId(message: MessageItem): number | null {
    const details = message.hireRequestDetails ?? {};
    const nestedProject =
      details['project'] && typeof details['project'] === 'object'
        ? (details['project'] as Record<string, unknown>)
        : null;

    return (
      this.toNullableNumber(details['projectId']) ??
      this.toNullableNumber(details['id']) ??
      this.toNullableNumber(nestedProject?.['id']) ??
      this.toNullableNumber(this.selectedChat?.projectId)
    );
  }

  private syncProjectRevisionStatuses(): void {
    const latestStatusByProjectId = new Map<number, string>();

    for (const message of this.messages) {
      if (!message.isProjectRevisionRequest) continue;
      const projectId = this.resolveRevisionProjectId(message);
      if (projectId === null) continue;
      latestStatusByProjectId.set(projectId, this.resolveProjectRevisionStatus(message));
    }

    if (latestStatusByProjectId.size === 0) return;

    this.messages = this.messages.map((message) => {
      if (!message.isProjectRevisionRequest) return message;
      const projectId = this.resolveRevisionProjectId(message);
      const status = projectId === null ? null : latestStatusByProjectId.get(projectId);
      if (!status || this.resolveProjectRevisionStatus(message) === status) return message;

      return {
        ...message,
        projectRevisionStatus: status,
        hireRequestDetails: {
          ...(message.hireRequestDetails ?? {}),
          status,
        },
      };
    });
  }

  getProjectDeliveryValue(message: MessageItem, key: string): string {
    return this.pickDisplayString(message.hireRequestDetails ?? {}, [key]) ?? 'Not set';
  }

  getDeliveryDownloadLabel(message: MessageItem): string {
    const fileName = this.pickString(message.hireRequestDetails ?? {}, ['deliveryFileName']);
    if (!fileName) {
      return 'Download delivery file';
    }

    return fileName.toLowerCase().endsWith('.zip')
      ? `Download source ZIP (${fileName})`
      : fileName;
  }

  canReviewDelivery(message: MessageItem): boolean {
    const status = this.resolveProjectDeliveryStatus(message);
    return (
      message.isProjectDelivery === true &&
      !this.isProjectDeliveryAccepted(message) &&
      status !== 'REVISION_REQUESTED'
    );
  }

  canPayForCompletedDelivery(message: MessageItem): boolean {
    return (
      message.isProjectDelivery === true &&
      !this.isProjectDeliveryAccepted(message) &&
      this.resolveProjectDeliveryStatus(message) === 'COMPLETED' &&
      !this.isDeliveryProjectCompleted(message)
    );
  }

  downloadProjectDelivery(message: MessageItem): void {
    const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    if (!projectId) {
      this.error = 'Unable to download delivery file because project id is missing.';
      return;
    }

    this.chatService.downloadProjectDeliveryFile(projectId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.triggerAttachmentDownload(
          url,
          this.pickString(message.hireRequestDetails ?? {}, ['deliveryFileName']) ?? 'delivery-file',
        );
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => {
        this.error = 'Unable to download delivery file right now.';
        this.cdr.detectChanges();
      },
    });
  }

  acceptProjectDelivery(message: MessageItem): void {
    const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    if (!projectId) {
      this.error = 'Unable to accept delivery because project id is missing.';
      return;
    }

    this.chatService.approveProjectDelivery(projectId).subscribe({
      next: () => {
        this.markDeliveryProjectCompleted(projectId);
        this.cdr.detectChanges();
        this.openPaymentForCompletedDelivery(message);
      },
      error: () => {
        this.error = 'Unable to accept delivery right now.';
        this.cdr.detectChanges();
      },
    });
  }

  private resolveProjectDeliveryStatus(message: MessageItem): string {
    if (this.isDeliveryProjectCompleted(message)) {
      return 'COMPLETED';
    }

    return String(message.projectDeliveryStatus ?? message.hireRequestDetails?.['status'] ?? 'DELIVERED')
      .trim()
      .toUpperCase();
  }

  getProjectDeliveryStatusLabel(message: MessageItem): string {
    return this.resolveProjectDeliveryStatus(message).replace(/_/g, ' ').toLowerCase();
  }

  private isProjectDeliveryAccepted(message: MessageItem): boolean {
    const status = this.resolveProjectDeliveryStatus(message);
    return status === 'ACCEPTED' || status === 'COMPLETED' || status === 'PAID';
  }

  private isDeliveryProjectCompleted(message: MessageItem): boolean {
    const projectId = this.resolveDeliveryProjectId(message);
    if (!projectId) {
      return false;
    }

    if (this.completedDeliveryProjectIds.has(projectId)) {
      return true;
    }

    const matchedRequest = this.hireRequests.find((request) => request.projectId === projectId);
    return this.normalizeStatus(matchedRequest?.projectStatus) === 'completed';
  }

  private resolveDeliveryProjectId(message: MessageItem): number | null {
    const explicitProjectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    if (explicitProjectId !== null) {
      return explicitProjectId;
    }

    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['hireRequestId'] ??
        message.hireRequestDetails?.['id'],
    );

    if (requestId !== null) {
      const matchedRequest = this.hireRequests.find((request) => request.id === requestId);
      const requestProjectId = this.toNullableNumber(matchedRequest?.projectId);
      if (requestProjectId !== null) {
        return requestProjectId;
      }
    }

    const chatProjectId = this.toNullableNumber(this.selectedChat?.projectId);
    return chatProjectId;
  }

  private markDeliveryProjectCompleted(projectId: number): void {
    this.completedDeliveryProjectIds.add(projectId);
    this.messages = this.messages.map((item) => {
      const itemProjectId = this.resolveDeliveryProjectId(item);
      if (!item.isProjectDelivery || itemProjectId !== projectId) {
        return item;
      }

      return {
        ...item,
        projectDeliveryStatus: 'COMPLETED',
        hireRequestDetails: {
          ...(item.hireRequestDetails ?? {}),
          status: 'COMPLETED',
        },
      };
    });
  }

  private syncCompletedDeliveryProjectsFromServer(): void {
    const completedProjectIds: number[] = [];

    for (const request of this.hireRequests) {
      if (
        request.projectId !== undefined &&
        this.normalizeStatus(request.projectStatus) === 'completed'
      ) {
        this.completedDeliveryProjectIds.add(request.projectId);
        completedProjectIds.push(request.projectId);
      }
    }

    for (const projectId of completedProjectIds) {
      this.markDeliveryProjectCompleted(projectId);
    }
  }

  private syncCompletedDeliveryProjectsFromProjects(projects: ProjectResponse[]): void {
    for (const project of projects) {
      const projectId = this.toNullableNumber(project.id);
      if (projectId !== null && this.normalizeStatus(project.status) === 'completed') {
        this.markDeliveryProjectCompleted(projectId);
      }
    }

    this.cdr.detectChanges();
  }

  private normalizeStatus(status?: string): string {
    return String(status ?? '').trim().toLowerCase().replace(/-/g, '_');
  }

  requestProjectAdjustment(message: MessageItem): void {
    const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    if (!projectId) {
      this.error = 'Unable to request adjustment because project id is missing.';
      return;
    }

    const revisionMessage = window.prompt('What needs adjustment?')?.trim();
    if (!revisionMessage) return;

    this.chatService.requestProjectRevision(projectId, revisionMessage).subscribe({
      next: (project) => {
        message.projectDeliveryStatus = 'REVISION_REQUESTED';
        if (message.hireRequestDetails) {
          message.hireRequestDetails['status'] = 'REVISION_REQUESTED';
          message.hireRequestDetails['revisionMessage'] = revisionMessage;
        }

        const chat = this.selectedChat;
        if (chat) {
          chat.preview = 'Revision requested';
          chat.time = 'Now';
        }

        const receiverId = this.resolveSelectedChatReceiverId();
        if (!chat || receiverId === null) {
          this.error = 'Revision was requested, but the freelancer chat card could not be sent because receiver data is missing.';
          this.cdr.detectChanges();
          return;
        }

        if (chat) {
          const content = JSON.stringify({
            type: 'project_revision_request',
            messageType: 'project_revision_request',
            projectId: project.id ?? projectId,
            projectTitle: project.projectTitle ?? chat.project,
            gigId: project.gigId ?? chat.gigId,
            agreedPrice: project.agreedPrice,
            revisionMessage,
            status: 'REVISION_REQUESTED',
            text: `Revision requested: ${revisionMessage}`,
          });

          this.chatService
            .sendRoomMessage(chat.roomId, {
              receiverId,
              content,
            })
            .subscribe({
              next: (response) => {
                const mapped = this.mapIncomingMessage(response);
                this.messages = this.upsertMessage(this.messages, mapped);
                this.updateConversationPreview(String(chat.roomId), mapped.text, mapped.time);
                this.scrollToLatestMessage();
                this.cdr.detectChanges();
              },
              error: () => {
                this.error = 'Revision was requested, but the freelancer chat card could not be sent.';
                this.cdr.detectChanges();
              },
            });
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to request adjustment right now.';
        this.cdr.detectChanges();
      },
    });
  }

  private resolveSelectedChatReceiverId(): number | null {
    return this.toNullableNumber(this.selectedChat?.otherUserId);
  }

  private resolveConversationProjectTitle(item: ConversationResponse): string {
    const lastMessage = item.lastMessage ?? '';
    const parsed = this.parseJsonPayload(lastMessage);
    const nested = parsed ? this.getNestedJsonPayload(parsed) : null;
    const source = { ...(nested ?? {}), ...(parsed ?? {}) };

    return (
      this.pickDisplayString({ projectTitle: item.projectTitle }, ['projectTitle']) ??
      this.pickDisplayString(source, ['gigTitle', 'projectTitle', 'title']) ??
      (item.gigId ? `Project #${item.gigId}` : 'Project chat')
    );
  }

  private normalizeHireRequestText(
    details: Record<string, unknown> | null | undefined,
    fallbackText: string,
  ): string {
    const source = details ?? {};
    const requestMessage = this.pickString(source, [
      'requestMessage',
      'message',
      'content',
      'text',
    ]);
    if (requestMessage) {
      return requestMessage;
    }

    const gigTitle = this.pickString(source, ['gigTitle', 'projectTitle']);
    const agreedPrice = this.pickString(source, ['agreedPrice']);
    const pricePending = this.pickString(source, ['pricePending']);
    const requirements = this.pickString(source, ['requirements']);

    const parts: string[] = [gigTitle ? `Hire request for ${gigTitle}` : 'Hire request'];
    if (agreedPrice) {
      parts.push(`Agreed price: ${agreedPrice}`);
    } else if (pricePending) {
      parts.push(`Price pending: ${pricePending}`);
    }
    if (requirements) {
      parts.push(`Requirements: ${requirements}`);
    }

    return parts.length > 0 ? parts.join(' • ') : fallbackText;
  }

  private parseJsonPayload(text: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private parsePriceProposalMessage(
    content?: unknown,
  ): Pick<
    MessageItem,
    | 'isPriceProposal'
    | 'hireRequestId'
    | 'hireRequestDetails'
    | 'priceProposalStatus'
    | 'priceProposalAmount'
  > {
    const parsed =
      typeof content === 'string'
        ? this.parseJsonPayload(content)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : null;

    if (!parsed && typeof content === 'string') {
      const match = /^Price proposal:\s*\$?([0-9]+(?:\.[0-9]+)?)/i.exec(content.trim());
      if (!match) {
        return {};
      }

      const amount = this.toNullableNumber(match[1]);
      return {
        isPriceProposal: true,
        hireRequestId: null,
        priceProposalAmount: amount,
        priceProposalStatus: 'pending',
        hireRequestDetails: {
          type: 'price_proposal',
          pricePending: amount,
          text: `New price proposal: $${amount ?? ''}`,
        },
      };
    }

    if (!parsed) {
      return {};
    }

    const nested = this.getNestedJsonPayload(parsed);
    const source = { ...(nested ?? {}), ...parsed };
    const type = this.pickString(source, ['type', 'messageType'])?.toLowerCase();
    if (!this.isPriceMessageType(type)) {
      return {};
    }

    const amount = this.toNullableNumber(
      source['pricePending'] ?? source['agreedPrice'] ?? source['price'] ?? source['amount'],
    );
    const status =
      this.pickString(source, ['status']) ??
      (type === 'price_agreement' || type === 'price_notice'
        ? 'accepted'
        : type === 'price_rejected'
          ? 'rejected'
          : 'pending');

    return {
      isPriceProposal: true,
      hireRequestId: this.toNullableNumber(source['requestId'] ?? source['hireRequestId']),
      priceProposalAmount: amount,
      priceProposalStatus: status,
      hireRequestDetails: {
        ...source,
        gigTitle:
          this.pickDisplayString(parsed, ['gigTitle', 'projectTitle', 'title']) ??
          this.pickDisplayString(nested ?? {}, ['gigTitle', 'projectTitle', 'title']) ??
          undefined,
        pricePending: type === 'price_proposal' ? amount : null,
        agreedPrice:
          type === 'price_agreement' || type === 'price_notice' ? amount : source['agreedPrice'],
        text:
          this.pickDisplayString(source, ['text']) ??
          (type === 'price_proposal'
            ? `New price proposal: $${amount ?? ''}`
            : type === 'price_rejected'
              ? `Price proposal rejected${amount ? `: $${amount}` : ''}`
              : `Price accepted: $${amount ?? ''}`),
      },
    };
  }

  private isPriceMessageType(value: unknown): boolean {
    const type = typeof value === 'string' ? value.toLowerCase() : '';
    return (
      type === 'price_proposal' ||
      type === 'price_agreement' ||
      type === 'price_notice' ||
      type === 'price_rejected'
    );
  }

  private getNestedJsonPayload(source: Record<string, unknown>): Record<string, unknown> | null {
    for (const key of ['message', 'payload', 'details', 'content']) {
      const value = source[key];
      if (typeof value !== 'string') continue;
      const parsed = this.parseJsonPayload(value);
      if (parsed) return parsed;
    }

    return null;
  }

  acceptHireRequest(message: MessageItem): void {
    const requestId = Number(
      message.hireRequestDetails?.['requestId'] ?? message.hireRequestDetails?.['id'],
    );
    if (!Number.isFinite(requestId)) return;

    this.chatService.acceptHireRequest(requestId).subscribe({
      next: () => {
        message.hireRequestStatus = 'accepted';
        if (message.hireRequestDetails) {
          message.hireRequestDetails = {
            ...message.hireRequestDetails,
            status: 'accepted',
          };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to accept the hire request right now.';
        this.cdr.detectChanges();
      },
    });
  }

  cancelHireRequest(message: MessageItem): void {
    const requestId =
      message.formalNoticeRequestId ??
      message.hireRequestId ??
      this.toNullableNumber(
        message.hireRequestDetails?.['requestId'] ?? message.hireRequestDetails?.['id'],
      );

    if (!requestId) {
      this.error = 'Unable to cancel this request because the request id is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.chatService.cancelHireRequest(requestId).subscribe({
      next: () => {
        message.hireRequestStatus = 'cancelled';
        if (message.hireRequestDetails) {
          message.hireRequestDetails = {
            ...message.hireRequestDetails,
            status: 'cancelled',
            requestId,
          };
        }

        this.messages = this.messages.map((item) => ({ ...item }));
        this.loadConversations();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to cancel the request. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  rejectHireRequest(message: MessageItem): void {
    const requestId = Number(
      message.hireRequestDetails?.['requestId'] ?? message.hireRequestDetails?.['id'],
    );
    if (!Number.isFinite(requestId)) return;

    this.chatService.rejectHireRequest(requestId).subscribe({
      next: () => {
        message.hireRequestStatus = 'rejected';
        if (message.hireRequestDetails) {
          message.hireRequestDetails = {
            ...message.hireRequestDetails,
            status: 'rejected',
          };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to reject the hire request right now.';
        this.cdr.detectChanges();
      },
    });
  }

  private parseHireRequestMessage(
    content?: string,
  ): Pick<
    MessageItem,
    'isHireRequest' | 'hireRequestId' | 'hireRequestDetails' | 'hireRequestStatus'
  > {
    if (!content) {
      return {};
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && parsed['type'] === 'hire_request') {
        return {
          isHireRequest: true,
          hireRequestId: this.toNullableNumber(parsed['requestId'] ?? parsed['id']),
          hireRequestDetails: parsed,
          hireRequestStatus: String(parsed['status'] ?? 'pending'),
        };
      }
    } catch {
      // plain text message
    }

    const legacy = this.parseLegacyHireRequestMessage(content);
    if (legacy) {
      return legacy;
    }

    return {};
  }

  private parseLegacyHireRequestMessage(
    content: string,
  ): Pick<
    MessageItem,
    'isHireRequest' | 'hireRequestId' | 'hireRequestDetails' | 'hireRequestStatus'
  > | null {
    const trimmed = content.trim();
    if (!trimmed.toLowerCase().startsWith('new hire request for gig:')) {
      return null;
    }

    const legacyMatch =
      /^New hire request for gig:\s*(.*?)\s*Message:\s*(.*?)\s*Requirements:\s*(.*?)\s*Agreed price:\s*(.*)$/is.exec(
        trimmed,
      );

    if (!legacyMatch) {
      return {
        isHireRequest: true,
        hireRequestId: null,
        hireRequestDetails: {
          type: 'hire_request',
          messageType: 'hire_request',
          gigTitle: trimmed.replace(/^New hire request for gig:\s*/i, '').trim(),
          status: 'pending',
        },
        hireRequestStatus: 'pending',
      };
    }

    return {
      isHireRequest: true,
      hireRequestId: null,
      hireRequestDetails: {
        type: 'hire_request',
        messageType: 'hire_request',
        gigTitle: legacyMatch[1].trim(),
        requestMessage: legacyMatch[2].trim(),
        requirements: legacyMatch[3].trim(),
        pricePending: legacyMatch[4].trim(),
        status: 'pending',
      },
      hireRequestStatus: 'pending',
    };
  }

  private toNullableNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private pickDisplayString(source: Record<string, unknown>, keys: string[]): string | null {
    const value = this.pickString(source, keys);
    if (!value) return null;

    const trimmed = value.trim();
    if (
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed.includes('"type"') ||
      trimmed.includes('"messageType"')
    ) {
      return null;
    }

    return trimmed;
  }

  normalizeChatProject(value: unknown): string {
    if (!value && value !== 0) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // if JSON-looking string, try parse
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.summarizeProjectParsed(parsed);
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    if (typeof value === 'object' && value !== null) {
      return this.summarizeProjectParsed(value as Record<string, unknown>);
    }

    return String(value);
  }

  private summarizeProjectParsed(obj: Record<string, unknown>): string {
    const title = this.pickString(obj, ['gigTitle', 'projectTitle', 'title']) ?? '';
    const budget = this.pickString(obj, ['agreedPrice', 'pricePending', 'budget', 'price']) ?? '';
    const parts: string[] = [];
    if (title) parts.push(title);
    if (budget) parts.push(`Budget: ${budget}`);
    return parts.join(' • ') || JSON.stringify(obj);
  }

  private getCurrentUserIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decoded = atob(padded);
      const claims = JSON.parse(
        decodeURIComponent(
          decoded
            .split('')
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(''),
        ),
      ) as Record<string, unknown>;

      const candidate = claims['sub'] ?? claims['userId'] ?? claims['id'] ?? null;
      if (candidate === null || candidate === undefined) return null;
      const num = Number(candidate);
      return Number.isFinite(num) ? num : null;
    } catch {
      return null;
    }
  }

  private getCurrentUserEmailFromToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decoded = atob(padded);
      const claims = JSON.parse(
        decodeURIComponent(
          decoded
            .split('')
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(''),
        ),
      ) as Record<string, unknown>;

      const email = claims['sub'];
      return typeof email === 'string' && email.trim().length > 0
        ? email.trim().toLowerCase()
        : null;
    } catch {
      return null;
    }
  }
}

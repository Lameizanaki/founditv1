import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of, switchMap } from 'rxjs';
import {
  ClipboardList,
  DollarSign,
  FileUp,
  LucideAngularModule,
  Paperclip,
  UserRound,
} from 'lucide-angular';
import { env } from '../../../../environments/env';
import {
  ChatMessageResponse,
  ChatService,
  HireRequestResponse,
  ProjectResponse,
} from '../../../services/chat/chat.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { SettingService } from '../../../services/Freelancer/Setting/setting.service';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';

type ConversationItem = {
  id: string;
  roomId: number | string;
  roomKey?: string;
  otherUserId?: number | string | null;
  otherClientId?: number | null;
  hireRequestId?: number | null;
  projectId?: number | null;
  gigId?: number | null;
  name: string;
  project: string;
  preview: string;
  time: string;
  lastMessageAt?: unknown;
  online: boolean;
  unreadCount: number;
  avatar?: string;
  initial: string;
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
  isRead?: boolean;
  avatar?: string;
  initial: string;
  senderEmail?: string;
  // hire request metadata (if message represents a hire request)
  isHireRequest?: boolean;
  isFormalNotice?: boolean;
  isPriceProposal?: boolean;
  isProjectRequirementProposal?: boolean;
  isProjectDelivery?: boolean;
  isProjectRevisionRequest?: boolean;
  projectRequirementProposalStatus?: string | null;
  projectDeliveryStatus?: string | null;
  projectRevisionStatus?: string | null;
  projectRequirementProposalId?: number | null;
  formalNoticeStatus?: 'accepted' | 'rejected' | null;
  formalNoticeProjectId?: number | null;
  priceProposalStatus?: 'pending' | 'accepted' | 'rejected' | string | null;
  priceProposalAmount?: number | null;
  hireRequestId?: number | null;
  hireRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | null;
  hireRequestDetails?: Record<string, unknown> | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentData?: string | null;
  attachmentUrl?: string | null;
};

@Component({
  selector: 'app-messages',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('messagesScroll') private messagesScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('attachmentInput') private attachmentInput?: ElementRef<HTMLInputElement>;

  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private freelancerProfileService = inject(FreelancerProfileService);
  private settingService = inject(SettingService);
  private clientProfileService = inject(ProfileService);
  private apiUrl = env.apiUrl;
  private readonly maxDeliverySourceSizeBytes = 500 * 1024 * 1024;

  selectedChatId: string | null = null;
  loadingConversations = true;
  loadingMessages = false;
  errorMessage = '';
  searchTerm = '';
  draftMessage = '';
  showAttachMenu = false;
  selectedAttachment: File | null = null;
  priceDraft = '';
  showDeliveryForm = false;
  savingDelivery = false;
  deliveryForm = {
    deliveryMessage: '',
    deliveryFile: null as File | null,
  };
  private readonly priceActionMessageIds = new Set<string>();
  conversations: ConversationItem[] = [];
  messages: MessageItem[] = [];
  private hireRequests: HireRequestResponse[] = [];
  private completedDeliveryProjectIds = new Set<number>();
  private currentUserId: number | null = null;
  private currentUserEmail: string | null = null;
  private currentUserAvatar?: string;
  private refreshHandle: ReturnType<typeof setInterval> | null = null;
  private realtimeSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private localHireRequestStatuses = new Map<
    number,
    'pending' | 'accepted' | 'rejected' | 'cancelled'
  >();
  readonly icons = {
    ClipboardList,
    DollarSign,
    FileUp,
    Paperclip,
    UserRound,
  };

  ngOnInit(): void {
    this.currentUserId = this.getCurrentUserId();
    this.currentUserEmail = this.getCurrentUserEmail();
    this.chatService.startRealtimeConnection();
    this.loadCurrentFreelancerProfile();
    this.routeSubscription = this.route.paramMap.subscribe(() => {
      this.loadConversations();
    });
    this.refreshHandle = setInterval(() => {
      this.loadConversations();
      this.loadHireRequests();
    }, 5000);
    this.loadHireRequests();
    this.realtimeSubscription = this.chatService.incomingMessages$.subscribe((message) => {
      const incomingRoomId =
        message.roomId !== undefined && message.roomId !== null ? String(message.roomId) : null;
      if (!incomingRoomId) {
        this.loadConversations();
        return;
      }

      const selectedConversation = this.selectedChat;
      const selectedRoomId = selectedConversation ? String(selectedConversation.roomId) : null;
      const knownConversation = this.conversations.some(
        (conversation) => String(conversation.roomId) === incomingRoomId,
      );
      const mapped = this.mapMessage(message, this.messages.length);

      if (selectedRoomId !== null && incomingRoomId === selectedRoomId) {
        this.messages = this.upsertMessage(this.messages, mapped);
        this.resolvePendingHireRequestMetadata();
        this.applyLocalHireRequestStatuses();
        this.syncPriceProposalStatusesFromServer();
        this.syncProjectRequirementProposalStatuses();
        this.syncCompletedDeliveryProjectsFromServer();
        this.scrollToLatestMessage();
      }

      this.updateConversationPreview(
        incomingRoomId,
        this.getMessageDisplayText(mapped),
        mapped.time,
      );

      if (!knownConversation) {
        this.loadConversations();
        return;
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshHandle !== null) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }

    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;
    this.routeSubscription?.unsubscribe();
    this.routeSubscription = null;
  }

  get filteredConversations(): ConversationItem[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    if (!keyword) {
      return this.conversations;
    }

    return this.conversations.filter((conversation) => {
      return [conversation.name, conversation.project, conversation.preview]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }

  get selectedChat(): ConversationItem | null {
    return (
      this.conversations.find((conversation) => conversation.id === this.selectedChatId) ?? null
    );
  }

  get isDirectRoomRoute(): boolean {
    return Boolean(this.route.snapshot.paramMap.get('roomId'));
  }

  selectChat(chat: ConversationItem): void {
    this.selectedChatId = chat.id;
    this.chatService.watchRoom(chat.roomId);
    this.updateSelectedRoomRoute(chat.roomId);
    this.loadMessages(chat.roomId);
  }

  get canSendMessage(): boolean {
    return Boolean(this.draftMessage.trim() || this.selectedAttachment);
  }

  trackByConversationId(_: number, chat: ConversationItem): string {
    return chat.id;
  }

  trackByMessageId(_: number, message: MessageItem): string {
    return message.id;
  }

  private loadConversations(): void {
    this.loadingConversations = true;
    this.errorMessage = '';
    const previousSelectedChatId = this.selectedChatId;

    this.http
      .get<unknown>(`${this.apiUrl}/api/chat/conversations`)
      .pipe(
        catchError(() => {
          this.errorMessage = 'Unable to load your conversations right now.';
          return of([]);
        }),
        finalize(() => {
          setTimeout(() => {
            this.loadingConversations = false;
          });
        }),
      )
      .subscribe((payload) => {
        this.conversations = this.unwrapArray(payload)
          .map((item, index) => this.mapConversation(item, index))
          .sort((a, b) => this.getConversationTimeValue(b) - this.getConversationTimeValue(a));
        this.loadMissingClientAvatars();
        this.conversations.forEach((conversation) =>
          this.chatService.watchRoom(conversation.roomId),
        );

        const preferredRoomId = this.route.snapshot.paramMap.get('roomId');
        const currentlySelectedConversation = this.selectedChatId
          ? this.conversations.find((conversation) => conversation.id === this.selectedChatId)
          : null;
        const routedConversation = preferredRoomId
          ? this.conversations.find(
              (conversation) => String(conversation.roomId) === preferredRoomId,
            )
          : null;

        const nextConversation =
          routedConversation ??
          (preferredRoomId ? currentlySelectedConversation : this.conversations[0]) ??
          currentlySelectedConversation ??
          null;

        if (nextConversation) {
          this.selectedChatId = nextConversation.id;
          if (!preferredRoomId) {
            this.updateSelectedRoomRoute(nextConversation.roomId, true);
          }
          if (previousSelectedChatId !== nextConversation.id || !preferredRoomId) {
            this.loadMessages(nextConversation.roomId);
          }
        } else if (!this.selectedChatId) {
          this.messages = [];
          this.cdr.detectChanges();
        }
        this.cdr.detectChanges();
      });
  }

  private loadMessages(roomId: number | string): void {
    this.chatService.watchRoom(roomId);
    this.loadingMessages = true;
    this.errorMessage = '';

    this.http
      .get<unknown>(`${this.apiUrl}/api/chat/rooms/${roomId}/messages`)
      .pipe(
        catchError(() => {
          this.errorMessage = 'Unable to load messages for this room.';
          return of([]);
        }),
      )
      .subscribe((payload) => {
        this.messages = this.unwrapArray(payload).map((item, index) =>
          this.mapMessage(item, index),
        );
        this.resolvePendingHireRequestMetadata();
        this.applyLocalHireRequestStatuses();
        this.syncPriceProposalStatusesFromServer();
        this.syncProjectRequirementProposalStatuses();
        this.syncCompletedDeliveryProjectsFromServer();
        this.loadingMessages = false;
        this.cdr.detectChanges();
        this.scrollToLatestMessage();
      });
  }

  private loadHireRequests(): void {
    this.chatService.getMyHireRequests().subscribe({
      next: (requests) => {
        this.hireRequests = requests ?? [];
        for (const request of this.hireRequests) {
          if (request.id !== undefined && request.id !== null) {
            this.localHireRequestStatuses.set(request.id, request.status);
          }
        }
        this.resolvePendingHireRequestMetadata();
        this.applyLocalHireRequestStatuses();
        this.syncPriceProposalStatusesFromServer();
        this.syncCompletedDeliveryProjectsFromServer();
        this.cdr.detectChanges();
      },
      error: () => {
        this.hireRequests = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadCurrentFreelancerProfile(): void {
    this.freelancerProfileService.getMyProfile().subscribe({
      next: (profile) => {
        const record = this.toRecord(profile);
        this.currentUserAvatar = this.resolveAvatar(
          this.pickValue(record, [
            'profilePictureData',
            'avatarProfileData',
            'avatar',
            'avatarUrl',
            'profileImage',
            'image',
            'photo',
          ]),
          this.pickString(record, ['profilePictureType', 'avatarProfileType']),
        );

        if (!this.currentUserAvatar) {
          this.loadCurrentFreelancerSettingAvatar();
          return;
        }

        this.applyCurrentUserAvatar();
      },
      error: () => {
        this.currentUserAvatar = undefined;
        this.loadCurrentFreelancerSettingAvatar();
      },
    });
  }

  private loadCurrentFreelancerSettingAvatar(): void {
    this.settingService.getMySetting().subscribe({
      next: (setting) => {
        const record = this.toRecord(setting);
        this.currentUserAvatar = this.resolveAvatar(
          this.pickValue(record, [
            'avatarProfileData',
            'profilePictureData',
            'avatar',
            'avatarUrl',
          ]),
          this.pickString(record, ['avatarProfileType', 'profilePictureType']),
        );

        if (this.currentUserAvatar) {
          this.applyCurrentUserAvatar();
        }
      },
      error: () => {
        this.currentUserAvatar = undefined;
      },
    });
  }

  private applyCurrentUserAvatar(): void {
    this.messages = this.messages.map((message) =>
      message.isMine ? { ...message, avatar: this.currentUserAvatar } : message,
    );
    this.cdr.detectChanges();
  }

  private loadMissingClientAvatars(): void {
    for (const conversation of this.conversations) {
      if (conversation.avatar || !conversation.otherClientId) {
        continue;
      }

      this.clientProfileService.getFreelancerViewProfile(conversation.otherClientId).subscribe({
        next: (profile) => {
          const record = this.toRecord(profile);
          const avatar = this.resolveAvatar(
            this.pickValue(record, [
              'profilePictureData',
              'avatar',
              'avatarUrl',
              'profileImage',
              'image',
              'photo',
            ]),
            this.pickString(record, ['profilePictureType', 'avatarProfileType']),
          );

          if (avatar) {
            this.applyConversationAvatar(conversation.id, avatar);
          }
        },
        error: () => {
          // The initial conversation payload still provides name/initial fallback.
        },
      });
    }
  }

  private applyConversationAvatar(conversationId: string, avatar: string): void {
    this.conversations = this.conversations.map((conversation) =>
      conversation.id === conversationId ? { ...conversation, avatar } : conversation,
    );

    if (this.selectedChatId === conversationId) {
      this.messages = this.messages.map((message) =>
        !message.isMine && !message.avatar ? { ...message, avatar } : message,
      );
    }

    this.cdr.detectChanges();
  }

  private scrollToLatestMessage(): void {
    this.scrollMessagesToBottom();
    setTimeout(() => this.scrollMessagesToBottom(), 0);
    setTimeout(() => this.scrollMessagesToBottom(), 75);
    setTimeout(() => this.scrollMessagesToBottom(), 200);
  }

  private scrollMessagesToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.messagesScroll?.nativeElement;
      if (!element) return;

      element.scrollTop = element.scrollHeight;
    });
  }

  private mapConversation(raw: unknown, index: number): ConversationItem {
    const record = this.toRecord(raw);
    const roomIdValue = this.pickValue(record, ['roomId', 'chatRoomId', 'conversationId', 'id']);
    const roomId =
      typeof roomIdValue === 'string' || typeof roomIdValue === 'number' ? roomIdValue : index + 1;
    const name =
      this.pickString(record, [
        'otherUsername',
        'freelancerName',
        'clientName',
        'partnerName',
        'name',
        'title',
      ]) ?? 'Conversation';
    const project =
      this.pickString(record, [
        'projectTitle',
        'projectName',
        'project',
        'gigTitle',
        'serviceTitle',
        'subject',
      ]) ?? 'Freelance chat';
    const preview = this.normalizeMessagePreview(
      this.pickString(record, ['lastMessage', 'preview', 'latestMessage', 'messagePreview']) ??
        'No messages yet',
    );
    const otherUserId = this.pickValue(record, ['otherUserId', 'otherId', 'participantId']);
    const otherClientId = this.pickNumber(record, ['otherClientId', 'clientId']);
    const roomKey = this.pickString(record, ['roomKey']) ?? undefined;
    const lastMessageAt = this.pickValue(record, [
      'lastMessageTime',
      'lastMessageAt',
      'updatedAt',
      'createdAt',
      'time',
      'timestamp',
    ]);

    return {
      id: String(roomId),
      roomId,
      roomKey,
      otherUserId:
        typeof otherUserId === 'string' || typeof otherUserId === 'number' ? otherUserId : null,
      otherClientId,
      hireRequestId: this.pickNumber(record, ['hireRequestId']),
      projectId: this.pickNumber(record, ['projectId']),
      gigId: this.pickNumber(record, ['gigId']),
      name,
      project,
      preview,
      time: this.formatTime(lastMessageAt),
      lastMessageAt,
      online: this.pickBoolean(record, ['online', 'isOnline', 'active', 'isActive']),
      unreadCount: this.pickNumber(record, ['unreadCount', 'unreadMessages', 'unread']) ?? 0,
      avatar: this.resolveAvatar(
        this.pickValue(record, [
          'avatar',
          'avatarUrl',
          'otherProfilePictureData',
          'profilePictureData',
          'profilePictureUrl',
          'image',
          'photo',
        ]),
        this.pickString(record, ['otherProfilePictureType', 'profilePictureType']),
      ),
      initial: this.buildInitial(name),
    };
  }

  private mapMessage(raw: unknown, index: number): MessageItem {
    const record = this.toRecord(raw);
    const senderName =
      this.pickString(record, ['senderName', 'name', 'authorName', 'fullName', 'username']) ??
      'User';
    const textValue = this.pickValue(record, ['content', 'message', 'text', 'body', 'details']);
    const text =
      typeof textValue === 'string'
        ? textValue
        : textValue && typeof textValue === 'object'
          ? JSON.stringify(textValue)
          : (this.pickString(record, ['content', 'message', 'text', 'body', 'details']) ??
            'Message');
    const senderId = this.pickNumber(record, ['senderId', 'fromId', 'userId']);
    const receiverId = this.pickNumber(record, ['receiverId', 'toId']);
    const senderEmail = this.pickString(record, ['senderEmail', 'email', 'fromEmail']);
    const isRead = this.pickBoolean(record, ['isRead', 'read']);

    const numericSenderId = typeof senderId === 'number' ? senderId : null;
    const isMine = this.isCurrentUserMessage({
      senderId: numericSenderId ?? undefined,
      senderEmail: senderEmail ?? undefined,
    });
    let isHireRequest = false;
    let hireRequestId: number | null = null;
    let hireRequestStatus: 'pending' | 'accepted' | 'rejected' | 'cancelled' | null = null;
    let hireRequestDetails: Record<string, unknown> | null = null;
    let isFormalNotice = false;
    let isPriceProposal = false;
    let isProjectRequirementProposal = false;
    let isProjectDelivery = false;
    let isProjectRevisionRequest = false;
    let projectRequirementProposalStatus: string | null = null;
    let projectDeliveryStatus: string | null = null;
    let projectRevisionStatus: string | null = null;
    let projectRequirementProposalId: number | null = null;
    let formalNoticeStatus: 'accepted' | 'rejected' | null = null;
    let formalNoticeProjectId: number | null = null;
    let priceProposalStatus: 'pending' | 'accepted' | 'rejected' | string | null = null;
    let priceProposalAmount: number | null = null;

    const parsedPayload = this.parseJsonPayload(text);
    const formalNotice = this.parseFormalHireRequestNotice(parsedPayload ?? text);
    const priceMessage = this.parsePriceProposalMessage(parsedPayload ?? text);
    if (formalNotice) {
      isFormalNotice = true;
      formalNoticeStatus = formalNotice.status;
      formalNoticeProjectId = formalNotice.projectId;
      hireRequestId = formalNotice.requestId;
      hireRequestStatus = formalNotice.status;
      hireRequestDetails = {
        type: 'formal_notice',
        requestId: formalNotice.requestId,
        projectId: formalNotice.projectId,
        gigId: formalNotice.gigId,
        gigTitle: formalNotice.gigTitle,
        status: formalNotice.status,
      };
    } else if (parsedPayload && this.isProjectRequirementProposalPayload(parsedPayload)) {
      isProjectRequirementProposal = true;
      hireRequestDetails = parsedPayload;
      projectRequirementProposalId = this.toNullableNumber(parsedPayload['proposalId']);
      projectRequirementProposalStatus = this.pickString(parsedPayload, ['status']) ?? 'PENDING';
    } else if (parsedPayload && this.isProjectDeliveryPayload(parsedPayload)) {
      isProjectDelivery = true;
      hireRequestDetails = parsedPayload;
      projectDeliveryStatus = this.pickString(parsedPayload, ['status']) ?? 'DELIVERED';
    } else if (parsedPayload && this.isProjectRevisionRequestPayload(parsedPayload)) {
      isProjectRevisionRequest = true;
      hireRequestDetails = parsedPayload;
      projectRevisionStatus = this.pickString(parsedPayload, ['status']) ?? 'REVISION_REQUESTED';
    } else if (priceMessage) {
      isPriceProposal = true;
      hireRequestId = priceMessage.requestId;
      priceProposalStatus = priceMessage.status;
      priceProposalAmount = priceMessage.amount;
      hireRequestDetails = priceMessage.details;
    } else if (parsedPayload && this.isHireRequestPayload(parsedPayload)) {
      isHireRequest = true;
      hireRequestId = this.pickNumber(parsedPayload, ['requestId', 'hireRequestId', 'id']) ?? null;
      hireRequestStatus =
        (this.pickString(parsedPayload, ['status', 'requestStatus']) as
          | 'pending'
          | 'accepted'
          | 'rejected'
          | 'cancelled'
          | null) ?? 'pending';
      hireRequestDetails = parsedPayload;
    } else {
      const legacyPayload = this.parseLegacyHireRequestPayload(text);
      if (legacyPayload) {
        isHireRequest = true;
        hireRequestDetails = legacyPayload;
        hireRequestStatus =
          (this.pickString(legacyPayload, ['status', 'requestStatus']) as
            | 'pending'
            | 'accepted'
            | 'rejected'
            | 'cancelled'
            | null) ?? 'pending';
      }
    }

    return {
      id: String(this.pickValue(record, ['id', 'messageId', 'chatMessageId']) ?? index + 1),
      roomId: ((): string | number | undefined => {
        const v = this.pickValue(record, ['roomId', 'chatRoomId', 'conversationId']);
        return typeof v === 'string' || typeof v === 'number' ? v : undefined;
      })(),
      senderId: numericSenderId ?? undefined,
      receiverId: typeof receiverId === 'number' ? receiverId : undefined,
      senderName,
      senderEmail: senderEmail ?? undefined,
      text: formalNotice?.text ?? priceMessage?.text ?? text,
      time: this.formatTime(
        this.pickValue(record, ['sentAt', 'createdAt', 'timestamp', 'time', 'createdDate']),
      ),
      isMine,
      isRead: isRead ?? undefined,
      avatar: isMine
        ? this.currentUserAvatar
        : (this.resolveAvatar(
            this.pickValue(record, ['avatar', 'avatarUrl', 'profilePictureData', 'photo', 'image']),
            this.pickString(record, ['profilePictureType', 'avatarProfileType']),
          ) ?? this.selectedChat?.avatar),
      initial: this.buildInitial(senderName),
      attachmentName: this.pickString(record, ['attachmentName', 'fileName']) ?? null,
      attachmentType:
        this.pickString(record, ['attachmentType', 'fileType', 'contentType']) ?? null,
      attachmentData: this.pickString(record, ['attachmentData', 'fileData']) ?? null,
      attachmentUrl: this.buildAttachmentUrl(
        this.pickString(record, ['attachmentData', 'fileData']) ?? undefined,
        this.pickString(record, ['attachmentType', 'fileType', 'contentType']) ?? undefined,
      ),
      isHireRequest,
      isFormalNotice,
      isPriceProposal,
      isProjectRequirementProposal,
      isProjectDelivery,
      isProjectRevisionRequest,
      projectRequirementProposalStatus,
      projectDeliveryStatus,
      projectRevisionStatus,
      projectRequirementProposalId,
      formalNoticeStatus,
      formalNoticeProjectId,
      priceProposalStatus,
      priceProposalAmount,
      hireRequestId,
      hireRequestStatus,
      hireRequestDetails,
    };
  }

  getMessageDisplayText(message: MessageItem): string {
    if (message.isProjectRequirementProposal) {
      return this.pickString(message.hireRequestDetails ?? {}, ['text']) ?? message.text;
    }

    if (message.isProjectDelivery) {
      return this.pickString(message.hireRequestDetails ?? {}, ['text']) ?? message.text;
    }

    if (message.isProjectRevisionRequest) {
      return this.pickString(message.hireRequestDetails ?? {}, ['text']) ?? message.text;
    }

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

  getProjectRequirementValue(message: MessageItem, key: string): string {
    return this.pickDisplayString(message.hireRequestDetails ?? {}, [key]) ?? 'Not set';
  }

  getProjectRequirementFileProjectId(message: MessageItem): number | null {
    return this.toNullableNumber(message.hireRequestDetails?.['projectId']) ?? null;
  }

  getProjectRequirementStatus(message: MessageItem): string {
    const rawStatus = (message.projectRequirementProposalStatus ?? 'PENDING').toUpperCase();
    if (rawStatus === 'ACCEPTED' || rawStatus === 'REJECTED') {
      return rawStatus;
    }

    return rawStatus;
  }

  getProjectDeliveryStatusLabel(message: MessageItem): string {
    return this.resolveProjectDeliveryStatus(message).replace(/_/g, ' ').toLowerCase();
  }

  getProjectRevisionValue(message: MessageItem, key: string): string {
    return this.pickDisplayString(message.hireRequestDetails ?? {}, [key]) ?? 'Not set';
  }

  getProjectRevisionStatusLabel(message: MessageItem): string {
    return this.resolveProjectRevisionStatus(message).replace(/_/g, ' ').toLowerCase();
  }

  canAcceptProjectRevision(message: MessageItem): boolean {
    return (
      message.isProjectRevisionRequest === true &&
      this.isRequestedRevisionStatus(this.resolveProjectRevisionStatus(message)) &&
      this.resolveRevisionProjectId(message) !== null
    );
  }

  canAcceptDeliveryRevision(message: MessageItem): boolean {
    return (
      message.isProjectDelivery === true &&
      this.isRequestedRevisionStatus(this.resolveProjectDeliveryStatus(message)) &&
      this.resolveDeliveryProjectId(message) !== null
    );
  }

  acceptProjectRevision(message: MessageItem): void {
    const projectId = this.resolveRevisionProjectId(message);
    if (!projectId) {
      this.errorMessage = 'Unable to accept this revision because project id is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.chatService.acceptProjectRevision(projectId).subscribe({
      next: (project) => {
        this.markProjectRevisionAccepted(projectId, project);
        const chat = this.selectedChat;
        if (chat) {
          chat.projectId = project.id ?? chat.projectId;
          chat.project = project.projectTitle || chat.project;
          chat.preview = 'Revision in progress';
          chat.time = 'Now';
        }
        this.sendProjectRevisionStatusUpdate(projectId, project, message);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.getHttpErrorMessage(
          error,
          'Unable to accept this revision right now.',
        );
        this.cdr.detectChanges();
      },
    });
  }

  private resolveProjectRevisionStatus(message: MessageItem): string {
    return this.normalizeProjectStatus(
      message.projectRevisionStatus ?? message.hireRequestDetails?.['status'] ?? 'REVISION_REQUESTED',
    );
  }

  private isRequestedRevisionStatus(status: string): boolean {
    return status === 'REVISION_REQUESTED' || status === 'REQUESTED' || status === 'REVISION';
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
      (message.isProjectDelivery ? this.resolveDeliveryProjectId(message) : null) ??
      this.toNullableNumber(this.selectedChat?.projectId)
    );
  }

  private markProjectRevisionAccepted(projectId: number, project?: ProjectResponse): void {
    this.messages = this.messages.map((item) => {
      const itemProjectId = item.isProjectDelivery
        ? this.resolveDeliveryProjectId(item)
        : this.resolveRevisionProjectId(item);
      if ((!item.isProjectRevisionRequest && !item.isProjectDelivery) || itemProjectId !== projectId) {
        return item;
      }

      return {
        ...item,
        projectRevisionStatus: item.isProjectRevisionRequest ? 'IN_PROGRESS' : item.projectRevisionStatus,
        projectDeliveryStatus: item.isProjectDelivery ? 'IN_PROGRESS' : item.projectDeliveryStatus,
        hireRequestDetails: {
          ...(item.hireRequestDetails ?? {}),
          status: 'IN_PROGRESS',
          projectTitle:
            project?.projectTitle ?? item.hireRequestDetails?.['projectTitle'] ?? this.selectedChat?.project,
        },
      };
    });
  }

  private sendProjectRevisionStatusUpdate(
    projectId: number,
    project: ProjectResponse | undefined,
    sourceMessage: MessageItem,
  ): void {
    const chat = this.selectedChat;
    const receiverId = chat?.otherUserId;
    if (!chat || receiverId === null || receiverId === undefined) {
      return;
    }

    const content = JSON.stringify({
      type: 'project_revision_request',
      messageType: 'project_revision_request',
      projectId,
      projectTitle:
        project?.projectTitle ??
        this.pickString(sourceMessage.hireRequestDetails ?? {}, ['projectTitle']) ??
        chat.project,
      gigId: project?.gigId ?? chat.gigId,
      agreedPrice: project?.agreedPrice ?? sourceMessage.hireRequestDetails?.['agreedPrice'],
      revisionMessage: this.pickString(sourceMessage.hireRequestDetails ?? {}, ['revisionMessage']),
      status: 'IN_PROGRESS',
      text: 'Revision accepted. Work is now in progress.',
    });

    this.chatService
      .sendRoomMessage(chat.roomId, {
        receiverId: Number(receiverId),
        content,
      })
      .subscribe({
        next: (response) => {
          const mapped = this.mapMessage(response, this.messages.length);
          this.messages = this.upsertMessage(this.messages, mapped);
          this.updateConversationPreview(String(chat.roomId), mapped.text, mapped.time);
          this.cdr.detectChanges();
          this.scrollToLatestMessage();
        },
        error: () => {
          this.errorMessage = 'Revision was accepted, but the client status card could not be sent.';
          this.cdr.detectChanges();
        },
      });
  }

  private resolveProjectDeliveryStatus(message: MessageItem): string {
    if (this.isDeliveryProjectCompleted(message)) {
      return 'COMPLETED';
    }

    return this.normalizeProjectStatus(
      message.projectDeliveryStatus ?? message.hireRequestDetails?.['status'] ?? 'DELIVERED',
    );
  }

  private normalizeProjectStatus(status: unknown): string {
    return String(status ?? '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
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

    return this.toNullableNumber(this.selectedChat?.projectId);
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
  }

  private normalizeStatus(status?: string): string {
    return String(status ?? '').trim().toLowerCase().replace(/-/g, '_');
  }

  canAcceptProjectRequirement(message: MessageItem): boolean {
    return (
      message.isProjectRequirementProposal === true &&
      this.getProjectRequirementStatus(message) === 'PENDING' &&
      this.toNullableNumber(message.projectRequirementProposalId) !== null
    );
  }

  acceptProjectRequirement(message: MessageItem): void {
    const proposalId = this.toNullableNumber(message.projectRequirementProposalId);
    if (!proposalId) {
      this.errorMessage = 'Unable to accept this requirement proposal.';
      return;
    }

    this.chatService.acceptProjectRequirement(proposalId).subscribe({
      next: (project) => {
        message.projectRequirementProposalStatus = 'ACCEPTED';
        if (message.hireRequestDetails) {
          message.hireRequestDetails['status'] = 'ACCEPTED';
        }

        const chat = this.selectedChat;
        if (chat) {
          chat.projectId = project.id ?? chat.projectId;
          chat.project = project.projectTitle || chat.project;
          chat.preview = 'Actual requirement accepted';
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to accept actual requirement right now.';
        this.cdr.detectChanges();
      },
    });
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
        details['agreedPrice'] ??
        details['pricePending'] ??
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
    return (
      this.pickDisplayString(details, ['agreedPrice', 'pricePending', 'price', 'amount']) ??
      'Pending agreement'
    );
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

  private isProjectRequirementProposalPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_requirement_proposal';
  }

  private isProjectDeliveryPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_delivery';
  }

  private isProjectRevisionRequestPayload(payload: Record<string, unknown>): boolean {
    const type = this.pickString(payload, ['type', 'messageType'])?.toLowerCase();
    return type === 'project_revision_request' || type === 'revision_request';
  }

  private parseFormalHireRequestNotice(content: unknown): {
    status: 'accepted' | 'rejected';
    requestId: number | null;
    projectId: number | null;
    gigId: number | null;
    gigTitle: string;
    text: string;
  } | null {
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
        if (!match) {
          return null;
        }

        const status = match[1].toLowerCase() as 'accepted' | 'rejected';
        const gigTitle = match[2].trim();
        return {
          status,
          requestId: null,
          projectId: null,
          gigId: null,
          gigTitle,
          text: trimmed,
        };
      }
    } else if (content && typeof content === 'object') {
      parsed = content as Record<string, unknown>;
    }

    if (!parsed || this.pickString(parsed, ['type', 'messageType']) !== 'formal_notice') {
      return null;
    }

    const status = this.pickString(parsed, ['status'])?.toLowerCase();
    if (status !== 'accepted' && status !== 'rejected') {
      return null;
    }

    const gigTitle = this.pickString(parsed, ['gigTitle']) ?? 'your request';
    return {
      status,
      requestId: this.pickNumber(parsed, ['requestId']),
      projectId: this.pickNumber(parsed, ['projectId']),
      gigId: this.pickNumber(parsed, ['gigId']),
      gigTitle,
      text:
        this.pickString(parsed, ['text']) ??
        (status === 'accepted'
          ? `Formal notice: I have accepted your hire request for "${gigTitle}". I will proceed with the project now.`
          : `Formal notice: I have rejected your hire request for "${gigTitle}". Thank you for considering my services.`),
    };
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

  private parsePriceProposalMessage(content: unknown): {
    requestId: number | null;
    projectId: number | null;
    gigId: number | null;
    gigTitle: string | null;
    amount: number | null;
    status: 'pending' | 'accepted' | 'rejected' | string;
    text: string;
    details: Record<string, unknown>;
  } | null {
    let parsed: Record<string, unknown> | null = null;

    if (typeof content === 'string') {
      parsed = this.parseJsonPayload(content);
      if (!parsed) {
        const match = /^Price proposal:\s*\$?([0-9]+(?:\.[0-9]+)?)/i.exec(content.trim());
        if (!match) return null;

        const amount = this.pickNumber({ amount: match[1] }, ['amount']);
        const text = `New price proposal: $${amount ?? ''}`;
        return {
          requestId: null,
          projectId: null,
          gigId: null,
          gigTitle: null,
          amount,
          status: 'pending',
          text,
          details: {
            type: 'price_proposal',
            pricePending: amount,
            text,
          },
        };
      }
    } else if (content && typeof content === 'object') {
      parsed = content as Record<string, unknown>;
    }

    if (!parsed) return null;

    const nested = this.getNestedJsonPayload(parsed);
    const source = { ...(nested ?? {}), ...parsed };
    const type = this.pickString(source, ['type', 'messageType'])?.toLowerCase();
    if (!this.isPriceMessageType(type)) return null;

    const amount = this.pickNumber(source, ['pricePending', 'agreedPrice', 'price', 'amount']);
    const resolvedStatus =
      this.pickString(source, ['status']) ??
      (type === 'price_agreement' || type === 'price_notice'
        ? 'accepted'
        : type === 'price_rejected'
          ? 'rejected'
          : 'pending');
    const text =
      this.pickDisplayString(source, ['text']) ??
      (type === 'price_proposal'
        ? `New price proposal: $${amount ?? ''}`
        : type === 'price_rejected'
          ? `Price proposal rejected${amount ? `: $${amount}` : ''}`
          : `Price accepted: $${amount ?? ''}`);

    return {
      requestId: this.pickNumber(source, ['requestId', 'hireRequestId']),
      projectId: this.pickNumber(source, ['projectId']),
      gigId: this.pickNumber(source, ['gigId']),
      gigTitle: this.pickDisplayString(source, ['gigTitle', 'projectTitle', 'title']),
      amount,
      status: resolvedStatus,
      text,
      details: {
        ...source,
        gigTitle:
          this.pickDisplayString(parsed, ['gigTitle', 'projectTitle', 'title']) ??
          this.pickDisplayString(nested ?? {}, ['gigTitle', 'projectTitle', 'title']) ??
          undefined,
        pricePending: type === 'price_proposal' ? amount : null,
        agreedPrice:
          type === 'price_agreement' || type === 'price_notice' ? amount : source['agreedPrice'],
        text,
      },
    };
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

  private isPriceMessageType(value: unknown): boolean {
    const type = typeof value === 'string' ? value.toLowerCase() : '';
    return (
      type === 'price_proposal' ||
      type === 'price_agreement' ||
      type === 'price_notice' ||
      type === 'price_rejected'
    );
  }

  private parseLegacyHireRequestPayload(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    if (!trimmed.toLowerCase().startsWith('new hire request for gig:')) {
      return null;
    }

    const match =
      /^New hire request for gig:\s*(.*?)\s*Message:\s*(.*?)\s*Requirements:\s*(.*?)\s*Agreed price:\s*(.*)$/is.exec(
        trimmed,
      );

    if (!match) {
      return {
        type: 'hire_request',
        messageType: 'hire_request',
        gigTitle: trimmed.replace(/^New hire request for gig:\s*/i, '').trim(),
        status: 'pending',
      };
    }

    return {
      type: 'hire_request',
      messageType: 'hire_request',
      gigTitle: match[1].trim(),
      requestMessage: match[2].trim(),
      requirements: match[3].trim(),
      pricePending: match[4].trim(),
      status: 'pending',
    };
  }

  private isHireRequestPayload(payload: Record<string, unknown>): boolean {
    const typeValue = this.pickString(payload, ['type', 'messageType', 'kind'])?.toLowerCase();
    if (typeValue === 'formal_notice' || this.isPriceMessageType(typeValue)) {
      return false;
    }

    if (typeValue === 'hire_request') {
      return true;
    }

    const hasHireRequestFields =
      this.pickValue(payload, ['requestId', 'clientId', 'gigId']) !== undefined &&
      (this.pickString(payload, ['requestMessage', 'requirements', 'gigTitle']) !== null ||
        this.pickValue(payload, ['requestStatus', 'status']) !== undefined);

    return hasHireRequestFields;
  }

  private resolvePendingHireRequestMetadata(): void {
    if (this.messages.length === 0 || this.hireRequests.length === 0) {
      return;
    }

    this.messages = this.messages.map((message) => {
      if (!message.isHireRequest) {
        return message;
      }

      if (message.hireRequestId && message.hireRequestStatus) {
        return message;
      }

      const summary = this.extractHireRequestSummary(message);
      if (!summary) {
        return message;
      }

      const matchedRequest = this.hireRequests.find((request) => {
        if (message.hireRequestId && request.id === message.hireRequestId) {
          return true;
        }

        if (
          summary.gigTitle &&
          this.normalizeText(request.gigTitle) === this.normalizeText(summary.gigTitle)
        ) {
          return true;
        }

        return (
          this.normalizeText(request.requestMessage) ===
            this.normalizeText(summary.requestMessage) &&
          this.normalizeText(request.requirements) === this.normalizeText(summary.requirements)
        );
      });

      if (!matchedRequest) {
        return message;
      }

      return {
        ...message,
        hireRequestId: matchedRequest.id,
        hireRequestStatus:
          this.localHireRequestStatuses.get(matchedRequest.id) ?? matchedRequest.status,
        hireRequestDetails: {
          ...(message.hireRequestDetails ?? {}),
          requestId: matchedRequest.id,
          status: this.localHireRequestStatuses.get(matchedRequest.id) ?? matchedRequest.status,
          projectId: matchedRequest.projectId,
          gigId: matchedRequest.gigId,
          freelancerId: matchedRequest.freelancerId,
          gigTitle: matchedRequest.gigTitle,
          requestMessage: matchedRequest.requestMessage,
          requirements: matchedRequest.requirements,
          agreedPrice: matchedRequest.agreedPrice,
        },
      };
    });
  }

  private extractHireRequestSummary(message: MessageItem): {
    gigTitle?: string;
    requestMessage?: string;
    requirements?: string;
    agreedPrice?: string;
  } | null {
    const details = message.hireRequestDetails;
    if (!details) {
      return null;
    }

    return {
      gigTitle: this.pickString(details, ['gigTitle']) ?? undefined,
      requestMessage: this.pickString(details, ['requestMessage', 'message']) ?? undefined,
      requirements: this.pickString(details, ['requirements']) ?? undefined,
      agreedPrice: this.pickString(details, ['agreedPrice']) ?? undefined,
    };
  }

  private normalizeText(value: unknown): string {
    return typeof value === 'string'
      ? value.trim().toLowerCase()
      : String(value ?? '')
          .trim()
          .toLowerCase();
  }

  sendMessage(): void {
    const content = (this.draftMessage ?? '').trim();
    if (!content && !this.selectedAttachment) return;

    const conversation = this.selectedChat;
    if (!conversation) return;

    const roomId = conversation.roomId;
    const receiverId = conversation.otherUserId ?? null;

    if (!receiverId) {
      this.errorMessage = 'Unable to determine receiver for this conversation.';
      return;
    }

    this.chatService
      .sendRoomMessage(roomId, {
        receiverId: Number(receiverId),
        content,
        file: this.selectedAttachment,
      })
      .pipe(
        catchError(() => {
          this.errorMessage = 'Unable to send message right now.';
          return of(null);
        }),
      )
      .subscribe((resp) => {
        if (!resp) return;

        const mapped = this.mapMessage(resp, this.messages.length);
        this.messages = this.upsertMessage(this.messages, mapped);
        this.draftMessage = '';
        this.selectedAttachment = null;
        this.showAttachMenu = false;

        this.updateConversationPreview(String(roomId), mapped.text, mapped.time);

        this.cdr.detectChanges();
        this.scrollToLatestMessage();
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
    this.selectedAttachment = input?.files?.[0] ?? null;
    this.showAttachMenu = false;

    if (input) {
      input.value = '';
    }
  }

  clearAttachment(): void {
    this.selectedAttachment = null;
  }

  toggleDeliveryForm(): void {
    this.showAttachMenu = false;
    this.showDeliveryForm = !this.showDeliveryForm;
  }

  onDeliveryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (file && file.size > this.maxDeliverySourceSizeBytes) {
      this.deliveryForm.deliveryFile = null;
      this.errorMessage = `Source ZIP must be ${this.formatFileSize(this.maxDeliverySourceSizeBytes)} or smaller.`;
      this.cdr.detectChanges();
    } else if (file && !this.isZipSourceFile(file)) {
      this.deliveryForm.deliveryFile = null;
      this.errorMessage = 'Upload the project source as a .zip file.';
      this.cdr.detectChanges();
    } else {
      this.deliveryForm.deliveryFile = file;
      this.errorMessage = '';
    }

    if (input) {
      input.value = '';
    }
  }

  clearDeliveryFile(): void {
    this.deliveryForm.deliveryFile = null;
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

  downloadProjectDelivery(message: MessageItem): void {
    const projectId = this.toNullableNumber(message.hireRequestDetails?.['projectId']);
    if (!projectId) {
      this.errorMessage = 'Unable to download delivery file because project id is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.chatService.downloadProjectDeliveryFile(projectId, 'freelancer').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.triggerAttachmentDownload(
          url,
          this.pickString(message.hireRequestDetails ?? {}, ['deliveryFileName']) ?? 'delivery-file',
        );
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: (error) => {
        this.errorMessage = this.getHttpErrorMessage(
          error,
          'Unable to download delivery file right now.',
        );
        this.cdr.detectChanges();
      },
    });
  }

  submitDelivery(): void {
    const projectId = this.resolveSelectedProjectId();
    if (!projectId) {
      this.errorMessage = 'Project is not ready yet. Start the project before delivery.';
      return;
    }

    if (!this.deliveryForm.deliveryMessage.trim() && !this.deliveryForm.deliveryFile) {
      this.errorMessage = 'Add a delivery message or delivery file before submitting.';
      return;
    }

    this.savingDelivery = true;
    this.errorMessage = '';

    this.chatService
      .deliverProject(projectId, this.deliveryForm.deliveryMessage.trim())
      .pipe(
        catchError((error) => {
          throw new DeliveryStepError('Delivery submit failed', error);
        }),
        switchMap((project) =>
          this.deliveryForm.deliveryFile
            ? this.chatService.uploadProjectDeliveryFile(projectId, this.deliveryForm.deliveryFile).pipe(
                catchError((error) => {
                  throw new DeliveryStepError('Source ZIP upload failed', error);
                }),
              )
            : of(project),
        ),
      )
      .subscribe({
        next: (project) => {
          const chat = this.selectedChat;
          if (chat) {
            chat.preview = 'Project delivered';
            chat.time = 'Now';
          }

          if (chat?.otherUserId) {
            const content = JSON.stringify({
              type: 'project_delivery',
              messageType: 'project_delivery',
              projectId: project.id ?? projectId,
              projectTitle: project.projectTitle ?? chat.project,
              gigId: project.gigId ?? chat.gigId,
              agreedPrice: project.agreedPrice,
              deliveryMessage: project.deliveryMessage ?? this.deliveryForm.deliveryMessage.trim(),
              deliveryFileName:
                project.deliveryFileName ?? this.deliveryForm.deliveryFile?.name ?? null,
              deliveryFileType:
                project.deliveryFileType ?? this.deliveryForm.deliveryFile?.type ?? 'application/zip',
              deliveryDate: project.deliveryDate ?? new Date().toISOString().slice(0, 10),
              status: project.status ?? 'DELIVERED',
              text: 'Project delivery submitted with source package. Please review the work.',
            });

            this.chatService
              .sendRoomMessage(chat.roomId, {
                receiverId: Number(chat.otherUserId),
                content,
              })
              .subscribe();
          }

          this.showDeliveryForm = false;
          this.savingDelivery = false;
          this.deliveryForm.deliveryMessage = '';
          this.deliveryForm.deliveryFile = null;
          this.syncCompletedDeliveryProjectsFromProjects([project]);
          this.loadConversations();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.savingDelivery = false;
          const stepError = error instanceof DeliveryStepError ? error : null;
          this.errorMessage = stepError
            ? `${stepError.step}: ${this.getHttpErrorMessage(stepError.originalError, 'Unable to submit delivery right now.')}`
            : this.getHttpErrorMessage(error, 'Unable to submit delivery right now.');
          this.cdr.detectChanges();
        },
      });
  }

  private getHttpErrorMessage(error: unknown, fallback: string): string {
    const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
    const status = Number(record['status']);

    if (status === 0) {
      return `Backend did not respond. Check that the backend is running and your session is still valid. If this happened during ZIP upload, use a file up to ${this.formatFileSize(this.maxDeliverySourceSizeBytes)}.`;
    }

    const body = record['error'];

    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      for (const key of ['message', 'error', 'detail', 'title']) {
        const value = bodyRecord[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }

    const message = record['message'];
    return typeof message === 'string' && message.trim() ? message.trim() : fallback;
  }

  private isZipSourceFile(file: File): boolean {
    const name = file.name.trim().toLowerCase();
    const type = file.type.trim().toLowerCase();
    return (
      name.endsWith('.zip') ||
      type === 'application/zip' ||
      type === 'application/x-zip-compressed' ||
      type === 'multipart/x-zip'
    );
  }

  private formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 MB';
    }

    return `${Math.round(bytes / (1024 * 1024))} MB`;
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

        this.errorMessage = 'Unable to download attachment right now.';
        this.cdr.detectChanges();
      },
    });
  }

  downloadProjectRequirementFile(message: MessageItem): void {
    const projectId = this.getProjectRequirementFileProjectId(message);
    const fileName =
      message.attachmentName ??
      this.pickString(message.hireRequestDetails ?? {}, ['requirementFileName']) ??
      'requirement-file';

    if (!projectId) {
      this.downloadAttachment(message, message.attachmentUrl ?? null);
      return;
    }

    this.chatService.downloadProjectRequirementFile(projectId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.triggerAttachmentDownload(url, fileName);
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => {
        if (message.attachmentUrl) {
          this.downloadAttachment(message, message.attachmentUrl);
          return;
        }

        this.errorMessage = 'Unable to download the proposal file right now.';
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

  openClientProfile(): void {
    const clientId = this.selectedChat?.otherClientId;
    if (!clientId) {
      this.errorMessage = 'Unable to open this client profile right now.';
      return;
    }

    void this.router.navigate(['/freelancer/client', clientId, 'profile'], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });
  }

  submitPriceProposal(): void {
    const request = this.findSelectedActionableHireRequest();
    const price = Number(this.priceDraft);
    if (!request || !Number.isFinite(price) || price <= 0) {
      this.errorMessage = 'Select an accepted hire request and enter a valid price.';
      return;
    }

    this.chatService.proposeHireRequestPrice(request.id, price).subscribe({
      next: () => {
        this.priceDraft = '';
        this.showAttachMenu = false;
        this.loadHireRequests();
        const content = JSON.stringify({
          type: 'price_proposal',
          messageType: 'price_proposal',
          status: 'pending',
          proposedBy: 'freelancer',
          requestId: request.id,
          projectId: request.projectId,
          gigId: request.gigId,
          gigTitle: request.gigTitle ?? this.selectedChat?.project,
          pricePending: price,
          text: `New price proposal: $${price}. Please review and accept to start the project.`,
        });
        this.chatService
          .sendRoomMessage(this.selectedChat!.roomId, {
            receiverId: Number(this.selectedChat?.otherUserId),
            content,
          })
          .subscribe({ next: () => this.loadMessages(this.selectedChat!.roomId) });
      },
      error: () => {
        this.errorMessage = 'Unable to set the pending price.';
      },
    });
  }

  acceptPriceProposal(message: MessageItem): void {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    const price = this.toNullableNumber(
      message.priceProposalAmount ??
        message.hireRequestDetails?.['pricePending'] ??
        message.hireRequestDetails?.['agreedPrice'],
    );

    if (!requestId || !price) {
      this.errorMessage = 'Unable to accept this price because request or price data is missing.';
      this.cdr.detectChanges();
      return;
    }

    const actionKey = this.getPriceActionKey(message);
    this.priceActionMessageIds.add(actionKey);
    this.cdr.detectChanges();

    this.chatService.acceptFreelancerHireRequestPrice(requestId, price).subscribe({
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
              this.pickDisplayString(message.hireRequestDetails ?? {}, [
                'gigTitle',
                'projectTitle',
                'title',
              ]) ?? this.selectedChat.project,
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
        this.errorMessage = 'Unable to accept the price proposal right now.';
        this.cdr.detectChanges();
      },
    });
  }

  rejectPriceProposal(message: MessageItem): void {
    const requestId = this.toNullableNumber(
      message.hireRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    const price = this.toNullableNumber(
      message.priceProposalAmount ??
        message.hireRequestDetails?.['pricePending'] ??
        message.hireRequestDetails?.['agreedPrice'],
    );

    if (!requestId) {
      this.errorMessage = 'Unable to reject this price because request data is missing.';
      this.cdr.detectChanges();
      return;
    }

    const actionKey = this.getPriceActionKey(message);
    this.priceActionMessageIds.add(actionKey);
    this.cdr.detectChanges();

    this.chatService.rejectFreelancerHireRequestPrice(requestId).subscribe({
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
              this.pickDisplayString(message.hireRequestDetails ?? {}, [
                'gigTitle',
                'projectTitle',
                'title',
              ]) ?? this.selectedChat.project,
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
        this.errorMessage = 'Unable to reject the price proposal right now.';
        this.cdr.detectChanges();
      },
    });
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

  private findSelectedActionableHireRequest(): HireRequestResponse | null {
    const chat = this.selectedChat;
    if (!chat) return null;

    return (
      this.hireRequests.find(
        (request) =>
          (chat.hireRequestId ? request.id === chat.hireRequestId : true) &&
          (String(request.clientId) === String(chat.otherClientId) ||
            String(request.clientId) === String(chat.otherUserId)) &&
          request.status === 'accepted',
      ) ??
      this.hireRequests.find(
        (request) =>
          String(request.clientId) === String(chat.otherClientId) ||
          String(request.clientId) === String(chat.otherUserId),
      ) ??
      null
    );
  }

  onMessageInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.sendMessage();
  }

  acceptHireRequest(message: MessageItem): void {
    const id = Number(
      message.hireRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    if (!Number.isFinite(id)) return;
    message.hireRequestStatus = 'pending';

    this.chatService.acceptHireRequest(id).subscribe({
      next: (response) => {
        const projectId = this.toNullableNumber(response?.id);
        this.localHireRequestStatuses.set(id, 'accepted');
        message.hireRequestStatus = 'accepted';
        if (message.hireRequestDetails) {
          message.hireRequestDetails = {
            ...message.hireRequestDetails,
            status: 'accepted',
            projectId,
          };
        }
        this.sendFormalHireRequestNotice(message, 'accepted', projectId);
        this.applyLocalHireRequestStatuses();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to accept request. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  rejectHireRequest(message: MessageItem): void {
    const id = Number(
      message.hireRequestId ??
        message.hireRequestDetails?.['requestId'] ??
        message.hireRequestDetails?.['id'],
    );
    if (!Number.isFinite(id)) return;
    message.hireRequestStatus = 'pending';

    this.chatService.rejectHireRequest(id).subscribe({
      next: () => {
        this.localHireRequestStatuses.set(id, 'rejected');
        message.hireRequestStatus = 'rejected';
        if (message.hireRequestDetails) {
          message.hireRequestDetails = {
            ...message.hireRequestDetails,
            status: 'rejected',
          };
        }
        this.sendFormalHireRequestNotice(message, 'rejected');
        this.applyLocalHireRequestStatuses();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to reject request. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  private sendFormalHireRequestNotice(
    message: MessageItem,
    status: 'accepted' | 'rejected',
    projectId: number | null = null,
  ): void {
    const receiverId = message.senderId ?? message.receiverId ?? null;
    if (receiverId === null || receiverId === undefined) {
      this.errorMessage = 'Unable to determine who should receive the formal notice.';
      return;
    }

    const notice = this.buildFormalHireRequestNotice(message, status, projectId);
    const content = JSON.stringify(notice);

    this.chatService
      .sendRoomMessage(message.roomId ?? this.selectedChat?.roomId ?? '', {
        receiverId: Number(receiverId),
        content,
      })
      .subscribe({
        next: (response) => {
          const roomId = message.roomId ?? this.selectedChat?.roomId ?? null;
          const timestamp = response.sentAt ?? new Date().toISOString();

          this.messages = [
            ...this.messages,
            {
              id: `temp-${Date.now()}`,
              roomId: roomId ?? undefined,
              senderId: this.currentUserId ?? undefined,
              receiverId: Number(receiverId),
              senderName: 'You',
              text: this.buildFormalHireRequestNoticeText(message, status),
              time: this.formatTime(timestamp),
              isMine: true,
              initial: 'Y',
              isFormalNotice: true,
              formalNoticeStatus: status,
              formalNoticeProjectId: projectId,
              hireRequestStatus: status,
              hireRequestDetails: {
                ...(message.hireRequestDetails ?? {}),
                status,
                projectId,
              },
            },
          ];

          if (roomId !== null && roomId !== undefined) {
            const conversationIndex = this.conversations.findIndex(
              (conversation) => String(conversation.roomId) === String(roomId),
            );

            if (conversationIndex >= 0) {
              this.conversations[conversationIndex] = {
                ...this.conversations[conversationIndex],
                preview: this.buildFormalHireRequestNoticeText(message, status),
                time: this.formatTime(timestamp),
              };
            }
          }

          this.cdr.detectChanges();
          this.scrollToLatestMessage();
        },
        error: () => {
          this.errorMessage = 'The request was handled, but the formal notice could not be sent.';
          this.cdr.detectChanges();
        },
      });
  }

  private buildFormalHireRequestNotice(
    message: MessageItem,
    status: 'accepted' | 'rejected',
    projectId: number | null = null,
  ): Record<string, unknown> {
    const gigTitle =
      this.pickString(message.hireRequestDetails ?? {}, ['gigTitle', 'projectTitle']) ??
      this.selectedChat?.project ??
      'your request';

    return {
      type: 'formal_notice',
      messageType: 'formal_notice',
      status,
      requestId: this.toNullableNumber(
        message.hireRequestId ??
          message.hireRequestDetails?.['requestId'] ??
          message.hireRequestDetails?.['id'],
      ),
      projectId,
      gigId: this.toNullableNumber(message.hireRequestDetails?.['gigId']),
      gigTitle,
      text:
        status === 'accepted'
          ? `Formal notice: I have accepted your hire request for "${gigTitle}". I will proceed with the project now.`
          : `Formal notice: I have rejected your hire request for "${gigTitle}". Thank you for considering my services.`,
    };
  }

  private buildFormalHireRequestNoticeText(
    message: MessageItem,
    status: 'accepted' | 'rejected',
  ): string {
    const gigTitle =
      this.pickString(message.hireRequestDetails ?? {}, ['gigTitle', 'projectTitle']) ??
      this.selectedChat?.project ??
      'your request';

    if (status === 'accepted') {
      return `Formal notice: I have accepted your hire request for "${gigTitle}". I will proceed with the project now.`;
    }

    return `Formal notice: I have rejected your hire request for "${gigTitle}". Thank you for considering my services.`;
  }

  private applyLocalHireRequestStatuses(): void {
    if (this.messages.length === 0 || this.localHireRequestStatuses.size === 0) {
      return;
    }

    this.messages = this.messages.map((message) => {
      if (!message.isHireRequest) {
        return message;
      }

      const requestId = this.toNullableNumber(
        message.hireRequestId ??
          message.hireRequestDetails?.['requestId'] ??
          message.hireRequestDetails?.['id'],
      );

      if (requestId === null) {
        return message;
      }

      const status = this.localHireRequestStatuses.get(requestId);
      if (!status) {
        return message;
      }

      return {
        ...message,
        hireRequestStatus: status,
        hireRequestDetails: {
          ...(message.hireRequestDetails ?? {}),
          status,
        },
      };
    });
  }

  private syncPriceProposalStatusesFromServer(): void {
    if (this.messages.length === 0 || this.hireRequests.length === 0) {
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

  private toNullableNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
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

  private updateSelectedRoomRoute(roomId: number | string, replaceUrl = false): void {
    const currentRoomId = this.route.snapshot.paramMap.get('roomId');
    const nextRoomId = String(roomId);

    if (currentRoomId === nextRoomId) {
      return;
    }

    void this.router.navigate(['/freelancer', nextRoomId, 'chat'], { replaceUrl });
  }

  private getConversationTimeValue(conversation: ConversationItem): number {
    const raw = conversation.lastMessageAt;
    const value =
      typeof raw === 'number'
        ? raw
        : Array.isArray(raw)
          ? this.getArrayDateTimeValue(raw)
          : typeof raw === 'string'
            ? Date.parse(raw)
            : raw instanceof Date
              ? raw.getTime()
              : 0;

    return Number.isFinite(value) ? value : 0;
  }

  private getArrayDateTimeValue(value: unknown[]): number {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value.map(Number);

    if (![year, month, day, hour, minute, second, nano].every(Number.isFinite)) {
      return 0;
    }

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      Math.floor(nano / 1_000_000),
    ).getTime();
  }

  private isCurrentUserMessage(message: Partial<ChatMessageResponse>): boolean {
    if (this.currentUserEmail && message.senderEmail) {
      return message.senderEmail.trim().toLowerCase() === this.currentUserEmail;
    }

    return (
      this.currentUserId !== null &&
      message.senderId !== undefined &&
      Number(message.senderId) === this.currentUserId
    );
  }

  private getCurrentUserId(): number | null {
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

  private getCurrentUserEmail(): string | null {
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

  private unwrapArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const candidates = [
      record['data'],
      record['result'],
      record['items'],
      record['content'],
      record['list'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private pickValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return null;
  }

  private pickString(record: Record<string, unknown>, keys: string[]): string | null {
    const value = this.pickValue(record, keys);

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }

  private pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
    const value = this.pickValue(record, keys);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private pickBoolean(record: Record<string, unknown>, keys: string[]): boolean {
    const value = this.pickValue(record, keys);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === 'yes' || normalized === '1';
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return false;
  }

  private resolveAvatar(value: unknown, contentType?: string | null): string | undefined {
    const type = contentType?.trim() || 'image/jpeg';

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        return undefined;
      }

      if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }

      if (trimmed.startsWith('/') && !this.isLikelyBase64(trimmed)) {
        return `${this.apiUrl.replace(/\/$/, '')}${trimmed}`;
      }

      return `data:${type};base64,${trimmed}`;
    }

    if (value instanceof Uint8Array && value.length > 0) {
      return `data:${type};base64,${this.bytesToBase64(value)}`;
    }

    if (Array.isArray(value) && value.length > 0) {
      return `data:${type};base64,${this.bytesToBase64(new Uint8Array(value as number[]))}`;
    }

    return undefined;
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

  private isLikelyBase64(value: string): boolean {
    const normalized = value.replace(/\s/g, '');
    return normalized.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private buildInitial(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
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
}

class DeliveryStepError extends Error {
  constructor(
    readonly step: string,
    readonly originalError: unknown,
  ) {
    super(step);
  }
}

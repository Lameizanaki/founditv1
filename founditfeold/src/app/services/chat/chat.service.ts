import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { env } from '../../../environments/env';
import { NotificationRefreshService } from '../notification/notification-refresh.service';
import { NotificationPreferenceService } from '../notification/notification-preference.service';

export interface ChatMessageRequest {
  receiverId: number;
  content: string;
  file?: File | null;
}

export interface ChatMessageResponse {
  id?: number;
  roomId?: number;
  roomKey?: string;
  senderId?: number;
  senderName?: string;
  senderEmail?: string;
  receiverId?: number;
  receiverName?: string;
  receiverEmail?: string;
  content?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string;
  sentAt?: string;
  isRead?: boolean;
}

export interface ConversationResponse {
  roomId: number;
  roomKey: string;
  otherUserId: number;
  otherUsername: string;
  otherRole?: string;
  otherClientId?: number;
  otherFreelancerId?: number;
  otherProfilePictureData?: string;
  otherProfilePictureType?: string;
  otherProfilePictureName?: string;
  hireRequestId?: number;
  projectId?: number;
  gigId?: number;
  projectTitle?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface OpenConversationRequest {
  receiverId?: number;
  clientId?: number;
  freelancerId?: number;
  gigId?: number;
}

export interface HireRequestResponse {
  id: number;
  clientId: number;
  clientName: string;
  freelancerId: number;
  gigId: number;
  gigTitle?: string;
  requestMessage?: string;
  requirements?: string;
  agreedPrice?: number;
  projectAgreedPrice?: number;
  projectStatus?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  projectId?: number;
  createdAt?: string;
  updatedAt?: string;
  deadline?: string;
}

export interface ProjectRequirementRequest {
  projectTitle?: string;
  requirements?: string;
  agreedPrice?: number | string | null;
  startDate?: string;
  deadline?: string;
  requirementFile?: File | null;
}

export interface ProjectResponse {
  id: number;
  clientId?: number;
  clientName?: string;
  gigId?: number;
  gigTitle?: string;
  projectTitle?: string;
  requirements?: string;
  requirementFileName?: string;
  requirementFileType?: string;
  agreedPrice?: number;
  startDate?: string;
  deadline?: string;
  deliveryMessage?: string;
  deliveryDate?: string;
  deliveryFileName?: string;
  deliveryFileType?: string;
  revisionMessage?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectRequirementProposalResponse {
  id: number;
  projectId: number;
  projectTitle?: string;
  requirements?: string;
  requirementFileName?: string;
  requirementFileType?: string;
  agreedPrice?: number;
  startDate?: string;
  deadline?: string;
  status?: string;
}

type ChatUnreadScope = 'client' | 'freelancer';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly notificationRefreshService = inject(NotificationRefreshService);
  private readonly notificationPreferenceService = inject(NotificationPreferenceService);
  private readonly chatBaseUrl = `${env.apiUrl}/api/chat`;
  private readonly clientBaseUrl = `${env.apiUrl}/client`;
  private readonly freelancerBaseUrl = `${env.apiUrl}/freelancer`;
  private readonly incomingMessageSubject = new Subject<ChatMessageResponse>();
  private readonly unreadChatStateSubject = new BehaviorSubject<Record<ChatUnreadScope, boolean>>({
    client: this.readUnreadFlag('client'),
    freelancer: this.readUnreadFlag('freelancer'),
  });

  private stompClient: Client | null = null;
  private stompReadyPromise: Promise<void> | null = null;
  private readonly subscribedRoomIds = new Set<string>();
  private readonly roomSubscriptions = new Map<string, StompSubscription>();

  readonly incomingMessages$ = this.incomingMessageSubject.asObservable();
  readonly unreadChatState$ = this.unreadChatStateSubject.asObservable();

  getConversations(): Observable<ConversationResponse[]> {
    return this.http.get<ConversationResponse[]>(`${this.chatBaseUrl}/conversations`);
  }

  openConversation(request: OpenConversationRequest): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.chatBaseUrl}/conversations`, request);
  }

  watchMyConversationRooms(): Observable<ConversationResponse[]> {
    return this.getConversations().pipe(
      tap((conversations) => {
        for (const conversation of conversations ?? []) {
          if (conversation.roomId !== undefined && conversation.roomId !== null) {
            this.watchRoom(conversation.roomId);
          }
        }
      }),
    );
  }

  getRoomMessages(roomId: number): Observable<ChatMessageResponse[]> {
    return this.http.get<ChatMessageResponse[]>(`${this.chatBaseUrl}/rooms/${roomId}/messages`);
  }

  downloadAttachment(messageId: number | string): Observable<Blob> {
    return this.http.get(`${this.chatBaseUrl}/messages/${messageId}/attachment`, {
      responseType: 'blob',
    });
  }

  downloadFreelancerAvatar(freelancerId: number | string): Observable<Blob> {
    return this.http.get(`${this.chatBaseUrl}/freelancers/${freelancerId}/avatar`, {
      responseType: 'blob',
    });
  }

  downloadClientAvatar(clientId: number | string): Observable<Blob> {
    return this.http.get(`${this.chatBaseUrl}/clients/${clientId}/avatar`, {
      responseType: 'blob',
    });
  }

  sendMessage(request: ChatMessageRequest): Observable<ChatMessageResponse> {
    if (request.file) {
      throw new Error('File attachments must be sent to a room attachment endpoint.');
    }

    return this.http.post<ChatMessageResponse>(
      `${this.chatBaseUrl}/messages`,
      this.buildMessageBody(request),
    );
  }

  sendRoomMessage(
    roomId: number | string,
    request: ChatMessageRequest,
  ): Observable<ChatMessageResponse> {
    if (request.file) {
      return this.sendRoomAttachment(roomId, request);
    }

    return this.http.post<ChatMessageResponse>(
      `${this.chatBaseUrl}/rooms/${roomId}/messages`,
      this.buildMessageBody(request),
    );
  }

  sendRoomAttachment(
    roomId: number | string,
    request: ChatMessageRequest,
  ): Observable<ChatMessageResponse> {
    return this.http.post<ChatMessageResponse>(
      `${this.chatBaseUrl}/rooms/${roomId}/attachments`,
      this.buildAttachmentFormData(request),
    );
  }

  hasUnreadChat(scope: ChatUnreadScope): boolean {
    if (!this.notificationPreferenceService.isEnabled(scope, 'messages')) {
      return false;
    }

    return this.unreadChatStateSubject.value[scope] ?? this.readUnreadFlag(scope);
  }

  markChatUnread(scope: ChatUnreadScope): void {
    if (!this.notificationPreferenceService.isEnabled(scope, 'messages')) {
      this.markChatRead(scope);
      return;
    }

    this.writeUnreadFlag(scope, true);
    this.unreadChatStateSubject.next({
      ...this.unreadChatStateSubject.value,
      [scope]: true,
    });
  }

  markChatRead(scope: ChatUnreadScope): void {
    this.writeUnreadFlag(scope, false);
    this.unreadChatStateSubject.next({
      ...this.unreadChatStateSubject.value,
      [scope]: false,
    });
  }

  trackIncomingUnread(scope: ChatUnreadScope, message: ChatMessageResponse, currentUrl = ''): void {
    if (!this.notificationPreferenceService.isEnabled(scope, 'messages')) {
      this.markChatRead(scope);
      return;
    }

    if (this.isCurrentUserMessage(message)) {
      return;
    }

    if (currentUrl.includes(`/${scope}/chat`)) {
      this.markChatRead(scope);
      return;
    }

    this.markChatUnread(scope);
  }

  startRealtimeConnection(): void {
    this.ensureSocketConnection().catch(() => {
      // The REST chat APIs still work; realtime will retry on the next send or page load.
    });
  }

  watchRoom(roomId: number | string): void {
    const key = String(roomId);
    if (!key || this.subscribedRoomIds.has(key)) {
      return;
    }

    this.subscribedRoomIds.add(key);
    this.ensureSocketConnection()
      .then(() => this.subscribeRoom(key))
      .catch(() => {
        // REST fallback still loads messages; realtime can retry when conversations reload.
        this.subscribedRoomIds.delete(key);
      });
  }

  sendHireRequest(
    gigId: number,
    freelancerId: number,
    message: string,
    requirements?: string,
    agreedPrice?: number,
    requirementFile?: File | null,
    deadline?: string,
  ): Observable<HireRequestResponse> {
    const payload = new FormData();
    payload.append('gigId', String(gigId));
    payload.append('freelancerId', String(freelancerId));
    payload.append('message', message);
    payload.append('requestMessage', message);
    payload.append('requirements', requirements || '');
    if (deadline) {
      payload.append('deadline', deadline);
    }

    if (agreedPrice !== undefined && agreedPrice !== null && Number.isFinite(Number(agreedPrice))) {
      payload.append('agreedPrice', String(agreedPrice));
    }

    if (requirementFile) {
      payload.append('requirementFile', requirementFile, requirementFile.name);
    }

    return this.http
      .post<HireRequestResponse>(`${this.clientBaseUrl}/hire-request`, payload)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  updateProjectRequirement(
    projectId: number | string,
    request: ProjectRequirementRequest,
  ): Observable<ProjectRequirementProposalResponse> {
    const payload = new FormData();
    payload.append('projectTitle', request.projectTitle ?? '');
    payload.append('requirements', request.requirements ?? '');

    if (
      request.agreedPrice !== undefined &&
      request.agreedPrice !== null &&
      String(request.agreedPrice).trim() !== ''
    ) {
      payload.append('agreedPrice', String(request.agreedPrice));
    }

    if (request.startDate) {
      payload.append('startDate', request.startDate);
    }

    if (request.deadline) {
      payload.append('deadline', request.deadline);
    }

    if (request.requirementFile) {
      payload.append('requirementFile', request.requirementFile, request.requirementFile.name);
    }

    return this.http
      .put<ProjectRequirementProposalResponse>(
        `${this.clientBaseUrl}/project/${projectId}/requirements`,
        payload,
      )
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  acceptProjectRequirement(proposalId: number | string): Observable<ProjectResponse> {
    return this.http
      .post<ProjectResponse>(
        `${this.freelancerBaseUrl}/project-requirements/${proposalId}/accept`,
        {},
      )
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  deliverProject(
    projectId: number | string,
    deliveryMessage?: string,
  ): Observable<ProjectResponse> {
    return this.http
      .post<ProjectResponse>(`${this.freelancerBaseUrl}/project/${projectId}/deliver`, null, {
        params: { deliveryMessage: deliveryMessage ?? '' },
      })
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  uploadProjectDeliveryFile(projectId: number | string, file: File): Observable<ProjectResponse> {
    const payload = new FormData();
    payload.append('file', file, file.name);

    return this.http
      .post<ProjectResponse>(`${this.freelancerBaseUrl}/project/${projectId}/delivery-file`, payload)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  downloadProjectDeliveryFile(
    projectId: number | string,
    scope: 'client' | 'freelancer' = 'client',
  ): Observable<Blob> {
    const baseUrl = scope === 'freelancer' ? this.freelancerBaseUrl : this.clientBaseUrl;
    return this.http.get(`${baseUrl}/project/${projectId}/delivery-file`, {
      responseType: 'blob',
    });
  }

  downloadProjectRequirementFile(projectId: number | string): Observable<Blob> {
    return this.http.get(`${this.freelancerBaseUrl}/project/${projectId}/requirement-file`, {
      responseType: 'blob',
    });
  }

  approveProjectDelivery(projectId: number | string): Observable<ProjectResponse> {
    return this.http
      .put<ProjectResponse>(`${this.clientBaseUrl}/project/${projectId}/approve-delivery`, null)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  requestProjectRevision(
    projectId: number | string,
    revisionMessage: string,
  ): Observable<ProjectResponse> {
    return this.http
      .put<ProjectResponse>(`${this.clientBaseUrl}/project/${projectId}/request-revision`, null, {
        params: { revisionMessage },
      })
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  acceptProjectRevision(projectId: number | string): Observable<ProjectResponse> {
    return this.http
      .put<ProjectResponse>(`${this.freelancerBaseUrl}/project/${projectId}/accept-revision`, null)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  getMyHireRequests(): Observable<HireRequestResponse[]> {
    return this.http.get<HireRequestResponse[]>(`${this.freelancerBaseUrl}/view-hire-request`);
  }

  acceptHireRequest(requestId: number): Observable<any> {
    return this.http
      .post(`${this.freelancerBaseUrl}/hire-request/${requestId}/accept`, {})
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  proposeHireRequestPrice(requestId: number, price: number): Observable<any> {
    return this.http
      .put(`${this.freelancerBaseUrl}/hire-request/${requestId}/price`, null, {
        params: { agreedPrice: String(price) },
      })
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  proposeClientHireRequestPrice(requestId: number, price: number): Observable<any> {
    return this.http
      .put(`${this.clientBaseUrl}/hire-request/${requestId}/price`, null, {
        params: { price: String(price) },
      })
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  acceptFreelancerHireRequestPrice(requestId: number, price?: number): Observable<any> {
    const options =
      price !== undefined && price !== null && Number.isFinite(Number(price))
        ? { params: { agreedPrice: String(price) } }
        : {};
    return this.http
      .put(`${this.freelancerBaseUrl}/hire-request/${requestId}/accept-price`, null, options)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  rejectFreelancerHireRequestPrice(requestId: number): Observable<any> {
    return this.http
      .put(`${this.freelancerBaseUrl}/hire-request/${requestId}/reject-price`, null)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  acceptHireRequestPrice(requestId: number, price?: number): Observable<any> {
    const options =
      price !== undefined && price !== null && Number.isFinite(Number(price))
        ? { params: { agreedPrice: String(price) } }
        : {};
    return this.http
      .put(`${this.clientBaseUrl}/hire-request/${requestId}/accept-price`, null, options)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  rejectHireRequestPrice(requestId: number): Observable<any> {
    return this.http
      .put(`${this.clientBaseUrl}/hire-request/${requestId}/reject-price`, null)
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  rejectHireRequest(requestId: number): Observable<any> {
    return this.http
      .post(`${this.freelancerBaseUrl}/hire-request/${requestId}/reject`, {})
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  cancelHireRequest(hireRequestId: number): Observable<HireRequestResponse> {
    return this.http
      .put<HireRequestResponse>(`${this.clientBaseUrl}/hire-request/${hireRequestId}/cancel`, {})
      .pipe(tap(() => this.notificationRefreshService.requestRefresh()));
  }

  getMyClientHireRequests(): Observable<HireRequestResponse[]> {
    return this.http.get<HireRequestResponse[]>(`${this.clientBaseUrl}/hire-requests`);
  }

  getMyClientProjects(): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(`${this.clientBaseUrl}/projects`);
  }

  private ensureSocketConnection(): Promise<void> {
    if (this.stompClient?.connected) {
      return Promise.resolve();
    }

    if (this.stompReadyPromise) {
      return this.stompReadyPromise;
    }

    this.stompReadyPromise = new Promise<void>((resolve, reject) => {
      try {
        const socketFactory = () => new SockJS(env.webSocketUrl ?? `${env.apiUrl}/ws`);

        const client = new Client({
          webSocketFactory: socketFactory,
          connectHeaders: this.buildConnectHeaders(),
          reconnectDelay: 5000,
          debug: () => undefined,
        });

        client.onConnect = () => {
          client.subscribe('/user/queue/messages', (message: IMessage) => {
            try {
              this.incomingMessageSubject.next(JSON.parse(message.body) as ChatMessageResponse);
            } catch {
              // ignore malformed payloads
            }
          });

          this.roomSubscriptions.clear();
          for (const roomId of this.subscribedRoomIds) {
            this.subscribeRoom(roomId);
          }

          resolve();
        };

        client.onStompError = () => {
          reject(new Error('STOMP connection failed'));
        };

        client.onWebSocketError = () => {
          reject(new Error('WebSocket connection failed'));
        };

        client.onWebSocketClose = () => {
          this.roomSubscriptions.clear();
        };

        this.stompClient = client;
        client.activate();
      } catch (error) {
        this.cleanupSocket();
        reject(error);
      }
    }).finally(() => {
      this.stompReadyPromise = null;
    });

    return this.stompReadyPromise;
  }

  private cleanupSocket(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.roomSubscriptions.clear();
  }

  private buildMessageBody(
    request: ChatMessageRequest,
  ): Pick<ChatMessageRequest, 'receiverId' | 'content'> {
    return {
      receiverId: request.receiverId,
      content: request.content ?? '',
    };
  }

  private buildAttachmentFormData(request: ChatMessageRequest): FormData {
    const payload = new FormData();
    payload.append('receiverId', String(request.receiverId));
    payload.append('content', request.content ?? '');

    if (request.file) {
      payload.append('file', request.file, request.file.name);
    }

    return payload;
  }

  private subscribeRoom(roomId: string): void {
    if (!this.stompClient?.connected || this.roomSubscriptions.has(roomId)) {
      return;
    }

    const subscription = this.stompClient.subscribe(
      `/topic/chat/rooms/${roomId}`,
      (message: IMessage) => {
        try {
          this.incomingMessageSubject.next(JSON.parse(message.body) as ChatMessageResponse);
        } catch {
          // ignore malformed payloads
        }
      },
    );

    this.roomSubscriptions.set(roomId, subscription);
  }

  private buildConnectHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private isCurrentUserMessage(message: ChatMessageResponse): boolean {
    const currentUserEmail = this.getCurrentUserEmail();
    if (currentUserEmail && message.senderEmail) {
      return message.senderEmail.trim().toLowerCase() === currentUserEmail;
    }

    const currentUserId = this.getCurrentUserId();
    return (
      currentUserId !== null &&
      message.senderId !== undefined &&
      Number(message.senderId) === currentUserId
    );
  }

  private getCurrentUserEmail(): string | null {
    const claims = this.getCurrentTokenClaims();
    const candidate = claims?.['email'] ?? claims?.['sub'] ?? claims?.['username'] ?? null;

    return typeof candidate === 'string' && candidate.includes('@')
      ? candidate.trim().toLowerCase()
      : null;
  }

  private getCurrentUserId(): number | null {
    const claims = this.getCurrentTokenClaims();
    if (!claims) return null;

    const candidate = claims['userId'] ?? claims['id'] ?? claims['sub'] ?? null;
    if (candidate === null || candidate === undefined) return null;
    const num = Number(candidate);
    return Number.isFinite(num) ? num : null;
  }

  private getCurrentTokenClaims(): Record<string, unknown> | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decoded = atob(padded);
      return JSON.parse(
        decodeURIComponent(
          decoded
            .split('')
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(''),
        ),
      ) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readUnreadFlag(scope: ChatUnreadScope): boolean {
    return localStorage.getItem(this.chatUnreadStorageKey(scope)) === 'true';
  }

  private writeUnreadFlag(scope: ChatUnreadScope, value: boolean): void {
    if (value) {
      localStorage.setItem(this.chatUnreadStorageKey(scope), 'true');
    } else {
      localStorage.removeItem(this.chatUnreadStorageKey(scope));
    }
  }

  private chatUnreadStorageKey(scope: ChatUnreadScope): string {
    return `foundit:${scope}:chat:unread`;
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
  CircleCheckBig,
  Clock3,
  Eye,
  LucideAngularModule,
  MessageCircle,
  Search,
  Star,
  User,
  UserRoundSearch
} from 'lucide-angular';
import { RouterLink } from "@angular/router";
import {
  ChatMessageResponse,
  ChatService,
  ConversationResponse,
  HireRequestResponse,
} from '../../../services/chat/chat.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfileResponse } from '../../../services/Freelancer/Profile/freelancer-profile.models';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in-progress'
  | 'in-review'
  | 'completed'
  | 'cancelled'
  | 'revision-requested';

interface Order {
  id: number;
  title: string;
  freelancerName: string;
  freelancerAvatar?: string;
  rating: number;
  dueDate: string;
  price: number;
  category: string;
  status: OrderStatus;
  projectId?: number;
  gigId?: number;
  roomId?: number;
  canViewGig: boolean;
  isPaid: boolean;
  freelancerId?: number;
  requestId?: number;
  progress?: number;
  reviewLeft?: boolean;
}

@Component({
  selector: 'app-client-my-order-component',
  templateUrl: './my-order.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
})
export class MyOrdersComponent {
  private readonly chatService = inject(ChatService);
  private readonly gigService = inject(GigService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly paymentService = inject(PaymentService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    ChevronLeft,
    CheckCircle2,
    UserRoundSearch,
    BriefcaseBusiness,
    Clock3,
    CircleCheckBig,
    BadgeDollarSign,
    Search,
    User,
    Star,
    CalendarDays,
    Eye,
    MessageCircle,
  };

  searchTerm = '';
  selectedFilter: 'all' | OrderStatus = 'all';
  isLoading = false;
  loadError = '';

  orders: Order[] = [];

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      requests: this.chatService.getMyClientHireRequests(),
      conversations: this.chatService.getConversations().pipe(catchError(() => of([]))),
      gigs: this.gigService.getClientGigs().pipe(catchError(() => of([]))),
      transactions: this.paymentService.getMyTransactions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ requests, conversations, gigs, transactions }) => {
        const visibleGigIds = this.toVisibleGigIds(gigs ?? []);
        const paidProjectIds = this.toPaidProjectIds(transactions ?? []);
        this.orders = (requests ?? [])
          .slice()
          .sort((a, b) => this.sortRequestsNewestFirst(a, b))
          .map((request) =>
            this.toOrder(request, conversations ?? [], visibleGigIds, paidProjectIds),
        );
        this.loadFreelancerProfiles();
        this.loadDeliveryProgress(requests ?? [], conversations ?? []);
        this.isLoading = false;
        this.refreshView();
      },
      error: () => {
        this.loadError = 'Unable to load your orders right now.';
        this.isLoading = false;
        this.refreshView();
      },
    });
  }

  private toOrder(
    request: HireRequestResponse,
    conversations: ConversationResponse[],
    visibleGigIds: Set<number>,
    paidProjectIds: Set<number>,
  ): Order {
    const status = this.toOrderStatus(request.status, request.projectStatus);
    const gigId = this.toNumber(request.gigId);
    const projectId = this.toNumber(request.projectId);
    const conversation = this.findOrderConversation(request, conversations);

    return {
      id: projectId ?? request.id,
      requestId: request.id,
      projectId,
      gigId,
      roomId: conversation?.roomId,
      canViewGig: gigId !== undefined && visibleGigIds.has(gigId),
      isPaid: projectId !== undefined && paidProjectIds.has(projectId),
      freelancerId: request.freelancerId,
      title: request.gigTitle || 'Untitled gig',
      freelancerName: request.freelancerId ? `Freelancer #${request.freelancerId}` : 'Freelancer',
      rating: 0,
      dueDate: request.deadline || request.createdAt || new Date().toISOString(),
      price: Number(request.projectAgreedPrice ?? request.agreedPrice ?? 0),
      category: 'Gig request',
      status,
      progress: this.calculateProgress(request),
    };
  }

  private toOrderStatus(status?: string, projectStatus?: string): OrderStatus {
    switch (this.normalizeStatus(projectStatus)) {
      case 'in_progress':
        return 'in-progress';
      case 'submitted':
      case 'delivered':
        return 'in-review';
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'revision_requested':
      case 'revision_rejected':
        return 'revision-requested';
    }

    switch (this.normalizeStatus(status)) {
      case 'accepted':
        return 'accepted';
      case 'rejected':
        return 'rejected';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'pending':
      default:
        return 'pending';
    }
  }

  private calculateProgress(request: HireRequestResponse, deliveryCount = 0): number {
    const projectStatus = this.normalizeStatus(request.projectStatus);
    if (projectStatus === 'completed') return 100;
    if (projectStatus === 'cancelled' || projectStatus === 'canceled') return 0;

    const hasDelivery =
      projectStatus === 'delivered' ||
      projectStatus === 'submitted' ||
      projectStatus === 'revision_requested' ||
      projectStatus === 'revision_rejected';

    const attempts = Math.max(deliveryCount, hasDelivery ? 1 : 0);
    return Math.min(attempts * 15, 90);
  }

  get filteredOrders(): Order[] {
    return this.orders.filter((order) => {
      const matchesFilter =
        this.selectedFilter === 'all' || order.status === this.selectedFilter;

      const keyword = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        order.title.toLowerCase().includes(keyword) ||
        order.freelancerName.toLowerCase().includes(keyword) ||
        order.category.toLowerCase().includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  get activeOrders(): number {
    return this.orders.filter((o) => o.status === 'accepted' || o.status === 'in-progress').length;
  }

  get completedOrders(): number {
    return this.orders.filter((o) => o.status === 'completed').length;
  }

  get totalSpent(): number {
    return this.orders
      .filter((o) => o.status !== 'cancelled')
      .filter((o) => o.status !== 'rejected' && o.status !== 'pending')
      .reduce((sum, order) => sum + order.price, 0);
  }

  getFilterCount(status: 'all' | OrderStatus): number {
    if (status === 'all') return this.orders.length;
    return this.orders.filter((order) => order.status === status).length;
  }

  selectFilter(status: 'all' | OrderStatus): void {
    this.selectedFilter = status;
    this.refreshView();
  }

  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'in-progress':
        return 'In Progress';
      case 'in-review':
        return 'In Review';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'revision-requested':
        return 'Revision Requested';
      default:
        return status;
    }
  }

  getStatusClasses(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'accepted':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'rejected':
        return 'bg-[#fee2e2] text-[#ef4444]';
      case 'in-progress':
        return 'bg-[#eef2ff] text-[#2563eb]';
      case 'in-review':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'completed':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'cancelled':
        return 'bg-[#fee2e2] text-[#ef4444]';
      case 'revision-requested':
        return 'bg-[#ffedd5] text-[#f97316]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  formatDueDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getViewLink(order: Order): unknown[] | null {
    return order.canViewGig && order.gigId ? ['/client/browse-gigs/gig', order.gigId] : null;
  }

  getChatLink(order: Order): unknown[] | null {
    return order.roomId ? ['/client', order.roomId, 'chat'] : null;
  }

  getFreelancerProfileLink(order: Order): unknown[] | null {
    return order.freelancerId ? ['/client/freelancer-view-details', order.freelancerId] : null;
  }

  approveOrder(order: Order): void {
    order.status = 'completed';
    order.progress = 100;
    this.refreshView();
  }

  requestRevision(order: Order): void {
    order.status = 'revision-requested';
    order.progress = 85;
    this.refreshView();
  }

  leaveReview(order: Order): void {
    order.reviewLeft = true;
    console.log('Review submitted');
    this.refreshView();
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  private loadFreelancerProfiles(): void {
    const freelancerIds = Array.from(
      new Set(
        this.orders
          .map((order) => order.freelancerId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    );

    for (const freelancerId of freelancerIds) {
      this.freelancerProfileService.getClientProfile(freelancerId).subscribe({
        next: (profile) => this.applyFreelancerProfile(freelancerId, profile),
        error: () => {
          // Keep request fallback data if the profile endpoint is unavailable.
        },
      });
    }
  }

  private applyFreelancerProfile(
    freelancerId: number,
    profile: FreelancerProfileResponse,
  ): void {
    const avatar = this.buildAvatarUrl(profile.profilePictureData, profile.profilePictureType);

    this.orders = this.orders.map((order) =>
      order.freelancerId === freelancerId
        ? {
            ...order,
            freelancerName: profile.freelancerName?.trim() || order.freelancerName,
            freelancerAvatar: avatar || order.freelancerAvatar,
            rating: Number(profile.rating ?? order.rating) || order.rating,
          }
        : order,
    );
    this.refreshView();
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

    if (!imageData) return undefined;
    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData)) return imageData;

    return `data:${contentType?.trim() || 'image/jpeg'};base64,${imageData}`;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private loadDeliveryProgress(
    requests: HireRequestResponse[],
    conversations: ConversationResponse[],
  ): void {
    const roomLookups = (requests ?? [])
      .map((request) => ({
        request,
        conversation: this.findOrderConversation(request, conversations),
      }))
      .filter(({ request, conversation }) => {
        const projectStatus = this.normalizeStatus(request.projectStatus);
        return (
          conversation?.roomId &&
          projectStatus !== 'completed' &&
          projectStatus !== 'cancelled' &&
          projectStatus !== 'canceled'
        );
      });

    for (const { request, conversation } of roomLookups) {
      this.chatService
        .getRoomMessages(conversation!.roomId)
        .pipe(catchError(() => of([])))
        .subscribe((messages) => {
          const deliveryCount = this.countProjectDeliveries(request, messages);
          const progress = this.calculateProgress(request, deliveryCount);
          const orderId = this.toNumber(request.projectId) ?? request.id;

          this.orders = this.orders.map((order) =>
            order.id === orderId ? { ...order, progress } : order,
          );
          this.refreshView();
        });
    }
  }

  private findOrderConversation(
    request: HireRequestResponse,
    conversations: ConversationResponse[],
  ): ConversationResponse | undefined {
    return conversations.find((conversation) => {
      if (request.projectId && conversation.projectId === request.projectId) return true;
      if (request.id && conversation.hireRequestId === request.id) return true;

      return (
        request.gigId !== undefined &&
        conversation.gigId === request.gigId &&
        (!conversation.projectId || conversation.projectId === request.projectId)
      );
    });
  }

  private countProjectDeliveries(
    request: HireRequestResponse,
    messages: ChatMessageResponse[],
  ): number {
    return (messages ?? []).filter((message) => {
      const payload = this.parseMessagePayload(message.content);
      if (!payload) return false;

      const isDelivery =
        payload['type'] === 'project_delivery' ||
        payload['messageType'] === 'project_delivery';
      const payloadProjectId = Number(payload['projectId']);

      return (
        isDelivery &&
        (!Number.isFinite(payloadProjectId) || payloadProjectId === request.projectId)
      );
    }).length;
  }

  private parseMessagePayload(content?: string): Record<string, unknown> | null {
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private toVisibleGigIds(gigs: GigResponseDTO[]): Set<number> {
    return new Set(
      (gigs ?? [])
        .map((gig) => this.toNumber(gig.gigId ?? gig.id))
        .filter((id): id is number => id !== undefined),
    );
  }

  private toPaidProjectIds(transactions: PaymentTransactionResponse[]): Set<number> {
    return new Set(
      (transactions ?? [])
        .filter((transaction) => String(transaction.status ?? '').toUpperCase() === 'PAID')
        .map((transaction) => this.toNumber(transaction.projectId))
        .filter((id): id is number => id !== undefined),
    );
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private sortRequestsNewestFirst(
    a: HireRequestResponse,
    b: HireRequestResponse,
  ): number {
    return (
      this.toTimestamp(b.updatedAt ?? b.createdAt) -
        this.toTimestamp(a.updatedAt ?? a.createdAt) ||
      Number(b.id ?? 0) - Number(a.id ?? 0)
    );
  }

  private toTimestamp(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private normalizeStatus(status?: string): string {
    return String(status ?? '').trim().toLowerCase().replace(/-/g, '_');
  }

  private refreshView(): void {
    window.setTimeout(() => this.cdr.detectChanges(), 0);
  }
}

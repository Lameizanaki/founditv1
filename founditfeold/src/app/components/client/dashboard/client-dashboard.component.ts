import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  LucideAngularModule,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  FileText,
  MessageCircle,
  MapPin,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Star,
  User,
  UserRoundSearch,
} from 'lucide-angular';
import {
  ChatService,
  ConversationResponse,
  HireRequestResponse,
} from '../../../services/chat/chat.service';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfileResponse } from '../../../services/Freelancer/Profile/freelancer-profile.models';
import {
  FreelancerProfile,
  FreelancerService,
} from '../../../services/Client/freelancer.service';
import { ImageUrlService } from '../../../services/media/image-url.service';
import { register } from 'swiper/element/bundle';

register();

type DashboardOrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in-progress'
  | 'in-review'
  | 'completed'
  | 'cancelled'
  | 'revision-requested';

interface DashboardOrder {
  id: number;
  title: string;
  freelancerId?: number;
  freelancerName: string;
  dueDate: string;
  price: number;
  status: DashboardOrderStatus;
  progress: number;
  projectId?: number;
  roomId?: number;
}

interface DashboardTransaction {
  id: number;
  projectId?: number;
  title: string;
  freelancerId?: number;
  freelancerName: string;
  freelancerAvatar?: string;
  amount: number;
  status: string;
  date: string;
}

interface FreelancerSlideCard {
  id: string | number;
  name: string;
  job: string;
  rating: number;
  location: string;
  experience: string;
  price: string;
  avatar?: string;
  link: unknown[];
}

@Component({
  selector: 'app-client-dashboard-component',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './client-dashboard.component.html',
  styles: [`
    swiper-container::part(pagination) {
      bottom: 0;
    }

    swiper-container::part(bullet-active) {
      background: #2563eb;
    }
  `],
})
export class ClientDashboardComponent {
  private readonly chatService = inject(ChatService);
  private readonly paymentService = inject(PaymentService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly freelancerService = inject(FreelancerService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);

  icons = {
    Search,
    SlidersHorizontal,
    BriefcaseBusiness,
    FileText,
    BadgeDollarSign,
    CircleCheckBig,
    ChevronRight,
    User,
    CalendarDays,
    MessageCircle,
    MapPin,
    UserRoundSearch,
    ReceiptText,
    Star,
  };

  isLoading = false;
  loadError = '';
  orders: DashboardOrder[] = [];
  transactions: DashboardTransaction[] = [];
  recommendedFreelancers: FreelancerProfile[] = [];
  readonly swiperAutoplay = {
    delay: 2200,
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
  };
  readonly swiperBreakpoints = {
    640: { slidesPerView: 2 },
    1024: { slidesPerView: 3 },
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  get activeOrders(): DashboardOrder[] {
    return this.orders.filter((order) =>
      ['accepted', 'in-progress', 'in-review', 'revision-requested'].includes(order.status),
    );
  }

  get activeOrdersCount(): number {
    return this.activeOrders.length;
  }

  get totalProjects(): number {
    return this.orders.length;
  }

  get pendingPayments(): number {
    return this.transactions
      .filter((transaction) => transaction.status === 'PENDING')
      .reduce((sum, transaction) => sum + this.toMoney(transaction.amount), 0);
  }

  get completedProjects(): number {
    return this.orders.filter((order) => order.status === 'completed').length;
  }

  get totalSpent(): number {
    return this.transactions
      .filter((transaction) => transaction.status === 'PAID')
      .reduce((sum, transaction) => sum + this.toMoney(transaction.amount), 0);
  }

  get inProgressSpend(): number {
    const activeProjectIds = new Set(
      this.activeOrders
        .map((order) => order.projectId)
        .filter((projectId): projectId is number => projectId !== undefined),
    );

    return this.transactions
      .filter((transaction) => transaction.status === 'PAID')
      .filter((transaction) =>
        transaction.projectId ? activeProjectIds.has(transaction.projectId) : false,
      )
      .reduce((sum, transaction) => sum + this.toMoney(transaction.amount), 0);
  }

  get completedSpend(): number {
    const completedProjectIds = new Set(
      this.orders
        .filter((order) => order.status === 'completed')
        .map((order) => order.projectId)
        .filter((projectId): projectId is number => projectId !== undefined),
    );

    return this.transactions
      .filter((transaction) => transaction.status === 'PAID')
      .filter((transaction) =>
        transaction.projectId ? completedProjectIds.has(transaction.projectId) : false,
      )
      .reduce((sum, transaction) => sum + this.toMoney(transaction.amount), 0);
  }

  get recentTransactions(): DashboardTransaction[] {
    return this.transactions.slice(0, 6);
  }

  get freelancerSlides(): FreelancerSlideCard[] {
    const realCards = this.recommendedFreelancers
      .map((freelancer) => this.toFreelancerSlideCard(freelancer))
      .filter((card): card is FreelancerSlideCard => card !== null);

    if (realCards.length) return realCards;

    return [
      {
        id: 'find-design',
        name: 'Find a designer',
        job: 'UI, branding, landing pages',
        rating: 4.9,
        location: 'Available now',
        experience: 'Browse talent',
        price: 'Explore',
        link: ['/client/browse-freelancers'],
      },
      {
        id: 'find-dev',
        name: 'Find a developer',
        job: 'Web apps, APIs, dashboards',
        rating: 4.8,
        location: 'Remote',
        experience: 'Top services',
        price: 'Explore',
        link: ['/client/browse-freelancers'],
      },
      {
        id: 'find-content',
        name: 'Find a creator',
        job: 'Writing, video, marketing',
        rating: 4.7,
        location: 'Ready to hire',
        experience: 'Fresh profiles',
        price: 'Explore',
        link: ['/client/browse-freelancers'],
      },
      {
        id: 'find-more',
        name: 'Find freelancers',
        job: 'Match with skilled professionals',
        rating: 5,
        location: 'FOUND IT',
        experience: 'Start browsing',
        price: 'View all',
        link: ['/client/browse-freelancers'],
      },
    ];
  }

  get firstChatLink(): unknown[] {
    const roomId = this.orders.find((order) => order.roomId)?.roomId;
    return roomId ? ['/client', roomId, 'chat'] : ['/client/chat'];
  }

  getOrderDetailLink(order: DashboardOrder): unknown[] {
    return ['/client/my-orders', order.id, 'view-detail'];
  }

  getOrderChatLink(order: DashboardOrder): unknown[] {
    return order.roomId ? ['/client', order.roomId, 'chat'] : ['/client/chat'];
  }

  getStatusLabel(status: DashboardOrderStatus): string {
    switch (status) {
      case 'in-progress':
        return 'In Progress';
      case 'in-review':
        return 'In Review';
      case 'revision-requested':
        return 'Revision Requested';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  getStatusClasses(status: DashboardOrderStatus): string {
    switch (status) {
      case 'in-progress':
      case 'accepted':
        return 'bg-[#eff6ff] text-[#2563eb]';
      case 'in-review':
      case 'pending':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'completed':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'cancelled':
      case 'rejected':
        return 'bg-[#fee2e2] text-[#ef4444]';
      default:
        return 'bg-[#ffedd5] text-[#f97316]';
    }
  }

  getTransactionStatusClasses(status: string): string {
    switch (status) {
      case 'PAID':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'PENDING':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-[#fee2e2] text-[#ef4444]';
      default:
        return 'bg-[#dbeafe] text-[#2563eb]';
    }
  }

  formatAmount(amount: unknown): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(this.toMoney(amount));
  }

  formatDate(date?: string | null): string {
    const parsed = new Date(date || '');
    if (Number.isNaN(parsed.getTime())) return 'No date';

    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getInitials(name?: string | null): string {
    const safeName = String(name || 'Freelancer').trim() || 'Freelancer';

    return safeName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  trackByOrderId(index: number, order: DashboardOrder): number {
    return order.id;
  }

  trackByTransactionId(index: number, transaction: DashboardTransaction): number {
    return transaction.id;
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      requests: this.chatService.getMyClientHireRequests().pipe(catchError(() => of([]))),
      conversations: this.chatService.getConversations().pipe(catchError(() => of([]))),
      transactions: this.paymentService.getMyTransactions().pipe(catchError(() => of([]))),
      freelancers: this.freelancerService.getActiveFreelancers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ requests, conversations, transactions, freelancers }) => {
        const typedRequests = requests as HireRequestResponse[];
        const typedConversations = conversations as ConversationResponse[];

        this.orders = typedRequests
          .slice()
          .sort((a, b) => this.toTimestamp(b.updatedAt ?? b.createdAt) - this.toTimestamp(a.updatedAt ?? a.createdAt))
          .map((request) => this.toDashboardOrder(request, typedConversations));

        this.transactions = (transactions as PaymentTransactionResponse[])
          .slice()
          .sort((a, b) => this.toTimestamp(b.paidAt ?? b.createdAt ?? '') - this.toTimestamp(a.paidAt ?? a.createdAt ?? ''))
          .map((transaction) => this.toDashboardTransaction(transaction, typedRequests));

        this.recommendedFreelancers = this.shuffleItems(
          Array.isArray(freelancers) ? (freelancers as FreelancerProfile[]) : [],
        ).slice(0, 10);
        this.loadFreelancerProfiles([...this.orders, ...this.transactions]);
        this.isLoading = false;
        this.refreshView();
      },
      error: () => {
        this.loadError = 'Unable to load your dashboard right now.';
        this.isLoading = false;
        this.refreshView();
      },
    });
  }

  private toDashboardOrder(
    request: HireRequestResponse,
    conversations: ConversationResponse[],
  ): DashboardOrder {
    const projectId = this.toNumber(request.projectId);
    const conversation = conversations.find((item) => {
      if (projectId && item.projectId === projectId) return true;
      if (request.id && item.hireRequestId === request.id) return true;
      return request.gigId !== undefined && item.gigId === request.gigId;
    });

    return {
      id: projectId ?? request.id,
      title: request.gigTitle || 'Untitled project',
      freelancerId: this.toNumber(request.freelancerId),
      freelancerName: request.freelancerId ? `Freelancer #${request.freelancerId}` : 'Freelancer',
      dueDate: request.deadline || request.updatedAt || request.createdAt || '',
      price: this.toMoney(request.projectAgreedPrice ?? request.agreedPrice),
      status: this.toOrderStatus(request.status, request.projectStatus),
      progress: this.calculateProgress(request.projectStatus),
      projectId,
      roomId: conversation?.roomId,
    };
  }

  private toDashboardTransaction(
    transaction: PaymentTransactionResponse,
    requests: HireRequestResponse[],
  ): DashboardTransaction {
    const projectId = this.toNumber(transaction.projectId);
    const request = requests.find((item) => this.toNumber(item.projectId) === projectId);

    return {
      id: this.toNumber(transaction.id) ?? projectId ?? this.toTimestamp(transaction.createdAt ?? ''),
      projectId,
      title: transaction.projectTitle || request?.gigTitle || 'Project payment',
      freelancerId: this.toNumber(transaction.freelancerId ?? request?.freelancerId),
      freelancerName:
        transaction.freelancerName?.trim() ||
        (request?.freelancerId ? `Freelancer #${request.freelancerId}` : 'Freelancer'),
      freelancerAvatar: this.buildAvatarUrl(
        transaction.freelancerProfilePictureData,
        transaction.freelancerProfilePictureType,
        transaction.freelancerProfilePictureUrl,
      ),
      amount: this.toMoney(transaction.amount),
      status: String(transaction.status ?? 'UNKNOWN').toUpperCase(),
      date: transaction.paidAt || transaction.createdAt || '',
    };
  }

  private loadFreelancerProfiles(items: Array<{ freelancerId?: number }>): void {
    const freelancerIds = Array.from(
      new Set(
        items
          .map((item) => item.freelancerId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    );

    for (const freelancerId of freelancerIds) {
      this.freelancerProfileService.getClientProfile(freelancerId).subscribe({
        next: (profile) => this.applyFreelancerProfile(freelancerId, profile),
        error: () => undefined,
      });
    }
  }

  private applyFreelancerProfile(
    freelancerId: number,
    profile: FreelancerProfileResponse,
  ): void {
    const freelancerName = profile.freelancerName?.trim();
    const avatar = this.buildAvatarUrl(
      profile.profilePictureData,
      profile.profilePictureType,
      profile.profilePictureUrl,
    );

    this.orders = this.orders.map((order) =>
      order.freelancerId === freelancerId
        ? { ...order, freelancerName: freelancerName || order.freelancerName }
        : order,
    );

    this.transactions = this.transactions.map((transaction) =>
      transaction.freelancerId === freelancerId
        ? {
            ...transaction,
            freelancerName: freelancerName || transaction.freelancerName,
            freelancerAvatar: avatar || transaction.freelancerAvatar,
          }
        : transaction,
    );

    this.refreshView();
  }

  private toOrderStatus(status?: string, projectStatus?: string): DashboardOrderStatus {
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
      default:
        return 'pending';
    }
  }

  private calculateProgress(projectStatus?: string): number {
    switch (this.normalizeStatus(projectStatus)) {
      case 'completed':
        return 100;
      case 'delivered':
      case 'submitted':
        return 90;
      case 'revision_requested':
      case 'revision_rejected':
        return 85;
      case 'in_progress':
        return 55;
      case 'cancelled':
      case 'canceled':
        return 0;
      default:
        return 15;
    }
  }

  private buildAvatarUrl(
    data?: string | Uint8Array | number[] | null,
    contentType?: string | null,
    url?: string | null,
  ): string | undefined {
    const imageUrl = this.imageUrlService.resolve(url);
    if (imageUrl) return imageUrl;

    let imageData = '';

    if (typeof data === 'string') {
      imageData = data.trim();
    } else if (data instanceof Uint8Array) {
      imageData = this.bytesToBase64(data);
    } else if (Array.isArray(data)) {
      imageData = this.bytesToBase64(new Uint8Array(data));
    }

    if (!imageData) return undefined;
    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData) || imageData.startsWith('/')) {
      return this.imageUrlService.resolve(imageData);
    }

    return `data:${contentType?.trim() || 'image/jpeg'};base64,${imageData}`;
  }

  getFreelancerId(freelancer: FreelancerProfile): string | number {
    const candidateIds = [
      freelancer.id,
      freelancer.profileId,
      freelancer.freelancerId,
      freelancer.freelancerProfileId,
    ];

    for (const candidateId of candidateIds) {
      if (candidateId !== undefined && candidateId !== null && Number.isFinite(Number(candidateId))) {
        return candidateId;
      }
    }

    return freelancer.freelancerName || 'unknown';
  }

  getFreelancerAvatar(freelancer: FreelancerProfile): string | undefined {
    return this.buildAvatarUrl(
      freelancer.profilePictureData as string | Uint8Array | number[] | null | undefined,
      freelancer.profilePictureType,
      freelancer.profilePictureUrl,
    );
  }

  getFreelancerLink(freelancer: FreelancerProfile): unknown[] {
    const freelancerId = this.getFreelancerId(freelancer);
    return freelancerId === 'unknown'
      ? ['/client/browse-freelancers']
      : ['/client/freelancer-view-details', freelancerId];
  }

  trackByFreelancerSlideId(index: number, card: FreelancerSlideCard): string | number {
    return card.id;
  }

  getFreelancerStartingPrice(freelancer: FreelancerProfile): number | null {
    const prices =
      freelancer.activeService
        ?.map((service) => Number(service.price))
        .filter((price) => Number.isFinite(price) && price > 0) || [];

    return prices.length ? Math.min(...prices) : null;
  }

  private shuffleItems<T>(items: T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }

  private toFreelancerSlideCard(freelancer: FreelancerProfile): FreelancerSlideCard | null {
    const freelancerId = this.getFreelancerId(freelancer);
    if (freelancerId === 'unknown') return null;

    const startingPrice = this.getFreelancerStartingPrice(freelancer);

    return {
      id: freelancerId,
      name: freelancer.freelancerName || 'Freelancer',
      job: freelancer.freelancerJob || 'Available freelancer',
      rating: Number(freelancer.rating || 0),
      location: freelancer.workLocation || 'Remote',
      experience: `${Number(freelancer.yearExperience || 0)} yrs exp`,
      price: startingPrice ? `$${startingPrice}+` : 'View',
      avatar: this.getFreelancerAvatar(freelancer),
      link: ['/client/freelancer-view-details', freelancerId],
    };
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private toTimestamp(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private toMoney(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeStatus(status?: string): string {
    return String(status ?? '').trim().toLowerCase().replace(/-/g, '_');
  }

  private refreshView(): void {
    window.setTimeout(() => this.cdr.detectChanges(), 0);
  }
}

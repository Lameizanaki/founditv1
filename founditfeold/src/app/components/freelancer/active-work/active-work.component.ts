import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { env } from '../../../../environments/env';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../services/Client/Profile/MeProfileResponse';
import {
  ChatMessageResponse,
  ChatService,
  ConversationResponse,
} from '../../../services/chat/chat.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';
import { ImageUrlService } from '../../../services/media/image-url.service';
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  DollarSign,
  Eye,
  LucideAngularModule,
  MessageSquare,
  Package,
  Search,
  TrendingUp,
  User,
  XCircle,
  AlertCircle
} from 'lucide-angular';

type WorkStatus =
  | 'In Progress'
  | 'In Review'
  | 'Completed'
  | 'Cancelled'
  | 'Revision Requested';

type FilterKey = 'all' | 'in-progress' | 'in-review' | 'completed' | 'cancelled';

type ProjectStatus =
  | 'PRICE_PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'REVISION_REQUESTED'
  | 'REVISION_REJECTED'
  | 'CANCELLED';

interface ProjectResponse {
  id: number;
  clientId?: number;
  clientName?: string;
  gigId?: number;
  gigTitle?: string;
  projectTitle?: string;
  agreedPrice?: number;
  startDate?: string;
  deadline?: string;
  deliveryMessage?: string;
  deliveryDate?: string;
  deliveryFileName?: string;
  status?: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkItem {
  id: number;
  clientId?: number;
  gigId?: number;
  canViewGig: boolean;
  roomId?: number;
  title: string;
  client: string;
  clientEmail?: string;
  clientCompany?: string;
  clientLocation?: string;
  clientAvatar?: string;
  dueDate: string;
  amount: number;
  category: string;
  status: WorkStatus;
  progress: number | null;
}

@Component({
  selector: 'app-freelancer-active-work-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './active-work.component.html',
})
export class ActiveWorkComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly profileService = inject(ProfileService);
  private readonly chatService = inject(ChatService);
  private readonly paymentService = inject(PaymentService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = env.apiUrl;

  searchTerm = '';
  activeFilter: FilterKey = 'all';
  loading = true;
  errorMessage = '';

  icons = {
    ChevronLeft,
    Search,
    Package,
    Clock3,
    CheckCircle2,
    CircleDollarSign,
    User,
    CalendarDays,
    DollarSign,
    Eye,
    MessageSquare,
    ArrowUpRight,
    TrendingUp,
  };

  filterTabs = [
    { key: 'all' as FilterKey, label: 'All' },
    { key: 'in-progress' as FilterKey, label: 'In Progress' },
    { key: 'in-review' as FilterKey, label: 'In Review' },
    { key: 'completed' as FilterKey, label: 'Completed' },
    { key: 'cancelled' as FilterKey, label: 'Cancelled' },
  ];

  works: WorkItem[] = [];

  ngOnInit(): void {
    this.loadMyWork();
  }

  get stats() {
    const activeCount = this.works.filter((item) => item.status === 'In Progress').length;
    const completedCount = this.works.filter((item) => item.status === 'Completed').length;
    const totalEarned = this.works
      .filter((item) => item.status === 'Completed')
      .reduce((sum, item) => sum + item.amount, 0);

    return [
      {
        label: 'Total Work',
        value: String(this.works.length),
        subtext: 'Fetched projects',
        icon: Package,
        iconBg: 'bg-[#f3f4f6]',
        iconColor: 'text-[#6b7280]',
      },
      {
        label: 'Active',
        value: String(activeCount),
        subtext: 'Currently running',
        icon: Clock3,
        iconBg: 'bg-[#f3e8ff]',
        iconColor: 'text-[#9333ea]',
      },
      {
        label: 'Completed',
        value: String(completedCount),
        subtext: 'Successfully delivered',
        icon: CheckCircle2,
        iconBg: 'bg-[#dcfce7]',
        iconColor: 'text-[#16a34a]',
      },
      {
        label: 'Total Earned',
        value: `$${totalEarned}`,
        subtext: 'Completed work',
        icon: CircleDollarSign,
        iconBg: 'bg-[#dcfce7]',
        iconColor: 'text-[#16a34a]',
      },
    ];
  }

  get filteredWorks(): WorkItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.works.filter((item) => {
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.client.toLowerCase().includes(term) ||
        (item.clientEmail ?? '').toLowerCase().includes(term) ||
        (item.clientCompany ?? '').toLowerCase().includes(term);

      const matchesFilter =
        this.activeFilter === 'all' ||
        (this.activeFilter === 'in-progress' && item.status === 'In Progress') ||
        (this.activeFilter === 'in-review' && item.status === 'In Review') ||
        (this.activeFilter === 'completed' && item.status === 'Completed') ||
        (this.activeFilter === 'cancelled' && item.status === 'Cancelled');

      return matchesSearch && matchesFilter;
    });
  }

  getFilterCount(key: FilterKey): number {
    if (key === 'all') return this.works.length;

    return this.works.filter((item) => {
      return (
        (key === 'in-progress' && item.status === 'In Progress') ||
        (key === 'in-review' && item.status === 'In Review') ||
        (key === 'completed' && item.status === 'Completed') ||
        (key === 'cancelled' && item.status === 'Cancelled')
      );
    }).length;
  }

  private loadMyWork(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      projects: this.http.get<ProjectResponse[]>(`${this.apiUrl}/freelancer/view-project`),
      conversations: this.chatService.getConversations().pipe(catchError(() => of([]))),
      gigs: this.http
        .get<GigResponseDTO[]>(`${this.apiUrl}/freelancer/gigs`)
        .pipe(catchError(() => of([]))),
      transactions: this.paymentService.getFreelancerTransactions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ projects, conversations, gigs, transactions }) => {
        const visibleProjects = (projects ?? []).filter((project) =>
          this.shouldShowInMyWork(project.status),
        ).sort((a, b) => this.sortProjectsNewestFirst(a, b));
        const visibleGigIds = this.toVisibleGigIds(gigs ?? []);
        const paidProjectIds = this.toPaidProjectIds(transactions ?? []);

        this.works = visibleProjects.map((project) =>
          this.mapProjectToWork(project, conversations ?? [], visibleGigIds, paidProjectIds),
        );
        this.loadClientProfiles();
        this.loadDeliveryProgress(visibleProjects, conversations ?? [], paidProjectIds);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load your active work right now.';
        this.works = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private shouldShowInMyWork(status?: ProjectStatus): boolean {
    return (
      status === 'IN_PROGRESS' ||
      status === 'SUBMITTED' ||
      status === 'DELIVERED' ||
      status === 'REVISION_REQUESTED' ||
      status === 'REVISION_REJECTED' ||
      status === 'COMPLETED' ||
      status === 'CANCELLED'
    );
  }

  private mapProjectToWork(
    project: ProjectResponse,
    conversations: ConversationResponse[],
    visibleGigIds: Set<number>,
    paidProjectIds: Set<number>,
  ): WorkItem {
    const isPaid = paidProjectIds.has(project.id);
    const status = this.mapStatus(project.status, isPaid);
    const conversation = this.findProjectConversation(project, conversations);
    const clientId = this.toNumber(project.clientId);
    const gigId = this.toNumber(project.gigId);

    return {
      id: project.id,
      clientId,
      gigId,
      canViewGig: gigId !== undefined && visibleGigIds.has(gigId),
      roomId: conversation?.roomId,
      title: project.projectTitle || project.gigTitle || `Project #${project.id}`,
      client: project.clientName || (clientId ? `Client #${clientId}` : 'Client'),
      dueDate: this.formatDate(project.deadline),
      amount: Number(project.agreedPrice ?? 0),
      category: project.gigTitle || 'Project',
      status,
      progress: this.calculateProgress(project, 0, isPaid),
    };
  }

  private findProjectConversation(
    project: ProjectResponse,
    conversations: ConversationResponse[],
  ): ConversationResponse | undefined {
    return conversations.find((conversation) => {
      if (project.id && conversation.projectId === project.id) return true;

      return (
        project.gigId !== undefined &&
        conversation.gigId === project.gigId &&
        (!conversation.projectId || conversation.projectId === project.id)
      );
    });
  }

  getGigLink(item: WorkItem): unknown[] | null {
    return item.canViewGig && item.gigId ? ['/freelancer/gigs', item.gigId] : null;
  }

  getChatLink(item: WorkItem): unknown[] | null {
    return item.roomId ? ['/freelancer', item.roomId, 'chat'] : null;
  }

  getProjectLink(item: WorkItem): unknown[] | null {
    return this.getChatLink(item);
  }

  getClientProfileLink(item: WorkItem): unknown[] | null {
    return item.clientId ? ['/freelancer/client', item.clientId, 'profile'] : null;
  }

  private loadClientProfiles(): void {
    const clientIds = Array.from(
      new Set(
        this.works
          .map((item) => item.clientId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    );

    for (const clientId of clientIds) {
      this.profileService.getFreelancerViewProfile(clientId).subscribe({
        next: (profile) => this.applyClientProfile(clientId, profile),
        error: () => {
          // Keep the project card usable with the name from ProjectDTO.
        },
      });
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

  private sortProjectsNewestFirst(a: ProjectResponse, b: ProjectResponse): number {
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

  private applyClientProfile(clientId: number, profile: MeProfileResponse): void {
    const profileClientId = this.toNumber(profile.clientId);
    if (profileClientId !== undefined && profileClientId !== clientId) {
      return;
    }

    const avatar = this.buildAvatarUrl(
      profile.profilePictureData ?? profile.avatar,
      profile.profilePictureType,
      profile.profilePictureUrl,
    );
    const displayName =
      profile.fullName?.trim() || profile.clientName?.trim() || this.findClientName(clientId);

    this.works = this.works.map((item) =>
      item.clientId === clientId
        ? {
            ...item,
            client: displayName || item.client,
            clientEmail: profile.email || profile.clientEmail || item.clientEmail,
            clientCompany: profile.company || item.clientCompany,
            clientLocation: profile.location || profile.workLocation || item.clientLocation,
            clientAvatar: avatar || item.clientAvatar,
          }
        : item,
    );
    this.cdr.detectChanges();
  }

  private findClientName(clientId: number): string {
    return this.works.find((item) => item.clientId === clientId)?.client ?? '';
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

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private mapStatus(status?: ProjectStatus, isPaid = false): WorkStatus {
    switch (status) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'SUBMITTED':
      case 'DELIVERED':
        return 'In Review';
      case 'COMPLETED':
        return isPaid ? 'Completed' : 'In Review';
      case 'CANCELLED':
        return 'Cancelled';
      case 'REVISION_REQUESTED':
      case 'REVISION_REJECTED':
        return 'Revision Requested';
      default:
        return 'In Progress';
    }
  }

  private calculateProgress(
    project: ProjectResponse,
    deliveryCount = 0,
    isPaid = false,
  ): number | null {
    if (project.status === 'CANCELLED') return null;
    if (isPaid) return 100;

    const hasDelivery =
      Boolean(project.deliveryDate || project.deliveryMessage || project.deliveryFileName) ||
      project.status === 'DELIVERED' ||
      project.status === 'SUBMITTED' ||
      project.status === 'COMPLETED' ||
      project.status === 'REVISION_REQUESTED' ||
      project.status === 'REVISION_REJECTED';

    const attempts = Math.max(deliveryCount, hasDelivery ? 1 : 0);
    return Math.min(attempts * 15, 90);
  }

  private loadDeliveryProgress(
    projects: ProjectResponse[],
    conversations: ConversationResponse[],
    paidProjectIds: Set<number>,
  ): void {
    const roomLookups = projects
      .map((project) => ({
        project,
        conversation: this.findProjectConversation(project, conversations),
      }))
      .filter(({ project, conversation }) => {
        return (
          conversation?.roomId &&
          !paidProjectIds.has(project.id) &&
          project.status !== 'CANCELLED'
        );
      });

    for (const { project, conversation } of roomLookups) {
      this.chatService
        .getRoomMessages(conversation!.roomId)
        .pipe(catchError(() => of([])))
        .subscribe((messages) => {
          const deliveryCount = this.countProjectDeliveries(project, messages);
          const progress = this.calculateProgress(
            project,
            deliveryCount,
            paidProjectIds.has(project.id),
          );

          this.works = this.works.map((item) =>
            item.id === project.id ? { ...item, progress } : item,
          );
          this.cdr.detectChanges();
        });
    }
  }

  private countProjectDeliveries(
    project: ProjectResponse,
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
        (!Number.isFinite(payloadProjectId) || payloadProjectId === project.id)
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

  private formatDate(value?: string): string {
    if (!value) return 'No deadline';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getStatusBadgeClass(status: WorkStatus): string {
    switch (status) {
      case 'In Progress':
        return 'bg-[#e8f0ff] text-[#2563eb]';
      case 'In Review':
        return 'bg-[#fef3c7] text-[#b45309]';
      case 'Completed':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'Cancelled':
        return 'bg-[#fee2e2] text-[#dc2626]';
      case 'Revision Requested':
        return 'bg-[#ffedd5] text-[#ea580c]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  getStatusIcon(status: WorkStatus) {
    switch (status) {
      case 'In Progress':
        return Clock3;
      case 'In Review':
        return AlertCircle;
      case 'Completed':
        return CheckCircle2;
      case 'Cancelled':
        return XCircle;
      case 'Revision Requested':
        return Briefcase;
      default:
        return Clock3;
    }
  }
}

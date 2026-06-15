import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  LucideAngularModule,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Package,
  Pencil,
  Flag,
  X,
  Send,
  SquarePen,
  Star,
  Wallet,
} from 'lucide-angular';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';
import { FreelancerRightSideBarResponse } from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { ChatService } from '../../../../services/chat/chat.service';
import { ImageUrlService } from '../../../../services/media/image-url.service';
import { AccountReportService } from '../../../../services/account/account-report.service';

type PackageType = 'basic' | 'standard' | 'premium';

interface GigPackage {
  key: PackageType;
  label: string;
  title: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
}

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

@Component({
  selector: 'app-client-freelancer-profile-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterLink],
  templateUrl: 'profile.component.html',
})
export class GigPriceCardComponent implements OnInit, OnChanges {
  private readonly profileService = inject(FreelancerProfileService);
  private readonly chatService = inject(ChatService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly accountReportService = inject(AccountReportService);

  @Input() freelancer: FreelancerProfile | null = null;
  @Input() freelancerId: number | string | null = null;

  readonly icons = {
    ChevronLeft,
    Star,
    MapPin,
    BriefcaseBusiness,
    Clock3,
    SquarePen,
    Pencil,
    Wallet,
    Calendar,
    Eye,
    CircleDollarSign,
    MessageCircle,
    Package,
    MoreVertical,
    Flag,
    X,
    Send,
  };

  profile = {
    name: 'Sarah Jenkins',
    title: 'Senior Web Developer & UI Designer',
    rating: 4.9,
    location: 'New York, USA',
    experience: '5+ years experience',
    workStatus: 'Available for work',
    startingPrice: 450,
    responseTime: 'Replies within 2 hours',
    availability: 'Available for new projects',
    profileViews: 1204,
    description:
      'Full-stack developer focused on scalable web applications, clean UI systems, and reliable project delivery.',
  };

  data = {
    price: 450,
    responseTime: 'Replies within 2 hours',
    availability: 'Available for new projects',
  };

  rightSidebar: FreelancerRightSideBarResponse | null = null;
  isOpeningChat = false;
  chatErrorMessage = '';
  isReportMenuOpen = false;
  isReportModalOpen = false;
  isSubmittingReport = false;
  reportMessage = '';
  reportErrorMessage = '';
  reportSuccessMessage = '';
  private incrementedFreelancerIds = new Set<number>();

  ngOnInit(): void {
    this.loadRightSidebar();
    this.incrementViewCount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['freelancerId'] || changes['freelancer']) {
      this.loadRightSidebar();
      this.incrementViewCount();
    }
  }

  private loadRightSidebar(): void {
    const freelancerId = this.getNumericFreelancerId();

    if (!freelancerId) {
      console.warn('input freelancerId=', this.freelancerId, '| profileId=', this.freelancer?.id);
      console.warn('stopped: no usable freelancer id');
      this.rightSidebar = null;
      return;
    }

    this.profileService.getClientRightSidebar(freelancerId).subscribe({
      next: (response) => {
        this.rightSidebar = response;
        this.cd.detectChanges();
      },
      error: () => {
        this.rightSidebar = null;
        this.cd.detectChanges();
      },
    });
  }

  private getNumericFreelancerId(): number | null {
    // Try numeric freelancerId from input
    if (this.freelancerId && !isNaN(Number(this.freelancerId))) {
      return Number(this.freelancerId);
    }

    // Try numeric IDs from freelancer object
    if (this.freelancer?.id) return this.freelancer.id;
    if (this.freelancer?.profileId) return this.freelancer.profileId;
    if (this.freelancer?.freelancerId) return this.freelancer.freelancerId;
    if (this.freelancer?.freelancerProfileId) return this.freelancer.freelancerProfileId;

    return null;
  }

  private resolveFreelancerId(): number | string | null {
    // First try numeric ID
    const numericId = this.getNumericFreelancerId();
    if (numericId) return numericId;

    // Fall back to route parameter for debugging purposes
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      return routeId;
    }

    return null;
  }

  private incrementViewCount(): void {
    const freelancerId = this.getNumericFreelancerId();

    if (!freelancerId) {
      console.warn('Cannot increment view count: no numeric freelancer id found');
      return;
    }

    if (this.incrementedFreelancerIds.has(freelancerId)) {
      return;
    }

    this.profileService.resolveCurrentClientId().subscribe({
      next: (clientId) => {
        if (!clientId) {
          console.warn('Cannot increment view count: no client id found from token or /client/me');
          return;
        }

        this.profileService.getClientRightSidebar(freelancerId).subscribe({
          next: (currentSidebar) => {
            const sideBarId =
              currentSidebar.id ?? currentSidebar.sideBarId ?? currentSidebar.sidebarId;
            if (!sideBarId) {
              console.warn('Cannot increment view count: sidebar id is missing');
              return;
            }

            this.profileService
              .incrementRightSidebarView(clientId, freelancerId, sideBarId)
              .subscribe({
                next: (updated) => {
                  this.rightSidebar = updated;
                  this.incrementedFreelancerIds.add(freelancerId);
                  this.cd.detectChanges();
                },
                error: (err) => {
                  console.error('Failed to increment view count:', err);
                },
              });
          },
          error: (err) => {
            console.error('Failed to get sidebar for view count:', err);
          },
        });
      },
      error: (err) => {
        console.error('Failed to resolve client id:', err);
      },
    });
  }

  get displayProfile() {
    if (this.freelancer) {
      return {
        name: this.freelancer.freelancerName,
        title: this.freelancer.freelancerJob,
        rating: this.freelancer.rating,
        location: this.freelancer.workLocation,
        experience: `${this.freelancer.yearExperience}+ years experience`,
        workStatus: 'Available for work',
        responseTime: 'Replies within 2 hours',
        availability: 'Available for new projects',
        profileViews: (this.rightSidebar?.viewCount ?? this.freelancer.reviews) || 0,
        description: this.freelancer.description || this.freelancer.about || '',
      };
    }
    return {
      name: this.profile.name,
      title: this.profile.title,
      rating: this.profile.rating,
      location: this.profile.location,
      experience: this.profile.experience,
      workStatus: this.profile.workStatus,
      responseTime: this.profile.responseTime,
      availability: this.profile.availability,
      profileViews: this.profile.profileViews,
      description: this.profile.description,
    };
  }

  get browseGigsLink(): unknown[] {
    return ['/client/browse-gigs'];
  }

  get profilePictureSrc(): string {
    if (!this.freelancer) {
      return '';
    }

    return this.imageUrlService.fromDataOrUrl(
      this.freelancer.profilePictureData ?? '',
      this.freelancer.profilePictureType,
      this.freelancer.profilePictureUrl,
    );
  }

  get browseGigsQueryParams(): Record<string, number> | null {
    const freelancerId = this.getNumericFreelancerId();
    return freelancerId ? { freelancerId } : null;
  }

  contactFreelancer(): void {
    const freelancerId = this.getNumericFreelancerId();
    if (!freelancerId || this.isOpeningChat) {
      return;
    }

    this.isOpeningChat = true;
    this.chatErrorMessage = '';

    this.chatService.openConversation({ freelancerId }).subscribe({
      next: (conversation) => {
        this.isOpeningChat = false;
        void this.router.navigate(['/client', conversation.roomId, 'chat']);
      },
      error: () => {
        this.isOpeningChat = false;
        this.chatErrorMessage = 'Unable to open chat with this freelancer right now.';
        this.cd.detectChanges();
      },
    });
  }

  openReportModal(): void {
    this.isReportMenuOpen = false;
    this.isReportModalOpen = true;
    this.reportErrorMessage = '';
    this.reportSuccessMessage = '';
    this.cd.detectChanges();
  }

  closeReportModal(): void {
    if (this.isSubmittingReport) return;

    this.isReportModalOpen = false;
    this.reportMessage = '';
    this.reportErrorMessage = '';
    this.reportSuccessMessage = '';
    this.cd.detectChanges();
  }

  submitReport(): void {
    if (!this.reportMessage.trim() || this.isSubmittingReport) return;

    this.isSubmittingReport = true;
    this.reportErrorMessage = '';
    this.reportSuccessMessage = '';
    const profile = this.displayProfile;

    this.accountReportService
      .submitReport({
        subject: `Report freelancer profile: ${profile.name || 'Freelancer'}`,
        message: [
          `Reported profile: ${profile.name || 'Unknown freelancer'}`,
          `Profile id: ${this.resolveFreelancerId() ?? 'Unknown'}`,
          `Issue: ${this.reportMessage.trim()}`,
        ].join('\n'),
      })
      .subscribe({
        next: () => {
          this.isSubmittingReport = false;
          this.reportMessage = '';
          this.reportSuccessMessage = 'Report sent to admin for review.';
          this.cd.detectChanges();
        },
        error: () => {
          this.isSubmittingReport = false;
          this.reportErrorMessage = 'Unable to send report right now.';
          this.cd.detectChanges();
        },
      });
  }

  goBack(): void {
    console.log('Back');
  }

  editProfile(): void {
    console.log('Edit profile');
  }

  updateAvailability(): void {
    console.log('Update availability');
  }

  updateRate(): void {
    console.log('Update rate');
  }

  editDescription(): void {
    console.log('Edit description');
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  LucideAngularModule,
  MapPin,
  MessageSquare,
  Star,
} from 'lucide-angular';
import { GigService } from '../../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import {
  FreelancerProfileResponse,
  FreelancerRightSideBarResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { GigDetailStateService } from '../../../client/gig-view-details/gig-detail-state.service';
import { ImageUrlService } from '../../../../services/media/image-url.service';

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
  selector: 'app-freelancer-gig-content-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'content.component.html',
})
export class GigPriceCardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gigService = inject(GigService);
  private readonly profileService = inject(FreelancerProfileService);
  private readonly detailState = inject(GigDetailStateService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  readonly icons = {
    ArrowLeft,
    ArrowRight,
    Star,
    Clock3,
    FileText,
    CheckCircle2,
    MessageSquare,
    MapPin,
  };

  selectedPackage: PackageType = 'basic';

  gig: GigResponseDTO | null = null;
  freelancerProfile: FreelancerProfileResponse | null = null;
  rightSidebar: FreelancerRightSideBarResponse | null = null;
  isLoading = false;
  isProfileLoading = false;
  errorMessage = '';

  packages: Record<PackageType, GigPackage> = {
    basic: {
      key: 'basic',
      label: 'Basic',
      title: 'Basic',
      price: 200,
      deliveryDays: 7,
      revisions: '2 revisions',
      features: ['Source files', '7-day delivery', '2 revisions'],
    },
    standard: {
      key: 'standard',
      label: 'Standard',
      title: 'Standard',
      price: 400,
      deliveryDays: 4,
      revisions: '5 revisions',
      features: ['Source files', '4-day delivery', '5 revisions', 'Commercial use'],
    },
    premium: {
      key: 'premium',
      label: 'Premium',
      title: 'Premium',
      price: 700,
      deliveryDays: 2,
      revisions: '10 revisions',
      features: [
        'Source files',
        '2-day delivery',
        'Unlimited revisions',
        'Commercial use',
        'Priority support',
      ],
    },
  };

  readonly fallbackImage = 'assets/images/whiteBg.png';

  galleryImages: GalleryImage[] = [];

  selectedImage: GalleryImage = { id: 0, src: '', alt: '' };

  ngOnInit(): void {
    this.loadGig();
  }

  loadGig(): void {
    const gigId = this.route.snapshot.paramMap.get('id');

    if (!gigId) {
      this.errorMessage = 'Missing gig id.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.gigService.getClientGigById(gigId).subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.gig = response;
          this.detailState.setGig(response);
          this.galleryImages = this.buildGalleryImages(response);
          this.selectedImage = this.galleryImages[0] ?? { id: 0, src: this.fallbackImage, alt: '' };
          this.selectedPackage = this.resolvePackageType(response.paymentChoice);
          this.isLoading = false;
          this.cdr.markForCheck();
        });

        this.loadFreelancerProfile();

        const freelancerId = Number(response.freelancerId ?? response.userId ?? response.createdBy);
        if (freelancerId) {
          this.loadRightSidebar(freelancerId);
        }
      },
      error: () => {
        this.zone.run(() => {
          this.errorMessage = 'Failed to load gig details.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  loadFreelancerProfile(): void {
    const freelancerId = Number(this.gig?.freelancerId ?? this.gig?.userId ?? this.gig?.createdBy);

    if (!freelancerId) {
      return;
    }

    this.isProfileLoading = true;

    this.profileService.getClientProfile(freelancerId).subscribe({
      next: (profile) => {
        this.zone.run(() => {
          this.freelancerProfile = profile;
          this.detailState.setProfile(profile);
          this.isProfileLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.freelancerProfile = null;
          this.detailState.setProfile(null);
          this.isProfileLoading = false;
          this.cdr.markForCheck();
        });
      },
    });

    this.profileService.getClientExperience(freelancerId).subscribe({
      next: (experiences) => {
        this.zone.run(() => {
          this.detailState.setExperiences(experiences);
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.detailState.setExperiences([]);
          this.cdr.markForCheck();
        });
      },
    });
  }

  loadRightSidebar(freelancerId: number): void {
    this.profileService.getClientRightSidebar(freelancerId).subscribe({
      next: (sidebar) => {
        this.zone.run(() => {
          this.rightSidebar = sidebar;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.rightSidebar = null;
          this.cdr.markForCheck();
        });
      },
    });
  }

  get gigTitle(): string {
    return this.gig?.serviceTitle?.trim() || 'Gig Details';
  }

  get sellerName(): string {
    return (
      this.freelancerProfile?.freelancerName?.trim() ||
      this.gig?.freelancerName?.trim() ||
      this.gig?.seller?.trim() ||
      'Freelancer'
    );
  }

  get gigCategory(): string {
    return this.gig?.category?.trim() || 'General';
  }

  get freelancerAvatarSrc(): string {
    const imageUrl = this.imageUrlService.resolve(this.freelancerProfile?.profilePictureUrl);
    if (imageUrl) return imageUrl;

    const imageData = this.freelancerProfile?.profilePictureData;

    if (!imageData) {
      return '';
    }

    if (imageData instanceof Uint8Array) {
      const binary = Array.from(imageData)
        .map((byte) => String.fromCharCode(byte))
        .join('');

      return `data:${this.freelancerProfile?.profilePictureType?.trim() || 'image/jpeg'};base64,${btoa(binary)}`;
    }

    if (typeof imageData === 'string' && imageData.trim().length > 0) {
      return `data:${this.freelancerProfile?.profilePictureType?.trim() || 'image/jpeg'};base64,${imageData.trim()}`;
    }

    return '';
  }

  get gigPackage(): GigPackage {
    const price = this.toNumber(this.gig?.price);
    const deliveryDays = this.toNumber(this.gig?.deliveryDate);
    const revisions = this.gig?.rivision?.trim() ? `${this.gig?.rivision} revisions` : 'N/A';
    const features = [
      ...(this.gig?.tags ?? []),
      this.gig?.packageDescription?.trim() || 'Includes source files',
      this.gigCategory,
    ].filter((feature): feature is string => Boolean(feature));

    return {
      key: this.selectedPackage,
      label: this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1),
      title: this.gig?.packageDescription?.trim() || this.gigTitle,
      price,
      deliveryDays,
      revisions,
      features,
    };
  }

  private buildGalleryImages(gig: GigResponseDTO): GalleryImage[] {
    const images: GalleryImage[] = [];

    const mainImage = this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    );
    if (mainImage) {
      images.push({
        id: 1,
        src: mainImage,
        alt: gig.gigMainImageName?.trim() || gig.serviceTitle || 'Main gig preview',
      });
    }

    gig.coverImages?.forEach((image, index) => {
      const coverImage = this.imageUrlService.fromDataOrUrl(
        image.gigCoverImageData,
        image.gigCoverImageContentType,
        image.gigCoverImageUrl,
      );
      if (coverImage) {
        images.push({
          id: index + 2,
          src: coverImage,
          alt: image.gigCoverImageName?.trim() || `Thumbnail ${index + 1}`,
        });
      }
    });

    return images.length > 0
      ? images
      : [{ id: 1, src: this.fallbackImage, alt: 'Main gig preview' }];
  }

  private resolvePackageType(value: string | undefined): PackageType {
    const normalized = value?.trim().toLowerCase();

    if (normalized === 'premium') {
      return 'premium';
    }

    if (normalized === 'standard') {
      return 'standard';
    }

    return 'basic';
  }

  private toImageSource(data: string, contentType?: string | null): string {
    return this.imageUrlService.fromDataOrUrl(data, contentType);
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  get currentPackage(): GigPackage {
    return this.gigPackage;
  }

  selectPackage(type: PackageType): void {
    this.selectedPackage = type;
  }

  selectImage(image: GalleryImage): void {
    this.selectedImage = image;
  }

  previousImage(): void {
    if (this.galleryImages.length <= 1) {
      return;
    }

    const currentIndex = this.galleryImages.findIndex(
      (image) => image.id === this.selectedImage.id,
    );
    const previousIndex = currentIndex <= 0 ? this.galleryImages.length - 1 : currentIndex - 1;
    this.selectedImage = this.galleryImages[previousIndex];
  }

  nextImage(): void {
    if (this.galleryImages.length <= 1) {
      return;
    }

    const currentIndex = this.galleryImages.findIndex(
      (image) => image.id === this.selectedImage.id,
    );
    const nextIndex = currentIndex >= this.galleryImages.length - 1 ? 0 : currentIndex + 1;
    this.selectedImage = this.galleryImages[nextIndex];
  }

  goBack(): void {
    window.history.back();
  }

  orderNow(): void {
    void this.router.navigate(['/auth/sign-in']);
  }

  contactFreelancer(): void {
    void this.router.navigate(['/auth/sign-in']);
  }
}

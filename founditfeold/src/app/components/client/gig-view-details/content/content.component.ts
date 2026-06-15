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
import { GigCoverImagesDTO } from '../../../../services/Freelancer/Gig/GigCoverImages';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import {
  FreelancerProfileResponse,
  FreelancerRightSideBarResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { GigDetailStateService } from '../gig-detail-state.service';
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

type StoredPricingPackage = {
  type?: unknown;
  price?: unknown;
  deliveryDate?: unknown;
  rivision?: unknown;
  packageDescription?: unknown;
};

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

@Component({
  selector: 'app-client-content-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'content.component.html',
})
export class GigPriceCardComponent {
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

  gig: GigResponseDTO | null = null;
  freelancerProfile: FreelancerProfileResponse | null = null;
  rightSidebar: FreelancerRightSideBarResponse | null = null;
  isLoading = false;
  isProfileLoading = false;
  errorMessage = '';

  selectedPackage: PackageType = 'basic';

  galleryImages: GalleryImage[] = [];

  selectedImage: GalleryImage = { id: 0, src: '', alt: '' };
  freelancerAvatarSrc = '';

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
      next: (response: GigResponseDTO) => {
        this.zone.run(() => {
          this.gig = response;
          this.detailState.setGig(response);
          this.galleryImages = this.buildGalleryImages(response);
          this.selectedImage = this.galleryImages[0] ?? { id: 0, src: '', alt: '' };
          this.selectedPackage = this.resolvePackageType(response.paymentChoice);
          this.isLoading = false;
          this.cdr.markForCheck();
        });

        this.loadFreelancerProfile();
        // also load right sidebar once gig loaded
        const fid = Number(response.freelancerId ?? response.userId ?? response.createdBy);
        if (fid) {
          this.loadRightSidebar(fid);
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
          this.freelancerAvatarSrc = this.toProfileImageSource(profile);
          this.isProfileLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.freelancerProfile = null;
          this.detailState.setProfile(null);
          this.freelancerAvatarSrc = '/assets/images/whiteBg.png';
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

    // also load right sidebar info
    this.loadRightSidebar(freelancerId);
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

  get gigDescription(): string {
    return this.gig?.serviceDescription?.trim() || this.gig?.packageDescription?.trim() || '';
  }

  get gigTags(): string[] {
    return this.gig?.tags ?? [];
  }

  get gigPackage(): GigPackage {
    const pkg = this.getPackageForType(this.selectedPackage);
    const revisions = pkg.revisions > 0 ? `${pkg.revisions} revisions` : 'N/A';
    const features = [
      ...(this.gig?.tags ?? []),
      pkg.title || 'Includes source files',
      this.gigCategory,
    ].filter((feature): feature is string => Boolean(feature));

    return {
      key: this.selectedPackage,
      label: this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1),
      title: pkg.title || this.gigTitle,
      price: pkg.price,
      deliveryDays: pkg.deliveryDays,
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

    gig.coverImages?.forEach((image: GigCoverImagesDTO, index: number) => {
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

    return images;
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

  private toProfileImageSource(profile: FreelancerProfileResponse): string {
    const imageUrl = this.imageUrlService.resolve(profile.profilePictureUrl);
    if (imageUrl) return imageUrl;

    const imageData = profile.profilePictureData;

    if (imageData instanceof Uint8Array) {
      const binary = Array.from(imageData)
        .map((byte) => String.fromCharCode(byte))
        .join('');

      return `data:${profile.profilePictureType?.trim() || 'image/jpeg'};base64,${btoa(binary)}`;
    }

    if (typeof imageData === 'string' && imageData.trim().length > 0) {
      return `data:${profile.profilePictureType?.trim() || 'image/jpeg'};base64,${imageData.trim()}`;
    }

    return '';
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

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  private getPackageForType(type: PackageType): {
    title: string;
    price: number;
    deliveryDays: number;
    revisions: number;
  } {
    const packages = this.getStoredPricingPackages();
    const matched = packages.find((item) => this.resolvePackageType(String(item.type)) === type);

    if (matched) {
      return {
        title: this.toStringValue(matched.packageDescription),
        price: this.toNumber(matched.price),
        deliveryDays: this.toNumber(matched.deliveryDate),
        revisions: this.toNumber(matched.rivision),
      };
    }

    return {
      title: this.gig?.packageDescription?.trim() || this.gigTitle,
      price: this.toNumber(this.gig?.price),
      deliveryDays: this.toNumber(this.gig?.deliveryDate),
      revisions: this.toNumber(this.gig?.rivision),
    };
  }

  private getStoredPricingPackages(): StoredPricingPackage[] {
    const raw = this.gig?.pricingPackagesJson;
    if (!raw?.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is StoredPricingPackage => Boolean(item) && typeof item === 'object',
          )
        : [];
    } catch {
      return [];
    }
  }

  private toStringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  get currentPackage(): GigPackage {
    return this.currentPackage;
  }

  selectPackage(type: PackageType): void {
    this.selectedPackage = type;
  }

  selectImage(image: GalleryImage): void {
    this.selectedImage = image;
  }

  goBack(): void {
    window.history.back();
  }

  orderNow(): void {
    const gigId = this.route.snapshot.paramMap.get('id');
    const price = this.gigPackage.price;

    const orderPayload = {
      gig: this.gig,
      gigId: gigId ? Number(gigId) : null,
      freelancer: this.freelancerProfile,
      package: this.selectedPackage,
      price,
      mode: 'request',
    };

    // navigate to confirm order page with order data in navigation state
    this.router.navigate(['confirm-order'], {
      relativeTo: this.route,
      state: { order: orderPayload },
    });
  }

  contactFreelancer(): void {
    const freelancerId = Number(this.gig?.freelancerId ?? this.gig?.userId ?? this.gig?.createdBy);
    const gigId = Number(this.route.snapshot.paramMap.get('id') ?? this.gig?.gigId);

    if (!freelancerId || !gigId) {
      return;
    }

    void this.router.navigate(['/client/chat'], {
      state: {
        freelancerId,
        gigId,
      },
    });
  }
}

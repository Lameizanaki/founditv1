import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  LucideAngularModule,
  Pause,
  Pencil,
  Play,
  Star,
  Trash2,
} from 'lucide-angular';
import { GigCoverImagesDTO } from '../../../services/Freelancer/Gig/GigCoverImages';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { ImageUrlService } from '../../../services/media/image-url.service';

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

type GigStatus = 'active' | 'paused' | 'disabled';

@Component({
  selector: 'app-freelancer-gig-details',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gig-details.component.html',
})
export class FreelancerGigDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gigService = inject(GigService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    ArrowLeft,
    Star,
    Clock3,
    FileText,
    CheckCircle2,
    Pencil,
    Pause,
    Play,
    Trash2,
  };

  gig: GigResponseDTO | null = null;
  galleryImages: GalleryImage[] = [];
  coverImages: GalleryImage[] = [];
  selectedImage: GalleryImage | null = null;
  coverImageSlots = [0, 1, 2];
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadGig();
  }

  loadGig(): void {
    const gigId = this.route.snapshot.paramMap.get('gigId');
    if (!gigId) {
      this.errorMessage = 'Missing gig id.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.gigService.getMyGigById(gigId).subscribe({
      next: (gig) => {
        this.gig = gig;
        this.galleryImages = this.buildGalleryImages(gig);
        this.coverImages = this.buildCoverImages(gig);
        this.selectedImage = this.galleryImages[0] ?? null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load this gig.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get gigId(): number | string | null {
    return this.gig?.gigId ?? this.gig?.id ?? null;
  }

  get status(): GigStatus {
    const value = String(this.gig?.status ?? 'active').toLowerCase();
    if (value === 'paused') return 'paused';
    if (value === 'disabled') return 'disabled';
    return 'active';
  }

  get statusLabel(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  get price(): number {
    const numeric = Number(this.gig?.price ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  get packageName(): string {
    const choice = String(this.gig?.paymentChoice ?? '')
      .trim()
      .toLowerCase();
    if (choice === 'basic') return 'Basic';
    if (choice === 'standard') return 'Standard';
    if (choice === 'premium') return 'Premium';
    return this.gig?.paymentChoice?.trim() || 'Package';
  }

  get deliveryDays(): number {
    const numeric = Number(this.gig?.deliveryDate ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  get revisions(): string {
    return this.gig?.rivision ? `${this.gig.rivision} revisions` : 'No revision set';
  }

  get features(): string[] {
    return [...(this.gig?.tags ?? []), this.gig?.category, this.gig?.packageDescription].filter(
      (value): value is string => Boolean(value?.trim()),
    );
  }

  get hasGallery(): boolean {
    return this.galleryImages.length > 0;
  }

  get coverImageCount(): number {
    return this.coverImages.length;
  }

  get summaryPills(): Array<{ label: string; value: string }> {
    return [
      { label: 'Category', value: this.gig?.category?.trim() || 'General' },
      { label: 'Package', value: this.packageName },
      { label: 'Delivery', value: this.deliveryDays > 0 ? `${this.deliveryDays} days` : 'Not set' },
      { label: 'Revisions', value: this.gig?.rivision ? `${this.gig.rivision}` : 'Not set' },
    ];
  }

  get descriptionText(): string {
    return this.gig?.serviceDescription || this.gig?.packageDescription || 'No description yet.';
  }

  editGig(): void {
    if (!this.gigId) return;
    void this.router.navigate(['/freelancer/create-new-service'], {
      queryParams: { editGigId: this.gigId },
    });
  }

  togglePause(): void {
    if (!this.gigId || !this.gig) return;

    this.isSaving = true;
    this.errorMessage = '';
    const request =
      this.status === 'paused'
        ? this.gigService.resumeGig(this.gigId)
        : this.gigService.pauseGig(this.gigId);

    request.subscribe({
      next: (updated) => {
        this.gig = updated;
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to update gig visibility.';
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  disableGig(): void {
    if (!this.gigId) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.gigService.disableGig(this.gigId).subscribe({
      next: () => {
        this.isSaving = false;
        void this.router.navigate(['/freelancer/my-services']);
      },
      error: () => {
        this.errorMessage = 'Unable to disable this gig.';
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectImage(image: GalleryImage): void {
    this.selectedImage = image;
    this.cdr.detectChanges();
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
        alt: gig.gigMainImageName || gig.serviceTitle || 'Gig cover',
      });
    }

    images.push(...this.buildCoverImages(gig));

    return images;
  }

  private buildCoverImages(gig: GigResponseDTO): GalleryImage[] {
    const covers = this.readCoverImages(gig);

    return covers
      .map((image: GigCoverImagesDTO, index) => {
        const src = this.imageUrlService.fromDataOrUrl(
          image.gigCoverImageData,
          image.gigCoverImageContentType,
          image.gigCoverImageUrl,
        );
        if (src) {
          return {
            id: index + 2,
            src,
            alt: image.gigCoverImageName || `Gallery image ${index + 1}`,
          };
        }
        return null;
      })
      .filter((image): image is GalleryImage => image !== null);
  }

  private readCoverImages(gig: GigResponseDTO): GigCoverImagesDTO[] {
    const record = gig as GigResponseDTO & {
      galleryCoverImages?: GigCoverImagesDTO[];
      gigCoverImages?: GigCoverImagesDTO[];
    };

    return record.coverImages ?? record.galleryCoverImages ?? record.gigCoverImages ?? [];
  }

}

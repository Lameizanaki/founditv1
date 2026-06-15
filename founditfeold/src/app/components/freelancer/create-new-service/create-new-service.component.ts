import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Check, FileImage } from 'lucide-angular';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { GigRequestDTO } from '../../../services/Freelancer/Gig/GigRequest';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { firstValueFrom } from 'rxjs';
import { ImageUrlService } from '../../../services/media/image-url.service';

type PackageType = 'basic' | 'standard' | 'premium';
type PricingPackage = {
  price: number;
  delivery: number;
  revisions: number;
  description: string;
};

@Component({
  selector: 'app-freelancer-create-new-service-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './create-new-service.component.html',
})
export class CreateServiceComponent implements OnInit {
  private gigService = inject(GigService);
  private profileService = inject(FreelancerProfileService);
  private imageUrlService = inject(ImageUrlService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  isEditMode = false;

  icons = {
    ChevronLeft,
    Check,
    FileImage,
  };

  // Store gigId after creation
  gigId: number | null = null;

  // Step 1: Service Overview
  overview = {
    title: '',
    category: '',
    description: '',
    tags: '',
  };

  // Step 2: Pricing Packages
  packages = {
    basic: {
      price: 100,
      delivery: 7,
      revisions: 2,
      description: 'Basic package',
    },
    standard: {
      price: 200,
      delivery: 5,
      revisions: 4,
      description: 'Standard package',
    },
    premium: {
      price: 300,
      delivery: 3,
      revisions: 6,
      description: 'Premium package',
    },
  };

  selectedPackage: PackageType = 'standard';

  // Step 3: Images
  mainImage: File | null = null;
  coverImages: File[] = [];
  coverImageSlots = [0, 1, 2];
  mainImagePreview: string | null = null;
  coverImagePreviews: string[] = [];

  ngOnInit(): void {
    const editGigId = this.route.snapshot.queryParamMap.get('editGigId');
    if (!editGigId) {
      return;
    }

    this.isEditMode = true;
    this.isLoading = true;
    this.gigId = Number(editGigId);

    this.gigService.getMyGigById(editGigId).subscribe({
      next: (gig) => {
        this.populateFromGig(gig);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load this service for editing.';
        this.isLoading = false;
      },
    });
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.submitOverview();
    } else if (this.currentStep === 2) {
      this.submitPricing();
    } else if (this.currentStep === 3) {
      this.submitPublish();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Step 1: Submit service overview
   * Creates a new gig with service details
   */
  submitOverview(): void {
    if (!this.validateOverview()) {
      return;
    }

    console.log('[CreateService] Step 1 submitOverview start', {
      currentStep: this.currentStep,
      title: this.overview.title,
      category: this.overview.category,
    });

    const previousStep = this.currentStep;
    this.currentStep = 2;
    this.isLoading = true;
    this.errorMessage = '';

    const request: GigRequestDTO = {
      serviceTitle: this.overview.title,
      category: this.overview.category,
      serviceDescription: this.overview.description,
      tags: this.overview.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      paymentChoice: '',
      price: '',
      deliveryDate: '',
      rivision: '',
      packageDescription: '',
    };

    if (this.isEditMode && this.gigId) {
      this.gigService.updateOverview(this.gigId, request).subscribe({
        next: (response: GigResponseDTO) => {
          this.handleOverviewSaved(response, null, previousStep);
        },
        error: (error: any) => this.handleOverviewError(error, previousStep),
      });
      return;
    }

    this.gigService.createService(request).subscribe({
      next: (response) => {
        this.handleOverviewSaved(response.body, response.headers.get('Location'), previousStep);
      },
      error: (error: any) => this.handleOverviewError(error, previousStep),
    });
  }

  private handleOverviewSaved(
    responseBody: unknown,
    locationHeader: string | null,
    previousStep: number,
  ): void {
    console.log('[CreateService] overview saved');

    const createdGigId =
      this.extractGigId(responseBody) || this.extractGigIdFromLocation(locationHeader);
    if (createdGigId !== undefined && createdGigId !== null) {
      const numericCreatedGigId = this.toNumericGigId(createdGigId);
      if (numericCreatedGigId !== null) {
        this.gigId = numericCreatedGigId;
        this.isLoading = false;
        this.currentStep = 2;
        return;
      }
    }

    if (this.isEditMode && this.gigId) {
      this.isLoading = false;
      this.currentStep = 2;
      return;
    }

    console.warn(
      '[CreateService] createService response did not include a usable gigId; falling back to profile lookup',
    );
    this.profileService.getMyProfile().subscribe({
      next: async (profileResponse) => {
        const fallbackGigId = await this.resolveGigIdWithRetry(profileResponse);
        if (fallbackGigId !== null) {
          const numericFallbackGigId = this.toNumericGigId(fallbackGigId);
          if (numericFallbackGigId !== null) {
            this.gigId = numericFallbackGigId;
            this.isLoading = false;
            this.currentStep = 2;
            return;
          }
        }

        this.currentStep = previousStep;
        this.errorMessage =
          'Service created, but backend did not return a gig ID. Please ask backend to include gigId/id in create-service and profile activeService responses.';
        this.isLoading = false;
      },
      error: () => {
        this.currentStep = previousStep;
        this.errorMessage =
          'Service created, but failed to fetch gig ID from server. Please refresh and try again.';
        this.isLoading = false;
      },
    });
  }

  private handleOverviewError(error: any, previousStep: number): void {
    this.currentStep = previousStep;
    if (error.status === 0) {
      this.errorMessage =
        'Network error: Cannot connect to backend. Ensure the backend server is running on http://localhost:8085';
    } else if (error.status === 401) {
      this.errorMessage = 'Please sign in to continue. If you just signed up or your session expired, log in again.';
    } else if (error.status === 400) {
      this.errorMessage = error.error?.message || 'Invalid request. Please check your input.';
    } else {
      this.errorMessage =
        error.error?.message ||
        `Failed to save service overview (Error ${error.status}). Please try again.`;
    }
    this.isLoading = false;
  }

  /**
   * Step 2: Submit pricing information
   */
  submitPricing(): void {
    void this.submitPricingInternal();
  }

  private async submitPricingInternal(): Promise<void> {
    if (!this.validatePricing()) {
      return;
    }

    if (!this.gigId) {
      console.log('[CreateService] Step 2 entered without gigId; resolving again');
      this.isLoading = true;
      this.errorMessage = 'Fetching service ID from server...';

      const resolvedGigId = await this.resolveGigIdWithRetry();
      console.log('[CreateService] Step 2 gig lookup completed');
      const numericGigId = this.toNumericGigId(resolvedGigId);

      if (!numericGigId) {
        console.warn('[CreateService] Step 2 could not resolve gigId');
        this.isLoading = false;
        this.errorMessage = 'Service ID not found. Please try creating service again.';
        return;
      }

      this.gigId = numericGigId;
    }

    const previousStep = this.currentStep;
    this.currentStep = 3;
    this.isLoading = true;
    this.errorMessage = '';

    const defaultPackage = this.packages[this.selectedPackage];
    const packageDescription =
      defaultPackage.description.trim() || `${this.selectedPackage} package`;

    const request: GigRequestDTO = {
      serviceTitle: this.overview.title,
      category: this.overview.category,
      serviceDescription: this.overview.description,
      tags: this.overview.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      paymentChoice: this.selectedPackage,
      price: defaultPackage.price.toString(),
      deliveryDate: defaultPackage.delivery.toString(),
      rivision: defaultPackage.revisions.toString(),
      packageDescription,
      pricingPackagesJson: this.buildPricingPackagesJson(),
    };

    this.gigService.choosePricing(this.gigId, request).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 3;
      },
      error: (error) => {
        this.currentStep = previousStep;
        if (error.status === 0) {
          this.errorMessage =
            'Network error: Cannot connect to backend. Ensure the backend server is running on http://localhost:8085';
        } else if (error.status === 401) {
          this.errorMessage =
            'Please sign in to continue. If you just signed up or your session expired, log in again.';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid request. Please check your input.';
        } else {
          this.errorMessage =
            error.error?.message ||
            `Failed to update pricing (Error ${error.status}). Please try again.`;
        }
        this.isLoading = false;
      },
    });
  }

  /**
   * Step 3: Submit gig with images
   */
  submitPublish(): void {
    if (!this.validatePublish()) {
      return;
    }

    if (!this.gigId) {
      this.errorMessage = 'Service ID not found. Please try creating service again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isEditMode && !this.mainImage && this.coverImages.length === 0) {
      this.profileService.notifyProfileChanged();
      this.isLoading = false;
      this.router.navigate(['/freelancer/my-services']);
      return;
    }

    this.gigService
      .publishService(this.gigId, this.mainImage || undefined, this.coverImages)
      .subscribe({
        next: () => {
          this.profileService.notifyProfileChanged();
          this.isLoading = false;
          this.router.navigate(['/freelancer/my-services']);
        },
        error: (error) => {
          if (error.status === 401) {
            this.errorMessage =
              'Please sign in to continue. If you just signed up or your session expired, log in again.';
          } else if (error.status === 400) {
            this.errorMessage = this.extractErrorMessage(
              error,
              'Invalid request. Please check your input.',
            );
          } else {
            this.errorMessage = this.extractErrorMessage(
              error,
              `Failed to publish gig (Error ${error.status || 0}). Please try again.`,
            );
          }
          this.isLoading = false;
        },
      });
  }

  /**
   * Validation Methods
   */
  validateOverview(): boolean {
    if (!this.overview.title.trim()) {
      this.errorMessage = 'Service title is required';
      return false;
    }
    if (!this.overview.category) {
      this.errorMessage = 'Category is required';
      return false;
    }
    if (!this.overview.description.trim()) {
      this.errorMessage = 'Service description is required';
      return false;
    }
    if (!this.overview.tags.trim()) {
      this.errorMessage = 'At least one tag is required';
      return false;
    }
    return true;
  }

  validatePricing(): boolean {
    const packageEntries = Object.entries(this.packages) as [PackageType, PricingPackage][];
    for (const [packageType, pkg] of packageEntries) {
      if (!Number.isFinite(Number(pkg.price)) || Number(pkg.price) <= 0) {
        this.errorMessage = `${this.formatPackageLabel(packageType)} price must be greater than 0`;
        return false;
      }

      if (!Number.isFinite(Number(pkg.delivery)) || Number(pkg.delivery) <= 0) {
        this.errorMessage = `${this.formatPackageLabel(packageType)} delivery must be greater than 0`;
        return false;
      }

      if (!Number.isFinite(Number(pkg.revisions)) || Number(pkg.revisions) < 0) {
        this.errorMessage = `${this.formatPackageLabel(packageType)} revisions cannot be negative`;
        return false;
      }
    }

    return true;
  }

  validatePublish(): boolean {
    if (!this.isEditMode && !this.mainImage) {
      this.errorMessage = 'Main image is required';
      return false;
    }
    return true;
  }

  /**
   * Image Handling
   */
  onMainImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.mainImage = input.files[0];
      this.mainImagePreview = URL.createObjectURL(this.mainImage);
    }
  }

  onCoverImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }

    const remainingSlots = Math.max(0, this.coverImageSlots.length - this.coverImages.length);
    const selectedFiles = Array.from(input.files).slice(0, remainingSlots);

    for (const file of selectedFiles) {
      this.coverImages = [...this.coverImages, file];
      this.coverImagePreviews = [...this.coverImagePreviews, URL.createObjectURL(file)];
    }

    input.value = '';
  }

  removeCoverImage(index: number): void {
    const preview = this.coverImagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    this.coverImages = this.coverImages.filter((_, itemIndex) => itemIndex !== index);
    this.coverImagePreviews = this.coverImagePreviews.filter((_, itemIndex) => itemIndex !== index);
  }

  selectPackage(packageType: PackageType): void {
    this.selectedPackage = packageType;
  }

  private populateFromGig(gig: GigResponseDTO): void {
    this.gigId = this.toNumericGigId(gig.gigId ?? gig.id);
    this.overview = {
      title: gig.serviceTitle ?? '',
      category: gig.category ?? '',
      description: gig.serviceDescription ?? '',
      tags: (gig.tags ?? []).join(', '),
    };

    const packageKey = this.toPackageKey(gig.paymentChoice);
    this.selectedPackage = packageKey;
    this.applyPricingPackagesJson(gig.pricingPackagesJson);
    this.packages[packageKey] = {
      price: Number(gig.price ?? this.packages[packageKey].price) || 0,
      delivery: Number(gig.deliveryDate ?? this.packages[packageKey].delivery) || 0,
      revisions: Number(gig.rivision ?? this.packages[packageKey].revisions) || 0,
      description: gig.packageDescription || this.packages[packageKey].description,
    };

    this.mainImagePreview = this.toImageSource(gig);
  }

  private buildPricingPackagesJson(): string {
    const packages = (Object.entries(this.packages) as [PackageType, PricingPackage][]).map(
      ([type, pkg]) => ({
        type,
        label: this.formatPackageLabel(type),
        price: Number(pkg.price) || 0,
        deliveryDate: Number(pkg.delivery) || 0,
        rivision: Number(pkg.revisions) || 0,
        packageDescription: pkg.description.trim() || `${type} package`,
      }),
    );

    return JSON.stringify(packages);
  }

  private applyPricingPackagesJson(value?: string | null): void {
    if (!value?.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return;
      }

      for (const item of parsed) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const record = item as Record<string, unknown>;
        const type = this.toPackageKey(record['type']);
        this.packages[type] = {
          price: Number(record['price'] ?? this.packages[type].price) || 0,
          delivery: Number(record['deliveryDate'] ?? this.packages[type].delivery) || 0,
          revisions: Number(record['rivision'] ?? this.packages[type].revisions) || 0,
          description:
            typeof record['packageDescription'] === 'string'
              ? record['packageDescription']
              : this.packages[type].description,
        };
      }
    } catch {
      // Older gigs may not have multi-package pricing yet.
    }
  }

  private formatPackageLabel(value: PackageType): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private toPackageKey(value: unknown): PackageType {
    const normalized = String(value ?? '').toLowerCase();
    if (normalized === 'basic' || normalized === 'premium') {
      return normalized;
    }
    return 'standard';
  }

  private toImageSource(gig: GigResponseDTO): string {
    return this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    );
  }

  private extractGigId(response: unknown): number | string | null {
    if (response === null || response === undefined) {
      return null;
    }

    if (typeof response === 'number') {
      return response > 0 ? response : null;
    }

    if (typeof response === 'string') {
      const trimmed = response.trim();

      if (!trimmed) {
        return null;
      }

      const parsedNumber = Number(trimmed);
      if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
        return parsedNumber;
      }

      const idLikeTextMatch = trimmed.match(
        /(?:gigId|gig_id|gigID|serviceId|service_id|id)\s*[:=]\s*"?(\d+)"?/i,
      );
      if (idLikeTextMatch?.[1]) {
        const numericValue = Number(idLikeTextMatch[1]);
        if (!Number.isNaN(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }

      try {
        const parsedJson = JSON.parse(trimmed) as unknown;
        return this.findGigId(parsedJson);
      } catch {
        const matched = trimmed.match(/"(?:gigId|gig_id|id)"\s*:\s*(\d+)/i);
        if (matched?.[1]) {
          const numericValue = Number(matched[1]);
          return Number.isNaN(numericValue) || numericValue <= 0 ? null : numericValue;
        }

        return null;
      }
    }

    if (typeof response === 'object') {
      return this.findGigId(response);
    }

    return null;
  }

  private async resolveGigIdWithRetry(initialPayload?: unknown): Promise<number | string | null> {
    const maxAttempts = 6;
    const delayMs = 700;

    if (initialPayload !== undefined) {
      const activeServicePayload = this.getActiveServicePayload(initialPayload);
      console.log(
        '[CreateService] activeService has id-like fields',
        this.containsIdLikeField(activeServicePayload),
      );
      const initialGigId = this.findLatestGigId(activeServicePayload);
      console.log('[CreateService] resolveGigIdWithRetry checked initial payload');
      if (initialGigId !== null) {
        return initialGigId;
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        console.log('[CreateService] resolveGigIdWithRetry attempt', attempt + 1);
        const profileResponse = await firstValueFrom(this.profileService.ensureMyProfile());
        console.log('[CreateService] resolveGigIdWithRetry profile response received');
        const activeServicePayload = this.getActiveServicePayload(profileResponse);
        console.log(
          '[CreateService] retry activeService has id-like fields',
          this.containsIdLikeField(activeServicePayload),
        );
        const fallbackGigId = this.findLatestGigId(activeServicePayload);
        console.log('[CreateService] resolveGigIdWithRetry checked extracted id');
        if (fallbackGigId !== null) {
          return fallbackGigId;
        }
      } catch {
        console.warn('[CreateService] resolveGigIdWithRetry profile lookup failed, will retry');
      }

      // removed artificial delay to speed up retries
    }

    return null;
  }

  private wait(ms: number): Promise<void> {
    // removed artificial delay helper
    return Promise.resolve();
  }

  private findGigId(payload: unknown): number | string | null {
    if (typeof payload === 'number') {
      return payload > 0 ? payload : null;
    }

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) {
        return null;
      }

      return this.toPositiveNumber(trimmed);
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (Array.isArray(payload)) {
      for (let index = payload.length - 1; index >= 0; index -= 1) {
        const nested = this.findGigId(payload[index]);
        if (nested !== null) {
          return nested;
        }
      }
      return null;
    }

    const candidate = payload as Record<string, unknown>;
    const direct =
      candidate['gigId'] ??
      candidate['gig_id'] ??
      candidate['gigID'] ??
      candidate['gigid'] ??
      candidate['id'] ??
      candidate['serviceId'] ??
      candidate['service_id'] ??
      candidate['serviceID'];
    if (direct !== undefined && direct !== null) {
      const numericValue = this.toPositiveNumber(direct);
      if (numericValue !== null) {
        return numericValue;
      }
    }

    for (const [key, value] of Object.entries(candidate)) {
      const isIdLike = /id/i.test(key);
      if (!isIdLike) {
        continue;
      }

      const numericValue = this.toPositiveNumber(value);
      if (numericValue !== null) {
        return numericValue;
      }
    }

    for (const value of Object.values(candidate)) {
      if (value && typeof value === 'object') {
        const nested = this.findGigId(value);
        if (nested !== null) {
          return nested;
        }
      }
    }

    return null;
  }

  private findLatestGigId(activeService: unknown): number | string | null {
    const ids: number[] = [];
    this.collectGigIds(activeService, ids);

    console.log('[CreateService] findLatestGigId candidates checked');

    if (ids.length === 0) {
      return null;
    }

    return Math.max(...ids);
  }

  private getActiveServicePayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return payload;
    }

    const record = payload as Record<string, unknown>;
    return record['activeService'] ?? record['activeServices'] ?? record['services'] ?? payload;
  }

  private containsIdLikeField(payload: unknown): boolean {
    if (payload === null || payload === undefined) {
      return false;
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (this.containsIdLikeField(item)) {
          return true;
        }
      }
      return false;
    }

    if (typeof payload !== 'object') {
      return false;
    }

    const record = payload as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (/id/i.test(key) && value !== null && value !== undefined) {
        return true;
      }

      if (value && typeof value === 'object' && this.containsIdLikeField(value)) {
        return true;
      }
    }

    return false;
  }

  private collectGigIds(payload: unknown, ids: number[], parentKey = ''): void {
    if (payload === null || payload === undefined) {
      return;
    }

    const isIdLikeKey = /id/i.test(parentKey);

    if (typeof payload === 'number') {
      if (isIdLikeKey && payload > 0) {
        ids.push(payload);
      }
      return;
    }

    if (typeof payload === 'string') {
      if (isIdLikeKey) {
        const numeric = this.toPositiveNumber(payload);
        if (numeric !== null) {
          ids.push(numeric);
        }
      }
      return;
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        this.collectGigIds(item, ids, parentKey);
      }
      return;
    }

    if (typeof payload !== 'object') {
      return;
    }

    const record = payload as Record<string, unknown>;

    const direct =
      record['gigId'] ??
      record['gig_id'] ??
      record['gigID'] ??
      record['serviceId'] ??
      record['service_id'];
    if (direct !== undefined && direct !== null) {
      const numeric = Number(direct);
      if (!Number.isNaN(numeric) && numeric > 0) {
        ids.push(numeric);
      }
    }

    if (record['id'] !== undefined && record['id'] !== null) {
      const numeric = this.toPositiveNumber(record['id']);
      if (numeric !== null) {
        ids.push(numeric);
      }
    }

    const looksLikeGigRecord =
      typeof record['serviceTitle'] === 'string' ||
      typeof record['serviceDescription'] === 'string' ||
      typeof record['paymentChoice'] === 'string';
    if (looksLikeGigRecord && record['id'] !== undefined && record['id'] !== null) {
      const numeric = this.toPositiveNumber(record['id']);
      if (numeric !== null) {
        ids.push(numeric);
      }
    }

    for (const [key, value] of Object.entries(record)) {
      this.collectGigIds(value, ids, key);
    }
  }

  private extractGigIdFromLocation(location: string | null): number | null {
    if (!location) {
      return null;
    }

    const matched = location.match(/\/(\d+)(?:\D*$|$)/);
    if (!matched?.[1]) {
      return null;
    }

    const parsed = Number(matched[1]);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toNumericGigId(value: unknown): number | null {
    return this.toPositiveNumber(value);
  }

  private toPositiveNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isNaN(value) || value <= 0 ? null : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }

      const matched = trimmed.match(/(\d+)/);
      if (!matched?.[1]) {
        return null;
      }

      const extracted = Number(matched[1]);
      return Number.isNaN(extracted) || extracted <= 0 ? null : extracted;
    }

    return null;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const payload = error as { status?: number; message?: string; error?: unknown };

    if (payload?.status === 0) {
      const networkMessage = typeof payload?.message === 'string' ? payload.message : '';
      return networkMessage
        ? `Network error: ${networkMessage}`
        : 'Network error: Cannot reach backend. Check server, CORS, and URL configuration.';
    }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error;
    }

    if (
      typeof payload?.error === 'object' &&
      payload.error !== null &&
      'message' in (payload.error as Record<string, unknown>)
    ) {
      const nestedMessage = (payload.error as { message?: unknown }).message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
        return nestedMessage;
      }
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    return fallback;
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  ShieldCheck,
  User,
  IdCard,
  MapPin,
  Check,
  Upload,
} from 'lucide-angular';
import { EkycService } from '../../services/Ekyc/ekyc.service';
import { GenderEnum } from '../../services/Ekyc/EkycRequest';
import { EkycResponse } from '../../services/Ekyc/EkycResponse';

type VerificationStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface EkycDraft {
  currentStep: number;
  fullName: string;
  dob: string;
  nationality: string;
  gender: '' | GenderEnum;
  phone: string;
  selectedIdType: string;
  idNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  livenessStatus: VerificationStatus;
  ekycStatus: string;
  ocrStatus: VerificationStatus;
}

@Component({
  selector: 'app-ekyc-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: './ekyc.component.html',
})
export class EkycComponent implements OnInit, OnDestroy {
  private ekycService = inject(EkycService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  errorMessage = '';
  successMessage = '';
  submitting = false;
  loadingSettings = true;
  identityVerificationRequired = true;

  icons = {
    ArrowLeft,
    ShieldCheck,
    User,
    IdCard,
    MapPin,
    Check,
    Upload,
  };

  currentStep = 1;
  totalSteps = 6;

  readonly phoneCountryCode = '+855';
  readonly cambodianCities = [
    'Phnom Penh',
    'Siem Reap',
    'Battambang',
    'Sihanoukville',
    'Kampong Cham',
    'Kampot',
    'Kep',
    'Poipet',
    'Ta Khmau',
    'Pursat',
    'Takeo',
    'Svay Rieng',
    'Kratie',
    'Stung Treng',
    'Sen Monorom',
    'Banlung',
  ];
  readonly cambodianProvinces = [
    'Banteay Meanchey',
    'Battambang',
    'Kampong Cham',
    'Kampong Chhnang',
    'Kampong Speu',
    'Kampong Thom',
    'Kampot',
    'Kandal',
    'Kep',
    'Koh Kong',
    'Kratie',
    'Mondulkiri',
    'Oddar Meanchey',
    'Pailin',
    'Phnom Penh',
    'Preah Sihanouk',
    'Preah Vihear',
    'Prey Veng',
    'Pursat',
    'Ratanakiri',
    'Siem Reap',
    'Stung Treng',
    'Svay Rieng',
    'Takeo',
    'Tboung Khmum',
  ];

  fullName = '';
  dob = '';
  nationality = 'Cambodia';
  gender: '' | GenderEnum = '';
  phone = '';

  selectedIdType = 'National ID';
  idNumber = '';
  idFrontFile: File | null = null;
  idBackFile: File | null = null;

  addressLine1 = '';
  addressLine2 = '';
  city = '';
  state = '';
  postalCode = '';
  country = 'Cambodia';
  addressProofFile: File | null = null;

  livenessStatus: VerificationStatus = 'idle';
  ekycStatus = 'not_started';
  ocrStatus: VerificationStatus = 'idle';

  // Step 2.5 (liveness)
  @ViewChild('liveVideo') private liveVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('liveCanvas') private liveCanvas?: ElementRef<HTMLCanvasElement>;
  private liveStream: MediaStream | null = null;
  private draftTimerId: number | null = null;
  private draftDisabled = false;
  liveFacePreviewUrl: string | null = null;
  private liveFaceFile: File | null = null;

  get progress(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  ngOnInit(): void {
    void this.restoreDraft();
    this.draftTimerId = window.setInterval(() => this.saveDraft(), 1500);

    this.ekycService.settings().subscribe({
      next: (settings) => {
        this.identityVerificationRequired = settings.identityVerificationRequired !== false;
        if (!this.identityVerificationRequired) {
          this.errorMessage = 'Identity verification is currently disabled by the administrator.';
          this.stopCamera();
        }
        this.loadingSettings = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSettings = false;
        this.identityVerificationRequired = true;
        this.cdr.detectChanges();
      },
    });
  }

  private setStep(step: number): void {
    const prevStep = this.currentStep;
    this.currentStep = step;
    this.onStepChanged(prevStep, step);
    this.saveDraft();
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) this.setStep(this.currentStep + 1);
  }

  async onContinue(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.identityVerificationRequired) {
      this.errorMessage = 'Identity verification is currently disabled by the administrator.';
      this.cdr.detectChanges();
      return;
    }
    if (this.submitting) return;

    try {
      const validationError = this.validateCurrentStep();
      if (validationError) {
        this.errorMessage = validationError;
        this.cdr.detectChanges();
        return;
      }

      this.submitting = true;
      if (this.currentStep === 1) {
        await this.submitStep1();
        this.nextStep();
        return;
      }

      if (this.currentStep === 2) {
        await this.submitStep2();
        this.nextStep();
        return;
      }

      if (this.currentStep === 3) {
        await this.submitStep2_5();
        this.nextStep();
        return;
      }

      if (this.currentStep === 4) {
        void this.startOcrVerification();
        this.nextStep();
        return;
      }

      if (this.currentStep === 5) {
        await this.submitStep3();
        this.nextStep();
        return;
      }

      this.nextStep();
    } catch (error) {
      this.handleSubmissionError(error);
    } finally {
      this.submitting = false;
      // This project appears to be running without Zone.js, so async continuations
      // (after await) won't automatically trigger view updates.
      this.cdr.detectChanges();
    }
  }

  async onSubmitForReview(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.identityVerificationRequired) {
      this.errorMessage = 'Identity verification is currently disabled by the administrator.';
      this.cdr.detectChanges();
      return;
    }
    if (this.submitting) return;

    try {
      const validationError = this.validateAllStepsForReview();
      if (validationError) {
        this.errorMessage = validationError;
        this.cdr.detectChanges();
        return;
      }

      this.submitting = true;
      const review = await this.submitVerification();
      const storedStatus = review?.status === 'VERIFIED' ? 'verified' : 'pending';
      localStorage.setItem(this.getEkycStatusStorageKey(), storedStatus);
      localStorage.setItem(this.getEkycSubmittedStorageKey(), 'true');
      void this.clearDraft();
      this.successMessage =
        storedStatus === 'verified'
          ? 'eKYC verification completed. Redirecting to dashboard...'
          : 'eKYC submitted and marked as pending. Redirecting to dashboard...';
      this.cdr.detectChanges();

      // Navigate to dashboard based on user role
      const dashboardUrl = this.getDashboardUrlFromRole();
      await this.router.navigateByUrl(dashboardUrl);
    } catch (error) {
      this.handleSubmissionError(error);
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  private getDashboardUrlFromRole(): string {
    const role = localStorage.getItem('role');
    // Handle both "CLIENT" and "ROLE_CLIENT" formats
    if (role?.includes('FREELANCER')) return '/freelancer/dashboard';
    if (role?.includes('CLIENT')) return '/client/dashboard';
    if (role?.includes('ADMIN')) return '/admin/dashboard';
    return '/index';
  }

  private handleSubmissionError(error: unknown): void {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        if (!token) {
          this.errorMessage = 'Forbidden (403): missing login token. Please sign in again.';
        } else {
          this.errorMessage = `Forbidden (403): identity verification is unavailable or your account cannot access eKYC. Current role: ${role ?? 'unknown'}.`;
        }
      } else if (error.status === 0) {
        this.errorMessage = 'Network error: backend unreachable or CORS blocked.';
      } else {
        this.errorMessage = `Request failed (${error.status}): ${this.readHttpErrorMessage(error)}`;
      }

      console.error('eKYC step submission failed:', {
        status: error.status,
        url: error.url,
        role,
        hasToken: Boolean(token),
        error,
      });
      return;
    }

    this.errorMessage =
      error instanceof Error ? error.message : 'Unexpected error while submitting eKYC step.';
    console.error('eKYC step submission failed:', { role, hasToken: Boolean(token) });
  }

  prevStep(): void {
    if (this.currentStep > 1) this.setStep(this.currentStep - 1);
  }

  goToStep(step: number): void {
    this.setStep(step);
  }

  private onStepChanged(prevStep: number, nextStep: number): void {
    // Start camera when entering Step 2.5 (step 3)
    if (nextStep === 3 && prevStep !== 3) {
      // Wait a microtask for the template to render the <video>
      Promise.resolve().then(() => this.startCamera());
    }

    // Stop camera when leaving Step 2.5
    if (prevStep === 3 && nextStep !== 3) {
      this.stopCamera();
    }
  }

  private async startCamera(): Promise<void> {
    try {
      const videoEl = this.liveVideo?.nativeElement;
      if (!videoEl) return;

      if (this.liveStream) return;

      this.liveStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      videoEl.srcObject = this.liveStream;
      await videoEl.play();
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Camera start failed:', e);
      this.errorMessage = 'Unable to access camera. Please allow camera permission.';
      this.cdr.detectChanges();
    }
  }

  private stopCamera(): void {
    if (this.liveStream) {
      for (const track of this.liveStream.getTracks()) {
        track.stop();
      }
      this.liveStream = null;
    }
  }

  ngOnDestroy(): void {
    this.saveDraft();
    if (this.draftTimerId !== null) {
      window.clearInterval(this.draftTimerId);
      this.draftTimerId = null;
    }
    this.stopCamera();
    if (this.liveFacePreviewUrl) {
      URL.revokeObjectURL(this.liveFacePreviewUrl);
      this.liveFacePreviewUrl = null;
    }
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.saveDraft();
  }

  private async captureLiveFace(): Promise<File> {
    const videoEl = this.liveVideo?.nativeElement;
    const canvasEl = this.liveCanvas?.nativeElement;
    if (!videoEl || !canvasEl) {
      throw new Error('Camera is not ready');
    }

    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    canvasEl.width = width;
    canvasEl.height = height;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.drawImage(videoEl, 0, 0, width, height);

    const faceSupported = typeof (window as any).FaceDetector === 'function';
    if (faceSupported) {
      const hasFace = await this.detectFaceInCanvas(canvasEl);
      if (!hasFace) {
        throw new Error('No face detected. Please align your face in the frame.');
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvasEl.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to capture image'))),
        'image/jpeg',
        0.9,
      );
    });

    const file = new File([blob], 'live_face.jpg', { type: 'image/jpeg' });
    this.liveFaceFile = file;
    void this.saveDraftFile('liveFaceFile', file);

    if (this.liveFacePreviewUrl) URL.revokeObjectURL(this.liveFacePreviewUrl);
    this.liveFacePreviewUrl = URL.createObjectURL(blob);
    this.cdr.detectChanges();

    return file;
  }

  private async detectFaceInCanvas(canvasEl: HTMLCanvasElement): Promise<boolean> {
    try {
      const FaceDetectorCtor = (window as any).FaceDetector;
      if (typeof FaceDetectorCtor !== 'function') return true;

      const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(canvasEl);
      return Array.isArray(faces) && faces.length > 0;
    } catch {
      // If detection fails for any reason, let the server handle liveness/face validation.
      return true;
    }
  }

  selectIdType(type: string): void {
    this.selectedIdType = type === 'National ID' ? type : 'National ID';
  }

  onIdUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (!this.isImageFile(file)) {
        this.errorMessage = 'Front ID must be a JPG or PNG image. PDF files cannot be used for face comparison.';
        input.value = '';
        this.idFrontFile = null;
        return;
      }
      this.errorMessage = '';
      this.idFrontFile = file;
      this.saveDraft();
      void this.saveDraftFile('idFrontFile', file);
    }
  }

  onIdBackUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (!this.isImageFile(file)) {
        this.errorMessage = 'Back ID must be a JPG or PNG image.';
        input.value = '';
        this.idBackFile = null;
        return;
      }
      this.errorMessage = '';
      this.idBackFile = file;
      this.saveDraft();
      void this.saveDraftFile('idBackFile', file);
    }
  }

  onAddressUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addressProofFile = input.files[0];
      this.saveDraft();
      void this.saveDraftFile('addressProofFile', this.addressProofFile);
    }
  }
  private formatDateOfBirth(date: string): string {
    // Ensure DOB is in yyyy-MM-dd format for OCR compatibility
    if (!date) return '';
    if (date.includes('-') && date.split('-')[0].length === 4) {
      // Already in yyyy-MM-dd format
      return date;
    }
    // If in other format, try to parse and reformat
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return date;
  }

  getGenderDisplay(): string {
    const genderMap: Record<string, string> = {
      M: 'Male',
      F: 'Female',
      MALE: 'Male',
      FEMALE: 'Female',
    };
    return genderMap[this.gender] || this.gender || '—';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'in_progress':
        return 'In progress';
      default:
        return 'Pending';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700';
      case 'processing':
        return 'inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-amber-700';
      case 'failed':
        return 'inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-rose-700';
      case 'in_progress':
        return 'inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sky-700';
      default:
        return 'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-gray-700';
    }
  }

  private convertGenderForBackend(gender: string): string {
    // Convert M/F (from form) to MALE/FEMALE (backend enum)
    const genderMap: Record<string, string> = {
      M: 'MALE',
      F: 'FEMALE',
    };
    return genderMap[gender] || gender;
  }

  private validateCurrentStep(): string | null {
    switch (this.currentStep) {
      case 1:
        return this.validatePersonalInfoStep();
      case 2:
        return this.validateIdVerificationStep();
      case 3:
        return this.validateLivenessStep();
      case 4:
        return null;
      case 5:
        return this.validateAddressStep();
      default:
        return null;
    }
  }

  private validateAllStepsForReview(): string | null {
    return (
      this.validatePersonalInfoStep() ??
      this.validateIdVerificationStep() ??
      this.validateAddressStep()
    );
  }

  private validatePersonalInfoStep(): string | null {
    if (!this.fullName.trim()) {
      return 'Full legal name is required.';
    }

    if (!this.dob) {
      return 'Date of birth is required.';
    }

    const dobDate = new Date(this.dob);
    if (Number.isNaN(dobDate.getTime())) {
      return 'Enter a valid date of birth.';
    }

    if (dobDate > new Date()) {
      return 'Date of birth cannot be in the future.';
    }

    if (this.nationality !== 'Cambodia') {
      return 'Nationality must be Cambodia.';
    }

    if (!this.gender) {
      return 'Sex is required.';
    }

    if (!this.isValidCambodianPhoneNumber()) {
      return 'Enter a valid Cambodian phone number with 8 or 9 digits after +855.';
    }

    return null;
  }

  private validateIdVerificationStep(): string | null {
    if (this.selectedIdType !== 'National ID') {
      return 'National ID is the only available ID type.';
    }

    if (!this.idNumber.trim()) {
      return 'ID number is required.';
    }

    if (!this.idFrontFile) {
      return 'Front of ID image is required.';
    }

    if (!this.idBackFile) {
      return 'Back of ID image is required.';
    }

    const invalidFileMessage =
      this.validateIdImageFile(this.idFrontFile, 'Front ID') ??
      this.validateIdImageFile(this.idBackFile, 'Back ID');
    if (invalidFileMessage) {
      return invalidFileMessage;
    }

    return null;
  }

  private validateLivenessStep(): string | null {
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Camera access is required for liveness verification.';
    }

    return null;
  }

  private validateAddressStep(): string | null {
    if (!this.addressLine1.trim()) {
      return 'Address line 1 is required.';
    }

    if (!this.normalizeCambodianCity(this.city)) {
      return 'Select a city in Cambodia.';
    }

    if (!this.normalizeCambodianProvince(this.state)) {
      return 'Select a province in Cambodia.';
    }

    if (this.country !== 'Cambodia') {
      return 'Country must be Cambodia.';
    }

    return null;
  }

  private validateIdImageFile(file: File, label: string): string | null {
    if (!this.isImageFile(file)) {
      return `${label} must be a JPG or PNG image.`;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      return `${label} must be 2MB or smaller.`;
    }

    return null;
  }

  private submitStep1(): Promise<void> {
    const payload = {
      fullName: this.fullName,
      dateOfBirth: this.formatDateOfBirth(this.dob),
      nationality: 'Cambodia',
      gender: this.convertGenderForBackend(this.gender),
      phoneNumber: this.getCambodianPhoneNumber(),
    };

    return new Promise((resolve, reject) => {
      this.ekycService.createEkyc(payload).subscribe({
        next: (res) => {
          console.log('Step 1 saved');
          resolve();
        },
        error: reject,
      });
    });
  }

  private submitStep2(): Promise<void> {
    if (!this.idFrontFile || !this.idBackFile) {
      return Promise.reject(new Error('Front and back ID images are required'));
    }

    const frontId = this.idFrontFile;
    const backId = this.idBackFile;

    return new Promise((resolve, reject) => {
      this.ekycService.uploadIdCard(frontId, backId).subscribe({
        next: (res) => {
          console.log('Step 2 saved');
          resolve();
        },
        error: reject,
      });
    });
  }

  private submitStep3(): Promise<void> {
    const payload = {
      addressLine1: this.addressLine1,
      addressLine2: this.addressLine2,
      city: this.city,
      state_province: this.state,
      postal_code: this.postalCode,
      country: 'Cambodia',
    };

    return new Promise((resolve, reject) => {
      this.ekycService.updateAddress(payload).subscribe({
        next: (res) => {
          console.log('Step 3 saved');
          resolve();
        },
        error: reject,
      });
    });
  }

  private async submitStep2_5(): Promise<void> {
    // Ensure camera is started
    if (!this.liveStream) {
      await this.startCamera();
    }

    const liveFile = this.liveFaceFile ?? (await this.captureLiveFace());

    this.livenessStatus = 'processing';

    // 1) Liveness verification (face)
    try {
      const response = await firstValueFrom(this.ekycService.verifyLiveness(liveFile));
      const passed = this.pythonVerificationPassed(response);
      this.livenessStatus = 'completed';
      if (!passed) {
        localStorage.setItem(this.getEkycStatusStorageKey(), 'pending');
      }
    } catch (error) {
      console.warn('Liveness verification needs admin review:', error);
      this.livenessStatus = 'completed';
      localStorage.setItem(this.getEkycStatusStorageKey(), 'pending');
    }
  }

  private async startOcrVerification(): Promise<void> {
    this.ocrStatus = 'processing';
    try {
      const response = await firstValueFrom(this.ekycService.verifyOcr());
      this.ocrStatus = 'completed';
      if (response?.ocr_match === false) {
        localStorage.setItem(this.getEkycStatusStorageKey(), 'pending');
      }
    } catch (error) {
      console.warn('OCR verification needs admin review:', error);
      this.ocrStatus = 'completed';
      localStorage.setItem(this.getEkycStatusStorageKey(), 'pending');
    }
    this.cdr.detectChanges();
  }

  private submitVerification(): Promise<EkycResponse | null> {
    return new Promise((resolve, reject) => {
      this.ekycService.reviewEkyc().subscribe({
        next: (res) => {
          console.log('Review completed');
          resolve((res as EkycResponse) ?? null);
        },
        error: reject,
      });
    });
  }

  private pythonVerificationPassed(rawResponse: string): boolean {
    try {
      const response = JSON.parse(rawResponse) as Record<string, any>;
      return (
        response['status'] === 'success' ||
        response['verification_result']?.['verification_passed'] === true ||
        response['face_match']?.['matched'] === true
      );
    } catch {
      return rawResponse.toLowerCase().includes('"status":"success"');
    }
  }

  private isImageFile(file: File): boolean {
    return file.type.toLowerCase().startsWith('image/');
  }

  private readHttpErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        return this.extractErrorText(parsed) ?? body;
      } catch {
        return body || error.message;
      }
    }

    if (body && typeof body === 'object') {
      return this.extractErrorText(body as Record<string, unknown>) ?? error.message;
    }

    return error.message;
  }

  private extractErrorText(body: Record<string, unknown>): string | null {
    const message = body['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    const detail = body['detail'];
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (detail && typeof detail === 'object') {
      try {
        return JSON.stringify(detail);
      } catch {
        return null;
      }
    }

    return null;
  }

  private getEkycStatusStorageKey(): string {
    return `${this.getRoleStoragePrefix()}_ekyc_status:${this.getCredentialIdentity()}`;
  }

  private getEkycDraftStorageKey(): string {
    return `${this.getRoleStoragePrefix()}_ekyc_draft:${this.getCredentialIdentity()}`;
  }

  private getEkycDraftDbKey(name: string): string {
    return `${this.getRoleStoragePrefix()}_ekyc_draft_file:${this.getCredentialIdentity()}:${name}`;
  }

  private getEkycSubmittedStorageKey(): string {
    return `${this.getRoleStoragePrefix()}_ekyc_submitted:${this.getCredentialIdentity()}`;
  }

  private getRoleStoragePrefix(): 'client' | 'freelancer' {
    const role = (localStorage.getItem('role') ?? '').toUpperCase();
    if (role.includes('FREELANCER')) {
      return 'freelancer';
    }

    return 'client';
  }

  private getCredentialIdentity(): string {
    const token = localStorage.getItem('token');
    if (!token) {
      return 'anonymous';
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return 'anonymous';
    }

    const identity =
      this.getStringClaim(payload, ['sub', 'email', 'preferred_username', 'username']) ??
      this.getStringClaim(payload, ['id', 'userId', 'clientId']);

    return identity ? encodeURIComponent(identity) : 'anonymous';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      const parsed: unknown = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getStringClaim(claims: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return null;
  }

  private saveDraft(): void {
    if (this.draftDisabled) {
      return;
    }

    const draft: EkycDraft = {
      currentStep: this.currentStep,
      fullName: this.fullName,
      dob: this.dob,
      nationality: this.nationality,
      gender: this.gender,
      phone: this.phone,
      selectedIdType: this.selectedIdType,
      idNumber: this.idNumber,
      addressLine1: this.addressLine1,
      addressLine2: this.addressLine2,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      country: this.country,
      livenessStatus: this.livenessStatus,
      ekycStatus: this.ekycStatus,
      ocrStatus: this.ocrStatus,
    };

    try {
      localStorage.setItem(this.getEkycDraftStorageKey(), JSON.stringify(draft));
    } catch (error) {
      console.warn('Could not save eKYC draft:', error);
    }
  }

  private async restoreDraft(): Promise<void> {
    try {
      const rawDraft = localStorage.getItem(this.getEkycDraftStorageKey());
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Partial<EkycDraft>;
        this.currentStep = this.clampStep(draft.currentStep ?? this.currentStep);
        this.fullName = draft.fullName ?? this.fullName;
        this.dob = draft.dob ?? this.dob;
        this.nationality = 'Cambodia';
        this.gender = draft.gender ?? this.gender;
        this.phone = this.normalizeCambodianPhoneInput(draft.phone ?? this.phone);
        this.selectedIdType = 'National ID';
        this.idNumber = draft.idNumber ?? this.idNumber;
        this.addressLine1 = draft.addressLine1 ?? this.addressLine1;
        this.addressLine2 = draft.addressLine2 ?? this.addressLine2;
        this.city = this.normalizeCambodianCity(draft.city ?? this.city);
        this.state = this.normalizeCambodianProvince(draft.state ?? this.state);
        this.postalCode = draft.postalCode ?? this.postalCode;
        this.country = 'Cambodia';
        this.livenessStatus = this.normalizeVerificationStatus(
          draft.livenessStatus,
          this.livenessStatus,
        );
        this.ekycStatus = draft.ekycStatus ?? this.ekycStatus;
        this.ocrStatus = this.normalizeVerificationStatus(draft.ocrStatus, this.ocrStatus);
      }

      this.nationality = 'Cambodia';
      this.phone = this.normalizeCambodianPhoneInput(this.phone);
      this.country = 'Cambodia';
      this.city = this.normalizeCambodianCity(this.city);
      this.state = this.normalizeCambodianProvince(this.state);

      this.idFrontFile = await this.readDraftFile('idFrontFile');
      this.idBackFile = await this.readDraftFile('idBackFile');
      this.addressProofFile = await this.readDraftFile('addressProofFile');
      this.liveFaceFile = await this.readDraftFile('liveFaceFile');

      if (this.liveFaceFile) {
        if (this.liveFacePreviewUrl) {
          URL.revokeObjectURL(this.liveFacePreviewUrl);
        }
        this.liveFacePreviewUrl = URL.createObjectURL(this.liveFaceFile);
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Could not restore eKYC draft:', error);
    }
  }

  private async clearDraft(): Promise<void> {
    this.draftDisabled = true;
    localStorage.removeItem(this.getEkycDraftStorageKey());
    await Promise.all([
      this.deleteDraftFile('idFrontFile'),
      this.deleteDraftFile('idBackFile'),
      this.deleteDraftFile('addressProofFile'),
      this.deleteDraftFile('liveFaceFile'),
    ]);
  }

  private clampStep(step: number): number {
    return Math.min(this.totalSteps, Math.max(1, Number.isFinite(step) ? step : 1));
  }

  private normalizeVerificationStatus(
    status: VerificationStatus | undefined,
    fallback: VerificationStatus,
  ): VerificationStatus {
    return status === 'idle' ||
      status === 'processing' ||
      status === 'completed' ||
      status === 'failed'
      ? status
      : fallback;
  }

  normalizeCambodianPhoneInput(value: string): string {
    return value
      .replace(/^\s*(?:\+?855|0)\s*/, '')
      .replace(/[^\d\s-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trimStart();
  }

  getCambodianPhoneNumber(): string {
    const localNumber = this.normalizeCambodianPhoneInput(this.phone).trim();
    return localNumber ? `${this.phoneCountryCode} ${localNumber}` : this.phoneCountryCode;
  }

  private isValidCambodianPhoneNumber(): boolean {
    const digits = this.normalizeCambodianPhoneInput(this.phone).replace(/\D/g, '');
    return /^\d{8,9}$/.test(digits);
  }

  private normalizeCambodianCity(value: string): string {
    return this.cambodianCities.includes(value) ? value : '';
  }

  private normalizeCambodianProvince(value: string): string {
    return this.cambodianProvinces.includes(value) ? value : '';
  }

  private async saveDraftFile(name: string, file: File | null): Promise<void> {
    if (!file) {
      await this.deleteDraftFile(name);
      return;
    }

    const db = await this.openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction('files', 'readwrite')
        .objectStore('files')
        .put(file, this.getEkycDraftDbKey(name));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  private async readDraftFile(name: string): Promise<File | null> {
    const db = await this.openDraftDb();
    const file = await new Promise<File | null>((resolve, reject) => {
      const request = db
        .transaction('files', 'readonly')
        .objectStore('files')
        .get(this.getEkycDraftDbKey(name));
      request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return file;
  }

  private async deleteDraftFile(name: string): Promise<void> {
    const db = await this.openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction('files', 'readwrite')
        .objectStore('files')
        .delete(this.getEkycDraftDbKey(name));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  private openDraftDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('foundit-ekyc-drafts', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

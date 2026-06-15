import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Check, Clock3, X, AlertCircle, MessageCircle, LucideAngularModule } from 'lucide-angular';
import { ChatService, HireRequestResponse } from '../../../services/chat/chat.service';

@Component({
  selector: 'app-freelancer-hire-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <div class="mx-auto max-w-7xl">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-[34px] font-semibold leading-none text-[#111827]">Incoming Requests</h1>
          <p class="mt-2 text-sm text-[#6b7280]">
            Review and respond to client requests for your services
          </p>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="hireRequests.length === 0 && !loading"
          class="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm"
        >
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6]"
          >
            <lucide-angular
              [img]="icons.MessageCircle"
              class="h-6 w-6 text-[#9ca3af]"
            ></lucide-angular>
          </div>
          <p class="text-[16px] font-semibold text-[#111827]">No incoming requests</p>
          <p class="mt-1 text-sm text-[#6b7280]">Check back later for client requests</p>
        </div>

        <!-- Loading State -->
        <div
          *ngIf="loading"
          class="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm"
        >
          <p class="text-sm text-[#6b7280]">Loading requests...</p>
        </div>

        <!-- Requests List -->
        <div *ngIf="!loading && hireRequests.length > 0" class="space-y-4">
          <div
            *ngFor="let request of hireRequests"
            [ngClass]="
              request.status === 'accepted'
                ? 'border-green-200 bg-green-50'
                : request.status === 'rejected'
                  ? 'border-red-200 bg-red-50'
                  : 'border-[#e5e7eb] bg-white'
            "
            class="rounded-2xl border p-5 shadow-sm transition hover:shadow-md"
          >
            <!-- Request Header -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-[16px] font-semibold text-[#111827]">{{ request.gigTitle }}</h3>
                  <span
                    [ngClass]="
                      request.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : request.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    "
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                  >
                    <span
                      [ngClass]="
                        request.status === 'accepted'
                          ? ''
                          : request.status === 'rejected'
                            ? ''
                            : 'h-2 w-2 rounded-full bg-yellow-700'
                      "
                    ></span>
                    {{ request.status }}
                  </span>
                </div>

                <p class="mt-1 text-sm text-[#6b7280]">
                  <span class="font-medium text-[#111827]">{{ request.clientName }}</span>
                  requested this service
                </p>
              </div>

              <span class="text-xs text-[#6b7280]"> Request #{{ request.id }} </span>
            </div>

            <!-- Request Message -->
            <div *ngIf="request.requestMessage" class="mt-4 rounded-xl bg-[#f3f4f6] p-3">
              <p class="text-sm text-[#111827]">{{ request.requestMessage }}</p>
            </div>

            <!-- Requirements -->
            <div *ngIf="request.requirements" class="mt-3">
              <p class="text-xs font-semibold text-[#6b7280]">Requirements:</p>
              <p class="mt-1 text-sm text-[#374151]">{{ request.requirements }}</p>
            </div>

            <!-- Actions -->
            <div *ngIf="request.status === 'pending'" class="mt-5 flex gap-3">
              <button
                type="button"
                (click)="rejectRequest(request.id)"
                [disabled]="processingId === request.id"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-[#ef4444] transition hover:bg-red-50 disabled:opacity-50"
              >
                <lucide-angular [img]="icons.X" class="h-4 w-4"></lucide-angular>
                {{ processingId === request.id ? 'Rejecting...' : 'Reject' }}
              </button>

              <button
                type="button"
                (click)="acceptRequest(request.id)"
                [disabled]="processingId === request.id"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#15803d] disabled:opacity-50"
              >
                <lucide-angular [img]="icons.Check" class="h-4 w-4"></lucide-angular>
                {{ processingId === request.id ? 'Accepting...' : 'Accept' }}
              </button>
            </div>

            <!-- Accepted/Rejected Message -->
            <div
              *ngIf="request.status === 'accepted'"
              class="mt-4 flex items-start gap-2 rounded-xl bg-green-100 p-3 text-xs text-green-700"
            >
              <lucide-angular [img]="icons.Check" class="mt-0.5 h-4 w-4 shrink-0"></lucide-angular>
              <p>You accepted this request. The client can now proceed with payment.</p>
            </div>

            <div
              *ngIf="request.status === 'rejected'"
              class="mt-4 flex items-start gap-2 rounded-xl bg-red-100 p-3 text-xs text-red-700"
            >
              <lucide-angular [img]="icons.X" class="mt-0.5 h-4 w-4 shrink-0"></lucide-angular>
              <p>You rejected this request.</p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div
          *ngIf="error"
          class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div class="flex items-start gap-2">
            <lucide-angular
              [img]="icons.AlertCircle"
              class="mt-0.5 h-5 w-5 shrink-0"
            ></lucide-angular>
            <p>{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HireRequestsComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Check,
    Clock3,
    X,
    AlertCircle,
    MessageCircle,
  };

  hireRequests: HireRequestResponse[] = [];
  loading = true;
  error = '';
  processingId: number | null = null;

  ngOnInit(): void {
    this.loadHireRequests();
  }

  loadHireRequests(): void {
    this.loading = true;
    this.error = '';

    this.chatService.getMyHireRequests().subscribe({
      next: (requests) => {
        this.hireRequests = [...requests].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load hire requests. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  acceptRequest(requestId: number): void {
    this.processingId = requestId;
    this.error = '';

    this.chatService.acceptHireRequest(requestId).subscribe({
      next: () => {
        const request = this.hireRequests.find((r) => r.id === requestId);
        if (request) {
          request.status = 'accepted';
        }
        this.processingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to accept request. Please try again.';
        this.processingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  rejectRequest(requestId: number): void {
    this.processingId = requestId;
    this.error = '';

    this.chatService.rejectHireRequest(requestId).subscribe({
      next: () => {
        const request = this.hireRequests.find((r) => r.id === requestId);
        if (request) {
          request.status = 'rejected';
        }
        this.processingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to reject request. Please try again.';
        this.processingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArrowRight, Check, Flag, House, Package, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-client-success-order',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './success-order.component.html',
})
export class OrderSuccessComponent {
  private router = inject(Router);

  readonly icons = {
    Check,
    Package,
    ArrowRight,
    Flag,
    House,
  };

  orderId = '';
  mode: 'request' | 'pay' = 'request';
  freelancerId: number | null = null;
  gigId: number | null = null;
  requestId: number | null = null;
  projectId: number | null = null;

  constructor() {
    const state = history.state as {
      orderId?: string | number;
      mode?: 'request' | 'pay';
      freelancerId?: number | string | null;
      gigId?: number | string | null;
      requestId?: number | string | null;
      projectId?: number | string | null;
      order?: {
        freelancerId?: number | string | null;
        gigId?: number | string | null;
        projectId?: number | string | null;
      };
    };

    if (state?.orderId) {
      this.orderId = String(state.orderId);
    }
    if (state?.mode === 'pay') {
      this.mode = 'pay';
    }

    this.freelancerId = this.toNullableNumber(state?.freelancerId ?? state?.order?.freelancerId);
    this.gigId = this.toNullableNumber(state?.gigId ?? state?.order?.gigId);
    this.requestId = this.toNullableNumber(state?.requestId);
    this.projectId = this.toNullableNumber(state?.projectId ?? state?.order?.projectId);
  }

  trackOrder(): void {
    if (this.orderId) {
      this.router.navigate(['/client/my-orders', this.orderId, 'view-detail']);
      return;
    }

    this.router.navigate(['/client/my-orders']);
  }

  viewAllOrders(): void {
    this.router.navigate(['/client/my-orders']);
  }

  messageFreelancer(): void {
    this.router.navigate(['/client/chat'], {
      state: {
        freelancerId: this.freelancerId ?? undefined,
        gigId: this.gigId ?? undefined,
        requestId: this.requestId ?? undefined,
        projectId: this.projectId ?? undefined,
      },
    });
  }

  backToHome(): void {
    this.router.navigate(['/client/dashboard']);
  }

  private toNullableNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}

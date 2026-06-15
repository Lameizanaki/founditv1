import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MaintenanceStateService } from '../../services/admin/maintenance-state.service';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#0f172a] text-white">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.22),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.2),transparent_30%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#052e2b_100%)]"></div>
      <div class="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.95))]"></div>

      <section class="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div class="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-3xl font-bold shadow-2xl shadow-emerald-500/20">
          !
        </div>

        <p class="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-200">
          Scheduled Maintenance
        </p>
        <h1 class="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          FOUND IT is temporarily offline
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
          {{ message }}
        </p>

        <div class="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Status</p>
            <p class="mt-2 text-sm font-semibold text-emerald-200">In Progress</p>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Accounts</p>
            <p class="mt-2 text-sm font-semibold text-emerald-200">Paused</p>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Access</p>
            <p class="mt-2 text-sm font-semibold text-emerald-200">Returns Soon</p>
          </div>
        </div>
      </section>
    </main>
  `,
})
export class MaintenancePage {
  private readonly maintenanceState = inject(MaintenanceStateService);

  get message(): string {
    return (
      this.maintenanceState.currentMessage ||
      'We are making improvements right now. Please check back soon.'
    );
  }
}

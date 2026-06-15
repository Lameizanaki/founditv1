import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { finalize, Subscription, timeout } from "rxjs";
import { AdminService, AdminSettings } from "../../../services/admin/admin.service";
import { MaintenanceStateService } from "../../../services/admin/maintenance-state.service";

@Component({
    selector: "app-admin-setting-component",
    standalone: true,
    templateUrl: "./admin-setting.component.html",
    imports: [CommonModule, FormsModule],
})
export class AdminSettingComponent implements OnInit, OnDestroy {
  private readonly settingsCacheKey = 'adminSettings';
  private saveRequest: Subscription | null = null;
  private saveFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly defaultSettings: AdminSettings = {
    maintenanceMode: false,
    maintenanceMessage: 'Found It is temporarily unavailable while scheduled maintenance is in progress. Please check back soon.',
    identityVerificationRequired: true,
    maxLoginAttempts: 5,
  };

  settings: AdminSettings = { ...this.defaultSettings };
  loading = true;
  saving = false;
  errorMessage = '';

  constructor(
    private adminService: AdminService,
    private maintenanceState: MaintenanceStateService,
    private ngZone: NgZone,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const cachedSettings = this.loadCachedSettings();
    if (cachedSettings) {
      this.settings = cachedSettings;
      this.loading = false;
    }

    this.adminService.settings().subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = cachedSettings
          ? 'Latest settings could not be loaded. Showing last saved values.'
          : 'Settings could not be loaded. Showing default values.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.saveRequest?.unsubscribe();
    this.clearSaveFallbackTimer();
  }

  toggle(key: keyof AdminSettings): void {
    if (typeof this.settings[key] === 'boolean') {
      this.settings[key] = !this.settings[key] as never;
    }
  }

  saveSettings(): void {
    if (this.saving) return;

    this.settings.maxLoginAttempts = Math.max(1, Math.min(5, Number(this.settings.maxLoginAttempts) || 5));
    this.saving = true;
    this.errorMessage = '';

    this.saveFallbackTimer = setTimeout(() => {
      if (!this.saving) return;

      this.ngZone.run(() => {
        this.errorMessage = 'Settings save is taking too long. Please check the backend connection and try again.';
        this.cancelSaving();
      });
    }, 5000);

    this.saveRequest = this.adminService.saveSettings({ ...this.settings })
      .pipe(
        timeout(5000),
        finalize(() => this.finishSaving()),
      )
      .subscribe({
        next: (settings) => {
          this.applySettings(settings);
          if (!settings.maintenanceMode) {
            this.maintenanceState.clear();
          }
        },
        error: (error) => {
          this.errorMessage = error?.name === 'TimeoutError'
            ? 'Settings save is taking too long. Please check the backend connection and try again.'
            : error?.error?.message ||
            error?.error ||
            'Settings could not be saved. Please check your admin session and try again.';
        },
      });
  }

  cancelSaving(): void {
    this.saveRequest?.unsubscribe();
    this.finishSaving();
  }

  private finishSaving(): void {
    this.clearSaveFallbackTimer();
    this.saving = false;
    this.saveRequest = null;
    this.changeDetector.detectChanges();
  }

  private clearSaveFallbackTimer(): void {
    if (!this.saveFallbackTimer) return;

    clearTimeout(this.saveFallbackTimer);
    this.saveFallbackTimer = null;
  }

  private applySettings(settings: AdminSettings): void {
    this.settings = {
      ...this.defaultSettings,
      ...settings,
      maintenanceMode: settings.maintenanceMode === true,
      identityVerificationRequired: settings.identityVerificationRequired !== false,
      maxLoginAttempts: Math.max(1, Math.min(5, Number(settings.maxLoginAttempts) || 5)),
    };
    try {
      localStorage.setItem(this.settingsCacheKey, JSON.stringify(this.settings));
    } catch {
      // The server remains the source of truth if browser storage is unavailable.
    }
  }

  private loadCachedSettings(): AdminSettings | null {
    const rawSettings = localStorage.getItem(this.settingsCacheKey);
    if (!rawSettings) return null;

    try {
      return {
        ...this.defaultSettings,
        ...JSON.parse(rawSettings),
      };
    } catch {
      localStorage.removeItem(this.settingsCacheKey);
      return null;
    }
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService, AdminUserActivity, AdminUserDetail } from '../../../services/admin/admin.service';

type UserTab = 'Overview' | 'Freelancer' | 'Client' | 'Activity Log' | 'Financial';

@Component({
  selector: 'app-admin-user-details-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-user-detail.component.html',
})
export class UserDetailsComponent implements OnInit {
  tabs: UserTab[] = ['Overview', 'Freelancer', 'Client', 'Activity Log', 'Financial'];
  selectedTab: UserTab = 'Overview';
  user: AdminUserDetail | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid user id in the URL.';
      return;
    }

    this.adminService.userDetail(id).subscribe({
      next: (user) => {
        this.user = {
          ...user,
          recentGigs: user.recentGigs ?? [],
          recentProjects: user.recentProjects ?? [],
          recentHireRequests: user.recentHireRequests ?? [],
          recentPayments: user.recentPayments ?? [],
          skills: user.skills ?? [],
        };
        this.selectedTab = user.role === 'CLIENT' ? 'Client' : user.role === 'FREELANCER' ? 'Freelancer' : 'Overview';
        this.errorMessage = '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.user = null;
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Unable to load this user detail. Please make sure the backend is running and try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  setStatus(status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'): void {
    if (!this.user) return;
    this.adminService.updateUserStatus(this.user.id, status).subscribe(() => {
      if (this.user) {
        this.user.status = status;
      }
    });
  }

  money(value: number | null | undefined): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value ?? 0);
  }

  activityAmount(activity: AdminUserActivity): string {
    if (activity.amount === null || activity.amount === undefined) return 'No amount';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: activity.currency || 'USD',
    }).format(activity.amount);
  }

  activityDate(activity: AdminUserActivity): string {
    if (!activity.createdAt) return 'No date';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(activity.createdAt));
  }

  avatarSrc(user: AdminUserDetail): string | null {
    return this.toImageSource(user.profilePictureData, user.profilePictureType);
  }

  profileText(user: AdminUserDetail): string {
    return user.description?.trim() || user.about?.trim() || 'No profile information has been added yet.';
  }

  private toImageSource(
    data?: string | number[] | Uint8Array | null,
    contentType?: string | null,
  ): string | null {
    let imageData = '';
    if (typeof data === 'string') {
      imageData = data.trim();
    } else if (data instanceof Uint8Array) {
      imageData = this.bytesToBase64(data);
    } else if (Array.isArray(data)) {
      imageData = this.bytesToBase64(new Uint8Array(data));
    }

    if (!imageData) return null;
    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData)) return imageData;
    return `data:${contentType?.trim() || 'image/jpeg'};base64,${imageData}`;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }
}

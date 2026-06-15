import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AlertTriangle, LucideAngularModule, Pencil, Search, Sparkles, Star, User, UserCheck, UserX, Users } from "lucide-angular";
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from "rxjs";
import { AdminService, AdminUser } from "../../../services/admin/admin.service";

@Component({
    selector: "app-admin-user-component",
    standalone: true,
    templateUrl: "./admin-user.component.html",
    imports: [CommonModule, FormsModule, LucideAngularModule, RouterLink],
})
export class AdminUserComponent implements OnInit, OnDestroy {
     // Icons
    readonly icons = {
        Search,
        Star,
        Pencil,
        User,
        Users,
        UserCheck,
        UserX,
        AlertTriangle,
        Sparkles,
    };

    users: AdminUser[] = [];
    totalUsers = 0;
    totalPages = 0;
    currentPage = 0;
    readonly pageSize = 10;
    loading = true;
    errorMessage = '';
    searchTerm = '';
    selectedRole = 'ALL';
    selectedStatus = 'ALL';
    updatingUserId: number | null = null;
    private readonly searchChanged$ = new Subject<string>();
    private readonly destroy$ = new Subject<void>();
    private loadRequestId = 0;

    constructor(
        private adminService: AdminService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.searchChanged$
            .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(() => this.applyFilters());
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.searchChanged$.complete();
    }

    loadUsers(): void {
        const requestId = ++this.loadRequestId;
        this.loading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();
        this.adminService.users({
            page: this.currentPage,
            size: this.pageSize,
            role: this.selectedRole,
            status: this.selectedStatus,
            keyword: this.searchTerm,
        }).subscribe({
            next: (page) => {
                if (requestId !== this.loadRequestId) return;
                this.users = page.content ?? [];
                this.totalUsers = page.totalElements ?? this.users.length;
                this.totalPages = page.totalPages ?? 0;
                this.currentPage = page.number ?? this.currentPage;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                if (requestId !== this.loadRequestId) return;
                this.users = [];
                this.totalUsers = 0;
                this.totalPages = 0;
                this.errorMessage =
                    error?.error?.message ||
                    error?.error ||
                    'Unable to load users from register.';
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    onRoleChange(): void {
        this.selectedStatus = 'ALL';
        this.currentPage = 0;
        this.loadUsers();
    }

    applyFilters(): void {
        this.currentPage = 0;
        this.loadUsers();
    }

    onSearchChange(value: string): void {
        this.searchChanged$.next(value);
    }

    goToPage(page: number): void {
        const maxPage = Math.max(this.totalPages - 1, 0);
        const nextPage = Math.max(0, Math.min(page, maxPage));
        if (nextPage === this.currentPage || this.loading) return;

        this.currentPage = nextPage;
        this.loadUsers();
    }

    get pageStart(): number {
        if (this.totalUsers === 0) return 0;
        return this.currentPage * this.pageSize + 1;
    }

    get pageEnd(): number {
        return Math.min((this.currentPage + 1) * this.pageSize, this.totalUsers);
    }

    normalizedStatus(status: AdminUser['status'] | null | undefined): 'ACTIVE' | 'PENDING' | 'SUSPENDED' {
        return status === 'PENDING' || status === 'SUSPENDED' ? status : 'ACTIVE';
    }

    statusLabel(status: AdminUser['status'] | null | undefined): string {
        const normalized = this.normalizedStatus(status);
        return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }

    statusClass(status: AdminUser['status'] | null | undefined): string {
        switch (this.normalizedStatus(status)) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-700';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700';
            case 'SUSPENDED':
                return 'bg-red-100 text-red-700';
        }
    }

    avatarSrc(user: AdminUser): string | null {
        return this.toImageSource(user.profilePictureData, user.profilePictureType);
    }

    actionLabel(user: AdminUser): string {
        return this.normalizedStatus(user.status) === 'SUSPENDED' ? 'Unsuspend user' : 'Suspend user';
    }

    toggleSuspension(user: AdminUser, event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.updatingUserId !== null) return;

        const nextStatus: 'ACTIVE' | 'SUSPENDED' =
            this.normalizedStatus(user.status) === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        this.updatingUserId = user.id;
        this.errorMessage = '';
        this.cdr.detectChanges();

        this.adminService.updateUserStatus(user.id, nextStatus).subscribe({
            next: () => {
                this.users = this.users.map((item) =>
                    item.id === user.id ? { ...item, status: nextStatus } : item,
                );
                this.updatingUserId = null;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.errorMessage =
                    error?.error?.message ||
                    error?.error ||
                    'Unable to update user account status.';
                this.updatingUserId = null;
                this.cdr.detectChanges();
            },
        });
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

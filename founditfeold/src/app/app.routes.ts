import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { suspendedAccountGuard } from './core/guards/suspended-account.guard';

export const routes: Routes = [
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./pages/maintenance/maintenance').then((m) => m.MaintenancePage),
  },
  {
    path: 'account/suspended',
    loadComponent: () =>
      import('./pages/account/suspended-account').then((m) => m.SuspendedAccountPage),
  },
  //Auth Routes
  {
    path: 'auth/forget-password',
    loadComponent: () => import('./pages/auth/forget-password').then((m) => m.ForgetPasswordPage),
  },
  {
    path: 'auth/sign-in',
    loadComponent: () => import('./pages/auth/sign-in').then((m) => m.SignInPage),
  },
  {
    path: 'auth/google/callback',
    loadComponent: () =>
      import('./components/auth/google-callback.component').then((m) => m.GoogleCallbackPage),
  },
  {
    path: 'auth/sign-up',
    loadComponent: () => import('./pages/auth/sign-up').then((m) => m.SignUpPage),
  },

  // Landing Routes
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.LandingPage),
  },
  {
    path: 'index',
    loadComponent: () => import('./pages/choose-role/choose-role').then((m) => m.ChooseRolePage),
  },
  {
    path: 'browse-freelancers',
    loadComponent: () =>
      import('./pages/landing/browse-freelancer').then((m) => m.BrowseFreelancerPage),
  },
  {
    path: 'browse-freelancers/freelancer/:id',
    loadComponent: () =>
      import('./pages/landing/freelancer-view-details').then((m) => m.FreelancerViewDetailsPage),
  },
  {
    path: 'freelancer-view-details/:id',
    loadComponent: () =>
      import('./pages/landing/freelancer-view-details').then((m) => m.FreelancerViewDetailsPage),
  },
  {
    path: 'browse-gigs',
    loadComponent: () => import('./pages/landing/browse-gig').then((m) => m.BrowseGigPage),
  },
  {
    path: 'browse-gigs/gig/:id',
    loadComponent: () =>
      import('./pages/landing/gig-view-details').then((m) => m.GigViewDetailsPage),
  },
  {
    path: 'index/ekyc',
    loadComponent: () => import('./pages/ekyc/ekyc').then((m) => m.EkycPage),
  },

  //Admin Routes
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./components/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashbaordComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/admin/user/admin-user.component').then((m) => m.AdminUserComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./components/admin/user-detail/admin-user-detail.component').then(
            (m) => m.UserDetailsComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./components/admin/report/admin-report.component').then(
            (m) => m.AdminReportComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./components/admin/setting/admin-setting.component').then(
            (m) => m.AdminSettingComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  //Client Routes
  {
    path: 'client',
    canActivate: [suspendedAccountGuard],
    canActivateChild: [suspendedAccountGuard],
    loadComponent: () => import('./pages/client/client').then((m) => m.ClientPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/client/dashboard/client-dashboard.component').then(
            (m) => m.ClientDashboardComponent,
          ),
      },
      {
        path: 'my-profile',
        loadComponent: () =>
          import('./components/client/my-profile/my-profile.component').then(
            (m) => m.ClientMyProfileComponent,
          ),
      },
      {
        path: 'setting',
        loadComponent: () =>
          import('./components/client/setting/client-setting.component').then(
            (m) => m.ClientSettingsComponent,
          ),
      },
      {
        path: 'my-orders',
        loadComponent: () =>
          import('./components/client/my-order/my-order.component').then(
            (m) => m.MyOrdersComponent,
          ),
      },
      {
        path: 'my-orders/:id/view-detail',
        loadComponent: () =>
          import('./components/client/my-order-view-detail/my-order-view-detail.component').then(
            (m) => m.OrderDetailsComponent,
          ),
      },
      {
        path: 'browse-freelancers',
        loadComponent: () =>
          import('./components/client/browse-freelancers/browse-freelancer.component').then(
            (m) => m.BrowseFreelancerComponent,
          ),
      },
      {
        path: 'browse-freelancers/freelancer/:id',
        loadComponent: () =>
          import('./components/client/freelancer-view-details-layout/freelancer-view-details-layout.component').then(
            (m) => m.ViewDetailsLayoutComponent,
          ),
      },
      {
        path: 'freelancer-view-details/:id',
        loadComponent: () =>
          import('./components/client/freelancer-view-details-layout/freelancer-view-details-layout.component').then(
            (m) => m.ViewDetailsLayoutComponent,
          ),
      },
      {
        path: 'browse-gigs',
        loadComponent: () =>
          import('./components/client/browse-gigs/browse-gig.component').then(
            (m) => m.BrowseGigComponent,
          ),
      },
      {
        path: 'browse-gigs/gig/:id',
        loadComponent: () =>
          import('./components/client/gig-view-details-layout/view-details-layout.component').then(
            (m) => m.ViewDetailsLayoutComponent,
          ),
      },
      {
        path: 'browse-gigs/gig/:id/confirm-order',
        loadComponent: () =>
          import('./components/client/confirm-order/confirm-order.component').then(
            (m) => m.ConfirmOrderComponent,
          ),
      },
      {
        path: 'browse-gigs/gig/:id/confirm-order/success-order',
        loadComponent: () =>
          import('./components/client/success-order/success-order.component').then(
            (m) => m.OrderSuccessComponent,
          ),
      },
      {
        path: ':id/view-transaction',
        loadComponent: () =>
          import('./components/client/trasaction-history/transaction-history.component').then(
            (m) => m.TransactionHistoryComponent,
          ),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./components/client/chat/chat.component').then((m) => m.MessagesComponent),
      },
      {
        path: ':roomId/chat',
        loadComponent: () =>
          import('./components/client/chat/chat.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'notification',
        loadComponent: () =>
          import('./components/client/notification/notification.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: ':id/notification',
        redirectTo: 'notification',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  //Freelancer Routes
  {
    path: 'freelancer',
    canActivate: [suspendedAccountGuard],
    canActivateChild: [suspendedAccountGuard],
    loadComponent: () => import('./pages/freelancer/freelancer').then((m) => m.FreelancerPage),
    children: [
      {
        path: ':roomId/chat',
        loadComponent: () =>
          import('./components/freelancer/chat/chat.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./components/freelancer/chat/chat.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'client/:clientId/profile',
        loadComponent: () =>
          import('./components/client/my-profile/my-profile.component').then(
            (m) => m.ClientMyProfileComponent,
          ),
      },
      {
        path: 'hire-requests',
        loadComponent: () =>
          import('./components/freelancer/hire-requests/hire-requests.component').then(
            (m) => m.HireRequestsComponent,
          ),
      },
      {
        path: 'notification',
        loadComponent: () =>
          import('./components/freelancer/notification/notification.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/freelancer/dashboard/freelancer-dashboard.component').then(
            (m) => m.FreelancerDashboardComponent,
          ),
      },
      {
        path: 'earnings',
        loadComponent: () =>
          import('./components/freelancer/earning-withdrawal-history/earning-withdrawal-history.component').then(
            (m) => m.EarningsWithdrawalsComponent,
          ),
      },
      {
        path: 'earnings-withdrawals',
        redirectTo: 'earnings',
        pathMatch: 'full',
      },
      {
        path: 'my-services',
        loadComponent: () =>
          import('./components/freelancer/my-services/my-services.component').then(
            (m) => m.MyServicesComponent,
          ),
      },
      {
        path: 'gigs/:gigId',
        loadComponent: () =>
          import('./components/freelancer/gig-details/gig-details.component').then(
            (m) => m.FreelancerGigDetailsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./components/freelancer/profile-layout/freelancer-view-details-layout.component').then(
            (m) => m.ViewDetailsLayoutComponent,
          ),
      },
      {
        path: 'create-new-service',
        loadComponent: () =>
          import('./components/freelancer/create-new-service/create-new-service.component').then(
            (m) => m.CreateServiceComponent,
          ),
      },
      {
        path: 'setting',
        loadComponent: () =>
          import('./components/freelancer/setting/freelancer-setting.component').then(
            (m) => m.FreelancerSettingsComponent,
          ),
      },
      {
        path: 'active-work',
        loadComponent: () =>
          import('./components/freelancer/active-work/active-work.component').then(
            (m) => m.ActiveWorkComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];

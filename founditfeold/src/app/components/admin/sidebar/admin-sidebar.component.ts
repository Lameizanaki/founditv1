import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Boxes,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Flag,
  LucideAngularModule,
  Settings,
  Users,
} from 'lucide-angular';

@Component({
  selector: 'app-admin-sidebar-component',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './admin-sidebar.component.html',
})
export class AdminSidebarComponent {
  readonly icons = {
    ChartColumn,
    Boxes,
    Users,
    Flag,
    Settings,
    ChevronLeft,
    ChevronRight,
  };


  menuItems = [
    {
      label: 'Dashboard',
      icon: this.icons.ChartColumn,
      route: '/admin/dashboard',
    },
    {
      label: 'Users',
      icon: this.icons.Users,
      route: '/admin/users',
    },
    {
      label: 'Reports',
      icon: this.icons.Flag,
      route: '/admin/reports',
    },
    {
      label: 'Settings',
      icon: this.icons.Settings,
      route: '/admin/settings',
    },
  ];

  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}

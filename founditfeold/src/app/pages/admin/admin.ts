import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '../../components/admin/sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from '../../components/admin/header/admin-header.component';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, AdminHeaderComponent, AdminSidebarComponent],
  templateUrl: './admin.html',
})
export class AdminPage {}
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ClientHeaderComponent } from '../../components/client/header/client-header.component';
import { ClientDashboardComponent } from '../../components/client/dashboard/client-dashboard.component';
import { Footer } from '../../components/landing/footer/footer.component';
import { RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { NotificationRefreshService } from '../../services/notification/notification-refresh.service';

@Component({
  selector: 'app-client',
  templateUrl: './client.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClientHeaderComponent, Footer, RouterOutlet],
})
export class ClientPage implements OnInit {
  private readonly notificationRefreshService = inject(NotificationRefreshService);

  ngOnInit(): void {
    this.notificationRefreshService.startRealtimeConnection();
  }
}

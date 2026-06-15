import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FreelancerDashboardComponent } from '../../components/freelancer/dashboard/freelancer-dashboard.component';
import { Footer } from '../../components/landing/footer/footer.component';
import { RouterModule } from '@angular/router';
import { FreelancerHeaderComponent } from '../../components/freelancer/header/freelancer-header.component';
import { NotificationRefreshService } from '../../services/notification/notification-refresh.service';

@Component({
  selector: 'app-freelancer',
  templateUrl: './freelancer.html',
  imports: [CommonModule, LucideAngularModule, Footer, RouterModule, FreelancerHeaderComponent],
})
export class FreelancerPage implements OnInit {
  private readonly notificationRefreshService = inject(NotificationRefreshService);

  ngOnInit(): void {
    this.notificationRefreshService.startRealtimeConnection();
  }
}

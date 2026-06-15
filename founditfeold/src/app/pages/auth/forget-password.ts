import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ForgetPasswordComponent } from '../../components/auth/forget-password.component';


@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ForgetPasswordComponent],
})
export class ForgetPasswordPage {}

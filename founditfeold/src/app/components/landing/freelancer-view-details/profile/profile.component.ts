import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  LogIn,
  LucideAngularModule,
  MapPin,
  MessageSquare,
  Pencil,
  SquarePen,
  Star,
  UserRound,
  Wallet,
} from 'lucide-angular';
import { FreelancerProfileResponse } from '../../../../services/Freelancer/Profile/freelancer-profile.models';

type PackageType = 'basic' | 'standard' | 'premium';

interface GigPackage {
  key: PackageType;
  label: string;
  title: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
}

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

@Component({
  selector: 'app-freelancer-profile-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'profile.component.html',
})
export class GigPriceCardComponent {
  @Input() freelancer: FreelancerProfileResponse | null = null;
  @Input() freelancerId: number | null = null;

  constructor(private router: Router) {}

  readonly icons = {
    ChevronLeft,
    Star,
    MapPin,
    BriefcaseBusiness,
    Clock3,
    CircleDollarSign,
    MessageSquare,
    Calendar,
    LogIn,
    UserRound,
  };

  private readonly fallbackProfile = {
    name: 'Sarah Jenkins',
    title: 'Senior Web Developer & UI Designer',
    rating: 4.9,
    location: 'New York, USA',
    experience: '5+ years experience',
    workStatus: 'Available for work',
    responseTime: 'Replies within 2 hours',
    availability: 'Available for new projects',
    about:
      'Full-stack developer focused on scalable web applications, clean UI systems, and reliable project delivery. Experienced in React, TypeScript, Node.js, and product-focused frontend architecture. I bring 5+ years of professional experience building high-quality applications for startups and enterprises. My approach combines technical excellence with clear communication to ensure successful project outcomes.',
  };

  get profile() {
    if (!this.freelancer) {
      return this.fallbackProfile;
    }

    return {
      name: this.freelancer.freelancerName || this.fallbackProfile.name,
      title: this.freelancer.freelancerJob || this.fallbackProfile.title,
      rating: this.freelancer.rating || this.fallbackProfile.rating,
      location: this.freelancer.workLocation || this.fallbackProfile.location,
      experience: `${this.freelancer.yearExperience || 0}+ years experience`,
      workStatus: 'Available for work',
      responseTime: 'Replies within 2 hours',
      availability: 'Available for new projects',
      about: this.freelancer.description || this.freelancer.about || this.fallbackProfile.about,
    };
  }

  get profileImageUrl(): string | null {
    const imageData = this.freelancer?.profilePictureData;
    if (!imageData) {
      return null;
    }

    return `data:${this.freelancer?.profilePictureType || 'image/jpeg'};base64,${imageData}`;
  }

  goBack(): void {
    window.history.back();
  }

  signIn(): void {
    void this.router.navigate(['/auth/sign-in']);
  }

  signUp(): void {
    void this.router.navigate(['/auth/sign-up']);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import {
  FreelancerExperienceResponse,
  FreelancerProfileResponse,
} from '../../../services/Freelancer/Profile/freelancer-profile.models';

@Injectable({
  providedIn: 'root',
})
export class GigDetailStateService {
  private readonly gigSubject = new BehaviorSubject<GigResponseDTO | null>(null);
  private readonly profileSubject = new BehaviorSubject<FreelancerProfileResponse | null>(null);
  private readonly experiencesSubject = new BehaviorSubject<FreelancerExperienceResponse[]>([]);

  readonly gig$ = this.gigSubject.asObservable();
  readonly profile$ = this.profileSubject.asObservable();
  readonly experiences$ = this.experiencesSubject.asObservable();

  setGig(gig: GigResponseDTO | null): void {
    this.gigSubject.next(gig);
  }

  setProfile(profile: FreelancerProfileResponse | null): void {
    this.profileSubject.next(profile);
  }

  setExperiences(experiences: FreelancerExperienceResponse[]): void {
    this.experiencesSubject.next(experiences);
  }
}

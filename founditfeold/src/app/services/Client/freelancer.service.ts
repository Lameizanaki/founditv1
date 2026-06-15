import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { env } from '../../../environments/env';

export interface GigResponseDTO {
  gigId?: number | string;
  id?: number | string;
  freelancerId?: number | string;
  userId?: number | string;
  createdBy?: number | string;
  freelancerName?: string;
  seller?: string;
  serviceTitle: string;
  category: string;
  serviceDescription: string;
  tags: string[];
  paymentChoice: string;
  price: number | string;
  deliveryDate: number;
  rivision: number;
  packageDescription: string;
  status?: string;
  rating?: number;
  reviews?: number;
  orders?: number;
  views?: number;
  gigMainImageData?: string;
  gigMainImageUrl?: string;
  gigMainImageContentType?: string;
  gigMainImageName?: string;
  coverImages?: Array<{
    id?: number | string;
    gigCoverImageData?: string;
    gigCoverImageUrl?: string;
    gigCoverImageContentType?: string;
    gigCoverImageName?: string;
  }>;
}

export interface FreelancerProfile {
  id?: number;
  profileId?: number;
  freelancerId?: number;
  freelancerProfileId?: number;
  freelancerName: string;
  freelancerJob: string;
  rating: number;
  workLocation: string;
  yearExperience: number;
  about: string;
  description?: string;
  skill: string[];
  activeService: GigResponseDTO[];
  profilePictureData?: string;
  profilePictureUrl?: string;
  profilePictureName?: string;
  profilePictureType?: string;
  reviews?: number;
  profileViews?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FreelancerService {
  private readonly API_URL = `${env.apiUrl}/freelancer`;

  constructor(private http: HttpClient) {}

  /**
   * Get freelancer profile by ID (Client view)
   */
  getFreelancerProfile(id: number): Observable<FreelancerProfile> {
    return this.http.get<FreelancerProfile>(`${this.API_URL}/${id}/client/profile`);
  }

  /**
   * Get all active freelancers

  /**
   * Get freelancer profile by ID or name (fallback)
   * Tries numeric ID first, then falls back to name if needed
   */
  getFreelancerProfileByIdOrName(idOrName: string | number): Observable<FreelancerProfile> {
    const numericId = Number(idOrName);
    // If it's a valid number, use the ID endpoint
    if (!isNaN(numericId) && numericId > 0) {
      return this.getFreelancerProfile(numericId);
    }
    // Otherwise treat it as a name and search for it
    return this.searchFreelancers({ category: '' }).pipe(
      map(
        (freelancers) =>
          freelancers.find((f) => f.freelancerName === idOrName) ||
          freelancers[0] ||
          ({} as FreelancerProfile),
      ),
    );
  }

  getActiveFreelancers(): Observable<FreelancerProfile[]> {
    return this.http.get<FreelancerProfile[]>(`${this.API_URL}/active`);
  }

  downloadFreelancerAvatar(freelancerId: number | string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${freelancerId}/avatar`, {
      responseType: 'blob',
    });
  }

  /**
   * Search freelancers by filters
   */
  searchFreelancers(filters: {
    category?: string;
    minRating?: number;
    maxPrice?: number;
    location?: string;
  }): Observable<FreelancerProfile[]> {
    return this.http.get<FreelancerProfile[]>(`${this.API_URL}/search`, {
      params: filters as any,
    });
  }
}

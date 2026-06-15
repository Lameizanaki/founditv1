import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../../../environments/env';
import { GigRequestDTO } from './GigRequest';
import { GigResponseDTO } from './GigResponse';

/**
 * GigService - Handles all gig-related API calls
 * Matches backend controller: backend.controller.freelancer.gig.GigController
 */
@Injectable({
  providedIn: 'root',
})
export class GigService {
  private http = inject(HttpClient);
  private baseUrl = `${env.apiUrl}/freelancer`;

  /**
   * Step 1: Create a new gig (service overview)
   * POST /freelancer/create-service
   * @param request - GigRequestDTO with service details
   * @returns Observable<GigResponseDTO>
   */
  createService(request: GigRequestDTO): Observable<HttpResponse<GigResponseDTO>> {
    const endpoint = `${this.baseUrl}/create-service`;
    return this.http.post<GigResponseDTO>(endpoint, request, { observe: 'response' });
  }

  /**
   * Step 2: Add pricing to gig
   * PUT /freelancer/{gigId}/choose-pricing
   * @param gigId - The gig ID
   * @param request - GigRequestDTO with pricing information
   * @returns Observable<GigResponseDTO>
   */
  choosePricing(gigId: number | string, request: GigRequestDTO): Observable<GigResponseDTO> {
    return this.http.put<GigResponseDTO>(`${this.baseUrl}/${gigId}/choose-pricing`, request);
  }

  updateOverview(gigId: number | string, request: GigRequestDTO): Observable<GigResponseDTO> {
    return this.http.put<GigResponseDTO>(`${this.baseUrl}/${gigId}/overview`, request);
  }

  /**
   * Step 3: Publish gig with images
   * PUT /freelancer/{gigId}/publish-service (multipart/form-data)
   * @param gigId - The gig ID
   * @param mainImage - Main image file
   * @param coverImages - Array of cover image files (optional)
   * @returns Observable<GigResponseDTO>
   */
  publishService(
    gigId: number | string,
    mainImage?: File,
    coverImages?: File[],
  ): Observable<GigResponseDTO> {
    const formData = new FormData();

    if (mainImage) {
      formData.append('main', mainImage);
    }

    if (coverImages && coverImages.length > 0) {
      coverImages.forEach((file) => {
        formData.append('cover', file);
      });
    }

    return this.http.put<GigResponseDTO>(`${this.baseUrl}/${gigId}/publish-service`, formData);
  }

  /**
   * Client browse: get all published gigs for listing
   * GET /freelancer/client/gigs
   */
  getClientGigs(): Observable<GigResponseDTO[]> {
    return this.http.get<GigResponseDTO[]>(`${this.baseUrl}/client/gigs`);
  }

  /**
   * Client detail: get a specific gig by id
   * GET /freelancer/client/gigs/{gigId}
   */
  getClientGigById(gigId: number | string): Observable<GigResponseDTO> {
    return this.http.get<GigResponseDTO>(`${this.baseUrl}/client/gigs/${gigId}`);
  }

  getMyGigs(): Observable<GigResponseDTO[]> {
    return this.http.get<GigResponseDTO[]>(`${this.baseUrl}/gigs`);
  }

  getMyGigById(gigId: number | string): Observable<GigResponseDTO> {
    return this.http.get<GigResponseDTO>(`${this.baseUrl}/gigs/${gigId}`);
  }

  pauseGig(gigId: number | string): Observable<GigResponseDTO> {
    return this.http.put<GigResponseDTO>(`${this.baseUrl}/gigs/${gigId}/pause`, {});
  }

  resumeGig(gigId: number | string): Observable<GigResponseDTO> {
    return this.http.put<GigResponseDTO>(`${this.baseUrl}/gigs/${gigId}/resume`, {});
  }

  disableGig(gigId: number | string): Observable<GigResponseDTO> {
    return this.http.put<GigResponseDTO>(`${this.baseUrl}/gigs/${gigId}/disable`, {});
  }
}

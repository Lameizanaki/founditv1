import { GigCoverImagesDTO } from './GigCoverImages';

/**
 * GigResponseDTO - Response from backend after gig operations
 * Matches backend: backend.dto.freelancer.gig.GigResponseDTO
 */
export interface GigResponseDTO {
  // Gig ID
  gigId?: number | string;
  id?: number | string;

  // Freelancer Info
  freelancerId?: number | string;
  userId?: number | string;
  createdBy?: number | string;
  freelancerName?: string;
  seller?: string;
  rating?: number;
  reviews?: number;
  views?: number;
  orders?: number;

  // Service Details
  serviceTitle: string;
  category: string;
  serviceDescription: string;
  tags: string[];

  // Pricing
  paymentChoice: string;
  price: string;
  deliveryDate: string;
  rivision: string; // Note: Backend has typo "rivision" not "revision"
  packageDescription: string;
  pricingPackagesJson?: string;
  status?: 'active' | 'paused' | 'disabled' | string;

  // Main Image
  gigMainImageData?: string;
  gigMainImageContentType?: string;
  gigMainImageName?: string;
  gigMainImageUrl?: string;

  // Cover Images
  coverImages?: GigCoverImagesDTO[];
}

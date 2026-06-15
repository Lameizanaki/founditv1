/**
 * GigRequestDTO - Request body for creating/updating gigs
 * Matches backend: backend.dto.freelancer.gig.GigRequestDTO
 */
export interface GigRequestDTO {
  // Service Details (Step 1)
  serviceTitle: string;
  category: string;
  serviceDescription: string;
  tags: string[];

  // Pricing (Step 2)
  paymentChoice: string;
  price: string;
  deliveryDate: string;
  rivision: string; // Note: Backend has typo "rivision" not "revision"
  packageDescription: string;
  pricingPackagesJson?: string;

  // Images (Step 3)
  gigMainImageData?: string; // Base64 or binary data
  gigMainImageContentType?: string;
  gigMainImageName?: string;
}

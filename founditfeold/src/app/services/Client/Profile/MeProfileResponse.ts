export interface MeProfileResponse {
  id: number;
  clientId?: number;
  fullName: string;
  email: string;
  avatar: string;
  clientName?: string;
  clientEmail?: string;
  workLocation?: string;
  profilePictureData?: Uint8Array | string;
  profilePictureType?: string;
  profilePictureName?: string;
  profilePictureUrl?: string;
  bio?: string;
  phone?: string;
  company?: string;
  location?: string;
  availability?: boolean | string;
  about?: string;
  website?: string;
  totalSpent?: number;
  completedProjects?: number;
  activeProjects?: number;
  averageRating?: number;
}

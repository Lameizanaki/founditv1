import { GigResponseDTO } from '../Gig/GigResponse';

export interface FreelancerProfileRequest {
  freelancerName?: string;
  freelancerJob?: string;
  rating?: number;
  workLocation?: string;
  yearExperience?: number;
  about?: string;
  description?: string;
  skill?: string[];
}

export interface FreelancerProfileResponse extends FreelancerProfileRequest {
  id?: number;
  email?: string;
  activeService?: GigResponseDTO[];
  profilePictureData?: Uint8Array | string;
  profilePictureType?: string;
  profilePictureName?: string;
  profilePictureUrl?: string;
}

export interface FreelancerExperienceRequest {
  title?: string;
  description?: string;
  bio?: string;
}

export interface FreelancerExperienceResponse extends FreelancerExperienceRequest {
  experienceId?: number;
  id?: number;
  freelancerId?: number;
  company?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

export interface FreelancerRightSideBarRequest {
  startPrice?: number;
  viewCount?: number;
}

export interface FreelancerRightSideBarResponse extends FreelancerRightSideBarRequest {
  id?: number;
  sideBarId?: number;
  sidebarId?: number;
  freelancerId?: number;
  view?: number;
  views?: number;
  sideBarView?: number;
}

package backend.service.impl.freelancer.profile;

import java.io.IOException;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.gig.GigCoverImagesDTO;
import backend.dto.freelancer.gig.GigResponseDTO;
import backend.enums.freelancer.ProjectStatusEnum;
import backend.dto.freelancer.profile.client_view.FreelancerProfileClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerProfileDTO;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer.gig.GigStatus;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer_client.Project;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.freelancer.profile.FreelancerProfileRepository;
import backend.service.freelancer.profile.FreelancerProfileService;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FreelancerProfileServiceImplement implements FreelancerProfileService {

	private final FreelancerProfileRepository freelancerProfileRepository;
	private final FreelancerRepository freelancerRepository;
	
	@Override
	public FreelancerProfile getById(Long id) {
		return freelancerProfileRepository.findById(id)
				.orElseThrow(()-> new ResourceNotFoundException("FreelancerProfile", id));
	}
	
	@Override
	public Freelancer getByFreelancer(Long id) {
		return freelancerRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer", id));
	}

	@Override
	public FreelancerProfile save(FreelancerProfile request, Long id) {
		Freelancer getFreelancer = getByFreelancer(id);
		FreelancerProfile existingProfile = getFreelancer.getFreelancerProfiles();

		if (existingProfile != null) {
			existingProfile.setFreelancerJob(request.getFreelancerJob());
			existingProfile.setRating(request.getRating());
			existingProfile.setWorkLocation(request.getWorkLocation());
			existingProfile.setYearExperience(request.getYearExperience());
			existingProfile.setAbout(request.getAbout());
			existingProfile.setDescription(request.getDescription());
			existingProfile.setSkills(request.getSkills());
			return freelancerProfileRepository.save(existingProfile);
		}

		request.setFreelancer(getFreelancer);
		return freelancerProfileRepository.save(request);
	}

	@Override
	public FreelancerProfile update_profile_header_card(Long id, FreelancerProfileDTO profileHeader) {
		
		Freelancer freelancer = getByFreelancer(id);
		
	    if (freelancer == null) {
	        throw new ResourceNotFoundException("Freelancer", id);
	    }
	    
	    FreelancerProfile headerCard = freelancer.getFreelancerProfiles();
		
	    if (headerCard == null) {
	    	headerCard = new FreelancerProfile();
	    	headerCard.setFreelancer(freelancer);
	    	headerCard.setRating(0F);
	    	headerCard.setYearExperience(0);
	    	headerCard.setSkills(Collections.emptyList());
	    }
	    
		headerCard.setFreelancerJob(profileHeader.getFreelancerJob());
		headerCard.setRating(profileHeader.getRating());
		headerCard.setWorkLocation(profileHeader.getWorkLocation());
		headerCard.setYearExperience(profileHeader.getYearExperience());
		headerCard.setAbout(profileHeader.getAbout());
		headerCard.setDescription(profileHeader.getDescription());
		return freelancerProfileRepository.save(headerCard);
	}

	@Transactional
	@Override
	public FreelancerProfile update_avatar_header_card(Long id, MultipartFile avatarPic) throws IOException {
		Freelancer freelancer = getByFreelancer(id);
		
		if (freelancer == null) {
	        throw new ResourceNotFoundException("Freelancer", id);
	    }
		
		FreelancerProfile profile = freelancer.getFreelancerProfiles();
		if (profile == null) {
			profile = new FreelancerProfile();
			profile.setFreelancer(freelancer);
			profile.setRating(0F);
			profile.setYearExperience(0);
			profile.setSkills(Collections.emptyList());
		}
		
		FileUploadGuard.requireImage(avatarPic, FileUploadGuard.IMAGE_MAX_BYTES, "Profile avatar");
		profile.setProfilePictureName(avatarPic.getOriginalFilename());
		profile.setProfilePictureType(avatarPic.getContentType());
		profile.setProfilePictureData(avatarPic.getBytes());
		return freelancerProfileRepository.save(profile);
	}

	@Override
	public FreelancerProfile update_about(Long id, FreelancerProfileDTO about) {
		FreelancerProfile profile_about = getById(id);
		profile_about.setAbout(about.getAbout());
		return freelancerProfileRepository.save(profile_about);
	}

	@Override
	public FreelancerProfile update_skill(Long id, FreelancerProfileDTO skill) {
		Freelancer freelancer = getByFreelancer(id);
		FreelancerProfile profile_skill = freelancer.getFreelancerProfiles();
		
		if(profile_skill == null) {
			profile_skill = new FreelancerProfile();
			profile_skill.setFreelancer(freelancer);
			profile_skill.setRating(0F);
			profile_skill.setYearExperience(0);
		}
		
		profile_skill.setSkills(skill.getSkill());
		
		return freelancerProfileRepository.save(profile_skill);
	}

	@Override // active mode by default
	public List<GigResponseDTO> getActivedService(Long freelancerId) {
	    Freelancer freelancer = getByFreelancer(freelancerId);
	    FreelancerProfile profile = freelancer.getFreelancerProfiles();

	    if (profile == null) {
	    	return Collections.emptyList();
	    }

	    return activeServices(profile).stream()
	    		.filter(this::isVisibleToFreelancer)
	            .map(g -> {
	                GigResponseDTO gigDto = new GigResponseDTO();

	                // create
	                gigDto.setServiceTitle(g.getServiceTitle());
	                gigDto.setCategory(g.getCategory());
	                gigDto.setServiceDescription(g.getServiceDescription());
	                gigDto.setTags(g.getTags());

	                // pricing
	                gigDto.setPaymentChoice(g.getPaymentChoice());
	                gigDto.setPrice(g.getPrice());
	                gigDto.setDeliveryDate(g.getDeliveryDate());
	                gigDto.setRivision(g.getRivision());
	                gigDto.setPackageDescription(g.getPackageDescription());

	                // publish
	                if (g.getGigMainImageData() != null) {
	                    String base64 = Base64.getEncoder()
	                            .encodeToString(g.getGigMainImageData());
	                    gigDto.setGigMainImageData(base64);
	                }

	                gigDto.setGigMainImageContentType(g.getGigMainImageContentType());
	                gigDto.setGigMainImageName(g.getGigMainImageName());
	                
	                // cover images
	                if (g.getGalleryCoverImages() != null && !g.getGalleryCoverImages().isEmpty()) {
	                    List<GigCoverImagesDTO> coverImageDtos = g.getGalleryCoverImages().stream()
	                            .map(img -> {
	                                GigCoverImagesDTO imgDto = new GigCoverImagesDTO();

	                                if (img.getGigCoverImageData() != null) {
	                                    imgDto.setGigCoverImageData(
	                                            Base64.getEncoder().encodeToString(img.getGigCoverImageData())
	                                    );
	                                }

	                                imgDto.setGigCoverImageContentType(img.getGigCoverImageContentType());
	                                imgDto.setGigCoverImageName(img.getGigCoverImageName());

	                                return imgDto;
	                            })
	                            .toList();

	                    gigDto.setCoverImages(coverImageDtos);
	                }

	                fillGigAnalytics(gigDto, g);
	                return gigDto;
	            })
	            .toList();
	}

	// client side view profile
	@Transactional
	@Override
	public FreelancerProfileClientViewDTO freelancerProfileClientView(Long id) {
		Freelancer freelancer = getByFreelancer(id);
	    FreelancerProfile viewProfileByClient = freelancer.getFreelancerProfiles();
		if(viewProfileByClient == null) {
			throw new ResourceNotFoundException("FreelancerProfile", id);
		}
	    FreelancerProfileClientViewDTO dto = new FreelancerProfileClientViewDTO();
	    dto.setId(freelancer.getId());
	    dto.setFreelancerName(freelancer.getUsername());
	    dto.setFreelancerJob(viewProfileByClient.getFreelancerJob());
	    dto.setRating(viewProfileByClient.getRating());
	    dto.setWorkLocation(viewProfileByClient.getWorkLocation());
	    dto.setYearExperience(viewProfileByClient.getYearExperience());
	    dto.setAbout(viewProfileByClient.getAbout());
	    dto.setDescription(viewProfileByClient.getDescription());
	    dto.setSkill(viewProfileByClient.getSkills());  
	    dto.setActiveService(activeServices(viewProfileByClient).stream()
	    		.filter(this::isVisibleToClient)
			    		.map(g -> {
			                GigResponseDTO gigDto = new GigResponseDTO();
			                // create
			                gigDto.setServiceTitle(g.getServiceTitle());
			                gigDto.setCategory(g.getCategory());
			                gigDto.setServiceDescription(g.getServiceDescription());
			                gigDto.setTags(g.getTags());

			                // pricing
			                gigDto.setPaymentChoice(g.getPaymentChoice());
			                gigDto.setPrice(g.getPrice());
			                gigDto.setDeliveryDate(g.getDeliveryDate());
			                gigDto.setRivision(g.getRivision());
			                gigDto.setPackageDescription(g.getPackageDescription());

			                // publish (convert byte[] -> Base64)
			                if (g.getGigMainImageData() != null) {
			                    String base64 = Base64.getEncoder()
			                            .encodeToString(g.getGigMainImageData());
			                    gigDto.setGigMainImageData(base64);
			                }

			                gigDto.setGigMainImageContentType(g.getGigMainImageContentType());
			                gigDto.setGigMainImageName(g.getGigMainImageName());
			                
			                // cover images
			                if (g.getGalleryCoverImages() != null && !g.getGalleryCoverImages().isEmpty()) {
			                    List<GigCoverImagesDTO> coverImageDtos = g.getGalleryCoverImages().stream()
			                            .map(img -> {
			                                GigCoverImagesDTO imgDto = new GigCoverImagesDTO();

			                                if (img.getGigCoverImageData() != null) {
			                                    imgDto.setGigCoverImageData(
			                                            Base64.getEncoder().encodeToString(img.getGigCoverImageData())
			                                    );
			                                }

			                                imgDto.setGigCoverImageContentType(img.getGigCoverImageContentType());
			                                imgDto.setGigCoverImageName(img.getGigCoverImageName());

			                                return imgDto;
			                            })
			                            .toList();

			                    gigDto.setCoverImages(coverImageDtos);
			                }

			                fillGigAnalytics(gigDto, g);
			                return gigDto;

			            })
			            .toList()
	    		);
	    dto.setProfilePictureData(viewProfileByClient.getProfilePictureData());
	    dto.setProfilePictureName(viewProfileByClient.getProfilePictureName());
	    dto.setProfilePictureType(viewProfileByClient.getProfilePictureType());
		return dto;
	}
	
	// owner side view profile
	@Transactional
	@Override
	public FreelancerProfileDTO me(Long id) throws IOException {
		Freelancer freelancer = getByFreelancer(id);
		FreelancerProfile profile  = freelancer.getFreelancerProfiles();
		
		
	    if (profile == null) {
	        FreelancerProfileDTO dto = new FreelancerProfileDTO();
	        dto.setFreelancerName(freelancer.getUsername());
	        dto.setRating(0F);
	        dto.setYearExperience(0);
	        dto.setSkill(Collections.emptyList());
	        dto.setActiveService(Collections.emptyList());
	        return dto;
	    }
	    
		FreelancerProfileDTO dto = new FreelancerProfileDTO();
		dto.setId(profile.getId());
	    dto.setFreelancerName(freelancer.getUsername());
	    dto.setFreelancerJob(profile.getFreelancerJob());
	    dto.setRating(profile.getRating());
	    dto.setWorkLocation(profile.getWorkLocation());
	    dto.setYearExperience(profile.getYearExperience());
	    dto.setAbout(profile.getAbout());
	    dto.setDescription(profile.getDescription());
	    dto.setSkill(profile.getSkills());
	    dto.setActiveService(activeServices(profile).stream()
	    		.filter(this::isVisibleToFreelancer)
		    		.map(g -> {
		                GigResponseDTO gigDto = new GigResponseDTO();
		                // create
		                gigDto.setServiceTitle(g.getServiceTitle());
		                gigDto.setCategory(g.getCategory());
		                gigDto.setServiceDescription(g.getServiceDescription());
		                gigDto.setTags(g.getTags());
	
		                // pricing
		                gigDto.setPaymentChoice(g.getPaymentChoice());
		                gigDto.setPrice(g.getPrice());
		                gigDto.setDeliveryDate(g.getDeliveryDate());
		                gigDto.setRivision(g.getRivision());
		                gigDto.setPackageDescription(g.getPackageDescription());
	
		                // publish (convert byte[] -> Base64)
		                if (g.getGigMainImageData() != null) {
		                    String base64 = Base64.getEncoder()
		                            .encodeToString(g.getGigMainImageData());
		                    gigDto.setGigMainImageData(base64);
		                }
	
		                gigDto.setGigMainImageContentType(g.getGigMainImageContentType());
		                gigDto.setGigMainImageName(g.getGigMainImageName());
		                
		                // cover images
		                if (g.getGalleryCoverImages() != null && !g.getGalleryCoverImages().isEmpty()) {
		                    List<GigCoverImagesDTO> coverImageDtos = g.getGalleryCoverImages().stream()
		                            .map(img -> {
		                                GigCoverImagesDTO imgDto = new GigCoverImagesDTO();

		                                if (img.getGigCoverImageData() != null) {
		                                    imgDto.setGigCoverImageData(
		                                            Base64.getEncoder().encodeToString(img.getGigCoverImageData())
		                                    );
		                                }

		                                imgDto.setGigCoverImageContentType(img.getGigCoverImageContentType());
		                                imgDto.setGigCoverImageName(img.getGigCoverImageName());

		                                return imgDto;
		                            })
		                            .toList();

		                    gigDto.setCoverImages(coverImageDtos);
		                }

	
		                fillGigAnalytics(gigDto, g);
		                return gigDto;
	
		            })
		            .toList()
	    		);
	    dto.setProfilePictureData(profile.getProfilePictureData());
	    dto.setProfilePictureName(profile.getProfilePictureName());
	    dto.setProfilePictureType(profile.getProfilePictureType());
		return dto;
	}
	
	@Override
	public List<FreelancerProfileDTO> searchFreelancers(
	        String keyword,
	        String category,
	        Double minRating,
	        Integer maxPrice,
	        String location) {
	    
	    return getAllActiveFreelancers().stream()
	            .filter(dto -> {
	                // Filter by keyword (name or job)
	                if (keyword != null && !keyword.isEmpty()) {
	                    boolean matchesKeyword = dto.getFreelancerName().toLowerCase().contains(keyword.toLowerCase()) ||
	                            (dto.getFreelancerJob() != null && dto.getFreelancerJob().toLowerCase().contains(keyword.toLowerCase())) ||
	                            (dto.getAbout() != null && dto.getAbout().toLowerCase().contains(keyword.toLowerCase()));
	                    if (!matchesKeyword) return false;
	                }
	                
	                // Filter by category (skill)
	                if (category != null && !category.isEmpty()) {
	                    boolean matchesCategory = dto.getSkill() != null && 
	                            dto.getSkill().stream()
	                                    .anyMatch(skill -> skill.toLowerCase().contains(category.toLowerCase()));
	                    if (!matchesCategory) return false;
	                }
	                
	                // Filter by minimum rating
	                if (minRating != null) {
	                    if (dto.getRating() == null || dto.getRating() < minRating) return false;
	                }
	                
	                // Filter by maximum price
	                if (maxPrice != null) {
	                    boolean matchesPrice = dto.getActiveService() != null &&
	                            dto.getActiveService().stream()
	                                    .anyMatch(gig -> {
	                                        try {
	                                            Double gigPrice = gig.getPrice() != null ? Double.parseDouble(gig.getPrice().toString()) : null;
	                                            return gigPrice != null && gigPrice <= maxPrice;
	                                        } catch (NumberFormatException e) {
	                                            return false;
	                                        }
	                                    });
	                    if (!matchesPrice) return false;
	                }
	                
	                // Filter by location
	                if (location != null && !location.isEmpty()) {
	                    boolean matchesLocation = dto.getWorkLocation() != null &&
	                            dto.getWorkLocation().toLowerCase().contains(location.toLowerCase());
	                    if (!matchesLocation) return false;
	                }
	                
	                return true;
	            })
	            .toList();
	}
	
	@Override
	public List<FreelancerProfileDTO> getAllActiveFreelancers() {
	    List<Freelancer> activeFreelancers = freelancerRepository.findAll(PageRequest.of(0, 100)).getContent();
	    
	    return activeFreelancers.stream()
	            .filter(freelancer -> freelancer.getFreelancerProfiles() != null)
	            .map(freelancer -> {
	                FreelancerProfile profile = freelancer.getFreelancerProfiles();
	                FreelancerProfileDTO dto = new FreelancerProfileDTO();
	                
	                dto.setId(freelancer.getId());
	                dto.setFreelancerId(freelancer.getId());
	                dto.setProfileId(profile.getId());
	                dto.setFreelancerProfileId(profile.getId());
	                dto.setFreelancerName(freelancer.getUsername());
	                dto.setFreelancerJob(profile.getFreelancerJob());
	                dto.setRating(profile.getRating());
	                dto.setWorkLocation(profile.getWorkLocation());
	                dto.setYearExperience(profile.getYearExperience());
	                dto.setAbout(profile.getAbout());
	                dto.setDescription(profile.getDescription());
	                dto.setSkill(profile.getSkills());

	            dto.setProfilePictureData(null);
	            if (profile.getProfilePictureData() != null && profile.getProfilePictureData().length > 0) {
	                dto.setProfilePictureUrl("/freelancer/" + freelancer.getId() + "/avatar");
	            }
	            dto.setProfilePictureName(profile.getProfilePictureName());
	                dto.setProfilePictureType(profile.getProfilePictureType());
	                
	                // Active services
	            dto.setActiveService(activeServices(profile).stream()
	            		.filter(this::isVisibleToClient)
	                    .limit(6)
	                    .map(g -> {
	                            GigResponseDTO gigDto = new GigResponseDTO();
	                            gigDto.setServiceTitle(g.getServiceTitle());
	                            gigDto.setCategory(g.getCategory());
	                            gigDto.setServiceDescription(g.getServiceDescription());
	                            gigDto.setTags(g.getTags());
	                            
	                            gigDto.setPaymentChoice(g.getPaymentChoice());
	                            gigDto.setPrice(g.getPrice());
	                            gigDto.setDeliveryDate(g.getDeliveryDate());
	                            gigDto.setRivision(g.getRivision());
	                            gigDto.setPackageDescription(g.getPackageDescription());
	                            
	                            if (g.getGigMainImageData() != null) {
	                                String base64 = Base64.getEncoder()
	                                        .encodeToString(g.getGigMainImageData());
	                                gigDto.setGigMainImageData(base64);
	                            }
	                            
	                            gigDto.setGigMainImageContentType(g.getGigMainImageContentType());
	                            gigDto.setGigMainImageName(g.getGigMainImageName());
	                            
	                            if (g.getGalleryCoverImages() != null && !g.getGalleryCoverImages().isEmpty()) {
	                                List<GigCoverImagesDTO> coverImageDtos = g.getGalleryCoverImages().stream()
	                                        .map(img -> {
	                                            GigCoverImagesDTO imgDto = new GigCoverImagesDTO();
	                                            if (img.getGigCoverImageData() != null) {
	                                                imgDto.setGigCoverImageData(
	                                                        Base64.getEncoder().encodeToString(img.getGigCoverImageData())
	                                                );
	                                            }
	                                            imgDto.setGigCoverImageContentType(img.getGigCoverImageContentType());
	                                            imgDto.setGigCoverImageName(img.getGigCoverImageName());
	                                            return imgDto;
	                                        })
	                                        .toList();
	                                gigDto.setCoverImages(coverImageDtos);
	                            }
	                            
	                            fillGigAnalytics(gigDto, g);
	                            return gigDto;
	                        })
	                        .toList());
	                
	                return dto;
	            })
	            .toList();
	}

	private boolean isVisibleToFreelancer(Gig gig) {
		return gig != null
				&& gig.getGigMainImageData() != null
				&& (gig.getStatus() == GigStatus.ACTIVE || gig.getStatus() == GigStatus.PAUSED);
	}

	private List<Gig> activeServices(FreelancerProfile profile) {
		if (profile == null || profile.getActiveService() == null) {
			return Collections.emptyList();
		}

		return profile.getActiveService();
	}

	private boolean isVisibleToClient(Gig gig) {
		return gig != null && gig.getGigMainImageData() != null && gig.getStatus() == GigStatus.ACTIVE;
	}

	private void fillGigAnalytics(GigResponseDTO dto, Gig gig) {
		if (dto == null || gig == null) {
			return;
		}

		dto.setGigId(gig.getId());
		dto.setStatus(gig.getStatus() != null ? gig.getStatus().name().toLowerCase() : null);
		dto.setFreelancerId(gig.getFreelancer() != null ? gig.getFreelancer().getId() : null);
		dto.setFreelancerName(gig.getFreelancer() != null ? gig.getFreelancer().getUsername() : null);
		dto.setViews(gig.getViewCount() != null ? gig.getViewCount() : 0L);
		dto.setOrders(countGigOrders(gig));
		dto.setReviews(countGigReviews(gig));
		dto.setRating(averageGigRating(gig));
	}

	private Long countGigOrders(Gig gig) {
		if (gig.getProjects() == null) {
			return 0L;
		}

		return gig.getProjects().stream()
				.filter(project -> project.getStatus() != ProjectStatusEnum.CANCELLED)
				.count();
	}

	private Long countGigReviews(Gig gig) {
		if (gig.getProjects() == null) {
			return 0L;
		}

		return gig.getProjects().stream()
				.filter(project -> project.getRating() != null)
				.count();
	}

	private Double averageGigRating(Gig gig) {
		if (gig.getProjects() == null) {
			return 0.0;
		}

		return gig.getProjects().stream()
				.map(Project::getRating)
				.filter(rating -> rating != null)
				.mapToDouble(Double::doubleValue)
				.average()
				.orElse(0.0);
	}

}

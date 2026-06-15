package backend.service.impl.freelancer.gig;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.PageRequest;

import backend.dto.freelancer.gig.GigRequestDTO;
import backend.enums.ekyc.EkycStatus;
import backend.exception.ResourceNotFoundException;
import backend.model.admin.AdminSetting;
import backend.model.authentication.Freelancer;
import backend.model.chat.ChatRoom;
import backend.model.ekyc.EkycForm;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer.gig.GigCoverImage;
import backend.model.freelancer.gig.GigStatus;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.repository.admin.AdminSettingRepository;
import backend.repository.chat.ChatMessageRepository;
import backend.repository.chat.ChatRoomRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.ekyc.EkycRepository;
import backend.repository.freelancer.gig.GigRepository;
import backend.repository.freelancer.profile.FreelancerProfileRepository;
import backend.service.freelancer.gig.GigService;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GigServiceImpl implements GigService{

	private final GigRepository gigRepository;
	private final FreelancerRepository freelancerRepository;
	private final FreelancerProfileRepository freelancerProfileRepository;
	private final ChatRoomRepository chatRoomRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final EkycRepository ekycRepository;
	private final AdminSettingRepository adminSettingRepository;
	
	@Override
	public Gig getById(Long id) {
		return gigRepository.findById(id)
							.orElseThrow(() -> new ResourceNotFoundException(" ", id));
	}

	@Override
	public Gig save(Gig createGig, String email) {

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found with email: " + email));
	    
	    FreelancerProfile profile = freelancer.getFreelancerProfiles();
	    if (profile == null) {
	        throw new RuntimeException("Freelancer Profile Not Found");
	    }
	    requireVerifiedEkyc(freelancer);
	    
		createGig.setFreelancer(freelancer);
		createGig.setFreelancerProfile(profile);
		createGig.setStatus(GigStatus.DRAFT);
		
		return gigRepository.save(createGig);
	}

	@Override
	public Gig updateOverview(Long freelancerId, Long gigId, GigRequestDTO request) {
		Gig gigForm = gigRepository.findByIdAndFreelancerId(gigId, freelancerId)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found"));

		gigForm.setServiceTitle(request.getServiceTitle());
		gigForm.setCategory(request.getCategory());
		gigForm.setServiceDescription(request.getServiceDescription());
		gigForm.setTags(request.getTags());

		return gigRepository.save(gigForm);
	}

	@Override
	public Gig step2_pricing(Long id, Long gigId, GigRequestDTO request) {
		
	    Freelancer freelancer = freelancerRepository.findById(id)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
	    FreelancerProfile profile = freelancer.getFreelancerProfiles();
	    
	    if (profile == null) {
	        throw new RuntimeException("Freelancer Profile Not Found");
	    }
	    requireVerifiedEkyc(freelancer);
	    
		Gig gigForm = gigRepository.findByIdAndFreelancerId(gigId, id)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found Step_2"));
		
		gigForm.setFreelancerProfile(profile);
		gigForm.setPaymentChoice(request.getPaymentChoice());
		gigForm.setPrice(request.getPrice());
		gigForm.setDeliveryDate(request.getDeliveryDate());
		gigForm.setRivision(request.getRivision());
		gigForm.setPackageDescription(request.getPackageDescription());
		gigForm.setPricingPackagesJson(request.getPricingPackagesJson());
		
		return gigRepository.save(gigForm);
	}

	@Override
	@Transactional
	public Gig updateStatus(Long freelancerId, Long gigId, GigStatus status) {
		Gig gigForm = gigRepository.findByIdAndFreelancerId(gigId, freelancerId)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found"));

		gigForm.setStatus(status);
		Gig savedGig = gigRepository.save(gigForm);

		if (status == GigStatus.DISABLED) {
			deleteChatRoomsForGig(gigId);
		}

		return savedGig;
	}

	private void deleteChatRoomsForGig(Long gigId) {
		List<ChatRoom> rooms = chatRoomRepository.findByGigId(gigId);
		if (rooms.isEmpty()) {
			return;
		}

		List<Long> roomIds = rooms.stream()
				.map(ChatRoom::getId)
				.toList();

		chatMessageRepository.deleteByChatRoom_IdIn(roomIds);
		chatRoomRepository.deleteAll(rooms);
	}

	@Transactional
	@Override
	public Gig step3_publish(Long id, Long gigId, MultipartFile mainImage, List<MultipartFile> coverImages) throws Exception {
		
		Freelancer freelancer = freelancerRepository.findById(id)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    FreelancerProfile profile = freelancer.getFreelancerProfiles();
	    if (profile == null) {
	        throw new RuntimeException("Freelancer Profile Not Found");
	    }
	    requireVerifiedEkyc(freelancer);
		
		Gig gigForm = gigRepository.findByIdAndFreelancerId(gigId, id)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found Step_3"));
		
	    gigForm.setFreelancer(freelancer);
	    gigForm.setFreelancerProfile(profile);
		
		if(mainImage != null && !mainImage.isEmpty()) {
			FileUploadGuard.requireImage(mainImage, FileUploadGuard.IMAGE_MAX_BYTES, "Main gig image");
			gigForm.setGigMainImageName(mainImage.getOriginalFilename());
			gigForm.setGigMainImageContentType(mainImage.getContentType());
			gigForm.setGigMainImageData(mainImage.getBytes());
		}
		
		if(coverImages != null && !coverImages.isEmpty()) {
			if(gigForm.getGalleryCoverImages() == null) {
				gigForm.setGalleryCoverImages(new ArrayList<>());
			} else {
				gigForm.getGalleryCoverImages().clear();
			}
			
			for(MultipartFile file : coverImages) {
				if (file != null && !file.isEmpty()) {
					FileUploadGuard.requireImage(file, FileUploadGuard.IMAGE_MAX_BYTES, "Cover image");
					GigCoverImage coverImage = new GigCoverImage();
	                coverImage.setGigCoverImageData(file.getBytes());
	                coverImage.setGigCoverImageContentType(file.getContentType());
	                coverImage.setGigCoverImageName(file.getOriginalFilename());
	                coverImage.setGig(gigForm);

	                gigForm.getGalleryCoverImages().add(coverImage);
				}
			}
		}

		gigForm.setStatus(GigStatus.ACTIVE);
			
		return gigRepository.save(gigForm);
	}
	
	@Override
	public Gig getGigForFreelancerView(Long freelancerId, Long gigId) {
	    Gig gig = gigRepository.findByIdAndFreelancerId(gigId, freelancerId)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found"));

	    if (gig.getStatus() == GigStatus.DISABLED) {
	    	throw new RuntimeException("Gig Not Found");
	    }

	    return gig;
	}

	@Override
	public Gig getGigForClientView(Long gigId) {
	    Gig gig = gigRepository.findById(gigId)
	            .orElseThrow(() -> new RuntimeException("Gig Not Found"));
	    if (gig.getStatus() != GigStatus.ACTIVE || gig.getGigMainImageData() == null) {
	    	throw new RuntimeException("Gig Not Found");
	    }
	    gig.setViewCount((gig.getViewCount() == null ? 0L : gig.getViewCount()) + 1);
	    return gigRepository.save(gig);
	}
	
	@Override
	public List<Gig> getFreelancerGigList(Long freelancerId) {
	    return gigRepository.findVisibleForFreelancer(
	    		freelancerId,
	    		List.of(GigStatus.ACTIVE, GigStatus.PAUSED),
				PageRequest.of(0, 100)
	    );
	}

	@Override
	public List<Gig> getAllClientGigs() {
	    return gigRepository.findVisibleForClient(GigStatus.ACTIVE, PageRequest.of(0, 100));
	}

	private void requireVerifiedEkyc(Freelancer freelancer) {
		if (!isIdentityVerificationRequired()) {
			return;
		}
		Long registerId = freelancer.getRegister() != null ? freelancer.getRegister().getId() : null;
		EkycForm form = registerId != null
				? ekycRepository.findByRegister_Id(registerId).orElse(null)
				: null;
		if (form == null || form.getStatus() != EkycStatus.VERIFIED) {
			throw new RuntimeException("E-KYC verification must be completed before creating or publishing gigs.");
		}
	}

	private boolean isIdentityVerificationRequired() {
		AdminSetting setting = adminSettingRepository.findById(1L).orElse(null);
		return setting == null || setting.isIdentityVerificationRequired();
	}

}

package backend.service.freelancer.gig;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.gig.GigRequestDTO;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer.gig.GigStatus;

public interface GigService {
	Gig getById(Long id);
	Gig save(Gig createGig, String freelancer);
	Gig updateOverview(Long freelancerId, Long gigId, GigRequestDTO request);
	Gig step2_pricing(Long id, Long gigId, GigRequestDTO request);
	Gig step3_publish(Long id, Long gigId, MultipartFile mainImage, List<MultipartFile> coverImages) throws Exception;
	Gig updateStatus(Long freelancerId, Long gigId, GigStatus status);
	Gig getGigForFreelancerView(Long freelancerId, Long gigId);
	Gig getGigForClientView(Long gigId);
	List<Gig> getFreelancerGigList(Long freelancerId);
	List<Gig> getAllClientGigs();
}

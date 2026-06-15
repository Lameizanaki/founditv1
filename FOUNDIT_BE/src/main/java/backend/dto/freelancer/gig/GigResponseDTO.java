package backend.dto.freelancer.gig;

import java.util.List;

import lombok.Data;

@Data
public class GigResponseDTO {
	
	// create
	private Long gigId;
	private String serviceTitle;
	private String category;
	private String serviceDescription;
	private List<String> tags;
	
	// pricing
	private String paymentChoice;
	private String price;
	private String deliveryDate;
	private String rivision;
	private String packageDescription;
	private String pricingPackagesJson;
	private String status;
	private Long views;
	private Long orders;
	private Double rating;
	private Long reviews;
	
	
	// publish
	private String gigMainImageData;
	private String gigMainImageContentType;
	private String gigMainImageName;
	
	private List<GigCoverImagesDTO> coverImages;
	
	private Long freelancerId;  // Add this field
	private String freelancerName; // Also good to have the name
}

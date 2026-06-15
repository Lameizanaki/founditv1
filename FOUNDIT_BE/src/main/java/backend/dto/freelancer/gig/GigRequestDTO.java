package backend.dto.freelancer.gig;

import java.util.List;

import jakarta.persistence.Lob;
import lombok.Data;

@Data
public class GigRequestDTO {
	
	private String serviceTitle;
	private String category;
	private String serviceDescription;
	private List<String> tags;
	
	private String paymentChoice;
	private String price;
	private String deliveryDate;
	private String rivision;
	private String packageDescription;
	private String pricingPackagesJson;
	
	@Lob
	private byte[] gigMainImageData;
	private String gigMainImageContentType;
	private String gigMainImageName;
}

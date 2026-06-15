package backend.dto.freelancer.profile.client_view;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class FreelancerRightSideBarClientViewDTO {
	private Long id;
	private BigDecimal startPrice;
	private Long viewCount = 0L;
}

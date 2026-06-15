package backend.dto.freelancer.profile.me;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class FreelancerRightSideBarDTO {
	private Long id;
	private BigDecimal startPrice;
	private Long viewCount = 0L;
}

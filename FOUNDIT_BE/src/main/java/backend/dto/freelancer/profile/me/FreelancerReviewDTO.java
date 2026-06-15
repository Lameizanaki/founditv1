package backend.dto.freelancer.profile.me;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class FreelancerReviewDTO {
	private Long id;
	private Long clientId;
	private String clientName;
	private Integer rating;
	private String service;
	private String comment;
	private LocalDateTime createdAt;
}

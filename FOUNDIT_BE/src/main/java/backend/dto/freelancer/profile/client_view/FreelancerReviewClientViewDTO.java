package backend.dto.freelancer.profile.client_view;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class FreelancerReviewClientViewDTO {
	private Long id;
	private Long clientId;
	private String clientName;
	private Integer rating;
	private String service;
	private String comment;
	private LocalDateTime createdAt;
}

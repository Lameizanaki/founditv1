package backend.dto.admin;

import lombok.Data;

@Data
public class DashboardRequestDTO {
	private long totalFreelancers;
    private long totalClients;
    private long totalUsers;
}

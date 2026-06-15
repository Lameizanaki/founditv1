package backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class DashboardResponseDTO {
	private long totalFreelancers;
    private long totalClients;
    private long totalUsers;
    private BigDecimal totalRevenue;
    private long paidPaymentRecords;
    private BigDecimal pendingRevenue;
    private long submittedPaymentRecords;
    private long pendingReviews;
    private List<AdminPendingReviewDTO> pendingReviewItems;
}

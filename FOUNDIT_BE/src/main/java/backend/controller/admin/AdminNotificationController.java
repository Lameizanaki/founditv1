package backend.controller.admin;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.admin.AdminNotificationDTO;
import backend.enums.admin.AccountReportStatus;
import backend.enums.ekyc.EkycStatus;
import backend.model.admin.AccountReport;
import backend.model.authentication.Register;
import backend.model.ekyc.EkycForm;
import backend.repository.admin.AccountReportRepository;
import backend.repository.ekyc.EkycRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AdminNotificationController {
	private static final List<EkycStatus> ADMIN_REVIEW_STATUSES = List.of(EkycStatus.IN_REVIEW, EkycStatus.FAILED);

	private final AccountReportRepository accountReportRepository;
	private final EkycRepository ekycRepository;

	@GetMapping("/admin/notifications")
	public List<AdminNotificationDTO> getNotifications() {
		List<AdminNotificationDTO> notifications = new ArrayList<>();

		accountReportRepository.findByStatusOrderByCreatedAtDesc(AccountReportStatus.PENDING)
				.stream()
				.limit(20)
				.map(this::reportNotification)
				.forEach(notifications::add);

		ekycRepository.findByStatusInOrderByIdDesc(ADMIN_REVIEW_STATUSES)
				.stream()
				.limit(20)
				.map(this::ekycNotification)
				.forEach(notifications::add);

		return notifications.stream()
				.sorted(Comparator.comparing(
						AdminNotificationDTO::getCreatedAt,
						Comparator.nullsLast(Comparator.reverseOrder())
				))
				.limit(30)
				.toList();
	}

	private AdminNotificationDTO reportNotification(AccountReport report) {
		Register user = report.getRegister();
		String username = user != null ? user.getUsername() : "A user";
		return new AdminNotificationDTO(
				"report:" + report.getId(),
				"admin_report_submitted",
				"New user report",
				username + " submitted a report for admin review.",
				"/admin/reports",
				report.getCreatedAt(),
				Map.of(
						"reportId", report.getId(),
						"username", username,
						"subject", report.getSubject()
				)
		);
	}

	private AdminNotificationDTO ekycNotification(EkycForm form) {
		Register user = form.getRegister();
		String username = user != null ? user.getUsername() : "A user";
		return new AdminNotificationDTO(
				"ekyc:" + form.getId(),
				"admin_ekyc_pending",
				"New E-KYC request",
				username + " submitted identity verification for admin review.",
				"/admin/dashboard",
				null,
				Map.of(
						"ekycId", form.getId(),
						"username", username
				)
		);
	}
}

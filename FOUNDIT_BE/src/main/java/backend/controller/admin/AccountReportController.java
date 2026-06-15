package backend.controller.admin;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.admin.AccountReportRequestDTO;
import backend.dto.admin.AccountReportResponseDTO;
import backend.dto.admin.AccountReportUpdateDTO;
import backend.dto.admin.AccountStatusDTO;
import backend.enums.admin.AccountReportStatus;
import backend.enums.admin.UserStatus;
import backend.model.admin.AccountReport;
import backend.model.authentication.Register;
import backend.repository.admin.AccountReportRepository;
import backend.repository.authentication.RegisterRepository;
import backend.service.notification.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AccountReportController {
    private final AccountReportRepository accountReportRepository;
    private final RegisterRepository registerRepository;
    private final NotificationEventPublisher notificationEventPublisher;

    @GetMapping("/account/status")
    public AccountStatusDTO getAccountStatus(Authentication auth) {
        Register user = currentUser(auth);
        return new AccountStatusDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                normalizeStatus(user.getStatus())
        );
    }

    @PostMapping("/account/reports")
    public AccountReportResponseDTO submitReport(Authentication auth, @RequestBody AccountReportRequestDTO request) {
        Register user = currentUser(auth);
        String subject = request.getSubject() != null && !request.getSubject().isBlank()
                ? request.getSubject().trim()
                : "Suspended account review request";
        String message = request.getMessage() != null && !request.getMessage().isBlank()
                ? request.getMessage().trim()
                : "User requested admin review for a suspended account.";

        AccountReport report = new AccountReport();
        report.setRegister(user);
        report.setSubject(subject);
        report.setMessage(message);
        report.setStatus(AccountReportStatus.PENDING);
        AccountReport saved = accountReportRepository.save(report);
        notificationEventPublisher.publishAdminReportSubmitted(saved);
        return toResponse(saved);
    }

    @GetMapping("/account/reports")
    public List<AccountReportResponseDTO> myReports(Authentication auth) {
        return accountReportRepository.findByRegister_EmailOrderByCreatedAtDesc(auth.getName())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/admin/reports")
    public List<AccountReportResponseDTO> getReports() {
        return accountReportRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PutMapping("/admin/reports/{id}")
    public AccountReportResponseDTO updateReport(@PathVariable Long id, @RequestBody AccountReportUpdateDTO request) {
        AccountReport report = accountReportRepository.findById(id).orElseThrow();
        report.setStatus(request.getStatus() != null ? request.getStatus() : AccountReportStatus.REVIEWED);
        report.setAdminNote(request.getAdminNote() != null && !request.getAdminNote().isBlank()
                ? request.getAdminNote().trim()
                : null);
        return toResponse(accountReportRepository.save(report));
    }

    private Register currentUser(Authentication auth) {
        return registerRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    private AccountReportResponseDTO toResponse(AccountReport report) {
        Register user = report.getRegister();
        return new AccountReportResponseDTO(
                report.getId(),
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : null,
                user != null ? user.getEmail() : null,
                user != null ? user.getRole() : null,
                user != null ? normalizeStatus(user.getStatus()) : null,
                report.getSubject(),
                report.getMessage(),
                report.getStatus(),
                report.getAdminNote(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }

    private UserStatus normalizeStatus(UserStatus status) {
        return status != null ? status : UserStatus.ACTIVE;
    }
}

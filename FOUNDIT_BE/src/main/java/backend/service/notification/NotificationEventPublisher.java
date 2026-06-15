package backend.service.notification;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import backend.dto.notification.NotificationEvent;
import backend.model.admin.AccountReport;
import backend.model.authentication.Register;
import backend.model.ekyc.EkycForm;
import backend.model.freelancer_client.HireRequest;
import backend.model.payment.PaymentTransaction;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    public void publishHireRequestCreated(HireRequest request) {
        String receiverEmail = request.getFreelancer() != null ? request.getFreelancer().getEmail() : null;
        publish(receiverEmail, NotificationEvent.builder()
                .type("hire_request_created")
                .title("New Hire Request")
                .message((request.getClient() != null ? request.getClient().getUsername() : "A client")
                        + " sent you a hire request.")
                .hireRequestId(request.getId())
                .projectId(projectId(request))
                .status(status(request))
                .createdAt(LocalDateTime.now())
                .data(hireRequestData(request))
                .build());
    }

    public void publishHireRequestAccepted(HireRequest request) {
        String receiverEmail = request.getClient() != null ? request.getClient().getEmail() : null;
        publish(receiverEmail, NotificationEvent.builder()
                .type("hire_request_accepted")
                .title("Hire Request Accepted")
                .message("Your hire request was accepted.")
                .hireRequestId(request.getId())
                .projectId(projectId(request))
                .status(status(request))
                .createdAt(LocalDateTime.now())
                .data(hireRequestData(request))
                .build());
    }

    public void publishHireRequestRejected(HireRequest request) {
        String receiverEmail = request.getClient() != null ? request.getClient().getEmail() : null;
        publish(receiverEmail, NotificationEvent.builder()
                .type("hire_request_rejected")
                .title("Hire Request Rejected")
                .message("Your hire request was rejected.")
                .hireRequestId(request.getId())
                .projectId(projectId(request))
                .status(status(request))
                .createdAt(LocalDateTime.now())
                .data(hireRequestData(request))
                .build());
    }

    public void publishHireRequestCancelled(HireRequest request) {
        String receiverEmail = request.getFreelancer() != null ? request.getFreelancer().getEmail() : null;
        publish(receiverEmail, NotificationEvent.builder()
                .type("hire_request_cancelled")
                .title("Hire Request Cancelled")
                .message((request.getClient() != null ? request.getClient().getUsername() : "A client")
                        + " cancelled a hire request.")
                .hireRequestId(request.getId())
                .projectId(projectId(request))
                .status(status(request))
                .createdAt(LocalDateTime.now())
                .data(hireRequestData(request))
                .build());
    }

    public void publishPaymentReceived(PaymentTransaction transaction) {
        if (transaction == null || transaction.getProject() == null) {
            return;
        }

        String receiverEmail = transaction.getProject().getFreelancer() != null
                ? transaction.getProject().getFreelancer().getEmail()
                : null;
        publish(receiverEmail, NotificationEvent.builder()
                .type("payment_received")
                .title("Payment Received")
                .message("Client payment was completed.")
                .hireRequestId(transaction.getProject().getHireRequest() != null
                        ? transaction.getProject().getHireRequest().getId()
                        : null)
                .projectId(transaction.getProject().getId())
                .status(transaction.getStatus() != null ? transaction.getStatus().name() : null)
                .createdAt(LocalDateTime.now())
                .data(paymentData(transaction))
                .build());
    }

    public void publishAdminReportSubmitted(AccountReport report) {
        if (report == null) {
            return;
        }

        Register user = report.getRegister();
        messagingTemplate.convertAndSend("/topic/admin/notifications", NotificationEvent.builder()
                .type("admin_report_submitted")
                .title("New user report")
                .message((user != null ? user.getUsername() : "A user") + " submitted a report for admin review.")
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .createdAt(LocalDateTime.now())
                .data(adminReportData(report))
                .build());
    }

    public void publishAdminEkycRequested(EkycForm form) {
        if (form == null) {
            return;
        }

        Register user = form.getRegister();
        messagingTemplate.convertAndSend("/topic/admin/notifications", NotificationEvent.builder()
                .type("admin_ekyc_pending")
                .title("New E-KYC request")
                .message((user != null ? user.getUsername() : "A user")
                        + " submitted identity verification for admin review.")
                .status(form.getStatus() != null ? form.getStatus().name() : null)
                .createdAt(LocalDateTime.now())
                .data(adminEkycData(form))
                .build());
    }

    private void publish(String receiverEmail, NotificationEvent event) {
        if (receiverEmail == null || receiverEmail.isBlank()) {
            return;
        }

        messagingTemplate.convertAndSendToUser(receiverEmail, "/queue/notifications", event);
    }

    private Map<String, Object> hireRequestData(HireRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("gigTitle", request.getGig() != null ? request.getGig().getServiceTitle() : null);
        data.put("clientName", request.getClient() != null ? request.getClient().getUsername() : null);
        data.put("freelancerName", request.getFreelancer() != null ? request.getFreelancer().getUsername() : null);
        data.put("agreedPrice", request.getAgreedPrice());
        return data;
    }

    private Map<String, Object> paymentData(PaymentTransaction transaction) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("tranId", transaction.getTranId());
        data.put("amount", transaction.getAmount());
        data.put("currency", transaction.getCurrency());
        data.put("paidAt", transaction.getPaidAt());
        return data;
    }

    private Map<String, Object> adminReportData(AccountReport report) {
        Register user = report.getRegister();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("reportId", report.getId());
        data.put("username", user != null ? user.getUsername() : null);
        data.put("email", user != null ? user.getEmail() : null);
        data.put("subject", report.getSubject());
        data.put("route", "/admin/reports");
        return data;
    }

    private Map<String, Object> adminEkycData(EkycForm form) {
        Register user = form.getRegister();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("ekycId", form.getId());
        data.put("username", user != null ? user.getUsername() : null);
        data.put("email", user != null ? user.getEmail() : null);
        data.put("route", "/admin/dashboard");
        return data;
    }

    private Long projectId(HireRequest request) {
        return request.getProject() != null ? request.getProject().getId() : null;
    }

    private String status(HireRequest request) {
        return request.getStatus() != null ? request.getStatus().name().toLowerCase() : null;
    }
}

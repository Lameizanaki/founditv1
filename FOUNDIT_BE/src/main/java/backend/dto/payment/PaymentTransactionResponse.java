package backend.dto.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import backend.enums.payment.PaymentStatusEnum;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.payment.PaymentTransaction;
import lombok.Data;

@Data
public class PaymentTransactionResponse {
    private Long id;
    private String tranId;
    private String sellerPaymentAccount;
    private BigDecimal amount;
    private String currency;
    private PaymentStatusEnum status;
    private Long projectId;
    private String projectTitle;
    private String clientName;
    private Long freelancerId;
    private String freelancerName;
    private byte[] freelancerProfilePictureData;
    private String freelancerProfilePictureType;
    private String paymentMethod;
    private String manualStatusCode;
    private String manualStatusMessage;
    private String confirmedReference;
    private String proofReference;
    private String proofFileName;
    private String proofFileType;
    private Boolean hasProofFile;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private LocalDateTime paidAt;

    public PaymentTransactionResponse() {
    }

    public PaymentTransactionResponse(
            Long id,
            String tranId,
            String sellerPaymentAccount,
            BigDecimal amount,
            String currency,
            PaymentStatusEnum status,
            Long projectId,
            String projectTitle,
            String clientName,
            Long freelancerId,
            String freelancerName,
            String paymentMethod,
            String manualStatusCode,
            String manualStatusMessage,
            String confirmedReference,
            String proofReference,
            String proofFileName,
            String proofFileType,
            Boolean hasProofFile,
            LocalDateTime createdAt,
            LocalDateTime submittedAt,
            LocalDateTime paidAt) {
        this.id = id;
        this.tranId = tranId;
        this.sellerPaymentAccount = sellerPaymentAccount;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.projectId = projectId;
        this.projectTitle = projectTitle;
        this.clientName = clientName;
        this.freelancerId = freelancerId;
        this.freelancerName = freelancerName;
        this.paymentMethod = paymentMethod;
        this.manualStatusCode = manualStatusCode;
        this.manualStatusMessage = manualStatusMessage;
        this.confirmedReference = confirmedReference;
        this.proofReference = proofReference;
        this.proofFileName = proofFileName;
        this.proofFileType = proofFileType;
        this.hasProofFile = hasProofFile;
        this.createdAt = createdAt;
        this.submittedAt = submittedAt;
        this.paidAt = paidAt;
    }

    public static PaymentTransactionResponse from(PaymentTransaction tx) {
        PaymentTransactionResponse response = new PaymentTransactionResponse();
        response.setId(tx.getId());
        response.setTranId(tx.getTranId());
        response.setSellerPaymentAccount(tx.getSellerPaymentAccount());
        response.setAmount(tx.getAmount());
        response.setCurrency(tx.getCurrency());
        response.setStatus(tx.getStatus());
        response.setProjectId(tx.getProject() != null ? tx.getProject().getId() : null);
        response.setProjectTitle(tx.getProject() != null ? tx.getProject().getProjectTitle() : null);
        response.setClientName(tx.getProject() != null && tx.getProject().getClient() != null
                ? tx.getProject().getClient().getUsername()
                : null);
        Freelancer freelancer = tx.getProject() != null ? tx.getProject().getFreelancer() : null;
        FreelancerProfile freelancerProfile = freelancer != null ? freelancer.getFreelancerProfiles() : null;
        response.setFreelancerId(freelancer != null ? freelancer.getId() : null);
        response.setFreelancerName(resolveFreelancerName(freelancer, freelancerProfile));
        response.setFreelancerProfilePictureData(null);
        response.setFreelancerProfilePictureType(
                freelancerProfile != null && freelancerProfile.getProfilePictureData() != null
                        ? freelancerProfile.getProfilePictureType()
                        : null);
        response.setPaymentMethod(tx.getPaymentMethod());
        response.setManualStatusCode(tx.getManualStatusCode());
        response.setManualStatusMessage(tx.getManualStatusMessage());
        response.setConfirmedReference(tx.getConfirmedReference());
        response.setProofReference(tx.getProofReference());
        response.setProofFileName(tx.getProofFileName());
        response.setProofFileType(tx.getProofFileType());
        response.setHasProofFile(tx.getProofFileData() != null && tx.getProofFileData().length > 0);
        response.setCreatedAt(tx.getCreatedAt());
        response.setSubmittedAt(tx.getSubmittedAt());
        response.setPaidAt(tx.getPaidAt());
        return response;
    }

    private static String resolveFreelancerName(
            Freelancer freelancer,
            FreelancerProfile freelancerProfile) {
        if (freelancerProfile != null && freelancerProfile.getFreelancer() != null
                && freelancerProfile.getFreelancer().getUsername() != null
                && !freelancerProfile.getFreelancer().getUsername().isBlank()) {
            return freelancerProfile.getFreelancer().getUsername();
        }

        return freelancer != null ? freelancer.getUsername() : null;
    }
}

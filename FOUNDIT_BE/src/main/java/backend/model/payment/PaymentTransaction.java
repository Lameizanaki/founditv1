package backend.model.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import backend.enums.payment.PaymentStatusEnum;
import backend.model.freelancer_client.Project;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
@Table(name = "payment_transaction", indexes = {
        @Index(name = "idx_payment_transaction_tran_id", columnList = "tran_id"),
        @Index(name = "idx_payment_transaction_project_id", columnList = "project_id"),
        @Index(name = "idx_payment_transaction_status", columnList = "status")
})
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tran_id", nullable = false, unique = true, length = 80)
    private String tranId;

    @Column(name = "seller_payment_account")
    private String sellerPaymentAccount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatusEnum status;

    @Column(name = "payment_method", length = 40)
    private String paymentMethod;

    @Column(name = "manual_status_code", length = 50)
    private String manualStatusCode;

    @Column(name = "manual_status_message")
    private String manualStatusMessage;

    @Column(name = "confirmed_reference")
    private String confirmedReference;

    @Column(length = 255)
    private String proofReference;

    private String proofFileName;
    private String proofFileType;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "proof_file_data", columnDefinition = "bytea")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] proofFileData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Project project;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime paidAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (submittedAt == null) {
            submittedAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

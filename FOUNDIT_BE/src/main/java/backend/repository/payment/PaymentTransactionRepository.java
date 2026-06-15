package backend.repository.payment;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.dto.payment.PaymentTransactionResponse;
import backend.model.payment.PaymentTransaction;
import backend.enums.payment.PaymentStatusEnum;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByTranId(String tranId);
    List<PaymentTransaction> findByProject_IdOrderByCreatedAtDesc(Long projectId);
    List<PaymentTransaction> findByProject_Client_IdOrderByCreatedAtDesc(Long clientId);
    List<PaymentTransaction> findByProject_Freelancer_IdOrderByCreatedAtDesc(Long freelancerId);
    boolean existsByProject_IdAndStatus(Long projectId, PaymentStatusEnum status);
    long countByStatus(PaymentStatusEnum status);

    @Query("""
            select new backend.dto.payment.PaymentTransactionResponse(
                p.id,
                p.tranId,
                p.sellerPaymentAccount,
                p.amount,
                p.currency,
                p.status,
                project.id,
                project.projectTitle,
                client.username,
                freelancer.id,
                freelancer.username,
                p.paymentMethod,
                p.manualStatusCode,
                p.manualStatusMessage,
                p.confirmedReference,
                p.proofReference,
                p.proofFileName,
                p.proofFileType,
                case when p.proofFileData is not null then true else false end,
                p.createdAt,
                p.submittedAt,
                p.paidAt
            )
            from PaymentTransaction p
            join p.project project
            join project.client client
            join project.freelancer freelancer
            where client.id = :clientId
            order by p.createdAt desc
            """)
    List<PaymentTransactionResponse> findClientTransactionResponses(@Param("clientId") Long clientId);

    @Query("""
            select new backend.dto.payment.PaymentTransactionResponse(
                p.id,
                p.tranId,
                p.sellerPaymentAccount,
                p.amount,
                p.currency,
                p.status,
                project.id,
                project.projectTitle,
                client.username,
                freelancer.id,
                freelancer.username,
                p.paymentMethod,
                p.manualStatusCode,
                p.manualStatusMessage,
                p.confirmedReference,
                p.proofReference,
                p.proofFileName,
                p.proofFileType,
                case when p.proofFileData is not null then true else false end,
                p.createdAt,
                p.submittedAt,
                p.paidAt
            )
            from PaymentTransaction p
            join p.project project
            join project.client client
            join project.freelancer freelancer
            where freelancer.id = :freelancerId
            order by p.createdAt desc
            """)
    List<PaymentTransactionResponse> findFreelancerTransactionResponses(@Param("freelancerId") Long freelancerId);

    @Query("select coalesce(sum(p.amount), 0) from PaymentTransaction p where p.status = backend.enums.payment.PaymentStatusEnum.PAID")
    BigDecimal sumPaidRevenue();

    @Query("select coalesce(sum(p.amount), 0) from PaymentTransaction p where p.status = :status")
    BigDecimal sumRevenueByStatus(@Param("status") PaymentStatusEnum status);

    @Query("select coalesce(sum(p.amount), 0) from PaymentTransaction p where p.status = backend.enums.payment.PaymentStatusEnum.PAID and p.project.freelancer.id = :freelancerId")
    BigDecimal sumPaidRevenueByFreelancerId(@Param("freelancerId") Long freelancerId);

    @Query("select coalesce(sum(p.amount), 0) from PaymentTransaction p where p.status = backend.enums.payment.PaymentStatusEnum.PAID and p.project.client.id = :clientId")
    BigDecimal sumPaidRevenueByClientId(@Param("clientId") Long clientId);
}

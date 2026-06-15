package backend.service.payment;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.payment.ManualPaymentSubmitResponse;
import backend.dto.payment.PaymentTransactionResponse;
import backend.model.freelancer.setting.Setting;
import backend.model.payment.PaymentTransaction;

public interface PaymentService {
    ManualPaymentSubmitResponse submitManualPayment(Authentication auth, Long projectId, String reference, MultipartFile proofFile);
    PaymentTransaction confirmManualPayment(Authentication auth, String tranId);
    PaymentTransaction getFreelancerPaymentTransaction(Authentication auth, String tranId);
    Setting getSellerPaymentSetting(Authentication auth, Long projectId);
    Setting getSellerPaymentSettingByGig(Authentication auth, Long gigId);
    PaymentTransaction checkTransaction(String tranId);
    List<PaymentTransaction> getClientTransactions(Authentication auth);
    List<PaymentTransaction> getFreelancerTransactions(Authentication auth);
    List<PaymentTransactionResponse> getClientTransactionResponses(Authentication auth);
    List<PaymentTransactionResponse> getFreelancerTransactionResponses(Authentication auth);
}

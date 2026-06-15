package backend.dto.payment;

import lombok.Data;

@Data
public class ManualPaymentSubmitResponse {
    private String tranId;
    private String orderId;
    private String paymentMethod;
    private String status;
    private String manualStatusCode;
    private String message;
}

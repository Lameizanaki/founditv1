package backend.controller.payment;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.payment.ManualPaymentSubmitResponse;
import backend.dto.payment.PaymentTransactionResponse;
import backend.enums.payment.PaymentStatusEnum;
import backend.model.freelancer.setting.Setting;
import backend.model.payment.PaymentTransaction;
import backend.service.payment.PaymentService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@CrossOrigin(value = "${frontend.url}")
@RequestMapping("/payment")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping(
            value = "/client/project/{projectId}/pay",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ManualPaymentSubmitResponse> initiateProjectPayment(
            @PathVariable Long projectId,
            @RequestParam(value = "reference", required = false) String reference,
            @RequestParam(value = "proof", required = false) MultipartFile proof,
            Authentication auth) {
        return ResponseEntity.ok(paymentService.submitManualPayment(auth, projectId, reference, proof));
    }

    @GetMapping("/{tranId}/status") // check transaction status
    public ResponseEntity<PaymentTransactionResponse> checkStatus(@PathVariable String tranId) {
        return ResponseEntity.ok(PaymentTransactionResponse.from(paymentService.checkTransaction(tranId)));
    }

    @GetMapping("/client/project/{projectId}/seller-qr")
    public ResponseEntity<?> getSellerPaymentQr(
            @PathVariable Long projectId,
            Authentication auth) {
        Setting setting = paymentService.getSellerPaymentSetting(auth, projectId);
        return ResponseEntity.ok(new SellerQrMetadata(
                hasSellerQr(setting),
                setting.getBankQrName(),
                setting.getBankQrType()
        ));
    }

    @GetMapping("/client/gig/{gigId}/seller-qr")
    public ResponseEntity<?> getSellerPaymentQrByGig(
            @PathVariable Long gigId,
            Authentication auth) {
        Setting setting = paymentService.getSellerPaymentSettingByGig(auth, gigId);
        return ResponseEntity.ok(new SellerQrMetadata(
                hasSellerQr(setting),
                setting.getBankQrName(),
                setting.getBankQrType()
        ));
    }

    @GetMapping("/client/project/{projectId}/seller-qr/image")
    public ResponseEntity<byte[]> downloadSellerPaymentQr(
            @PathVariable Long projectId,
            Authentication auth) {
        Setting setting = paymentService.getSellerPaymentSetting(auth, projectId);
        return sellerQrImageResponse(setting);
    }

    @GetMapping("/client/gig/{gigId}/seller-qr/image")
    public ResponseEntity<byte[]> downloadSellerPaymentQrByGig(
            @PathVariable Long gigId,
            Authentication auth) {
        Setting setting = paymentService.getSellerPaymentSettingByGig(auth, gigId);
        return sellerQrImageResponse(setting);
    }
    
    @GetMapping("/my-transactions") // get transaction history
    public ResponseEntity<List<PaymentTransactionResponse>> getMyTransactions(Authentication authentication) {
        return ResponseEntity.ok(paymentService.getClientTransactionResponses(authentication));
    }

    @GetMapping("/freelancer/my-transactions")
    public ResponseEntity<List<PaymentTransactionResponse>> getMyFreelancerTransactions(Authentication authentication) {
        return ResponseEntity.ok(paymentService.getFreelancerTransactionResponses(authentication));
    }

    @GetMapping("/freelancer/export-statement")
    public ResponseEntity<byte[]> exportFreelancerStatement(Authentication authentication) {
        List<PaymentTransactionResponse> transactions = paymentService.getFreelancerTransactionResponses(authentication);
        byte[] content = buildFreelancerStatementWorkbook(transactions).getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=freelancer-earnings-statement.xls")
                .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                .body(content);
    }

    @PostMapping("/freelancer/{tranId}/confirm")
    public ResponseEntity<PaymentTransactionResponse> confirmManualPayment(
            @PathVariable String tranId,
            Authentication auth) {
        return ResponseEntity.ok(PaymentTransactionResponse.from(paymentService.confirmManualPayment(auth, tranId)));
    }

    @GetMapping("/freelancer/{tranId}/proof")
    public ResponseEntity<byte[]> downloadManualPaymentProof(
            @PathVariable String tranId,
            Authentication auth) {
        PaymentTransaction transaction = paymentService.getFreelancerPaymentTransaction(auth, tranId);
        if (transaction.getProofFileData() == null || transaction.getProofFileData().length == 0) {
            return ResponseEntity.notFound().build();
        }

        String fileName = transaction.getProofFileName() != null && !transaction.getProofFileName().isBlank()
                ? transaction.getProofFileName()
                : "payment-proof";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        transaction.getProofFileType() != null && !transaction.getProofFileType().isBlank()
                                ? transaction.getProofFileType()
                                : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName.replace("\"", "") + "\"")
                .body(transaction.getProofFileData());
    }

    private String buildFreelancerStatementWorkbook(List<PaymentTransactionResponse> transactions) {
        StringBuilder html = new StringBuilder();
        html.append("""
                <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    table { border-collapse: collapse; width: 100%; }
                    th { background: #16a34a; color: white; font-weight: bold; }
                    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
                    .amount { text-align: right; }
                    .total-label { font-weight: bold; text-align: right; }
                    .total-amount { font-weight: bold; text-align: right; background: #dcfce7; }
                  </style>
                </head>
                <body>
                  <h2>Freelancer Earnings Statement</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Project</th>
                        <th>Client</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Paid At</th>
                      </tr>
                    </thead>
                    <tbody>
                """);

        if (transactions == null || transactions.isEmpty()) {
            html.append("""
                      <tr>
                        <td colspan="8">No transactions found.</td>
                      </tr>
                    """);
        } else {
            for (PaymentTransactionResponse transaction : transactions) {
                html.append("<tr>")
                        .append(cell(transaction.getTranId()))
                        .append(cell(transaction.getProjectTitle()))
                        .append(cell(transaction.getClientName()))
                        .append("<td class=\"amount\">").append(formatAmount(transaction.getAmount())).append("</td>")
                        .append(cell(transaction.getCurrency()))
                        .append(cell(transaction.getStatus() != null ? transaction.getStatus().name() : ""))
                        .append(cell(formatDateTime(transaction.getCreatedAt())))
                        .append(cell(formatDateTime(transaction.getPaidAt())))
                        .append("</tr>");
            }
        }

        BigDecimal totalEarnings = calculateTotalPaidEarnings(transactions);
        html.append("""
                      <tr>
                        <td colspan="3" class="total-label">Total Earnings</td>
                        <td class="total-amount">
                """)
                .append(formatAmount(totalEarnings))
                .append("""
                        </td>
                        <td colspan="4"></td>
                      </tr>
                    </tbody>
                  </table>
                </body>
                </html>
                """);
        return html.toString();
    }

    private BigDecimal calculateTotalPaidEarnings(List<PaymentTransactionResponse> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return transactions.stream()
                .filter(transaction -> transaction.getStatus() == PaymentStatusEnum.PAID)
                .map(PaymentTransactionResponse::getAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ResponseEntity<byte[]> sellerQrImageResponse(Setting setting) {
        if (!hasSellerQr(setting)) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        setting.getBankQrType() != null && !setting.getBankQrType().isBlank()
                                ? setting.getBankQrType()
                                : MediaType.IMAGE_JPEG_VALUE))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(setting.getBankQrData());
    }

    private boolean hasSellerQr(Setting setting) {
        return setting != null && setting.getBankQrData() != null && setting.getBankQrData().length > 0;
    }

    private record SellerQrMetadata(boolean hasSellerQr, String bankQrName, String bankQrType) {
    }

    private String cell(String value) {
        return "<td>" + escapeHtml(value) + "</td>";
    }

    private String formatAmount(BigDecimal amount) {
        return amount == null ? "0.00" : amount.toPlainString();
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "" : value.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

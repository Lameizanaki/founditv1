package backend.controller.payment;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import backend.service.payment.QrCodeGeneratorService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/payment")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class QrCodeController {

    private final QrCodeGeneratorService qrCodeGeneratorService;

    @GetMapping("/qr-image")
    public ResponseEntity<byte[]> generateQrImage(@RequestParam String qrText) {

        byte[] image = qrCodeGeneratorService.generateQrImage(qrText, 300, 300);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=payment-qr.png")
                .contentType(MediaType.IMAGE_PNG)
                .body(image);
    }
}
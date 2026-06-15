package backend.dto.freelancer_client;

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

@Data
public class DeliverWorkDTO {
    private String deliveryMessage;
    private MultipartFile deliveryFile;
}

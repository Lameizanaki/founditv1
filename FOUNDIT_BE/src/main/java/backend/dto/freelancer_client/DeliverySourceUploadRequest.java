package backend.dto.freelancer_client;

import lombok.Data;

@Data
public class DeliverySourceUploadRequest {
    private String fileName;
    private String fileType;
    private String dataBase64;
}

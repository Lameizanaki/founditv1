package backend.dto.client.profile;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileResponse {
    private Long id;
    private String workLocation;
    private String about;

    private String profilePictureData;
    private String profilePictureUrl;
    private String profilePictureName;
    private String profilePictureType;

    private Long clientId;
    private String clientName;
    private String clientEmail;

    private ProjectStatisticResponse statistics;
}

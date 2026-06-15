package backend.dto.client.profile;

import lombok.Data;

@Data
public class CreateProfileRequest {
    private String workLocation;
    private String about;
}

package backend.service.client.profile;

import java.io.IOException;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.client.profile.CreateProfileRequest;
import backend.dto.client.profile.ProfileResponse;
import backend.dto.client.profile.ProjectHistoryResponse;
import backend.dto.client.profile.UpdateAboutRequest;
import backend.dto.client.profile.UpdateContactInfoRequest;

public interface ProfileService {
	ProfileResponse createProfile(CreateProfileRequest request, org.springframework.security.core.Authentication auth);
    ProfileResponse updateProfile(Long profileId, CreateProfileRequest request, Authentication auth);
    ProfileResponse updateAvatar(Long profileId, MultipartFile file, Authentication auth) throws IOException;
    ProfileResponse updateContactInfo(Long profileId, UpdateContactInfoRequest request, Authentication auth);
    ProfileResponse updateAbout(Long profileId, UpdateAboutRequest request, Authentication auth);
    List<ProjectHistoryResponse> getProjectHistory(Authentication auth);
    List<ProjectHistoryResponse> getProjectHistoryByClientId(Long clientId);
    ProfileResponse getMyProfile(Authentication auth);
    ProfileResponse getPublicProfile(Long clientId);
}

package backend.controller.client.profile;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.client.profile.CreateProfileRequest;
import backend.dto.client.profile.ProfileResponse;
import backend.dto.client.profile.ProjectHistoryResponse;
import backend.dto.client.profile.UpdateAboutRequest;
import backend.dto.client.profile.UpdateContactInfoRequest;
import backend.model.client.profile.Profile;
import backend.repository.client.profile.ProfileRepository;
import backend.service.client.profile.ProfileService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/client")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ProfileRepository profileRepository;

    @PostMapping("/create-profile")
    public ProfileResponse createProfile(
            @RequestBody CreateProfileRequest request,Authentication auth) {
        return profileService.createProfile(request, auth);
    }

    @PutMapping("/{id}/create-profile")
    public ProfileResponse updateProfile(
            @PathVariable Long id,
            @RequestBody CreateProfileRequest request,Authentication auth) {
        return profileService.updateProfile(id, request, auth);
    }

    @PutMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileResponse updateAvatar(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,Authentication auth) throws IOException {
        return profileService.updateAvatar(id, file, auth);
    }
    
    @GetMapping("/{id}/profile")
    public ProfileResponse viewPublicProfile(@PathVariable Long id) {
        return profileService.getPublicProfile(id);
    }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> getClientAvatar(@PathVariable Long id) {
        Profile profile = profileRepository.findByClientProfile_Id(id).orElse(null);
        if (profile == null || profile.getProfilePictureData() == null || profile.getProfilePictureData().length == 0) {
            return ResponseEntity.notFound().build();
        }

        String contentType = profile.getProfilePictureType() != null && !profile.getProfilePictureType().isBlank()
                ? profile.getProfilePictureType()
                : MediaType.IMAGE_JPEG_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(profile.getProfilePictureData());
    }

    @PutMapping("/{id}/contact-info")
    public ProfileResponse updateContactInfo(
            @PathVariable Long id,
            @RequestBody UpdateContactInfoRequest request,Authentication auth) {
        return profileService.updateContactInfo(id, request, auth);
    }

    @PutMapping("/{id}/about")
    public ProfileResponse updateAbout(
            @PathVariable Long id,
            @RequestBody UpdateAboutRequest request,Authentication auth) {
        return profileService.updateAbout(id, request, auth);
    }

    @GetMapping("/project-history")
    public List<ProjectHistoryResponse> getProjectHistory(Authentication auth) {
        return profileService.getProjectHistory(auth);
    }

    @GetMapping("/{id}/project-history/freelancer-view")
    public List<ProjectHistoryResponse> getFreelancerViewProjectHistory(@PathVariable Long id) {
        return profileService.getProjectHistoryByClientId(id);
    }

    @GetMapping("/me")
    public ProfileResponse getMyProfile(Authentication auth) {
        return profileService.getMyProfile(auth);
    }
    
    @GetMapping("/{id}/profile/freelancer-view")
    public ProfileResponse getPublicProfile(@PathVariable Long id) {
        return profileService.getPublicProfile(id);
    }
}

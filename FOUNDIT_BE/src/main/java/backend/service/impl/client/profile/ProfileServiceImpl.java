package backend.service.impl.client.profile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import backend.enums.freelancer.ProjectStatusEnum;
import backend.dto.client.profile.CreateProfileRequest;
import backend.dto.client.profile.ProfileResponse;
import backend.dto.client.profile.ProjectHistoryResponse;
import backend.dto.client.profile.ProjectStatisticResponse;
import backend.dto.client.profile.UpdateAboutRequest;
import backend.dto.client.profile.UpdateContactInfoRequest;
import backend.exception.ApiException;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Client;
import backend.model.client.profile.Profile;
import backend.repository.authentication.ClientRepository;
import backend.repository.client.profile.ProfileRepository;
import backend.repository.freelancer_client.ProjectRepository;
import backend.service.client.profile.ProfileService;
import backend.utils.FileUploadGuard;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final ProfileRepository profileRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;

    private Client getAuthenticatedClient(Authentication auth) {
        String email = auth.getName();
        return clientRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    }

    private Profile ensureProfile(Client client) {
        if (client.getProfile() != null) {
            return client.getProfile();
        }

        return profileRepository.findByClientProfile_Id(client.getId())
                .orElseGet(() -> {
                    Profile created = new Profile();
                    created.setClientProfile(client);
                    created.setWorkLocation("");
                    created.setAbout("");
                    return profileRepository.save(created);
                });
    }

    private Profile getOwnedProfile(Long profileId, Long clientId) {
        return profileRepository.findByIdAndClientProfile_Id(profileId, clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found or unauthorized"));
    }

    private ProjectStatisticResponse buildStatistics(Long clientId) {
        long completed = projectRepository.countByClient_IdAndStatus(
                clientId,
                ProjectStatusEnum.COMPLETED
        );
        long active = projectRepository.countByClient_IdAndStatus(
                clientId,
                ProjectStatusEnum.IN_PROGRESS
        );
        BigDecimal totalSpent = projectRepository.sumAgreedPriceByClientId(clientId);
        Double avgRating = projectRepository.averageRatingByClientId(clientId);

        return ProjectStatisticResponse.builder()
                .completed(completed)
                .active(active)
                .totalSpent(totalSpent != null ? totalSpent : BigDecimal.ZERO)
                .averageRating(avgRating != null ? avgRating : 0.0)
                .build();
    }

    private ProfileResponse toResponse(Profile profile) {
        Client client = profile.getClientProfile();

        ProjectStatisticResponse statistics = buildStatistics(client.getId());
        String base64Image = null;

        if (profile.getProfilePictureData() != null) {
            base64Image = Base64.getEncoder()
                    .encodeToString(profile.getProfilePictureData());
        }
        
        return ProfileResponse.builder()
                .id(profile.getId())
                .workLocation(profile.getWorkLocation())
                .about(profile.getAbout())
                .profilePictureData(base64Image)
                .profilePictureUrl(base64Image != null ? "/client/" + client.getId() + "/avatar" : null)
                .profilePictureName(profile.getProfilePictureName())
                .profilePictureType(profile.getProfilePictureType())
                .clientId(client.getId())
                .clientName(client.getUsername()) // change if your Client field is fullName or name
                .clientEmail(client.getEmail())
                .statistics(statistics)
                .build();
    }

    private ProfileResponse toResponse(Client client, Profile profile) {
        ProjectStatisticResponse statistics = buildStatistics(client.getId());
        String base64Image = null;

        if (profile != null && profile.getProfilePictureData() != null) {
            base64Image = Base64.getEncoder()
                    .encodeToString(profile.getProfilePictureData());
        }

        return ProfileResponse.builder()
                .id(profile != null ? profile.getId() : null)
                .workLocation(profile != null ? profile.getWorkLocation() : null)
                .about(profile != null ? profile.getAbout() : null)
                .profilePictureData(base64Image)
                .profilePictureUrl(base64Image != null ? "/client/" + client.getId() + "/avatar" : null)
                .profilePictureName(profile != null ? profile.getProfilePictureName() : null)
                .profilePictureType(profile != null ? profile.getProfilePictureType() : null)
                .clientId(client.getId())
                .clientName(client.getUsername())
                .clientEmail(client.getEmail())
                .statistics(statistics)
                .build();
    }

    @Override
    @Transactional
    public ProfileResponse createProfile(CreateProfileRequest request,
            org.springframework.security.core.Authentication auth) {

        Client client = getAuthenticatedClient(auth);

        profileRepository.findByClientProfile_Id(client.getId()).ifPresent(existing -> {
            throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, "Profile already exists for this client");
        });

        Profile profile = new Profile();
        profile.setWorkLocation(request.getWorkLocation());
        profile.setAbout(request.getAbout());
        profile.setClientProfile(client);

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProfileResponse updateProfile(Long profileId, CreateProfileRequest request,
            org.springframework.security.core.Authentication auth) {

        Client client = getAuthenticatedClient(auth);
        Profile profile = getOwnedProfile(profileId, client.getId());

        profile.setWorkLocation(request.getWorkLocation());
        profile.setAbout(request.getAbout());

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProfileResponse updateAvatar(Long profileId, MultipartFile file,
            org.springframework.security.core.Authentication auth) throws IOException {

        Client client = getAuthenticatedClient(auth);
        Profile profile = getOwnedProfile(profileId, client.getId());

        if (file == null || file.isEmpty()) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Avatar file is required");
        }
        FileUploadGuard.requireImage(file, FileUploadGuard.IMAGE_MAX_BYTES, "Avatar image");

        profile.setProfilePictureData(file.getBytes());
        profile.setProfilePictureType(file.getContentType());
        profile.setProfilePictureName(file.getOriginalFilename());

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProfileResponse updateContactInfo(Long profileId, UpdateContactInfoRequest request,
            org.springframework.security.core.Authentication auth) {

        Client client = getAuthenticatedClient(auth);
        Profile profile = getOwnedProfile(profileId, client.getId());

        profile.setWorkLocation(request.getWorkLocation());

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProfileResponse updateAbout(Long profileId, UpdateAboutRequest request, Authentication auth) {

        Client client = getAuthenticatedClient(auth);
        Profile profile = getOwnedProfile(profileId, client.getId());

        profile.setAbout(request.getAbout());

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public List<ProjectHistoryResponse> getProjectHistory(Authentication auth) {
        Client client = getAuthenticatedClient(auth);

        return getProjectHistoryByClientId(client.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectHistoryResponse> getProjectHistoryByClientId(Long clientId) {
        return projectRepository.findProjectHistoryRowsByClientId(clientId).stream()
                .map(row -> ProjectHistoryResponse.builder()
                        .projectId((Long) row[0])
                        .projectTitle((String) row[1])
                        .freelancerName((String) row[2])
                        .amount((BigDecimal) row[3])
                        .rating((Double) row[4])
                        .status(row[5] != null ? row[5].toString() : null)
                        .build())
                .toList();
    }
    
    @Override
    @Transactional
    public ProfileResponse getMyProfile(Authentication auth) {

        Client client = getAuthenticatedClient(auth);
        Profile profile = ensureProfile(client);

        ProjectStatisticResponse statistics = buildStatistics(client.getId());
        
        String base64Image = null;

        if (profile.getProfilePictureData() != null) {
            base64Image = Base64.getEncoder()
                    .encodeToString(profile.getProfilePictureData());
        }

        return ProfileResponse.builder()
                .id(profile.getId())
                .clientId(client.getId())
                .clientName(client.getUsername())
                .clientEmail(client.getEmail())
                .workLocation(profile.getWorkLocation())
                .about(profile.getAbout())
                .profilePictureData(base64Image)
                .profilePictureUrl(base64Image != null ? "/client/" + client.getId() + "/avatar" : null)
                .profilePictureName(profile.getProfilePictureName())
                .profilePictureType(profile.getProfilePictureType())
                .statistics(statistics)
                .build();
    }
    
    @Override
    @Transactional(readOnly = true)
    public ProfileResponse getPublicProfile(Long clientId) {

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        Profile profile = profileRepository.findByClientProfile_Id(clientId)
                .orElse(null);

        return toResponse(client, profile);
    }
}

package backend.service.impl.freelancer.setting;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.setting.SettingDTO;
import backend.model.authentication.Freelancer;
import backend.model.authentication.Register;
import backend.model.freelancer.setting.Setting;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.authentication.RegisterRepository;
import backend.repository.freelancer.setting.SettingRepository;
import backend.service.freelancer.setting.SettingService;
import backend.utils.FileUploadGuard;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SettingServiceImpl implements SettingService {
	private final SettingRepository settingRepository;
	private final FreelancerRepository freelancerRepository;
	private final PasswordEncoder passwordEncoder;
	private final RegisterRepository registerRepository;

	@Override
	public Setting createSetting(Authentication auth, MultipartFile file) {
		String email = auth.getName();

		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new EntityNotFoundException("Freelancer not found"));

		if (settingRepository.existsByFreelancer(freelancer)) {
			throw new RuntimeException("Setting already exists for this freelancer");
		}
		
	    try {
			FileUploadGuard.requireImage(file, FileUploadGuard.IMAGE_MAX_BYTES, "Avatar image");
	        Setting setting = new Setting();
	        setting.setUsername(freelancer.getUsername());
	        setting.setEmail(freelancer.getEmail());
	        setting.setFreelancer(freelancer);
	        setting.setAvatarProfileData(file.getBytes());
	        setting.setAvatarProfileName(file.getOriginalFilename());
	        setting.setAvatarProfileType(file.getContentType());

	        return settingRepository.save(setting);
	    } catch (Exception e) {
	        throw new RuntimeException("Failed to upload avatar", e);
	    }
	}

	@Override
	public Setting updateAvatar(Authentication auth, Long settingId, MultipartFile file) {

		String email = auth.getName();

		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new EntityNotFoundException("Freelancer not found"));

		Setting setting = settingRepository.findById(settingId)
				.orElseThrow(() -> new EntityNotFoundException("Setting not found with id: " + settingId));

		if (!setting.getFreelancer().getId().equals(freelancer.getId())) {
			throw new RuntimeException("You are not allowed to update this setting");
		}

		try {
			FileUploadGuard.requireImage(file, FileUploadGuard.IMAGE_MAX_BYTES, "Avatar image");
			setting.setAvatarProfileData(file.getBytes());
			setting.setAvatarProfileName(file.getOriginalFilename());
			setting.setAvatarProfileType(file.getContentType());
		} catch (IOException e) {
			throw new RuntimeException("Failed to update avatar", e);
		}

		return settingRepository.save(setting);
	}

	@Override
	public Setting uploadBankQr(Authentication auth, MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new RuntimeException("Seller bank QR image is required");
		}

		String email = auth.getName();

		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new EntityNotFoundException("Freelancer not found"));

		Setting setting = settingRepository.findByFreelancer(freelancer)
				.orElseGet(() -> {
					Setting created = new Setting();
					created.setUsername(freelancer.getUsername());
					created.setEmail(freelancer.getEmail());
					created.setFreelancer(freelancer);
					return created;
				});

		try {
			FileUploadGuard.requireImage(file, FileUploadGuard.IMAGE_MAX_BYTES, "Seller bank QR image");
			setting.setBankQrData(file.getBytes());
			setting.setBankQrName(file.getOriginalFilename());
			setting.setBankQrType(file.getContentType());
		} catch (IOException e) {
			throw new RuntimeException("Failed to upload seller bank QR", e);
		}

		return settingRepository.save(setting);
	}

	@Override
	public Setting getMySetting(Authentication auth) {

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new EntityNotFoundException("Freelancer not found"));

	    return settingRepository.findByFreelancer(freelancer)
	            .orElseGet(() -> {
	            	Setting created = new Setting();
	            	created.setFreelancer(freelancer);
	            	created.setUsername(freelancer.getUsername());
	            	created.setEmail(freelancer.getEmail());
	            	return settingRepository.save(created);
	            });
	}

	@Override
	public void changePassword(Authentication auth, SettingDTO request) {

	    if (request == null) {
	        throw new RuntimeException("Request body is required");
	    }

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new EntityNotFoundException("Freelancer not found"));

	    if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
	        throw new RuntimeException("Current password is required");
	    }

	    if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
	        throw new RuntimeException("New password is required");
	    }

	    Register register = freelancer.getRegister();
	    String storedPassword = register.getPassword();

	    if (!passwordEncoder.matches(request.getCurrentPassword(), storedPassword)) {
	        throw new RuntimeException("Current password is incorrect");
	    }

	    if (passwordEncoder.matches(request.getNewPassword(), storedPassword)) {
	        throw new RuntimeException("New password must be different from current password");
	    }

	    register.setPassword(passwordEncoder.encode(request.getNewPassword()));
	    registerRepository.save(register);
	}

}

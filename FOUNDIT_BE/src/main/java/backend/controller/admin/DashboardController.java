package backend.controller.admin;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.admin.AdminClientDetailRowDTO;
import backend.dto.admin.AdminEkycDetailDTO;
import backend.dto.admin.AdminFreelancerDetailRowDTO;
import backend.dto.admin.AdminUserActivityDTO;
import backend.dto.admin.AdminPendingReviewDTO;
import backend.dto.admin.AdminSettingDTO;
import backend.dto.admin.AdminUserDTO;
import backend.dto.admin.AdminUserDetailDTO;
import backend.dto.admin.AdminUserPageDTO;
import backend.dto.admin.DashboardResponseDTO;
import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import backend.enums.ekyc.EkycStatus;
import backend.enums.payment.PaymentStatusEnum;
import backend.model.admin.AdminSetting;
import backend.model.authentication.Register;
import backend.model.ekyc.EkycForm;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import backend.model.payment.PaymentTransaction;
import backend.repository.admin.AdminSettingRepository;
import backend.repository.admin.DashboardRepository;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.ekyc.EkycRepository;
import backend.repository.freelancer.gig.GigRepository;
import backend.repository.freelancer_client.HireRequestRepository;
import backend.repository.freelancer_client.ProjectRepository;
import backend.repository.payment.PaymentTransactionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class DashboardController {
	private static final String DEFAULT_MAINTENANCE_MESSAGE = "Found It is temporarily unavailable while scheduled maintenance is in progress. Please check back soon.";
	private static final List<EkycStatus> ADMIN_REVIEW_STATUSES = List.of(EkycStatus.IN_REVIEW, EkycStatus.FAILED);
	
	private final DashboardRepository dashboardRepository;
	private final FreelancerRepository freelancerRepository;
	private final ClientRepository clientRepository;
	private final EkycRepository ekycRepository;
	private final GigRepository gigRepository;
	private final ProjectRepository projectRepository;
	private final HireRequestRepository hireRequestRepository;
	private final PaymentTransactionRepository paymentTransactionRepository;
	private final AdminSettingRepository adminSettingRepository;
	
	@GetMapping("/dashboard")
	public DashboardResponseDTO getDashboard() {
	    long totalFreelancers = dashboardRepository.countByRole(Role.FREELANCER);
	    long totalClients = dashboardRepository.countByRole(Role.CLIENT);
		long totalUsers = dashboardRepository.count();
		BigDecimal totalRevenue = paymentTransactionRepository.sumPaidRevenue();
		long paidPaymentRecords = paymentTransactionRepository.countByStatus(PaymentStatusEnum.PAID);
		BigDecimal pendingRevenue = paymentTransactionRepository.sumRevenueByStatus(PaymentStatusEnum.PAYMENT_SUBMITTED);
		long submittedPaymentRecords = paymentTransactionRepository.countByStatus(PaymentStatusEnum.PAYMENT_SUBMITTED);
		long pendingReviewCount = ekycRepository.countByStatusIn(ADMIN_REVIEW_STATUSES);
		List<AdminPendingReviewDTO> pendingReviewItems = ekycRepository
				.findPendingReviewDtosByStatusIn(ADMIN_REVIEW_STATUSES, PageRequest.of(0, 20))
				.getContent();
	    return new DashboardResponseDTO(
				totalFreelancers,
				totalClients,
				totalUsers,
				totalRevenue,
				paidPaymentRecords,
				pendingRevenue,
				submittedPaymentRecords,
				pendingReviewCount,
				pendingReviewItems
		);
	}
	
	// ============ USER ====================
	
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("active", dashboardRepository.countByStatus(UserStatus.ACTIVE));
        stats.put("suspended", dashboardRepository.countByStatus(UserStatus.SUSPENDED));
        stats.put("pending", dashboardRepository.countByStatus(UserStatus.PENDING));
        return stats;
    }
    
    @GetMapping("/users")
    public AdminUserPageDTO getUsers(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) Role role,
			@RequestParam(required = false) UserStatus status,
			@RequestParam(required = false) String keyword
	){
		int safePage = Math.max(0, page);
		int safeSize = Math.max(1, Math.min(size, 50));
		String normalizedKeyword = keyword != null && !keyword.isBlank() ? keyword.trim() : null;
		String keywordPattern = normalizedKeyword != null ? "%" + normalizedKeyword.toLowerCase() + "%" : "";
        Page<AdminUserDTO> users = dashboardRepository.findAdminUserDtos(
				role,
				status,
				normalizedKeyword != null,
				keywordPattern,
				PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"))
		);
		return toAdminUserPageDTO(users);
    }
    
    @GetMapping("/users/search")
    public AdminUserPageDTO searchUsers(@RequestParam String keyword, Pageable pageable) {
		Pageable safePageable = PageRequest.of(
				Math.max(0, pageable.getPageNumber()),
				Math.max(1, Math.min(pageable.getPageSize(), 50)),
				Sort.by(Sort.Direction.DESC, "id")
		);
		String normalizedKeyword = keyword != null && !keyword.isBlank() ? keyword.trim().toLowerCase() : "";
        Page<AdminUserDTO> users = dashboardRepository.findAdminUserDtos(
				null,
				null,
				!normalizedKeyword.isBlank(),
				"%" + normalizedKeyword + "%",
				safePageable
		);
		return toAdminUserPageDTO(users);
    }
    
    @GetMapping("/users/role/{role}")
    public AdminUserPageDTO getByRole(@PathVariable Role role, Pageable pageable) {
		Pageable safePageable = PageRequest.of(
				Math.max(0, pageable.getPageNumber()),
				Math.max(1, Math.min(pageable.getPageSize(), 50)),
				Sort.by(Sort.Direction.DESC, "id")
		);
        Page<AdminUserDTO> users = dashboardRepository.findAdminUserDtos(role, null, false, "", safePageable);
		return toAdminUserPageDTO(users);
    }

	@GetMapping("/users/{id}")
	public AdminUserDetailDTO getUserDetail(@PathVariable Long id) {
		Register user = dashboardRepository.findById(id).orElseThrow();
		return toAdminUserDetail(user);
	}

	@GetMapping("/settings")
	public AdminSettingDTO getSettings() {
		return toSettingDTO(getOrCreateSettings());
	}

	@PutMapping("/ekyc/{id}/approve")
	@Transactional
	public AdminPendingReviewDTO approveEkyc(@PathVariable Long id) {
		EkycForm form = ekycRepository.findById(id).orElseThrow();
		form.setStatus(EkycStatus.VERIFIED);
		form.setOcrVerified(true);
		form.setFaceVerified(true);
		form.setFailureReason(null);
		return toPendingReviewDTO(ekycRepository.save(form));
	}

	@GetMapping("/ekyc/{id}")
	@Transactional
	public AdminEkycDetailDTO getEkycDetail(@PathVariable Long id) {
		EkycForm form = ekycRepository.findById(id).orElseThrow();
		Register user = form.getRegister();
		return new AdminEkycDetailDTO(
				form.getId(),
				user != null ? user.getId() : null,
				user != null ? user.getUsername() : null,
				user != null ? user.getEmail() : null,
				user != null ? user.getRole() : null,
				form.getFullName(),
				form.getDateOfBirth(),
				form.getGender(),
				form.getPhoneNumber(),
				form.getNationality(),
				form.getCountry(),
				form.getStatus(),
				form.getOcrVerified(),
				form.getFaceVerified(),
				form.getExtractedDocumentId(),
				form.getFailureReason(),
				form.getFrontIdData(),
				form.getFrontIdType(),
				form.getFrontId(),
				form.getBackIdData(),
				form.getBackIdType(),
				form.getBackId(),
				form.getLiveFaceData(),
				form.getLiveFaceType(),
				form.getLiveFaceName()
		);
	}

	@PutMapping("/ekyc/{id}/reject")
	@Transactional
	public AdminPendingReviewDTO rejectEkyc(@PathVariable Long id, @RequestParam(required = false) String reason) {
		EkycForm form = ekycRepository.findById(id).orElseThrow();
		form.setStatus(EkycStatus.FAILED);
		form.setFailureReason(reason != null && !reason.isBlank() ? reason.trim() : form.getFailureReason());
		return toPendingReviewDTO(ekycRepository.save(form));
	}

	@PutMapping("/settings")
	@Transactional
	public AdminSettingDTO updateSettings(@org.springframework.web.bind.annotation.RequestBody AdminSettingDTO request) {
		AdminSetting setting = getOrCreateSettings();
		setting.setId(1L);
		setting.setMaintenanceMode(request.isMaintenanceMode());
		setting.setMaintenanceMessage(normalizeMaintenanceMessage(request.getMaintenanceMessage()));
		setting.setIdentityVerificationRequired(request.isIdentityVerificationRequired());
		setting.setMaxLoginAttempts(Math.max(1, Math.min(5, request.getMaxLoginAttempts())));
		return toSettingDTO(adminSettingRepository.save(setting));
	}
    
    @PutMapping("/users/{id}/suspend")
    public String suspendUser(@PathVariable Long id) {
        Register user = dashboardRepository.findById(id).orElseThrow();
        user.setStatus(UserStatus.SUSPENDED);
        dashboardRepository.save(user);
        return "User suspended";
    }
    
    @PutMapping("/users/{id}/activate")
    public String activateUser(@PathVariable Long id) {
        Register user = dashboardRepository.findById(id).orElseThrow();
        user.setStatus(UserStatus.ACTIVE);
		user.setAccountNonLocked(true);
        dashboardRepository.save(user);
        return "User activated";
    }
    
    @PutMapping("/users/{id}/pending")
    public String pendingUser(@PathVariable Long id) {
        Register user = dashboardRepository.findById(id).orElseThrow();
        user.setStatus(UserStatus.PENDING);
        dashboardRepository.save(user);
        return "User Pending";
    }

	private AdminUserDetailDTO toAdminUserDetail(Register user) {
		String country = null;
		String about = null;
		String description = null;
		String jobTitle = null;
		Integer yearExperience = null;
		List<String> skills = Collections.emptyList();
		Float rating = null;
		byte[] profilePictureData = null;
		String profilePictureType = null;
		long gigCount = 0L;
		long projectCount = 0L;
		long hireRequestCount = 0L;
		BigDecimal totalEarned = BigDecimal.ZERO;
		BigDecimal totalSpent = BigDecimal.ZERO;
		List<AdminUserActivityDTO> recentGigs = Collections.emptyList();
		List<AdminUserActivityDTO> recentProjects = Collections.emptyList();
		List<AdminUserActivityDTO> recentHireRequests = Collections.emptyList();
		List<AdminUserActivityDTO> recentPayments = Collections.emptyList();

		if (user.getRole() == Role.FREELANCER) {
			AdminFreelancerDetailRowDTO row = freelancerRepository.findAdminDetailRowByRegisterId(user.getId()).orElse(null);
			if (row != null) {
				Long freelancerId = row.getFreelancerId();
				country = row.getCountry();
				about = row.getAbout();
				jobTitle = row.getJobTitle();
				rating = row.getRating();
				description = row.getDescription();
				yearExperience = row.getYearExperience();
				profilePictureData = row.getProfilePictureData();
				profilePictureType = row.getProfilePictureType();
				skills = freelancerRepository.findSkillsByRegisterId(user.getId());
				gigCount = gigRepository.countByFreelancerId(freelancerId);
				projectCount = projectRepository.countByFreelancerId(freelancerId);
				hireRequestCount = hireRequestRepository.countByFreelancerId(freelancerId);
				totalEarned = paymentTransactionRepository.sumPaidRevenueByFreelancerId(freelancerId);
				recentGigs = gigRepository.findByFreelancerId(freelancerId).stream()
						.sorted(Comparator.comparing(Gig::getId, Comparator.nullsLast(Comparator.reverseOrder())))
						.limit(5)
						.map(gig -> new AdminUserActivityDTO(
								gig.getId(),
								"Gig",
								firstPresent(gig.getServiceTitle(), "Untitled gig"),
								gig.getStatus() != null ? gig.getStatus().name() : null,
								toBigDecimal(gig.getPendingPrice()),
								null,
								null,
								null
						))
						.toList();
				recentProjects = projectRepository.findByFreelancerId(freelancerId).stream()
						.sorted(Comparator.comparing(Project::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
						.limit(5)
						.map(project -> toProjectActivity(project, "Project", project.getClient() != null ? project.getClient().getUsername() : null))
						.toList();
				recentHireRequests = hireRequestRepository.findByFreelancerId(freelancerId).stream()
						.sorted(Comparator.comparing(HireRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
						.limit(5)
						.map(request -> toHireRequestActivity(request, request.getClient() != null ? request.getClient().getUsername() : null))
						.toList();
				recentPayments = paymentTransactionRepository.findByProject_Freelancer_IdOrderByCreatedAtDesc(freelancerId).stream()
						.limit(5)
						.map(this::toPaymentActivity)
						.toList();
			}
		} else if (user.getRole() == Role.CLIENT) {
			AdminClientDetailRowDTO row = clientRepository.findAdminDetailRowByRegisterId(user.getId()).orElse(null);
			if (row != null) {
				Long clientId = row.getClientId();
				country = row.getCountry();
				about = row.getAbout();
				profilePictureData = row.getProfilePictureData();
				profilePictureType = row.getProfilePictureType();
				projectCount = projectRepository.countByClientId(clientId);
				hireRequestCount = hireRequestRepository.countByClientId(clientId);
				totalSpent = paymentTransactionRepository.sumPaidRevenueByClientId(clientId);
				recentProjects = projectRepository.findByClientId(clientId).stream()
						.sorted(Comparator.comparing(Project::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
						.limit(5)
						.map(project -> toProjectActivity(project, "Project", project.getFreelancer() != null ? project.getFreelancer().getUsername() : null))
						.toList();
				recentHireRequests = hireRequestRepository.findByClientId(clientId).stream()
						.sorted(Comparator.comparing(HireRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
						.limit(5)
						.map(request -> toHireRequestActivity(request, request.getFreelancer() != null ? request.getFreelancer().getUsername() : null))
						.toList();
				recentPayments = paymentTransactionRepository.findByProject_Client_IdOrderByCreatedAtDesc(clientId).stream()
						.limit(5)
						.map(this::toPaymentActivity)
						.toList();
			}
		}

		EkycForm ekyc = ekycRepository.findByRegister_Id(user.getId())
				.or(() -> ekycRepository.findById(user.getId()))
				.orElse(null);

		return new AdminUserDetailDTO(
				user.getId(),
				user.getUsername(),
				user.getEmail(),
				user.getRole(),
				user.getStatus(),
				country,
				about,
				description,
				jobTitle,
				yearExperience,
				skills,
				rating,
				profilePictureData,
				profilePictureType,
				gigCount,
				projectCount,
				hireRequestCount,
				totalEarned,
				totalSpent,
				ekyc != null ? ekyc.getStatus() : null,
				ekyc != null ? ekyc.getFailureReason() : null,
				recentGigs,
				recentProjects,
				recentHireRequests,
				recentPayments
		);
	}

	private AdminPendingReviewDTO toPendingReviewDTO(EkycForm form) {
		Register user = form.getRegister();
		return new AdminPendingReviewDTO(
				form.getId(),
				user != null ? user.getId() : null,
				user != null ? user.getUsername() : null,
				user != null ? user.getEmail() : null,
				user != null ? user.getRole() : null,
				form.getFullName(),
				form.getPhoneNumber(),
				form.getNationality(),
				form.getCountry(),
				form.getStatus(),
				form.getFailureReason(),
				form.getExtractedDocumentId()
		);
	}

	private AdminUserActivityDTO toProjectActivity(Project project, String type, String relatedUser) {
		return new AdminUserActivityDTO(
				project.getId(),
				type,
				firstPresent(project.getProjectTitle(), "Untitled project"),
				project.getStatus() != null ? project.getStatus().name() : null,
				project.getAgreedPrice(),
				"USD",
				project.getCreatedAt(),
				relatedUser
		);
	}

	private AdminUserActivityDTO toHireRequestActivity(HireRequest request, String relatedUser) {
		String title = request.getGig() != null ? request.getGig().getServiceTitle() : null;
		return new AdminUserActivityDTO(
				request.getId(),
				"Hire Request",
				firstPresent(title, request.getRequirements(), "Hire request"),
				request.getStatus() != null ? request.getStatus().name() : null,
				request.getAgreedPrice(),
				"USD",
				request.getCreatedAt(),
				relatedUser
		);
	}

	private AdminUserActivityDTO toPaymentActivity(PaymentTransaction payment) {
		Project project = payment.getProject();
		return new AdminUserActivityDTO(
				payment.getId(),
				"Payment",
				project != null ? firstPresent(project.getProjectTitle(), payment.getTranId()) : payment.getTranId(),
				payment.getStatus() != null ? payment.getStatus().name() : null,
				payment.getAmount(),
				payment.getCurrency(),
				payment.getCreatedAt(),
				payment.getTranId()
		);
	}

	private String firstPresent(String... values) {
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value.trim();
			}
		}
		return "";
	}

	private BigDecimal toBigDecimal(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			return new BigDecimal(value.trim());
		} catch (NumberFormatException ignored) {
			return null;
		}
	}

	private AdminSetting getOrCreateSettings() {
		return adminSettingRepository.findById(1L).orElseGet(() -> {
			AdminSetting setting = new AdminSetting();
			setting.setId(1L);
			setting.setMaintenanceMessage(DEFAULT_MAINTENANCE_MESSAGE);
			return adminSettingRepository.save(setting);
		});
	}

	private String normalizeMaintenanceMessage(String message) {
		return message != null && !message.isBlank()
				? message.trim()
				: DEFAULT_MAINTENANCE_MESSAGE;
	}

	private AdminSettingDTO toSettingDTO(AdminSetting setting) {
		return new AdminSettingDTO(
				setting.isMaintenanceMode(),
				setting.getMaintenanceMessage(),
				setting.isIdentityVerificationRequired(),
				setting.getMaxLoginAttempts()
		);
	}

	private AdminUserPageDTO toAdminUserPageDTO(Page<AdminUserDTO> page) {
		return new AdminUserPageDTO(
				page.getContent(),
				page.getTotalElements(),
				page.getTotalPages(),
				page.getNumber(),
				page.getSize()
		);
	}
}

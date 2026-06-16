package backend.service.impl.payment;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.payment.ManualPaymentSubmitResponse;
import backend.dto.payment.PaymentTransactionResponse;
import backend.enums.freelancer.ProjectStatusEnum;
import backend.enums.payment.PaymentStatusEnum;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import backend.model.freelancer.setting.Setting;
import backend.model.payment.PaymentTransaction;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.freelancer.gig.GigRepository;
import backend.repository.freelancer.setting.SettingRepository;
import backend.repository.freelancer_client.HireRequestRepository;
import backend.repository.freelancer_client.ProjectRepository;
import backend.repository.payment.PaymentTransactionRepository;
import backend.service.notification.NotificationEventPublisher;
import backend.service.payment.PaymentService;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

	private static final String PAYMENT_METHOD_MANUAL_BANK_TRANSFER = "MANUAL_BANK_TRANSFER";
	private static final String DEFAULT_CURRENCY = "USD";

	private final ClientRepository clientRepository;
	private final FreelancerRepository freelancerRepository;
	private final ProjectRepository projectRepository;
	private final HireRequestRepository hireRequestRepository;
	private final PaymentTransactionRepository paymentTransactionRepository;
	private final NotificationEventPublisher notificationEventPublisher;
	private final SettingRepository settingRepository;
	private final GigRepository gigRepository;

	@Override
	@Transactional
	public ManualPaymentSubmitResponse submitManualPayment(
			Authentication auth,
			Long projectId,
			String reference,
			MultipartFile proofFile
	) {
		String email = auth.getName();
		Client client = clientRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Client not found"));

		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new RuntimeException("Order not found"));

		if (project.getClient() == null || !project.getClient().getId().equals(client.getId())) {
			throw new RuntimeException("Unauthorized action");
		}

		if (project.getStatus() != ProjectStatusEnum.COMPLETED
				&& project.getStatus() != ProjectStatusEnum.DELIVERED) {
			throw new RuntimeException("Payment proof can only be submitted after the freelancer delivers the work");
		}

		if ((reference == null || reference.isBlank()) && (proofFile == null || proofFile.isEmpty())) {
			throw new RuntimeException("Upload a payment screenshot or enter a transaction reference");
		}

		BigDecimal amount = resolvePaymentAmount(project);
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new RuntimeException("Invalid order amount");
		}

		syncProjectAmount(project, amount);

		PaymentTransaction existingPaid = findLatestProjectTransaction(project, PaymentStatusEnum.PAID);
		if (existingPaid != null) {
			throw new RuntimeException("Order is already paid. Transaction ID: " + existingPaid.getTranId());
		}

		PaymentTransaction tx = findLatestProjectTransaction(project, PaymentStatusEnum.PAYMENT_SUBMITTED);
		if (tx == null) {
			tx = new PaymentTransaction();
			tx.setTranId(buildManualTransactionId(project.getId()));
			tx.setProject(project);
		}

		tx.setSellerPaymentAccount(resolveSellerPaymentAccount(project));
		tx.setPaymentMethod(PAYMENT_METHOD_MANUAL_BANK_TRANSFER);
		tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
		tx.setCurrency(DEFAULT_CURRENCY);
		tx.setStatus(PaymentStatusEnum.PAYMENT_SUBMITTED);
		tx.setSubmittedAt(LocalDateTime.now());
		tx.setProofReference(reference != null && !reference.isBlank() ? reference.trim() : null);
		tx.setManualStatusCode("PAYMENT_SUBMITTED");
		tx.setManualStatusMessage("Client submitted manual payment proof. Seller must confirm after checking bank app.");

		if (proofFile != null && !proofFile.isEmpty()) {
			FileUploadGuard.requireImage(proofFile, FileUploadGuard.PAYMENT_PROOF_MAX_BYTES, "Payment proof");
			try {
				tx.setProofFileName(proofFile.getOriginalFilename());
				tx.setProofFileType(proofFile.getContentType());
				tx.setProofFileData(proofFile.getBytes());
			} catch (IOException ex) {
				throw new RuntimeException("Failed to upload payment proof", ex);
			}
		}

		PaymentTransaction saved = paymentTransactionRepository.save(tx);

		ManualPaymentSubmitResponse response = new ManualPaymentSubmitResponse();
		response.setTranId(saved.getTranId());
		response.setOrderId(saved.getTranId());
		response.setPaymentMethod(PAYMENT_METHOD_MANUAL_BANK_TRANSFER);
		response.setStatus(saved.getStatus().name());
		response.setManualStatusCode("PAYMENT_SUBMITTED");
		response.setMessage("Payment proof submitted. The seller will confirm after checking their bank app.");
		return response;
	}

	@Override
	@Transactional
	public PaymentTransaction confirmManualPayment(Authentication auth, String tranId) {
		String email = auth.getName();
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer not found"));

		PaymentTransaction tx = paymentTransactionRepository.findByTranId(tranId)
				.orElseThrow(() -> new RuntimeException("Transaction not found"));

		Project project = tx.getProject();
		if (project == null) {
			throw new RuntimeException("Order not found");
		}

		if (project.getFreelancer() == null || !project.getFreelancer().getId().equals(freelancer.getId())) {
			throw new RuntimeException("Only the seller can confirm this payment");
		}

		if (tx.getStatus() == PaymentStatusEnum.PAID) {
			return tx;
		}

		if (tx.getStatus() != PaymentStatusEnum.PAYMENT_SUBMITTED) {
			throw new RuntimeException("Only submitted manual payments can be confirmed");
		}

		tx.setStatus(PaymentStatusEnum.PAID);
		tx.setPaidAt(LocalDateTime.now());
		tx.setManualStatusCode("PAID");
		tx.setManualStatusMessage("Seller confirmed payment after checking bank app.");
		tx.setConfirmedReference(tx.getProofReference());

		PaymentTransaction saved = paymentTransactionRepository.save(tx);
		notificationEventPublisher.publishPaymentReceived(saved);
		return saved;
	}

	@Override
	@Transactional
	public PaymentTransaction getFreelancerPaymentTransaction(Authentication auth, String tranId) {
		String email = auth.getName();
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer not found"));

		PaymentTransaction tx = paymentTransactionRepository.findByTranId(tranId)
				.orElseThrow(() -> new RuntimeException("Transaction not found"));

		Project project = tx.getProject();
		if (project == null || project.getFreelancer() == null
				|| !project.getFreelancer().getId().equals(freelancer.getId())) {
			throw new RuntimeException("Unauthorized action");
		}

		return tx;
	}

	@Override
	@Transactional
	public Setting getSellerPaymentSetting(Authentication auth, Long projectId) {
		String email = auth.getName();
		Client client = clientRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Client not found"));

		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new RuntimeException("Order not found"));

		if (project.getClient() == null || !project.getClient().getId().equals(client.getId())) {
			throw new RuntimeException("Unauthorized action");
		}

		if (project.getFreelancer() == null) {
			throw new RuntimeException("Seller not found for this order");
		}

		return settingRepository.findByFreelancer(project.getFreelancer())
				.orElseGet(Setting::new);
	}

	@Override
	@Transactional
	public Setting getSellerPaymentSettingByGig(Authentication auth, Long gigId) {
		clientRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Client not found"));

		Gig gig = gigRepository.findById(gigId)
				.orElseThrow(() -> new RuntimeException("Gig not found"));

		if (gig.getFreelancer() == null) {
			throw new RuntimeException("Seller not found for this gig");
		}

		return settingRepository.findByFreelancer(gig.getFreelancer())
				.orElseGet(Setting::new);
	}

	@Override
	@Transactional
	public PaymentTransaction checkTransaction(String tranId) {
		return paymentTransactionRepository.findByTranId(tranId)
				.orElseThrow(() -> new RuntimeException("Transaction not found"));
	}

	@Override
	@Transactional
	public List<PaymentTransaction> getClientTransactions(Authentication auth) {
		Client client = clientRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Client not found"));

		return paymentTransactionRepository.findByProject_Client_IdOrderByCreatedAtDesc(client.getId());
	}

	@Override
	@Transactional
	public List<PaymentTransaction> getFreelancerTransactions(Authentication auth) {
		Freelancer freelancer = freelancerRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Freelancer not found"));

		return paymentTransactionRepository.findByProject_Freelancer_IdOrderByCreatedAtDesc(freelancer.getId());
	}

	@Override
	@Transactional
	public List<PaymentTransactionResponse> getClientTransactionResponses(Authentication auth) {
		Client client = clientRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Client not found"));

		return paymentTransactionRepository.findClientTransactionResponses(client.getId());
	}

	@Override
	@Transactional
	public List<PaymentTransactionResponse> getFreelancerTransactionResponses(Authentication auth) {
		Freelancer freelancer = freelancerRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Freelancer not found"));

		return paymentTransactionRepository.findFreelancerTransactionResponses(freelancer.getId());
	}

	private void syncProjectAmount(Project project, BigDecimal amount) {
		if (project.getAgreedPrice() == null || project.getAgreedPrice().compareTo(amount) != 0) {
			project.setAgreedPrice(amount);
			projectRepository.save(project);
		}

		HireRequest hireRequest = project.getHireRequest();
		if (hireRequest != null
				&& (hireRequest.getAgreedPrice() == null || hireRequest.getAgreedPrice().compareTo(amount) != 0)) {
			hireRequest.setAgreedPrice(amount);
			hireRequestRepository.save(hireRequest);
		}
	}

	private PaymentTransaction findLatestProjectTransaction(Project project, PaymentStatusEnum status) {
		return paymentTransactionRepository.findByProject_IdOrderByCreatedAtDesc(project.getId())
				.stream()
				.filter(tx -> tx.getStatus() == status)
				.findFirst()
				.orElse(null);
	}

	private BigDecimal resolvePaymentAmount(Project project) {
		BigDecimal agreedPrice = normalizeAmount(project.getAgreedPrice());
		if (agreedPrice != null) {
			return agreedPrice;
		}

		if (project.getHireRequest() != null) {
			BigDecimal requestAmount = normalizeAmount(project.getHireRequest().getAgreedPrice());
			if (requestAmount != null) {
				return requestAmount;
			}
		}

		if (project.getGig() != null && project.getGig().getPrice() != null && !project.getGig().getPrice().isBlank()) {
			try {
				BigDecimal gigPrice = new BigDecimal(project.getGig().getPrice().trim());
				if (gigPrice.compareTo(BigDecimal.ZERO) > 0) {
					return gigPrice;
				}
			} catch (NumberFormatException ignored) {
				// Fall through to invalid amount.
			}
		}

		return null;
	}

	private BigDecimal normalizeAmount(BigDecimal amount) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			return null;
		}

		return amount.setScale(2, RoundingMode.HALF_UP);
	}

	private String resolveSellerPaymentAccount(Project project) {
		if (project.getFreelancer() == null || project.getFreelancer().getEmail() == null) {
			return "SELLER";
		}

		return project.getFreelancer().getEmail();
	}

	private String buildManualTransactionId(Long projectId) {
		return "MANUAL-" + projectId + "-" + (System.currentTimeMillis() % 1_000_000_000);
	}
}

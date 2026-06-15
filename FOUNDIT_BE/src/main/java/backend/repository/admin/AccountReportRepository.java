package backend.repository.admin;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.enums.admin.AccountReportStatus;
import backend.model.admin.AccountReport;

@Repository
public interface AccountReportRepository extends JpaRepository<AccountReport, Long> {
    List<AccountReport> findAllByOrderByCreatedAtDesc();
    List<AccountReport> findByRegister_EmailOrderByCreatedAtDesc(String email);
    List<AccountReport> findByStatusOrderByCreatedAtDesc(AccountReportStatus status);
}

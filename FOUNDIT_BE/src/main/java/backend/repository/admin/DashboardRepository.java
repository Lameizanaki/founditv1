package backend.repository.admin;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.dto.admin.AdminUserDTO;
import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import backend.model.authentication.Register;

@Repository
public interface DashboardRepository extends JpaRepository<Register, Long>, JpaSpecificationExecutor<Register>{
	long countByRole(Role role);
    long countByStatus(UserStatus status);
    List<Register> findByUsernameContainingIgnoreCase(String username);
    Page<Register> findAll(Pageable pageable);
    Page<Register> findByRole(Role role, Pageable pageable);
    Page<Register> findByStatus(UserStatus status, Pageable pageable);

    @Query("""
            select new backend.dto.admin.AdminUserDTO(
                r.id,
                r.username,
                r.email,
                r.role,
                case
                    when r.status is null then backend.enums.admin.UserStatus.ACTIVE
                    else r.status
                end,
                fp.rating,
                coalesce(fp.workLocation, p.workLocation),
                fp.profilePictureData,
                fp.profilePictureType,
                p.profilePictureData,
                p.profilePictureType
            )
            from Register r
            left join Freelancer f on f.register = r
            left join f.freelancerProfiles fp
            left join Client c on c.register = r
            left join c.profile p
            where r.role <> backend.enums.authentication.Role.ADMIN
              and (:role is null or r.role = :role)
              and (
                :status is null
                or r.status = :status
                or (:status = backend.enums.admin.UserStatus.ACTIVE and r.status is null)
              )
              and (
                :hasKeyword = false
                or lower(r.username) like :keyword
                or lower(r.email) like :keyword
              )
            """)
    Page<AdminUserDTO> findAdminUserDtos(
            @Param("role") Role role,
            @Param("status") UserStatus status,
            @Param("hasKeyword") boolean hasKeyword,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}

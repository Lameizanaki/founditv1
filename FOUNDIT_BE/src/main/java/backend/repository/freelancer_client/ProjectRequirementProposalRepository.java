package backend.repository.freelancer_client;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.freelancer_client.ProjectRequirementProposal;

@Repository
public interface ProjectRequirementProposalRepository extends JpaRepository<ProjectRequirementProposal, Long> {
}

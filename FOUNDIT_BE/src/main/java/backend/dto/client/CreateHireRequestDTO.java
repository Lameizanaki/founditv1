package backend.dto.client;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonAlias;

import lombok.Data;

@Data
public class CreateHireRequestDTO {
    private Long freelancerId;
    private Long gigId;

    @JsonAlias({"requestMessage"})
    private String message;
    private String requirements;
    private LocalDate deadline;
    private MultipartFile requirementFile;
    private BigDecimal agreedPrice;
}

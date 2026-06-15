package backend.dto.client;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

@Data
public class ProjectRequirementDTO {
    private String projectTitle;
    private String requirements;
    private BigDecimal agreedPrice;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;

    private MultipartFile requirementFile;
}

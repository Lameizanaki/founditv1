package backend.dto.admin;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminUserPageDTO {
	private List<AdminUserDTO> content;
	private long totalElements;
	private int totalPages;
	private int number;
	private int size;
}

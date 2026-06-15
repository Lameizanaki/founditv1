package backend.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException{
	public ResourceNotFoundException( String message, Long id) {
		super(HttpStatus.NOT_FOUND, String.format("id = %d, Not Found %s, ", id, message));
	}

	public ResourceNotFoundException(String message) {
		super(HttpStatus.NOT_FOUND, message);
	}
}

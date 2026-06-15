package backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalException {

	@ExceptionHandler(value = ApiException.class)
	public ResponseEntity<?> handleApiException(ApiException e){
		ErrorResponseException err = new ErrorResponseException(e.getStatus(), e.getMessage());
		return ResponseEntity.status(e.getStatus()).body(err);
	}

	@ExceptionHandler(value = MaxUploadSizeExceededException.class)
	public ResponseEntity<?> handleMaxUploadSize(MaxUploadSizeExceededException e) {
		ErrorResponseException err = new ErrorResponseException(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded file is too large");
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(err);
	}

	@ExceptionHandler(value = MultipartException.class)
	public ResponseEntity<?> handleMultipartException(MultipartException e) {
		ErrorResponseException err = new ErrorResponseException(HttpStatus.BAD_REQUEST, "File upload could not be processed");
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
	}

	@ExceptionHandler(value = HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
		ErrorResponseException err = new ErrorResponseException(HttpStatus.METHOD_NOT_ALLOWED, e.getMessage());
		return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(err);
	}

	@ExceptionHandler(value = RuntimeException.class)
	public ResponseEntity<?> handleRuntimeException(RuntimeException e) {
		ErrorResponseException err = new ErrorResponseException(HttpStatus.BAD_REQUEST, e.getMessage());
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
	}
}

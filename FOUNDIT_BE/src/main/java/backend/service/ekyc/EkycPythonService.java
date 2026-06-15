package backend.service.ekyc;

import java.io.IOException;

public interface EkycPythonService {
	public String verifyLiveness(Long id, byte[] liveFaceBytes) throws IOException;
	public String verifyOcr(Long id) throws IOException;
}

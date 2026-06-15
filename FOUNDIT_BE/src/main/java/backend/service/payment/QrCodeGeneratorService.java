package backend.service.payment;

public interface QrCodeGeneratorService {
	public byte[] generateQrImage(String qrText, int width, int height);
}

package backend.utils;

import org.springframework.web.multipart.MultipartFile;

public final class FileUploadGuard {
    public static final long IMAGE_MAX_BYTES = 2L * 1024 * 1024;
    public static final long DOCUMENT_MAX_BYTES = 5L * 1024 * 1024;
    public static final long CHAT_ATTACHMENT_MAX_BYTES = 5L * 1024 * 1024;
    public static final long PAYMENT_PROOF_MAX_BYTES = 3L * 1024 * 1024;

    private FileUploadGuard() {
    }

    public static void requireMaxSize(MultipartFile file, long maxBytes, String label) {
        if (file == null || file.isEmpty()) {
            return;
        }

        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(label + " must be " + toMegabytes(maxBytes) + "MB or smaller");
        }
    }

    public static void requireImage(MultipartFile file, long maxBytes, String label) {
        requireMaxSize(file, maxBytes, label);
        if (file == null || file.isEmpty()) {
            return;
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException(label + " must be an image file");
        }
    }

    public static void requireBase64MaxSize(String dataBase64, long maxDecodedBytes, String label) {
        if (dataBase64 == null || dataBase64.isBlank()) {
            return;
        }

        String clean = dataBase64;
        int commaIndex = clean.indexOf(',');
        if (commaIndex >= 0) {
            clean = clean.substring(commaIndex + 1);
        }
        clean = clean.replaceAll("\\s+", "");

        long estimatedBytes = (clean.length() * 3L) / 4L;
        if (estimatedBytes > maxDecodedBytes) {
            throw new IllegalArgumentException(label + " must be " + toMegabytes(maxDecodedBytes) + "MB or smaller");
        }
    }

    private static long toMegabytes(long bytes) {
        return bytes / (1024L * 1024L);
    }
}

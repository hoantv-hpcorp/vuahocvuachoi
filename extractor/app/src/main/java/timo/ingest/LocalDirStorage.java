package timo.ingest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Local object storage mirroring the S3 key layout under a directory. */
public final class LocalDirStorage implements TimoIngestPipeline.ObjectStorage {
    private final Path root;

    public LocalDirStorage(Path root) throws IOException {
        this.root = root.toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    @Override
    public void put(String key, byte[] png, String contentType) {
        try {
            Path file = root.resolve(key).normalize();
            if (!file.startsWith(root)) throw new IllegalArgumentException("Invalid key: " + key);
            Files.createDirectories(file.getParent());
            Files.write(file, png);
        } catch (IOException e) {
            throw new RuntimeException("Cannot write " + key, e);
        }
    }
}

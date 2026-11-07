package timo.ingest;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** S3 implementation: the bucket must stay private; serve objects through signed URLs only. */
public final class S3Storage implements TimoIngestPipeline.ObjectStorage, AutoCloseable {
    private final S3Client s3;
    private final String bucket;

    public S3Storage(S3Client s3, String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    public static S3Storage create(String bucket, String region) {
        S3ClientBuilder builder = S3Client.builder();
        if (region != null && !region.isBlank()) builder.region(Region.of(region));
        return new S3Storage(builder.build(), bucket);
    }

    @Override
    public void put(String key, byte[] png, String contentType) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(png));
    }

    @Override
    public void close() {
        s3.close();
    }
}

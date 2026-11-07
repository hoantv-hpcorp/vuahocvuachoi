package timo.ingest;

import timo.ingest.CollectingRepository.ExamRecord;
import timo.ingest.TimoLayout.ExamRange;
import timo.ingest.TimoLayout.Round;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class Main {
    private static final String USAGE = """
            TIMO grade-2 PDF ingester

            Usage:
              java -jar timo-ingest.jar [options]

            Options:
              --pdf <file>          Input PDF (default: extractor/TIMOK2.pdf)
              --out <dir>           Output directory for images/JSON/report (default: out)
              --json <file>         Dataset JSON path (default: <out>/dataset.json)
              --report <file>       Validation report path (default: <out>/report.txt)
              --no-images           Skip snapshots/figures (fast text-only check)
              --limit <n>           Process only the first n exams
              --only <list>         Process selected exams, e.g. PRELIMINARY:1,HEAT:7
              --s3-bucket <name>    Upload images to S3 instead of <out>/images
              --s3-region <region>  S3 region (default: AWS SDK default chain)
              --db-url <jdbc-url>   Write rows to PostgreSQL, e.g. jdbc:postgresql://localhost:5432/timo
              --db-user <user>      PostgreSQL user
              --db-password <pass>  PostgreSQL password
              --init-db             Run schema.sql before ingesting
              --help                Show this help

            Object keys follow: timo/grade2/<round>/exam-01/q-04/figure-01.png
            """;

    private Main() {}

    public static void main(String[] args) throws Exception {
        PrintStream out = new PrintStream(System.out, true, StandardCharsets.UTF_8);
        Options opts;
        try {
            opts = Options.parse(args);
        } catch (IllegalArgumentException e) {
            System.err.println(e.getMessage());
            System.err.print(USAGE);
            System.exit(2);
            return;
        }
        if (opts.help) {
            out.print(USAGE);
            return;
        }

        Path pdf = Path.of(opts.pdf);
        if (!Files.isRegularFile(pdf)) {
            System.err.println("PDF not found: " + pdf.toAbsolutePath());
            System.exit(2);
            return;
        }

        if (opts.noImages) out.println("Images disabled (--no-images)");
        Files.createDirectories(Path.of(opts.out));

        TimoIngestPipeline.ObjectStorage storage = null;
        S3Storage s3 = null;
        PostgresExamRepository postgres = null;
        try {
            if (!opts.noImages) {
                if (opts.s3Bucket != null) {
                    s3 = S3Storage.create(opts.s3Bucket, opts.s3Region);
                    storage = s3;
                    out.println("Image storage: s3://" + opts.s3Bucket);
                } else {
                    storage = new LocalDirStorage(Path.of(opts.out, "images"));
                    out.println("Image storage: " + Path.of(opts.out, "images").toAbsolutePath());
                }
            }

            if (opts.dbUrl != null) {
                postgres = PostgresExamRepository.open(opts.dbUrl, opts.dbUser, opts.dbPassword);
                if (opts.initDb) {
                    try (InputStream in = Main.class.getResourceAsStream("/schema.sql")) {
                        if (in == null) throw new IllegalStateException("schema.sql not found on classpath");
                        postgres.executeScript(new String(in.readAllBytes(), StandardCharsets.UTF_8));
                    }
                    out.println("Database schema applied");
                }
            }

            CollectingRepository repo = new CollectingRepository(postgres);
            List<ExamRange> ranges = opts.ranges();
            out.println("Processing " + ranges.size() + " exam(s) from " + pdf.getFileName());

            new TimoIngestPipeline(storage, repo, !opts.noImages, out::println).run(pdf, ranges);

            Path jsonFile = Path.of(opts.json != null ? opts.json : Path.of(opts.out, "dataset.json").toString());
            DatasetJson.write(repo.exams(), jsonFile);
            out.println("Dataset: " + jsonFile.toAbsolutePath());

            Validator.Result result = Validator.validate(repo.exams(), !opts.noImages);
            Path reportFile = Path.of(opts.report != null ? opts.report : Path.of(opts.out, "report.txt").toString());
            writeReport(reportFile, repo.exams(), result);

            long questions = repo.exams().stream().mapToLong(e -> e.questions.size()).sum();
            long reviews = repo.exams().stream()
                    .flatMap(e -> e.questions.stream())
                    .filter(q -> q.needsReview)
                    .count();
            out.printf("Extracted %d exam(s), %d question(s), %d needs_review%n",
                    repo.exams().size(), questions, reviews);
            out.println("Report: " + reportFile.toAbsolutePath());

            if (!result.structural().isEmpty()) {
                out.println("Structural issues (" + result.structural().size() + "):");
                result.structural().forEach(s -> out.println("  - " + s));
                System.exit(1);
            }
        } finally {
            if (postgres != null) postgres.close();
            if (s3 != null) s3.close();
        }
    }

    private static void writeReport(Path file, List<ExamRecord> exams, Validator.Result result) throws IOException {
        StringBuilder b = new StringBuilder("TIMO grade-2 ingest report\n\n");
        for (ExamRecord e : exams) {
            long reviews = e.questions.stream().filter(q -> q.needsReview).count();
            long images = e.questions.stream().mapToLong(q -> q.images.size()).sum();
            b.append(String.format("%-11s #%d: %2d questions, %2d needs_review, %d images%n",
                    e.round, e.examNo, e.questions.size(), reviews, images));
        }
        b.append("\nStructural issues: ").append(result.structural().size()).append('\n');
        for (String s : result.structural()) b.append("  - ").append(s).append('\n');
        b.append("\nNeeds review: ").append(result.reviews().size()).append('\n');
        for (String s : result.reviews()) b.append("  - ").append(s).append('\n');
        Path parent = file.toAbsolutePath().getParent();
        if (parent != null) Files.createDirectories(parent);
        Files.writeString(file, b.toString(), StandardCharsets.UTF_8);
    }

    private static final class Options {
        String pdf = "extractor/TIMOK2.pdf";
        String out = "out";
        String json;
        String report;
        boolean noImages;
        boolean initDb;
        boolean help;
        int limit;
        String only;
        String s3Bucket;
        String s3Region;
        String dbUrl;
        String dbUser;
        String dbPassword;

        static Options parse(String[] args) {
            Options o = new Options();
            for (int i = 0; i < args.length; i++) {
                String a = args[i];
                switch (a) {
                    case "--pdf" -> o.pdf = value(args, ++i, a);
                    case "--out" -> o.out = value(args, ++i, a);
                    case "--json" -> o.json = value(args, ++i, a);
                    case "--report" -> o.report = value(args, ++i, a);
                    case "--no-images" -> o.noImages = true;
                    case "--limit" -> o.limit = Integer.parseInt(value(args, ++i, a));
                    case "--only" -> o.only = value(args, ++i, a);
                    case "--s3-bucket" -> o.s3Bucket = value(args, ++i, a);
                    case "--s3-region" -> o.s3Region = value(args, ++i, a);
                    case "--db-url" -> o.dbUrl = value(args, ++i, a);
                    case "--db-user" -> o.dbUser = value(args, ++i, a);
                    case "--db-password" -> o.dbPassword = value(args, ++i, a);
                    case "--init-db" -> o.initDb = true;
                    case "--help", "-h" -> o.help = true;
                    default -> throw new IllegalArgumentException("Unknown option: " + a);
                }
            }
            if (o.limit < 0) throw new IllegalArgumentException("--limit must be >= 0");
            return o;
        }

        private static String value(String[] args, int i, String option) {
            if (i >= args.length) throw new IllegalArgumentException("Missing value for " + option);
            return args[i];
        }

        List<ExamRange> ranges() {
            List<ExamRange> all = TimoLayout.all();
            if (only != null && !only.isBlank()) {
                List<ExamRange> selected = new ArrayList<>();
                for (String token : only.split(",")) {
                    String[] parts = token.trim().split(":");
                    if (parts.length != 2) throw new IllegalArgumentException("Bad --only token: " + token);
                    Round round = switch (parts[0].trim().toLowerCase()) {
                        case "p", "preliminary" -> Round.PRELIMINARY;
                        case "h", "heat" -> Round.HEAT;
                        default -> throw new IllegalArgumentException("Bad round in --only: " + parts[0]);
                    };
                    int no = Integer.parseInt(parts[1].trim());
                    selected.add(TimoLayout.find(round, no));
                }
                return selected;
            }
            if (limit > 0) return all.subList(0, Math.min(limit, all.size()));
            return all;
        }
    }
}

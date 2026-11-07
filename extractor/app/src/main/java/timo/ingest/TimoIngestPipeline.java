package timo.ingest;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import timo.ingest.ImageCollector.Found;
import timo.ingest.QuestionBlockExtractor.Block;
import timo.ingest.QuestionBlockExtractor.Glyph;
import timo.ingest.QuestionBlockExtractor.Marker;
import timo.ingest.QuestionBlockExtractor.Region;
import timo.ingest.TimoLayout.ExamRange;
import timo.ingest.TimoLayout.Round;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Difficulty: Medium.
 * Approach: For each exam, extract question blocks and solution blocks, attach images by position,
 *           render one snapshot per block (fallback for symbols missing from the text layer),
 *           upload PNGs to object storage, then upsert rows. Page renders are cached per exam
 *           so each page is rendered once instead of once per question.
 * Complexity: O(E * P) page renders, E = 14 exams, P = pages per exam; memory bounded by one exam's cache.
 */
public final class TimoIngestPipeline {
    private static final int DPI = 200;
    private static final int MIN_SIDE_PX = 30;

    public interface ObjectStorage { void put(String key, byte[] png, String contentType); }

    public interface ExamRepository {
        long upsertExam(ExamRange e, String sourceFile);
        long upsertQuestion(long examId, int number, String topic, String type, String text,
                            List<Option> options, String answer, String solution, boolean needsReview);
        void clearImages(long questionId);
        void upsertImage(long questionId, String role, int seq, String key, int w, int h, String sha256);
    }

    private record OptionCrop(int index, byte[] png, int width, int height, String sha256) {}

    private record OptionSet(List<Option> options, List<OptionCrop> crops) {}

    private final ObjectStorage storage;
    private final ExamRepository repo;
    private final boolean writeImages;
    private final java.util.function.Consumer<String> log;

    public TimoIngestPipeline(ObjectStorage storage, ExamRepository repo) {
        this(storage, repo, storage != null, s -> {});
    }

    public TimoIngestPipeline(ObjectStorage storage, ExamRepository repo, boolean writeImages,
                              java.util.function.Consumer<String> log) {
        this.storage = writeImages ? storage : null;
        this.repo = repo;
        this.writeImages = this.storage != null;
        this.log = log;
    }

    public void run(Path pdf) throws Exception {
        run(pdf, TimoLayout.all());
    }

    public void run(Path pdf, List<ExamRange> ranges) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf.toFile())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            String sourceFile = pdf.getFileName().toString();
            for (ExamRange e : ranges) {
                processExam(doc, renderer, e, sourceFile);
            }
        }
    }

    private void processExam(PDDocument doc, PDFRenderer renderer, ExamRange e, String sourceFile) throws Exception {
        log.accept("Extracting " + e.round() + " exam " + e.examNo()
                + " (questions p" + e.qFrom() + "-" + e.qTo() + ", solutions p" + e.sFrom() + "-" + e.sTo() + ")");
        List<Block> qs = QuestionBlockExtractor.extract(doc, e.qFrom(), e.qTo());
        List<Block> ss = QuestionBlockExtractor.extract(doc, e.sFrom(), e.sTo());
        List<Found> qImgs = writeImages ? new ImageCollector().collect(doc, e.qFrom(), e.qTo()) : List.of();
        List<Found> sImgs = writeImages ? new ImageCollector().collect(doc, e.sFrom(), e.sTo()) : List.of();
        List<VectorCollector.Box> qVecs = writeImages && e.round() == Round.PRELIMINARY
                ? VectorCollector.collect(doc, e.qFrom(), e.qTo()) : List.of();
        Map<Integer, BufferedImage> cache = writeImages ? new HashMap<>() : Map.of();

        long examId = repo.upsertExam(e, sourceFile);
        for (Block q : qs) {
            Block s = ss.stream().filter(b -> b.number == q.number).findFirst().orElse(null);
            String answer = s == null ? null : answerOf(s.text.toString());
            if (answer != null && answer.length() == 1 && "abcd".contains(answer)) {
                answer = answer.toUpperCase(java.util.Locale.ROOT);
            }
            boolean mcq = e.round() == Round.PRELIMINARY;
            List<String> texts = mcq ? options(q.text.toString()) : null;
            List<Marker> markers = mcq ? QuestionBlockExtractor.optionMarkers(q) : List.of();
            OptionSet optSet = mcq
                    ? optionsFor(e, q.number, texts, markers, qVecs, qImgs, q, renderer, cache)
                    : new OptionSet(null, List.of());
            List<Option> opts = optSet.options();

            boolean puaAnswer = hasUnmappedSymbol(answer);
            boolean puaOption = mcq && opts != null && opts.stream()
                    .anyMatch(o -> o.isText() && hasUnmappedSymbol(o.text()));
            boolean badOptions = mcq && (opts == null || opts.size() != 4 || answer == null
                    || !answer.matches("[A-D]") || puaOption
                    || opts.stream().anyMatch(o -> !o.valid()));
            boolean needsReview = s == null || answer == null || answer.isBlank() || puaAnswer || badOptions;

            long qid = repo.upsertQuestion(examId, q.number, topicOf(q.number), mcq ? "MCQ" : "FILL",
                    q.text.toString(), opts, answer, s == null ? null : s.text.toString(), needsReview);
            repo.clearImages(qid);

            if (writeImages) {
                upload(renderer, cache, e, q, qid, "SNAPSHOT", "FIGURE", qImgs);
                for (OptionCrop crop : optSet.crops()) {
                    putPng(e, q.number, qid, "OPTION", crop.index() + 1,
                            crop.png(), crop.width(), crop.height(), crop.sha256());
                }
                if (s != null) upload(renderer, cache, e, s, qid, "SOLUTION_SNAPSHOT", "SOLUTION_FIGURE", sImgs);
            }
        }
    }

    /**
     * Build the four options. Text options stay text; figure options (or options printed with
     * unmapped private-use glyphs) are cropped from the rendered page and stored as images.
     */
    private OptionSet optionsFor(ExamRange e, int qNo, List<String> texts, List<Marker> markers,
                                 List<VectorCollector.Box> vectors, List<Found> images, Block block,
                                 PDFRenderer renderer, Map<Integer, BufferedImage> cache) throws Exception {
        if (!writeImages || markers.size() != 4) {
            List<Option> plain = texts == null || texts.isEmpty()
                    ? null : texts.stream().map(Option::text).toList();
            return new OptionSet(plain, List.of());
        }

        List<Option> options = new ArrayList<>(4);
        List<OptionCrop> crops = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            String text = texts != null && texts.size() == 4 ? texts.get(i) : null;
            if (text != null && !text.isBlank() && !hasUnmappedSymbol(text)) {
                options.add(Option.text(text));
                continue;
            }
            BufferedImage crop = cropOption(renderer, cache, block, markers.get(i),
                    i < 3 ? markers.get(i + 1) : null, vectors, images);
            if (crop != null) {
                byte[] png = png(crop);
                String key = key(e.round(), e.examNo(), qNo, "OPTION", i + 1);
                String sha = sha256(png);
                options.add(Option.image(key, crop.getWidth(), crop.getHeight(), sha));
                crops.add(new OptionCrop(i, png, crop.getWidth(), crop.getHeight(), sha));
            } else {
                options.add(Option.text(text == null ? "" : text));
            }
        }
        return new OptionSet(options, crops);
    }

    private BufferedImage cropOption(PDFRenderer renderer, Map<Integer, BufferedImage> cache, Block block,
                                     Marker marker, Marker next, List<VectorCollector.Box> vectors,
                                     List<Found> images) throws IOException {
        BufferedImage page = cache.get(marker.page());
        if (page == null) {
            page = renderer.renderImageWithDPI(marker.page() - 1, DPI, ImageType.RGB);
            cache.put(marker.page(), page);
        }
        float scale = DPI / 72f;
        float x0 = marker.x() - 1f;
        float x1 = next != null ? next.x() - 1f : page.getWidth() / scale - 26f;

        float[] glyphBox = glyphBox(block, marker, x1);
        float[] box = glyphBox;
        if (box == null) box = imageBox(images, marker, x0, x1);
        if (box == null) box = vectorBox(vectors, marker, x0, x1);
        if (box == null) return null;

        int px = Math.max(0, Math.round((box[0] - 2f) * scale));
        int py = Math.max(0, Math.round((box[1] - 2f) * scale));
        int px2 = Math.min(page.getWidth(), Math.round((box[2] + 2f) * scale));
        int py2 = Math.min(page.getHeight(), Math.round((box[3] + 2f) * scale));
        if (px2 - px < 8 || py2 - py < 8) return null;
        return trimWhite(page.getSubimage(px, py, px2 - px, py2 - py));
    }

    /** Crop transparent/white margins so an option image is just the figure, whatever its font metrics. */
    private static BufferedImage trimWhite(BufferedImage img) {
        int minX = img.getWidth(), minY = img.getHeight(), maxX = -1, maxY = -1;
        int[] row = new int[img.getWidth()];
        for (int y = 0; y < img.getHeight(); y++) {
            img.getRGB(0, y, img.getWidth(), 1, row, 0, img.getWidth());
            for (int x = 0; x < row.length; x++) {
                int p = row[x];
                int r = (p >> 16) & 0xff, g = (p >> 8) & 0xff, b = p & 0xff;
                if (r < 245 || g < 245 || b < 245) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return null;
        int pad = 4;
        int x0 = Math.max(0, minX - pad);
        int y0 = Math.max(0, minY - pad);
        int x1 = Math.min(img.getWidth(), maxX + 1 + pad);
        int y1 = Math.min(img.getHeight(), maxY + 1 + pad);
        return img.getSubimage(x0, y0, x1 - x0, y1 - y0);
    }

    /** Bounds of the unmapped glyphs printed after an option marker, or null when it has none. */
    private static float[] glyphBox(Block block, Marker marker, float x1) {
        if (marker.line() < 0 || marker.line() >= block.lines.size()) return null;
        float left = Float.MAX_VALUE, top = Float.MAX_VALUE;
        float right = -Float.MAX_VALUE, bottom = -Float.MAX_VALUE;
        for (Glyph g : block.lines.get(marker.line()).glyphs()) {
            if (g.blank() || !hasUnmappedSymbol(g.text())) continue;
            if (g.x() < marker.contentX() - 0.5f || g.x() >= x1) continue;
            left = Math.min(left, g.x());
            right = Math.max(right, g.right());
            // TextPosition's height under-reports symbol-font ink, so keep a generous vertical window
            // and trim the whitespace afterwards.
            top = Math.min(top, g.top() - 18f);
            bottom = Math.max(bottom, g.top() + 4f);
        }
        return left == Float.MAX_VALUE ? null : new float[]{left, top, right, bottom};
    }

    /** Bounds of embedded images inside an option slot, ignoring the wide pattern row above it. */
    private static float[] imageBox(List<Found> images, Marker marker, float x0, float x1) {
        float left = Float.MAX_VALUE, top = Float.MAX_VALUE;
        float right = -Float.MAX_VALUE, bottom = -Float.MAX_VALUE;
        float slot = x1 - x0;
        for (Found f : images) {
            if (f.page() != marker.page()) continue;
            if (f.x() + f.w() / 2 < x0 || f.x() + f.w() / 2 > x1) continue;
            if (f.top() + f.h() / 2 < marker.top() - 60f
                    || f.top() + f.h() / 2 > marker.top() + 8f) continue;
            if (f.w() > Math.max(80f, slot * 0.95f) || f.h() > 90f) continue;
            left = Math.min(left, f.x());
            right = Math.max(right, f.x() + f.w());
            top = Math.min(top, f.top());
            bottom = Math.max(bottom, f.top() + f.h());
        }
        return left == Float.MAX_VALUE ? null : new float[]{left, top, right, bottom};
    }

    /** Bounds of the vector paths that sit inside an option slot, or null when it has none. */
    private static float[] vectorBox(List<VectorCollector.Box> vectors, Marker marker, float x0, float x1) {
        float left = Float.MAX_VALUE, top = Float.MAX_VALUE;
        float right = -Float.MAX_VALUE, bottom = -Float.MAX_VALUE;
        float slot = x1 - x0;
        for (VectorCollector.Box b : vectors) {
            if (b.page() != marker.page()) continue;
            if (b.centerX() < x0 || b.centerX() > x1) continue;
            if (b.centerY() < marker.top() - 60f || b.centerY() > marker.top() + 8f) continue;
            if (b.width() > Math.max(80f, slot * 0.95f) || b.height() > 90f) continue;
            left = Math.min(left, b.left());
            right = Math.max(right, b.right());
            top = Math.min(top, b.top());
            bottom = Math.max(bottom, b.bottom());
        }
        return left == Float.MAX_VALUE ? null : new float[]{left, top, right, bottom};
    }

    private void upload(PDFRenderer r, Map<Integer, BufferedImage> cache, ExamRange e, Block b, long qid,
                        String snapRole, String figRole, List<Found> imgs) throws Exception {
        putPng(e, b.number, qid, snapRole, 1, snapshot(r, cache, b));

        int seq = 1;
        Set<String> seen = new HashSet<>();
        for (Found f : imgs) {
            float cy = f.top() + f.h() / 2;
            boolean inside = b.regions.stream().anyMatch(rg ->
                    rg.page() == f.page() && cy >= rg.top() && cy < rg.bottom());
            if (!inside) continue;
            BufferedImage bi = f.image().getImage();
            if (bi.getWidth() < MIN_SIDE_PX || bi.getHeight() < MIN_SIDE_PX) continue;
            byte[] bytes = png(bi);
            if (!seen.add(sha256(bytes))) continue;
            putPng(e, b.number, qid, figRole, seq++, bytes, bi.getWidth(), bi.getHeight());
        }
    }

    private void putPng(ExamRange e, int qNo, long qid, String role, int seq, BufferedImage img) throws Exception {
        putPng(e, qNo, qid, role, seq, png(img), img.getWidth(), img.getHeight());
    }

    private void putPng(ExamRange e, int qNo, long qid, String role, int seq, byte[] bytes, int w, int h)
            throws Exception {
        putPng(e, qNo, qid, role, seq, bytes, w, h, sha256(bytes));
    }

    private void putPng(ExamRange e, int qNo, long qid, String role, int seq, byte[] bytes, int w, int h,
                        String sha) throws Exception {
        String key = key(e.round(), e.examNo(), qNo, role, seq);
        storage.put(key, bytes, "image/png");
        repo.upsertImage(qid, role, seq, key, w, h, sha);
    }

    static String key(Round round, int exam, int q, String role, int seq) {
        return String.format("timo/grade2/%s/exam-%02d/q-%02d/%s-%02d.png",
                round.name().toLowerCase(), exam, q, role.toLowerCase().replace('_', '-'), seq);
    }

    static String topicOf(int n) {
        return switch ((n - 1) / 5) {
            case 0 -> "LOGIC";
            case 1 -> "ARITHMETIC";
            case 2 -> "NUMBER_THEORY";
            case 3 -> "GEOMETRY";
            default -> "COMBINATORICS";
        };
    }

    /** Glyphs from the PDF's symbol font map to the private-use area; the snapshot is the source of truth. */
    static boolean hasUnmappedSymbol(String text) {
        return text != null && text.codePoints().anyMatch(c -> c >= 0xE000 && c <= 0xF8FF);
    }

    private static final Pattern ANSWER = Pattern.compile("Đáp số:\\s*(.+?)\\.?\\s*$", Pattern.MULTILINE);
    /** Last "Đáp số" in the solution wins. */
    static String answerOf(String solution) {
        Matcher m = ANSWER.matcher(solution);
        String last = null;
        while (m.find()) last = m.group(1).trim();
        return last;
    }

    // An option marker must be followed by option text on the same line; this keeps the
    // sentence-ending "B." in "... value of B." from being read as an option.
    private static final Pattern OPT = Pattern.compile(
            "(?<![A-Za-z0-9])([A-D])\\.[ \\t]+(?![A-D]\\.)(\\S[^\\n]*?)"
                    + "(?=[ \\t]+(?<![A-Za-z0-9])[A-D]\\.[ \\t]+\\S|$)",
            Pattern.MULTILINE);
    static List<String> options(String questionText) {
        List<String> res = new ArrayList<>();
        Matcher m = OPT.matcher(questionText);
        while (m.find()) res.add(m.group(2).replaceAll("\\s+", " ").trim());
        return res;
    }

    private static BufferedImage snapshot(PDFRenderer r, Map<Integer, BufferedImage> cache, Block b)
            throws IOException {
        float s = DPI / 72f;
        List<BufferedImage> parts = new ArrayList<>();
        for (Region rg : b.regions) {
            BufferedImage page = cache.get(rg.page());
            if (page == null) {
                page = r.renderImageWithDPI(rg.page() - 1, DPI, ImageType.RGB);
                cache.put(rg.page(), page);
            }
            int x = Math.round(30 * s);
            // getYDirAdj() is the baseline, so pad upward for ascenders; do not pad the bottom or the
            // next question's first line would bleed into the snapshot.
            int y = Math.max(0, Math.round((rg.top() - 10) * s));
            int bottom = Math.min(page.getHeight(), Math.round(rg.bottom() * s));
            int w = Math.max(1, page.getWidth() - 2 * x);
            int h = Math.max(1, bottom - y);
            if (y >= page.getHeight()) continue;
            h = Math.min(h, page.getHeight() - y);
            parts.add(page.getSubimage(x, y, w, h));
        }
        if (parts.isEmpty()) {
            BufferedImage blank = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
            return blank;
        }
        if (parts.size() == 1) return parts.get(0);
        int totalH = parts.stream().mapToInt(BufferedImage::getHeight).sum();
        BufferedImage out = new BufferedImage(parts.get(0).getWidth(), totalH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, out.getWidth(), out.getHeight());
        int y = 0;
        for (BufferedImage p : parts) { g.drawImage(p, 0, y, null); y += p.getHeight(); }
        g.dispose();
        return out;
    }

    private static byte[] png(BufferedImage img) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", bos);
        return bos.toByteArray();
    }

    private static String sha256(byte[] data) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    }
}

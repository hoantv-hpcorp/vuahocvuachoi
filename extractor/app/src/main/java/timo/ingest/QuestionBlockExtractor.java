package timo.ingest;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Difficulty: Medium.
 * Approach: Read every text line with its (x, top) position. A line like "12. ..." near the left
 *           margin starts a question block; the block ends at the next question start, a topic
 *           header, or the footer zone. A block may span two pages, so it keeps a list of regions.
 * Complexity: O(L) time and space, L = number of text lines in the page range.
 */
public final class QuestionBlockExtractor extends PDFTextStripper {
    public record Glyph(String text, float x, float top, float width, float height) {
        boolean blank() { return text == null || text.isBlank(); }
        float right() { return x + width; }
    }

    public record Line(int page, float x, float top, String text, List<Glyph> glyphs) {
        public Line(int page, float x, float top, String text) {
            this(page, x, top, text, List.of());
        }

        public Line {
            glyphs = glyphs == null ? List.of() : List.copyOf(glyphs);
        }
    }

    public record Region(int page, float top, float bottom) {}

    /** An option marker "A." .. "D." with the glyph geometry needed to crop a figure option. */
    public record Marker(char letter, int line, int page, float x, float top, float contentX) {}

    public static final class Block {
        public final int number;
        public final List<Region> regions = new ArrayList<>();
        public final List<Line> lines = new ArrayList<>();
        public final StringBuilder text = new StringBuilder();
        Block(int number) { this.number = number; }
    }

    // Measured on TIMOK2.pdf: last content baseline top = 750.0, page number baseline top = 763.9.
    // getYDirAdj() is the text baseline, so cut a little above the next baseline to keep its glyphs out.
    static final float FOOTER_TOP = 762f;
    static final float PAGE_CONTENT_BOTTOM = 754f;
    static final float LINE_ASCENT = 9f;
    static final float LEFT_MAX = 80f;
    private static final Pattern Q_START = Pattern.compile("^(\\d{1,2})\\.\\s+\\S.*");
    private static final Pattern TOPIC = Pattern.compile(
            "(?i)^(logical thinking|arithmetic|number theory|geometry|combinatorics)\\s*/.*");
    private static final Pattern FURNITURE = Pattern.compile(
            "^(KỲ THI OLYMPIC|BỘ ĐỀ ÔN THI|FERMAT Education|PRELIMINARY ROUND|HEAT ROUND|ĐỀ SỐ \\d+|LỜI GIẢI CHI TIẾT)");

    private final List<Line> lines = new ArrayList<>();
    private final StringBuilder cur = new StringBuilder();
    private final List<Glyph> glyphs = new ArrayList<>();
    private TextPosition firstPos;
    private int curPage;

    private QuestionBlockExtractor() throws IOException { setSortByPosition(true); }

    // PDFBox calls writeString once per word, so we glue words into lines ourselves.
    @Override protected void writeString(String text, List<TextPosition> pos) {
        if (firstPos == null) { firstPos = pos.get(0); curPage = getCurrentPageNo(); }
        for (TextPosition p : pos) {
            glyphs.add(new Glyph(p.getUnicode(), p.getXDirAdj(), p.getYDirAdj(),
                    p.getWidthDirAdj(), p.getHeightDir()));
        }
        cur.append(text);
    }
    @Override protected void writeWordSeparator() { cur.append(' '); }
    @Override protected void writeLineSeparator() { flushLine(); }
    // Without this, a footer line and the first line of the next page are merged into one line.
    @Override protected void writePageEnd() { flushLine(); }
    @Override protected void writeString(String text) { /* page separators */ }

    private void flushLine() {
        if (firstPos != null) {
            lines.add(new Line(curPage, firstPos.getXDirAdj(), firstPos.getYDirAdj(),
                    cur.toString().strip(), glyphs));
        }
        cur.setLength(0);
        glyphs.clear();
        firstPos = null;
    }

    public static List<Block> extract(PDDocument doc, int fromPage, int toPage) throws IOException {
        QuestionBlockExtractor s = new QuestionBlockExtractor();
        s.setStartPage(fromPage);
        s.setEndPage(toPage);
        s.getText(doc);
        s.flushLine();
        return buildBlocks(s.lines);
    }

    /** Pure function, no PDF needed, so it is easy to unit test. */
    static List<Block> buildBlocks(List<Line> lines) {
        List<Block> blocks = new ArrayList<>();
        Block cur = null;
        for (Line l : lines) {
            if (l.text().isEmpty() || l.top() > FOOTER_TOP || FURNITURE.matcher(l.text()).find()) continue;
            if (TOPIC.matcher(l.text()).matches()) { cut(cur, l); cur = null; continue; }

            Matcher m = Q_START.matcher(l.text());
            int expected = blocks.isEmpty() ? 1 : blocks.get(blocks.size() - 1).number + 1;
            if (m.matches() && l.x() < LEFT_MAX && Integer.parseInt(m.group(1)) == expected) {
                cut(cur, l);
                cur = new Block(expected);
                cur.regions.add(new Region(l.page(), l.top(), PAGE_CONTENT_BOTTOM));
                cur.lines.add(l);
                cur.text.append(l.text()).append('\n');
                blocks.add(cur);
            } else if (cur != null) {
                Region last = cur.regions.get(cur.regions.size() - 1);
                if (last.page() != l.page()) cur.regions.add(new Region(l.page(), 0, PAGE_CONTENT_BOTTOM));
                cur.lines.add(l);
                cur.text.append(l.text()).append('\n');
            }
        }
        return blocks;
    }

    /**
     * Locate the last A-B-C-D run of option markers in a block. Markers are glyph based because
     * figure options leave only the letters in the text layer.
     */
    static List<Marker> optionMarkers(Block block) {
        List<Marker> all = new ArrayList<>();
        for (int i = 0; i < block.lines.size(); i++) {
            all.addAll(markersIn(block.lines.get(i), i));
        }
        List<Marker> best = List.of();
        for (int i = 0; i + 3 < all.size(); i++) {
            Marker a = all.get(i);
            Marker b = all.get(i + 1);
            Marker c = all.get(i + 2);
            Marker d = all.get(i + 3);
            if (a.letter() == 'A' && b.letter() == 'B' && c.letter() == 'C' && d.letter() == 'D'
                    && Math.abs(a.top() - d.top()) <= 40f
                    && a.page() == d.page()) {
                best = List.copyOf(all.subList(i, i + 4));
            }
        }
        return best;
    }

    private static List<Marker> markersIn(Line line, int lineIndex) {
        List<Marker> res = new ArrayList<>();
        List<Glyph> gs = line.glyphs();
        for (int i = 0; i < gs.size(); i++) {
            Glyph g = gs.get(i);
            String t = g.text();
            if (t == null || t.length() != 1 || "ABCD".indexOf(t.charAt(0)) < 0) continue;

            int dot = nextNonBlank(gs, i + 1);
            if (dot < 0 || !".".equals(gs.get(dot).text())) continue;
            int content = nextNonBlank(gs, dot + 1);

            float contentX;
            boolean gapOk;
            if (content < 0) {
                contentX = gs.get(dot).right();
                gapOk = true;
            } else {
                contentX = gs.get(content).x();
                gapOk = contentX - gs.get(dot).right() >= 1.2f;
            }

            int prev = prevNonBlank(gs, i - 1);
            boolean wordStart = prev < 0 || g.x() - gs.get(prev).right() >= 1f;
            if (gapOk && wordStart) {
                res.add(new Marker(t.charAt(0), lineIndex, line.page(), g.x(), line.top(), contentX));
            }
        }
        return res;
    }

    private static int nextNonBlank(List<Glyph> gs, int from) {
        for (int i = from; i < gs.size(); i++) if (!gs.get(i).blank()) return i;
        return -1;
    }

    private static int prevNonBlank(List<Glyph> gs, int from) {
        for (int i = from; i >= 0; i--) if (!gs.get(i).blank()) return i;
        return -1;
    }

    private static void cut(Block b, Line next) {
        if (b == null) return;
        int i = b.regions.size() - 1;
        Region r = b.regions.get(i);
        if (r.page() == next.page()) {
            b.regions.set(i, new Region(r.page(), r.top(), Math.max(r.top(), next.top() - LINE_ASCENT)));
        }
    }
}

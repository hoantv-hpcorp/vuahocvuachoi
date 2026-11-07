package timo.ingest;

import org.apache.pdfbox.contentstream.PDFGraphicsStreamEngine;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImage;

import java.awt.geom.Point2D;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Difficulty: Medium.
 * Approach: Replay each page's content stream and record the bounding box of every painted path.
 *           Option figures are vector drawings (not embedded images), so their boxes let the
 *           pipeline crop a single option out of the rendered page.
 * Complexity: O(P) time, P = path operators on the pages; boxes are deduplicated by value.
 */
public final class VectorCollector extends PDFGraphicsStreamEngine {
    /** Top-down page coordinates, matching the rendered page. */
    public record Box(int page, float left, float top, float right, float bottom) {
        public float width() { return right - left; }
        public float height() { return bottom - top; }
        public float centerX() { return (left + right) / 2; }
        public float centerY() { return (top + bottom) / 2; }
    }

    private final List<Box> boxes = new ArrayList<>();
    private final Set<Box> seen = new LinkedHashSet<>();
    private int pageNo;
    private PDRectangle cropBox;
    private float minX = Float.MAX_VALUE, minY = Float.MAX_VALUE;
    private float maxX = -Float.MAX_VALUE, maxY = -Float.MAX_VALUE;
    private boolean open;

    private VectorCollector(PDPage page) {
        super(page);
    }

    public static List<Box> collect(PDDocument doc, int fromPage, int toPage) throws IOException {
        List<Box> all = new ArrayList<>();
        for (int p = fromPage; p <= toPage; p++) {
            PDPage page = doc.getPage(p - 1);
            VectorCollector collector = new VectorCollector(page);
            collector.pageNo = p;
            collector.cropBox = page.getCropBox();
            collector.processPage(page);
            all.addAll(collector.boxes);
        }
        return List.copyOf(all);
    }

    private void add(float x, float y) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        open = true;
    }

    private void paint() {
        if (!open) return;
        open = false;
        float left = minX, top = 0, right = maxX, bottom = 0;
        boolean valid = maxX - minX >= 0.5f && maxY - minY >= 0.5f;
        if (valid) {
            top = cropBox.getUpperRightY() - maxY;
            bottom = cropBox.getUpperRightY() - minY;
        }
        reset();

        if (!valid) return;
        // Background rectangles cover the whole page and are never useful as figures.
        if (left <= 1f && top <= 1f
                && right >= cropBox.getWidth() - 1f && bottom >= cropBox.getHeight() - 1f) return;

        Box box = new Box(pageNo, left, top, right, bottom);
        if (seen.add(box)) boxes.add(box);
    }

    private void reset() {
        minX = Float.MAX_VALUE;
        minY = Float.MAX_VALUE;
        maxX = -Float.MAX_VALUE;
        maxY = -Float.MAX_VALUE;
    }

    @Override public void appendRectangle(Point2D p0, Point2D p1, Point2D p2, Point2D p3) {
        add((float) p0.getX(), (float) p0.getY());
        add((float) p1.getX(), (float) p1.getY());
        add((float) p2.getX(), (float) p2.getY());
        add((float) p3.getX(), (float) p3.getY());
    }

    @Override public void drawImage(PDImage image) { /* embedded images are handled by ImageCollector */ }

    @Override public void clip(int windingRule) { /* clip paths are recorded with endPath */ }

    @Override public void moveTo(float x, float y) { add(x, y); }

    @Override public void lineTo(float x, float y) { add(x, y); }

    @Override public void curveTo(float x1, float y1, float x2, float y2, float x3, float y3) {
        add(x1, y1);
        add(x2, y2);
        add(x3, y3);
    }

    @Override public Point2D getCurrentPoint() { return new Point2D.Float(0, 0); }

    @Override public void closePath() { /* the path box is already complete */ }

    @Override public void endPath() { paint(); }

    @Override public void strokePath() { paint(); }

    @Override public void fillPath(int windingRule) { paint(); }

    @Override public void fillAndStrokePath(int windingRule) { paint(); }

    @Override public void shadingFill(COSName shadingName) { /* shading has no path box */ }
}

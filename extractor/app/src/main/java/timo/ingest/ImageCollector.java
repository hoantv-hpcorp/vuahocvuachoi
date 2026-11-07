package timo.ingest;

import org.apache.pdfbox.contentstream.PDFStreamEngine;
import org.apache.pdfbox.contentstream.operator.DrawObject;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.contentstream.operator.state.Concatenate;
import org.apache.pdfbox.contentstream.operator.state.Restore;
import org.apache.pdfbox.contentstream.operator.state.Save;
import org.apache.pdfbox.contentstream.operator.state.SetGraphicsStateParameters;
import org.apache.pdfbox.contentstream.operator.state.SetMatrix;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.util.Matrix;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Difficulty: Medium.
 * Approach: Replay each page's content stream; on every "Do" operator that draws an image, read the
 *           current transformation matrix to get its box, converted to top-down coordinates so it
 *           can be matched with question regions.
 * Complexity: O(P + I) time, P = content operators, I = images on the pages.
 */
public final class ImageCollector extends PDFStreamEngine {
    public record Found(int page, float x, float top, float w, float h, PDImageXObject image) {}

    private final List<Found> found = new ArrayList<>();
    private int pageNo;

    public ImageCollector() throws IOException {
        addOperator(new Concatenate(this));
        addOperator(new DrawObject(this));
        addOperator(new SetGraphicsStateParameters(this));
        addOperator(new Save(this));
        addOperator(new Restore(this));
        addOperator(new SetMatrix(this));
    }

    public List<Found> collect(PDDocument doc, int fromPage, int toPage) throws IOException {
        for (int p = fromPage; p <= toPage; p++) {
            pageNo = p;
            processPage(doc.getPage(p - 1));
        }
        return List.copyOf(found);
    }

    @Override
    protected void processOperator(Operator op, List<COSBase> args) throws IOException {
        if ("Do".equals(op.getName()) && args.get(0) instanceof COSName name) {
            PDXObject xo = getResources().getXObject(name);
            if (xo instanceof PDImageXObject img) {
                Matrix m = getGraphicsState().getCurrentTransformationMatrix();
                PDRectangle box = getCurrentPage().getCropBox();
                float w = Math.abs(m.getScalingFactorX());
                float h = Math.abs(m.getScalingFactorY());
                float x = box.getLowerLeftX() + m.getTranslateX();
                float top = box.getUpperRightY() - (m.getTranslateY() + h);
                found.add(new Found(pageNo, x, top, w, h, img));
                return;
            }
        }
        super.processOperator(op, args);   // DrawObject still handles form XObjects
    }
}

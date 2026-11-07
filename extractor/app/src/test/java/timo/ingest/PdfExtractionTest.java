package timo.ingest;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import timo.ingest.QuestionBlockExtractor.Block;
import timo.ingest.TimoLayout.ExamRange;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Runs the text side of the pipeline against the real PDF: -Dtimo.pdf=extractor/TIMOK2.pdf */
@EnabledIfSystemProperty(named = "timo.pdf", matches = ".+")
class PdfExtractionTest {
    @Test
    void everyExamHas25QuestionsAndSolutions() throws Exception {
        try (PDDocument doc = Loader.loadPDF(Path.of(System.getProperty("timo.pdf")).toFile())) {
            for (ExamRange e : TimoLayout.all()) {
                List<Block> qs = QuestionBlockExtractor.extract(doc, e.qFrom(), e.qTo());
                List<Block> ss = QuestionBlockExtractor.extract(doc, e.sFrom(), e.sTo());
                String label = e.round() + " #" + e.examNo();
                assertEquals(25, qs.size(), label + " questions");
                assertEquals(25, ss.size(), label + " solutions");
                for (int i = 0; i < 25; i++) {
                    assertEquals(i + 1, qs.get(i).number, label + " question numbering");
                    assertTrue(!qs.get(i).text.toString().isBlank(), label + " q" + (i + 1) + " text");
                }
            }
        }
    }
}

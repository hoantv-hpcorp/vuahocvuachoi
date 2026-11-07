package timo.ingest;

import org.junit.jupiter.api.Test;
import timo.ingest.QuestionBlockExtractor.Block;
import timo.ingest.QuestionBlockExtractor.Glyph;
import timo.ingest.QuestionBlockExtractor.Line;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class QuestionBlockExtractorTest {
    @Test
    void blocksSplitOnQuestionStartsAndTopicHeaders() {
        List<Block> blocks = QuestionBlockExtractor.buildBlocks(List.of(
                new Line(6, 50, 120, "Logical thinking / Tư duy lô-gic"),
                new Line(6, 50, 140, "1. What is the number?"),
                new Line(6, 70, 160, "A. 24 B. 25 C. 26 D. 23"),
                new Line(6, 50, 200, "2. Tony has 17 red marbles."),
                new Line(6, 50, 300, "Arithmetic / Số học"),
                new Line(6, 50, 700, "3. Maria will be 13 years old."),
                new Line(7, 70, 62, "A. 6 B. 8 C. 19 D. 7"),
                new Line(6, 50, 790, "FERMAT Education - Email")));

        assertEquals(3, blocks.size());
        assertEquals(191, blocks.get(0).regions.get(0).bottom());
        assertEquals(291, blocks.get(1).regions.get(0).bottom());
        assertEquals(2, blocks.get(2).regions.size());
        assertEquals(7, blocks.get(2).regions.get(1).page());
    }

    @Test
    void pageNumberAndFooterLinesAreDropped() {
        List<Block> blocks = QuestionBlockExtractor.buildBlocks(List.of(
                new Line(6, 50, 140, "1. What is the number?"),
                new Line(6, 530, 764, "5"),
                new Line(6, 56, 780, "KỲ THI OLYMPIC TOÁN HỌC QUỐC TẾ TIMO"),
                new Line(7, 56, 62, "2. Next question")));

        assertEquals(2, blocks.size());
        assertEquals("1. What is the number?\n", blocks.get(0).text.toString());
    }

    @Test
    void optionMarkersUseGlyphPositions() {
        List<Glyph> glyphs = List.of(
                new Glyph("A", 85f, 723.5f, 9f, 6f),
                new Glyph(".", 94f, 723.5f, 2f, 6f),
                new Glyph(" ", 97f, 723.5f, 2f, 6f),
                new Glyph("B", 198.4f, 723.5f, 7f, 6f),
                new Glyph(".", 205.5f, 723.5f, 2f, 6f),
                new Glyph(" ", 208f, 723.5f, 2f, 6f),
                new Glyph("C", 311.8f, 723.5f, 8f, 6f),
                new Glyph(".", 320f, 723.5f, 2f, 6f),
                new Glyph(" ", 322f, 723.5f, 2f, 6f),
                new Glyph("D", 425.2f, 723.5f, 9f, 6f),
                new Glyph(".", 434.1f, 723.5f, 2f, 6f));

        List<Block> blocks = QuestionBlockExtractor.buildBlocks(List.of(
                new Line(8, 56.6f, 639.7f, "1. According to the pattern shown below"),
                new Line(8, 56.6f, 723.5f, "A.  B.  C.  D.", glyphs)));

        List<QuestionBlockExtractor.Marker> markers = QuestionBlockExtractor.optionMarkers(blocks.get(0));
        assertEquals(4, markers.size());
        assertEquals("ABCD", markers.stream()
                .map(m -> String.valueOf(m.letter())).reduce("", String::concat));
        assertEquals(85f, markers.get(0).x(), 0.01f);
        assertEquals(198.4f, markers.get(1).x(), 0.01f);
        assertEquals(1, markers.get(0).line());
    }

    @Test
    void optionMarkersSpanTwoLines() {
        List<Block> blocks = QuestionBlockExtractor.buildBlocks(List.of(
                new Line(6, 56.6f, 400f, "1. Pick a day"),
                new Line(6, 56.6f, 415f, "A. Sunday B. Wednesday", List.of(
                        new Glyph("A", 85f, 415f, 8f, 6f),
                        new Glyph(".", 93f, 415f, 2f, 6f),
                        new Glyph(" ", 96f, 415f, 2f, 6f),
                        new Glyph("B", 200f, 415f, 8f, 6f),
                        new Glyph(".", 208f, 415f, 2f, 6f),
                        new Glyph(" ", 211f, 415f, 2f, 6f))),
                new Line(6, 56.6f, 430f, "C. Monday D. Tuesday", List.of(
                        new Glyph("C", 85f, 430f, 8f, 6f),
                        new Glyph(".", 93f, 430f, 2f, 6f),
                        new Glyph(" ", 96f, 430f, 2f, 6f),
                        new Glyph("D", 300f, 430f, 8f, 6f),
                        new Glyph(".", 308f, 430f, 2f, 6f),
                        new Glyph(" ", 311f, 430f, 2f, 6f)))));

        List<QuestionBlockExtractor.Marker> markers = QuestionBlockExtractor.optionMarkers(blocks.get(0));
        assertEquals(4, markers.size());
        assertEquals(1, markers.get(0).line());
        assertEquals(2, markers.get(2).line());
    }
}

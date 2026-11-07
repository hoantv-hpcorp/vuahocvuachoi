package timo.ingest;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LayoutAndParsingTest {
    @Test
    void layoutHasSevenExamsPerRound() {
        var all = TimoLayout.all();
        assertEquals(14, all.size());
        assertEquals(6, all.get(0).qFrom());
        assertEquals(10, all.get(0).qTo());
        assertEquals(34, all.get(6).qFrom());
        assertEquals(38, all.get(6).qTo());
        assertEquals(39, all.get(7).qFrom());
        assertEquals(42, all.get(7).qTo());
        assertEquals(124, all.get(13).sTo());
    }

    @Test
    void storageKeyFormat() {
        assertEquals("timo/grade2/heat/exam-03/q-07/solution-figure-02.png",
                TimoIngestPipeline.key(TimoLayout.Round.HEAT, 3, 7, "SOLUTION_FIGURE", 2));
        assertEquals("timo/grade2/preliminary/exam-01/q-04/figure-01.png",
                TimoIngestPipeline.key(TimoLayout.Round.PRELIMINARY, 1, 4, "FIGURE", 1));
    }

    @Test
    void topicsFollowQuestionBands() {
        assertEquals("LOGIC", TimoIngestPipeline.topicOf(1));
        assertEquals("ARITHMETIC", TimoIngestPipeline.topicOf(6));
        assertEquals("NUMBER_THEORY", TimoIngestPipeline.topicOf(15));
        assertEquals("GEOMETRY", TimoIngestPipeline.topicOf(20));
        assertEquals("COMBINATORICS", TimoIngestPipeline.topicOf(25));
    }

    @Test
    void optionsAreSplitOnOneOrTwoLines() {
        assertEquals(List.of("24", "25", "26", "23"),
                TimoIngestPipeline.options("A. 24 B. 25 C. 26 D. 23"));
        List<String> days = TimoIngestPipeline.options(
                "A. Sunday/ Chủ nhật B. Wednesday/ Thứ Tư\nC. Monday/ Thứ Hai   D. Tuesday/ Thứ Ba");
        assertEquals(4, days.size());
        assertEquals("Wednesday/ Thứ Tư", days.get(1));
    }

    @Test
    void optionsIgnoreSentenceEndingLetters() {
        String text = """
                10. Given that A and B represent different 1-digit numbers, find the value of B.
                Biết rằng A và B biểu diễn các số có 1 chữ số khác nhau, tìm giá trị của B.
                A. 8 B. 7 C. 5 D. 4""";
        assertEquals(List.of("8", "7", "5", "4"), TimoIngestPipeline.options(text));
    }

    @Test
    void optionsWithoutTextAreNotInvented() {
        assertEquals(0, TimoIngestPipeline.options("A.  B.  C.  D.").size());
    }

    @Test
    void optionsIgnoreNumberedWordsLike3D() {
        assertTrue(TimoIngestPipeline.options("A. 5 B. 6 C. 7").size() == 3);
        assertEquals(0, TimoIngestPipeline.options("Diagram 3D. shape only").size());
    }

    @Test
    void privateUseGlyphsAreDetected() {
        assertTrue(TimoIngestPipeline.hasUnmappedSymbol("7 \uF0CD 4 – 5 \uF0CD 3 = 13"));
        assertTrue(TimoIngestPipeline.hasUnmappedSymbol("\uF0BE"));
        assertEquals(false, TimoIngestPipeline.hasUnmappedSymbol("7 × 4 – 5 × 3 = 13"));
    }

    @Test
    void answersAreReadFromTheLastDapSo() {
        assertEquals("A", TimoIngestPipeline.answerOf("Vậy ...\nĐáp số: A."));
        assertEquals("2046", TimoIngestPipeline.answerOf("Đáp số: 2046."));
        assertEquals("Wednesday", TimoIngestPipeline.answerOf("Đáp số: Wednesday."));
        assertEquals("7 × 4 – 5 × 3 = 13", TimoIngestPipeline.answerOf("Đáp số: 7 × 4 – 5 × 3 = 13."));
        assertEquals("C", TimoIngestPipeline.answerOf("Đáp số: B.\nGhi chú\nĐáp số: C."));
    }

    @Test
    void optionsSerializeAsTextOrImageObjects() {
        assertEquals("[{\"type\": \"text\", \"text\": \"24\"}, "
                        + "{\"type\": \"image\", \"storageKey\": \"k\", \"width\": 10, \"height\": 20, \"sha256\": \"s\"}]",
                Json.options(List.of(Option.text("24"), Option.image("k", 10, 20, "s"))));
        assertEquals(false, Option.text("").valid());
        assertEquals(true, Option.image("k", 1, 1, "s").valid());
    }
}

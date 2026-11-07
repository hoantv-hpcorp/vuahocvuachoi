package timo.ingest;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import timo.ingest.CollectingRepository.QuestionRecord;
import timo.ingest.TimoLayout.Round;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Runs the image side of the pipeline against the real PDF: -Dtimo.pdf=extractor/TIMOK2.pdf */
@EnabledIfSystemProperty(named = "timo.pdf", matches = ".+")
class ImageOptionExtractionTest {
    @Test
    void figureAndGlyphOptionsAreCroppedToImages(@TempDir Path out) throws Exception {
        CollectingRepository repo = new CollectingRepository();
        new TimoIngestPipeline(new LocalDirStorage(out.resolve("images")), repo).run(
                Path.of(System.getProperty("timo.pdf")),
                List.of(TimoLayout.find(Round.PRELIMINARY, 1),
                        TimoLayout.find(Round.PRELIMINARY, 3),
                        TimoLayout.find(Round.PRELIMINARY, 4),
                        TimoLayout.find(Round.PRELIMINARY, 5)));

        QuestionRecord q17 = question(repo, Round.PRELIMINARY, 1, 17);
        assertTrue(q17.options.stream().allMatch(Option::isImage), "q17 is a figure-option question");
        assertFalse(q17.needsReview);
        for (Option option : q17.options) {
            assertNotNull(option.storageKey());
            assertTrue(Files.isRegularFile(out.resolve("images").resolve(option.storageKey())));
        }

        QuestionRecord exam3q17 = question(repo, Round.PRELIMINARY, 3, 17);
        assertTrue(exam3q17.options.get(0).isText());
        assertTrue(exam3q17.options.get(3).isImage());
        assertFalse(exam3q17.needsReview);

        QuestionRecord exam4q3 = question(repo, Round.PRELIMINARY, 4, 3);
        assertTrue(exam4q3.options.stream().allMatch(Option::isImage));
        assertFalse(exam4q3.needsReview);

        QuestionRecord exam5q3 = question(repo, Round.PRELIMINARY, 5, 3);
        assertTrue(exam5q3.options.get(0).isImage());
        assertTrue(exam5q3.options.get(2).isText());
        assertTrue(exam5q3.options.get(3).isImage());
        assertFalse(exam5q3.needsReview);
    }

    private static QuestionRecord question(CollectingRepository repo, Round round, int examNo, int number) {
        return repo.exams().stream()
                .filter(e -> e.round == round && e.examNo == examNo)
                .flatMap(e -> e.questions.stream())
                .filter(q -> q.number == number)
                .findFirst().orElseThrow();
    }
}

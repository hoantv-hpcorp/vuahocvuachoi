package timo.ingest;

import java.util.ArrayList;
import java.util.List;

/**
 * Difficulty: Easy.
 * Approach: Hard-code page ranges from the table of contents (printed page numbers).
 *           PDF page = printed page + 1 because of the cover page.
 * Complexity: O(E) time and space, E = number of exams (14).
 */
public final class TimoLayout {
    public enum Round { PRELIMINARY, HEAT }

    /** All page numbers are 1-based PDF pages, inclusive. */
    public record ExamRange(Round round, int examNo, int qFrom, int qTo, int sFrom, int sTo) {}

    private static final int[] PRE_Q  = {5, 10, 15, 20, 25, 29, 33};
    private static final int[] HEAT_Q = {38, 42, 46, 50, 54, 58, 62};
    private static final int[] PRE_S  = {65, 69, 73, 77, 82, 86, 89};
    private static final int[] HEAT_S = {94, 99, 104, 108, 112, 116, 120};
    private static final int PRINTED_TO_PDF = 1;

    private TimoLayout() {}

    public static List<ExamRange> all() {
        List<ExamRange> res = new ArrayList<>();
        add(res, Round.PRELIMINARY, PRE_Q, HEAT_Q[0], PRE_S, HEAT_S[0]);
        add(res, Round.HEAT, HEAT_Q, PRE_S[0], HEAT_S, 124);
        return List.copyOf(res);
    }

    private static void add(List<ExamRange> out, Round round, int[] q, int qEnd, int[] s, int sEnd) {
        for (int i = 0; i < q.length; i++) {
            int qLast = (i + 1 < q.length ? q[i + 1] : qEnd) - 1;
            int sLast = (i + 1 < s.length ? s[i + 1] : sEnd) - 1;
            out.add(new ExamRange(round, i + 1,
                    q[i] + PRINTED_TO_PDF, qLast + PRINTED_TO_PDF,
                    s[i] + PRINTED_TO_PDF, sLast + PRINTED_TO_PDF));
        }
    }

    /** Exam boundary used for logging and for the smoke test. */
    public static ExamRange find(Round round, int examNo) {
        return all().stream()
                .filter(e -> e.round() == round && e.examNo() == examNo)
                .findFirst()
                .orElseThrow();
    }
}

package timo.ingest;

import timo.ingest.CollectingRepository.ExamRecord;
import timo.ingest.CollectingRepository.QuestionRecord;

import java.util.ArrayList;
import java.util.List;

/** Quality gate described in the extraction plan: 25 questions, 4 options, answer in A-D. */
public final class Validator {
    public record Result(List<String> structural, List<String> reviews) {
        public boolean ok() { return structural.isEmpty(); }
    }

    private Validator() {}

    public static Result validate(List<ExamRecord> exams, boolean expectImages) {
        List<String> structural = new ArrayList<>();
        List<String> reviews = new ArrayList<>();
        for (ExamRecord e : exams) {
            String label = e.round + " #" + e.examNo;
            List<QuestionRecord> qs = e.questions.stream().sorted((a, b) -> a.number - b.number).toList();
            if (qs.size() != 25) structural.add(label + ": expected 25 questions, found " + qs.size());
            for (int i = 0; i < qs.size(); i++) {
                if (qs.get(i).number != i + 1) {
                    structural.add(label + ": question numbers are not 1..25 (position " + (i + 1)
                            + " is " + qs.get(i).number + ")");
                    break;
                }
            }
            for (QuestionRecord q : qs) {
                String ql = label + " q" + q.number;
                if (q.solutionText == null) reviews.add(ql + ": solution block not found");
                if (q.correctAnswer == null || q.correctAnswer.isBlank()) {
                    reviews.add(ql + ": no answer found");
                } else if ("MCQ".equals(q.type) && !q.correctAnswer.matches("[A-D]")) {
                    reviews.add(ql + ": MCQ answer is not A-D: " + q.correctAnswer);
                } else if (TimoIngestPipeline.hasUnmappedSymbol(q.correctAnswer)) {
                    reviews.add(ql + ": answer contains an unmapped symbol");
                }
                if ("MCQ".equals(q.type)) {
                    if (q.options == null || q.options.size() != 4) {
                        reviews.add(ql + ": expected 4 options, found "
                                + (q.options == null ? 0 : q.options.size()));
                    } else {
                        for (int i = 0; i < q.options.size(); i++) {
                            Option o = q.options.get(i);
                            String ol = ql + ": option " + (char) ('A' + i);
                            if (!o.valid()) reviews.add(ol + " is empty");
                            else if (o.isText() && TimoIngestPipeline.hasUnmappedSymbol(o.text())) {
                                reviews.add(ol + " contains an unmapped symbol");
                            }
                        }
                    }
                }
                if (expectImages && q.images.stream().noneMatch(i -> "SNAPSHOT".equals(i.role()))) {
                    reviews.add(ql + ": snapshot image missing");
                }
                if (q.needsReview && reviews.stream().noneMatch(s -> s.startsWith(ql + ":"))) {
                    reviews.add(ql + ": marked needs_review");
                }
            }
        }
        return new Result(structural, reviews);
    }
}

package timo.ingest;

import timo.ingest.TimoLayout.ExamRange;
import timo.ingest.TimoLayout.Round;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory repository used for JSON export and validation; optionally forwards to a real database. */
public final class CollectingRepository implements TimoIngestPipeline.ExamRepository {
    public record ImageRecord(String role, int seq, String storageKey, int width, int height, String sha256) {}

    public static final class QuestionRecord {
        public final int number;
        public final String topic;
        public final String type;
        public final String contentText;
        public final List<Option> options;
        public final String correctAnswer;
        public final String solutionText;
        public final int points;
        public final boolean needsReview;
        public final List<ImageRecord> images = new ArrayList<>();

        QuestionRecord(int number, String topic, String type, String text, List<Option> options,
                       String answer, String solution, boolean needsReview) {
            this.number = number;
            this.topic = topic;
            this.type = type;
            this.contentText = text;
            this.options = options;
            this.correctAnswer = answer;
            this.solutionText = solution;
            this.points = 4;
            this.needsReview = needsReview;
        }
    }

    public static final class ExamRecord {
        public final Round round;
        public final int examNo;
        public final String sourceFile;
        public final List<QuestionRecord> questions = new ArrayList<>();

        ExamRecord(Round round, int examNo, String sourceFile) {
            this.round = round;
            this.examNo = examNo;
            this.sourceFile = sourceFile;
        }
    }

    private final TimoIngestPipeline.ExamRepository delegate;
    private final List<ExamRecord> exams = new ArrayList<>();
    private final Map<Long, ExamRecord> examsById = new LinkedHashMap<>();
    private final Map<Long, QuestionRecord> questionsById = new LinkedHashMap<>();
    private long nextId = 1;

    public CollectingRepository() {
        this(null);
    }

    public CollectingRepository(TimoIngestPipeline.ExamRepository delegate) {
        this.delegate = delegate;
    }

    public List<ExamRecord> exams() { return exams; }

    @Override
    public long upsertExam(ExamRange e, String sourceFile) {
        long id;
        if (delegate != null) {
            id = delegate.upsertExam(e, sourceFile);
        } else {
            id = nextId++;
        }
        ExamRecord rec = new ExamRecord(e.round(), e.examNo(), sourceFile);
        exams.add(rec);
        examsById.put(id, rec);
        return id;
    }

    @Override
    public long upsertQuestion(long examId, int number, String topic, String type, String text,
                               List<Option> options, String answer, String solution, boolean needsReview) {
        long id;
        if (delegate != null) {
            id = delegate.upsertQuestion(examId, number, topic, type, text, options, answer, solution, needsReview);
        } else {
            id = nextId++;
        }
        QuestionRecord rec = new QuestionRecord(number, topic, type, text, options, answer, solution, needsReview);
        ExamRecord exam = examsById.get(examId);
        if (exam == null) throw new IllegalStateException("Unknown exam id " + examId);
        exam.questions.add(rec);
        questionsById.put(id, rec);
        return id;
    }

    @Override
    public void clearImages(long questionId) {
        if (delegate != null) delegate.clearImages(questionId);
        QuestionRecord q = questionsById.get(questionId);
        if (q != null) q.images.clear();
    }

    @Override
    public void upsertImage(long questionId, String role, int seq, String key, int w, int h, String sha256) {
        if (delegate != null) delegate.upsertImage(questionId, role, seq, key, w, h, sha256);
        QuestionRecord q = questionsById.get(questionId);
        if (q == null) throw new IllegalStateException("Unknown question id " + questionId);
        q.images.add(new ImageRecord(role, seq, key, w, h, sha256));
    }
}

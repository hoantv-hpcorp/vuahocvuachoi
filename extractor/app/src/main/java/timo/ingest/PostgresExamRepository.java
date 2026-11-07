package timo.ingest;

import timo.ingest.TimoLayout.ExamRange;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Properties;

/** PostgreSQL repository. Every write is an upsert, so the pipeline can be re-run safely. */
public final class PostgresExamRepository implements TimoIngestPipeline.ExamRepository, AutoCloseable {
    private static final int GRADE = 2;

    private final Connection conn;

    private PostgresExamRepository(Connection conn) {
        this.conn = conn;
    }

    public static PostgresExamRepository open(String url, String user, String password) throws SQLException {
        Properties props = new Properties();
        if (user != null) props.setProperty("user", user);
        if (password != null) props.setProperty("password", password);
        return new PostgresExamRepository(DriverManager.getConnection(url, props));
    }

    public void executeScript(String sql) throws SQLException {
        try (var st = conn.createStatement()) {
            for (String statement : sql.split(";")) {
                if (!statement.isBlank()) st.execute(statement);
            }
        }
    }

    @Override
    public long upsertExam(ExamRange e, String sourceFile) {
        String sql = """
                INSERT INTO timo_exam (grade, round, exam_no, source_file)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (grade, round, exam_no)
                DO UPDATE SET source_file = EXCLUDED.source_file
                RETURNING id
                """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, GRADE);
            ps.setString(2, e.round().name());
            ps.setInt(3, e.examNo());
            ps.setString(4, sourceFile);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        } catch (SQLException ex) {
            throw new RuntimeException("upsertExam failed", ex);
        }
    }

    @Override
    public long upsertQuestion(long examId, int number, String topic, String type, String text,
                               List<Option> options, String answer, String solution, boolean needsReview) {
        String sql = """
                INSERT INTO timo_question
                    (exam_id, number, topic, type, content_text, options, correct_answer, solution_text, points, needs_review)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, 4, ?)
                ON CONFLICT (exam_id, number) DO UPDATE SET
                    topic = EXCLUDED.topic,
                    type = EXCLUDED.type,
                    content_text = EXCLUDED.content_text,
                    options = EXCLUDED.options,
                    correct_answer = EXCLUDED.correct_answer,
                    solution_text = EXCLUDED.solution_text,
                    points = EXCLUDED.points,
                    needs_review = EXCLUDED.needs_review
                RETURNING id
                """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, examId);
            ps.setInt(2, number);
            ps.setString(3, topic);
            ps.setString(4, type);
            ps.setString(5, text);
            ps.setString(6, options == null ? null : Json.options(options));
            ps.setString(7, answer);
            ps.setString(8, solution);
            ps.setBoolean(9, needsReview);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        } catch (SQLException ex) {
            throw new RuntimeException("upsertQuestion failed", ex);
        }
    }

    @Override
    public void clearImages(long questionId) {
        try (PreparedStatement ps = conn.prepareStatement("DELETE FROM timo_question_image WHERE question_id = ?")) {
            ps.setLong(1, questionId);
            ps.executeUpdate();
        } catch (SQLException ex) {
            throw new RuntimeException("clearImages failed", ex);
        }
    }

    @Override
    public void upsertImage(long questionId, String role, int seq, String key, int w, int h, String sha256) {
        String sql = """
                INSERT INTO timo_question_image (question_id, role, seq, storage_key, width, height, sha256)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (question_id, role, seq) DO UPDATE SET
                    storage_key = EXCLUDED.storage_key,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    sha256 = EXCLUDED.sha256
                """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, questionId);
            ps.setString(2, role);
            ps.setInt(3, seq);
            ps.setString(4, key);
            ps.setInt(5, w);
            ps.setInt(6, h);
            ps.setString(7, sha256);
            ps.executeUpdate();
        } catch (SQLException ex) {
            throw new RuntimeException("upsertImage failed", ex);
        }
    }

    @Override
    public void close() throws SQLException {
        conn.close();
    }
}

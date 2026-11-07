package timo.ingest;

import timo.ingest.CollectingRepository.ExamRecord;
import timo.ingest.CollectingRepository.ImageRecord;
import timo.ingest.CollectingRepository.QuestionRecord;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

/** Writes the extracted dataset as JSON so the result can be inspected without a database. */
public final class DatasetJson {
    private DatasetJson() {}

    public static void write(List<ExamRecord> exams, Path file) throws IOException {
        StringBuilder b = new StringBuilder();
        b.append("{\n  \"sourceFile\": ")
                .append(Json.string(exams.isEmpty() ? null : exams.get(0).sourceFile))
                .append(",\n  \"exams\": [");
        for (int i = 0; i < exams.size(); i++) {
            ExamRecord e = exams.get(i);
            b.append(i == 0 ? "\n" : ",\n");
            b.append("    {\"round\": ").append(Json.string(e.round.name()))
                    .append(", \"examNo\": ").append(e.examNo)
                    .append(", \"sourceFile\": ").append(Json.string(e.sourceFile))
                    .append(",\n     \"questions\": [");
            List<QuestionRecord> qs = e.questions.stream().sorted(Comparator.comparingInt(q -> q.number)).toList();
            for (int j = 0; j < qs.size(); j++) {
                QuestionRecord q = qs.get(j);
                b.append(j == 0 ? "\n" : ",\n");
                b.append("       {\"number\": ").append(q.number)
                        .append(", \"topic\": ").append(Json.string(q.topic))
                        .append(", \"type\": ").append(Json.string(q.type))
                        .append(", \"contentText\": ").append(Json.string(q.contentText))
                        .append(", \"options\": ").append(Json.options(q.options))
                        .append(", \"correctAnswer\": ").append(Json.string(q.correctAnswer))
                        .append(", \"solutionText\": ").append(Json.string(q.solutionText))
                        .append(", \"points\": ").append(q.points)
                        .append(", \"needsReview\": ").append(q.needsReview)
                        .append(",\n        \"images\": [");
                for (int k = 0; k < q.images.size(); k++) {
                    ImageRecord img = q.images.get(k);
                    if (k > 0) b.append(", ");
                    b.append("{\"role\": ").append(Json.string(img.role()))
                            .append(", \"seq\": ").append(img.seq())
                            .append(", \"storageKey\": ").append(Json.string(img.storageKey()))
                            .append(", \"width\": ").append(img.width())
                            .append(", \"height\": ").append(img.height())
                            .append(", \"sha256\": ").append(Json.string(img.sha256()))
                            .append('}');
                }
                b.append("]}");
            }
            b.append("\n     ]}");
        }
        b.append("\n  ]\n}\n");
        Path parent = file.toAbsolutePath().getParent();
        if (parent != null) Files.createDirectories(parent);
        Files.writeString(file, b.toString(), StandardCharsets.UTF_8);
    }
}

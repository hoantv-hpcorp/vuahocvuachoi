package timo.ingest;

import java.util.List;

/** Minimal JSON serializer; the dataset is small and has no external JSON dependency. */
final class Json {
    private Json() {}

    static String string(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                case '\b' -> b.append("\\b");
                case '\f' -> b.append("\\f");
                default -> {
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
                }
            }
        }
        return b.append('"').toString();
    }

    static String array(List<String> values) {
        if (values == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) b.append(", ");
            b.append(string(values.get(i)));
        }
        return b.append(']').toString();
    }

    static String option(Option o) {
        if (o == null) return "null";
        StringBuilder b = new StringBuilder("{");
        if (o.isImage()) {
            b.append("\"type\": \"image\", \"storageKey\": ").append(string(o.storageKey()))
                    .append(", \"width\": ").append(o.width())
                    .append(", \"height\": ").append(o.height())
                    .append(", \"sha256\": ").append(string(o.sha256()));
        } else {
            b.append("\"type\": \"text\", \"text\": ").append(string(o.text()));
        }
        return b.append('}').toString();
    }

    static String options(List<Option> options) {
        if (options == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < options.size(); i++) {
            if (i > 0) b.append(", ");
            b.append(option(options.get(i)));
        }
        return b.append(']').toString();
    }
}

package timo.ingest;

/**
 * A multiple-choice option. Most options are text, but some questions (mostly pattern questions)
 * print the choices as figures or as symbols that have no Unicode mapping, so the pipeline stores
 * a cropped image instead.
 */
public record Option(String type, String text, String storageKey, Integer width, Integer height, String sha256) {
    public static Option text(String text) {
        return new Option("text", text, null, null, null, null);
    }

    public static Option image(String storageKey, int width, int height, String sha256) {
        return new Option("image", null, storageKey, width, height, sha256);
    }

    public boolean isImage() { return "image".equals(type); }

    public boolean isText() { return "text".equals(type); }

    public boolean valid() {
        return isImage()
                ? storageKey != null && !storageKey.isBlank()
                : isText() && text != null && !text.isBlank();
    }
}

type Option = { position: number; text: string | null };

/** Hide the printed choice block only when it agrees with the separately stored options. */
export function questionTextWithoutChoices(content: string, options: Option[]): string {
  if (options.length < 2 || options.some((option, i) => option.position !== i + 1)) return content;
  const markers = [...content.matchAll(/(?<!\S)([A-Z])\./g)];
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  for (let start = markers.length - options.length; start >= 0; start--) {
    const group = markers.slice(start, start + options.length);
    if (!group.every((marker, i) => marker[1] === String.fromCharCode(65 + i))) continue;
    if (start + options.length !== markers.length) continue;
    const matches = options.every((option, i) => {
      if (!option.text?.trim()) return true;
      const from = group[i].index! + group[i][0].length;
      const to = i + 1 < group.length ? group[i + 1].index! : content.length;
      return normalize(content.slice(from, to)) === normalize(option.text);
    });
    if (matches) return content.slice(0, group[0].index!).trimEnd();
  }
  return content;
}


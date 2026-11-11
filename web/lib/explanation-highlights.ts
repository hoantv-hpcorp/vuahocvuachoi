// Only literal <mark> tags are interpreted. Everything else stays text.
export function parseHighlights(input: string): { text: string; highlighted: boolean }[] {
  return input.split(/(<mark>[^<>]+<\/mark>)/gi).filter(Boolean).map(part => {
    const match = /^<mark>([^<>]+)<\/mark>$/i.exec(part);
    return { text: match ? match[1] : part, highlighted: !!match };
  });
}

export function plainExplanation(input: string): string {
  return parseHighlights(input).map(part => part.text).join("");
}

// Older suggestions, and occasionally model responses, use a vocabulary list
// without markup. Only mark list entries that actually occur in the question.
export function highlightVocabularyList(content: string, question: string): string {
  if (parseHighlights(content).some(part => part.highlighted)) return content;
  return content.replace(/^(\s*[-•]\s*)([A-Za-z]+(?:[ '-][A-Za-z]+)*)(\s*:)/gm, (whole, prefix: string, phrase: string, suffix: string) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i").test(question)
      ? `${prefix}<mark>${phrase}</mark>${suffix}` : whole;
  });
}

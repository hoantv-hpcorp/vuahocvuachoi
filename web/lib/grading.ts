export function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function gradeAnswer(rawAnswer: string | null | undefined, correctAnswer: string): boolean {
  if (rawAnswer == null || rawAnswer.trim() === "") return false;
  return normalizeAnswer(rawAnswer) === normalizeAnswer(correctAnswer);
}

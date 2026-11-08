export function examRoundLabel(round: string, grade?: number): string {
  switch (round.toUpperCase()) {
    case "PRELIMINARY":
    case "LOẠI": return "Loại";
    case "QUỐC GIA": return "Quốc Gia";
    case "HEAT": return grade === 2 ? "Quốc Gia" : round;
    default: return round;
  }
}

export function examRoundOrder(round: string, grade?: number): number {
  const label = examRoundLabel(round, grade);
  return label === "Loại" ? 0 : label === "Quốc Gia" ? 1 : 2;
}

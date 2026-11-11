import { Fragment } from "react";
import { parseHighlights } from "@/lib/explanation-highlights";

export function HighlightedExplanation({ text, phrases }: { text: string; phrases: string[] }) {
  return <>{parseHighlights(text).map((part, index) => {
    const color = phrases.findIndex(phrase => phrase.toLowerCase() === part.text.toLowerCase());
    return part.highlighted && color >= 0 ? <mark className={`word-highlight word-highlight-${color % 6}`} key={index}>{part.text}</mark> : <Fragment key={index}>{part.text}</Fragment>;
  })}</>;
}

export function HighlightedQuestion({ text, phrases }: { text: string; phrases: string[] }) {
  if (!phrases.length) return <>{text}</>;
  const escaped = [...phrases].sort((a, b) => b.length - a.length).map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`((?<![A-Za-z])(?:${escaped.join("|")})(?![A-Za-z]))`, "gi"));
  return <>{parts.map((part, index) => {
    const color = phrases.findIndex(phrase => phrase.toLowerCase() === part.toLowerCase());
    return color >= 0 ? <mark className={`word-highlight word-highlight-${color % 6}`} key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

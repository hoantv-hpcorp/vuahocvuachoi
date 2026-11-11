import { test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { highlightVocabularyList, parseHighlights, plainExplanation } from "./explanation-highlights";

test("extracts marked words and leaves the speech text readable", () => {
  const input = "Từ <mark>square</mark> nghĩa là hình vuông.";
  deepStrictEqual(parseHighlights(input), [{ text: "Từ ", highlighted: false }, { text: "square", highlighted: true }, { text: " nghĩa là hình vuông.", highlighted: false }]);
  strictEqual(plainExplanation(input), "Từ square nghĩa là hình vuông.");
});

test("does not interpret arbitrary HTML as highlight markup", () => {
  deepStrictEqual(parseHighlights('<img src=x onerror=alert(1)>'), [{ text: '<img src=x onerror=alert(1)>', highlighted: false }]);
});

test("highlights saved plain-text vocabulary only when it matches the question", () => {
  const original = "What is the number?";
  const explanation = "Con ơi:\n- What: cái gì\n- is: là\n- number: số\n- cat: mèo\n- he: anh ấy";
  const formatted = highlightVocabularyList(explanation, original);
  strictEqual(formatted, "Con ơi:\n- <mark>What</mark>: cái gì\n- <mark>is</mark>: là\n- <mark>number</mark>: số\n- cat: mèo\n- he: anh ấy");
  strictEqual(plainExplanation(formatted), explanation);
});

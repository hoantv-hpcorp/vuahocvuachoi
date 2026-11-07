import { test } from "node:test";
import { strict as assert } from "node:assert";
import { questionTextWithoutChoices } from "./question-text";

const choices = ["24", "25", "26", "23"].map((text, i) => ({ position: i + 1, text }));
test("removes matching printed choices across lines", () => {
  assert.equal(questionTextWithoutChoices("Find the number?\nA. 24 B. 25\nC. 26 D. 23\n", choices), "Find the number?");
});
test("preserves question text and unmatched choices", () => {
  assert.equal(questionTextWithoutChoices("Find B.\nA. 24 B. 25 C. 26 D. 99", choices), "Find B.\nA. 24 B. 25 C. 26 D. 99");
  assert.equal(questionTextWithoutChoices("What is A. and B.?", choices), "What is A. and B.?");
});
test("supports image choices whose printed markers have no text", () => {
  assert.equal(questionTextWithoutChoices("Which shape?\nA.  B.  C.  D.", choices.map(c => ({ ...c, text: null }))), "Which shape?");
});

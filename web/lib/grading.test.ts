import assert from "node:assert/strict";
import test from "node:test";
import { gradeAnswer, normalizeAnswer } from "./grading";

test("normalizes surrounding whitespace and case", () => {
  assert.equal(normalizeAnswer("  Even  "), "even");
  assert.equal(gradeAnswer(" even ", "Even"), true);
});

test("does not change internal expression formatting", () => {
  assert.equal(gradeAnswer("7×4−5×3=13", "7 × 4 – 5 × 3 = 13"), false);
});

test("treats empty and missing answers as wrong", () => {
  assert.equal(gradeAnswer("   ", "A"), false);
  assert.equal(gradeAnswer(null, "A"), false);
});

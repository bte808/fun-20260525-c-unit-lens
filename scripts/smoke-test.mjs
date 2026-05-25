import {
  analyzeFormula,
  balancedSample,
  exportMarkdown,
  extractFormulaIdentifiers,
  mismatchSample
} from "../src/unit-engine.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const balanced = analyzeFormula(balancedSample.formula, balancedSample.variables);
assert(balanced.verdict.key === "balanced", "sample force formula should be balanced");
assert(balanced.issues.length === 0, "balanced sample should have no issues");
assert(balanced.lhs.dimension, "balanced sample should produce dimensions");

const mismatch = analyzeFormula(mismatchSample.formula, mismatchSample.variables);
assert(mismatch.verdict.key === "mismatch", "energy missing v^2 should be a mismatch");
assert(
  mismatch.issues.some((issue) => issue.title === "Formula sides do not balance"),
  "mismatch sample should flag side balance"
);

const addition = analyzeFormula("x = v * t + a", [
  { name: "x", unit: "m", note: "position" },
  { name: "v", unit: "m/s", note: "velocity" },
  { name: "t", unit: "s", note: "time" },
  { name: "a", unit: "m/s^2", note: "acceleration" }
]);
assert(
  addition.issues.some((issue) => issue.title === "Addition/subtraction mixes dimensions"),
  "plus and minus terms should be checked for matching dimensions"
);

const trig = analyzeFormula("y = sin(x)", [
  { name: "y", unit: "1", note: "ratio" },
  { name: "x", unit: "m", note: "length" }
]);
assert(
  trig.issues.some((issue) => issue.title === "Function input has units"),
  "trig functions should require dimensionless inputs"
);

const identifiers = extractFormulaIdentifiers("period = 2 * sqrt(length / g)");
assert(identifiers.includes("period"), "identifier extraction should include lhs");
assert(identifiers.includes("length"), "identifier extraction should include rhs variables");
assert(!identifiers.includes("sqrt"), "identifier extraction should exclude supported functions");

const report = exportMarkdown(balanced);
assert(report.includes("Generated locally"), "report should include local-use warning");
assert(report.includes("Formula:"), "report should include formula");
assert(report.includes("Study prompts"), "report should include prompts");

const invalidCharacter = analyzeFormula("F = m * a·t", balancedSample.variables);
assert(
  invalidCharacter.issues.some((issue) => issue.title === "Parse error"),
  "invalid characters should become reportable issues instead of thrown exceptions"
);

console.log("Smoke tests passed: parsing, dimension balance, mixed additions, function checks, and Markdown export.");

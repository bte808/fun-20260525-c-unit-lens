import {
  analyzeFormula,
  balancedSample,
  exportMarkdown,
  extractFormulaIdentifiers,
  formulaPresets,
  makeReportFileName,
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

const implicitFormula = analyzeFormula("F = m a", [
  { name: "F", unit: "N", note: "net force" },
  { name: "m", unit: "kg", note: "mass" },
  { name: "a", unit: "m/s^2", note: "acceleration" }
]);
assert(implicitFormula.verdict.key === "balanced", "adjacent variables should be treated as multiplication");

const implicitUnit = analyzeFormula("F = m * a", [
  { name: "F", unit: "kg m / s^2", note: "force in base units" },
  { name: "m", unit: "kg", note: "mass" },
  { name: "a", unit: "m/s^2", note: "acceleration" }
]);
assert(implicitUnit.verdict.key === "balanced", "adjacent unit factors should be treated as multiplication");

const powNegativeExponent = analyzeFormula("conductance = pow(R, -1)", [
  { name: "conductance", unit: "ohm^-1", note: "inverse resistance" },
  { name: "R", unit: "ohm", note: "resistance" }
]);
assert(powNegativeExponent.verdict.key === "balanced", "pow should accept negative numeric exponents");

const powWithUnits = analyzeFormula("y = pow(x, t)", [
  { name: "y", unit: "1", note: "output" },
  { name: "x", unit: "m", note: "length" },
  { name: "t", unit: "s", note: "time" }
]);
assert(
  powWithUnits.issues.some((issue) => issue.title === "pow exponent has units"),
  "pow exponents should be dimensionless"
);

const unknownUnit = analyzeFormula("F = m * a", [
  { name: "F", unit: "newton", note: "unsupported alias" },
  { name: "m", unit: "kg", note: "mass" },
  { name: "a", unit: "m/s^2", note: "acceleration" }
]);
assert(
  unknownUnit.prompts.some((prompt) => prompt.includes("compound forms such as kg*m/s^2")),
  "unknown units should generate a concrete repair prompt"
);

const presetKeys = new Set(formulaPresets.map((preset) => preset.key));
assert(presetKeys.size === formulaPresets.length, "formula preset keys should be unique");
assert(presetKeys.has("simple-pendulum"), "formula presets should include a pendulum starter");
formulaPresets.forEach((preset) => {
  const analysis = analyzeFormula(preset.sample.formula, preset.sample.variables);
  assert(analysis.equation, `${preset.key} should parse as one equation`);
  assert(
    !analysis.issues.some((issue) => issue.title === "Parse error"),
    `${preset.key} should not produce parse errors`
  );
  assert(preset.sample.variables.length >= 2, `${preset.key} should include a ready variable table`);
});

const pendulumPreset = formulaPresets.find((preset) => preset.key === "simple-pendulum");
assert(
  analyzeFormula(pendulumPreset.sample.formula, pendulumPreset.sample.variables).verdict.key === "balanced",
  "simple pendulum preset should be dimensionally balanced"
);

const mismatchPreset = formulaPresets.find((preset) => preset.key === "energy-mismatch");
assert(
  analyzeFormula(mismatchPreset.sample.formula, mismatchPreset.sample.variables).verdict.key === "mismatch",
  "energy mismatch preset should still teach a failing case"
);

const identifiers = extractFormulaIdentifiers("period = 2 * sqrt(length / g)");
assert(identifiers.includes("period"), "identifier extraction should include lhs");
assert(identifiers.includes("length"), "identifier extraction should include rhs variables");
assert(!identifiers.includes("sqrt"), "identifier extraction should exclude supported functions");

const report = exportMarkdown(balanced);
assert(report.includes("Generated locally"), "report should include local-use warning");
assert(report.includes("Formula:"), "report should include formula");
assert(report.includes("Study prompts"), "report should include prompts");
assert(report.includes("Summary:"), "report should include a verdict summary");
assert(report.includes("Issue count:"), "report should include an issue count");
assert(report.includes("mass +1"), "report should include base-dimension explanations");

const reportFileName = makeReportFileName(balanced, new Date("2026-05-25T00:00:00.000Z"));
assert(
  reportFileName === "unit-lens-2026-05-25-f.md",
  "report filename should be deterministic and safe for downloads"
);

const invalidCharacter = analyzeFormula("F = m * a·t", balancedSample.variables);
assert(
  invalidCharacter.issues.some((issue) => issue.title === "Parse error"),
  "invalid characters should become reportable issues instead of thrown exceptions"
);

console.log(
  "Smoke tests passed: parsing, implicit multiplication, exponent guards, dimension balance, function checks, and Markdown export."
);

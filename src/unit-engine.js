const DIMENSION_KEYS = ["M", "L", "T", "I", "K", "mol", "cd"];

const DIMENSION_NAMES = {
  M: "mass",
  L: "length",
  T: "time",
  I: "electric current",
  K: "temperature",
  mol: "amount",
  cd: "luminous intensity"
};

const BASE_UNITS = {
  M: "kg",
  L: "m",
  T: "s",
  I: "A",
  K: "K",
  mol: "mol",
  cd: "cd"
};

const ZERO = Object.freeze([0, 0, 0, 0, 0, 0, 0]);
const TOLERANCE = 1e-9;

const UNIT_DEFINITIONS = {
  "1": ZERO,
  rad: ZERO,
  deg: ZERO,
  percent: ZERO,
  pct: ZERO,

  kg: [1, 0, 0, 0, 0, 0, 0],
  g: [1, 0, 0, 0, 0, 0, 0],
  mg: [1, 0, 0, 0, 0, 0, 0],
  lb: [1, 0, 0, 0, 0, 0, 0],

  m: [0, 1, 0, 0, 0, 0, 0],
  cm: [0, 1, 0, 0, 0, 0, 0],
  mm: [0, 1, 0, 0, 0, 0, 0],
  km: [0, 1, 0, 0, 0, 0, 0],
  in: [0, 1, 0, 0, 0, 0, 0],
  ft: [0, 1, 0, 0, 0, 0, 0],

  s: [0, 0, 1, 0, 0, 0, 0],
  sec: [0, 0, 1, 0, 0, 0, 0],
  ms: [0, 0, 1, 0, 0, 0, 0],
  min: [0, 0, 1, 0, 0, 0, 0],
  h: [0, 0, 1, 0, 0, 0, 0],

  A: [0, 0, 0, 1, 0, 0, 0],
  K: [0, 0, 0, 0, 1, 0, 0],
  mol: [0, 0, 0, 0, 0, 1, 0],
  cd: [0, 0, 0, 0, 0, 0, 1],

  Hz: [0, 0, -1, 0, 0, 0, 0],
  N: [1, 1, -2, 0, 0, 0, 0],
  J: [1, 2, -2, 0, 0, 0, 0],
  W: [1, 2, -3, 0, 0, 0, 0],
  Pa: [1, -1, -2, 0, 0, 0, 0],
  C: [0, 0, 1, 1, 0, 0, 0],
  V: [1, 2, -3, -1, 0, 0, 0],
  ohm: [1, 2, -3, -2, 0, 0, 0],
  F: [-1, -2, 4, 2, 0, 0, 0],
  L: [0, 3, 0, 0, 0, 0, 0],
  mL: [0, 3, 0, 0, 0, 0, 0]
};

export const supportedUnits = Object.keys(UNIT_DEFINITIONS).sort((a, b) =>
  a.localeCompare(b)
);

export const balancedSample = {
  formula: "F = m * a",
  variables: [
    { name: "F", unit: "N", note: "net force" },
    { name: "m", unit: "kg", note: "mass" },
    { name: "a", unit: "m/s^2", note: "acceleration" }
  ]
};

export const mismatchSample = {
  formula: "E = m * v",
  variables: [
    { name: "E", unit: "J", note: "kinetic energy target" },
    { name: "m", unit: "kg", note: "mass" },
    { name: "v", unit: "m/s", note: "speed" }
  ]
};

export function analyzeFormula(formulaInput, variableRowsInput) {
  const formula = String(formulaInput || "").trim();
  const issues = [];
  const variableRows = normalizeVariableRows(variableRowsInput);
  const variables = buildVariableMap(variableRows, issues);
  const equation = splitEquation(formula, issues);

  let lhs = null;
  let rhs = null;
  if (equation) {
    lhs = parseFormulaExpression(equation.left, variables, issues, "left side");
    rhs = parseFormulaExpression(equation.right, variables, issues, "right side");
    if (lhs.dimension && rhs.dimension && !sameDimension(lhs.dimension, rhs.dimension)) {
      issues.push({
        level: "error",
        title: "Formula sides do not balance",
        detail: `${equation.left} is ${formatDimension(lhs.dimension)}, but ${equation.right} is ${formatDimension(rhs.dimension)}.`
      });
    }
  }

  const variableList = Array.from(variables.values());
  const verdict = makeVerdict(issues, lhs, rhs);
  const steps = makeSteps(equation, lhs, rhs, variableList);
  const prompts = makePrompts(verdict, equation, lhs, rhs, variableList, issues);

  return {
    formula,
    equation,
    variables: variableList,
    lhs,
    rhs,
    issues,
    verdict,
    steps,
    prompts
  };
}

export function exportMarkdown(analysis) {
  const errorCount = analysis.issues.filter((issue) => issue.level === "error").length;
  const noteCount = analysis.issues.length - errorCount;
  const lines = [
    "# Unit Lens formula check",
    "",
    "Generated locally as a dimensional-analysis study aid. It is not a proof, a source, or a replacement for a textbook.",
    "",
    `Formula: \`${analysis.formula || "(blank)"}\``,
    "",
    `Verdict: ${analysis.verdict.label}`,
    `Summary: ${analysis.verdict.summary}`,
    `Issue count: ${formatCount(errorCount, "error")}, ${formatCount(noteCount, "note")}`,
    "",
    "## Sides",
    "",
    `- Left: ${analysis.lhs ? analysis.lhs.text : "(none)"} -> ${
      analysis.lhs ? formatDimension(analysis.lhs.dimension) : "unknown"
    } (${analysis.lhs ? explainDimension(analysis.lhs.dimension) : "Unknown dimension"})`,
    `- Right: ${analysis.rhs ? analysis.rhs.text : "(none)"} -> ${
      analysis.rhs ? formatDimension(analysis.rhs.dimension) : "unknown"
    } (${analysis.rhs ? explainDimension(analysis.rhs.dimension) : "Unknown dimension"})`,
    "",
    "## Variables",
    ""
  ];

  if (analysis.variables.length) {
    analysis.variables.forEach((variable) => {
      lines.push(
        `- ${variable.name}: ${variable.unit || "1"} -> ${formatDimension(variable.dimension)} (${explainDimension(
          variable.dimension
        )})${
          variable.note ? ` (${variable.note})` : ""
        }`
      );
    });
  } else {
    lines.push("- No variables entered.");
  }

  lines.push("", "## Issues", "");
  if (analysis.issues.length) {
    analysis.issues.forEach((issue) => {
      lines.push(`- [${issue.level}] ${issue.title}: ${issue.detail}`);
    });
  } else {
    lines.push("- No dimension issues found.");
  }

  lines.push("", "## Study prompts", "");
  analysis.prompts.forEach((prompt) => lines.push(`- ${prompt}`));

  return `${lines.join("\n")}\n`;
}

export function makeReportFileName(analysis, now = new Date()) {
  const date = Number.isNaN(now.getTime()) ? "today" : now.toISOString().slice(0, 10);
  const formulaStem = slugifyFormula(analysis.equation?.left || analysis.formula || "formula");
  return `unit-lens-${date}-${formulaStem || "formula"}.md`;
}

export function extractFormulaIdentifiers(formulaInput) {
  const formula = String(formulaInput || "");
  const identifiers = new Set();
  const functions = new Set(["sqrt", "square", "sin", "cos", "tan", "log", "ln", "exp", "abs", "pow"]);
  for (const match of formula.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) {
    if (!functions.has(match[0])) {
      identifiers.add(match[0]);
    }
  }
  return Array.from(identifiers);
}

export function formatDimension(dimension) {
  if (!dimension) {
    return "unknown";
  }
  const pieces = dimension
    .map((value, index) => ({ value, key: DIMENSION_KEYS[index] }))
    .filter((item) => Math.abs(item.value) > TOLERANCE)
    .map((item) => `${BASE_UNITS[item.key]}${formatPower(item.value)}`);
  return pieces.length ? pieces.join(" ") : "dimensionless";
}

export function explainDimension(dimension) {
  if (!dimension) {
    return "Unknown dimension";
  }
  const pieces = dimension
    .map((value, index) => ({ value, key: DIMENSION_KEYS[index] }))
    .filter((item) => Math.abs(item.value) > TOLERANCE)
    .map((item) => `${DIMENSION_NAMES[item.key]} ${formatSigned(item.value)}`);
  return pieces.length ? pieces.join(", ") : "No base dimensions";
}

function normalizeVariableRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        name: String(row.name || "").trim(),
        unit: String(row.unit || "1").trim() || "1",
        note: String(row.note || "").trim()
      }))
    : [];
}

function buildVariableMap(rows, issues) {
  const variables = new Map();
  rows.forEach((row) => {
    if (!row.name) {
      return;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.name)) {
      issues.push({
        level: "error",
        title: "Variable name is not parseable",
        detail: `${row.name} should use letters, numbers, and underscores, starting with a letter or underscore.`
      });
      return;
    }
    if (variables.has(row.name)) {
      issues.push({
        level: "error",
        title: "Duplicate variable",
        detail: `${row.name} appears more than once.`
      });
      return;
    }
    const parsedUnit = parseUnitExpression(row.unit, issues, `unit for ${row.name}`);
    variables.set(row.name, {
      ...row,
      dimension: parsedUnit.dimension,
      dimensionText: formatDimension(parsedUnit.dimension)
    });
  });
  return variables;
}

function splitEquation(formula, issues) {
  if (!formula) {
    issues.push({
      level: "error",
      title: "Formula is blank",
      detail: "Enter one equation with exactly one equals sign."
    });
    return null;
  }
  const parts = formula.split("=");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    issues.push({
      level: "error",
      title: "Formula must be one equation",
      detail: "Use a form like F = m * a or period = 2 * sqrt(length / g)."
    });
    return null;
  }
  return { left: parts[0].trim(), right: parts[1].trim() };
}

function parseUnitExpression(source, issues, context) {
  try {
    const parser = new DimensionParser(source, {
      context,
      issues,
      resolveIdentifier(name) {
        if (Object.prototype.hasOwnProperty.call(UNIT_DEFINITIONS, name)) {
          return {
            dimension: cloneDimension(UNIT_DEFINITIONS[name]),
            text: name,
            value: null
          };
        }
        issues.push({
          level: "error",
          title: "Unknown unit",
          detail: `${name} is not in the local unit list while parsing ${context}.`
        });
        return { dimension: null, text: name, value: null };
      }
    });
    return parser.parse();
  } catch (error) {
    issues.push({
      level: "error",
      title: "Parse error",
      detail: `${error.message} while parsing ${context}.`
    });
    return { dimension: null, text: source, value: null };
  }
}

function parseFormulaExpression(source, variables, issues, context) {
  try {
    const parser = new DimensionParser(source, {
      context,
      issues,
      resolveIdentifier(name) {
        const variable = variables.get(name);
        if (!variable) {
          issues.push({
            level: "error",
            title: "Unknown variable",
            detail: `${name} appears in the ${context}, but it is not listed in the variable table.`
          });
          return { dimension: null, text: name, value: null };
        }
        return {
          dimension: cloneDimension(variable.dimension),
          text: name,
          value: null
        };
      }
    });
    return parser.parse();
  } catch (error) {
    issues.push({
      level: "error",
      title: "Parse error",
      detail: `${error.message} while parsing ${context}.`
    });
    return { dimension: null, text: source, value: null };
  }
}

class DimensionParser {
  constructor(source, options) {
    this.source = String(source || "").trim();
    this.tokens = tokenize(this.source);
    this.position = 0;
    this.context = options.context;
    this.issues = options.issues;
    this.resolveIdentifier = options.resolveIdentifier;
  }

  parse() {
    if (!this.tokens.length) {
      this.pushIssue("error", "Expression is blank", `Nothing was entered for ${this.context}.`);
      return this.node(null, "", null);
    }
    const result = this.parseAdditive();
    if (!this.isAtEnd()) {
      this.pushIssue(
        "error",
        "Unexpected token",
        `${this.peek().value} could not be parsed in ${this.context}.`
      );
    }
    return {
      ...result,
      text: this.source
    };
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.match("+") || this.match("-")) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      if (left.dimension && right.dimension && !sameDimension(left.dimension, right.dimension)) {
        this.pushIssue(
          "error",
          "Addition/subtraction mixes dimensions",
          `${left.text} is ${formatDimension(left.dimension)}, but ${right.text} is ${formatDimension(right.dimension)} in ${this.context}.`
        );
      }
      left = this.node(mergeAddDimension(left.dimension, right.dimension), `${left.text} ${operator} ${right.text}`, null);
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parsePower();
    while (true) {
      let operator = null;
      if (this.match("*") || this.match("/")) {
        operator = this.previous().value;
      } else if (this.shouldImplicitMultiply()) {
        operator = "*";
      } else {
        break;
      }
      const right = this.parsePower();
      const dimension =
        operator === "*"
          ? combineDimensions(left.dimension, right.dimension, addDimensions)
          : combineDimensions(left.dimension, right.dimension, subtractDimensions);
      left = this.node(dimension, `${left.text} ${operator} ${right.text}`, combineNumeric(left, right, operator));
    }
    return left;
  }

  parsePower() {
    let base = this.parseUnary();
    if (this.match("^")) {
      const exponent = this.parsePower();
      if (exponent.dimension && !sameDimension(exponent.dimension, ZERO)) {
        this.pushIssue(
          "error",
          "Exponent has units",
          `${exponent.text} should be dimensionless before it can be used as an exponent in ${this.context}.`
        );
      }
      if (typeof exponent.value !== "number" || !Number.isFinite(exponent.value)) {
        this.pushIssue(
          "error",
          "Exponent is not numeric",
          `${exponent.text} must be a numeric constant in ${this.context}.`
        );
        base = this.node(null, `${base.text} ^ ${exponent.text}`, null);
      } else {
        base = this.node(scaleDimension(base.dimension, exponent.value), `${base.text} ^ ${exponent.text}`, null);
      }
    }
    return base;
  }

  parseUnary() {
    if (this.match("+")) {
      return this.parseUnary();
    }
    if (this.match("-")) {
      const operand = this.parseUnary();
      return this.node(operand.dimension, `-${operand.text}`, typeof operand.value === "number" ? -operand.value : null);
    }
    return this.parseAtom();
  }

  parseAtom() {
    if (this.matchType("number")) {
      const token = this.previous();
      return this.node(cloneDimension(ZERO), token.value, Number(token.value));
    }

    if (this.matchType("identifier")) {
      const name = this.previous().value;
      if (this.match("(")) {
        return this.parseFunction(name);
      }
      return this.resolveIdentifier(name);
    }

    if (this.match("(")) {
      const expression = this.parseAdditive();
      this.consume(")", "Closing parenthesis is missing", `Add ) in ${this.context}.`);
      return this.node(expression.dimension, `(${expression.text})`, expression.value);
    }

    const token = this.peek();
    this.pushIssue(
      "error",
      "Unexpected expression",
      `${token ? token.value : "end of input"} could not start an expression in ${this.context}.`
    );
    if (token) {
      this.advance();
    }
    return this.node(null, token ? token.value : "", null);
  }

  parseFunction(name) {
    const first = this.parseAdditive();
    let second = null;
    if (this.match(",")) {
      second = this.parseAdditive();
    }
    this.consume(")", "Closing parenthesis is missing", `Add ) after ${name}(...) in ${this.context}.`);

    if (name === "sqrt") {
      return this.node(scaleDimension(first.dimension, 0.5), `${name}(${first.text})`, null);
    }
    if (name === "square") {
      return this.node(scaleDimension(first.dimension, 2), `${name}(${first.text})`, null);
    }
    if (name === "abs") {
      return this.node(first.dimension, `${name}(${first.text})`, null);
    }
    if (name === "pow") {
      if (!second) {
        this.pushIssue("error", "pow needs two arguments", `Use pow(base, exponent) in ${this.context}.`);
        return this.node(null, `${name}(${first.text})`, null);
      }
      if (second.dimension && !sameDimension(second.dimension, ZERO)) {
        this.pushIssue("error", "pow exponent has units", `${second.text} should be dimensionless in ${this.context}.`);
      }
      if (typeof second.value !== "number" || !Number.isFinite(second.value)) {
        this.pushIssue("error", "pow exponent is not numeric", `${second.text} should be a numeric constant in ${this.context}.`);
        return this.node(null, `${name}(${first.text}, ${second.text})`, null);
      }
      return this.node(scaleDimension(first.dimension, second.value), `${name}(${first.text}, ${second.text})`, null);
    }

    if (["sin", "cos", "tan", "log", "ln", "exp"].includes(name)) {
      if (first.dimension && !sameDimension(first.dimension, ZERO)) {
        this.pushIssue(
          "error",
          "Function input has units",
          `${name}(...) expects a dimensionless input, but ${first.text} is ${formatDimension(first.dimension)}.`
        );
      }
      return this.node(cloneDimension(ZERO), `${name}(${first.text})`, null);
    }

    this.pushIssue("error", "Unknown function", `${name}(...) is not supported in ${this.context}.`);
    return this.node(null, `${name}(${first.text})`, null);
  }

  node(dimension, text, value) {
    return { dimension, text, value };
  }

  pushIssue(level, title, detail) {
    this.issues.push({ level, title, detail });
  }

  shouldImplicitMultiply() {
    const token = this.peek();
    return Boolean(token) && (token.type === "number" || token.type === "identifier" || token.value === "(");
  }

  match(value) {
    if (this.peek()?.value === value) {
      this.advance();
      return true;
    }
    return false;
  }

  matchType(type) {
    if (this.peek()?.type === type) {
      this.advance();
      return true;
    }
    return false;
  }

  consume(value, title, detail) {
    if (this.match(value)) {
      return true;
    }
    this.pushIssue("error", title, detail);
    return false;
  }

  advance() {
    if (!this.isAtEnd()) {
      this.position += 1;
    }
    return this.previous();
  }

  previous() {
    return this.tokens[this.position - 1];
  }

  peek() {
    return this.tokens[this.position];
  }

  isAtEnd() {
    return this.position >= this.tokens.length;
  }
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) {
        throw new Error(`Invalid number near ${source.slice(index)}`);
      }
      tokens.push({ type: "number", value: match[0] });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }
    if ("+-*/^(),".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    throw new Error(`Unsupported character "${char}" in ${source}`);
  }
  return tokens;
}

function makeVerdict(issues, lhs, rhs) {
  const errorCount = issues.filter((issue) => issue.level === "error").length;
  if (!lhs || !rhs || errorCount) {
    const sideMismatch = issues.some((issue) => issue.title === "Formula sides do not balance");
    return {
      key: sideMismatch ? "mismatch" : "review",
      label: sideMismatch ? "Dimension mismatch" : "Needs review",
      tone: sideMismatch ? "risk" : "watch",
      summary: sideMismatch
        ? "The left and right sides reduce to different base dimensions."
        : "The formula or unit table needs a small fix before the check is meaningful."
    };
  }
  return {
    key: "balanced",
    label: "Dimensionally balanced",
    tone: "good",
    summary: "Both sides reduce to the same base dimensions."
  };
}

function makeSteps(equation, lhs, rhs, variables) {
  const steps = [];
  variables.forEach((variable) => {
    steps.push({
      title: `${variable.name} = ${variable.unit || "1"}`,
      detail: `${formatDimension(variable.dimension)}; ${explainDimension(variable.dimension)}${
        variable.note ? `; ${variable.note}` : ""
      }`
    });
  });
  if (equation && lhs && rhs) {
    steps.push({
      title: `Left side: ${equation.left}`,
      detail: formatDimension(lhs.dimension)
    });
    steps.push({
      title: `Right side: ${equation.right}`,
      detail: formatDimension(rhs.dimension)
    });
  }
  return steps;
}

function makePrompts(verdict, equation, lhs, rhs, variables, issues) {
  const prompts = [];
  if (verdict.key === "balanced") {
    prompts.push(`Explain why both sides collapse to ${formatDimension(lhs.dimension)} before trusting the formula.`);
    prompts.push("Try changing one variable unit to see which base dimension stops cancelling.");
  } else if (verdict.key === "mismatch") {
    prompts.push(`Find the missing or extra base dimension between ${formatDimension(lhs.dimension)} and ${formatDimension(rhs.dimension)}.`);
    prompts.push("Check whether a variable should be squared, divided by time, or treated as dimensionless.");
  } else {
    prompts.push("Fix unknown variables or units first; a dimension check is only useful after the ledger is complete.");
  }

  if (equation && /[+-]/.test(equation.right)) {
    prompts.push("For every plus or minus sign, say why the terms describe the same kind of quantity.");
  }

  if (variables.some((variable) => sameDimension(variable.dimension, ZERO))) {
    prompts.push("Mark which entries are intentionally dimensionless, such as angles in radians or pure ratios.");
  }

  if (issues.some((issue) => issue.title.includes("Function"))) {
    prompts.push("Check whether the function input is a pure number before applying trigonometric or logarithmic functions.");
  }

  if (issues.some((issue) => issue.title === "Unknown variable")) {
    prompts.push("Match every symbol in the formula to exactly one variable-table row before reading the verdict.");
  }

  if (issues.some((issue) => issue.title === "Unknown unit")) {
    prompts.push("Rewrite unsupported unit names using the local unit list or compound forms such as kg*m/s^2.");
  }

  if (issues.some((issue) => issue.title === "Addition/subtraction mixes dimensions")) {
    prompts.push("Trace each term around every plus or minus sign and verify that the terms reduce to the same dimensions.");
  }

  if (
    issues.some((issue) =>
      [
        "Exponent has units",
        "Exponent is not numeric",
        "pow exponent has units",
        "pow exponent is not numeric"
      ].includes(issue.title)
    )
  ) {
    prompts.push("Keep exponents dimensionless numeric constants, such as ^2, ^-1, or pow(x, 0.5).");
  }

  return Array.from(new Set(prompts));
}

function combineNumeric(left, right, operator) {
  if (typeof left.value !== "number" || typeof right.value !== "number") {
    return null;
  }
  if (operator === "*") {
    return left.value * right.value;
  }
  if (operator === "/") {
    return left.value / right.value;
  }
  return null;
}

function combineDimensions(left, right, reducer) {
  if (!left || !right) {
    return null;
  }
  return reducer(left, right);
}

function mergeAddDimension(left, right) {
  if (!left || !right) {
    return left || right || null;
  }
  return cloneDimension(left);
}

function sameDimension(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.every((value, index) => Math.abs(value - right[index]) < TOLERANCE);
}

function addDimensions(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtractDimensions(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scaleDimension(dimension, multiplier) {
  if (!dimension) {
    return null;
  }
  return dimension.map((value) => normalizePower(value * multiplier));
}

function cloneDimension(dimension) {
  return dimension ? dimension.map((value) => value) : null;
}

function normalizePower(value) {
  return Math.abs(value) < TOLERANCE ? 0 : value;
}

function formatPower(value) {
  const normalized = normalizePower(value);
  if (Math.abs(normalized - 1) < TOLERANCE) {
    return "";
  }
  return `^${formatNumber(normalized)}`;
}

function formatSigned(value) {
  return value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(4))).replace(/\.0+$/, "");
}

function formatCount(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function slugifyFormula(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

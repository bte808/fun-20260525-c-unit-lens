import {
  analyzeFormula,
  balancedSample,
  exportMarkdown,
  extractFormulaIdentifiers,
  formulaPresets,
  formatDimension,
  makeReportFileName,
  mismatchSample,
  supportedUnits
} from "./unit-engine.js";

const refs = {
  headerStatus: document.querySelector("#header-status"),
  formulaInput: document.querySelector("#formula-input"),
  templateSelect: document.querySelector("#formula-template"),
  variableTable: document.querySelector("#variable-table"),
  verdict: document.querySelector("#verdict"),
  dimensionGrid: document.querySelector("#dimension-grid"),
  issueList: document.querySelector("#issue-list"),
  stepList: document.querySelector("#step-list"),
  promptList: document.querySelector("#prompt-list"),
  markdownOutput: document.querySelector("#markdown-output"),
  unitOptions: document.querySelector("#unit-options"),
  copyReport: document.querySelector("#copy-report"),
  downloadReport: document.querySelector("#download-report")
};

let state = structuredClone(balancedSample);
let activePresetKey = "force";
let lastAnalysis = null;
const presetByKey = new Map(formulaPresets.map((preset) => [preset.key, preset]));

supportedUnits.forEach((unit) => {
  const option = document.createElement("option");
  option.value = unit;
  refs.unitOptions.append(option);
});

formulaPresets.forEach((preset) => {
  const option = document.createElement("option");
  option.value = preset.key;
  option.textContent = `${preset.label} - ${preset.sample.formula}`;
  refs.templateSelect.append(option);
});

document.querySelector("#load-balanced").addEventListener("click", () => loadSample(balancedSample, "force"));
document.querySelector("#load-mismatch").addEventListener("click", () => loadSample(mismatchSample, "energy-mismatch"));
document.querySelector("#add-variable").addEventListener("click", () => {
  markCustom();
  state.variables.push({ name: "", unit: "1", note: "" });
  render();
});
document.querySelector("#sync-vars").addEventListener("click", syncVariablesFromFormula);
refs.templateSelect.addEventListener("change", (event) => {
  const preset = presetByKey.get(event.target.value);
  if (preset) {
    loadSample(preset.sample, preset.key);
  }
});
refs.formulaInput.addEventListener("input", () => {
  state.formula = refs.formulaInput.value;
  markCustom();
  renderResults();
});
refs.variableTable.addEventListener("input", (event) => {
  const row = event.target.closest("[data-index]");
  if (!row) {
    return;
  }
  const index = Number(row.dataset.index);
  const field = event.target.dataset.field;
  if (!field) {
    return;
  }
  state.variables[index][field] = event.target.value;
  markCustom();
  renderResults();
});
refs.variableTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) {
    return;
  }
  state.variables.splice(Number(button.dataset.remove), 1);
  markCustom();
  render();
});
refs.copyReport.addEventListener("click", copyReport);
refs.downloadReport.addEventListener("click", downloadReport);

render();

function loadSample(sample, presetKey = "") {
  state = structuredClone(sample);
  activePresetKey = presetKey;
  render();
}

function syncVariablesFromFormula() {
  markCustom();
  const ids = extractFormulaIdentifiers(state.formula);
  const current = new Map(state.variables.filter((row) => row.name).map((row) => [row.name, row]));
  ids.forEach((id) => {
    if (!current.has(id)) {
      state.variables.push({ name: id, unit: "1", note: "" });
    }
  });
  state.variables = state.variables.filter((row) => !row.name || ids.includes(row.name));
  render();
}

function render() {
  refs.formulaInput.value = state.formula;
  refs.templateSelect.value = activePresetKey;
  renderVariables();
  renderResults();
}

function markCustom() {
  activePresetKey = "";
  refs.templateSelect.value = "";
}

function renderVariables() {
  refs.variableTable.replaceChildren();

  const header = document.createElement("div");
  header.className = "var-row var-header";
  ["Variable", "Unit", "Meaning", ""].forEach((label) => {
    const cell = document.createElement("div");
    cell.textContent = label;
    header.append(cell);
  });
  refs.variableTable.append(header);

  state.variables.forEach((variable, index) => {
    const row = document.createElement("div");
    row.className = "var-row";
    row.dataset.index = String(index);

    row.append(
      makeInput("name", variable.name, "F", null, index),
      makeInput("unit", variable.unit, "N", "unit-options", index),
      makeInput("note", variable.note, "net force", null, index),
      makeRemoveButton(index)
    );
    refs.variableTable.append(row);
  });
}

function makeInput(field, value, placeholder, list, index) {
  const input = document.createElement("input");
  input.dataset.field = field;
  input.value = value;
  input.placeholder = placeholder;
  input.setAttribute("aria-label", `${field} for variable ${index + 1}`);
  input.spellcheck = false;
  input.autocomplete = "off";
  if (list) {
    input.setAttribute("list", list);
  }
  return input;
}

function makeRemoveButton(index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.dataset.remove = String(index);
  button.setAttribute("aria-label", "Remove variable");
  button.title = "Remove variable";
  button.textContent = "x";
  return button;
}

function renderResults() {
  const analysis = analyzeFormula(state.formula, state.variables);
  lastAnalysis = analysis;
  const markdown = exportMarkdown(analysis);

  refs.headerStatus.textContent = analysis.verdict.label;
  refs.headerStatus.dataset.tone = analysis.verdict.tone;
  refs.verdict.replaceChildren(makeVerdict(analysis));
  renderDimensionGrid(analysis);
  renderIssues(analysis);
  renderSteps(analysis);
  renderPrompts(analysis);
  refs.markdownOutput.value = markdown;
}

function makeVerdict(analysis) {
  const box = document.createElement("div");
  box.className = "verdict-box";
  box.dataset.tone = analysis.verdict.tone;

  const label = document.createElement("strong");
  label.textContent = analysis.verdict.label;
  const summary = document.createElement("span");
  summary.textContent = analysis.verdict.summary;
  box.append(label, summary);
  return box;
}

function renderDimensionGrid(analysis) {
  refs.dimensionGrid.replaceChildren();
  const sides = [
    ["Left side", analysis.equation?.left || "", analysis.lhs?.dimension],
    ["Right side", analysis.equation?.right || "", analysis.rhs?.dimension]
  ];
  sides.forEach(([label, expression, dimension]) => {
    const item = document.createElement("div");
    item.className = "dimension-card";
    const small = document.createElement("span");
    small.textContent = label;
    const expressionNode = document.createElement("strong");
    expressionNode.textContent = expression || "(blank)";
    const dimensionNode = document.createElement("code");
    dimensionNode.textContent = formatDimension(dimension);
    item.append(small, expressionNode, dimensionNode);
    refs.dimensionGrid.append(item);
  });
}

function renderIssues(analysis) {
  refs.issueList.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = "Checks";
  refs.issueList.append(title);

  if (!analysis.issues.length) {
    refs.issueList.append(makeListItem("No dimension issues found.", "good"));
    return;
  }

  analysis.issues.forEach((issue) => {
    refs.issueList.append(makeListItem(`${issue.title}: ${issue.detail}`, issue.level === "error" ? "risk" : "watch"));
  });
}

function renderSteps(analysis) {
  refs.stepList.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = "Ledger";
  refs.stepList.append(title);

  analysis.steps.forEach((step) => {
    const item = document.createElement("div");
    item.className = "step-card";
    const stepTitle = document.createElement("strong");
    stepTitle.textContent = step.title;
    const detail = document.createElement("span");
    detail.textContent = step.detail;
    item.append(stepTitle, detail);
    refs.stepList.append(item);
  });
}

function renderPrompts(analysis) {
  refs.promptList.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = "Study prompts";
  refs.promptList.append(title);

  analysis.prompts.forEach((prompt) => refs.promptList.append(makeListItem(prompt, "quiet")));
}

function makeListItem(text, tone) {
  const item = document.createElement("div");
  item.className = "list-item";
  item.dataset.tone = tone;
  item.textContent = text;
  return item;
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(refs.markdownOutput.value);
    refs.copyReport.textContent = "Copied";
    setTimeout(() => {
      refs.copyReport.textContent = "Copy report";
    }, 1200);
  } catch {
    refs.markdownOutput.focus();
    refs.markdownOutput.select();
    refs.copyReport.textContent = "Selected";
    setTimeout(() => {
      refs.copyReport.textContent = "Copy report";
    }, 1200);
  }
}

function downloadReport() {
  const analysis = lastAnalysis || analyzeFormula(state.formula, state.variables);
  const blob = new Blob([refs.markdownOutput.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = makeReportFileName(analysis);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  refs.downloadReport.textContent = "Downloaded";
  setTimeout(() => {
    refs.downloadReport.textContent = "Download report";
  }, 1200);
}

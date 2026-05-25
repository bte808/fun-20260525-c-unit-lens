# Unit Lens

Unit Lens is a small local study tool for dimensional analysis. Paste a formula, list each variable with a unit expression, and it reduces both sides to base dimensions so a learner can catch missing squares, wrong divisions, or mixed terms before trusting the algebra.

It runs as a static HTML/CSS/JS app. There are no accounts, keys, uploads, trackers, or external runtime services.

## What it can do

- Check one equation such as `F = m * a`, `E = m * v^2`, or `period = 2 * sqrt(length / g)`.
- Parse units and compound unit expressions including `N`, `J`, `Pa`, `m/s`, `m/s^2`, and `kg*m/s^2`.
- Flag left/right dimension mismatches.
- Flag plus or minus terms that mix different dimensions.
- Flag trigonometric and logarithmic functions when their inputs still have units.
- Generate a Markdown ledger with the formula, variable table, issues, study prompts, and a deterministic `.md` download.

## Good study and research use cases

- Physics, engineering, chemistry, or data-analysis review where formulas are easy to memorize but hard to sanity-check.
- Lab notebook prep before substituting numbers into a derived equation.
- Teaching assistants checking whether a student's symbolic expression has the right shape before discussing numeric answers.
- Reading a paper or textbook derivation and turning the formula into a small "dimension ledger" for later review.

## Why it is useful

Dimensional analysis is a fast way to notice structural mistakes without claiming a formula is true. Unit Lens makes that habit explicit: each variable gets a unit, both sides get a base-dimension fingerprint, and the export gives a compact record to paste into study notes.

This tool is intentionally not authoritative. Passing the check does not prove a formula, a derivation, a model, or a scientific conclusion. Failing the check only points to a dimension problem to inspect. Use textbooks, original papers, course materials, and instructor feedback for final interpretation.

## Why it is interesting

Recent learning tools often make structure visible: component graphs, checklists, and local linting-style feedback help learners see relationships instead of only reading finished answers. Unit Lens applies that pattern to formula study by turning a symbolic equation into a readable unit ledger.

## Inspiration

Browsed on 2026-05-25 for recent and public examples of study tools and formula/unit helpers. This project borrows only the general idea of making structure visible; all code, UI, wording, and examples here are original.

- Hacker News Algolia result for a recent Show HN study tool, "DAG-based Kanji learning through components": https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=DAG-based%20Kanji%20learning%20through%20components&sort=byDate&type=story
- Online dimensional-analysis calculator examples such as CalcBE: https://calcbe.com/en/calculators/dimensional-analysis/
- Dimensional-analysis learning material from The Physics Classroom: https://www.physicsclassroom.com/class/1DKin/Lesson-1/Dimensional-Analysis

## Run locally

```bash
npm install
npm run start
```

Then open http://localhost:5178/.

Because the app has no dependencies, opening `index.html` directly also works in most browsers.

## Development checks

```bash
npm run check
```

This runs JavaScript syntax checks plus a smoke test for the formula parser, implicit multiplication, balanced sample, mismatch sample, mixed-addition guard, exponent guards, function guard, identifier extraction, Markdown export, and report filename generation.

## Core usage

1. Enter one formula with exactly one equals sign.
2. Add every variable in the table.
3. Give each variable a unit expression.
4. Read the verdict, side dimensions, issue list, and study prompts.
5. Copy or download the Markdown report into notes or a lab log.

## Supported syntax

- Operators: `+`, `-`, `*`, `/`, `^`, parentheses, and adjacent factors such as `2m`, `m a`, or `m(length + width)` for implicit multiplication.
- Functions: `sqrt(x)`, `square(x)`, `abs(x)`, `pow(x, n)`, `sin(x)`, `cos(x)`, `tan(x)`, `log(x)`, `ln(x)`, `exp(x)`.
- Unit expressions: `m`, `kg`, `s`, `N`, `J`, `W`, `Pa`, `Hz`, `C`, `V`, `ohm`, `L`, `m/s`, `m/s^2`, `kg*m/s^2`, and `1` for dimensionless values.

## Later extensions

- Add optional SI prefix normalization and scale checks.
- Add formula templates for common course topics.
- Add a printable worksheet view.
- Add import/export JSON for class examples.

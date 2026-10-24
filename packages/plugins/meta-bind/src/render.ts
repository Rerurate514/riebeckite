import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { evaluateMetaBindExpression, readMetaBindTarget } from "./evaluate.js";
import type { MetaBindInput, MetaBindModel, MetaBindValue } from "./types.js";

export function renderMetaBind(
  model: MetaBindModel,
  frontmatter: Readonly<Record<string, unknown>> = {},
): string {
  return model.kind === "input"
    ? renderInput(model, frontmatter)
    : renderView(model, frontmatter);
}

function renderInput(
  input: MetaBindInput,
  frontmatter: Readonly<Record<string, unknown>>,
): string {
  const current = readMetaBindTarget(frontmatter, input.target);
  const value =
    current === null
      ? (argument(input, "defaultValue") ?? defaultValue(input))
      : current;
  const target = input.target.path.join(".");
  const toggleValues =
    input.input === "toggle"
      ? ` data-meta-bind-on-value="${escapeHtmlAttribute(JSON.stringify(argument(input, "onValue") ?? true))}" data-meta-bind-off-value="${escapeHtmlAttribute(JSON.stringify(argument(input, "offValue") ?? false))}"`
      : "";
  const attributes = `data-meta-bind="input" data-meta-bind-target="${escapeHtmlAttribute(target)}" data-meta-bind-value="${escapeHtmlAttribute(JSON.stringify(value))}"${toggleValues}`;
  return `<span class="rb-meta-bind rb-meta-bind--input" ${attributes}>${control(input, value)}</span>`;
}

function renderView(
  model: Extract<MetaBindModel, { kind: "view" }>,
  frontmatter: Readonly<Record<string, unknown>>,
): string {
  const value = evaluateMetaBindExpression(model.expression, frontmatter);
  const source = escapeHtmlAttribute(model.source);
  const values = Object.fromEntries(
    model.dependencies.map((target) => [
      target.path.join("."),
      readMetaBindTarget(frontmatter, target),
    ]),
  );
  return `<output class="rb-meta-bind rb-meta-bind--view" data-meta-bind="view" data-meta-bind-source="${source}" data-meta-bind-values="${escapeHtmlAttribute(JSON.stringify(values))}">${escapeHtml(displayValue(value))}</output>`;
}

function control(input: MetaBindInput, value: MetaBindValue): string {
  const valueAttribute = `value="${escapeHtmlAttribute(displayValue(value))}"`;
  const placeholder = argument(input, "placeholder");
  const placeholderAttribute =
    typeof placeholder === "string"
      ? ` placeholder="${escapeHtmlAttribute(placeholder)}"`
      : "";
  if (input.input === "toggle") {
    const onValue = argument(input, "onValue") ?? true;
    return `<input class="rb-meta-bind__control" type="checkbox"${value === onValue ? " checked" : ""}>`;
  }
  if (input.input === "select") {
    return `<select class="rb-meta-bind__control">${input.options.map((option) => `<option value="${escapeHtmlAttribute(JSON.stringify(option.value))}"${option.value === value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`;
  }
  if (input.input === "slider") {
    return `<input class="rb-meta-bind__control" type="range" ${valueAttribute}${numericAttribute(input, "minValue", "min")}${numericAttribute(input, "maxValue", "max")}${numericAttribute(input, "stepSize", "step")}>`;
  }
  const type = input.input === "number" ? "number" : "text";
  return `<input class="rb-meta-bind__control" type="${type}" ${valueAttribute}${placeholderAttribute}>`;
}

function numericAttribute(
  input: MetaBindInput,
  name: string,
  attribute: string,
): string {
  const value = argument(input, name);
  return typeof value === "number" ? ` ${attribute}="${value}"` : "";
}

function argument(
  input: MetaBindInput,
  name: string,
): MetaBindValue | undefined {
  return input.arguments[name]?.[0];
}

function defaultValue(input: MetaBindInput): MetaBindValue {
  if (input.input === "toggle") return argument(input, "offValue") ?? false;
  if (input.input === "select") return input.options[0]?.value ?? "";
  return "";
}

export function displayValue(value: MetaBindValue): string {
  return value === null ? "" : String(value);
}

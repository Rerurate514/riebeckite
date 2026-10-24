import type { ClientInitializerContext } from "@riebeckite/core";
import { evaluateMetaBindExpression } from "./evaluate.js";
import { parseMetaBind } from "./parse.js";
import { displayValue } from "./render.js";
import type { MetaBindValue } from "./types.js";

const MAX_TEXT_LENGTH = 4_096;
const targetPattern = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const forbiddenTargetParts = new Set(["__proto__", "constructor", "prototype"]);

export function initMetaBind(
  context: ClientInitializerContext<ParentNode, undefined>,
): void {
  const controls = Array.from(
    context.root.querySelectorAll<HTMLElement>('[data-meta-bind="input"]'),
  );
  if (controls.length === 0) return;
  const state: Record<string, unknown> = {};
  for (const view of context.root.querySelectorAll<HTMLOutputElement>(
    '[data-meta-bind="view"]',
  )) {
    for (const [target, value] of Object.entries(
      readValues(view.dataset.metaBindValues),
    )) {
      if (isValidTarget(target)) write(state, target, value);
    }
  }
  for (const control of controls) {
    const target = control.dataset.metaBindTarget;
    if (!target || !isValidTarget(target)) continue;
    write(state, target, readValue(control));
  }
  const update = () => {
    for (const view of context.root.querySelectorAll<HTMLOutputElement>(
      '[data-meta-bind="view"]',
    )) {
      const parsed = parseMetaBind(
        `VIEW[${view.dataset.metaBindSource ?? ""}]`,
      );
      if (parsed.ok && parsed.value.kind === "view")
        view.textContent = displayValue(
          evaluateMetaBindExpression(parsed.value.expression, state),
        );
    }
    for (const control of controls) syncControl(control, state);
  };
  for (const control of controls) {
    const input = control.querySelector<HTMLInputElement | HTMLSelectElement>(
      ".rb-meta-bind__control",
    );
    if (!input) continue;
    context.scope.on(
      input,
      input instanceof HTMLSelectElement || input.type === "checkbox"
        ? "change"
        : "input",
      () => {
        const target = control.dataset.metaBindTarget;
        if (!target || !isValidTarget(target)) return;
        write(state, target, inputValue(input, control));
        update();
      },
    );
  }
  update();
}

function readValue(control: HTMLElement): MetaBindValue {
  try {
    const value = JSON.parse(control.dataset.metaBindValue ?? "null");
    return isValue(value) ? value : null;
  } catch {
    return null;
  }
}

function inputValue(
  input: HTMLInputElement | HTMLSelectElement,
  control: HTMLElement,
): MetaBindValue {
  if (input instanceof HTMLSelectElement) return readOptionValue(input.value);
  if (input.type === "checkbox")
    return input.checked
      ? readArgument(control, "onValue", true)
      : readArgument(control, "offValue", false);
  const value = input.value.slice(0, MAX_TEXT_LENGTH);
  return input.type === "number" || input.type === "range"
    ? Number.isFinite(Number(value))
      ? Number(value)
      : null
    : value;
}

function syncControl(
  control: HTMLElement,
  state: Readonly<Record<string, unknown>>,
): void {
  const target = control.dataset.metaBindTarget;
  const input = control.querySelector<HTMLInputElement | HTMLSelectElement>(
    ".rb-meta-bind__control",
  );
  if (!target || !input) return;
  const value = read(state, target);
  if (input instanceof HTMLSelectElement) input.value = JSON.stringify(value);
  else if (input.type === "checkbox")
    input.checked = value === readArgument(control, "onValue", true);
  else input.value = displayValue(value);
}

function readOptionValue(value: string): MetaBindValue {
  try {
    const parsed = JSON.parse(value);
    return isValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readValues(value: string | undefined): Record<string, MetaBindValue> {
  if (!value || value.length > MAX_TEXT_LENGTH) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, MetaBindValue] =>
        isValue(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function readArgument(
  control: HTMLElement,
  name: string,
  fallback: MetaBindValue,
): MetaBindValue {
  const value =
    control.dataset[`metaBind${name[0].toUpperCase()}${name.slice(1)}`];
  return value === undefined ? fallback : readOptionValue(value);
}

function write(
  state: Record<string, unknown>,
  target: string,
  value: MetaBindValue,
): void {
  const parts = target.split(".");
  let current = state;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (next !== null && typeof next === "object" && !Array.isArray(next)) {
      current = next as Record<string, unknown>;
    } else {
      const nested: Record<string, unknown> = {};
      current[part] = nested;
      current = nested;
    }
  }
  current[parts[parts.length - 1]] = value;
}

function read(
  state: Readonly<Record<string, unknown>>,
  target: string,
): MetaBindValue {
  let value: unknown = state;
  for (const part of target.split(".")) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, part)
    )
      return null;
    value = (value as Record<string, unknown>)[part];
  }
  return isValue(value) ? value : null;
}

function isValue(value: unknown): value is MetaBindValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isValidTarget(target: string): boolean {
  return (
    targetPattern.test(target) &&
    !target.split(".").some((part) => forbiddenTargetParts.has(part))
  );
}

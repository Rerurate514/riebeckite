import { createMainRuntime } from "@riebeckite/runtime/client";
import { evaluateExpression, formatExpressionValue } from "./src/expression.js";

export type CalculatorRuntimeInput = {
  readonly expression: string;
};

type CalculatorMount = {
  readonly output: HTMLOutputElement;
  readonly live: HTMLElement | null;
};

const mounts = new WeakMap<Element, CalculatorMount>();

export function createCalculatorRuntime() {
  return createMainRuntime<CalculatorRuntimeInput, number>({
    id: "calculator",
    capabilities: ["dom"],
    start({ root }) {
      const element = requireElement(root);
      const output = element.querySelector<HTMLOutputElement>(
        "[data-calculator-output]",
      );
      if (!output) {
        throw new Error("The calculator runtime output is missing.");
      }
      mounts.set(element, {
        output,
        live: element.querySelector<HTMLElement>("[data-runtime-live]"),
      });
    },
    invoke(input, { root }) {
      const element = requireElement(root);
      const mount = mounts.get(element);
      if (!mount) {
        throw new Error("The calculator runtime is not mounted.");
      }
      const result = evaluateExpression(input.expression);
      if (result.ok === false) throw new Error(result.reason);
      mount.output.textContent = formatExpressionValue(result.value);
      if (mount.live) mount.live.hidden = false;
      return result.value;
    },
    stop({ root }) {
      if (!(root instanceof Element)) return;
      const mount = mounts.get(root);
      if (!mount) return;
      mount.output.textContent = "";
      if (mount.live) mount.live.hidden = true;
      mounts.delete(root);
    },
  });
}

function requireElement(root: unknown): Element {
  if (!(root instanceof Element)) {
    throw new Error("The calculator runtime requires an element root.");
  }
  return root;
}

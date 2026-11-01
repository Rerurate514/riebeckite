import {
  createClientEntry,
  createRuntimeEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkCalculator } from "./src/remark.js";

export {
  type ExpressionResult,
  evaluateExpression,
  formatExpressionValue,
} from "./src/expression.js";
export { remarkCalculator } from "./src/remark.js";
export {
  DEFAULT_CALCULATOR_CLASS,
  DEFAULT_CALCULATOR_LANGUAGE,
  renderCalculator,
} from "./src/render.js";

export function calculator() {
  return definePlugin({
    name: "calculator",
    processedContentCache: {
      version: "calculator-v1",
      dependencyMode: "none",
    },
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkCalculator);
    },
    assets: [
      createStyleAsset("calculator", "@riebeckite/plugin-calculator/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        "calculator",
        "@riebeckite/plugin-calculator/client",
        "initCalculator",
        undefined,
        "page",
        "context",
        "[data-calculator]",
        [
          createRuntimeEntry(
            "calculator",
            "@riebeckite/plugin-calculator/client-runtime",
            "createCalculatorRuntime",
          ),
        ],
      ),
    ],
  });
}

import type { ClientInitializerContext } from "@riebeckite/core/client";
import { createRuntimeFallback } from "@riebeckite/runtime/client";

export async function initCalculator(
  context: ClientInitializerContext<Element, unknown>,
): Promise<void> {
  const calculators =
    context.root.querySelectorAll<HTMLElement>("[data-calculator]");
  await Promise.all(
    [...calculators].map(async (element) => {
      const expression = element.dataset.calculatorExpression ?? "";
      const fallback = createRuntimeFallback(element);
      fallback.showLoading();
      try {
        const runtime = context.runtimes?.create<number>("calculator", {
          root: element,
        });
        if (!runtime) {
          throw new Error("The calculator runtime is not available.");
        }
        await runtime.mount();
        await runtime.invoke({ expression });
        fallback.showReady();
      } catch (error) {
        fallback.showError(error);
      }
    }),
  );
}

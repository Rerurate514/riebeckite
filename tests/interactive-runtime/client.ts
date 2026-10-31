import { ClientLifecycle } from "../../packages/core/client.js";
import {
  type ClientRuntime,
  createClientRuntimeHost,
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
} from "../../packages/runtime/client.js";
import { startSpaNavigation } from "../../packages/spa/index.js";

type TestWindow = Window & {
  __runtimeTest?: {
    instances: ClientRuntime<number>[];
    errors: string[];
    clicks: number;
    unmountPage(): Promise<void>;
  };
};

const registry = new InteractiveRuntimeRegistry();
registry.register(
  defineInteractiveRuntime<{ value: number }, number>({
    id: "dom",
    kind: "main",
    capabilities: ["dom"],
    create: ({ root, signal }) => {
      let output: HTMLElement | undefined;
      const onClick = () => {
        const test = testWindow().__runtimeTest;
        if (test) test.clicks += 1;
      };
      window.addEventListener("click", onClick, { signal });
      return {
        start() {
          if (!(root instanceof Element)) {
            throw new Error("The DOM runtime requires an element root.");
          }
          output = document.createElement("p");
          output.dataset.runtimeOutput = "";
          output.textContent = "runtime ready";
          root.append(output);
        },
        invoke(input) {
          if (!output) throw new Error("The DOM runtime is not mounted.");
          output.textContent = String(input.value * 2);
          return input.value * 2;
        },
        stop() {
          window.removeEventListener("click", onClick);
          output?.remove();
          output = undefined;
        },
      };
    },
  }),
);

const lifecycle = new ClientLifecycle({
  onError(error, context) {
    testWindow().__runtimeTest?.errors.push(
      `${context.phase}: ${String(error)}`,
    );
  },
});

function testWindow(): TestWindow {
  return window as TestWindow;
}

async function mountPage(root: Element): Promise<void> {
  const host = createClientRuntimeHost({ registry, root });
  await lifecycle.mount({
    scope: "page",
    name: "runtime",
    root,
    config: undefined,
    runtimes: host,
    initialize: async (context) => {
      const runtime = context.runtimes?.create<number>("dom");
      if (!runtime)
        throw new Error("The lifecycle did not provide a runtime host.");
      testWindow().__runtimeTest?.instances.push(runtime);
      await runtime.mount();
      await runtime.invoke({ value: 2 });
    },
  });
}

testWindow().__runtimeTest = {
  instances: [],
  errors: [],
  clicks: 0,
  unmountPage: () => lifecycle.unmount("page"),
};

const main = document.querySelector("#main-content");
if (main) void mountPage(main);

startSpaNavigation({
  onBeforePageCommit: () => lifecycle.unmount("page"),
  onPageCommit: async ({ root, signal }) => {
    if (signal.aborted || !root.isConnected) return;
    await mountPage(root);
  },
});

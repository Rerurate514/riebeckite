import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser } from "puppeteer";

let browser: Browser | null = null;

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => {
  await browser?.close();
});

test("client rendering preserves Mermaid labels and removes unsafe SVG", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const bundle = await build({
    entryPoints: [path.join(packageRoot, "client.ts")],
    bundle: true,
    format: "iife",
    globalName: "MermaidClient",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  const page = await browser.newPage();
  try {
    await page.setContent(`
      <div class="rr-mermaid" data-mermaid="pending" data-mermaid-source="flowchart TD; A[Hello world] --> B[Goodbye]">
        <div class="rr-mermaid__canvas"></div>
      </div>
    `);
    await page.addScriptTag({ content: bundle.outputFiles?.[0]?.text });
    const result = await page.evaluate(async () => {
      const client = (
        window as {
          MermaidClient?: {
            initMermaidDiagrams(context: {
              config: {
                mermaid: {
                  initialize(config: unknown): void;
                  render(id: string, source: string): Promise<{ svg: string }>;
                };
              };
            }): Promise<void>;
          };
        }
      ).MermaidClient;
      if (!client) throw new Error("missing MermaidClient");
      const mermaid = {
        initialize() {},
        async render() {
          return {
            svg: '<svg onload="globalThis.pwned=true"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">Hello&nbsp;world</div></foreignObject><script>globalThis.pwned=true</script><a href="javascript:globalThis.pwned=true"><text>bad</text></a></svg>',
          };
        },
      };
      await client.initMermaidDiagrams({ config: { mermaid } });
      const diagram = document.querySelector<HTMLElement>(".rr-mermaid");
      return {
        pwned: (globalThis as { pwned?: boolean }).pwned === true,
        status: diagram?.dataset.mermaid,
        label: diagram?.querySelector("foreignObject")?.textContent,
        script: diagram?.querySelector("script") !== null,
        onload: diagram?.querySelector("svg")?.hasAttribute("onload"),
        href: diagram?.querySelector("a")?.hasAttribute("href"),
      };
    });
    assert.deepEqual(result, {
      pwned: false,
      status: "rendered",
      label: "Hello world",
      script: false,
      onload: false,
      href: false,
    });
  } finally {
    await page.close();
  }
});

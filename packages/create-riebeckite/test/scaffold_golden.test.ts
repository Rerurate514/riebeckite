import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  type ScaffoldSiteOptions,
  scaffoldRiebeckiteSite,
} from "../src/scaffold/index.js";
import { assertGoldenDirectory } from "./support/golden_directory.js";

const goldenRoot = fileURLToPath(
  new URL("./__golden__/scaffold/", import.meta.url),
);

type GoldenScenario = {
  readonly name: string;
  readonly scaffold: Omit<ScaffoldSiteOptions, "targetDirectory">;
};

const SCENARIOS: readonly GoldenScenario[] = [
  { name: "empty", scaffold: { preset: "empty" } },
  { name: "minimal", scaffold: { preset: "minimal" } },
  { name: "starter", scaffold: { preset: "starter" } },
  { name: "showcase", scaffold: { preset: "showcase" } },
  {
    name: "showcase-ja",
    scaffold: { preset: "showcase", site: { locale: "ja_JP" } },
  },
  {
    name: "deploy-github-actions",
    scaffold: {
      preset: "minimal",
      deployment: { type: "github-actions", content: { type: "local" } },
    },
  },
  {
    name: "deploy-cloudflare-workers",
    scaffold: { preset: "minimal", deployment: { type: "cloudflare-workers" } },
  },
  {
    name: "deploy-external-content",
    scaffold: {
      preset: "minimal",
      deployment: {
        type: "github-actions",
        content: {
          type: "external",
          contentRepository: "octo-org/notes",
          siteRepository: "octo-org/site",
        },
      },
    },
  },
];

for (const scenario of SCENARIOS) {
  test(`scaffold golden: ${scenario.name}`, async () => {
    await withTemporaryDirectory(async (root) => {
      const targetDirectory = path.join(root, scenario.name);
      await scaffoldRiebeckiteSite({ targetDirectory, ...scenario.scaffold });
      assertGoldenDirectory(
        targetDirectory,
        path.join(goldenRoot, scenario.name),
        `scaffold scenario ${scenario.name}`,
      );
    });
  });
}

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-golden-"),
  );
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

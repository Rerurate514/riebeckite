import { publishingMetadata } from "./package_metadata_publishing.mjs";

export function expectedFixedPackageMetadata(directory) {
  if (directory === "packages/cli") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "bin", "dist"],
      scripts: {
        build:
          "esbuild index.ts --bundle --splitting --platform=node --format=esm --minify --main-fields=module,main --banner:js=\"import{createRequire as __createRequire}from'node:module';const require=__createRequire(import.meta.url);\" --external:esbuild --external:vite --external:create-riebeckite --alias:@riebeckite/core/cli=../core/cli.ts --alias:@riebeckite/core=../core/index.ts --alias:@riebeckite/diagnostics=../diagnostics/index.ts --alias:@riebeckite/honox=../integrations/honox/index.ts --alias:@riebeckite/node=../node/index.ts --outdir=dist --entry-names=cli --chunk-names=chunks/[name]-[hash]",
        prepack: "node ../../scripts/copy_license.mjs && pnpm run build",
      },
    };
  }

  if (directory === "packages/core") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/node") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/graph") {
    return {
      ...publishingMetadata(directory, ["./style.css"]),
      files: ["LICENSE", "README.md", "README_ja.md", "dist", "style.css"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        benchmark: "node --import tsx benchmark/run.ts",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/diagram") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/diagnostics") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/git-history") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/og-image") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs && node copy_fonts.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (
    directory === "packages/preview" ||
    directory === "packages/spa" ||
    directory === "packages/runtime"
  ) {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/create-riebeckite") {
    return {
      ...publishingMetadata(directory, false),
      files: [
        "LICENSE",
        "README.md",
        "README_ja.md",
        "bin",
        "dist",
        "templates",
      ],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/ui") {
    return {
      ...publishingMetadata(directory, [
        "./drawer-client.ts",
        "./src/drawer/client.ts",
        "./dist/drawer-client.js",
        "./styles/drawer.css",
        "./styles/loading.css",
      ]),
      files: ["LICENSE", "README.md", "README_ja.md", "dist", "styles"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts*"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/integrations/analytics-cloudflare") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "migrations", "dist"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        test: 'pnpm exec tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/integrations/webmention-cloudflare") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "migrations", "dist"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/integrations/honox") {
    return {
      ...publishingMetadata(directory, ["./style.css"]),
      files: ["LICENSE", "README.md", "README_ja.md", "dist", "style.css"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        test: 'node --max-old-space-size=4096 --import tsx --test --test-concurrency=1 "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/dev-inspector") {
    return {
      ...publishingMetadata(directory, false),
      files: [
        "LICENSE",
        "BRIDGE.md",
        "BRIDGE_ja.md",
        "README.md",
        "README_ja.md",
        "dist",
      ],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/test") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: 'node --import tsx --test "test/*.test.ts"',
        prepack: "pnpm run build",
      },
    };
  }
  return undefined;
}

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

export function run(
  command: string,
  args: readonly string[],
  cwd: string,
): number {
  const started = performance.now();
  const result =
    process.platform === "win32" && command === "npm"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], {
          cwd,
          encoding: "utf8",
        })
      : spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? result.error?.message ?? ""}`,
    );
  }
  return performance.now() - started;
}

export function configure(siteDir: string, mode: Mode): void {
  const configPath = path.join(siteDir, "riebeckite.config.ts");
  const config = fs.readFileSync(configPath, "utf8");
  const spa =
    mode === "off"
      ? ""
      : `  spa: { prefetch: ${mode === "hover" ? '"hover"' : "false"} },\n`;
  fs.writeFileSync(configPath, config.replace("  spa: {},\n", spa));
}

export function coldBuild(siteDir: string): number {
  fs.rmSync(path.join(siteDir, "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(siteDir, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  return run(
    process.execPath,
    [
      path.join(
        siteDir,
        "node_modules",
        "@riebeckite",
        "cli",
        "bin",
        "riebeckite.mjs",
      ),
      "build",
    ],
    path.join(siteDir, "app"),
  );
}

export function summary(values: readonly number[]): Summary {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const median =
    ordered.length % 2 === 0
      ? (ordered[middle - 1] + ordered[middle]) / 2
      : ordered[middle];
  return {
    median,
    minimum: ordered[0],
    maximum: ordered.at(-1) ?? 0,
    spread: (ordered.at(-1) ?? 0) - ordered[0],
  };
}

export function contentType(file: string): string {
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/html";
}

export function bundles(dist: string): {
  raw: number;
  gzip: number;
  brotli: number;
} {
  const files = fs
    .readdirSync(path.join(dist, "static"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.endsWith(".js"));
  return files.reduce(
    (total, entry) => {
      const contents = fs.readFileSync(path.join(dist, "static", entry));
      return {
        raw: total.raw + contents.length,
        gzip: total.gzip + gzipSync(contents).length,
        brotli: total.brotli + brotliCompressSync(contents).length,
      };
    },
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

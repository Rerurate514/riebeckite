import { spawn } from "node:child_process";
import { collectChanges, finalizeRelease } from "./changelog.mjs";
import {
  checkArtifactCoverage,
  writeArtifactLedger,
} from "./release_artifacts.mjs";
import { ReleaseError, repositoryRoot, runStep } from "./release_core.mjs";

export function spawnBuffered(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const shell =
      process.platform === "win32" && (command === "pnpm" || command === "npm");

    const child = shell
      ? spawn([command, ...args].join(" "), {
          cwd,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: options.env ?? process.env,
        })
      : spawn(command, args, {
          cwd,
          stdio: ["ignore", "pipe", "pipe"],
          env: options.env ?? process.env,
        });

    let stdout = "";
    let stderr = "";
    let settled = false;

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    const timeout =
      options.timeout === undefined
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            child.kill();

            reject(
              new ReleaseError(
                `${options.label ?? command} timed out after ${Math.round(
                  options.timeout / 1000,
                )}s.`,
              ),
            );
          }, options.timeout);

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      reject(new ReleaseError(`Failed to run ${command}: ${error.message}`));
    });

    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      if (signal) {
        reject(new ReleaseError(`${command} terminated by signal ${signal}.`));

        return;
      }

      resolve({
        status: status ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

export function spawnInteractive(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const shell =
      process.platform === "win32" && (command === "pnpm" || command === "npm");

    const child = shell
      ? spawn([command, ...args].join(" "), {
          cwd,
          shell: true,
          stdio: "inherit",
          env: options.env ?? process.env,
        })
      : spawn(command, args, {
          cwd,
          stdio: "inherit",
          env: options.env ?? process.env,
        });

    let settled = false;

    const timeout =
      options.timeout === undefined
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            child.kill();

            reject(
              new ReleaseError(
                `${options.label ?? command} timed out after ${Math.round(
                  options.timeout / 1000,
                )}s.`,
              ),
            );
          }, options.timeout);

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      reject(new ReleaseError(`Failed to run ${command}: ${error.message}`));
    });

    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      if (signal) {
        reject(new ReleaseError(`${command} terminated by signal ${signal}.`));

        return;
      }

      resolve({
        status: status ?? 1,
      });
    });
  });
}

export async function mapWithConcurrency(items, concurrency, callback) {
  if (items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await callback(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

export function combineOutput(stdout, stderr) {
  return `${stdout ?? ""}\n${stderr ?? ""}`;
}

export const runtime = {
  spawnBuffered: (...args) => spawnBuffered(...args),
  spawnInteractive: (...args) => spawnInteractive(...args),
  runStep: (...args) => runStep(...args),
  spawnSync: (...args) => spawnSync(...args),
  isInteractive: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now: () => Date.now(),
  today: () => new Date().toISOString().slice(0, 10),
  validateChanges: () => collectChanges(repositoryRoot),
  finalizeChanges: (version, date) =>
    finalizeRelease({ root: repositoryRoot, version, date }),
  checkArtifactCoverage: (...args) => checkArtifactCoverage(...args),
  writeArtifactLedger: (...args) => writeArtifactLedger(...args),
};

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type RendererRequest = {
  id: string;
  source: string;
  theme: string;
};

type RendererResponse =
  | {
      svg: string;
      error?: never;
    }
  | {
      svg?: never;
      error: string;
    };

const RENDER_TIMEOUT_MS = 30_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_PATH = join(__dirname, "render-worker.mjs");

let renderQueue: Promise<unknown> = Promise.resolve();

export async function renderMermaidStaticSvg(
  id: string,
  source: string,
  theme: string,
): Promise<string> {
  return enqueueMermaidRender(async () => {
    const response = await invokeRenderer({
      id,
      source,
      theme,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.svg;
  });
}

async function invokeRenderer(
  request: RendererRequest,
): Promise<RendererResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");

      settle(() => {
        reject(
          new Error(
            `Mermaid renderer timed out after ${RENDER_TIMEOUT_MS}ms`,
          ),
        );
      });
    }, RENDER_TIMEOUT_MS);

    child.once("error", (error) => {
      settle(() => {
        reject(error);
      });
    });

    child.once("exit", (code) => {
      settle(() => {
        const stdout = Buffer.concat(stdoutChunks)
          .toString("utf8")
          .trim();

        const stderr = Buffer.concat(stderrChunks)
          .toString("utf8")
          .trim();

        if (!stdout) {
          reject(
            new Error(
              stderr ||
                `Mermaid renderer exited with code ${code}`,
            ),
          );
          return;
        }

        try {
          const response = JSON.parse(stdout) as RendererResponse;

          if (response.error && stderr) {
            resolve({
              error: `${response.error}\n${stderr}`,
            });
            return;
          }

          resolve(response);
        } catch {
          reject(
            new Error(
              [
                "Failed to parse Mermaid renderer output.",
                `Exit code: ${code}`,
                `stdout: ${stdout}`,
                stderr ? `stderr: ${stderr}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          );
        }
      });
    });

    child.stdin.end(JSON.stringify(request));
  });
}

async function enqueueMermaidRender<T>(
  render: () => Promise<T>,
): Promise<T> {
  const current = renderQueue.then(render, render);

  renderQueue = current.catch(() => undefined);

  return current;
}

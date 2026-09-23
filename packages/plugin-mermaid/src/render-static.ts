import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  return await enqueueMermaidRender(async () => {
    const response = await invokeRenderer({ id, source, theme });
    if (response.error) throw new Error(response.error);
    return response.svg;
  });
}

async function invokeRenderer(request: {
  id: string;
  source: string;
  theme: string;
}): Promise<RendererResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(`Mermaid renderer timed out after ${RENDER_TIMEOUT_MS}ms`),
      );
    }, RENDER_TIMEOUT_MS);

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (!stdout) {
        reject(
          new Error(stderr || `Mermaid renderer exited with code ${code}`),
        );
        return;
      }

      try {
        const response = JSON.parse(stdout) as RendererResponse;
        if (response.error && stderr) {
          resolve({ error: `${response.error}\n${stderr}` });
        } else {
          resolve(response);
        }
      } catch {
        reject(
          new Error(
            `Failed to parse renderer output: ${stdout}\nStderr: ${stderr}`,
          ),
        );
      }
    });

    child.stdin.end(JSON.stringify(request));
  });
}

async function enqueueMermaidRender<T>(render: () => Promise<T>): Promise<T> {
  const current = renderQueue.then(render, render);
  renderQueue = current.catch(() => undefined);
  return current;
}

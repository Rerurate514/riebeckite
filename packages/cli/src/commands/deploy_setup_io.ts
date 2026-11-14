import { spawn } from "node:child_process";
import fs from "node:fs/promises";

export async function readTextFile(
  filePath: string,
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export async function openInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const arguments_ =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];
  await new Promise<void>((resolve) => {
    const child = spawn(command, arguments_, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve());
    child.on("spawn", () => resolve());
    child.unref();
  });
}

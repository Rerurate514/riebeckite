import fs from "node:fs/promises";
import path from "node:path";
import { FileSystemContentMutation } from "../../src/file_system_content_mutation.js";

const [mode, root, argument = ""] = process.argv.slice(2);

async function waitForRelease(): Promise<void> {
  for (;;) {
    try {
      await fs.access(path.join(root, ".riebeckite", "worker-release"));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

async function signalReady(): Promise<void> {
  await fs.mkdir(path.join(root, ".riebeckite"), { recursive: true });
  await fs.writeFile(path.join(root, ".riebeckite", "worker-ready"), "ready");
  await waitForRelease();
}

if (!mode || !root)
  throw new Error("Usage: mutation_worker <mode> <root> <arg>");
const mutation = new FileSystemContentMutation(root, {
  beforeWrite:
    mode === "apply-block" ? async () => await signalReady() : undefined,
  beforeRecoveryRestore:
    mode === "recover-block" ? async () => await signalReady() : undefined,
});

try {
  if (mode === "apply" || mode === "apply-block") {
    const plan = await mutation.loadPlan(argument);
    const result = await mutation.apply(plan);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (mode === "recover" || mode === "recover-block") {
    const result = await mutation.recover(argument);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    throw new Error(`Unknown worker mode: ${mode}`);
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}

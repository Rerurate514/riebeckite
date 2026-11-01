import fs from "node:fs";
import path from "node:path";
import { collectApiLifecycleDiagnostics } from "@riebeckite/diagnostics";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";

export async function runCheck(project: RiebeckiteProject): Promise<boolean> {
  const config = await loadProjectConfig(project);
  const apiDiagnostics = collectApiLifecycleDiagnostics(config);
  console.log("Riebeckite check");
  console.log("");
  console.log("✓ Configuration");

  const contentRoot = path.resolve(project.contentRoot);
  if (fs.existsSync(contentRoot)) {
    console.log("✓ Content directory");
  } else {
    console.log("✗ Content directory");
  }

  if (apiDiagnostics.length > 0) {
    console.log("");
    console.log("API lifecycle");
    for (const diagnostic of apiDiagnostics) {
      console.log(`  ${diagnostic.code}  ${diagnostic.message}`);
      if (diagnostic.cause) console.log(`    Reason: ${diagnostic.cause}`);
      for (const line of diagnostic.details?.split("\n") ?? []) {
        console.log(`    ${line}`);
      }
      if (diagnostic.fix) console.log(`    Fix: ${diagnostic.fix.description}`);
    }
  }

  console.log("");
  if (!fs.existsSync(contentRoot)) {
    console.log("Could not find:");
    console.log(`  ${contentRoot}`);
    console.log("");
    console.log("Check `content.directory` in your Riebeckite configuration.");
    return false;
  }
  if (apiDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    console.log("API lifecycle metadata must be corrected.");
    return false;
  }
  console.log(
    apiDiagnostics.length > 0
      ? "No blocking problems found."
      : "No problems found.",
  );
  return true;
}

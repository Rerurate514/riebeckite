import fs from "node:fs";
import path from "node:path";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";

export async function runCheck(project: RiebeckiteProject): Promise<boolean> {
  await loadProjectConfig(project);
  console.log("Riebeckite check");
  console.log("");
  console.log("✓ Configuration");

  const contentRoot = path.resolve(project.contentRoot);
  if (fs.existsSync(contentRoot)) {
    console.log("✓ Content directory");
    console.log("");
    console.log("No problems found.");
    return true;
  }

  console.log("✗ Content directory");
  console.log("");
  console.log("Could not find:");
  console.log(`  ${contentRoot}`);
  console.log("");
  console.log("Check `content.directory` in your Riebeckite configuration.");
  return false;
}
